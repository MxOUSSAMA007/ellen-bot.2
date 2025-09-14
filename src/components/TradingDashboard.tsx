import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { backendService } from '../services/BackendService';

interface TradingDashboardProps {
  // Add any props you need here
}

export const TradingDashboard: React.FC<TradingDashboardProps> = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState(0);
  const [pnl, setPnl] = useState(0);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<string>('');

  const handleManualTrade = async (action: 'BUY' | 'SELL', symbol: string = 'BTCUSDT', quantity: number = 0.001) => {
    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    setOrderResult('جاري تنفيذ الأمر...');

    try {
      const orderRequest = {
        symbol,
        side: action,
        type: 'MARKET' as const,
        quantity
      };

      const result = await backendService.placeOrder(orderRequest);
      
      if (result.success) {
        setOrderResult(`✅ تم تنفيذ أمر ${action} بنجاح - ${quantity} ${symbol.replace('USDT', '')}`);
        // تحديث الرصيد والـ PnL هنا إذا لزم الأمر
      } else {
        setOrderResult(`❌ فشل في تنفيذ الأمر: ${result.error}`);
      }
    } catch (error) {
      setOrderResult(`❌ خطأ في التنفيذ: ${(error as Error).message}`);
    } finally {
      setIsPlacingOrder(false);
      setTimeout(() => setOrderResult(''), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Trading Dashboard</h1>
          <p className="text-gray-600">Monitor your trading performance and manage strategies</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Connection Status</p>
                <p className={`text-2xl font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
              <Activity className={`h-8 w-8 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Balance</p>
                <p className="text-2xl font-bold text-gray-900">${balance.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">P&L</p>
                <p className={`text-2xl font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${pnl.toFixed(2)}
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Strategies</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={() => handleManualTrade('BUY')}
                disabled={isPlacingOrder}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {isPlacingOrder ? 'جاري التنفيذ...' : 'شراء سريع'}
              </button>
              <button 
                onClick={() => handleManualTrade('SELL')}
                disabled={isPlacingOrder}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                {isPlacingOrder ? 'جاري التنفيذ...' : 'بيع سريع'}
              </button>
              <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                Backtest
              </button>
              
              {orderResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  orderResult.includes('✅') 
                    ? 'bg-green-100 text-green-800'
                    : orderResult.includes('❌')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {orderResult}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="text-gray-500 text-center py-8">
              No recent activity
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingDashboard;