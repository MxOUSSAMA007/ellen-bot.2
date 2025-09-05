/**
 * خدمة إعادة المحاولة المحسنة مع Exponential Backoff
 * تدعم معالجة Rate Limits وأخطاء Binance المحددة
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterRange: number;
  retryableStatusCodes: number[];
  retryableBinanceCodes: number[];
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  wasRateLimited: boolean;
}

export class RetryService {
  private static defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,      // 1 ثانية
    maxDelay: 30000,      // 30 ثانية
    backoffMultiplier: 2,
    jitterRange: 0.1,     // ±10%
    retryableStatusCodes: [429, 500, 502, 503, 504],
    retryableBinanceCodes: [-1003, -1006, -1007] // Rate limit codes
  };

  /**
   * تنفيذ عملية مع إعادة المحاولة
   */
  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    let wasRateLimited = false;
    let lastError: Error;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          wasRateLimited
        };
      } catch (error) {
        lastError = error as Error;
        
        // لا تعيد المحاولة للأخطاء غير القابلة للإصلاح
        if (this.isNonRetryableError(error)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalTime: Date.now() - startTime,
            wasRateLimited
          };
        }
        
        // إذا كانت آخر محاولة، لا تنتظر
        if (attempt === finalConfig.maxAttempts) {
          break;
        }
        
        // معالجة خاصة لـ Rate Limiting
        if (this.isRateLimitError(error)) {
          wasRateLimited = true;
          const delay = await this.handleRateLimit(error, attempt);
          await this.sleep(delay);
          continue;
        }
        
        // حساب وقت الانتظار
        const delay = this.calculateDelay(attempt, finalConfig);
        
        console.warn(
          `[RETRY] Attempt ${attempt}/${finalConfig.maxAttempts} failed. ` +
          `Retrying in ${delay}ms. Error: ${error.message}`
        );
        
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError!,
      attempts: finalConfig.maxAttempts,
      totalTime: Date.now() - startTime,
      wasRateLimited
    };
  }

  /**
   * حساب وقت التأخير مع Exponential Backoff و Jitter
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // تطبيق الحد الأقصى
    delay = Math.min(delay, config.maxDelay);
    
    // إضافة jitter لتجنب thundering herd
    const jitter = delay * config.jitterRange * (Math.random() * 2 - 1);
    delay += jitter;
    
    return Math.max(delay, 0);
  }

  /**
   * معالجة خاصة لـ Rate Limiting
   */
  private static async handleRateLimit(error: any, attempt: number): Promise<number> {
    // فحص header Retry-After من الخادم
    const retryAfter = error.headers?.['retry-after'] || error.retryAfter;
    
    if (retryAfter) {
      const delay = parseInt(retryAfter) * 1000;
      console.warn(`[RATE_LIMIT] Server requested ${delay}ms delay`);
      return delay;
    }
    
    // استخدام exponential backoff للـ rate limits
    const delay = Math.min(2000 * Math.pow(2, attempt), 60000); // حد أقصى دقيقة واحدة
    console.warn(`[RATE_LIMIT] Using exponential backoff: ${delay}ms`);
    return delay;
  }

  /**
   * فحص أخطاء Rate Limiting
   */
  private static isRateLimitError(error: any): boolean {
    return error.status === 429 || 
           error.code === -1003 || // Binance rate limit
           error.message?.toLowerCase().includes('rate limit');
  }

  /**
   * فحص الأخطاء غير القابلة للإصلاح
   */
  private static isNonRetryableError(error: any): boolean {
    // أخطاء HTTP غير قابلة للإصلاح (باستثناء 429)
    const nonRetryableStatusCodes = [400, 401, 403, 404, 422];
    
    if (error.status && nonRetryableStatusCodes.includes(error.status)) {
      return true;
    }

    // أخطاء Binance محددة
    const nonRetryableBinanceCodes = [
      -1013, // Invalid quantity
      -1021, // Timestamp outside of recvWindow
      -2010, // NEW_ORDER_REJECTED
      -2011, // CANCEL_REJECTED
      -1102, // Mandatory parameter missing
      -1104, // Not all sent parameters were read
    ];

    if (error.code && nonRetryableBinanceCodes.includes(error.code)) {
      return true;
    }

    return false;
  }

  /**
   * إنشاء wrapper محسن للـ fetch مع retry
   */
  public static createRetryFetch(config?: Partial<RetryConfig>) {
    return async (url: string, options?: RequestInit): Promise<Response> => {
      const result = await this.executeWithRetry(
        async () => {
          const response = await fetch(url, options);
          
          // فحص Rate Limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const error = new Error('Rate limited') as any;
            error.status = 429;
            error.retryAfter = retryAfter;
            throw error;
          }
          
          // فحص أخطاء Binance
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.msg || response.statusText) as any;
            error.status = response.status;
            error.code = errorData.code;
            throw error;
          }
          
          return response;
        },
        config
      );

      if (!result.success) {
        throw result.error;
      }

      return result.data!;
    };
  }

  /**
   * دالة مساعدة للانتظار
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * إحصائيات إعادة المحاولة
   */
  public static getRetryStats(): {
    totalRetries: number;
    successfulRetries: number;
    rateLimitHits: number;
  } {
    // في تطبيق حقيقي، هذه ستكون متغيرات instance
    return {
      totalRetries: 0,
      successfulRetries: 0,
      rateLimitHits: 0
    };
  }
}