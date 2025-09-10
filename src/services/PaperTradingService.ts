/**
 * خدمة Paper Trading المحسنة - محاكاة واقعية للتداول مع بيانات حقيقية
 * تستخدم بيانات Binance الحقيقية وتحاكي order book وتنفيذ الأوامر بدقة
 */

import { secureLoggingService } from './SecureLoggingService';
import { backendService } from './BackendService';

export interface PaperTradeOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  status: 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED';
  timestamp: string;
  executedPrice?: number;
  executedQuantity?: number;
  remainingQuantity?: number;
  fees?: number;
  slippage?: number;
  reason?: string;
  latency?: number;
  fills: Array<{
    price: number;
    quantity: number;
    fee: number;
    timestamp: string;
  }>;
}

export interface PaperAccount {
  balances: Record<string, number>;
  totalValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalTrades: number;
  winningTrades: number;
  dailyPnL: number;
  maxDrawdown: number;
  peakBalance: number;
}

export interface RealMarketData {
  symbol: string;
  currentPrice: number;
  bid: number;
  ask: number;
  spread: number;
  volume24h: number;
  lastUpdate: number;
  orderBook: {
    bids: Array<{ price: number; quantity: number }>;
    asks: Array<{ price: number; quantity: number }>;
    lastUpdateId: number;
  };
}

export interface PaperTradingConfig {
  enableSlippage: boolean;
  enablePartialFills: boolean;
  slippageRate: number;
  feeRate: number;
  maxSlippage: number;
  partialFillProbability: number;
}

export class PaperTradingService {
  private static instance: PaperTradingService;
  private account: PaperAccount;
  private openOrders: Map<string, PaperTradeOrder> = new Map();
  private orderHistory: PaperTradeOrder[] = [];
  private marketData: Map<string, RealMarketData> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private config: PaperTradingConfig;

  private constructor() {
    this.config = {
      enableSlippage: true,
      enablePartialFills: true,
      slippageRate: parseFloat(import.meta.env.VITE_PAPER_TRADING_SLIPPAGE || '0.0005'),
      feeRate: parseFloat(import.meta.env.VITE_PAPER_TRADING_FEE_RATE || '0.001'),
      maxSlippage: 0.002, // 0.2% حد أقصى للانزلاق
      partialFillProbability: 0.15 // 15% احتمال التنفيذ الجزئي
    };

    this.account = {
      balances: {
        'USDT': parseFloat(import.meta.env.VITE_PAPER_TRADING_BALANCE || '10000'),
        'BTC': 0,
        'ETH': 0,
        'BNB': 0,
        'ADA': 0,
        'SOL': 0
      },
      totalValue: parseFloat(import.meta.env.VITE_PAPER_TRADING_BALANCE || '10000'),
      unrealizedPnL: 0,
      realizedPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      dailyPnL: 0,
      maxDrawdown: 0,
      peakBalance: parseFloat(import.meta.env.VITE_PAPER_TRADING_BALANCE || '10000')
    };
    
    this.initializeRealMarketData();
    this.startRealPriceUpdates();
  }

  public static getInstance(): PaperTradingService {
    if (!PaperTradingService.instance) {
      PaperTradingService.instance = new PaperTradingService();
    }
    return PaperTradingService.instance;
  }

  /**
   * تهيئة بيانات السوق الحقيقية من Binance
   */
  private async initializeRealMarketData(): Promise<void> {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
    
    try {
      // جلب الأسعار الحالية
      const currentPrices = await backendService.getCurrentPrices();
      
      if (Array.isArray(currentPrices)) {
        for (const priceData of currentPrices) {
          if (symbols.includes(priceData.symbol)) {
            await this.updateSymbolMarketData(priceData.symbol, parseFloat(priceData.price));
          }
        }
      }
      
      console.log('[PAPER TRADING] ✅ Real market data initialized');
    } catch (error) {
      console.error('[PAPER TRADING] Failed to initialize real market data:', error);
      // استخدام بيانات افتراضية كـ fallback
      this.initializeFallbackData();
    }
  }

