import React, { useState, useEffect } from 'react';
import { TradingDashboard } from './components/TradingDashboard';
import { TradingSettings } from './components/TradingSettings';
import { TradeHistory } from './components/TradeHistory';
import { MarketAnalysis } from './components/MarketAnalysis';
import { StrategyManager } from './components/StrategyManager';
import { Settings, Activity, TrendingUp, BarChart3 } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'لوحة التداول', icon: TrendingUp },
    { id: 'analysis', label: 'تحليل السوق', icon: BarChart3 },
    { id: 'strategies', label: 'الاستراتيجيات', icon: Activity },
    { id: 'history', label: 'سجل الصفقات', icon: Activity },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-8 h-8 text-emerald-400" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  Ellen Trading Bot
                </h1>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isConnected 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {isConnected ? 'متصل بـ Binance' : 'غير متصل'}
              </div>
            </div>
            
            <nav className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <TradingDashboard />}
        {activeTab === 'analysis' && <MarketAnalysis />}
        {activeTab === 'strategies' && <StrategyManager />}
        {activeTab === 'history' && <TradeHistory />}
        {activeTab === 'settings' && <TradingSettings onConnectionChange={setIsConnected} />}
      </main>
    </div>
  );
}

export default App;