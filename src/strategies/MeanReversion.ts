import { CandleData } from '../utils/TechnicalAnalysis';

export interface MeanReversionConfig {
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  rsiExitLow: number;
  rsiExitHigh: number;
  bollingerPeriod: number;
  bollingerStdDev: number;
}

export interface MeanReversionSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  reasons: string[];
  rsiValue: number;
  bollingerPosition: 'UPPER' | 'LOWER' | 'MIDDLE';
}

export class MeanReversionStrategy {
  private config: MeanReversionConfig;

  constructor(config: MeanReversionConfig = {
    rsiPeriod: 14,
    rsiOversold: 30,
    rsiOverbought: 70,
    rsiExitLow: 50,
    rsiExitHigh: 60,
    bollingerPeriod: 20,
    bollingerStdDev: 2
  }) {
    this.config = config;
  }

  public analyze(candles: CandleData[]): MeanReversionSignal {
    if (candles.length < Math.max(this.config.rsiPeriod, this.config.bollingerPeriod)) {
      return this.createHoldSignal('بيانات غير كافية للتحليل', 0, 'MIDDLE');
    }

    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];

    // حساب المؤشرات
    const rsi = this.calculateRSI(closes, this.config.rsiPeriod);
    const bollinger = this.calculateBollingerBands(closes, this.config.bollingerPeriod, this.config.bollingerStdDev);
    
    const reasons: string[] = [];
    let confidence = 0;
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

    // تحديد موقع السعر في Bollinger Bands
    let bollingerPosition: 'UPPER' | 'LOWER' | 'MIDDLE' = 'MIDDLE';
    if (currentPrice <= bollinger.lower) {
      bollingerPosition = 'LOWER';
    } else if (currentPrice >= bollinger.upper) {
      bollingerPosition = 'UPPER';
    }

    // إشارات الشراء (Mean Reversion)
    if (rsi <= this.config.rsiOversold) {
      action = 'BUY';
      confidence += 40;
      reasons.push(`RSI في منطقة التشبع البيعي (${rsi.toFixed(1)})`);
    }

    if (bollingerPosition === 'LOWER') {
      if (action === 'HOLD') action = 'BUY';
      confidence += 30;
      reasons.push('السعر لمس الحد السفلي لـ Bollinger Bands');
    }

    // إشارات البيع (Mean Reversion)
    if (rsi >= this.config.rsiOverbought) {
      action = 'SELL';
      confidence += 40;
      reasons.push(`RSI في منطقة التشبع الشرائي (${rsi.toFixed(1)})`);
    }

    if (bollingerPosition === 'UPPER') {
      if (action === 'HOLD') action = 'SELL';
      confidence += 30;
      reasons.push('السعر لمس الحد العلوي لـ Bollinger Bands');
    }

    // تأكيدات إضافية
    if (action !== 'HOLD') {
      // فحص الحجم
      const avgVolume = this.calculateAverageVolume(candles, 10);
      const currentVolume = candles[candles.length - 1].volume;
      
      if (currentVolume > avgVolume * 1.2) {
        confidence += 15;
        reasons.push('حجم تداول مرتفع يدعم الإشارة');
      }

      // فحص التذبذب الجانبي
      const priceRange = this.calculatePriceRange(candles, 20);
      if (priceRange < 0.05) { // تذبذب أقل من 5%
        confidence += 10;
        reasons.push('السوق في حالة تذبذب جانبي مناسبة للـ Mean Reversion');
      }
    }

    // حساب مستويات الخروج
    const atr = this.calculateATR(
      candles.map(c => c.high),
      candles.map(c => c.low),
      closes,
      14
    );

    const stopLoss = action === 'BUY' 
      ? currentPrice - (atr * 1.5)
      : currentPrice + (atr * 1.5);

    const takeProfit = action === 'BUY'
      ? bollinger.middle
      : bollinger.middle;

