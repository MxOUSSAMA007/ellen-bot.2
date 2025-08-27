/**
 * خدمة الاتصال بالخادم الخلفي الآمن
 * جميع العمليات الحساسة تتم عبر الخادم الخلفي
 */

interface BackendConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
}

interface TradeSignal {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  price: number;
  confidence: number;
  reason: string;
  timestamp: string;
}

export class BackendService {
  private config: BackendConfig;
  private authToken: string | null = null;

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api',
      timeout: 10000,
      retryAttempts: 3
    };
  }

  /**
   * تسجيل الدخول والحصول على token
   */
  async authenticate(credentials: { username: string; password: string }): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      if (response.success && response.data?.token) {
        this.authToken = response.data.token;
        localStorage.setItem('auth_token', this.authToken);
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
    return this.makeRequest(`/market/ticker/${symbol}`);
  }

  /**
   * الحصول على بيانات الشموع
   */
  async getKlines(symbol: string, interval: string, limit: number = 100): Promise<any[]> {
    const response = await this.makeRequest<any[]>(`/market/klines`, {
      method: 'GET',
      params: { symbol, interval, limit: limit.toString() }
    });
    return response.data || [];
  }

  /**
   * إرسال أمر تداول (آمن - يتم عبر الخادم)
   */
  async placeOrder(orderRequest: OrderRequest): Promise<any> {
    if (!this.authToken) {
      throw new Error('Authentication required for trading operations');
    }

    return this.makeRequest('/trading/order', {
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

    return this.makeRequest(`/trading/order/${orderId}`, {
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

    const response = await this.makeRequest<any[]>('/trading/orders/open', {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      },
      params: symbol ? { symbol } : undefined
    });
    return response.data || [];
  }

  /**
   * الحصول على معلومات الحساب
   */
  async getAccountInfo(): Promise<any> {
    if (!this.authToken) {
      throw new Error('Authentication required');
    }

    return this.makeRequest('/account/info', {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
  }

  /**
   * إرسال إشارة تداول للتحليل
   */
  async submitTradeSignal(signal: Omit<TradeSignal, 'id' | 'timestamp'>): Promise<TradeSignal> {
    const response = await this.makeRequest<TradeSignal>('/analysis/signal', {
      method: 'POST',
      body: JSON.stringify(signal)
    });
    return response.data!;
  }

  /**
   * الحصول على سجل التداول
   */
  async getTradeHistory(limit: number = 50): Promise<any[]> {
    if (!this.authToken) {
      throw new Error('Authentication required');
    }

    const response = await this.makeRequest<any[]>('/trading/history', {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      },
      params: { limit: limit.toString() }
    });
    return response.data || [];
  }

  /**
   * اختبار الاتصال بالخادم
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/health');
      return response.success;
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

    const response = await this.makeRequest('/settings/trading', {
      method: 'PUT',
      body: JSON.stringify(settings),
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });
    return response.success;
  }

  /**
   * دالة مساعدة لإجراء طلبات HTTP مع retry logic
   */
  private async makeRequest<T>(
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

    // إعداد headers افتراضية
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    };

    let lastError: Error;

    // تطبيق retry logic مع exponential backoff
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method,
          headers: defaultHeaders,
          body,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // التعامل مع rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
            
            console.warn(`Rate limited. Retrying after ${delay}ms`);
            await this.sleep(delay);
            continue;
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`Request failed (attempt ${attempt}/${this.config.retryAttempts}). Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // إذا فشلت جميع المحاولات
    throw new Error(`Request failed after ${this.config.retryAttempts} attempts: ${lastError!.message}`);
  }

  /**
   * دالة مساعدة للانتظار
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * تسجيل الخروج
   */
  logout(): void {
    this.authToken = null;
    localStorage.removeItem('auth_token');
  }

  /**
   * استرداد token من localStorage عند بدء التطبيق
   */
  initializeAuth(): void {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.authToken = token;
    }
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const backendService = new BackendService();