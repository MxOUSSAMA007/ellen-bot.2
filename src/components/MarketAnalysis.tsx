import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Target, Brain, Zap } from 'lucide-react';
import { PaperTradingService } from '../services/PaperTradingService';

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  analysis: string;
  bid: number;
  ask: number;
  spread: number;
}

export const MarketAnalysis: React.FC = () => {
  const [paperTradingService] = useState(() => PaperTradingService.getInstance());
  const [marketData, setMarketData] = useState<MarketData[]>([
    {
      symbol: 'BTCUSDT',
      price: 43250.00,
      change24h: 2.45,
      volume: 1200000000,
      signal: 'BUY',
      confidence: 85,
      analysis: 'اتجاه صاعد قوي مع كسر مستوى المقاومة',
      bid: 43240.00,
      ask: 43260.00,
      spread: 0.046
    },
    {
      symbol: 'ETHUSDT',
      price: 2650.00,
      change24h: -1.23,
      volume: 800000000,
      signal: 'HOLD',
      confidence: 65,
      analysis: 'تذبذب جانبي، انتظار كسر المستوى',
      bid: 2649.50,
      ask: 2650.50,
      spread: 0.038
    },
    {
      symbol: 'BNBUSDT',
      price: 315.50,
      change24h: 3.78,
      volume: 150000000,
      signal: 'BUY',
      confidence: 78,
      analysis: 'زخم إيجابي مع زيادة في الحجم',
      bid: 315.30,
      ask: 315.70,
      spread: 0.127
    }
  ]);

  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [analysisSpeed, setAnalysisSpeed] = useState('fast');

  useEffect(() => {
    // تحديث بيانات السوق من الخدمة
    const updateMarketData = () => {
      const realMarketData = paperTradingService.getMarketPrices();
      
      setMarketData(prevData => 
        prevData.map(item => {
          const realData = realMarketData[item.symbol];
          if (realData) {
            return {
              ...item,
              price: realData.currentPrice,
              bid: realData.bid,
              ask: realData.ask,
              spread: realData.spread,
              volume: realData.volume24h
            };
          }
          return item;
        })
      );
    };

    updateMarketData();
    const interval = setInterval(updateMarketData, 5000);
    
    return () => clearInterval(interval);
  }, [paperTradingService]);

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      case 'SELL': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'HOLD': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY': return <TrendingUp className="w-4 h-4" />;
      case 'SELL': return <TrendingDown className="w-4 h-4" />;
      case 'HOLD': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Brain className="w-5 h-5 text-purple-400 mr-2" />
          إعدادات التحليل الذكي
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              العملة للتحليل
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {marketData.map(item => (
                <option key={item.symbol} value={item.symbol}>{item.symbol}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              سرعة التحليل
            </label>
            <select
              value={analysisSpeed}
              onChange={(e) => setAnalysisSpeed(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="ultra">فائق السرعة (100ms)</option>
              <option value="fast">سريع (500ms)</option>
              <option value="normal">عادي (1s)</option>
              <option value="detailed">مفصل (5s)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-all duration-200">
              <Zap className="w-4 h-4" />
              <span>تحليل فوري</span>
            </button>
          </div>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {marketData.map((item) => (
          <div key={item.symbol} className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">{item.symbol}</h4>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getSignalColor(item.signal)}`}>
                {getSignalIcon(item.signal)}
                <span>{item.signal}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">السعر:</span>
                <span className="text-white font-medium">${item.price.toLocaleString()}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">التغيير 24س:</span>
                <span className={`font-medium ${item.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {item.change24h >= 0 ? '+' : ''}{item.change24h}%
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">الحجم:</span>
                <span className="text-white">${(item.volume / 1000000).toFixed(0)}M</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">أفضل عرض:</span>
                <span className="text-emerald-400">${item.bid.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">أفضل طلب:</span>
                <span className="text-red-400">${item.ask.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">السبريد:</span>
                <span className="text-yellow-400">{item.spread.toFixed(3)}%</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">الثقة:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.confidence >= 70 ? 'bg-emerald-400' : item.confidence >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${item.confidence}%` }}
                    ></div>
                  </div>
                  <span className="text-white text-sm">{item.confidence}%</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
                <p className="text-sm text-slate-300">{item.analysis}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Analysis */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Target className="w-5 h-5 text-blue-400 mr-2" />
          التحليل المفصل - {selectedSymbol}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Technical Indicators */}
          <div>
            <h4 className="text-md font-medium text-slate-300 mb-3">المؤشرات الفنية</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">RSI (14):</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white">65.4</span>
                  <span className="text-yellow-400 text-xs">محايد</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">MACD:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white">+125.6</span>
                  <span className="text-emerald-400 text-xs">إيجابي</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Bollinger Bands:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white">وسط</span>
                  <span className="text-blue-400 text-xs">مستقر</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Volume:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white">عالي</span>
                  <span className="text-emerald-400 text-xs">قوي</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div>
            <h4 className="text-md font-medium text-slate-300 mb-3">تحليل الذكاء الاصطناعي</h4>
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-emerald-400 text-sm font-medium">إشارة شراء قوية</span>
                </div>
                <p className="text-slate-300 text-xs">
                  النموذج يتوقع ارتفاع بنسبة 3-5% خلال الساعات القادمة بناءً على تحليل الأنماط التاريخية
                </p>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-blue-400 text-sm font-medium">مستويات الدعم والمقاومة</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>مقاومة: $44,200</div>
                  <div>دعم: $42,800</div>
                </div>
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-purple-400 text-sm font-medium">توصية التداول</span>
                </div>
                <p className="text-slate-300 text-xs">
                  دخول عند $43,100 - هدف $44,500 - وقف خسارة $42,700
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};