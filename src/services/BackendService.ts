/**
 * خدمة الاتصال المحسنة بالخادم الخلفي الآمن
 * تدعم retry logic وإدارة أخطاء متقدمة
 */

import { RetryService, RetryResult } from './RetryService';

interface BackendConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  frontendToken: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  stopPrice?: number;
}

interface TradeSignal {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  price: number;
  confidence: number;
  reason: string;
  timestamp: string;
  strategy?: string;
  metadata?: Record<string, any>;
}

export class BackendService {
  private config: BackendConfig;
  private authToken: string | null = null;
  private retryFetch: (url: string, options?: RequestInit) => Promise<Response>;

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api',
      timeout: Number(import.meta.env.VITE_BACKEND_TIMEOUT) || 10000,
      retryAttempts: Number(import.meta.env.VITE_BACKEND_RETRIES) || 3,
      frontendToken: import.meta.env.VITE_FRONTEND_TOKEN || 'ellen-bot-secure-token'
    };

    // إنشاء fetch مع retry logic (RetryService يجب أن يوفر createRetryFetch)
    this.retryFetch = RetryService.createRetryFetch({
      maxAttempts: this.config.retryAttempts,
      baseDelay: 1000,
      maxDelay: 30000
    });

    this.initializeAuth();
  }

  /**
   * تهيئة المصادقة من localStorage
   */
  private initializeAuth(): void {
    try {
      const token = localStorage.getItem('ellen_auth_token');
      if (token) {
        this.authToken = token;
      }
    } catch (e) {
      // في بيئات preview قد لا يكون localStorage متاحًا بنفس الطريقة
      console.warn('[BackendService] unable to read localStorage for auth token', e);
    }
  }

  /**
   * تسجيل الدخول والحصول على token
   */
  async authenticate(credentials: { username: string; password: string }): Promise<boolean> {
    try {
      const result = await this.makeSecureRequest<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      if (result.success && result.data?.token) {
        this.authToken = result.data.token;
        try { localStorage.setItem('ellen_auth_token', this.authToken); } catch {}
        return true;
      }
      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  /**
   * الحصول على بيانات السوق (آمن - لا يحتاج مفاتيح API)
   */
  async getMarketData(symbol: string): Promise<any> {
    const result = await this.makeSecureRequest(`/market/ticker/${symbol}`);
    return result.data ?? null;
  }

  /**
   * الحصول على بيانات الشموع
   */
  async getKlines(symbol: string, interval: string, limit: number = 100): Promise<any[]> {
    const result = await this.makeSecureRequest<any[]>(`/klines`, {
      method: 'GET',
      params: { symbol, interval, limit: limit.toString() }
    });
    return result.data || [];
  }

  /**
   * الحصول على عمق السوق (Order Book)
   */
  async getOrderBook(symbol: string, limit: number = 100): Promise<{
    bids: Array<{ price: number; quantity: number }>;
    asks: Array<{ price: number; quantity: number }>;
    lastUpdateId: number;
    timestamp: number;
  } | null> {
    try {
      const result = await this.makeSecureRequest<{
        bids: Array<{ price: number; quantity: number }>;
        asks: Array<{ price: number; quantity: number }>;
        lastUpdateId: number;
        timestamp: number;
      }>(`/depth`, {
        method: 'GET',
        params: { symbol, limit: limit.toString() }
      });
      return result.data || null;
    } catch (error) {
      console.error('Failed to fetch order book:', error);
      return null;
    }
  }

  /**
   * الحصول على أسعار السوق الحالية
   */
  async getCurrentPrices(symbol?: string): Promise<any> {
    try {
      const result = await this.makeSecureRequest(`/ticker/price`, {
        method: 'GET',
        params: symbol ? { symbol } : undefined
      });
      return result.data ?? null;
    } catch (error) {
      console.error('Failed to fetch current prices:', error);
      return null;
    }
  }

  /**
   * إرسال أمر تداول (آمن - يتم عبر الخادم)
   */
  async placeOrder(orderRequest: OrderRequest): Promise<any> {
    // في وضع DRY_RUN، نحاكي الأمر محلياً
    const isDryRun = import.meta.env.VITE_DRY_RUN === 'true';
    
    if (isDryRun) {
      // محاكاة تأخير الشبكة
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      // محاكاة رسوم وانزلاق واقعية
      const basePrice = orderRequest.price || (Math.random() * 50000 + 30000);
      const slippage = 0.0005; // 0.05% انزلاق
      const fees = orderRequest.quantity * basePrice * 0.001; // 0.1% رسوم
      
      const executedPrice = orderRequest.side === 'BUY' 
        ? basePrice * (1 + slippage)
        : basePrice * (1 - slippage);
      
      // محاكاة نجاح الأمر
      const mockResult = {
        success: true,
        data: {
          orderId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol: orderRequest.symbol,
          side: orderRequest.side,
          type: orderRequest.type,
          quantity: orderRequest.quantity,
          price: orderRequest.price || basePrice,
          status: 'FILLED',
          executedQty: orderRequest.quantity,
          executedPrice,
          timestamp: Date.now(),
          fees,
          slippage: Math.abs(executedPrice - basePrice),
          commission: fees,
          commissionAsset: 'USDT'
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('[DRY_RUN] Simulated order execution:', mockResult);
      return mockResult;
    }

    return this.makeSecureRequest('/order', {
      method: 'POST',
      body: JSON.stringify(orderRequest),
      headers: {
        ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {})
      }
    });
  }

  /**
   * إلغاء أمر
   */
  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    if (!this.authToken) {
      throw new Error('Authentication required for trading operations');
    }

    return this.makeSecureRequest(`/order/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      },
      params: { symbol }
    });
  }

  /**
   * الحصول على الأوامر المفتوحة
   */
  async getOpenOrders(symbol?: string): Promise<any[]> {
    if (!this.authToken) {
      throw new Error('Authentication required');
    }

    const result = await this.makeSecureRequest<any[]>('/orders/open', {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      },
      params: symbol ? { symbol } : undefined
    });
    return result.data || [];
  }

  /**
   * الحصول على معلومات الحساب
   */
  async getAccountInfo(): Promise<any> {
    if (!this.authToken) {
      throw new Error('Authentication required');
    }

    const result = await this.makeSecureRequest('/account/info', {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    return result.data ?? null;
  }

  /**
   * إرسال إشارة تداول للتحليل
   */
  async submitTradeSignal(signal: Omit<TradeSignal, 'id' | 'timestamp'>): Promise<TradeSignal> {
    const result = await this.makeSecureRequest<TradeSignal>('/analysis/signal', {
      method: 'POST',
      body: JSON.stringify(signal)
    });
    return result.data!;
  }

  /**
   * الحصول على سجل التداول
   */
  async getTradeHistory(limit: number = 50): Promise<any[]> {
    if (!this.authToken) {
      throw new Error('Authentication required');
    }

    const result = await this.makeSecureRequest<any[]>('/trading/history', {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      },
      params: { limit: limit.toString() }
    });
    return result.data || [];
  }

  /**
   * اختبار الاتصال بالخادم
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.makeSecureRequest('/health');
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * تحديث إعدادات التداول
   */
  async updateTradingSettings(settings: any): Promise<boolean> {
    if (!this.authToken) {
      throw new Error('Authentication required');
    }

    const result = await this.makeSecureRequest('/settings/trading', {
      method: 'PUT',
      body: JSON.stringify(settings),
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    return result.success;
  }

  /**
   * تعيين مفاتيح Binance API بشكل آمن
   */
  async setBinanceApiKeys(keys: {
    apiKey: string;
    secretKey: string;
    testnet?: boolean;
  }): Promise<{ success: boolean; error?: string; validated?: boolean }> {
    try {
      const result = await this.makeSecureRequest<{ validated: boolean }>('/settings/binance-api-keys', {
        method: 'POST',
        body: JSON.stringify(keys)
      });

      return {
        success: result.success,
        validated: result.data?.validated || false,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * مسح مفاتيح Binance API من الخادم
   */
  async clearBinanceApiKeys(): Promise<boolean> {
    try {
      const result = await this.makeSecureRequest('/settings/binance-api-keys', {
        method: 'DELETE'
      });
      return result.success;
    } catch (error) {
      console.error('Failed to clear API keys:', error);
      return false;
    }
  }

  /**
   * التحقق من حالة اتصال Binance
   */
  async checkBinanceConnection(): Promise<{
    connected: boolean;
    testnet: boolean;
    permissions?: string[];
    error?: string;
  }> {
    try {
      const result = await this.makeSecureRequest<{
        connected: boolean;
        testnet: boolean;
        permissions: string[];
      }>('/binance/connection-status');

      return {
        connected: (result.success && !!result.data?.connected) || false,
        testnet: result.data?.testnet || false,
        permissions: result.data?.permissions || [],
        error: result.error
      };
    } catch (error) {
      return {
        connected: false,
        testnet: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * دالة محسنة لإجراء طلبات HTTP آمنة مع retry logic
   */
  private async makeSecureRequest<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: string;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, params } = options;

    // بناء URL مع المعاملات
    let url = `${this.config.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    // إعداد headers آمنة
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Frontend-Token': this.config.frontendToken,
      'X-Request-ID': this.generateRequestId(),
      ...headers
    };

    // helper لبناء أخطاء مفهومة
    const wrapError = (message: string, info: Record<string, any> = {}) => {
      const err: any = new Error(message);
      Object.assign(err, info);
      return err;
    };

    // تنفيذ الطلب مع RetryService (الذي يستخدم this.retryFetch)
    const retryResult: RetryResult<ApiResponse<T>> = await RetryService.executeWithRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
          const response = await this.retryFetch(url, {
            method,
            headers: defaultHeaders,
            body,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response) {
            throw wrapError('No response object from fetch', { url });
          }

          // تحقق من نوع الاستجابة — بعض البيئات (preview) قد تعطي opaque response
          const respType = (response as any).type;
          if (respType && respType !== 'basic' && respType !== 'cors') {
            // غالبًا دلالة على CORS / credentialless iframe
            throw wrapError('Opaque or unsupported response type (possible CORS/credentialless issue)', {
              url, respType, status: response.status
            });
          }

          // حالات الاستجابة غير الناجحة
          if (!response.ok) {
            let text = '';
            try { text = await response.text(); } catch (e) { /* ignore */ }

            const status = response.status || 0;
            const nonRetryable = status >= 400 && status < 500 && status !== 429;
            if (nonRetryable) {
              throw wrapError(`NonRetryable HTTP ${status}: ${text || response.statusText}`, { status, text });
            } else {
              throw wrapError(`Retryable HTTP ${status}: ${text || response.statusText}`, { status, text });
            }
          }

          // تحقق من content-type قبل محاول parse JSON
          const contentType = response.headers.get?.('content-type') || '';
          if (!contentType.includes('application/json')) {
            let txt = '';
            try { txt = await response.text(); } catch (e) { /* ignore */ }
            // نرجع ApiResponse مبسط مع نص إن لم يكن JSON
            return {
              success: true,
              data: (txt as unknown) as T,
              timestamp: new Date().toISOString()
            };
          }

          // parse JSON بأمان
          let parsed: any;
          try {
            parsed = await response.json();
          } catch (e) {
            throw wrapError('Failed to parse JSON from response', { url, err: (e as Error).message });
          }

          // إذا لم يكن شكل ApiResponse المتفق عليه، غلفه
          if (!parsed || typeof parsed !== 'object' || !('success' in parsed)) {
            return {
              success: true,
              data: parsed as T,
              timestamp: new Date().toISOString()
            };
          }

          return parsed as ApiResponse<T>;
        } catch (error: any) {
          clearTimeout(timeoutId);

          // Abort => timeout (قابل لإعادة المحاولة)
          if (error?.name === 'AbortError') {
            throw wrapError('Request aborted (timeout)', { url, cause: 'timeout' });
          }

          // كشف خطأ fetch منخفض المستوى
          if (error?.message && error.message.includes('Failed to fetch')) {
            console.error('[makeSecureRequest] Low-level fetch failure', { url, error });
            throw wrapError('Network or CORS error: Failed to fetch', { url, original: error });
          }

          // رمي الخطأ كما هو إذا لم نعرف كيف نتعامل معه هنا
          throw error;
        }
      },
      {
        maxAttempts: this.config.retryAttempts,
        baseDelay: 1000,
        maxDelay: 30000
      }
    );

    if (!retryResult.success) {
      console.error(`[BACKEND] Request failed after ${retryResult.attempts} attempts:`, retryResult.error);
      throw retryResult.error ?? new Error('Unknown retry failure');
    }

    if (retryResult.attempts > 1 || retryResult.wasRateLimited) {
      console.warn(
        `[BACKEND] Request succeeded after ${retryResult.attempts} attempts ` +
        `(${retryResult.totalTime}ms)${retryResult.wasRateLimited ? ' [Rate Limited]' : ''}`
      );
    }

    const data = retryResult.data ?? { success: false, timestamp: new Date().toISOString() } as ApiResponse<T>;
    return data as ApiResponse<T>;
  }

  /**
   * توليد معرف طلب فريد
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * اختبار الاتصال مع معلومات مفصلة
   */
  async testConnectionDetailed(): Promise<{
    connected: boolean;
    latency: number;
    serverInfo?: any;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const result = await this.makeSecureRequest('/health');
      const latency = Date.now() - startTime;

      return {
        connected: result.success,
        latency,
        serverInfo: result.data
      };
    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - startTime,
        error: (error as Error).message
      };
    }
  }

  /**
   * تسجيل الخروج
   */
  logout(): void {
    this.authToken = null;
    try { localStorage.removeItem('ellen_auth_token'); } catch {}
  }

  /**
   * الحصول على إحصائيات الاتصال
   */
  getConnectionStats(): {
    retryStats: any;
    isAuthenticated: boolean;
    backendUrl: string;
  } {
    return {
      retryStats: RetryService.getRetryStats(),
      isAuthenticated: !!this.authToken,
      backendUrl: this.config.baseUrl
    };
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const backendService = new BackendService();
