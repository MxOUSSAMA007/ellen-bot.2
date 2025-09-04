/**
 * خدمة تسجيل الصفقات والقرارات مع معرف فريد وسبب مفصل
 */

export interface TradeLogEntry {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'CANCEL' | 'CLOSE';
  price: number;
  size: number;
  reason: string;
  confidence: number;
  timestamp: string;
  strategy: string;
  isDryRun: boolean;
  orderId?: string;
  executedPrice?: number;
  executedSize?: number;
  fees?: number;
  slippage?: number;
  profit?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'FAILED' | 'SIMULATED';
  metadata?: Record<string, any>;
}

export interface DecisionLogEntry {
  id: string;
  symbol: string;
  strategy: string;
  marketCondition: string;
  indicators: Record<string, number>;
  decision: string;
  confidence: number;
  reasons: string[];
  timestamp: string;
  processingTime: number;
}

export interface RiskLogEntry {
  id: string;
  action: 'RISK_CHECK' | 'POSITION_SIZE' | 'STOP_LOSS' | 'DRAWDOWN_CHECK';
  currentDrawdown: number;
  dailyLoss: number;
  positionSize: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  approved: boolean;
  reason: string;
  timestamp: string;
}

class TradeLogger {
  private tradeLogs: TradeLogEntry[] = [];
  private decisionLogs: DecisionLogEntry[] = [];
  private riskLogs: RiskLogEntry[] = [];
  private maxLogs: number = 10000;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * تسجيل قرار تداول
   */
  logDecision(decision: {
    symbol: string;
    strategy: string;
    marketCondition: string;
    indicators: Record<string, number>;
    decision: string;
    confidence: number;
    reasons: string[];
    processingTime: number;
  }): string {
    const logId = this.generateId();
    
    const entry: DecisionLogEntry = {
      id: logId,
      symbol: decision.symbol,
      strategy: decision.strategy,
      marketCondition: decision.marketCondition,
      indicators: decision.indicators,
      decision: decision.decision,
      confidence: decision.confidence,
      reasons: decision.reasons,
      timestamp: new Date().toISOString(),
      processingTime: decision.processingTime
    };

    this.decisionLogs.push(entry);
    this.trimLogs();
    this.saveToStorage();
    
    console.log(`[DECISION] ${entry.strategy} - ${entry.decision} (${entry.confidence}%)`, entry);
    
    return logId;
  }

  /**
   * تسجيل تنفيذ صفقة
   */
  logTrade(trade: {
    symbol: string;
    action: 'BUY' | 'SELL' | 'CLOSE';
    price: number;
    size: number;
    reason: string;
    confidence: number;
    strategy: string;
    isDryRun: boolean;
    orderId?: string;
    executedPrice?: number;
    executedSize?: number;
    fees?: number;
    slippage?: number;
    profit?: number;
    status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'FAILED' | 'SIMULATED';
    metadata?: Record<string, any>;
  }): string {
    const logId = this.generateId();
    
    const entry: TradeLogEntry = {
      id: logId,
      symbol: trade.symbol,
      action: trade.action,
      price: trade.price,
      size: trade.size,
      reason: trade.reason,
      confidence: trade.confidence,
      timestamp: new Date().toISOString(),
      strategy: trade.strategy,
      isDryRun: trade.isDryRun,
      orderId: trade.orderId,
      executedPrice: trade.executedPrice,
      executedSize: trade.executedSize,
      fees: trade.fees,
      slippage: trade.slippage,
      profit: trade.profit,
      status: trade.status,
      metadata: trade.metadata
    };

    this.tradeLogs.push(entry);
    this.trimLogs();
    this.saveToStorage();
    
    const prefix = trade.isDryRun ? '[DRY_RUN]' : '[LIVE]';
    console.log(`${prefix} [TRADE] ${entry.action} ${entry.symbol} @ ${entry.price}`, entry);
    
    return logId;
  }

  /**
   * تسجيل فحص المخاطر
   */
  logRiskCheck(risk: {
    action: 'RISK_CHECK' | 'POSITION_SIZE' | 'STOP_LOSS' | 'DRAWDOWN_CHECK';
    currentDrawdown: number;
    dailyLoss: number;
    positionSize: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    approved: boolean;
    reason: string;
  }): string {
    const logId = this.generateId();
    
    const entry: RiskLogEntry = {
      id: logId,
      action: risk.action,
      currentDrawdown: risk.currentDrawdown,
      dailyLoss: risk.dailyLoss,
      positionSize: risk.positionSize,
      riskLevel: risk.riskLevel,
      approved: risk.approved,
      reason: risk.reason,
      timestamp: new Date().toISOString()
    };

    this.riskLogs.push(entry);
    this.trimLogs();
    this.saveToStorage();
    
    const status = risk.approved ? '✅' : '❌';
    console.log(`[RISK] ${status} ${risk.action} - ${risk.reason}`, entry);
    
    return logId;
  }

