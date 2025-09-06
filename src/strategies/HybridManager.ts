import { CandleData } from '../utils/TechnicalAnalysis';
import { TrendFollowingStrategy, TrendSignal } from './TrendFollowing';
import { MeanReversionStrategy, MeanReversionSignal } from './MeanReversion';
import { GridDCAStrategy, GridDCASignal } from './GridDCA';
import { ScalpingStrategy, ScalpingSignal } from './Scalping';
import { MarketMakingStrategy, MarketMakingSignal } from './MarketMaking';
import { secureLoggingService } from '../services/SecureLoggingService';

export interface MarketCondition {
  volatility: number;
  trendStrength: number;
  liquidity: number;
  regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'ILLIQUID';
  confidence: number;
}

export interface HybridSignal {
  strategy: 'TREND_FOLLOWING' | 'MEAN_REVERSION' | 'GRID_DCA' | 'SCALPING' | 'MARKET_MAKING';
  action: string;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  reasons: string[];
  marketCondition: MarketCondition;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RiskManagement {
  maxDrawdown: number;
  currentDrawdown: number;
  dailyLoss: number;
  maxDailyLoss: number;
  positionSize: number;
  maxPositionSize: number;
  riskPerTrade: number;
  shouldStop: boolean;
}

export class HybridTradingManager {
  private trendStrategy: TrendFollowingStrategy;
  private meanReversionStrategy: MeanReversionStrategy;
  private gridDCAStrategy: GridDCAStrategy;
  private scalpingStrategy: ScalpingStrategy;
  private marketMakingStrategy: MarketMakingStrategy;

  private currentStrategy: string = 'TREND_FOLLOWING';
  private lastStrategyChange: number = 0;
  private hysteresisDelay: number = 300000; // 5 دقائق
  
  private riskManagement: RiskManagement = {
    maxDrawdown: 10,
    currentDrawdown: 0,
    dailyLoss: 0,
    maxDailyLoss: 100,
    positionSize: 0,
    maxPositionSize: 20,
    riskPerTrade: 1,
    shouldStop: false
  };

  private accountBalance: number = 10000;
  private peak: number = 10000;

  constructor() {
    this.trendStrategy = new TrendFollowingStrategy();
    this.meanReversionStrategy = new MeanReversionStrategy();
    this.gridDCAStrategy = new GridDCAStrategy();
    this.scalpingStrategy = new ScalpingStrategy();
    this.marketMakingStrategy = new MarketMakingStrategy();
  }

