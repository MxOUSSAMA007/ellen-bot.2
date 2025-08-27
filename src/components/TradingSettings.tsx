import React, { useState } from 'react';
import { Key, Shield, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface TradingSettingsProps {
  onConnectionChange: (connected: boolean) => void;
}

export const TradingSettings: React.FC<TradingSettingsProps> = ({ onConnectionChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [riskSettings, setRiskSettings] = useState({
    maxDailyLoss: 100,
    maxPositionSize: 10,
    stopLoss: 5,
    takeProfit: 10
  });

  const handleConnect = () => {
    if (apiKey && secretKey) {
      setIsConnected(true);
      onConnectionChange(true);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    onConnectionChange(false);
  };

  return (
    <div className="space-y-6">
      {/* Binance API Settings */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Key className="w-5 h-5 text-blue-400 mr-2" />
          إعدادات Binance API
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="أدخل API Key الخاص بك"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Secret Key
            </label>
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="أدخل Secret Key الخاص بك"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={!apiKey || !secretKey}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200"
              >
                <CheckCircle className="w-4 h-4" />
                <span>اتصال</span>
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="flex items-center space-x-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>قطع الاتصال</span>
              </button>
            )}
            
            {isConnected && (
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">متصل بنجاح</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DRY_RUN Toggle */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 text-green-400 mr-2" />
          وضع التداول
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">وضع المحاكاة (Paper Trading)</h4>
              <p className="text-slate-400 text-sm">
                {isDryRun 
                  ? 'آمن - لا يتم تنفيذ صفقات حقيقية' 
                  : '⚠️ تحذير - يتم تنفيذ صفقات حقيقية!'
                }
              </p>
            </div>
            <button
              onClick={() => setIsDryRun(!isDryRun)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isDryRun ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDryRun ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {!isDryRun && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h4 className="text-red-400 font-medium">تحذير: التداول الحقيقي مفعل</h4>
                  <p className="text-red-200/80 text-sm mt-1">
                    سيتم استخدام أموال حقيقية. تأكد من إعداداتك قبل المتابعة.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Risk Management */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 text-red-400 mr-2" />
          إدارة المخاطر
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              الحد الأقصى للخسارة اليومية ($)
            </label>
            <input
              type="number"
              value={riskSettings.maxDailyLoss}
              onChange={(e) => setRiskSettings({...riskSettings, maxDailyLoss: Number(e.target.value)})}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              الحد الأقصى لحجم الصفقة (%)
            </label>
            <input
              type="number"
              value={riskSettings.maxPositionSize}
              onChange={(e) => setRiskSettings({...riskSettings, maxPositionSize: Number(e.target.value)})}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              وقف الخسارة (%)
            </label>
            <input
              type="number"
              value={riskSettings.stopLoss}
              onChange={(e) => setRiskSettings({...riskSettings, stopLoss: Number(e.target.value)})}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              جني الأرباح (%)
            </label>
            <input
              type="number"
              value={riskSettings.takeProfit}
              onChange={(e) => setRiskSettings({...riskSettings, takeProfit: Number(e.target.value)})}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Trading Speed Settings */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap className="w-5 h-5 text-yellow-400 mr-2" />
          إعدادات السرعة
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              سرعة التحليل (مللي ثانية)
            </label>
            <select className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent">
              <option value="100">سريع جداً (100ms)</option>
              <option value="500">سريع (500ms)</option>
              <option value="1000">متوسط (1s)</option>
              <option value="5000">بطيء (5s)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              نوع التداول
            </label>
            <select className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent">
              <option value="scalping">سكالبينج (صفقات سريعة)</option>
              <option value="day">تداول يومي</option>
              <option value="swing">تداول متأرجح</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Warning */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <h4 className="text-amber-400 font-medium">تحذير أمني</h4>
            <p className="text-amber-200/80 text-sm mt-1">
              تأكد من أن API Keys الخاصة بك لديها صلاحيات التداول فقط ولا تشاركها مع أي شخص آخر.
              يُنصح بتفعيل المصادقة الثنائية على حساب Binance الخاص بك.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};