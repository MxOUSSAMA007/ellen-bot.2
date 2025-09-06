import { CandleData } from '../utils/TechnicalAnalysis';

export interface ScalpingConfig {
  profitTarget: number; // هدف الربح كنسبة مئوية (0.2-0.5%)
  stopLoss: number; // وقف الخسارة كنسبة مئوية (0.3-0.6%)
  maxSpread: number; // أقصى سبريد مقبول
  minVolume: number; // أقل حجم مطلوب
  rsiPeriod: number;
  emaPeriod: number;
  maxHoldTime: number; // أقصى وقت احتفاظ بالصفقة (بالدقائق)
}

export interface ScalpingSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  reasons: string[];
  spread: number;
  expectedProfit: number;
  riskReward: number;
}

export class ScalpingStrategy {
  private config: ScalpingConfig;
  private lastSignalTime: number = 0;
  private minSignalInterval: number = 5000; // 5 ثواني بين الإشارات
  private accountBalance: number = 10000; // محاكاة الرصيد

  constructor(config: ScalpingConfig = {
    profitTarget: 0.3,
    stopLoss: 0.4,
    maxSpread: 0.05,
    minVolume: 1000000,
    rsiPeriod: 7,
    emaPeriod: 9,
    maxHoldTime: 15
  }) {
    this.config = config;
  }

  public analyze(candles: CandleData[], orderBook?: { bid: number; ask: number }): ScalpingSignal {
    if (candles.length < this.config.emaPeriod) {
      return this.createHoldSignal('بيانات غير كافية للتحليل', 0, 0);
    }

    // فحص التوقيت (تجنب الإشارات المتكررة)
    const now = Date.now();
    if (now - this.lastSignalTime < this.minSignalInterval) {
      return this.createHoldSignal('انتظار فترة التهدئة', 0, 0);
    }

    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const currentPrice = closes[closes.length - 1];
    const currentVolume = volumes[volumes.length - 1];

    // حساب السبريد
    const spread = orderBook ? ((orderBook.ask - orderBook.bid) / orderBook.bid) * 100 : 0.02;
    
    // فحص شروط السيولة
    if (spread > this.config.maxSpread) {
      return this.createHoldSignal(`السبريد عالي جداً (${spread.toFixed(3)}%)`, spread, 0);
    }

    if (currentVolume < this.config.minVolume) {
      return this.createHoldSignal('حجم التداول منخفض', spread, 0);
    }

    // حساب المؤشرات السريعة
    const rsi = this.calculateRSI(closes, this.config.rsiPeriod);
    const ema = this.calculateEMA(closes, this.config.emaPeriod);
    const momentum = this.calculateMomentum(closes, 3);
    const volatility = this.calculateVolatility(candles, 10);

    const reasons: string[] = [];
    let confidence = 0;
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

    // إشارات الشراء السريعة
    if (currentPrice > ema && rsi < 70 && momentum > 0) {
      action = 'BUY';
      confidence += 40;
      reasons.push('السعر فوق EMA مع زخم إيجابي');
      reasons.push(`RSI في منطقة آمنة (${rsi.toFixed(1)})`);
    }

    // إشارات البيع السريعة
    if (currentPrice < ema && rsi > 30 && momentum < 0) {
      action = 'SELL';
      confidence += 40;
      reasons.push('السعر تحت EMA مع زخم سلبي');
      reasons.push(`RSI في منطقة آمنة (${rsi.toFixed(1)})`);
    }

    // تأكيدات إضافية للسكالبينج
    if (action !== 'HOLD') {
      // فحص التقلبات (مناسبة للسكالبينج)
      if (volatility > 0.001 && volatility < 0.01) {
        confidence += 20;
        reasons.push('تقلبات مناسبة للسكالبينج');
      }

      // فحص اتجاه قصير المدى
      const shortTrend = this.calculateShortTermTrend(closes, 5);
      if ((action === 'BUY' && shortTrend > 0) || (action === 'SELL' && shortTrend < 0)) {
        confidence += 15;
        reasons.push('الاتجاه قصير المدى يدعم الإشارة');
      }

      // فحص نسبة المخاطرة للعائد
      const riskReward = this.config.profitTarget / this.config.stopLoss;
      if (riskReward >= 1) {
        confidence += 10;
        reasons.push(`نسبة مخاطرة/عائد جيدة (${riskReward.toFixed(2)})`);
      }
    }

    // حساب مستويات الخروج
    const stopLoss = action === 'BUY' 
      ? currentPrice * (1 - this.config.stopLoss / 100)
      : currentPrice * (1 + this.config.stopLoss / 100);

    const takeProfit = action === 'BUY'
      ? currentPrice * (1 + this.config.profitTarget / 100)
      : currentPrice * (1 - this.config.profitTarget / 100);

    // حساب الكمية بناءً على المخاطرة
    const riskAmount = this.accountBalance * 0.01; // 1% مخاطرة
    const quantity = riskAmount / Math.abs(currentPrice - stopLoss);

    const expectedProfit = action !== 'HOLD' 
      ? Math.abs(takeProfit - currentPrice) * quantity - (spread / 100 * currentPrice * quantity * 2)
      : 0;

    if (action !== 'HOLD') {
      this.lastSignalTime = now;
    }

    return {
      action,
      confidence: Math.min(confidence, 95),
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      quantity,
      reasons,
      spread,
      expectedProfit,
      riskReward: this.config.profitTarget / this.config.stopLoss
    };
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    
    const current = prices[prices.length - 1];
    const previous = prices[prices.length - 1 - period];
    
    return (current - previous) / previous;
  }

