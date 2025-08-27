export interface BinanceConfig {
  apiKey: string;
  secretKey: string;
  testnet?: boolean;
}

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface OrderResponse {
  orderId: number;
  symbol: string;
  status: string;
  executedQty: number;
  fills: any[];
}

export class BinanceService {
  private config: BinanceConfig;
  private baseUrl: string;

  constructor(config: BinanceConfig) {
    this.config = config;
    this.baseUrl = config.testnet 
      ? 'https://testnet.binance.vision/api'
      : 'https://api.binance.com/api';
  }

  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v3/ping`);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  public async getAccountInfo(): Promise<any> {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = await this.createSignature(queryString);
      
      const response = await fetch(
        `${this.baseUrl}/v3/account?${queryString}&signature=${signature}`,
        {
          headers: {
            'X-MBX-APIKEY': this.config.apiKey
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  public async getPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/v3/ticker/price?symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      console.error(`Failed to get price for ${symbol}:`, error);
      throw error;
    }
  }

  public async get24hrTicker(symbol: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/v3/ticker/24hr?symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to get 24hr ticker for ${symbol}:`, error);
      throw error;
    }
  }

  public async placeOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      const timestamp = Date.now();
      const params = {
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        type: orderRequest.type,
        quantity: orderRequest.quantity.toString(),
        timestamp: timestamp.toString(),
        ...(orderRequest.price && { price: orderRequest.price.toString() }),
        ...(orderRequest.timeInForce && { timeInForce: orderRequest.timeInForce })
      };

      const queryString = new URLSearchParams(params).toString();
      const signature = await this.createSignature(queryString);

      const response = await fetch(
        `${this.baseUrl}/v3/order`,
        {
          method: 'POST',
          headers: {
            'X-MBX-APIKEY': this.config.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `${queryString}&signature=${signature}`
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Order failed: ${errorData.msg || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to place order:', error);
      throw error;
    }
  }

  public async cancelOrder(symbol: string, orderId: number): Promise<any> {
    try {
      const timestamp = Date.now();
      const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;
      const signature = await this.createSignature(queryString);

      const response = await fetch(
        `${this.baseUrl}/v3/order`,
        {
          method: 'DELETE',
          headers: {
            'X-MBX-APIKEY': this.config.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `${queryString}&signature=${signature}`
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to cancel order:', error);
      throw error;
    }
  }

  public async getOpenOrders(symbol?: string): Promise<any[]> {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}${symbol ? `&symbol=${symbol}` : ''}`;
      const signature = await this.createSignature(queryString);

      const response = await fetch(
        `${this.baseUrl}/v3/openOrders?${queryString}&signature=${signature}`,
        {
          headers: {
            'X-MBX-APIKEY': this.config.apiKey
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get open orders:', error);
      throw error;
    }
  }

  public async getKlines(symbol: string, interval: string, limit: number = 100): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to get klines for ${symbol}:`, error);
      throw error;
    }
  }

  private async createSignature(queryString: string): Promise<string> {
    // في التطبيق الحقيقي، يجب استخدام crypto library لإنشاء HMAC SHA256
    // هذا مثال مبسط للتوضيح
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.config.secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(queryString)
    );

    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // WebSocket للبيانات الفورية
  public createWebSocket(streams: string[]): WebSocket {
    const streamString = streams.join('/');
    const wsUrl = this.config.testnet
      ? `wss://testnet.binance.vision/ws/${streamString}`
      : `wss://stream.binance.com:9443/ws/${streamString}`;

    return new WebSocket(wsUrl);
  }

  public subscribeToTicker(symbol: string, callback: (data: any) => void): WebSocket {
    const ws = this.createWebSocket([`${symbol.toLowerCase()}@ticker`]);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }

  public subscribeToDepth(symbol: string, callback: (data: any) => void): WebSocket {
    const ws = this.createWebSocket([`${symbol.toLowerCase()}@depth20@100ms`]);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }
}