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
  private backendUrl: string;
  private frontendToken: string;

  constructor() {
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
    this.frontendToken = import.meta.env.VITE_FRONTEND_TOKEN || 'ellen-bot-secure-token';
  }

  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/health`);
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  public async getAccountInfo(): Promise<any> {
    try {
      const response = await fetch(
        `${this.backendUrl}/account/info`,
        {
          headers: {
            'X-Frontend-Token': this.frontendToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  public async getPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      
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
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      
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
      const response = await fetch(
        `${this.backendUrl}/order`,
        {
          method: 'POST',
          headers: {
            'X-Frontend-Token': this.frontendToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderRequest)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Order failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to place order:', error);
      throw error;
    }
  }

  public async cancelOrder(symbol: string, orderId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.backendUrl}/order/${orderId}`,
        {
          method: 'DELETE',
          headers: {
            'X-Frontend-Token': this.frontendToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ symbol })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      throw error;
    }
  }

  public async getOpenOrders(symbol?: string): Promise<any[]> {
    try {
      const url = `${this.backendUrl}/orders/open${symbol ? `?symbol=${symbol}` : ''}`;

      const response = await fetch(
        url,
        {
          headers: {
            'X-Frontend-Token': this.frontendToken
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Failed to get open orders:', error);
      throw error;
    }
  }

  public async getKlines(symbol: string, interval: string, limit: number = 100): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.backendUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error(`Failed to get klines for ${symbol}:`, error);
      throw error;
    }
  }

  // WebSocket للبيانات الفورية
  public createWebSocket(streams: string[]): WebSocket {
    const streamString = streams.join('/');
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamString}`;

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