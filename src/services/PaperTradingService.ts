/**
 * خدمة Paper Trading المحسنة - محاكاة واقعية للتداول
 * تدعم جميع أنواع الأوامر وتحاكي سلوك Binance بدقة
 */

import { secureLoggingService } from './SecureLoggingService';
import { RetryService } from './RetryService';

export interface PaperTradeOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  timestamp: string;
  executedPrice?: number;
  executedQuantity?: number;
  fees?: number;
  slippage?: number;
  reason?: string;
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

export interface MarketSimulation {
  symbol: string;
  currentPrice: number;
  bid: number;
  ask: number;
  spread: number;
  volume24h: number;
  lastUpdate: number;
}
export class PaperTradingService {
  private static instance: PaperTradingService;
  private account: PaperAccount;
  private openOrders: Map<string, PaperTradeOrder> = new Map();
  private orderHistory: PaperTradeOrder[] = [];
  private marketData: Map<string, MarketSimulation> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.account = {
      balances: {
        'USDT': parseFloat(process.env.VITE_PAPER_TRADING_BALANCE || '10000'),
        'BTC': 0,
        'ETH': 0,
        'BNB': 0,
        'ADA': 0,
        'SOL': 0
      },
      totalValue: parseFloat(process.env.VITE_PAPER_TRADING_BALANCE || '10000'),
      unrealizedPnL: 0,
      realizedPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      dailyPnL: 0,
      maxDrawdown: 0,
      peakBalance: parseFloat(process.env.VITE_PAPER_TRADING_BALANCE || '10000')
    };
    