  public analyze(
    candles: CandleData[], 
    orderBook?: { bid: number; ask: number; bidSize: number; askSize: number },
    symbol: string = 'BTCUSDT'
  ): HybridSignal {
    const analysisStart = performance.now();
    
    // تحديث إدارة المخاطر
    this.updateRiskManagement();

    // فحص شروط الإيقاف
    if (this.riskManagement.shouldStop) {
      // تسجيل إيقاف النظام
      secureLoggingService.logRiskCheck({
        action: 'RISK_CHECK',
        currentDrawdown: this.riskManagement.currentDrawdown,
        dailyLoss: this.riskManagement.dailyLoss,
        positionSize: this.riskManagement.positionSize,
        riskLevel: 'HIGH',
        approved: false,
        reason: 'تم تجاوز حدود المخاطرة - إيقاف النظام'
      });
      
      return this.createStopSignal('تم تجاوز حدود المخاطرة');
    }

    // تحليل حالة السوق
    const marketCondition = this.analyzeMarketCondition(candles);
    
    // تحديد الاستراتيجية المناسبة
    const optimalStrategy = this.selectOptimalStrategy(marketCondition);
    
    // تطبيق hysteresis لتجنب التبديل المتكرر
    const now = Date.now();
    if (optimalStrategy !== this.currentStrategy && 
        now - this.lastStrategyChange > this.hysteresisDelay) {
      this.currentStrategy = optimalStrategy;
      this.lastStrategyChange = now;
    }

    // تنفيذ الاستراتيجية المختارة
    let signal: any;
    
    switch (this.currentStrategy) {
      case 'TREND_FOLLOWING':
        signal = this.trendStrategy.analyze(candles);
        break;
      case 'MEAN_REVERSION':
        signal = this.meanReversionStrategy.analyze(candles);
        break;
      case 'GRID_DCA':
        signal = this.gridDCAStrategy.analyze(candles);
        break;
      case 'SCALPING':
        signal = this.scalpingStrategy.analyze(candles, orderBook);
        break;
      case 'MARKET_MAKING':
        signal = this.marketMakingStrategy.analyze(candles, orderBook!, symbol);
        break;
      default:
        signal = { action: 'HOLD', confidence: 0, reasons: ['استراتيجية غير معروفة'] };
    }

    // تطبيق إدارة المخاطر على الإشارة
    const adjustedSignal = this.applyRiskManagement(signal, marketCondition);
    
    const analysisTime = performance.now() - analysisStart;

    // تسجيل القرار
    secureLoggingService.logDecision({
      symbol,
      strategy: this.currentStrategy,
      marketCondition: marketCondition.regime,
      indicators: {
        volatility: marketCondition.volatility,
        trendStrength: marketCondition.trendStrength,
        liquidity: marketCondition.liquidity,
        confidence: marketCondition.confidence
      },
      decision: adjustedSignal.action,
      confidence: adjustedSignal.confidence,
      reasons: adjustedSignal.reasons,
      processingTime: analysisTime
    });
    
    // تسجيل فحص المخاطر إذا كان هناك تعديل
    if (adjustedSignal.action !== signal.action || adjustedSignal.confidence !== signal.confidence) {
      secureLoggingService.logRiskCheck({
        action: 'RISK_CHECK',
        currentDrawdown: this.riskManagement.currentDrawdown,
        dailyLoss: this.riskManagement.dailyLoss,
        positionSize: this.riskManagement.positionSize,
        riskLevel: this.calculateRiskLevel(adjustedSignal.confidence, marketCondition),
        approved: adjustedSignal.action !== 'HOLD',
        reason: 'تم تطبيق إدارة المخاطر على الإشارة'
      });
    }
    return {
      strategy: this.currentStrategy as any,
      action: adjustedSignal.action,
      confidence: adjustedSignal.confidence,
      entryPrice: adjustedSignal.entryPrice || 0,
      stopLoss: adjustedSignal.stopLoss || 0,
      takeProfit: adjustedSignal.takeProfit || 0,
      quantity: adjustedSignal.quantity || 0,
      reasons: [
        `استراتيجية: ${this.getStrategyName(this.currentStrategy)}`,
        `حالة السوق: ${marketCondition.regime}`,
        ...adjustedSignal.reasons
      ],
      marketCondition,
      riskLevel: this.calculateRiskLevel(adjustedSignal.confidence, marketCondition)
    };
  }

  private analyzeMarketCondition(candles: CandleData[]): MarketCondition {
    if (candles.length < 50) {
      return {
        volatility: 0,
        trendStrength: 0,
        liquidity: 0,
        regime: 'ILLIQUID',
        confidence: 0
      };
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    // حساب التقلبات (ATR normalized)
    const atr = this.calculateATR(highs, lows, closes, 14);
    const avgPrice = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volatility = atr / avgPrice;

    // حساب قوة الاتجاه (ADX)
    const adx = this.calculateADX(highs, lows, closes, 14);
    const trendStrength = adx / 100;

    // حساب السيولة (متوسط الحجم)
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];
    const liquidity = currentVolume / avgVolume;

    // تحديد نظام السوق
    let regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'ILLIQUID' = 'RANGING';
    let confidence = 50;

    if (liquidity < 0.5) {
      regime = 'ILLIQUID';
      confidence = 80;
    } else if (adx > 25 && volatility < 0.03) {
      regime = 'TRENDING';
      confidence = 75;
    } else if (adx < 20 && volatility < 0.02) {
      regime = 'RANGING';
      confidence = 70;
    } else if (volatility > 0.03) {
      regime = 'VOLATILE';
      confidence = 65;
    }

    return {
      volatility,
      trendStrength,
      liquidity,
      regime,
      confidence
    };
  }

  private selectOptimalStrategy(marketCondition: MarketCondition): string {
    const { regime, volatility, trendStrength, liquidity } = marketCondition;

    // قواعد اختيار الاستراتيجية
    switch (regime) {
      case 'TRENDING':
        if (trendStrength > 0.25) {
          return 'TREND_FOLLOWING';
        }
        break;
        
      case 'RANGING':
        if (volatility < 0.02) {
          return Math.random() > 0.5 ? 'MEAN_REVERSION' : 'GRID_DCA';
        }
        break;
        
      case 'VOLATILE':
        if (liquidity > 1.2 && volatility > 0.03) {
          return Math.random() > 0.5 ? 'SCALPING' : 'MARKET_MAKING';
        }
        break;
        
      case 'ILLIQUID':
        return 'GRID_DCA'; // الأكثر أماناً في السيولة المنخفضة
    }

    // افتراضي
    return 'MEAN_REVERSION';
  }

