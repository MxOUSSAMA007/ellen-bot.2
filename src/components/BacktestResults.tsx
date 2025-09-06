import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Download,
  RefreshCw
} from 'lucide-react';

interface BacktestResultsProps {
  results: any;
  onRunBacktest: () => void;
  isLoading?: boolean;
}

export const BacktestResults: React.FC<BacktestResultsProps> = ({ 
  results, 
  onRunBacktest, 
  isLoading = false 
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState('HYBRID');

  if (!results) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50 text-center">
        <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-300 mb-2">لا توجد نتائج اختبار</h3>
        <p className="text-slate-400 mb-6">قم بتشغيل اختبار تاريخي لرؤية أداء الاستراتيجيات</p>
        <button
          onClick={onRunBacktest}
          disabled={isLoading}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white rounded-lg font-medium transition-all duration-200 mx-auto"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <BarChart3 className="w-4 h-4" />
          )}
          <span>{isLoading ? 'جاري الاختبار...' : 'تشغيل اختبار تاريخي'}</span>
        </button>
      </div>
    );
  }

  const currentResult = results;

  const getPerformanceColor = (value: number, type: 'return' | 'winRate' | 'drawdown') => {
    switch (type) {
      case 'return':
        return value >= 10 ? 'emerald' : value >= 0 ? 'yellow' : 'red';
      case 'winRate':
        return value >= 70 ? 'emerald' : value >= 60 ? 'yellow' : 'red';
      case 'drawdown':
        return value <= 5 ? 'emerald' : value <= 10 ? 'yellow' : 'red';
      default:
        return 'gray';
    }
  };

  const getAcceptanceStatus = (result: any) => {
    const isAccepted = result.winRate >= 60 && 
                      result.maxDrawdown <= 10 && 
                      result.sharpeRatio >= 1.0 &&
                      result.totalTrades >= 10;
    
    return {
      accepted: isAccepted,
      score: Math.min(100, (result.winRate + (100 - result.maxDrawdown) + result.sharpeRatio * 20) / 3)
    };
  };

  return (
    <div className="space-y-6">
      {/* Strategy Selector */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">نتائج الاختبار التاريخي</h3>
          <div className="flex items-center space-x-4">
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="HYBRID">النظام الهجين</option>
              <option value="TREND_FOLLOWING">تتبع الاتجاه</option>
              <option value="MEAN_REVERSION">العودة للمتوسط</option>
              <option value="GRID_DCA">الشبكة + DCA</option>
              <option value="SCALPING">السكالبينج</option>
              <option value="MARKET_MAKING">صناعة السوق</option>
            </select>
            
            <button
              onClick={onRunBacktest}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white rounded-lg font-medium transition-all duration-200"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>إعادة الاختبار</span>
            </button>
          </div>
        </div>
      </div>

      {currentResult && (
        <>
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">إجمالي العائد</span>
                <TrendingUp className={`w-5 h-5 text-${getPerformanceColor(currentResult.totalReturn, 'return')}-400`} />
              </div>
              <p className={`text-2xl font-bold text-${getPerformanceColor(currentResult.totalReturn, 'return')}-400`}>
                {currentResult.totalReturn.toFixed(2)}%
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">معدل النجاح</span>
                <BarChart3 className={`w-5 h-5 text-${getPerformanceColor(currentResult.winRate, 'winRate')}-400`} />
              </div>
              <p className={`text-2xl font-bold text-${getPerformanceColor(currentResult.winRate, 'winRate')}-400`}>
                {currentResult.winRate.toFixed(1)}%
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">أقصى انخفاض</span>
                <TrendingDown className={`w-5 h-5 text-${getPerformanceColor(currentResult.maxDrawdown, 'drawdown')}-400`} />
              </div>
              <p className={`text-2xl font-bold text-${getPerformanceColor(currentResult.maxDrawdown, 'drawdown')}-400`}>
                {currentResult.maxDrawdown.toFixed(2)}%
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">حالة القبول</span>
                {getAcceptanceStatus(currentResult).accepted ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
              </div>
              <p className={`text-2xl font-bold ${
                getAcceptanceStatus(currentResult).accepted ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {getAcceptanceStatus(currentResult).score.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold mb-4">المقاييس التفصيلية</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-md font-medium text-slate-300">إحصائيات الصفقات</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">إجمالي الصفقات:</span>
                    <span className="text-white">{currentResult.totalTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الصفقات الرابحة:</span>
                    <span className="text-emerald-400">{currentResult.winningTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الصفقات الخاسرة:</span>
                    <span className="text-red-400">{currentResult.losingTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">أطول سلسلة أرباح:</span>
                    <span className="text-white">{currentResult.maxConsecutiveWins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">أطول سلسلة خسائر:</span>
                    <span className="text-white">{currentResult.maxConsecutiveLosses}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-md font-medium text-slate-300">المقاييس المالية</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">متوسط الربح:</span>
                    <span className="text-emerald-400">${currentResult.avgWin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">متوسط الخسارة:</span>
                    <span className="text-red-400">${currentResult.avgLoss.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">عامل الربح:</span>
                    <span className="text-white">{currentResult.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">إجمالي الرسوم:</span>
                    <span className="text-yellow-400">${currentResult.totalFees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الربح الصافي:</span>
                    <span className={`${currentResult.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${currentResult.netProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-md font-medium text-slate-300">مقاييس المخاطر</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">نسبة شارب:</span>
                    <span className="text-white">{currentResult.sharpeRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">نسبة كالمار:</span>
                    <span className="text-white">{currentResult.calmarRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">أقصى انخفاض:</span>
                    <span className="text-red-400">{currentResult.maxDrawdown.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Distribution (for hybrid) */}
          {selectedStrategy === 'HYBRID' && results.strategyDistribution && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold mb-4">توزيع استخدام الاستراتيجيات</h3>
              
              <div className="space-y-4">
                {Object.entries(results.strategyDistribution).map(([strategy, percentage]) => {
                  const strategyInfo = {
                    'TREND_FOLLOWING': { name: 'تتبع الاتجاه', color: 'emerald' },
                    'MEAN_REVERSION': { name: 'العودة للمتوسط', color: 'blue' },
                    'GRID_DCA': { name: 'الشبكة + DCA', color: 'purple' },
                    'SCALPING': { name: 'السكالبينج', color: 'yellow' },
                    'MARKET_MAKING': { name: 'صناعة السوق', color: 'indigo' }
                  }[strategy] || { name: strategy, color: 'gray' };

                  return (
                    <div key={strategy} className="flex items-center space-x-3">
                      <div className="w-32 text-slate-300 text-sm">{strategyInfo.name}</div>
                      <div className="flex-1 bg-slate-700 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full bg-${strategyInfo.color}-400`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="w-16 text-white text-sm text-right">{(percentage as number).toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Acceptance Criteria */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold mb-4">معايير القبول</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-md font-medium text-slate-300">المعايير الأساسية</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">معدل النجاح ≥ 60%</span>
                    {currentResult.winRate >= 60 ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">أقصى انخفاض ≤ 10%</span>
                    {currentResult.maxDrawdown <= 10 ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">نسبة شارب ≥ 1.0</span>
                    {currentResult.sharpeRatio >= 1.0 ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">عدد الصفقات ≥ 10</span>
                    {currentResult.totalTrades >= 10 ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-md font-medium text-slate-300">التقييم النهائي</h4>
                <div className={`p-4 rounded-lg border ${
                  getAcceptanceStatus(currentResult).accepted
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-center space-x-3 mb-2">
                    {getAcceptanceStatus(currentResult).accepted ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    )}
                    <span className={`font-medium ${
                      getAcceptanceStatus(currentResult).accepted ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {getAcceptanceStatus(currentResult).accepted ? 'مقبول للتداول التجريبي' : 'يحتاج تحسين'}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    نقاط التقييم: {getAcceptanceStatus(currentResult).score.toFixed(0)}/100
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Trades Sample */}
          {results.trades && results.trades.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">عينة من الصفقات</h3>
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all duration-200">
                  <Download className="w-4 h-4" />
                  <span>تصدير التفاصيل</span>
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">النوع</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">الدخول</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">الخروج</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">الربح</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">النسبة</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">المدة</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">السبب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.trades.slice(0, 10).map((trade: any, index: number) => (
                      <tr key={trade.id} className={`border-b border-slate-700/50 ${index % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.side === 'BUY' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {trade.side}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white">${trade.entryPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-white">${trade.exitPrice.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`font-medium ${trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${trade.profit.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-medium ${trade.profitPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{trade.holdTime}m</td>
                        <td className="py-3 px-4 text-slate-400 text-xs">{trade.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};