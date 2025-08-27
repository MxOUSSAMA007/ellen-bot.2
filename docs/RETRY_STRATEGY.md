# استراتيجية إعادة المحاولة ومعالجة Rate Limits

## نظرة عامة

هذه الوثيقة تحدد استراتيجية إعادة المحاولة (Retry Strategy) وكيفية التعامل مع حدود المعدل (Rate Limits) في Ellen Trading Bot لضمان موثوقية الاتصال مع Binance API.

## 🔄 استراتيجية إعادة المحاولة

### المبادئ الأساسية

1. **Exponential Backoff**: زيادة تدريجية في وقت الانتظار
2. **Maximum Attempts**: حد أقصى لعدد المحاولات
3. **Jitter**: إضافة عشوائية لتجنب التحميل المتزامن
4. **Circuit Breaker**: إيقاف مؤقت عند الفشل المستمر

### إعدادات افتراضية

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,      // 1 ثانية
  maxDelay: 30000,      // 30 ثانية
  backoffMultiplier: 2,
  jitterRange: 0.1      // ±10%
};
```

### خوارزمية إعادة المحاولة

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // لا تعيد المحاولة للأخطاء غير القابلة للإصلاح
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      // إذا كانت آخر محاولة، ارمي الخطأ
      if (attempt === config.maxAttempts) {
        throw lastError;
      }
      
      // حساب وقت الانتظار
      const delay = calculateDelay(attempt, config);
      
      console.warn(
        `Attempt ${attempt}/${config.maxAttempts} failed. ` +
        `Retrying in ${delay}ms. Error: ${error.message}`
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff
  let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  
  // تطبيق الحد الأقصى
  delay = Math.min(delay, config.maxDelay);
  
  // إضافة jitter لتجنب thundering herd
  const jitter = delay * config.jitterRange * (Math.random() * 2 - 1);
  delay += jitter;
  
  return Math.max(delay, 0);
}
```

## 🚦 معالجة Rate Limits

### أنواع Rate Limits في Binance

1. **Request Rate Limits**: عدد الطلبات في الدقيقة
2. **Order Rate Limits**: عدد الأوامر في الثانية/الدقيقة
3. **Raw Request Limits**: حدود الطلبات الخام

### استراتيجية المعالجة

#### 1. الكشف المبكر
```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

function parseRateLimitHeaders(response: Response): RateLimitInfo {
  return {
    limit: parseInt(response.headers.get('X-MBX-USED-WEIGHT-1M') || '0'),
    remaining: parseInt(response.headers.get('X-MBX-ORDER-COUNT-10S') || '0'),
    resetTime: parseInt(response.headers.get('X-MBX-RESET-TIME') || '0'),
    retryAfter: parseInt(response.headers.get('Retry-After') || '0')
  };
}
```

#### 2. التعامل مع 429 (Too Many Requests)
```typescript
async function handleRateLimit(error: any, attempt: number): Promise<number> {
  if (error.status === 429) {
    const retryAfter = error.headers?.['retry-after'];
    
    if (retryAfter) {
      // استخدم الوقت المحدد من الخادم
      const delay = parseInt(retryAfter) * 1000;
      console.warn(`Rate limited. Server requested ${delay}ms delay`);
      return delay;
    } else {
      // استخدم exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 60000);
      console.warn(`Rate limited. Using exponential backoff: ${delay}ms`);
      return delay;
    }
  }
  
  throw error;
}
```

#### 3. Rate Limit Prevention
```typescript
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;
  
  constructor(maxRequests: number = 1200, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // إزالة الطلبات القديمة
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      // حساب وقت الانتظار
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // +100ms buffer
      
      if (waitTime > 0) {
        console.warn(`Rate limit prevention: waiting ${waitTime}ms`);
        await sleep(waitTime);
      }
    }
    
    this.requests.push(now);
  }
}
```

## 🛡️ Circuit Breaker Pattern

### تطبيق Circuit Breaker
```typescript
enum CircuitState {
  CLOSED = 'CLOSED',     // عادي
  OPEN = 'OPEN',         // متوقف
  HALF_OPEN = 'HALF_OPEN' // اختبار
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000,
    private successThreshold: number = 3
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
      }
    }
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }
}
```

## 📊 مراقبة ومتابعة

