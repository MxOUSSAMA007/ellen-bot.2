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
      timeout: 10000,
      retryAttempts: 3,
      frontendToken: import.meta.env.VITE_FRONTEND_TOKEN || 'ellen-bot-secure-token'
    };
    
    // إنشاء fetch مع retry logic
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
    const token = localStorage.getItem('ellen_auth_token');
    if (token) {
      this.authToken = token;
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
        localStorage.setItem('ellen_auth_token', this.authToken);
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
    return result.data;
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
   * إرسال أمر تداول (آمن - يتم عبر الخادم)
   */
  async placeOrder(orderRequest: OrderRequest): Promise<any> {
    if (!this.authToken) {
      throw new Error('Authentication required for trading operations');
    }

    return this.makeSecureRequest('/order', {
      method: 'POST',
      body: JSON.stringify(orderRequest),
      headers: {
        'Authorization': `Bearer ${this.authToken}`
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
    return result.data;
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
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Frontend-Token': this.config.frontendToken,
      'X-Request-ID': this.generateRequestId(),
      ...headers
    };

    // استخدام RetryService للطلبات الآمنة
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
          
          const data = await response.json();
          return data;
        } catch (error) {
          clearTimeout(timeoutId);
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
      throw retryResult.error;
    }

    // تسجيل الطلبات الناجحة مع معلومات الأداء
    if (retryResult.attempts > 1 || retryResult.wasRateLimited) {
      console.warn(
        `[BACKEND] Request succeeded after ${retryResult.attempts} attempts ` +
        `(${retryResult.totalTime}ms)${retryResult.wasRateLimited ? ' [Rate Limited]' : ''}`
      );
    }

    return retryResult.data!;
  }

  /**
   * توليد معرف طلب فريد
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    localStorage.removeItem('ellen_auth_token');
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