  private calculateVolatility(candles: CandleData[], period: number): number {
    if (candles.length < period) return 0;

    const recentCandles = candles.slice(-period);
    const returns = recentCandles.slice(1).map((candle, i) => 
      Math.log(candle.close / recentCandles[i].close)
    );

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private calculateShortTermTrend(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    
    const recentPrices = prices.slice(-period);
    const firstPrice = recentPrices[0];
    const lastPrice = recentPrices[recentPrices.length - 1];
    
    return (lastPrice - firstPrice) / firstPrice;
  }

  private createHoldSignal(reason: string, spread: number, expectedProfit: number): ScalpingSignal {
    return {
      action: 'HOLD',
      confidence: 0,
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      quantity: 0,
      reasons: [reason],
      spread,
      expectedProfit,
      riskReward: 0
    };
  }

  public backtest(historicalData: CandleData[]): {
    totalTrades: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    avgHoldTime: number;
    profitAfterFees: number;
  } {
    let totalTrades = 0;
    let winningTrades = 0;
    let totalReturn = 0;
    let maxDrawdown = 0;
    let peak = 0;
    let totalHoldTime = 0;
    let totalFees = 0;

    const feeRate = 0.001; // 0.1% رسوم

    for (let i = this.config.emaPeriod; i < historicalData.length - 5; i++) {
      const windowData = historicalData.slice(0, i + 1);
      const signal = this.analyze(windowData);

      if (signal.action !== 'HOLD' && signal.confidence > 70) {
        totalTrades++;
        
        // محاكاة تنفيذ سريع
        const entryPrice = signal.entryPrice;
        let exitPrice = entryPrice;
        let holdTime = 0;

        // البحث عن خروج سريع
        for (let j = i + 1; j < Math.min(i + this.config.maxHoldTime, historicalData.length); j++) {
          holdTime = j - i;
          exitPrice = historicalData[j].close;

          // فحص أهداف الخروج
          const profitPercent = signal.action === 'BUY' 
            ? ((exitPrice - entryPrice) / entryPrice) * 100
            : ((entryPrice - exitPrice) / entryPrice) * 100;

          if (profitPercent >= this.config.profitTarget) {
            // جني الأرباح
            break;
          }

          if (profitPercent <= -this.config.stopLoss) {
            // وقف الخسارة
            break;
          }
        }

        // حساب العائد مع الرسوم
        const tradeReturn = signal.action === 'BUY' 
          ? (exitPrice - entryPrice) / entryPrice
          : (entryPrice - exitPrice) / entryPrice;

        const fees = (entryPrice + exitPrice) * signal.quantity * feeRate;
        const netReturn = tradeReturn - (fees / (entryPrice * signal.quantity));

        totalReturn += netReturn;
        totalFees += fees;
        totalHoldTime += holdTime;
        
        if (netReturn > 0) winningTrades++;

        // حساب drawdown
        if (totalReturn > peak) peak = totalReturn;
        const currentDrawdown = (peak - totalReturn) / peak * 100;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }
    }

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgHoldTime = totalTrades > 0 ? totalHoldTime / totalTrades : 0;
    const profitAfterFees = (totalReturn * 100) - totalFees;

    return {
      totalTrades,
      winRate,
      totalReturn: totalReturn * 100,
      maxDrawdown,
      avgHoldTime,
      profitAfterFees
    };
  }
}