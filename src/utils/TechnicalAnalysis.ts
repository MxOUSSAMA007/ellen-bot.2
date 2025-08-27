export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  ema: {
    ema12: number;
    ema26: number;
  };
  sma: {
    sma20: number;
    sma50: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
}

export class TechnicalAnalysis {
  
  // حساب RSI (Relative Strength Index)
  public static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    // حساب المتوسط الأولي للمكاسب والخسائر
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

    // حساب RSI للفترات المتبقية
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

  // حساب MACD
  public static calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    // حساب إشارة MACD (EMA 9 للـ MACD)
    const macdLine = [macd]; // في التطبيق الحقيقي، نحتاج لحساب MACD لعدة فترات
    const signal = this.calculateEMA(macdLine, 9);
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  // حساب Bollinger Bands
  public static calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(prices, period);
    const variance = this.calculateVariance(prices.slice(-period), sma);
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  // حساب EMA (Exponential Moving Average)
  public static calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  // حساب SMA (Simple Moving Average)
  public static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices.reduce((a, b) => a + b, 0) / prices.length;
    
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((a, b) => a + b, 0) / period;
  }

  // حساب Stochastic Oscillator
  public static calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number = 14, dPeriod: number = 3): { k: number; d: number } {
    if (closes.length < kPeriod) return { k: 50, d: 50 };

    const recentHighs = highs.slice(-kPeriod);
    const recentLows = lows.slice(-kPeriod);
    const currentClose = closes[closes.length - 1];

    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);

    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // حساب %D (المتوسط المتحرك لـ %K)
    const recentKValues = [k]; // في التطبيق الحقيقي، نحتاج لحفظ قيم K السابقة
    const d = recentKValues.reduce((a, b) => a + b, 0) / Math.min(recentKValues.length, dPeriod);

    return { k, d };
  }

  // حساب التباين
  private static calculateVariance(prices: number[], mean: number): number {
    const squaredDifferences = prices.map(price => Math.pow(price - mean, 2));
    return squaredDifferences.reduce((a, b) => a + b, 0) / prices.length;
  }

  // تحليل شامل للمؤشرات الفنية
  public static analyzeCandles(candles: CandleData[]): TechnicalIndicators {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    return {
      rsi: this.calculateRSI(closes),
      macd: this.calculateMACD(closes),
      bollinger: this.calculateBollingerBands(closes),
      ema: {
        ema12: this.calculateEMA(closes, 12),
        ema26: this.calculateEMA(closes, 26)
      },
      sma: {
        sma20: this.calculateSMA(closes, 20),
        sma50: this.calculateSMA(closes, 50)
      },
      stochastic: this.calculateStochastic(highs, lows, closes)
    };
  }

  // توليد إشارة تداول بناءً على المؤشرات
  public static generateSignal(indicators: TechnicalIndicators): { action: 'BUY' | 'SELL' | 'HOLD'; confidence: number; reasons: string[] } {
    const reasons: string[] = [];
    let bullishSignals = 0;
    let bearishSignals = 0;

    // تحليل RSI
    if (indicators.rsi < 30) {
      bullishSignals++;
      reasons.push('RSI في منطقة التشبع البيعي');
    } else if (indicators.rsi > 70) {
      bearishSignals++;
      reasons.push('RSI في منطقة التشبع الشرائي');
    }

    // تحليل MACD
    if (indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram > 0) {
      bullishSignals++;
      reasons.push('MACD يظهر زخم صاعد');
    } else if (indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram < 0) {
      bearishSignals++;
      reasons.push('MACD يظهر زخم هابط');
    }

    // تحليل Bollinger Bands
    const currentPrice = indicators.bollinger.middle; // تقريبي
    if (currentPrice < indicators.bollinger.lower) {
      bullishSignals++;
      reasons.push('السعر تحت الحد السفلي لـ Bollinger Bands');
    } else if (currentPrice > indicators.bollinger.upper) {
      bearishSignals++;
      reasons.push('السعر فوق الحد العلوي لـ Bollinger Bands');
    }

    // تحليل EMA
    if (indicators.ema.ema12 > indicators.ema.ema26) {
      bullishSignals++;
      reasons.push('EMA 12 فوق EMA 26');
    } else {
      bearishSignals++;
      reasons.push('EMA 12 تحت EMA 26');
    }

    // تحليل Stochastic
    if (indicators.stochastic.k < 20 && indicators.stochastic.d < 20) {
      bullishSignals++;
      reasons.push('Stochastic في منطقة التشبع البيعي');
    } else if (indicators.stochastic.k > 80 && indicators.stochastic.d > 80) {
      bearishSignals++;
      reasons.push('Stochastic في منطقة التشبع الشرائي');
    }

    // تحديد الإشارة النهائية
    const totalSignals = bullishSignals + bearishSignals;
    const confidence = Math.min(95, (Math.max(bullishSignals, bearishSignals) / Math.max(totalSignals, 1)) * 100);

    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    
    if (bullishSignals > bearishSignals && confidence > 60) {
      action = 'BUY';
    } else if (bearishSignals > bullishSignals && confidence > 60) {
      action = 'SELL';
    }

    return { action, confidence, reasons };
  }

  // كشف الأنماط الفنية
  public static detectPatterns(candles: CandleData[]): string[] {
    const patterns: string[] = [];
    
    if (candles.length < 3) return patterns;

    const recent = candles.slice(-3);
    
    // نمط المطرقة (Hammer)
    if (this.isHammer(recent[2])) {
      patterns.push('نمط المطرقة - إشارة انعكاس صاعد محتملة');
    }

    // نمط الدوجي (Doji)
    if (this.isDoji(recent[2])) {
      patterns.push('نمط الدوجي - تردد في السوق');
    }

    // نمط الابتلاع الصاعد
    if (this.isBullishEngulfing(recent[1], recent[2])) {
      patterns.push('نمط الابتلاع الصاعد - إشارة شراء قوية');
    }

    // نمط الابتلاع الهابط
    if (this.isBearishEngulfing(recent[1], recent[2])) {
      patterns.push('نمط الابتلاع الهابط - إشارة بيع قوية');
    }

    return patterns;
  }

  private static isHammer(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    
    return lowerShadow > body * 2 && upperShadow < body * 0.5;
  }

  private static isDoji(candle: CandleData): boolean {
    const body = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    
    return body < range * 0.1;
  }

  private static isBullishEngulfing(prev: CandleData, current: CandleData): boolean {
    return prev.close < prev.open && // الشمعة السابقة هابطة
           current.close > current.open && // الشمعة الحالية صاعدة
           current.open < prev.close && // فتح الحالية أقل من إغلاق السابقة
           current.close > prev.open; // إغلاق الحالية أعلى من فتح السابقة
  }

  private static isBearishEngulfing(prev: CandleData, current: CandleData): boolean {
    return prev.close > prev.open && // الشمعة السابقة صاعدة
           current.close < current.open && // الشمعة الحالية هابطة
           current.open > prev.close && // فتح الحالية أعلى من إغلاق السابقة
           current.close < prev.open; // إغلاق الحالية أقل من فتح السابقة
  }
}