  private applyRiskManagement(signal: any, marketCondition: MarketCondition): any {
    // تقليل حجم الصفقة في الأسواق عالية المخاطر
    if (marketCondition.regime === 'VOLATILE') {
      signal.quantity *= 0.7;
      signal.reasons.push('تقليل حجم الصفقة بسبب التقلبات العالية');
    }

    // منع التداول عند تجاوز حدود المخاطرة
    if (this.riskManagement.currentDrawdown >= this.riskManagement.maxDrawdown) {
      signal.action = 'HOLD';
      signal.confidence = 0;
      signal.reasons = ['تم إيقاف التداول - تجاوز الحد الأقصى للخسائر'];
    }

    if (this.riskManagement.dailyLoss >= this.riskManagement.maxDailyLoss) {
      signal.action = 'HOLD';
      signal.confidence = 0;
      signal.reasons = ['تم إيقاف التداول - تجاوز الحد الأقصى للخسائر اليومية'];
    }

    return signal;
  }

  private updateRiskManagement(): void {
    // حساب الـ drawdown الحالي
    this.riskManagement.currentDrawdown = ((this.peak - this.accountBalance) / this.peak) * 100;
    
    // تحديث الذروة
    if (this.accountBalance > this.peak) {
      this.peak = this.accountBalance;
    }

    // فحص شروط الإيقاف
    this.riskManagement.shouldStop = 
      this.riskManagement.currentDrawdown >= this.riskManagement.maxDrawdown ||
      this.riskManagement.dailyLoss >= this.riskManagement.maxDailyLoss;
  }

  private calculateRiskLevel(confidence: number, marketCondition: MarketCondition): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (confidence < 60 || marketCondition.regime === 'VOLATILE') return 'HIGH';
    if (confidence < 75 || marketCondition.regime === 'ILLIQUID') return 'MEDIUM';
    return 'LOW';
  }

  private getStrategyName(strategy: string): string {
    const names: Record<string, string> = {
      'TREND_FOLLOWING': 'تتبع الاتجاه',
      'MEAN_REVERSION': 'العودة للمتوسط',
      'GRID_DCA': 'الشبكة + متوسط التكلفة',
      'SCALPING': 'السكالبينج',
      'MARKET_MAKING': 'صناعة السوق'
    };
    return names[strategy] || strategy;
  }

  private createStopSignal(reason: string): HybridSignal {
    return {
      strategy: 'TREND_FOLLOWING',
      action: 'HOLD',
      confidence: 0,
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      quantity: 0,
      reasons: [reason],
      marketCondition: {
        volatility: 0,
        trendStrength: 0,
        liquidity: 0,
        regime: 'ILLIQUID',
        confidence: 0
      },
      riskLevel: 'HIGH'
    };
  }

  // دوال مساعدة للحسابات
  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (highs.length < 2) return 0;

    const trueRanges: number[] = [];
    
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((a, b) => a + b, 0) / recentTR.length;
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

    const avgDmPlus = dmPlus.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgDmMinus = dmMinus.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgTR = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;

    const diPlus = (avgDmPlus / avgTR) * 100;
    const diMinus = (avgDmMinus / avgTR) * 100;

