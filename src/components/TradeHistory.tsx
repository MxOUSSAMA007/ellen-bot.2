import React, { useState } from 'react';
import { Calendar, Filter, Download, TrendingUp, TrendingDown } from 'lucide-react';

interface HistoricalTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  profit: number;
  profitPercent: number;
  duration: string;
  timestamp: Date;
  strategy: string;
}

export const TradeHistory: React.FC = () => {
  const [trades] = useState<HistoricalTrade[]>([
    {
      id: '1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: 0.001,
      entryPrice: 42800,
      exitPrice: 43950,
      profit: 1.15,
      profitPercent: 2.69,
      duration: '2h 15m',
      timestamp: new Date('2024-01-15T10:30:00'),
      strategy: 'Scalping'
    },
    {
      id: '2',
      symbol: 'ETHUSDT',
      side: 'BUY',
      quantity: 0.1,
      entryPrice: 2580,
      exitPrice: 2545,
      profit: -3.50,
      profitPercent: -1.36,
      duration: '45m',
      timestamp: new Date('2024-01-15T08:15:00'),
      strategy: 'Auto'
    },
    {
      id: '3',
      symbol: 'BNBUSDT',
      side: 'BUY',
      quantity: 0.5,
      entryPrice: 310,
      exitPrice: 318.5,
      profit: 4.25,
      profitPercent: 2.74,
      duration: '1h 30m',
      timestamp: new Date('2024-01-14T16:45:00'),
      strategy: 'Manual'
    }
  ]);

  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');

  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const winningTrades = trades.filter(trade => trade.profit > 0).length;
  const winRate = (winningTrades / trades.length) * 100;

  const filteredTrades = trades.filter(trade => {
    if (filter === 'winning') return trade.profit > 0;
    if (filter === 'losing') return trade.profit < 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">إجمالي الصفقات</p>
              <p className="text-2xl font-bold text-white">{trades.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">إجمالي الربح</p>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${totalProfit.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">معدل النجاح</p>
              <p className="text-2xl font-bold text-white">{winRate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">الصفقات الرابحة</p>
              <p className="text-2xl font-bold text-emerald-400">{winningTrades}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 text-sm">تصفية:</span>
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">جميع الصفقات</option>
              <option value="winning">الصفقات الرابحة</option>
              <option value="losing">الصفقات الخاسرة</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">اليوم</option>
              <option value="week">هذا الأسبوع</option>
              <option value="month">هذا الشهر</option>
              <option value="all">جميع الأوقات</option>
            </select>
          </div>

          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all duration-200">
            <Download className="w-4 h-4" />
            <span>تصدير</span>
          </button>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">العملة</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">النوع</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">الكمية</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">سعر الدخول</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">سعر الخروج</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">الربح/الخسارة</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">النسبة</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">المدة</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">الاستراتيجية</th>
                <th className="text-left py-4 px-6 text-slate-300 font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade, index) => (
                <tr key={trade.id} className={`border-b border-slate-700/50 ${index % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                  <td className="py-4 px-6 text-white font-medium">{trade.symbol}</td>
                  <td className="py-4 px-6">
                    <span className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
                      trade.side === 'BUY' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.side === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{trade.side}</span>
                    </span>
                  </td>
                  <td className="py-4 px-6 text-white">{trade.quantity}</td>
                  <td className="py-4 px-6 text-white">${trade.entryPrice.toFixed(2)}</td>
                  <td className="py-4 px-6 text-white">${trade.exitPrice.toFixed(2)}</td>
                  <td className="py-4 px-6">
                    <span className={`font-medium ${trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${trade.profit.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`font-medium ${trade.profitPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-300">{trade.duration}</td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                      {trade.strategy}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-400">
                    {trade.timestamp.toLocaleDateString('ar-SA')}
                    <br />
                    <span className="text-xs">{trade.timestamp.toLocaleTimeString('ar-SA')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};