    return {
      action,
      confidence: Math.min(confidence, 95),
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      reasons,
      rsiValue: rsi,
      bollingerPosition
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

  private calculateBollingerBands(prices: number[], period: number, stdDev: number): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(prices, period);
    const variance = this.calculateVariance(prices.slice(-period), sma);
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices.reduce((a, b) => a + b, 0) / prices.length;
    
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((a, b) => a + b, 0) / period;
  }

  private calculateVariance(prices: number[], mean: number): number {
    const squaredDifferences = prices.map(price => Math.pow(price - mean, 2));
    return squaredDifferences.reduce((a, b) => a + b, 0) / prices.length;
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

  private calculateAverageVolume(candles: CandleData[], period: number): number {
    const volumes = candles.slice(-period).map(c => c.volume);
    return volumes.reduce((a, b) => a + b, 0) / volumes.length;
  }

  private calculatePriceRange(candles: CandleData[], period: number): number {
    const recentCandles = candles.slice(-period);
    const highs = recentCandles.map(c => c.high);
    const lows = recentCandles.map(c => c.low);
    
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    
    return (maxHigh - minLow) / minLow;
  }

  private createHoldSignal(reason: string, rsi: number, bollingerPos: 'UPPER' | 'LOWER' | 'MIDDLE'): MeanReversionSignal {
    return {
      action: 'HOLD',
      confidence: 0,
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      reasons: [reason],
      rsiValue: rsi,
      bollingerPosition: bollingerPos
    };
  }

  public shouldExit(currentPrice: number, entryPrice: number, side: 'LONG' | 'SHORT', rsi: number): boolean {
    if (side === 'LONG') {
      return rsi >= this.config.rsiExitHigh;
    } else {
      return rsi <= this.config.rsiExitLow;
    }
  }

  public backtest(historicalData: CandleData[]): {
    totalTrades: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    avgHoldTime: number;
  } {
    let totalTrades = 0;
    let winningTrades = 0;
    let totalReturn = 0;
    let maxDrawdown = 0;
    let peak = 0;
    let totalHoldTime = 0;

    for (let i = this.config.bollingerPeriod; i < historicalData.length - 10; i++) {
      const windowData = historicalData.slice(0, i + 1);
      const signal = this.analyze(windowData);

      if (signal.action !== 'HOLD' && signal.confidence > 60) {
        totalTrades++;
        
        // محاكاة الصفقة
        const entryPrice = signal.entryPrice;
        let exitPrice = entryPrice;
        let holdTime = 0;

        // البحث عن نقطة خروج
        for (let j = i + 1; j < Math.min(i + 50, historicalData.length); j++) {
          const currentCandles = historicalData.slice(0, j + 1);
          const currentRSI = this.calculateRSI(currentCandles.map(c => c.close), this.config.rsiPeriod);
          
          holdTime = j - i;
          exitPrice = historicalData[j].close;

          // فحص شروط الخروج
          if (signal.action === 'BUY' && this.shouldExit(exitPrice, entryPrice, 'LONG', currentRSI)) {
            break;
          }
          if (signal.action === 'SELL' && this.shouldExit(exitPrice, entryPrice, 'SHORT', currentRSI)) {
            break;
          }

          // وقف الخسارة
          if (signal.action === 'BUY' && exitPrice <= signal.stopLoss) break;
          if (signal.action === 'SELL' && exitPrice >= signal.stopLoss) break;
        }

        // حساب العائد
        const tradeReturn = signal.action === 'BUY' 
          ? (exitPrice - entryPrice) / entryPrice
          : (entryPrice - exitPrice) / entryPrice;

        totalReturn += tradeReturn;
        totalHoldTime += holdTime;
        
        if (tradeReturn > 0) winningTrades++;

        // حساب drawdown
        if (totalReturn > peak) peak = totalReturn;
        const currentDrawdown = (peak - totalReturn) / peak * 100;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }
    }

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgHoldTime = totalTrades > 0 ? totalHoldTime / totalTrades : 0;

    return {
      totalTrades,
      winRate,
      totalReturn: totalReturn * 100,
      maxDrawdown,
      avgHoldTime
    };
  }
}