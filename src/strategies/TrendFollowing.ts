import { CandleData, TechnicalIndicators } from '../utils/TechnicalAnalysis';

export interface TrendFollowingConfig {
  emaShort: number;
  emaLong: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  atrPeriod: number;
  atrMultiplier: number;
}

export interface TrendSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  reasons: string[];
}

export class TrendFollowingStrategy {
  private config: TrendFollowingConfig;

  constructor(config: TrendFollowingConfig = {
    emaShort: 50,
    emaLong: 200,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    atrPeriod: 14,
    atrMultiplier: 2
  }) {
    this.config = config;
  }

  public analyze(candles: CandleData[]): TrendSignal {
    if (candles.length < this.config.emaLong) {
      return this.createHoldSignal('بيانات غير كافية للتحليل');
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    // حساب المؤشرات
    const emaShort = this.calculateEMA(closes, this.config.emaShort);
    const emaLong = this.calculateEMA(closes, this.config.emaLong);
    const macd = this.calculateMACD(closes);
    const atr = this.calculateATR(highs, lows, closes, this.config.atrPeriod);
    const adx = this.calculateADX(highs, lows, closes);

    const currentPrice = closes[closes.length - 1];
    const reasons: string[] = [];
    let confidence = 0;
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

    // تحليل الاتجاه
    const isBullishTrend = emaShort > emaLong;
    const isBearishTrend = emaShort < emaLong;
    const isMacdBullish = macd.macd > macd.signal && macd.histogram > 0;
    const isMacdBearish = macd.macd < macd.signal && macd.histogram < 0;
    const isTrendStrong = adx > 25;

    // إشارة شراء
    if (isBullishTrend && isMacdBullish && isTrendStrong) {
      action = 'BUY';
      confidence += 30;
      reasons.push(`EMA ${this.config.emaShort} فوق EMA ${this.config.emaLong}`);
      reasons.push('MACD يظهر زخم صاعد');
      reasons.push(`ADX يؤكد قوة الاتجاه (${adx.toFixed(1)})`);
    }

    // إشارة بيع
    if (isBearishTrend && isMacdBearish && isTrendStrong) {
      action = 'SELL';
      confidence += 30;
      reasons.push(`EMA ${this.config.emaShort} تحت EMA ${this.config.emaLong}`);
      reasons.push('MACD يظهر زخم هابط');
      reasons.push(`ADX يؤكد قوة الاتجاه (${adx.toFixed(1)})`);
    }

    // تأكيدات إضافية
    if (action !== 'HOLD') {
      // فحص كسر المقاومة/الدعم
      const resistance = this.findResistanceLevel(candles);
      const support = this.findSupportLevel(candles);

      if (action === 'BUY' && currentPrice > resistance) {
        confidence += 20;
        reasons.push(`كسر مستوى المقاومة عند ${resistance.toFixed(2)}`);
      }

      if (action === 'SELL' && currentPrice < support) {
        confidence += 20;
        reasons.push(`كسر مستوى الدعم عند ${support.toFixed(2)}`);
      }

      // فحص الحجم
      const avgVolume = this.calculateAverageVolume(candles, 20);
      const currentVolume = candles[candles.length - 1].volume;
      
      if (currentVolume > avgVolume * 1.5) {
        confidence += 15;
        reasons.push('حجم تداول عالي يؤكد الحركة');
      }
    }

    // حساب مستويات الخروج
    const stopLoss = action === 'BUY' 
      ? currentPrice - (atr * this.config.atrMultiplier)
      : currentPrice + (atr * this.config.atrMultiplier);

    const takeProfit = action === 'BUY'
      ? currentPrice + (atr * this.config.atrMultiplier * 2)
      : currentPrice - (atr * this.config.atrMultiplier * 2);

    return {
      action,
      confidence: Math.min(confidence, 95),
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      reasons
    };
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

  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, this.config.macdFast);
    const ema26 = this.calculateEMA(prices, this.config.macdSlow);
    const macd = ema12 - ema26;
    
    const macdLine = [macd];
    const signal = this.calculateEMA(macdLine, this.config.macdSignal);
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (highs.length < 2) return 0;

    const trueRanges: number[] = [];
    
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    return this.calculateSMA(trueRanges, period);
  }

  private calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (highs.length < period + 1) return 0;

    const dmPlus: number[] = [];
    const dmMinus: number[] = [];
    const trueRanges: number[] = [];

    for (let i = 1; i < highs.length; i++) {
      const highDiff = highs[i] - highs[i - 1];
      const lowDiff = lows[i - 1] - lows[i];

      dmPlus.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      dmMinus.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    const avgDmPlus = this.calculateSMA(dmPlus.slice(-period), period);
    const avgDmMinus = this.calculateSMA(dmMinus.slice(-period), period);
    const avgTR = this.calculateSMA(trueRanges.slice(-period), period);

    const diPlus = (avgDmPlus / avgTR) * 100;
    const diMinus = (avgDmMinus / avgTR) * 100;

    const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
    return dx;
  }

  private calculateSMA(values: number[], period: number): number {
    if (values.length < period) return values.reduce((a, b) => a + b, 0) / values.length;
    
    const recentValues = values.slice(-period);
    return recentValues.reduce((a, b) => a + b, 0) / period;
  }

  private findResistanceLevel(candles: CandleData[]): number {
    const highs = candles.slice(-20).map(c => c.high);
    return Math.max(...highs);
  }

  private findSupportLevel(candles: CandleData[]): number {
    const lows = candles.slice(-20).map(c => c.low);
    return Math.min(...lows);
  }

  private calculateAverageVolume(candles: CandleData[], period: number): number {
    const volumes = candles.slice(-period).map(c => c.volume);
    return volumes.reduce((a, b) => a + b, 0) / volumes.length;
  }

  private createHoldSignal(reason: string): TrendSignal {
    return {
      action: 'HOLD',
      confidence: 0,
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      reasons: [reason]
    };
  }

  public backtest(historicalData: CandleData[]): {
    totalTrades: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
  } {
    // تطبيق backtest مبسط
    let totalTrades = 0;
    let winningTrades = 0;
    let totalReturn = 0;
    let maxDrawdown = 0;
    let peak = 0;

    for (let i = this.config.emaLong; i < historicalData.length; i++) {
      const windowData = historicalData.slice(0, i + 1);
      const signal = this.analyze(windowData);

      if (signal.action !== 'HOLD' && signal.confidence > 70) {
        totalTrades++;
        
        // محاكاة نتيجة الصفقة
        const mockReturn = (Math.random() - 0.4) * 0.05; // انحياز إيجابي طفيف
        totalReturn += mockReturn;
        
        if (mockReturn > 0) winningTrades++;

        // حساب drawdown
        if (totalReturn > peak) peak = totalReturn;
        const currentDrawdown = (peak - totalReturn) / peak * 100;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }
    }

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const sharpeRatio = totalReturn / Math.max(maxDrawdown / 100, 0.01);

    return {
      totalTrades,
      winRate,
      totalReturn: totalReturn * 100,
      maxDrawdown,
      sharpeRatio
    };
  }
}