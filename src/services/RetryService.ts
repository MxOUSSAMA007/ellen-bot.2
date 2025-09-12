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

  // إحصائيات بسيطة تجمع أثناء عمل الخدمة
  private static stats = {
    totalRetries: 0,
    successfulRetries: 0,
    rateLimitHits: 0
  };

  /**
   * تنفيذ عملية مع إعادة المحاولة
   */
  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig: RetryConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    let wasRateLimited = false;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();

        if (attempt > 1) this.stats.successfulRetries++;

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          wasRateLimited
        };
      } catch (rawError) {
        // نضمن أن لدينا كائن Error
        const error = this.normalizeError(rawError);
        lastError = error;

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

        // إذا كانت آخر محاولة، اكسر وارجع الخطأ
        if (attempt === finalConfig.maxAttempts) {
          break;
        }

        // معالجة خاصة لـ Rate Limiting
        if (this.isRateLimitError(error)) {
          wasRateLimited = true;
          this.stats.rateLimitHits++;
          const delay = await this.handleRateLimit(error, attempt);
          this.stats.totalRetries++;
          await this.sleep(delay);
          continue;
        }

        // حساب وقت الانتظار مع backoff + jitter
        const delay = this.calculateDelay(attempt, finalConfig);

        console.warn(
          `[RETRY] Attempt ${attempt}/${finalConfig.maxAttempts} failed. ` +
          `Retrying in ${Math.round(delay)}ms. Error: ${error?.message ?? String(error)}`
        );

        this.stats.totalRetries++;
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
    // تأكد أن jitterRange في نطاق منطقي
    const jitterRange = Math.max(0, Math.min(1, config.jitterRange ?? 0.1));

    // Exponential backoff
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier ?? 2, attempt - 1);

    // تطبيق الحد الأقصى
    delay = Math.min(delay, config.maxDelay);

    // إضافة jitter لتجنب thundering herd
    const jitter = delay * jitterRange * (Math.random() * 2 - 1);
    delay += jitter;

    return Math.max(Math.round(delay), 0);
  }

  /**
   * معالجة خاصة لـ Rate Limiting
   */
  private static async handleRateLimit(error: any, attempt: number): Promise<number> {
    // فحص header Retry-After من الخادم أو الحقل الموضوع في الخطأ
    const retryAfterRaw = (error.headers && (error.headers['retry-after'] || error.headers['Retry-After'])) || error.retryAfter || null;

    if (retryAfterRaw) {
      const parsed = parseInt(String(retryAfterRaw), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        const delay = parsed * 1000;
        console.warn(`[RATE_LIMIT] Server requested ${delay}ms delay via Retry-After`);
        return delay;
      }
    }

    // استخدام exponential backoff للـ rate limits (حد دقيقة واحدة)
    const delay = Math.min(1000 * Math.pow(2, attempt), 60000);
    console.warn(`[RATE_LIMIT] Using exponential backoff: ${delay}ms`);
    return delay;
  }

  /**
   * فحص أخطاء Rate Limiting
   */
  private static isRateLimitError(error: any): boolean {
    const status = Number(error?.status || 0);
    const code = Number.isFinite(Number(error?.code)) ? Number(error.code) : null;
    const message = String(error?.message || '').toLowerCase();

    return status === 429 ||
           (code !== null && this.defaultConfig.retryableBinanceCodes.includes(code)) ||
           message.includes('rate limit') ||
           error?.isNetworkError === true; // اعتبر بعض أخطاء الشبكة قابلة لإعادة المحاولة
  }

  /**
   * فحص الأخطاء غير القابلة للإصلاح
   */
  private static isNonRetryableError(error: any): boolean {
    // أخطاء HTTP غير قابلة للإصلاح (باستثناء 429)
    const nonRetryableStatusCodes = [400, 401, 403, 404, 422];

    const status = Number(error?.status || 0);
    if (status && nonRetryableStatusCodes.includes(status)) {
      return true;
    }

    // أخطاء Binance محددة غير قابلة للإصلاح
    const nonRetryableBinanceCodes = [
      -1013, // Invalid quantity
      -1021, // Timestamp outside of recvWindow
      -2010, // NEW_ORDER_REJECTED
      -2011, // CANCEL_REJECTED
      -1102, // Mandatory parameter missing
      -1104, // Not all sent parameters were read
    ];

    const code = Number.isFinite(Number(error?.code)) ? Number(error.code) : null;
    if (code !== null && nonRetryableBinanceCodes.includes(code)) {
      return true;
    }

    return false;
  }

  /**
   * Normalize various thrown values into an Error with helpful metadata
   */
  private static normalizeError(raw: any): any {
    if (!raw) {
      const e: any = new Error('Unknown error');
      return e;
    }
    if (raw instanceof Error) {
      return raw;
    }
    // fetch() low-level network errors in browsers are usually TypeError with message 'Failed to fetch'
    // نغلفها بحيث تحتوي على status=0 و isNetworkError=true
    if (typeof raw === 'object' && String(raw.message).toLowerCase().includes('failed to fetch')) {
      const e: any = new Error(raw.message || 'Network error: Failed to fetch');
      e.status = 0;
      e.isNetworkError = true;
      e.original = raw;
      return e;
    }
    // إذا هو كائن JSON الممثل لخطأ
    const e: any = new Error(raw.message || String(raw));
    if (raw.status) e.status = raw.status;
    if (raw.code) e.code = raw.code;
    if (raw.retryAfter) e.retryAfter = raw.retryAfter;
    if (raw.headers) e.headers = raw.headers;
    e.original = raw;
    return e;
  }

  /**
   * إنشاء wrapper محسن للـ fetch مع retry
   */
  public static createRetryFetch(config?: Partial<RetryConfig>) {
    const mergedConfig = { ...this.defaultConfig, ...(config || {}) };
    return async (url: string, options?: RequestInit): Promise<Response> => {
      const result = await this.executeWithRetry<Response>(
        async () => {
          let response: Response;
          try {
            response = await fetch(url, options);
          } catch (rawErr) {
            // تحويل أخطاء الشبكة إلى شكل موحّد
            throw this.normalizeError(rawErr);
          }

          // فحص Rate Limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After') || response.headers.get('retry-after');
            const error: any = new Error('Rate limited');
            error.status = 429;
            error.retryAfter = retryAfter;
            error.headers = { 'retry-after': retryAfter };
            throw error;
          }

          // فحص أخطاء (حاول قراءة JSON بأمان إن كان موجودًا)
          if (!response.ok) {
            let errorData: any = {};
            try {
              errorData = await response.json();
            } catch (e) {
              // لا تحمل الخطأ هنا - سنستخدم status/statusText
            }
            const error: any = new Error(errorData?.msg || response.statusText || `HTTP ${response.status}`);
            error.status = response.status;
            if (errorData && typeof errorData.code !== 'undefined') {
              error.code = errorData.code;
            }
            error.headers = Object.fromEntries(response.headers.entries());
            throw error;
          }

          return response;
        },
        mergedConfig
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
  public static getRetryStats() {
    return { ...this.stats };
  }
}
