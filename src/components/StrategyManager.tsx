import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Grid3X3, 
  Zap, 
  Target, 
  Brain,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
import { HybridTradingManager, HybridSignal, MarketCondition } from '../strategies/HybridManager';
import { TestingUtils } from '../utils/TestingUtils';
import { BacktestResults } from './BacktestResults';
import { BacktestingService } from '../services/BacktestingService';

export const StrategyManager: React.FC = () => {
  const [hybridManager] = useState(() => new HybridTradingManager());
  const [isRunning, setIsRunning] = useState(false);
  const [currentSignal, setCurrentSignal] = useState<HybridSignal | null>(null);
  const [marketCondition, setMarketCondition] = useState<MarketCondition | null>(null);
  const [backtestResults, setBacktestResults] = useState<any>(null);
  const [riskManagement, setRiskManagement] = useState(hybridManager.getRiskManagement());

  const strategies = [
    { 
      id: 'TREND_FOLLOWING', 
      name: 'تتبع الاتجاه', 
      icon: TrendingUp, 
      color: 'emerald',
      description: 'يتبع الاتجاهات القوية باستخدام EMA و MACD'
    },
    { 
      id: 'MEAN_REVERSION', 
      name: 'العودة للمتوسط', 
      icon: BarChart3, 
      color: 'blue',
      description: 'يستغل التشبع الشرائي والبيعي'
    },
    { 
      id: 'GRID_DCA', 
      name: 'الشبكة + DCA', 
      icon: Grid3X3, 
      color: 'purple',
      description: 'شبكة تداول مع متوسط التكلفة'
    },
    { 
      id: 'SCALPING', 
      name: 'السكالبينج', 
      icon: Zap, 
      color: 'yellow',
      description: 'صفقات سريعة بأرباح صغيرة'
    },
    { 
      id: 'MARKET_MAKING', 
      name: 'صناعة السوق', 
      icon: Target, 
      color: 'indigo',
      description: 'توفير السيولة والربح من السبريد'
    }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        // محاكاة بيانات السوق
        const mockCandles = TestingUtils.generateMockCandleData(200);
        const mockOrderBook = {
          bid: 43000,
          ask: 43010,
          bidSize: 10,
          askSize: 10
        };

        const signal = hybridManager.analyze(mockCandles, mockOrderBook);
        setCurrentSignal(signal);
        setMarketCondition(signal.marketCondition);
        setRiskManagement(hybridManager.getRiskManagement());
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, hybridManager]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    setCurrentSignal(null);
  };

  const runBacktest = async () => {
    const historicalData = TestingUtils.generateMockCandleData(1000);
    const results = hybridManager.backtest(historicalData, {
      initialBalance: 10000,
      commission: 0.001,
      slippage: 0.0005
    });
    setBacktestResults(results);
  };

  const getStrategyColor = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    return strategy?.color || 'gray';
  };

  const getMarketConditionColor = (regime: string) => {
    switch (regime) {
      case 'TRENDING': return 'emerald';
      case 'RANGING': return 'blue';
      case 'VOLATILE': return 'yellow';
      case 'ILLIQUID': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center">
            <Brain className="w-5 h-5 text-purple-400 mr-2" />
            مدير الاستراتيجيات الهجين
          </h3>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={runBacktest}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200"
            >
              <BarChart3 className="w-4 h-4" />
              <span>اختبار تاريخي</span>
            </button>
            
            <button
              onClick={isRunning ? handleStop : handleStart}
              className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                isRunning
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? 'إيقاف' : 'تشغيل'}</span>
            </button>
          </div>
        </div>

        {/* Current Strategy & Market Condition */}
        {currentSignal && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h4 className="text-md font-medium text-slate-300 mb-3">الاستراتيجية النشطة</h4>
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full bg-${getStrategyColor(currentSignal.strategy)}-400`}></div>
                <span className="text-white font-medium">
                  {strategies.find(s => s.id === currentSignal.strategy)?.name}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium bg-${getStrategyColor(currentSignal.strategy)}-500/20 text-${getStrategyColor(currentSignal.strategy)}-400`}>
                  {currentSignal.confidence.toFixed(0)}% ثقة
                </span>
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-4">
              <h4 className="text-md font-medium text-slate-300 mb-3">حالة السوق</h4>
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full bg-${getMarketConditionColor(marketCondition?.regime || '')}-400`}></div>
                <span className="text-white font-medium">{marketCondition?.regime}</span>
                <span className="text-slate-400 text-sm">
                  تقلبات: {((marketCondition?.volatility || 0) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map((strategy) => {
          const Icon = strategy.icon;
          const isActive = currentSignal?.strategy === strategy.id;
          
          return (
            <div 
              key={strategy.id}
              className={`bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border transition-all duration-200 ${
                isActive 
                  ? `border-${strategy.color}-500/50 bg-${strategy.color}-500/5` 
                  : 'border-slate-700/50 hover:border-slate-600/50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Icon className={`w-6 h-6 text-${strategy.color}-400`} />
                  <h4 className="text-white font-medium">{strategy.name}</h4>
                </div>
                {isActive && (
                  <div className="flex items-center space-x-1">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-xs font-medium">نشط</span>
                  </div>
                )}
              </div>
              
              <p className="text-slate-400 text-sm mb-4">{strategy.description}</p>
              
              {backtestResults && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">الاستخدام:</span>
                    <span className="text-white">
                      {backtestResults.strategyDistribution[strategy.id]?.toFixed(1) || 0}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Signal Details */}
      {currentSignal && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold mb-4">تفاصيل الإشارة الحالية</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-slate-300 mb-3">معلومات الصفقة</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">الإجراء:</span>
                  <span className={`font-medium px-2 py-1 rounded text-sm ${
                    currentSignal.action === 'BUY' 
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : currentSignal.action === 'SELL'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {currentSignal.action}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">سعر الدخول:</span>
                  <span className="text-white">${currentSignal.entryPrice.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">وقف الخسارة:</span>
                  <span className="text-red-400">${currentSignal.stopLoss.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">جني الأرباح:</span>
                  <span className="text-emerald-400">${currentSignal.takeProfit.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">الكمية:</span>
                  <span className="text-white">{currentSignal.quantity.toFixed(6)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-slate-300 mb-3">أسباب الإشارة</h4>
              <div className="space-y-2">
                {currentSignal.reasons.map((reason, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Management Status */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
          حالة إدارة المخاطر
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Drawdown الحالي</span>
              <span className={`text-sm font-medium ${
                riskManagement.currentDrawdown < 5 ? 'text-emerald-400' :
                riskManagement.currentDrawdown < 8 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {riskManagement.currentDrawdown.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  riskManagement.currentDrawdown < 5 ? 'bg-emerald-400' :
                  riskManagement.currentDrawdown < 8 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${(riskManagement.currentDrawdown / riskManagement.maxDrawdown) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">خسائر اليوم</span>
              <span className={`text-sm font-medium ${
                riskManagement.dailyLoss < 50 ? 'text-emerald-400' :
                riskManagement.dailyLoss < 80 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                ${riskManagement.dailyLoss.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-slate-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  riskManagement.dailyLoss < 50 ? 'bg-emerald-400' :
                  riskManagement.dailyLoss < 80 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${(riskManagement.dailyLoss / riskManagement.maxDailyLoss) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">حجم المركز</span>
              <span className="text-white text-sm font-medium">
                {riskManagement.positionSize.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-600 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-blue-400"
                style={{ width: `${(riskManagement.positionSize / riskManagement.maxPositionSize) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">حالة النظام</span>
              <div className="flex items-center space-x-1">
                {riskManagement.shouldStop ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm font-medium">متوقف</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">نشط</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backtest Results */}
      <BacktestResults 
        results={backtestResults}
        onRunBacktest={runBacktest}
        isLoading={false}
      />

      {/* Live Signals Log */}
      {isRunning && currentSignal && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold mb-4">سجل الإشارات المباشر</h3>
          
          <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm">
            <div className="text-emerald-400 mb-2">
              [{new Date().toLocaleTimeString()}] {currentSignal.strategy} - {currentSignal.action}
            </div>
            <div className="text-slate-300 space-y-1">
              <div>السعر: ${currentSignal.entryPrice.toFixed(2)}</div>
              <div>الثقة: {currentSignal.confidence.toFixed(0)}%</div>
              <div>المخاطرة: {currentSignal.riskLevel}</div>
              <div className="text-blue-400">الأسباب:</div>
              {currentSignal.reasons.map((reason, index) => (
                <div key={index} className="text-slate-400 ml-4">- {reason}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};