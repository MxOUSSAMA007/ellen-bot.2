import { CandleData } from '../utils/TechnicalAnalysis';

export interface GridDCAConfig {
  gridRange: number; // نطاق الشبكة كنسبة مئوية (مثل 10 = ±10%)
  gridStep: number; // خطوة الشبكة كنسبة مئوية (مثل 1 = 1%)
  maxExposure: number; // الحد الأقصى للتعرض كنسبة من الرصيد
  dcaMultiplier: number; // مضاعف DCA (مثل 1.5)
  stopLossPercent: number; // وقف الخسارة كنسبة مئوية
}

export interface GridLevel {
  price: number;
  quantity: number;
  filled: boolean;
  orderId?: string;
  timestamp?: Date;
}

export interface GridDCASignal {
  action: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE_ALL';
  confidence: number;
  entryPrice: number;
  quantity: number;
  reasons: string[];
  gridLevels: GridLevel[];
  currentExposure: number;
  shouldStop: boolean;
}

export class GridDCAStrategy {
  private config: GridDCAConfig;
  private referencePrice: number = 0;
  private gridLevels: GridLevel[] = [];
  private totalExposure: number = 0;
  private accountBalance: number = 10000; // محاكاة الرصيد

  constructor(config: GridDCAConfig = {
    gridRange: 10,
    gridStep: 1,
    maxExposure: 20,
    dcaMultiplier: 1.5,
    stopLossPercent: 15
  }) {
    this.config = config;
  }

  public initialize(currentPrice: number): void {
    this.referencePrice = currentPrice;
    this.gridLevels = this.createGridLevels(currentPrice);
    this.totalExposure = 0;
  }

  public analyze(candles: CandleData[]): GridDCASignal {
    if (candles.length === 0) {
      return this.createHoldSignal('لا توجد بيانات');
    }

    const currentPrice = candles[candles.length - 1].close;
    
    if (this.referencePrice === 0) {
      this.initialize(currentPrice);
    }

    const reasons: string[] = [];
    let action: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE_ALL' = 'HOLD';
    let confidence = 0;

    // فحص شروط الإيقاف
    const priceDropPercent = ((this.referencePrice - currentPrice) / this.referencePrice) * 100;
    
    if (priceDropPercent >= this.config.stopLossPercent) {
      return {
        action: 'CLOSE_ALL',
        confidence: 100,
        entryPrice: currentPrice,
        quantity: 0,
        reasons: [`تجاوز حد وقف الخسارة (${priceDropPercent.toFixed(1)}%)`],
        gridLevels: this.gridLevels,
        currentExposure: this.totalExposure,
        shouldStop: true
      };
    }

    if (this.totalExposure >= this.config.maxExposure) {
      return {
        action: 'HOLD',
        confidence: 0,
        entryPrice: currentPrice,
        quantity: 0,
        reasons: ['تم الوصول للحد الأقصى للتعرض'],
        gridLevels: this.gridLevels,
        currentExposure: this.totalExposure,
        shouldStop: true
      };
    }

    // البحث عن مستوى شبكة للتنفيذ
    const targetLevel = this.findTargetGridLevel(currentPrice);
    
    if (targetLevel && !targetLevel.filled) {
      action = 'BUY';
      confidence = 80;
      
      const dcaLevel = this.calculateDCALevel(targetLevel.price);
      const quantity = this.calculateQuantity(targetLevel.price, dcaLevel);
      
      reasons.push(`تنفيذ أمر شبكة عند مستوى ${targetLevel.price.toFixed(2)}`);
      reasons.push(`مستوى DCA: ${dcaLevel}`);
      
      // تحديث التعرض
      const orderValue = quantity * currentPrice;
      const exposurePercent = (orderValue / this.accountBalance) * 100;
      
      if (this.totalExposure + exposurePercent <= this.config.maxExposure) {
        this.totalExposure += exposurePercent;
        targetLevel.filled = true;
        targetLevel.timestamp = new Date();
        
        reasons.push(`التعرض الحالي: ${this.totalExposure.toFixed(1)}%`);
        
        return {
          action,
          confidence,
          entryPrice: currentPrice,
          quantity,
          reasons,
          gridLevels: this.gridLevels,
          currentExposure: this.totalExposure,
          shouldStop: false
        };
      } else {
        reasons.push('تجاوز الحد الأقصى للتعرض المسموح');
      }
    }

    // فحص شروط البيع (جني الأرباح)
    const profitPercent = ((currentPrice - this.referencePrice) / this.referencePrice) * 100;
    
    if (profitPercent >= this.config.gridRange / 2 && this.totalExposure > 0) {
      action = 'SELL';
      confidence = 70;
      reasons.push(`جني أرباح عند ارتفاع ${profitPercent.toFixed(1)}%`);
    }

    return {
      action,
      confidence,
      entryPrice: currentPrice,
      quantity: this.calculateBaseQuantity(),
      reasons,
      gridLevels: this.gridLevels,
      currentExposure: this.totalExposure,
      shouldStop: false
    };
  }

