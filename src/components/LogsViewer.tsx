import React, { useState, useEffect } from 'react';
import { Download, Filter, RefreshCw, Database, HardDrive } from 'lucide-react';
import { secureLoggingService } from '../services/SecureLoggingService';

export const LogsViewer: React.FC = () => {
  const [activeSource, setActiveSource] = useState<'local' | 'server'>('local');
  const [logType, setLogType] = useState<'trades' | 'decisions' | 'risk' | 'system'>('trades');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [filters, setFilters] = useState({
    symbol: '',
    strategy: '',
    level: '',
    source: '',
    limit: 50
  });
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    hasMore: false
  });

  useEffect(() => {
    loadLogs();
    loadStatistics();
  }, [activeSource, logType, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      if (activeSource === 'local') {
        // تحميل السجلات المحلية
        const localLogs = secureLoggingService.getLocalLogs({
          symbol: filters.symbol || undefined,
          strategy: filters.strategy || undefined,
          limit: filters.limit
        });
        setLogs(localLogs);
        setPagination({ total: localLogs.length, offset: 0, hasMore: false });
      } else {
        // تحميل السجلات من الخادم
        const serverLogs = await secureLoggingService.getLogsFromServer(logType, {
          symbol: filters.symbol || undefined,
          strategy: filters.strategy || undefined,
          limit: filters.limit
        });
        setLogs(serverLogs);
        setPagination({ total: serverLogs.length, offset: 0, hasMore: false });
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await secureLoggingService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleExport = () => {
    const data = secureLoggingService.exportLogs('json');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ellen-bot-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ar-SA');
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'text-emerald-400 bg-emerald-500/20';
      case 'SELL': return 'text-red-400 bg-red-500/20';
      case 'HOLD': return 'text-yellow-400 bg-yellow-500/20';
      case 'ANALYSIS': return 'text-blue-400 bg-blue-500/20';
      case 'RISK_CHECK': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getLogTypeDisplayName = (type: string) => {
    const names = {
      trades: 'الصفقات',
      decisions: 'القرارات', 
      risk: 'المخاطر',
      system: 'النظام'
    };
    return names[type as keyof typeof names] || type;
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">السجلات المحلية</p>
                <p className="text-2xl font-bold text-white">{statistics.local?.totalLogs || 0}</p>
              </div>
              <HardDrive className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">إشارات التداول</p>
                <p className="text-2xl font-bold text-emerald-400">{statistics.local?.tradeSignals || 0}</p>
              </div>
              <Database className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">فحوصات المخاطر</p>
                <p className="text-2xl font-bold text-purple-400">{statistics.local?.riskChecks || 0}</p>
              </div>
              <Database className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">آخر نشاط</p>
                <p className="text-sm font-medium text-white">
                  {statistics.local?.lastActivity 
                    ? formatTimestamp(statistics.local.lastActivity).split(' ')[1]
                    : 'لا يوجد'
                  }
                </p>
              </div>
              <RefreshCw className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Tab Selector */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveSource('local')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeSource === 'local'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>محلي</span>
            </button>
            
            <button
              onClick={() => setActiveSource('server')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeSource === 'server'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>خادم</span>
            </button>
          </div>

          {/* Log Type Selector for Server */}
          {activeSource === 'server' && (
            <select
              value={logType}
              onChange={(e) => setLogType(e.target.value as any)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="trades">الصفقات</option>
              <option value="decisions">القرارات</option>
              <option value="risk">المخاطر</option>
              <option value="system">النظام</option>
            </select>
          )}

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="العملة (مثل BTCUSDT)"
              value={filters.symbol}
              onChange={(e) => setFilters({...filters, symbol: e.target.value})}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <input
              type="text"
              placeholder="الاستراتيجية"
              value={filters.strategy}
              onChange={(e) => setFilters({...filters, strategy: e.target.value})}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {logType === 'system' && (
              <select
                value={filters.level}
                onChange={(e) => setFilters({...filters, level: e.target.value})}
                className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">جميع المستويات</option>
                <option value="ERROR">أخطاء</option>
                <option value="WARN">تحذيرات</option>
                <option value="INFO">معلومات</option>
                <option value="DEBUG">تصحيح</option>
              </select>
            )}
            
            <select
              value={filters.limit}
              onChange={(e) => setFilters({...filters, limit: Number(e.target.value)})}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white rounded-lg font-medium transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
            
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              <span>تصدير</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">الوقت</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">العملة</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">الإجراء</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">السعر</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">الكمية</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">الثقة</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">الاستراتيجية</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">المصدر</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">السبب</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    جاري التحميل...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    لا توجد سجلات
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log.id || index} className={`border-b border-slate-700/50 ${index % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                    <td className="py-3 px-6 text-slate-300 text-sm">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-3 px-6 text-white font-medium">{log.symbol || 'N/A'}</td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.side || log.action || log.level)}`}>
                        {log.side || log.action || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-white">
                      {log.executedPrice ? `$${log.executedPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 px-6 text-white">
                      {log.executedQuantity ? log.executedQuantity.toFixed(6) : '-'}
                    </td>
                    <td className="py-3 px-6 text-white">
                      {log.confidence ? `${log.confidence.toFixed(0)}%` : log.status === 'FILLED' ? '100%' : 
                       log.status === 'PARTIALLY_FILLED' ? 
                       `${((log.executedQuantity || 0) / (log.quantity || 1) * 100).toFixed(1)}%` : 
                       '0%'}
                    </td>
                    <td className="py-3 px-6">
                      {log.type && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                          {log.type}
                        </span>
                      )}
                      {log.latency && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs ml-1">
                          {log.latency.toFixed(0)}ms
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6">
                      <span className={`px-2 py-1 rounded text-xs ${
                        activeSource === 'local' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {activeSource === 'local' ? 'محلي' : 'خادم'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-400 text-xs max-w-xs truncate">
                      {log.reason || log.message || log.status}
                      {log.slippage && (
                        <div className="text-yellow-400">
                          انزلاق: {(log.slippage * 100).toFixed(3)}%
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.total > filters.limit && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">
              عرض {Math.min(filters.limit, pagination.total)} من {pagination.total} سجل
            </span>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">
                السابق
              </button>
              <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">
                التالي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};