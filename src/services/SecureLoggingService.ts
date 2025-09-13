/**
 * خدمة التسجيل الآمنة مع إرسال للخادم الخلفي
 */

export interface SecureLogEntry {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'CANCEL' | 'ANALYSIS' | 'RISK_CHECK';
  price?: number;
  size?: number;
  reason: string;
  confidence?: number;
  timestamp: string;
  strategy?: string;
  isDryRun: boolean;
  metadata?: Record<string, any>;
}

export interface TradeLogEntry extends SecureLogEntry {
  orderId?: string;
  executedPrice?: number;
  executedSize?: number;
  fees?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'FAILED' | 'SIMULATED';
}

export interface DecisionLogEntry {
  id: string;
  symbol: string;
  strategy: string;
  marketCondition: string;
  indicators: Record<string, any>;
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

class SecureLoggingService {
  private backendUrl: string;
  private frontendToken: string;
  private localLogs: SecureLogEntry[] = [];
  private maxLocalLogs: number = 1000;

  constructor() {
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
    this.frontendToken = import.meta.env.VITE_FRONTEND_TOKEN || 'ellen-bot-secure-token';
    this.loadFromLocalStorage();
  }

  /**
   * تسجيل قرار تداول
   */
  async logDecision(decision: Omit<DecisionLogEntry, 'id' | 'timestamp'>): Promise<string> {
    const logEntry: DecisionLogEntry = {
      id: this.generateLogId(),
      ...decision,
      timestamp: new Date().toISOString()
    };

    // حفظ محلي
    this.addToLocalLogs({
      id: logEntry.id,
      symbol: logEntry.symbol,
      action: 'ANALYSIS',
      reason: `Strategy: ${logEntry.strategy}, Decision: ${logEntry.decision}`,
      confidence: logEntry.confidence,
      timestamp: logEntry.timestamp,
      strategy: logEntry.strategy,
      isDryRun: true,
      metadata: {
        type: 'decision',
        marketCondition: logEntry.marketCondition,
        indicators: logEntry.indicators,
        reasons: logEntry.reasons,
        processingTime: logEntry.processingTime
      }
    });

    // إرسال للخادم
    try {
      await this.sendToBackend('/logs/decision', logEntry);
      console.log(`[DECISION] ${logEntry.strategy} - ${logEntry.decision} (${logEntry.confidence}%)`, logEntry);
    } catch (error) {
      console.warn('Failed to send decision log to backend:', error);
    }

    return logEntry.id;
  }

  /**
   * تسجيل تنفيذ صفقة
   */
  async logTrade(trade: Omit<TradeLogEntry, 'id' | 'timestamp'>): Promise<string> {
    const logEntry: TradeLogEntry = {
      id: this.generateLogId(),
      ...trade,
      timestamp: new Date().toISOString()
    };

    // حفظ محلي
    this.addToLocalLogs(logEntry);

    // إرسال للخادم
    try {
      await this.sendToBackend('/logs/trade', logEntry);
      
      const prefix = trade.isDryRun ? '[DRY_RUN]' : '[LIVE]';
      console.log(`${prefix} [TRADE] ${logEntry.action} ${logEntry.symbol} @ ${logEntry.price}`, logEntry);
    } catch (error) {
      console.warn('Failed to send trade log to backend:', error);
    }

    return logEntry.id;
  }

  /**
   * تسجيل فحص المخاطر
   */
  async logRiskCheck(risk: Omit<RiskLogEntry, 'id' | 'timestamp'>): Promise<string> {
    const logEntry: RiskLogEntry = {
      id: this.generateLogId(),
      ...risk,
      timestamp: new Date().toISOString()
    };

    // حفظ محلي
    this.addToLocalLogs({
      id: logEntry.id,
      symbol: 'SYSTEM',
      action: 'RISK_CHECK',
      reason: logEntry.reason,
      timestamp: logEntry.timestamp,
      isDryRun: true,
      metadata: {
        type: 'risk',
        action: logEntry.action,
        currentDrawdown: logEntry.currentDrawdown,
        dailyLoss: logEntry.dailyLoss,
        positionSize: logEntry.positionSize,
        riskLevel: logEntry.riskLevel,
        approved: logEntry.approved
      }
    });

    // إرسال للخادم
    try {
      await this.sendToBackend('/logs/risk', logEntry);
      
      const status = risk.approved ? '✅' : '❌';
      console.log(`[RISK] ${status} ${risk.action} - ${risk.reason}`, logEntry);
    } catch (error) {
      console.warn('Failed to send risk log to backend:', error);
    }

    return logEntry.id;
  }

