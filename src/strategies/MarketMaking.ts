import { CandleData } from '../utils/TechnicalAnalysis';

export interface MarketMakingConfig {
  targetSpread: number; // السبريد المستهدف كنسبة مئوية
  maxSpread: number; // أقصى سبريد مقبول
  inventoryLimit: number; // حد المخزون كنسبة من الرصيد
  skewThreshold: number; // عتبة انحراف المخزون
  minLiquidity: number; // أقل سيولة مطلوبة
  rebalanceInterval: number; // فترة إعادة التوازن (بالثواني)
}

export interface MarketMakingSignal {
  action: 'PLACE_BID' | 'PLACE_ASK' | 'CANCEL_ORDERS' | 'REBALANCE' | 'HOLD';
  confidence: number;
  bidPrice: number;
  askPrice: number;
  bidQuantity: number;
  askQuantity: number;
  reasons: string[];
  currentSpread: number;
  inventorySkew: number;
  expectedProfit: number;
}

export interface InventoryPosition {
  symbol: string;
  quantity: number;
  avgPrice: number;
  value: number;
  skew: number; // انحراف المخزون (-1 إلى +1)
}

export class MarketMakingStrategy {
  private config: MarketMakingConfig;
  private inventory: Map<string, InventoryPosition> = new Map();
  private lastRebalance: number = 0;
  private accountBalance: number = 1000;

  constructor(config: MarketMakingConfig = {
    targetSpread: 0.1,
    maxSpread: 0.2,
    inventoryLimit: 15,
    skewThreshold: 0.3,
    minLiquidity: 500000,
    rebalanceInterval: 30000
  }) {
    this.config = config;
  }

  public analyze(
    candles: CandleData[], 
    orderBook: { bid: number; ask: number; bidSize: number; askSize: number },
    symbol: string
  ): MarketMakingSignal {
    if (candles.length === 0) {
      return this.createHoldSignal('لا توجد بيانات', 0, 0);
    }

    const currentPrice = candles[candles.length - 1].close;
    const currentSpread = ((orderBook.ask - orderBook.bid) / orderBook.bid) * 100;

    // فحص السيولة
    const totalLiquidity = (orderBook.bidSize + orderBook.askSize) * currentPrice;
    if (totalLiquidity < this.config.minLiquidity) {
      return this.createHoldSignal('سيولة منخفضة', currentSpread, 0);
    }

    // فحص السبريد
    if (currentSpread > this.config.maxSpread) {
      return this.createHoldSignal(`السبريد عالي (${currentSpread.toFixed(3)}%)`, currentSpread, 0);
    }

    // الحصول على موقع المخزون الحالي
    const inventory = this.getInventoryPosition(symbol, currentPrice);
    const inventorySkew = inventory.skew;

    const reasons: string[] = [];
    let confidence = 60; // ثقة أساسية لصانع السوق

    // فحص الحاجة لإعادة التوازن
    const now = Date.now();
    if (Math.abs(inventorySkew) > this.config.skewThreshold || 
        now - this.lastRebalance > this.config.rebalanceInterval) {
      
      if (Math.abs(inventorySkew) > this.config.skewThreshold) {
        return this.createRebalanceSignal(inventory, currentPrice, currentSpread);
      }
    }

    // حساب أسعار العرض والطلب
    const halfSpread = (this.config.targetSpread / 100) / 2;
    const bidPrice = currentPrice * (1 - halfSpread);
    const askPrice = currentPrice * (1 + halfSpread);

    // تعديل الأسعار بناءً على انحراف المخزون
    const skewAdjustment = inventorySkew * 0.001; // تعديل 0.1% لكل 10% انحراف
    const adjustedBidPrice = bidPrice * (1 - skewAdjustment);
    const adjustedAskPrice = askPrice * (1 + skewAdjustment);

    // حساب الكميات
    const baseQuantity = this.calculateBaseQuantity(currentPrice);
    const bidQuantity = baseQuantity * (1 + inventorySkew * 0.5); // زيادة العرض عند انحراف سلبي
    const askQuantity = baseQuantity * (1 - inventorySkew * 0.5); // زيادة الطلب عند انحراف إيجابي

    reasons.push(`وضع أوامر بسبريد ${this.config.targetSpread}%`);
    reasons.push(`انحراف المخزون: ${(inventorySkew * 100).toFixed(1)}%`);

    if (Math.abs(inventorySkew) > 0.1) {
      reasons.push('تعديل الأسعار لتقليل انحراف المخزون');
      confidence += 10;
    }

    // حساب الربح المتوقع
    const expectedProfit = (askPrice - bidPrice) * Math.min(bidQuantity, askQuantity) * 0.5; // احتمال 50% للتنفيذ

    return {
      action: 'PLACE_BID',
      confidence,
      bidPrice: adjustedBidPrice,
      askPrice: adjustedAskPrice,
      bidQuantity,
      askQuantity,
      reasons,
      currentSpread,
      inventorySkew,
      expectedProfit
    };
  }

