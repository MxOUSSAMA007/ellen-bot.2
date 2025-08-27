/**
 * خدمة التسجيل والمراجعة (Logging & Audit)
 * تسجل جميع الإشارات والصفقات مع معرف فريد وسبب القرار
 */

export interface LogEntry {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'CANCEL' | 'ANALYSIS';
  price?: number;
  quantity?: number;
  reason: string;
  confidence?: number;
  timestamp: string;
  userId?: string;
  isDryRun: boolean;
  metadata?: Record<string, any>;
}

export interface TradeLogEntry extends LogEntry {
  orderId?: string;
  executedPrice?: number;
  executedQuantity?: number;
  fees?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'FAILED' | 'SIMULATED';
}

export interface AnalysisLogEntry extends LogEntry {
  indicators: {
    rsi?: number;
    macd?: number;
    bollinger?: string;
    volume?: number;
    trend?: string;
  };
  patterns?: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

class LoggingService {
  private logs: LogEntry[] = [];
  private maxLogs: number = 10000;
  private isDryRun: boolean;

  constructor() {
    this.isDryRun = import.meta.env.VITE_DRY_RUN === 'true';
    this.initializeLogging();
  }

  /**
   * تسجيل إشارة تداول
   */
  logTradeSignal(signal: {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    price: number;
    confidence: number;
    reason: string;
    indicators?: any;
    userId?: string;
  }): string {
    const logId = this.generateLogId();
    
    const logEntry: AnalysisLogEntry = {
      id: logId,
      symbol: signal.symbol,
      action: signal.action,
      price: signal.price,
      reason: signal.reason,
      confidence: signal.confidence,
      timestamp: new Date().toISOString(),
      userId: signal.userId,
      isDryRun: this.isDryRun,
      indicators: signal.indicators || {},
      patterns: [],
      riskLevel: this.calculateRiskLevel(signal.confidence)
    };

    this.addLog(logEntry);
    this.logToConsole(logEntry);
    
    return logId;
  }

  /**
   * تسجيل تنفيذ صفقة
   */
  logTradeExecution(trade: {
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    orderId?: string;
    reason: string;
    userId?: string;
    status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'FAILED' | 'SIMULATED';
    executedPrice?: number;
    executedQuantity?: number;
    fees?: number;
  }): string {
    const logId = this.generateLogId();
    
    const logEntry: TradeLogEntry = {
      id: logId,
      symbol: trade.symbol,
      action: trade.action,
      price: trade.price,
      quantity: trade.quantity,
      reason: trade.reason,
      timestamp: new Date().toISOString(),
      userId: trade.userId,
      isDryRun: this.isDryRun,
      orderId: trade.orderId,
      executedPrice: trade.executedPrice,
      executedQuantity: trade.executedQuantity,
      fees: trade.fees,
      status: trade.status
    };

    this.addLog(logEntry);
    this.logToConsole(logEntry);
    
    // إرسال إلى الخادم للحفظ الدائم
    this.sendToBackend(logEntry);
    
    return logId;
  }

  /**
   * تسجيل تحليل فني
   */
  logTechnicalAnalysis(analysis: {
    symbol: string;
    indicators: any;
    patterns: string[];
    recommendation: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reason: string;
    userId?: string;
  }): string {
    const logId = this.generateLogId();
    
    const logEntry: AnalysisLogEntry = {
      id: logId,
      symbol: analysis.symbol,
      action: 'ANALYSIS',
      reason: analysis.reason,
      confidence: analysis.confidence,
      timestamp: new Date().toISOString(),
      userId: analysis.userId,
      isDryRun: this.isDryRun,
      indicators: analysis.indicators,
      patterns: analysis.patterns,
      riskLevel: this.calculateRiskLevel(analysis.confidence)
    };

    this.addLog(logEntry);
    this.logToConsole(logEntry);
    
    return logId;
  }

  /**
   * تسجيل خطأ أو تحذير
   */
  logError(error: {
    symbol?: string;
    action: string;
    error: string;
    details?: any;
    userId?: string;
  }): string {
    const logId = this.generateLogId();
    
    const logEntry: LogEntry = {
      id: logId,
      symbol: error.symbol || 'SYSTEM',
      action: 'CANCEL',
      reason: `ERROR: ${error.error}`,
      timestamp: new Date().toISOString(),
      userId: error.userId,
      isDryRun: this.isDryRun,
      metadata: {
        errorType: 'ERROR',
        details: error.details
      }
    };

    this.addLog(logEntry);
    this.logToConsole(logEntry, 'error');
    
    return logId;
  }