  /**
   * الحصول على السجلات من الخادم
   */
  async getLogsFromServer(type: 'trades' | 'decisions' | 'risk', options?: {
  async getLogsFromServer(type: 'trades' | 'decisions' | 'risk' | 'system', options?: {
    limit?: number;
    symbol?: string;
    strategy?: string;
    level?: string;
    source?: string;
    startDate?: string;
    endDate?: string;
    strategy?: string;
  }): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.symbol) params.append('symbol', options.symbol);
      if (options?.strategy) params.append('strategy', options.strategy);
      if (options?.level) params.append('level', options.level);
      if (options?.source) params.append('source', options.source);
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);

      const url = `${this.backendUrl}/logs/${type}${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'X-Frontend-Token': this.frontendToken
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch logs from server:', error);
      return [];
    }
  }

  /**
   * الحصول على السجلات المحلية
   */
  getLocalLogs(filter?: {
    symbol?: string;
    action?: string;
    strategy?: string;
    limit?: number;
  }): SecureLogEntry[] {
    let logs = [...this.localLogs];

    if (filter) {
      if (filter.symbol) logs = logs.filter(log => log.symbol === filter.symbol);
      if (filter.action) logs = logs.filter(log => log.action === filter.action);
      if (filter.strategy) logs = logs.filter(log => log.strategy === filter.strategy);
    }

    // ترتيب حسب الوقت (الأحدث أولاً)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filter?.limit) {
      logs = logs.slice(0, filter.limit);
    }

    return logs;
  }

  /**
   * إحصائيات السجلات
   */
  async getStatistics(): Promise<{
    local: {
      totalLogs: number;
      tradeSignals: number;
      riskChecks: number;
      lastActivity: string | null;
    };
    server?: {
      totalTrades: number;
      totalDecisions: number;
      totalRiskChecks: number;
    };
  }> {
    const localStats = {
      totalLogs: this.localLogs.length,
      tradeSignals: this.localLogs.filter(log => ['BUY', 'SELL'].includes(log.action)).length,
      riskChecks: this.localLogs.filter(log => log.action === 'RISK_CHECK').length,
      lastActivity: this.localLogs.length > 0 ? this.localLogs[this.localLogs.length - 1].timestamp : null
    };

    try {
      // محاولة الحصول على إحصائيات من الخادم
      const [trades, decisions, risks] = await Promise.all([
        this.getLogsFromServer('trades', { limit: 1 }),
        this.getLogsFromServer('decisions', { limit: 1 }),
        this.getLogsFromServer('risk', { limit: 1 })
      ]);

      return {
        local: localStats,
        server: {
          totalTrades: trades.length,
          totalDecisions: decisions.length,
          totalRiskChecks: risks.length
        }
      };
    } catch (error) {
      return { local: localStats };
    }
  }

  /**
   * تصدير السجلات
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.localLogs, null, 2);
    } else {
      const headers = ['id', 'timestamp', 'symbol', 'action', 'price', 'size', 'reason', 'confidence', 'strategy', 'isDryRun'];
      const csvRows = [headers.join(',')];
      
      this.localLogs.forEach(log => {
        const row = [
          log.id,
          log.timestamp,
          log.symbol,
          log.action,
          log.price || '',
          log.size || '',
          `"${log.reason}"`,
          log.confidence || '',
          log.strategy || '',
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
  clearOldLogs(daysToKeep: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const initialCount = this.localLogs.length;
    this.localLogs = this.localLogs.filter(log => 
      new Date(log.timestamp) > cutoffDate
    );
    
    const removedCount = initialCount - this.localLogs.length;
    
    if (removedCount > 0) {
      this.saveToLocalStorage();
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

  private addToLocalLogs(logEntry: SecureLogEntry): void {
    this.localLogs.push(logEntry);
    
    // إزالة السجلات القديمة إذا تجاوزت الحد الأقصى
    if (this.localLogs.length > this.maxLocalLogs) {
      this.localLogs = this.localLogs.slice(-this.maxLocalLogs);
    }
    
    this.saveToLocalStorage();
  }

  private async sendToBackend(endpoint: string, data: any): Promise<void> {
    const response = await fetch(`${this.backendUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Frontend-Token': this.frontendToken
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Backend error: ${error.error || response.statusText}`);
    }
  }

  private saveToLocalStorage(): void {
    try {
      const recentLogs = this.localLogs.slice(-500); // حفظ آخر 500 سجل فقط
      localStorage.setItem('ellen_secure_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to save logs to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const savedLogs = localStorage.getItem('ellen_secure_logs');
      if (savedLogs) {
        this.localLogs = JSON.parse(savedLogs);
      }
    } catch (error) {
      console.warn('Failed to load logs from localStorage:', error);
      this.localLogs = [];
    }
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const secureLoggingService = new SecureLoggingService();