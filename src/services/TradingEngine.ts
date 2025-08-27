export interface TradingConfig {
  profitTarget: number;
  stopLoss: number;
  maxPositionSize: number;
  analysisSpeed: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface MarketSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: Date;
  indicators: {
    rsi: number;
    macd: number;
    volume: number;
    trend: string;
  };
}

export class TradingEngine {
  private config: TradingConfig;
  private isRunning: boolean = false;
  private positions: Map<string, any> = new Map();
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(config: TradingConfig) {
    this.config = config;
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startAnalysis();
    console.log('Trading engine started');
  }

  public stop(): void {
    this.isRunning = false;
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    console.log('Trading engine stopped');
  }

  private startAnalysis(): void {
    this.analysisInterval = setInterval(() => {
      this.analyzeMarket();
    }, this.config.analysisSpeed);
  }

  private async analyzeMarket(): Promise<void> {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    
    for (const symbol of symbols) {
      try {
        const signal = await this.generateSignal(symbol);
        await this.processSignal(signal);
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error);
      }
    }
  }

  private async generateSignal(symbol: string): Promise<MarketSignal> {
    // محاكاة تحليل السوق السريع
    const price = Math.random() * 50000 + 30000;
    const rsi = Math.random() * 100;
    const macd = (Math.random() - 0.5) * 1000;
    const volume = Math.random() * 1000000000;

    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;

    // خوارزمية تحليل سريعة
    if (rsi < 30 && macd > 0) {
      action = 'BUY';
      confidence = 75 + Math.random() * 20;
    } else if (rsi > 70 && macd < 0) {
      action = 'SELL';
      confidence = 75 + Math.random() * 20;
    } else {
      confidence = 40 + Math.random() * 30;
    }

    return {
      symbol,
      action,
      confidence,
      price,
      timestamp: new Date(),
      indicators: {
        rsi,
        macd,
        volume,
        trend: macd > 0 ? 'bullish' : 'bearish'
      }
    };
  }

  private async processSignal(signal: MarketSignal): Promise<void> {
    if (signal.confidence < 70) return; // تجاهل الإشارات الضعيفة

    const position = this.positions.get(signal.symbol);

    if (signal.action === 'BUY' && !position) {
      await this.openPosition(signal, 'LONG');
    } else if (signal.action === 'SELL' && !position) {
      await this.openPosition(signal, 'SHORT');
    } else if (position) {
      await this.checkExitConditions(signal, position);
    }
  }

  private async openPosition(signal: MarketSignal, side: 'LONG' | 'SHORT'): Promise<void> {
    const position = {
      symbol: signal.symbol,
      side,
      entryPrice: signal.price,
      quantity: this.calculatePositionSize(signal.price),
      timestamp: new Date(),
      profitTarget: this.config.profitTarget,
      stopLoss: this.config.stopLoss
    };

    this.positions.set(signal.symbol, position);
    console.log(`Opened ${side} position for ${signal.symbol} at ${signal.price}`);

    // محاكاة إرسال أمر للبورصة
    await this.sendOrderToBinance(position);
  }

  private async checkExitConditions(signal: MarketSignal, position: any): Promise<void> {
    const currentPrice = signal.price;
    const entryPrice = position.entryPrice;
    
    let profitPercent = 0;
    if (position.side === 'LONG') {
      profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
    } else {
      profitPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
    }

    // فحص شروط الخروج
    if (profitPercent >= this.config.profitTarget) {
      await this.closePosition(signal.symbol, 'PROFIT_TARGET');
    } else if (profitPercent <= -this.config.stopLoss) {
      await this.closePosition(signal.symbol, 'STOP_LOSS');
    }
  }

  private async closePosition(symbol: string, reason: string): Promise<void> {
    const position = this.positions.get(symbol);
    if (!position) return;

    this.positions.delete(symbol);
    console.log(`Closed position for ${symbol} - Reason: ${reason}`);

    // محاكاة إرسال أمر إغلاق للبورصة
    await this.sendCloseOrderToBinance(position, reason);
  }

  private calculatePositionSize(price: number): number {
    // حساب حجم الصفقة بناءً على إدارة المخاطر
    const accountBalance = 1000; // محاكاة رصيد الحساب
    const riskAmount = accountBalance * (this.config.maxPositionSize / 100);
    return riskAmount / price;
  }

  private async sendOrderToBinance(position: any): Promise<void> {
    // محاكاة إرسال أمر لـ Binance
    // في التطبيق الحقيقي، هنا سيتم استخدام Binance API
    console.log('Order sent to Binance:', position);
  }

  private async sendCloseOrderToBinance(position: any, reason: string): Promise<void> {
    // محاكاة إرسال أمر إغلاق لـ Binance
    console.log('Close order sent to Binance:', { position, reason });
  }

  public getActivePositions(): any[] {
    return Array.from(this.positions.values());
  }

  public updateConfig(newConfig: Partial<TradingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // إعادة تشغيل التحليل بالسرعة الجديدة إذا تغيرت
    if (newConfig.analysisSpeed && this.isRunning) {
      this.stop();
      this.start();
    }
  }
}