  /**
   * تحديث بيانات السوق لرمز محدد
   */
  private async updateSymbolMarketData(symbol: string, currentPrice: number): Promise<void> {
    try {
      // جلب order book
      const orderBook = await backendService.getOrderBook(symbol, 20);
      
      if (!orderBook) {
        throw new Error(`Failed to fetch order book for ${symbol}`);
      }

      // حساب أفضل bid/ask
      const bestBid = orderBook.bids.length > 0 ? orderBook.bids[0].price : currentPrice * 0.999;
      const bestAsk = orderBook.asks.length > 0 ? orderBook.asks[0].price : currentPrice * 1.001;
      const spread = ((bestAsk - bestBid) / bestBid) * 100;

      // جلب بيانات الحجم من الشموع الأخيرة
      const recentCandles = await backendService.getKlines(symbol, '1h', 24);
      const volume24h = recentCandles.reduce((sum, candle) => sum + candle.volume, 0);

      this.marketData.set(symbol, {
        symbol,
        currentPrice,
        bid: bestBid,
        ask: bestAsk,
        spread,
        volume24h,
        lastUpdate: Date.now(),
        orderBook: {
          bids: orderBook.bids,
          asks: orderBook.asks,
          lastUpdateId: orderBook.lastUpdateId
        }
      });

    } catch (error) {
      console.error(`[PAPER TRADING] Failed to update market data for ${symbol}:`, error);
      
      // استخدام بيانات مبسطة كـ fallback
      this.marketData.set(symbol, {
        symbol,
        currentPrice,
        bid: currentPrice * 0.9995,
        ask: currentPrice * 1.0005,
        spread: 0.05,
        volume24h: 1000000000,
        lastUpdate: Date.now(),
        orderBook: {
          bids: [{ price: currentPrice * 0.9995, quantity: 10 }],
          asks: [{ price: currentPrice * 1.0005, quantity: 10 }],
          lastUpdateId: Date.now()
        }
      });
    }
  }

  /**
   * بدء تحديث الأسعار الحقيقية
   */
  private startRealPriceUpdates(): void {
    this.priceUpdateInterval = setInterval(async () => {
      await this.updateRealMarketPrices();
    }, 5000); // تحديث كل 5 ثواني
  }

  /**
   * تحديث أسعار السوق الحقيقية
   */
  private async updateRealMarketPrices(): Promise<void> {
    try {
      const symbols = Array.from(this.marketData.keys());
      
      // جلب الأسعار الحالية لجميع الرموز
      for (const symbol of symbols) {
        const priceData = await backendService.getCurrentPrices(symbol);
        
        if (priceData && priceData.price) {
          await this.updateSymbolMarketData(symbol, parseFloat(priceData.price));
        }
      }
      
    } catch (error) {
      console.error('[PAPER TRADING] Failed to update real market prices:', error);
    }
  }

  /**
   * بيانات افتراضية كـ fallback
   */
  private initializeFallbackData(): void {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
    const basePrices = {
      'BTCUSDT': 43250,
      'ETHUSDT': 2650,
      'BNBUSDT': 315,
      'ADAUSDT': 0.52,
      'SOLUSDT': 98
    };

    symbols.forEach(symbol => {
      const basePrice = basePrices[symbol as keyof typeof basePrices];
      const spread = basePrice * 0.001;
      
      this.marketData.set(symbol, {
        symbol,
        currentPrice: basePrice,
        bid: basePrice - spread / 2,
        ask: basePrice + spread / 2,
        spread: 0.1,
        volume24h: Math.random() * 1000000000 + 500000000,
        lastUpdate: Date.now(),
        orderBook: {
          bids: [
            { price: basePrice * 0.9995, quantity: 10 },
            { price: basePrice * 0.999, quantity: 5 }
          ],
          asks: [
            { price: basePrice * 1.0005, quantity: 10 },
            { price: basePrice * 1.001, quantity: 5 }
          ],
          lastUpdateId: Date.now()
        }
      });
    });
    
    console.log('[PAPER TRADING] ⚠️ Using fallback market data');
  }