  /**
   * الحصول على سجلات التداول المفلترة
   */
  getTradeLogs(filter?: {
    symbol?: string;
    strategy?: string;
    action?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): TradeLogEntry[] {
    let logs = [...this.tradeLogs];

    if (filter) {
      if (filter.symbol) logs = logs.filter(log => log.symbol === filter.symbol);
      if (filter.strategy) logs = logs.filter(log => log.strategy === filter.strategy);
      if (filter.action) logs = logs.filter(log => log.action === filter.action);
      if (filter.status) logs = logs.filter(log => log.status === filter.status);
      
      if (filter.startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= filter.endDate!);
      }
    }

    // ترتيب حسب الوقت (الأحدث أولاً)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filter?.limit) {
      logs = logs.slice(0, filter.limit);
    }

    return logs;
  }

  /**
   * الحصول على سجلات القرارات
   */
  getDecisionLogs(filter?: {
    symbol?: string;
    strategy?: string;
    limit?: number;
  }): DecisionLogEntry[] {
    let logs = [...this.decisionLogs];

    if (filter) {
      if (filter.symbol) logs = logs.filter(log => log.symbol === filter.symbol);
      if (filter.strategy) logs = logs.filter(log => log.strategy === filter.strategy);
    }

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filter?.limit) {
      logs = logs.slice(0, filter.limit);
    }

    return logs;
  }

  /**
   * الحصول على سجلات المخاطر
   */
  getRiskLogs(filter?: {
    action?: string;
    approved?: boolean;
    limit?: number;
  }): RiskLogEntry[] {
    let logs = [...this.riskLogs];

    if (filter) {
      if (filter.action) logs = logs.filter(log => log.action === filter.action);
      if (filter.approved !== undefined) logs = logs.filter(log => log.approved === filter.approved);
    }

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filter?.limit) {
      logs = logs.slice(0, filter.limit);
    }

    return logs;
  }

  /**
   * إحصائيات شاملة
   */
  getStatistics(): {
    trades: {
      total: number;
      successful: number;
      failed: number;
      pending: number;
      successRate: number;
    };
    strategies: Record<string, {
      trades: number;
      successRate: number;
      avgConfidence: number;
    }>;
    risk: {
      totalChecks: number;
      approvedChecks: number;
      rejectedChecks: number;
      approvalRate: number;
    };
    performance: {
      avgProcessingTime: number;
      totalProfit: number;
      totalFees: number;
      netProfit: number;
    };
  } {
    // إحصائيات الصفقات
    const totalTrades = this.tradeLogs.length;
    const successfulTrades = this.tradeLogs.filter(log => log.status === 'FILLED' && (log.profit || 0) > 0).length;
    const failedTrades = this.tradeLogs.filter(log => log.status === 'FAILED' || log.status === 'CANCELLED').length;
    const pendingTrades = this.tradeLogs.filter(log => log.status === 'PENDING').length;
    const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;

    // إحصائيات الاستراتيجيات
    const strategies: Record<string, any> = {};
    this.tradeLogs.forEach(log => {
      if (!strategies[log.strategy]) {
        strategies[log.strategy] = { trades: 0, successful: 0, totalConfidence: 0 };
      }
      strategies[log.strategy].trades++;
      strategies[log.strategy].totalConfidence += log.confidence;
      if (log.status === 'FILLED' && (log.profit || 0) > 0) {
        strategies[log.strategy].successful++;
      }
    });

    Object.keys(strategies).forEach(strategy => {
      const data = strategies[strategy];
      strategies[strategy] = {
        trades: data.trades,
        successRate: data.trades > 0 ? (data.successful / data.trades) * 100 : 0,
        avgConfidence: data.trades > 0 ? data.totalConfidence / data.trades : 0
      };
    });

    // إحصائيات المخاطر
    const totalRiskChecks = this.riskLogs.length;
    const approvedChecks = this.riskLogs.filter(log => log.approved).length;
    const rejectedChecks = totalRiskChecks - approvedChecks;
    const approvalRate = totalRiskChecks > 0 ? (approvedChecks / totalRiskChecks) * 100 : 0;

    // إحصائيات الأداء
    const avgProcessingTime = this.decisionLogs.length > 0 
      ? this.decisionLogs.reduce((sum, log) => sum + log.processingTime, 0) / this.decisionLogs.length 
      : 0;
    
    const totalProfit = this.tradeLogs.reduce((sum, log) => sum + (log.profit || 0), 0);
    const totalFees = this.tradeLogs.reduce((sum, log) => sum + (log.fees || 0), 0);
    const netProfit = totalProfit - totalFees;

    return {
      trades: {
        total: totalTrades,
        successful: successfulTrades,
        failed: failedTrades,
        pending: pendingTrades,
        successRate
      },
      strategies,
      risk: {
        totalChecks: totalRiskChecks,
        approvedChecks,
        rejectedChecks,
        approvalRate
      },
      performance: {
        avgProcessingTime,
        totalProfit,
        totalFees,
        netProfit
      }
    };
  }

  /**
   * تصدير السجلات
   */
  exportLogs(type: 'trades' | 'decisions' | 'risk' | 'all' = 'all', format: 'json' | 'csv' = 'json'): string {
    const data = {
      trades: this.tradeLogs,
      decisions: this.decisionLogs,
      risk: this.riskLogs
    };

    if (type !== 'all') {
      return format === 'json' 
        ? JSON.stringify(data[type], null, 2)
        : this.convertToCSV(data[type]);
    }

    return format === 'json' 
      ? JSON.stringify(data, null, 2)
      : Object.entries(data).map(([key, value]) => 
          `=== ${key.toUpperCase()} ===\n${this.convertToCSV(value)}`
        ).join('\n\n');
  }

  /**
   * مسح السجلات القديمة
   */
  clearOldLogs(daysToKeep: number = 30): {
    tradesRemoved: number;
    decisionsRemoved: number;
    riskRemoved: number;
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialTrades = this.tradeLogs.length;
    const initialDecisions = this.decisionLogs.length;
    const initialRisk = this.riskLogs.length;

    this.tradeLogs = this.tradeLogs.filter(log => new Date(log.timestamp) > cutoffDate);
    this.decisionLogs = this.decisionLogs.filter(log => new Date(log.timestamp) > cutoffDate);
    this.riskLogs = this.riskLogs.filter(log => new Date(log.timestamp) > cutoffDate);

    this.saveToStorage();

    return {
      tradesRemoved: initialTrades - this.tradeLogs.length,
      decisionsRemoved: initialDecisions - this.decisionLogs.length,
      riskRemoved: initialRisk - this.riskLogs.length
    };
  }

  /**
   * البحث في السجلات
   */
  searchLogs(query: string, type: 'trades' | 'decisions' | 'risk' = 'trades'): any[] {
    const logs = type === 'trades' ? this.tradeLogs : 
                 type === 'decisions' ? this.decisionLogs : this.riskLogs;

    return logs.filter(log => 
      JSON.stringify(log).toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * تحليل الأنماط في السجلات
   */
  analyzePatterns(): {
    mostActiveStrategy: string;
    mostProfitableStrategy: string;
    commonFailureReasons: string[];
    peakTradingHours: number[];
    avgDecisionTime: number;
  } {
    // الاستراتيجية الأكثر نشاطاً
    const strategyCount: Record<string, number> = {};
    this.tradeLogs.forEach(log => {
      strategyCount[log.strategy] = (strategyCount[log.strategy] || 0) + 1;
    });
    const mostActiveStrategy = Object.entries(strategyCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    // الاستراتيجية الأكثر ربحية
    const strategyProfit: Record<string, number> = {};
    this.tradeLogs.forEach(log => {
      if (log.profit) {
        strategyProfit[log.strategy] = (strategyProfit[log.strategy] || 0) + log.profit;
      }
    });
    const mostProfitableStrategy = Object.entries(strategyProfit)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    // أسباب الفشل الشائعة
    const failureReasons: Record<string, number> = {};
    this.tradeLogs.filter(log => log.status === 'FAILED' || log.status === 'CANCELLED')
      .forEach(log => {
        failureReasons[log.reason] = (failureReasons[log.reason] || 0) + 1;
      });
    const commonFailureReasons = Object.entries(failureReasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([reason]) => reason);

    // ساعات التداول الذروة
    const hourlyActivity: Record<number, number> = {};
    this.tradeLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });
    const peakTradingHours = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // متوسط وقت اتخاذ القرار
    const avgDecisionTime = this.decisionLogs.length > 0
      ? this.decisionLogs.reduce((sum, log) => sum + log.processingTime, 0) / this.decisionLogs.length
      : 0;

    return {
      mostActiveStrategy,
      mostProfitableStrategy,
      commonFailureReasons,
      peakTradingHours,
      avgDecisionTime
    };
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private trimLogs(): void {
    if (this.tradeLogs.length > this.maxLogs) {
      this.tradeLogs = this.tradeLogs.slice(-this.maxLogs);
    }
    if (this.decisionLogs.length > this.maxLogs) {
      this.decisionLogs = this.decisionLogs.slice(-this.maxLogs);
    }
    if (this.riskLogs.length > this.maxLogs) {
      this.riskLogs = this.riskLogs.slice(-this.maxLogs);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('ellen_trade_logs', JSON.stringify({
        trades: this.tradeLogs.slice(-1000),
        decisions: this.decisionLogs.slice(-1000),
        risk: this.riskLogs.slice(-1000)
      }));
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('ellen_trade_logs');
      if (saved) {
        const data = JSON.parse(saved);
        this.tradeLogs = data.trades || [];
        this.decisionLogs = data.decisions || [];
        this.riskLogs = data.risk || [];
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error);
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const tradeLogger = new TradeLogger();