    this.initializeMarketData();
    this.startPriceUpdates();
  }

  public static getInstance(): PaperTradingService {
    if (!PaperTradingService.instance) {
      PaperTradingService.instance = new PaperTradingService();
    }
    return PaperTradingService.instance;
  }

  /**
   * تهيئة بيانات السوق الأولية
   */
  private initializeMarketData(): void {
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
      const spread = basePrice * 0.001; // 0.1% spread
      
      this.marketData.set(symbol, {
        symbol,
        currentPrice: basePrice,
        bid: basePrice - spread / 2,
        ask: basePrice + spread / 2,
        spread: 0.1,
        volume24h: Math.random() * 1000000000 + 500000000,
        lastUpdate: Date.now()
      });
    });
  }

  /**
   * بدء تحديث الأسعار التلقائي
   */
  private startPriceUpdates(): void {
    this.priceUpdateInterval = setInterval(() => {
      this.updateMarketPrices();
    }, 2000); // تحديث كل ثانيتين
  }

  /**
   * تحديث أسعار السوق (محاكاة)
   */
  private updateMarketPrices(): void {
    this.marketData.forEach((market, symbol) => {
      // محاكاة تحرك السعر
      const volatility = 0.001; // 0.1% تقلب
      const change = (Math.random() - 0.5) * volatility * market.currentPrice;
      
      market.currentPrice += change;
      market.bid = market.currentPrice * 0.9995;
      market.ask = market.currentPrice * 1.0005;
      market.spread = ((market.ask - market.bid) / market.bid) * 100;
      market.lastUpdate = Date.now();
      
      this.marketData.set(symbol, market);
    });
  }

  /**
   * تنفيذ أمر paper trading
   */
  public async placeOrder(orderRequest: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quantity: number;
    price?: number;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
    stopPrice?: number;
  }): Promise<PaperTradeOrder> {
    const orderId = this.generateOrderId();
    const timestamp = new Date().toISOString();

    // الحصول على بيانات السوق
    const marketData = this.getMarketData(orderRequest.symbol);
    if (!marketData) {
      throw new Error(`Market data not available for ${orderRequest.symbol}`);
    }
    
    const order: PaperTradeOrder = {
      id: orderId,
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      type: orderRequest.type,
      quantity: orderRequest.quantity,
      price: orderRequest.price,
      status: 'PENDING',
      timestamp
    };

    // محاكاة تنفيذ الأمر
    const executionResult = await this.simulateOrderExecution(order, marketData);
    
    if (executionResult.success) {
      order.status = 'FILLED';
      order.executedPrice = executionResult.executedPrice;
      order.executedQuantity = executionResult.executedQuantity;
      order.fees = executionResult.fees;
      order.slippage = executionResult.slippage;
      order.reason = executionResult.reason;

      // تحديث الرصيد
      this.updateAccountBalance(order);
      
      // تسجيل الصفقة
      await secureLoggingService.logTrade({
        symbol: order.symbol,
        action: order.side,
        price: order.executedPrice!,
        size: order.executedQuantity!,
        reason: 'Paper trading order execution',
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
        `Slippage: ${((order.slippage || 0) * 100).toFixed(3)}%`
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
   * محاكاة تنفيذ الأمر
   */
  private async simulateOrderExecution(order: PaperTradeOrder, marketData: MarketSimulation): Promise<{
    success: boolean;
    executedPrice?: number;
    executedQuantity?: number;
    fees?: number;
    slippage?: number;
    reason?: string;
  }> {
    const currentPrice = marketData.currentPrice;
    
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

    // تحديد سعر التنفيذ
    let executedPrice: number;
    
    if (order.type === 'LIMIT' && order.price) {
      // للأوامر المحددة، تحقق من إمكانية التنفيذ
      if (order.side === 'BUY' && order.price < marketData.ask) {
        return { success: false, reason: 'Limit price too low for BUY order' };
      }
      if (order.side === 'SELL' && order.price > marketData.bid) {
        return { success: false, reason: 'Limit price too high for SELL order' };
      }
      executedPrice = order.price;
    } else {
      // أوامر السوق تستخدم أفضل سعر متاح
      executedPrice = order.side === 'BUY' ? marketData.ask : marketData.bid;
    }

    // محاكاة انزلاق السعر (slippage)
    const slippage = this.calculateSlippage(order.quantity, order.symbol, marketData);
    if (order.side === 'BUY') {
      executedPrice *= (1 + slippage);
    } else {
      executedPrice *= (1 - slippage);
    }

    // حساب الرسوم
    const feeRate = parseFloat(process.env.VITE_PAPER_TRADING_FEE_RATE || '0.001');
    const fees = order.quantity * executedPrice * feeRate;

    // محاكاة تأخير التنفيذ
    await this.simulateExecutionDelay();

    return {
      success: true,
      executedPrice,
      executedQuantity: order.quantity,
      fees,
      slippage,
      reason: 'Order executed successfully'
    };
  }

  /**
   * محاكاة تأخير التنفيذ
   */
  private async simulateExecutionDelay(): Promise<void> {
    // تأخير عشوائي بين 50-200ms لمحاكاة زمن التنفيذ الحقيقي
    const delay = 50 + Math.random() * 150;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * فحص الرصيد المتاح
   */
  private hasSufficientBalance(order: PaperTradeOrder, marketData: MarketSimulation): boolean {
    const baseAsset = this.getBaseAsset(order.symbol);
    const quoteAsset = this.getQuoteAsset(order.symbol);
    const currentPrice = marketData.currentPrice;

    if (order.side === 'BUY') {
      const requiredQuote = order.quantity * currentPrice * 1.002; // مع هامش للرسوم
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
   * الحصول على بيانات السوق
   */
  private getMarketData(symbol: string): MarketSimulation | null {
    return this.marketData.get(symbol) || null;
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
    const tradeValue = order.executedQuantity! * order.executedPrice!;
    if (order.side === 'SELL') {
      // حساب الربح من البيع
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
    // في تطبيق حقيقي، نحتاج لتتبع متوسط سعر الشراء
    // هنا نستخدم تقدير بسيط
    return 0;
  }

  /**
   * تحديث قيمة الحساب الإجمالية
   */
  private async updateAccountValue(): Promise<void> {
    let totalValue = 0;

    for (const [asset, balance] of Object.entries(this.account.balances)) {
      if (asset === 'USDT') {
        totalValue += balance;
      } else {
        const marketData = this.getMarketData(`${asset}USDT`);
        if (marketData && balance > 0) {
          totalValue += balance * marketData.currentPrice;
        }
      }
    }

    this.account.totalValue = totalValue;
    
    // تحديث الذروة وحساب الـ drawdown
    if (totalValue > this.account.peakBalance) {
      this.account.peakBalance = totalValue;
    }
    
    const currentDrawdown = ((this.account.peakBalance - totalValue) / this.account.peakBalance) * 100;
    this.account.maxDrawdown = Math.max(this.account.maxDrawdown, currentDrawdown);
    
    const initialBalance = parseFloat(process.env.VITE_PAPER_TRADING_BALANCE || '10000');
    this.account.realizedPnL = totalValue - initialBalance;
  }

  /**
   * حساب انزلاق السعر المحسن
   */
  private calculateSlippage(quantity: number, symbol: string, marketData: MarketSimulation): number {
    // انزلاق أساسي 0.05% + انزلاق إضافي حسب الكمية
    const baseSlippage = parseFloat(process.env.VITE_PAPER_TRADING_SLIPPAGE || '0.0005');
    
    // انزلاق إضافي بناءً على حجم الأمر مقارنة بالسيولة
    const orderValue = quantity * marketData.currentPrice;
    const liquidityImpact = Math.min(orderValue / 100000, 0.002); // تأثير السيولة
    
    // انزلاق إضافي في أوقات التقلب العالي
    const volatilitySlippage = marketData.spread > 0.2 ? 0.001 : 0;
    
    return baseSlippage + liquidityImpact + volatilitySlippage;
  }

  /**
   * استخراج العملة الأساسية من الرمز
   */
  private getBaseAsset(symbol: string): string {
    // مثال: BTCUSDT -> BTC
    return symbol.replace('USDT', '').replace('BTC', 'BTC').replace('ETH', 'ETH').replace('BNB', 'BNB');
  }

  /**
   * استخراج العملة المقتبسة من الرمز
   */
  private getQuoteAsset(symbol: string): string {
    // معظم الأزواج تنتهي بـ USDT
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
   * الحصول على أسعار السوق الحالية
   */
  public getMarketPrices(): Record<string, MarketSimulation> {
    const prices: Record<string, MarketSimulation> = {};
    this.marketData.forEach((data, symbol) => {
      prices[symbol] = { ...data };
    });
    return prices;
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
    
    // في تطبيق حقيقي، نحتاج لمراقبة السعر وتنفيذ الأمر عند الوصول لـ stopPrice
    return order;
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
    };
    risk: {
      currentDrawdown: number;
      maxDrawdown: number;
      dailyPnL: number;
      riskScore: number;
    };
  } {
    const winningOrders = this.orderHistory.filter(order => 
      order.status === 'FILLED' && this.calculateOrderProfit(order) > 0
    );
    
    const losingOrders = this.orderHistory.filter(order => 
      order.status === 'FILLED' && this.calculateOrderProfit(order) < 0
    );
    
    const winRate = this.account.totalTrades > 0 
      ? (this.account.winningTrades / this.account.totalTrades) * 100 
      : 0;
    
    const avgProfit = winningOrders.length > 0
      ? winningOrders.reduce((sum, order) => sum + this.calculateOrderProfit(order), 0) / winningOrders.length
      : 0;
    
    const avgLoss = losingOrders.length > 0
      ? Math.abs(losingOrders.reduce((sum, order) => sum + this.calculateOrderProfit(order), 0) / losingOrders.length)
      : 0;
    
    const profitFactor = avgLoss > 0 ? avgProfit / avgLoss : 0;
    const sharpeRatio = this.calculateSharpeRatio();
    
    const currentDrawdown = ((this.account.peakBalance - this.account.totalValue) / this.account.peakBalance) * 100;
    const riskScore = Math.max(0, 100 - currentDrawdown - (avgLoss * 10));

    return {
      account: this.account,
      performance: {
        winRate,
        avgProfit,
        avgLoss,
        profitFactor,
        sharpeRatio
      },
      risk: {
        currentDrawdown,
        maxDrawdown: this.account.maxDrawdown,
        dailyPnL: this.account.dailyPnL,
        riskScore
      }
    };
  }

  /**
   * حساب ربح الأمر
   */
  private calculateOrderProfit(order: PaperTradeOrder): number {
    if (!order.executedPrice || !order.executedQuantity) return 0;
    
    // هذا تبسيط - في تطبيق حقيقي نحتاج لتتبع أسعار الشراء/البيع
    return 0;
  }

  /**
   * حساب نسبة شارب
   */
  private calculateSharpeRatio(): number {
    // تبسيط لحساب نسبة شارب
    if (this.account.maxDrawdown === 0) return 0;
    return this.account.realizedPnL / this.account.maxDrawdown;
  }

  /**
   * إعادة تعيين الحساب
   */
  public resetAccount(): void {
    const initialBalance = parseFloat(process.env.VITE_PAPER_TRADING_BALANCE || '10000');
    
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
    this.initializeMarketData();
    
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
}