  /**
   * تنفيذ أمر paper trading مع محاكاة واقعية
   */
  public async placeOrder(orderRequest: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quantity: number;
    price?: number;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
  }): Promise<PaperTradeOrder> {
    const orderId = this.generateOrderId();
    const timestamp = new Date().toISOString();
    const executionStart = performance.now();

    // الحصول على بيانات السوق الحقيقية
    const marketData = this.marketData.get(orderRequest.symbol);
    if (!marketData) {
      throw new Error(`Real market data not available for ${orderRequest.symbol}`);
    }
    
    const order: PaperTradeOrder = {
      id: orderId,
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      type: orderRequest.type,
      quantity: orderRequest.quantity,
      price: orderRequest.price,
      status: 'PENDING',
      timestamp,
      fills: []
    };

    // محاكاة تنفيذ الأمر مع order book حقيقي
    const executionResult = await this.simulateRealisticOrderExecution(order, marketData);
    
    // حساب الكمون
    const latency = performance.now() - executionStart;
    order.latency = latency;

    if (executionResult.success) {
      order.status = executionResult.partialFill ? 'PARTIALLY_FILLED' : 'FILLED';
      order.executedPrice = executionResult.avgExecutionPrice;
      order.executedQuantity = executionResult.totalExecutedQuantity;
      order.remainingQuantity = order.quantity - executionResult.totalExecutedQuantity;
      order.fees = executionResult.totalFees;
      order.slippage = executionResult.totalSlippage;
      order.reason = executionResult.reason;
      order.fills = executionResult.fills;

      // تحديث الرصيد
      this.updateAccountBalance(order);
      
      // تسجيل الصفقة
      await secureLoggingService.logTrade({
        symbol: order.symbol,
        action: order.side,
        price: order.executedPrice!,
        size: order.executedQuantity!,
        reason: `Paper trading: ${executionResult.reason}`,
        confidence: 100,
        strategy: 'PAPER_TRADING',
        isDryRun: true,
        orderId: order.id,
        executedPrice: order.executedPrice,
        executedSize: order.executedQuantity,
        fees: order.fees,
        status: 'SIMULATED'
      });

      console.log(
        `[PAPER TRADING] ✅ ${order.side} ${order.executedQuantity?.toFixed(6)} ${order.symbol} ` +
        `@ $${order.executedPrice?.toFixed(2)} | Fees: $${order.fees?.toFixed(4)} | ` +
        `Slippage: ${((order.slippage || 0) * 100).toFixed(3)}% | Latency: ${latency.toFixed(1)}ms`
      );
    } else {
      order.status = 'REJECTED';
      order.reason = executionResult.reason;
      console.warn(`[PAPER TRADING] Order rejected: ${executionResult.reason}`);
    }

    this.orderHistory.push(order);
    return order;
  }

  /**
   * محاكاة تنفيذ الأمر الواقعية مع order book
   */
  private async simulateRealisticOrderExecution(order: PaperTradeOrder, marketData: RealMarketData): Promise<{
    success: boolean;
    avgExecutionPrice?: number;
    totalExecutedQuantity?: number;
    totalFees?: number;
    totalSlippage?: number;
    partialFill?: boolean;
    fills?: Array<{ price: number; quantity: number; fee: number; timestamp: string }>;
    reason?: string;
  }> {
    // فحص الرصيد المتاح
    if (!this.hasSufficientBalance(order, marketData)) {
      return {
        success: false,
        reason: 'Insufficient balance'
      };
    }

    // فحص حجم الأمر الأدنى
    const minOrderSize = this.getMinOrderSize(order.symbol);
    if (order.quantity < minOrderSize) {
      return {
        success: false,
        reason: `Order size below minimum (${minOrderSize})`
      };
    }

    // محاكاة تأخير الشبكة
    await this.simulateNetworkLatency();

    const fills: Array<{ price: number; quantity: number; fee: number; timestamp: string }> = [];
    let remainingQuantity = order.quantity;
    let totalExecutedQuantity = 0;
    let totalFees = 0;
    let totalSlippage = 0;
    let weightedPriceSum = 0;

    // تحديد الجانب المناسب من order book
    const bookSide = order.side === 'BUY' ? marketData.orderBook.asks : marketData.orderBook.bids;
    
    if (order.type === 'MARKET') {
      // تنفيذ أمر السوق مقابل order book
      for (const level of bookSide) {
        if (remainingQuantity <= 0) break;

        const availableQuantity = level.quantity;
        const fillQuantity = Math.min(remainingQuantity, availableQuantity);
        
        // تطبيق انزلاق السعر
        let executionPrice = level.price;
        if (this.config.enableSlippage) {
          const slippage = this.calculateDynamicSlippage(fillQuantity, order.symbol, marketData);
          executionPrice = order.side === 'BUY' 
            ? level.price * (1 + slippage)
            : level.price * (1 - slippage);
          totalSlippage += slippage * fillQuantity;
        }

        // حساب الرسوم
        const fee = fillQuantity * executionPrice * this.config.feeRate;
        totalFees += fee;

        // إضافة التنفيذ
        fills.push({
          price: executionPrice,
          quantity: fillQuantity,
          fee,
          timestamp: new Date().toISOString()
        });

        totalExecutedQuantity += fillQuantity;
        weightedPriceSum += executionPrice * fillQuantity;
        remainingQuantity -= fillQuantity;

        // محاكاة التنفيذ الجزئي
        if (this.config.enablePartialFills && Math.random() < this.config.partialFillProbability) {
          break; // توقف عند تنفيذ جزئي
        }
      }

    } else if (order.type === 'LIMIT' && order.price) {
      // تنفيذ أمر محدد
      const canExecute = order.side === 'BUY' 
        ? order.price >= marketData.ask
        : order.price <= marketData.bid;

      if (canExecute) {
        // تنفيذ بالسعر المحدد أو أفضل
        const executionPrice = order.side === 'BUY' 
          ? Math.min(order.price, marketData.ask)
          : Math.max(order.price, marketData.bid);

        const fee = order.quantity * executionPrice * this.config.feeRate;
        
        fills.push({
          price: executionPrice,
          quantity: order.quantity,
          fee,
          timestamp: new Date().toISOString()
        });

        totalExecutedQuantity = order.quantity;
        totalFees = fee;
        weightedPriceSum = executionPrice * order.quantity;
      } else {
        return {
          success: false,
          reason: `Limit price not reachable. Current ${order.side === 'BUY' ? 'ask' : 'bid'}: ${order.side === 'BUY' ? marketData.ask : marketData.bid}`
        };
      }
    }

    if (totalExecutedQuantity === 0) {
      return {
        success: false,
        reason: 'No liquidity available at current market levels'
      };
    }

    const avgExecutionPrice = weightedPriceSum / totalExecutedQuantity;
    const avgSlippage = totalSlippage / totalExecutedQuantity;
    const isPartialFill = totalExecutedQuantity < order.quantity;

    return {
      success: true,
      avgExecutionPrice,
      totalExecutedQuantity,
      totalFees,
      totalSlippage: avgSlippage,
      partialFill: isPartialFill,
      fills,
      reason: isPartialFill 
        ? `Partially filled: ${totalExecutedQuantity}/${order.quantity}`
        : 'Order fully executed'
    };
  }

  /**
   * حساب انزلاق السعر الديناميكي
   */
  private calculateDynamicSlippage(quantity: number, symbol: string, marketData: RealMarketData): number {
    if (!this.config.enableSlippage) return 0;

    // انزلاق أساسي
    let slippage = this.config.slippageRate;

    // انزلاق إضافي بناءً على حجم الأمر
    const orderValue = quantity * marketData.currentPrice;
    const marketCapImpact = Math.min(orderValue / 1000000, 0.001); // تأثير رأس المال
    
    // انزلاق إضافي بناءً على السبريد الحالي
    const spreadImpact = Math.max(0, (marketData.spread - 0.05) * 0.1);
    
    // انزلاق إضافي في أوقات التقلب العالي
    const volatilityImpact = marketData.spread > 0.1 ? 0.0005 : 0;
    
    slippage += marketCapImpact + spreadImpact + volatilityImpact;
    
    return Math.min(slippage, this.config.maxSlippage);
  }

  /**
   * محاكاة كمون الشبكة
   */
  private async simulateNetworkLatency(): Promise<void> {
    // كمون واقعي بين 10-100ms
    const latency = 10 + Math.random() * 90;
    await new Promise(resolve => setTimeout(resolve, latency));
  }

  /**
   * فحص الرصيد المتاح
   */
  private hasSufficientBalance(order: PaperTradeOrder, marketData: RealMarketData): boolean {
    const baseAsset = this.getBaseAsset(order.symbol);
    const quoteAsset = this.getQuoteAsset(order.symbol);

    if (order.side === 'BUY') {
      const requiredQuote = order.quantity * marketData.ask * 1.002; // مع هامش للرسوم
      return this.account.balances[quoteAsset] >= requiredQuote;
    } else {
      return this.account.balances[baseAsset] >= order.quantity;
    }
  }

  /**
   * الحصول على الحد الأدنى لحجم الأمر
   */
  private getMinOrderSize(symbol: string): number {
    const minSizes: Record<string, number> = {
      'BTCUSDT': 0.00001,
      'ETHUSDT': 0.0001,
      'BNBUSDT': 0.001,
      'ADAUSDT': 1,
      'SOLUSDT': 0.01
    };
    
    return minSizes[symbol] || 0.001;
  }

  /**
   * تحديث رصيد الحساب بعد تنفيذ الأمر
   */
  private updateAccountBalance(order: PaperTradeOrder): void {
    const baseAsset = this.getBaseAsset(order.symbol);
    const quoteAsset = this.getQuoteAsset(order.symbol);

    if (order.side === 'BUY') {
      // خصم العملة المقتبسة
      const totalCost = order.executedQuantity! * order.executedPrice! + order.fees!;
      this.account.balances[quoteAsset] -= totalCost;
      
      // إضافة العملة الأساسية
      this.account.balances[baseAsset] += order.executedQuantity!;
    } else {
      // خصم العملة الأساسية
      this.account.balances[baseAsset] -= order.executedQuantity!;
      
      // إضافة العملة المقتبسة (مطروحاً منها الرسوم)
      const totalReceived = order.executedQuantity! * order.executedPrice! - order.fees!;
      this.account.balances[quoteAsset] += totalReceived;
    }

    // تحديث إحصائيات الحساب
    this.account.totalTrades++;
    
    // حساب الربح/الخسارة للصفقة
    if (order.side === 'SELL') {
      const avgBuyPrice = this.getAverageBuyPrice(baseAsset);
      if (avgBuyPrice > 0) {
        const profit = (order.executedPrice! - avgBuyPrice) * order.executedQuantity!;
        this.account.dailyPnL += profit;
        
        if (profit > 0) {
          this.account.winningTrades++;
        }
      }
    }
    
    this.updateAccountValue();
  }

  /**
   * حساب متوسط سعر الشراء
   */
  private getAverageBuyPrice(asset: string): number {
    // حساب متوسط سعر الشراء من سجل الصفقات
    const buyOrders = this.orderHistory.filter(order => 
      order.side === 'BUY' && 
      order.status === 'FILLED' && 
      this.getBaseAsset(order.symbol) === asset
    );

    if (buyOrders.length === 0) return 0;

    let totalQuantity = 0;
    let totalValue = 0;

    buyOrders.forEach(order => {
      totalQuantity += order.executedQuantity || 0;
      totalValue += (order.executedQuantity || 0) * (order.executedPrice || 0);
    });

    return totalQuantity > 0 ? totalValue / totalQuantity : 0;
  }

  /**
   * تحديث قيمة الحساب الإجمالية
   */
  private async updateAccountValue(): Promise<void> {
    let totalValue = 0;
    let unrealizedPnL = 0;

    for (const [asset, balance] of Object.entries(this.account.balances)) {
      if (asset === 'USDT') {
        totalValue += balance;
      } else if (balance > 0) {
        const marketData = this.marketData.get(`${asset}USDT`);
        if (marketData) {
          const currentValue = balance * marketData.currentPrice;
          totalValue += currentValue;

          // حساب الربح/الخسارة غير المحققة
          const avgBuyPrice = this.getAverageBuyPrice(asset);
          if (avgBuyPrice > 0) {
            const positionPnL = (marketData.currentPrice - avgBuyPrice) * balance;
            unrealizedPnL += positionPnL;
          }
        }
      }
    }

    this.account.totalValue = totalValue;
    this.account.unrealizedPnL = unrealizedPnL;
    
    // تحديث الذروة وحساب الـ drawdown
    if (totalValue > this.account.peakBalance) {
      this.account.peakBalance = totalValue;
    }
    
    const currentDrawdown = ((this.account.peakBalance - totalValue) / this.account.peakBalance) * 100;
    this.account.maxDrawdown = Math.max(this.account.maxDrawdown, currentDrawdown);
    
    const initialBalance = parseFloat(import.meta.env.VITE_PAPER_TRADING_BALANCE || '10000');
    this.account.realizedPnL = totalValue - initialBalance - unrealizedPnL;
  }

  /**
   * استخراج العملة الأساسية من الرمز
   */
  private getBaseAsset(symbol: string): string {
    if (symbol.endsWith('USDT')) return symbol.replace('USDT', '');
    if (symbol.endsWith('BTC')) return symbol.replace('BTC', '');
    if (symbol.endsWith('ETH')) return symbol.replace('ETH', '');
    if (symbol.endsWith('BNB')) return symbol.replace('BNB', '');
    return symbol.substring(0, 3); // افتراضي
  }

  /**
   * استخراج العملة المقتبسة من الرمز
   */
  private getQuoteAsset(symbol: string): string {
    if (symbol.endsWith('USDT')) return 'USDT';
    if (symbol.endsWith('BTC')) return 'BTC';
    if (symbol.endsWith('ETH')) return 'ETH';
    if (symbol.endsWith('BNB')) return 'BNB';
    return 'USDT';
  }

  /**
   * توليد معرف أمر فريد
   */
  private generateOrderId(): string {
    return `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * الحصول على معلومات الحساب
   */
  public getAccountInfo(): PaperAccount {
    return { ...this.account };
  }

  /**
   * الحصول على الأوامر المفتوحة
   */
  public getOpenOrders(): PaperTradeOrder[] {
    return Array.from(this.openOrders.values());
  }

  /**
   * الحصول على تاريخ الأوامر
   */
  public getOrderHistory(limit: number = 50): PaperTradeOrder[] {
    return this.orderHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * إلغاء أمر
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.openOrders.get(orderId);
    if (order && order.status === 'PENDING') {
      order.status = 'CANCELLED';
      this.openOrders.delete(orderId);
      this.orderHistory.push(order);
      
      console.log(`[PAPER TRADING] Order cancelled: ${orderId}`);
      return true;
    }
    return false;
  }

  /**
   * الحصول على أسعار السوق الحقيقية
   */
  public getMarketPrices(): Record<string, RealMarketData> {
    const prices: Record<string, RealMarketData> = {};
    this.marketData.forEach((data, symbol) => {
      prices[symbol] = { ...data };
    });
    return prices;
  }

  /**
   * الحصول على إحصائيات مفصلة
   */
  public getDetailedStats(): {
    account: PaperAccount;
    performance: {
      winRate: number;
      avgProfit: number;
      avgLoss: number;
      profitFactor: number;
      sharpeRatio: number;
      avgLatency: number;
      avgSlippage: number;
    };
    risk: {
      currentDrawdown: number;
      maxDrawdown: number;
      dailyPnL: number;
      riskScore: number;
    };
    execution: {
      totalFills: number;
      partialFills: number;
      rejectedOrders: number;
      avgFillRate: number;
    };
  } {
    const filledOrders = this.orderHistory.filter(order => 
      order.status === 'FILLED' || order.status === 'PARTIALLY_FILLED'
    );
    
    const winningOrders = filledOrders.filter(order => {
      const profit = this.calculateOrderProfit(order);
      return profit > 0;
    });
    
    const losingOrders = filledOrders.filter(order => {
      const profit = this.calculateOrderProfit(order);
      return profit < 0;
    });
    
    const winRate = filledOrders.length > 0 
      ? (winningOrders.length / filledOrders.length) * 100 
      : 0;
    
    const avgProfit = winningOrders.length > 0
      ? winningOrders.reduce((sum, order) => sum + this.calculateOrderProfit(order), 0) / winningOrders.length
      : 0;
    
    const avgLoss = losingOrders.length > 0
      ? Math.abs(losingOrders.reduce((sum, order) => sum + this.calculateOrderProfit(order), 0) / losingOrders.length)
      : 0;
    
    const profitFactor = avgLoss > 0 ? avgProfit / avgLoss : 0;
    const sharpeRatio = this.calculateSharpeRatio();
    
    // إحصائيات الأداء
    const avgLatency = filledOrders.length > 0
      ? filledOrders.reduce((sum, order) => sum + (order.latency || 0), 0) / filledOrders.length
      : 0;
    
    const avgSlippage = filledOrders.length > 0
      ? filledOrders.reduce((sum, order) => sum + (order.slippage || 0), 0) / filledOrders.length
      : 0;

    // إحصائيات التنفيذ
    const totalFills = filledOrders.reduce((sum, order) => sum + order.fills.length, 0);
    const partialFills = this.orderHistory.filter(order => order.status === 'PARTIALLY_FILLED').length;
    const rejectedOrders = this.orderHistory.filter(order => order.status === 'REJECTED').length;
    const avgFillRate = this.orderHistory.length > 0
      ? filledOrders.length / this.orderHistory.length
      : 0;

    const currentDrawdown = ((this.account.peakBalance - this.account.totalValue) / this.account.peakBalance) * 100;
    const riskScore = Math.max(0, 100 - currentDrawdown - (avgLoss * 10));

    return {
      account: this.account,
      performance: {
        winRate,
        avgProfit,
        avgLoss,
        profitFactor,
        sharpeRatio,
        avgLatency,
        avgSlippage: avgSlippage * 100 // تحويل إلى نسبة مئوية
      },
      risk: {
        currentDrawdown,
        maxDrawdown: this.account.maxDrawdown,
        dailyPnL: this.account.dailyPnL,
        riskScore
      },
      execution: {
        totalFills,
        partialFills,
        rejectedOrders,
        avgFillRate: avgFillRate * 100
      }
    };
  }

  /**
   * حساب ربح الأمر
   */
  private calculateOrderProfit(order: PaperTradeOrder): number {
    if (!order.executedPrice || !order.executedQuantity) return 0;
    
    const baseAsset = this.getBaseAsset(order.symbol);
    
    if (order.side === 'SELL') {
      const avgBuyPrice = this.getAverageBuyPrice(baseAsset);
      if (avgBuyPrice > 0) {
        return (order.executedPrice - avgBuyPrice) * order.executedQuantity - (order.fees || 0);
      }
    }
    
    return 0;
  }

  /**
   * حساب نسبة شارب
   */
  private calculateSharpeRatio(): number {
    const returns = this.orderHistory
      .filter(order => order.status === 'FILLED')
      .map(order => this.calculateOrderProfit(order));
    
    if (returns.length < 2) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * تحديث إعدادات المحاكاة
   */
  public updateConfig(newConfig: Partial<PaperTradingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[PAPER TRADING] Configuration updated:', this.config);
  }

  /**
   * الحصول على إعدادات المحاكاة الحالية
   */
  public getConfig(): PaperTradingConfig {
    return { ...this.config };
  }

  /**
   * إعادة تعيين الحساب
   */
  public resetAccount(): void {
    const initialBalance = parseFloat(import.meta.env.VITE_PAPER_TRADING_BALANCE || '10000');
    
    this.account = {
      balances: {
        'USDT': initialBalance,
        'BTC': 0,
        'ETH': 0,
        'BNB': 0,
        'ADA': 0,
        'SOL': 0
      },
      totalValue: initialBalance,
      unrealizedPnL: 0,
      realizedPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      dailyPnL: 0,
      maxDrawdown: 0,
      peakBalance: initialBalance
    };
    
    this.openOrders.clear();
    this.orderHistory = [];
    
    console.log('[PAPER TRADING] Account reset to initial state');
  }

  /**
   * تنظيف الموارد
   */
  public cleanup(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
  }

  /**
   * الحصول على معلومات order book لرمز محدد
   */
  public getOrderBookInfo(symbol: string): {
    bestBid: number;
    bestAsk: number;
    spread: number;
    bidDepth: number;
    askDepth: number;
    lastUpdate: number;
  } | null {
    const marketData = this.marketData.get(symbol);
    if (!marketData) return null;

    const bidDepth = marketData.orderBook.bids.reduce((sum, bid) => sum + bid.quantity, 0);
    const askDepth = marketData.orderBook.asks.reduce((sum, ask) => sum + ask.quantity, 0);

    return {
      bestBid: marketData.bid,
      bestAsk: marketData.ask,
      spread: marketData.spread,
      bidDepth,
      askDepth,
      lastUpdate: marketData.lastUpdate
    };
  }

  /**
   * محاكاة أمر وقف الخسارة
   */
  public async placeStopLossOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    stopPrice: number;
    limitPrice?: number;
  }): Promise<PaperTradeOrder> {
    const order = await this.placeOrder({
      symbol: params.symbol,
      side: params.side,
      type: 'LIMIT',
      quantity: params.quantity,
      price: params.limitPrice || params.stopPrice
    });
    
    return order;
  }
}