### تسجيل الأحداث
```typescript
interface RetryEvent {
  timestamp: string;
  operation: string;
  attempt: number;
  maxAttempts: number;
  delay: number;
  error: string;
  success: boolean;
}

class RetryLogger {
  private events: RetryEvent[] = [];
  
  logRetryAttempt(event: Omit<RetryEvent, 'timestamp'>): void {
    this.events.push({
      ...event,
      timestamp: new Date().toISOString()
    });
    
    // الاحتفاظ بآخر 1000 حدث فقط
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }
  
  getRetryStats(): {
    totalRetries: number;
    successRate: number;
    avgDelay: number;
    mostFailedOperation: string;
  } {
    const totalRetries = this.events.length;
    const successful = this.events.filter(e => e.success).length;
    const successRate = totalRetries > 0 ? (successful / totalRetries) * 100 : 0;
    
    const avgDelay = totalRetries > 0 
      ? this.events.reduce((sum, e) => sum + e.delay, 0) / totalRetries 
      : 0;
    
    // العملية الأكثر فشلاً
    const operationCounts = this.events.reduce((acc, e) => {
      if (!e.success) {
        acc[e.operation] = (acc[e.operation] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const mostFailedOperation = Object.entries(operationCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';
    
    return {
      totalRetries,
      successRate,
      avgDelay,
      mostFailedOperation
    };
  }
}
```

## 🔧 التكوين والاستخدام

### إعداد متغيرات البيئة
```env
# إعدادات إعادة المحاولة
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY=1000
RETRY_MAX_DELAY=30000
RETRY_BACKOFF_MULTIPLIER=2

# إعدادات Rate Limiting
RATE_LIMIT_REQUESTS=1200
RATE_LIMIT_WINDOW=60000

# إعدادات Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60000
```

### استخدام في الكود
```typescript
// إنشاء instances
const rateLimiter = new RateLimiter(1200, 60000);
const circuitBreaker = new CircuitBreaker(5, 60000);
const retryLogger = new RetryLogger();

// استخدام مع Binance API
async function safeBinanceCall<T>(operation: () => Promise<T>): Promise<T> {
  return circuitBreaker.execute(async () => {
    await rateLimiter.waitIfNeeded();
    
    return retryWithBackoff(operation, {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterRange: 0.1
    });
  });
}
```

## 📈 أفضل الممارسات

### 1. تصنيف الأخطاء
```typescript
function isNonRetryableError(error: any): boolean {
  // أخطاء لا يجب إعادة المحاولة معها
  const nonRetryableCodes = [400, 401, 403, 404, 422];
  return nonRetryableCodes.includes(error.status);
}

function isRateLimitError(error: any): boolean {
  return error.status === 429 || 
         error.message?.includes('rate limit') ||
         error.code === -1003; // Binance rate limit code
}
```

### 2. مراقبة الصحة
```typescript
class HealthMonitor {
  private metrics = {
    totalRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    circuitBreakerTrips: 0
  };
  
  recordRequest(success: boolean, rateLimited: boolean = false): void {
    this.metrics.totalRequests++;
    if (!success) this.metrics.failedRequests++;
    if (rateLimited) this.metrics.rateLimitHits++;
  }
  
  getHealthScore(): number {
    if (this.metrics.totalRequests === 0) return 100;
    
    const successRate = (this.metrics.totalRequests - this.metrics.failedRequests) / this.metrics.totalRequests;
    const rateLimitPenalty = this.metrics.rateLimitHits / this.metrics.totalRequests * 0.5;
    
    return Math.max(0, (successRate - rateLimitPenalty) * 100);
  }
}
```

### 3. التنبيهات التلقائية
```typescript
class AlertManager {
  async checkAndAlert(): Promise<void> {
    const healthScore = healthMonitor.getHealthScore();
    const retryStats = retryLogger.getRetryStats();
    
    if (healthScore < 80) {
      await this.sendAlert({
        level: 'WARNING',
        message: `Health score dropped to ${healthScore}%`,
        details: retryStats
      });
    }
    
    if (retryStats.successRate < 70) {
      await this.sendAlert({
        level: 'CRITICAL',
        message: `Retry success rate is ${retryStats.successRate}%`,
        details: retryStats
      });
    }
  }
}
```

## 📋 قائمة التحقق

### قبل النشر:
- [ ] تم تكوين جميع معاملات إعادة المحاولة
- [ ] تم اختبار سيناريوهات Rate Limiting
- [ ] تم تفعيل Circuit Breaker
- [ ] تم إعداد المراقبة والتنبيهات

### مراقبة دورية:
- [ ] مراجعة إحصائيات إعادة المحاولة
- [ ] فحص صحة Circuit Breaker
- [ ] تحليل أنماط Rate Limiting
- [ ] تحديث العتبات حسب الحاجة

---

**آخر تحديث:** 2024-01-15  
**الإصدار:** 1.0  
**المراجع:** فريق التطوير - Ellen Trading Bot