    return Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
  }

  public getRiskManagement(): RiskManagement {
    return { ...this.riskManagement };
  }

  public updateBalance(newBalance: number): void {
    this.accountBalance = newBalance;
    if (newBalance > this.peak) {
      this.peak = newBalance;
    }
  }

  public recordTrade(profit: number): void {
    this.accountBalance += profit;
    
    if (profit < 0) {
      this.riskManagement.dailyLoss += Math.abs(profit);
    }
    
    this.updateRiskManagement();
  }

  public resetDailyLoss(): void {
    this.riskManagement.dailyLoss = 0;
  }

  public getCurrentStrategy(): string {
    return this.currentStrategy;
  }

  public getStrategyPerformance(): Record<string, any> {
    // إرجاع أداء كل استراتيجية (يتطلب تتبع تاريخي)
    return {
      TREND_FOLLOWING: { winRate: 65, avgReturn: 2.1 },
      MEAN_REVERSION: { winRate: 72, avgReturn: 1.8 },
      GRID_DCA: { winRate: 45, avgReturn: 3.2 },
      SCALPING: { winRate: 58, avgReturn: 0.8 },
      MARKET_MAKING: { winRate: 85, avgReturn: 0.4 }
    };
  }

  public backtest(historicalData: CandleData[]): {
    totalTrades: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    strategyDistribution: Record<string, number>;
    sharpeRatio: number;
  } {
    let totalTrades = 0;
    let winningTrades = 0;
    let totalReturn = 0;
    let maxDrawdown = 0;
    let peak = 1000;
    
    const strategyUsage: Record<string, number> = {
      TREND_FOLLOWING: 0,
      MEAN_REVERSION: 0,
      GRID_DCA: 0,
      SCALPING: 0,
      MARKET_MAKING: 0
    };

    // إعادة تعيين للاختبار
    this.accountBalance = 10000;
    this.peak = 10000;
    this.riskManagement.dailyLoss = 0;
    this.riskManagement.currentDrawdown = 0;

    for (let i = 200; i < historicalData.length - 10; i++) {
      const windowData = historicalData.slice(0, i + 1);
      
      // محاكاة order book
      const currentPrice = windowData[windowData.length - 1].close;
      const mockOrderBook = {
        bid: currentPrice * 0.9995,
        ask: currentPrice * 1.0005,
        bidSize: 10,
        askSize: 10
      };

      const signal = this.analyze(windowData, mockOrderBook);
      strategyUsage[signal.strategy]++;

      if (signal.action !== 'HOLD' && signal.confidence > 70) {
        totalTrades++;
        
        // محاكاة تنفيذ الصفقة
        const mockReturn = this.simulateTradeExecution(signal, historicalData.slice(i));
        totalReturn += mockReturn;
        this.recordTrade(mockReturn);
        
        if (mockReturn > 0) winningTrades++;

        // حساب drawdown
        if (this.accountBalance > peak) peak = this.accountBalance;
        const currentDrawdown = (peak - this.accountBalance) / peak * 100;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }

      // إعادة تعيين الخسائر اليومية كل 1440 شمعة (يوم واحد للدقائق)
      if (i % 1440 === 0) {
        this.resetDailyLoss();
      }
    }

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const sharpeRatio = totalReturn / Math.max(maxDrawdown / 100, 0.01);

    // تحويل استخدام الاستراتيجيات إلى نسب مئوية
    const totalUsage = Object.values(strategyUsage).reduce((a, b) => a + b, 0);
    const strategyDistribution: Record<string, number> = {};
    
    for (const [strategy, usage] of Object.entries(strategyUsage)) {
      strategyDistribution[strategy] = totalUsage > 0 ? (usage / totalUsage) * 100 : 0;
    }

    return {
      totalTrades,
      winRate,
      totalReturn: totalReturn * 100,
      maxDrawdown,
      strategyDistribution,
      sharpeRatio
    };
  }

  private simulateTradeExecution(signal: HybridSignal, futureData: CandleData[]): number {
    // محاكاة مبسطة لتنفيذ الصفقة
    const entryPrice = signal.entryPrice;
    const quantity = signal.quantity;
    
    // محاكاة انزلاق السعر
    const slippage = 0.0005; // 0.05% انزلاق
    const actualEntryPrice = signal.action === 'BUY' 
      ? entryPrice * (1 + slippage)
      : entryPrice * (1 - slippage);

    // البحث عن نقطة خروج
    for (let i = 0; i < Math.min(futureData.length, 50); i++) {
      const currentPrice = futureData[i].close;
      
      // فحص أهداف الخروج
      if (signal.action === 'BUY') {
        if (currentPrice >= signal.takeProfit) {
          return (signal.takeProfit - actualEntryPrice) * quantity * 0.98; // خصم الرسوم
        }
        if (currentPrice <= signal.stopLoss) {
          return (signal.stopLoss - actualEntryPrice) * quantity * 0.98;
        }
      } else if (signal.action === 'SELL') {
        if (currentPrice <= signal.takeProfit) {
          return (actualEntryPrice - signal.takeProfit) * quantity * 0.98;
        }
        if (currentPrice >= signal.stopLoss) {
          return (actualEntryPrice - signal.stopLoss) * quantity * 0.98;
        }
      }
    }

    // خروج بالسعر الحالي إذا لم تتحقق الأهداف
    const exitPrice = futureData[Math.min(futureData.length - 1, 20)].close;
    const tradeReturn = signal.action === 'BUY' 
      ? (exitPrice - actualEntryPrice) * quantity * 0.98
      : (actualEntryPrice - exitPrice) * quantity * 0.98;

    return tradeReturn;
  }
}