  private createGridLevels(referencePrice: number): GridLevel[] {
    const levels: GridLevel[] = [];
    const rangePercent = this.config.gridRange / 100;
    const stepPercent = this.config.gridStep / 100;
    
    // إنشاء مستويات تحت السعر المرجعي (للشراء)
    for (let i = 1; i <= Math.floor(rangePercent / stepPercent); i++) {
      const price = referencePrice * (1 - stepPercent * i);
      levels.push({
        price,
        quantity: this.calculateBaseQuantity(),
        filled: false
      });
    }

    return levels.sort((a, b) => b.price - a.price); // ترتيب تنازلي
  }

  private findTargetGridLevel(currentPrice: number): GridLevel | null {
    // البحث عن أقرب مستوى شبكة تحت السعر الحالي
    for (const level of this.gridLevels) {
      if (currentPrice <= level.price && !level.filled) {
        return level;
      }
    }
    return null;
  }

  private calculateDCALevel(price: number): number {
    // حساب مستوى DCA بناءً على المسافة من السعر المرجعي
    const dropPercent = ((this.referencePrice - price) / this.referencePrice) * 100;
    return Math.floor(dropPercent / this.config.gridStep) + 1;
  }

  private calculateQuantity(price: number, dcaLevel: number): number {
    const baseQuantity = this.calculateBaseQuantity();
    return baseQuantity * Math.pow(this.config.dcaMultiplier, dcaLevel - 1);
  }

  private calculateBaseQuantity(): number {
    // حساب الكمية الأساسية (1% من الرصيد مقسوم على السعر)
    const baseAmount = this.accountBalance * 0.01;
    return this.referencePrice > 0 ? baseAmount / this.referencePrice : 0;
  }

  private createHoldSignal(reason: string): GridDCASignal {
    return {
      action: 'HOLD',
      confidence: 0,
      entryPrice: 0,
      quantity: 0,
      reasons: [reason],
      gridLevels: this.gridLevels,
      currentExposure: this.totalExposure,
      shouldStop: false
    };
  }

  public reset(): void {
    this.referencePrice = 0;
    this.gridLevels = [];
    this.totalExposure = 0;
  }

  public getStatus(): {
    referencePrice: number;
    currentExposure: number;
    activeLevels: number;
    filledLevels: number;
  } {
    const activeLevels = this.gridLevels.length;
    const filledLevels = this.gridLevels.filter(level => level.filled).length;

    return {
      referencePrice: this.referencePrice,
      currentExposure: this.totalExposure,
      activeLevels,
      filledLevels
    };
  }

  public backtest(historicalData: CandleData[]): {
    totalTrades: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    maxExposureReached: number;
    avgRecoveryTime: number;
  } {
    this.reset();
    
    let totalTrades = 0;
    let winningTrades = 0;
    let totalReturn = 0;
    let maxDrawdown = 0;
    let peak = 0;
    let maxExposureReached = 0;
    let recoveryTimes: number[] = [];

    // محاكاة سيناريو هبوط طويل
    for (let i = 50; i < historicalData.length; i++) {
      const windowData = historicalData.slice(0, i + 1);
      const signal = this.analyze(windowData);

      if (signal.action === 'BUY' && signal.confidence > 60) {
        totalTrades++;
        
        // محاكاة تنفيذ الصفقة
        const mockReturn = this.simulateGridTrade(signal, historicalData.slice(i));
        totalReturn += mockReturn;
        
        if (mockReturn > 0) winningTrades++;

        // تتبع أقصى تعرض
        maxExposureReached = Math.max(maxExposureReached, signal.currentExposure);

        // حساب drawdown
        if (totalReturn > peak) peak = totalReturn;
        const currentDrawdown = (peak - totalReturn) / peak * 100;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }

      if (signal.shouldStop) {
        recoveryTimes.push(i);
        this.reset();
      }
    }

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgRecoveryTime = recoveryTimes.length > 0 
      ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length 
      : 0;

    return {
      totalTrades,
      winRate,
      totalReturn: totalReturn * 100,
      maxDrawdown,
      maxExposureReached,
      avgRecoveryTime
    };
  }

  private simulateGridTrade(signal: GridDCASignal, futureData: CandleData[]): number {
    // محاكاة مبسطة لنتيجة صفقة الشبكة
    const entryPrice = signal.entryPrice;
    const quantity = signal.quantity;
    
    // البحث عن نقطة خروج محتملة
    for (let i = 0; i < Math.min(futureData.length, 100); i++) {
      const currentPrice = futureData[i].close;
      const profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      // خروج عند ربح معقول
      if (profitPercent >= this.config.gridStep * 2) {
        return profitPercent / 100;
      }
    }
    
    // إذا لم يتم الخروج، افترض خسارة صغيرة
    return -0.005;
  }
}