  private getInventoryPosition(symbol: string, currentPrice: number): InventoryPosition {
    let position = this.inventory.get(symbol);
    
    if (!position) {
      position = {
        symbol,
        quantity: 0,
        avgPrice: currentPrice,
        value: 0,
        skew: 0
      };
      this.inventory.set(symbol, position);
    }

    // تحديث القيمة والانحراف
    position.value = position.quantity * currentPrice;
    const maxValue = this.accountBalance * (this.config.inventoryLimit / 100);
    position.skew = position.value / maxValue;

    return position;
  }

  private calculateBaseQuantity(price: number): number {
    // كمية أساسية تمثل 0.5% من الرصيد
    const baseAmount = this.accountBalance * 0.005;
    return baseAmount / price;
  }

  private createRebalanceSignal(inventory: InventoryPosition, currentPrice: number, spread: number): MarketMakingSignal {
    const reasons = [`إعادة توازن المخزون (انحراف: ${(inventory.skew * 100).toFixed(1)}%)`];
    
    return {
      action: 'REBALANCE',
      confidence: 90,
      bidPrice: currentPrice,
      askPrice: currentPrice,
      bidQuantity: Math.abs(inventory.quantity),
      askQuantity: Math.abs(inventory.quantity),
      reasons,
      currentSpread: spread,
      inventorySkew: inventory.skew,
      expectedProfit: 0
    };
  }

  private createHoldSignal(reason: string, spread: number, expectedProfit: number): MarketMakingSignal {
    return {
      action: 'HOLD',
      confidence: 0,
      bidPrice: 0,
      askPrice: 0,
      bidQuantity: 0,
      askQuantity: 0,
      reasons: [reason],
      currentSpread: spread,
      inventorySkew: 0,
      expectedProfit
    };
  }

  public updateInventory(symbol: string, quantity: number, price: number): void {
    const position = this.getInventoryPosition(symbol, price);
    
    if (position.quantity === 0) {
      position.quantity = quantity;
      position.avgPrice = price;
    } else {
      const totalValue = (position.quantity * position.avgPrice) + (quantity * price);
      position.quantity += quantity;
      position.avgPrice = totalValue / position.quantity;
    }

    position.value = position.quantity * price;
    this.inventory.set(symbol, position);
  }

  public backtest(historicalData: CandleData[]): {
    totalTrades: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    avgSpread: number;
    inventoryTurnover: number;
  } {
    let totalTrades = 0;
    let winningTrades = 0;
    let totalReturn = 0;
    let maxDrawdown = 0;
    let peak = 0;
    let spreadSum = 0;
    let inventoryChanges = 0;

    // محاكاة order book
    for (let i = 20; i < historicalData.length; i++) {
      const windowData = historicalData.slice(0, i + 1);
      const currentPrice = windowData[windowData.length - 1].close;
      
      // محاكاة order book
      const mockOrderBook = {
        bid: currentPrice * 0.9995,
        ask: currentPrice * 1.0005,
        bidSize: 10,
        askSize: 10
      };

      const signal = this.analyze(windowData, mockOrderBook, 'BTCUSDT');

      if (signal.action === 'PLACE_BID' && signal.confidence > 60) {
        totalTrades += 2; // bid + ask
        spreadSum += signal.currentSpread;
        
        // محاكاة تنفيذ الأوامر
        const spreadProfit = (signal.askPrice - signal.bidPrice) / signal.bidPrice;
        const fees = 0.002; // 0.2% رسوم إجمالية
        const netReturn = spreadProfit - fees;
        
        totalReturn += netReturn;
        inventoryChanges++;
        
        if (netReturn > 0) winningTrades++;

        // حساب drawdown
        if (totalReturn > peak) peak = totalReturn;
        const currentDrawdown = (peak - totalReturn) / peak * 100;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }
    }

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgSpread = totalTrades > 0 ? spreadSum / (totalTrades / 2) : 0;
    const inventoryTurnover = inventoryChanges;

    return {
      totalTrades,
      winRate,
      totalReturn: totalReturn * 100,
      maxDrawdown,
      avgSpread,
      inventoryTurnover
    };
  }
}