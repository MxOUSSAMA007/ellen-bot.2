/**
 * خدمة Binance API الآمنة مع retry logic
 */

import { RetryService } from './RetryService';

export interface BinanceConfig {
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  testnet: boolean;
}

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface BinanceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimited?: boolean;
}

export class BinanceService {
  private config: BinanceConfig;
  private retryFetch: (url: string, options?: RequestInit) => Promise<Response>;

  constructor(config: BinanceConfig) {
    this.config = config;
    this.retryFetch = RetryService.createRetryFetch({
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000
    });
  }

  /**
   * الحصول على معلومات الحساب
   */
  async getAccountInfo(): Promise<BinanceResponse<any>> {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.createSignature(queryString);
      
      const response = await this.retryFetch(
        `${this.config.baseUrl}/v3/account?${queryString}&signature=${signature}`,
        {
          headers: {
            'X-MBX-APIKEY': this.config.apiKey
          }
        }
      );

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message,
        rateLimited: this.isRateLimitError(error)
      };
    }
  }

  /**
   * تنفيذ أمر تداول
   */
  async placeOrder(order: OrderRequest): Promise<BinanceResponse<any>> {
    try {
      const timestamp = Date.now();
      let queryString = `symbol=${order.symbol}&side=${order.side}&type=${order.type}&quantity=${order.quantity}&timestamp=${timestamp}`;
      
      if (order.price) {
        queryString += `&price=${order.price}`;
      }
      
      if (order.timeInForce) {
        queryString += `&timeInForce=${order.timeInForce}`;
      }
      
      const signature = this.createSignature(queryString);
      
      const response = await this.retryFetch(
        `${this.config.baseUrl}/v3/order`,
        {
          method: 'POST',
          headers: {
            'X-MBX-APIKEY': this.config.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `${queryString}&signature=${signature}`
        }
      );

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message,
        rateLimited: this.isRateLimitError(error)
      };
    }
  }

  /**
   * الحصول على بيانات الشموع
   */
  async getKlines(symbol: string, interval: string, limit: number = 100): Promise<BinanceResponse<any[]>> {
    try {
      const url = `${this.config.baseUrl}/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      
      const response = await this.retryFetch(url);
      const data = await response.json();
      
      // تحويل البيانات إلى تنسيق مناسب
      const candles = data.map((kline: any[]) => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));
      
      return { success: true, data: candles };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message,
        rateLimited: this.isRateLimitError(error)
      };
    }
  }

  /**
   * إنشاء توقيع HMAC SHA256
   */
  private createSignature(queryString: string): string {
    // في التطبيق الحقيقي، هذا يتم في الخادم الخلفي فقط
    // هنا للتوضيح فقط
    return 'mock_signature';
  }

  /**
   * فحص أخطاء Rate Limiting
   */
  private isRateLimitError(error: any): boolean {
    return error?.status === 429 || 
           error?.code === -1003 ||
           error?.message?.toLowerCase().includes('rate limit');
  }
}