  /**
   * الحصول على السجلات المفلترة
   */
  getLogs(filter?: {
    symbol?: string;
    action?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.symbol) {
        filteredLogs = filteredLogs.filter(log => log.symbol === filter.symbol);
      }
      if (filter.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filter.action);
      }
      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
      }
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= filter.startDate!
        );
      }
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= filter.endDate!
        );
      }
    }

    // ترتيب حسب الوقت (الأحدث أولاً)
    filteredLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // تحديد العدد المطلوب
    if (filter?.limit) {
      filteredLogs = filteredLogs.slice(0, filter.limit);
    }

    return filteredLogs;
  }

  /**
   * إحصائيات السجلات
   */
  getLogStats(): {
    totalLogs: number;
    tradeSignals: number;
    executedTrades: number;
    errors: number;
    successRate: number;
    lastActivity: string | null;
  } {
    const tradeSignals = this.logs.filter(log => 
      ['BUY', 'SELL', 'HOLD'].includes(log.action)
    ).length;
    
    const executedTrades = this.logs.filter(log => 
      log.action === 'BUY' || log.action === 'SELL'
    ).length;
    
    const errors = this.logs.filter(log => 
      log.reason.startsWith('ERROR:')
    ).length;
    
    const successfulTrades = this.logs.filter(log => 
      (log as TradeLogEntry).status === 'FILLED' || 
      (log as TradeLogEntry).status === 'SIMULATED'
    ).length;
    
    const successRate = executedTrades > 0 ? 
      (successfulTrades / executedTrades) * 100 : 0;
    
    const lastActivity = this.logs.length > 0 ? 
      this.logs[this.logs.length - 1].timestamp : null;

    return {
      totalLogs: this.logs.length,
      tradeSignals,
      executedTrades,
      errors,
      successRate,
      lastActivity
    };
  }

  /**
   * تصدير السجلات إلى JSON
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else {
      // تحويل إلى CSV
      const headers = ['id', 'timestamp', 'symbol', 'action', 'price', 'reason', 'confidence', 'isDryRun'];
      const csvRows = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          log.id,
          log.timestamp,
          log.symbol,
          log.action,
          log.price || '',
          `"${log.reason}"`,
          log.confidence || '',
          log.isDryRun
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
  }

  /**
   * مسح السجلات القديمة
   */
  clearOldLogs(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => 
      new Date(log.timestamp) > cutoffDate
    );
    
    const removedCount = initialCount - this.logs.length;
    
    if (removedCount > 0) {
      console.log(`Cleared ${removedCount} old log entries`);
    }
    
    return removedCount;
  }

  /**
   * دوال مساعدة خاصة
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRiskLevel(confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (confidence >= 80) return 'LOW';
    if (confidence >= 60) return 'MEDIUM';
    return 'HIGH';
  }

  private addLog(logEntry: LogEntry): void {
    this.logs.push(logEntry);
    
    // إزالة السجلات القديمة إذا تجاوزت الحد الأقصى
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // حفظ في localStorage للاستمرارية
    this.saveToLocalStorage();
  }

  private logToConsole(logEntry: LogEntry, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = this.isDryRun ? '[DRY_RUN]' : '[LIVE]';
    const message = `${prefix} ${logEntry.timestamp} | ${logEntry.symbol} | ${logEntry.action} | ${logEntry.reason}`;
    
    switch (level) {
      case 'error':
        console.error(message, logEntry);
        break;
      case 'warn':
        console.warn(message, logEntry);
        break;
      default:
        console.log(message, logEntry);
    }
  }

  private async sendToBackend(logEntry: LogEntry): Promise<void> {
    try {
      // إرسال إلى الخادم الخلفي للحفظ الدائم
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.warn('Failed to send log to backend:', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      // حفظ آخر 1000 سجل فقط في localStorage
      const recentLogs = this.logs.slice(-1000);
      localStorage.setItem('ellen_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to save logs to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const savedLogs = localStorage.getItem('ellen_logs');
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (error) {
      console.warn('Failed to load logs from localStorage:', error);
      this.logs = [];
    }
  }

  private initializeLogging(): void {
    this.loadFromLocalStorage();
    
    // تنظيف السجلات القديمة عند بدء التطبيق
    this.clearOldLogs(30);
    
    console.log(`Logging Service initialized. Mode: ${this.isDryRun ? 'DRY_RUN' : 'LIVE'}`);
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const loggingService = new LoggingService();