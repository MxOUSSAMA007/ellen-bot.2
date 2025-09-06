import React, { useState, useEffect } from 'react';
import { Play, Pause, TrendingUp, TrendingDown, DollarSign, Clock, Target, Zap } from 'lucide-react';
import { BacktestResults } from './BacktestResults';
import { BacktestingService } from '../services/BacktestingService';
import { TestingUtils } from '../utils/TestingUtils';
import { PaperTradingService } from '../services/PaperTradingService';

interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  profit: number;
  status: 'OPEN' | 'CLOSED';
  timestamp: Date;
}

export const TradingDashboard: React.FC = () => {
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [profitTarget, setProfitTarget] = useState(2);
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [paperTradingService] = useState(() => PaperTradingService.getInstance());
  const [accountInfo, setAccountInfo] = useState(paperTradingService.getAccountInfo());
  const [todayProfit, setTodayProfit] = useState(0);
  const [backtestResults, setBacktestResults] = useState<any>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);

  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];

  useEffect(() => {
    const interval = setInterval(() => {
      setAccountInfo(paperTradingService.getAccountInfo());
    }, 2000);
    
    return () => clearInterval(interval);
  }, [paperTradingService]);

  const handleAutoTrade = () => {
    setIsAutoTrading(!isAutoTrading);
  };

  const handleManualTrade = async (side: 'BUY' | 'SELL') => {
    try {
      const marketPrices = paperTradingService.getMarketPrices();
      const marketData = marketPrices[selectedSymbol];
      
      if (!marketData) {
        console.error('Market data not available for', selectedSymbol);
        return;
      }

      const quantity = 0.001;
      const order = await paperTradingService.placeOrder({
        symbol: selectedSymbol,
        side,
        type: 'MARKET',
        quantity
      });

      if (order.status === 'FILLED') {
        const newTrade: Trade = {
          id: order.id,
          symbol: selectedSymbol,
          side,
          quantity: order.executedQuantity || quantity,
          price: order.executedPrice || marketData.currentPrice,
          profit: 0,
          status: 'OPEN',
          timestamp: new Date(order.timestamp)
        };
        
        setActiveTrades([...activeTrades, newTrade]);
      }
    } catch (error) {
      console.error('Failed to place manual trade:', error);
    }
  };

  const runBacktest = async () => {
    setIsBacktesting(true);
    try {
      const historicalData = TestingUtils.generateMockCandleData(1000);
      const backtestService = new BacktestingService({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        initialBalance: 1000,
        feeRate: 0.001,
        slippageRate: 0.0005,
        timeframe: '1h'
      });
      
      const results = await backtestService.runComprehensiveBacktest(historicalData);
      setBacktestResults(results);
    } catch (error) {
      console.error('Backtest failed:', error);
    } finally {
      setIsBacktesting(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">الرصيد الحالي</p>
              <p className="text-2xl font-bold text-white">${accountInfo.totalValue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">ربح اليوم</p>
              <p className={`text-2xl font-bold ${accountInfo.dailyPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${accountInfo.dailyPnL.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">الصفقات النشطة</p>
              <p className="text-2xl font-bold text-white">{activeTrades.length}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">هدف الربح</p>
              <p className="text-2xl font-bold text-white">{profitTarget}%</p>
            </div>
            <Target className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Trading Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Auto Trading Panel */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Zap className="w-5 h-5 text-yellow-400 mr-2" />
            التداول التلقائي
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                العملة المختارة
              </label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {symbols.map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                هدف الربح (%)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={profitTarget}
                onChange={(e) => setProfitTarget(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1%</span>
                <span className="text-emerald-400 font-medium">{profitTarget}%</span>
                <span>10%</span>
              </div>
            </div>

            <button
              onClick={handleAutoTrade}
              className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                isAutoTrading
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isAutoTrading ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isAutoTrading ? 'إيقاف التداول التلقائي' : 'بدء التداول التلقائي'}</span>
            </button>
          </div>
        </div>

        {/* Manual Trading Panel */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold mb-4">التداول اليدوي</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleManualTrade('BUY')}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                <TrendingUp className="w-5 h-5" />
                <span>شراء</span>
              </button>
              
              <button
                onClick={() => handleManualTrade('SELL')}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                <TrendingDown className="w-5 h-5" />
                <span>بيع</span>
              </button>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2">معلومات السوق</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">السعر الحالي:</span>
                  <span className="text-white">
                    ${paperTradingService.getMarketPrices()[selectedSymbol]?.currentPrice.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">التغيير 24س:</span>
                  <span className="text-emerald-400">+2.45%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الحجم:</span>
                  <span className="text-white">
                    {((paperTradingService.getMarketPrices()[selectedSymbol]?.volume24h || 0) / 1000000000).toFixed(1)}B
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Trades */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold mb-4">الصفقات النشطة</h3>
        
        {activeTrades.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            لا توجد صفقات نشطة حالياً
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300">العملة</th>
                  <th className="text-left py-3 px-4 text-slate-300">النوع</th>
                  <th className="text-left py-3 px-4 text-slate-300">الكمية</th>
                  <th className="text-left py-3 px-4 text-slate-300">السعر</th>
                  <th className="text-left py-3 px-4 text-slate-300">الربح/الخسارة</th>
                  <th className="text-left py-3 px-4 text-slate-300">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {activeTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-slate-700/50">
                    <td className="py-3 px-4 text-white font-medium">{trade.symbol}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.side === 'BUY' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white">{trade.quantity}</td>
                    <td className="py-3 px-4 text-white">${trade.price.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`${trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${trade.profit.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {trade.timestamp.toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Backtest Results */}
      <BacktestResults 
        results={backtestResults}
        onRunBacktest={runBacktest}
        isLoading={isBacktesting}
      />
    </div>
  );
};