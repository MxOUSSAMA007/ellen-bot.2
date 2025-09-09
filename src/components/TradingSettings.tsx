import React, { useState } from 'react';
import { Key, Shield, Zap, AlertTriangle, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { backendService } from '../services/BackendService';

interface TradingSettingsProps {
  onConnectionChange: (connected: boolean) => void;
}

export const TradingSettings: React.FC<TradingSettingsProps> = ({ onConnectionChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [riskSettings, setRiskSettings] = useState({
    maxDailyLoss: 100,
    maxPositionSize: 10,
    stopLoss: 5,
    takeProfit: 10
  });

  const handleConnect = async () => {
    if (!apiKey || !secretKey) {
      setValidationMessage('يرجى إدخال API Key و Secret Key');
      return;
    }

    setIsValidating(true);
    setValidationMessage('جاري التحقق من صحة المفاتيح...');

    try {
      // إرسال المفاتيح إلى الخادم الخلفي للتحقق والتخزين الآمن
      const result = await backendService.setBinanceApiKeys({
        apiKey: apiKey.trim(),
        secretKey: secretKey.trim(),
        testnet: true // استخدام testnet للتحقق أولاً
      });

      if (result.success) {
        // مسح المفاتيح من الواجهة الأمامية فوراً
        setApiKey('');
        setSecretKey('');
        
        setIsConnected(true);
        onConnectionChange(true);
        setValidationMessage('تم التحقق من المفاتيح بنجاح وحفظها بشكل آمن');
        
        // مسح رسالة النجاح بعد 3 ثواني
        setTimeout(() => setValidationMessage(''), 3000);
      } else {
        setValidationMessage(`فشل في التحقق: ${result.error}`);
        setIsConnected(false);
        onConnectionChange(false);
      }
    } catch (error) {
      console.error('API key validation failed:', error);
      setValidationMessage('خطأ في الاتصال بالخادم');
      setIsConnected(false);
      onConnectionChange(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDisconnect = () => {
    // مسح المفاتيح من الخادم
    backendService.clearBinanceApiKeys().catch(console.error);
    
    setIsConnected(false);
    onConnectionChange(false);
    setValidationMessage('تم قطع الاتصال ومسح المفاتيح');
    
    // مسح أي مفاتيح متبقية في الواجهة
    setApiKey('');
    setSecretKey('');
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
              API Key *
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="أدخل API Key الخاص بك (سيتم إرساله للخادم الآمن)"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isValidating}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Secret Key *
            </label>
            <div className="relative">
              <input
                type={showSecretKey ? "text" : "password"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="أدخل Secret Key الخاص بك (سيتم تشفيره)"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isValidating}
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Validation Message */}
          {validationMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              validationMessage.includes('نجاح') 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : validationMessage.includes('جاري')
                ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center space-x-2">
                {validationMessage.includes('جاري') && (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{validationMessage}</span>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={!apiKey || !secretKey || isValidating}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200"
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري التحقق...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>تحقق وحفظ آمن</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                disabled={isValidating}
                className="flex items-center space-x-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>قطع الاتصال ومسح المفاتيح</span>
              </button>
            )}
            
            {isConnected && (
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">متصل بنجاح - المفاتيح محفوظة بأمان</span>
              </div>
            )}
          </div>
          
          {/* Security Notice */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-blue-400 font-medium">الأمان المحسن</h4>
                <ul className="text-blue-200/80 text-sm mt-1 space-y-1">
                  <li>• المفاتيح يتم إرسالها مباشرة للخادم الآمن عبر HTTPS</li>
                  <li>• لا يتم حفظ المفاتيح في الواجهة الأمامية أو localStorage</li>
                  <li>• يتم تشفير المفاتيح في الخادم باستخدام AES-256</li>
                  <li>• التحقق من صحة المفاتيح قبل القبول</li>
                </ul>
              </div>
            </div>
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