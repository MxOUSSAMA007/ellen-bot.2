# Ellen Trading Bot 🚀

## نظرة عامة

Ellen Trading Bot هو بوت تداول ذكي ومتطور للعملات المشفرة يستخدم الذكاء الاصطناعي والتحليل الفني المتقدم لتنفيذ صفقات سريعة ومربحة على منصة Binance. تم تصميم البوت بأعلى معايير الأمان والموثوقية.

## ✨ الميزات الرئيسية

### 🤖 التداول الذكي
- **6 استراتيجيات متقدمة**: Trend Following, Mean Reversion, Grid+DCA, Scalping, Market Making, Hybrid Manager
- **تحليل فني شامل**: RSI, MACD, Bollinger Bands, EMA, SMA, Stochastic
- **سرعة فائقة**: تحليل وتنفيذ في 100ms - 5s
- **إدارة مخاطر ذكية**: وقف خسارة تلقائي وجني أرباح

### 🛡️ الأمان والحماية
- **Paper Trading**: اختبار آمن بدون مخاطر مالية
- **فصل كامل**: الواجهة لا تحتوي على مفاتيح API
- **تشفير شامل**: جميع الاتصالات مشفرة ومؤمنة
- **تسجيل مراجعة**: تتبع كامل لجميع العمليات

### 🔄 الموثوقية
- **Retry Logic**: إعادة محاولة ذكية مع Exponential Backoff
- **Rate Limit Handling**: معالجة متقدمة لحدود المعدل
- **Circuit Breaker**: حماية من الأخطاء المتكررة
- **Health Monitoring**: مراقبة مستمرة لصحة النظام

## 🚀 البدء السريع

### المتطلبات الأساسية
- Node.js 18+ 
- npm أو yarn
- حساب Binance (للتداول الحقيقي فقط)

### التثبيت والتشغيل

```bash
# 1. استنساخ المشروع
git clone https://github.com/your-username/ellen-trading-bot.git
cd ellen-trading-bot

# 2. تثبيت التبعيات
npm install
cd server && npm install && cd ..

# 3. إعداد البيئة
cp .env.example .env

# 4. تشغيل البوت (وضع آمن)
npm run full-dev

# 5. فتح المتصفح
# http://localhost:5173
```

## 🧪 أوضاع التشغيل

### 1. Paper Trading (الافتراضي - آمن 100%)

```env
# في ملف .env
VITE_DRY_RUN=true
```

**المميزات:**
- ✅ لا يتم تنفيذ صفقات حقيقية
- ✅ محاكاة واقعية للأسعار والرسوم
- ✅ رصيد افتراضي $10,000
- ✅ تسجيل كامل للعمليات
- ✅ اختبار جميع الاستراتيجيات بأمان

### 2. Testnet (للاختبار المتقدم)

```env
# في ملف .env
VITE_DRY_RUN=false
BINANCE_BASE_URL=https://testnet.binance.vision/api
BINANCE_API_KEY=your_testnet_api_key
BINANCE_SECRET_KEY=your_testnet_secret_key
```

**للحصول على مفاتيح Testnet:**
1. اذهب إلى [Binance Testnet](https://testnet.binance.vision/)
2. سجل الدخول بحساب Binance
3. أنشئ API Keys للاختبار

### 3. Live Trading (⚠️ خطر - أموال حقيقية!)

```env
# في ملف .env
VITE_DRY_RUN=false
BINANCE_BASE_URL=https://api.binance.com/api
BINANCE_API_KEY=your_live_api_key
BINANCE_SECRET_KEY=your_live_secret_key
```

**⚠️ تحذير:** هذا الوضع يستخدم أموال حقيقية!

## 📊 الاستراتيجيات المدعومة

### 1. Trend Following - تتبع الاتجاه
- **الوصف**: يتبع الاتجاهات القوية باستخدام EMA و MACD
- **الأسواق المناسبة**: الأسواق ذات الاتجاه الواضح
- **معدل النجاح المتوقع**: 65%
- **المخاطر**: متوسطة

### 2. Mean Reversion - العودة للمتوسط
- **الوصف**: يستغل التشبع الشرائي والبيعي
- **المؤشرات**: RSI, Bollinger Bands
- **معدل النجاح المتوقع**: 72%
- **المخاطر**: منخفضة

### 3. Grid + DCA - الشبكة مع متوسط التكلفة
- **الوصف**: شبكة تداول مع متوسط التكلفة
- **الأسواق المناسبة**: الأسواق المتذبذبة
- **معدل النجاح المتوقع**: 45% (أرباح أكبر)
- **المخاطر**: عالية

### 4. Scalping - السكالبينج
- **الوصف**: صفقات سريعة بأرباح صغيرة (0.2-0.5%)
- **السرعة**: تنفيذ في أقل من ثانية
- **معدل النجاح المتوقع**: 58%
- **المخاطر**: متوسطة

### 5. Market Making - صناعة السوق
- **الوصف**: توفير السيولة والربح من السبريد
- **المتطلبات**: سيولة عالية
- **معدل النجاح المتوقع**: 85% (أرباح صغيرة)
- **المخاطر**: منخفضة

### 6. Hybrid Manager - المدير الهجين
- **الوصف**: يختار الاستراتيجية المناسبة تلقائياً
- **الذكاء**: يحلل حالة السوق ويتكيف معها
- **الميزة**: يجمع بين جميع الاستراتيجيات
- **معدل النجاح المتوقع**: 70%+

## 🧪 اختبار الاستراتيجيات

### الخطوات:

```bash
# 1. تأكد من تفعيل Paper Trading
echo "VITE_DRY_RUN=true" >> .env

# 2. شغّل البوت
npm run full-dev

# 3. في الواجهة:
# - اذهب إلى تبويب "الاستراتيجيات"
# - اختر الاستراتيجية المطلوبة
# - اضغط "اختبار تاريخي"
# - راقب النتائج في "السجلات"
```

### معايير القبول:
- **معدل النجاح**: ≥ 60%
- **أقصى انخفاض**: ≤ 10%
- **نسبة شارب**: ≥ 1.0
- **عدد الصفقات**: ≥ 10

## 🔧 أوامر التشغيل

### التطوير
```bash
# تشغيل الواجهة فقط
npm run dev

# تشغيل الخادم الخلفي فقط
npm run server

# تشغيل الواجهة والخادم معاً (مُوصى به)
npm run full-dev

# تشغيل الاختبارات
npm run test

# تشغيل الاختبارات مع واجهة مرئية
npm run test:ui

# فحص الكود
npm run lint
```

### الإنتاج
```bash
# بناء المشروع
npm run build

# تشغيل الخادم للإنتاج
npm run server:start

# معاينة البناء
npm run preview
```

## 🧪 الاختبارات

Ellen Bot يتضمن مجموعة شاملة من الاختبارات:

### تشغيل الاختبارات:
```bash
# جميع الاختبارات
npm run test

# اختبارات محددة
npm run test -- --grep "RSI"

# اختبارات مع تغطية
npm run test -- --coverage

# مراقبة الاختبارات
npm run test -- --watch
```

### أنواع الاختبارات:

#### 1. اختبارات المؤشرات الفنية
- ✅ حساب RSI للبيانات العادية والحدية
- ✅ حساب MACD مع التحقق من الدقة
- ✅ Bollinger Bands مع التحقق من العلاقات
- ✅ Moving Averages (SMA & EMA)

#### 2. اختبارات منطق القرارات
- ✅ إشارة شراء عند EMA12 > EMA26
- ✅ إشارة بيع عند EMA12 < EMA26
- ✅ تأكيد متعدد المؤشرات
- ✅ إدارة المخاطر في القرارات

#### 3. اختبارات الأداء
- ✅ سرعة حساب المؤشرات (< 100ms لـ 1000 شمعة)
- ✅ معالجة البيانات الكبيرة
- ✅ التحليل المتزامن
- ✅ استهلاك الذاكرة

#### 4. اختبارات التكامل
- ✅ التكامل مع TestingUtils
- ✅ بيانات واقعية متنوعة
- ✅ الاتساق في النتائج
- ✅ معالجة الحالات الحدية

### مثال على تشغيل اختبار محدد:
```bash
# اختبار RSI فقط
npm run test -- --grep "RSI Calculation"

# اختبار منطق القرارات
npm run test -- --grep "Decision Logic"

# اختبار الأداء
npm run test -- --grep "Performance"
```

## 🔄 نظام إعادة المحاولة

### الميزات:
- **Exponential Backoff**: زيادة تدريجية في وقت الانتظار
- **Jitter**: إضافة عشوائية لتجنب التحميل المتزامن  
- **Rate Limit Handling**: معالجة ذكية لحدود المعدل
- **Smart Error Detection**: تجنب إعادة المحاولة للأخطاء غير القابلة للإصلاح

### الإعدادات:
```typescript
{
  maxAttempts: 3,        // أقصى 3 محاولات
  baseDelay: 1000,       // تأخير أساسي 1 ثانية
  maxDelay: 30000,       // أقصى تأخير 30 ثانية
  backoffMultiplier: 2,  // مضاعف التأخير
  jitterRange: 0.1       // نطاق العشوائية ±10%
}
```

## 📁 هيكل المشروع

```
ellen-trading-bot/
├── 📁 src/                          # الواجهة الأمامية (React + TypeScript)
│   ├── 📁 components/               # مكونات React
│   │   ├── TradingDashboard.tsx     # لوحة التداول الرئيسية
│   │   ├── StrategyManager.tsx      # إدارة الاستراتيجيات
│   │   ├── TradeHistory.tsx         # سجل الصفقات
│   │   ├── MarketAnalysis.tsx       # تحليل السوق
│   │   ├── LogsViewer.tsx           # عارض السجلات
│   │   └── TradingSettings.tsx      # إعدادات التداول
│   ├── 📁 services/                 # خدمات الاتصال والتسجيل
│   │   ├── RetryService.ts          # ⭐ خدمة إعادة المحاولة المحسنة
│   │   ├── PaperTradingService.ts   # ⭐ خدمة Paper Trading المحسنة
│   │   ├── BackendService.ts        # ⭐ خدمة الاتصال الآمن
│   │   ├── SecureLoggingService.ts  # خدمة التسجيل الآمن
│   │   └── BacktestingService.ts    # خدمة الاختبار التاريخي
│   ├── 📁 strategies/               # استراتيجيات التداول
│   │   ├── HybridManager.ts         # المدير الهجين الذكي
│   │   ├── TrendFollowing.ts        # استراتيجية تتبع الاتجاه
│   │   ├── MeanReversion.ts         # استراتيجية العودة للمتوسط
│   │   ├── GridDCA.ts               # استراتيجية الشبكة + DCA
│   │   ├── Scalping.ts              # استراتيجية السكالبينج
│   │   └── MarketMaking.ts          # استراتيجية صناعة السوق
│   ├── 📁 utils/                    # أدوات مساعدة
│   │   ├── TechnicalAnalysis.ts     # التحليل الفني
│   │   ├── TechnicalAnalysis.test.ts # ⭐ اختبارات محسنة
│   │   └── TestingUtils.ts          # أدوات الاختبار
│   └── 📁 test/                     # إعدادات الاختبار
├── 📁 server/                       # ⭐ الخادم الخلفي المحسن (Node.js + Express)
│   ├── index.js                     # ⭐ الخادم الرئيسي مع أمان محسن
│   ├── package.json                 # تبعيات الخادم
│   ├── 📁 utils/                    # أدوات الخادم
│   │   └── signature.js             # توقيع Binance API
│   └── 📁 logs/                     # قاعدة بيانات السجلات
├── 📁 docs/                         # الوثائق
│   ├── API_SECURITY_POLICY.md       # سياسة أمان API
│   └── RETRY_STRATEGY.md            # استراتيجية إعادة المحاولة
├── .env.example                     # ⭐ مثال محسن لمتغيرات البيئة
├── README.md                        # ⭐ هذا الملف المحسن
└── package.json                     # تبعيات المشروع الرئيسية
```

## 🔒 الأمان والحماية

### الهيكل الأمني الجديد:

#### 1. فصل كامل بين الواجهة والخادم
```
الواجهة الأمامية (React)     الخادم الخلفي (Node.js)
├── لا تحتوي مفاتيح API      ├── يحتوي جميع المفاتيح
├── تستدعي APIs آمنة فقط     ├── يوقع طلبات Binance
├── Paper Trading محلي       ├── قاعدة بيانات آمنة
└── عرض النتائج فقط          └── تسجيل مراجعة شامل
```

#### 2. مستويات الأمان:
- **المستوى 1**: Paper Trading (آمن 100%)
- **المستوى 2**: Testnet (آمن للاختبار)
- **المستوى 3**: Live Trading (يتطلب تأكيد إضافي)

#### 3. الحماية من الأخطاء:
- **Rate Limiting**: حماية من الطلبات المفرطة
- **Input Validation**: التحقق من صحة جميع المدخلات
- **Error Handling**: معالجة شاملة للأخطاء
- **Audit Logging**: تسجيل جميع العمليات الحساسة

## 🔄 نظام إعادة المحاولة المتقدم

### خوارزمية Exponential Backoff:

```
المحاولة 1: فشل → انتظار 1 ثانية
المحاولة 2: فشل → انتظار 2 ثانية  
المحاولة 3: فشل → انتظار 4 ثواني
المحاولة 4: نجح ✅
```

### معالجة Rate Limits:
```javascript
// مثال على معالجة Rate Limit
if (error.status === 429) {
  const retryAfter = error.headers['retry-after'];
  await sleep(retryAfter * 1000);
  // إعادة المحاولة
}
```

### الأخطاء غير القابلة للإصلاح:
- `400` - Bad Request
- `401` - Unauthorized  
- `403` - Forbidden
- `404` - Not Found
- `-1013` - Invalid quantity (Binance)
- `-1021` - Timestamp outside window (Binance)

## 📝 التسجيل والمراقبة

### أنواع السجلات:

#### 1. سجلات التداول
```json
{
  "id": "trade_1642234567890_abc123",
  "symbol": "BTCUSDT",
  "action": "BUY",
  "price": 43250.00,
  "size": 0.001,
  "reason": "EMA crossover signal",
  "confidence": 85,
  "strategy": "TREND_FOLLOWING",
  "isDryRun": true,
  "status": "SIMULATED"
}
```

#### 2. سجلات القرارات
```json
{
  "id": "decision_1642234567890_def456", 
  "symbol": "BTCUSDT",
  "strategy": "HYBRID",
  "marketCondition": "TRENDING",
  "decision": "BUY",
  "confidence": 78,
  "reasons": ["EMA12 > EMA26", "MACD bullish", "High volume"],
  "processingTime": 45
}
```

#### 3. سجلات المخاطر
```json
{
  "id": "risk_1642234567890_ghi789",
  "action": "RISK_CHECK", 
  "currentDrawdown": 2.5,
  "dailyLoss": 25.50,
  "riskLevel": "LOW",
  "approved": true,
  "reason": "Within acceptable risk limits"
}
```

### عرض السجلات:
- **الواجهة**: تبويب "السجلات" مع فلترة متقدمة
- **الخادم**: قاعدة بيانات SQLite مع فهارس محسنة
- **التصدير**: JSON, CSV للتحليل الخارجي

## 🔧 استكشاف الأخطاء

### مشاكل شائعة وحلولها:

#### 1. "Connection failed"
```bash
# تحقق من تشغيل الخادم
npm run server

# تحقق من المنفذ
netstat -an | grep 3001

# تحقق من ملف .env
cat .env | grep BACKEND_URL
```

#### 2. "API Key invalid"  
```bash
# استخدم Paper Trading للاختبار
echo "VITE_DRY_RUN=true" >> .env

# أو تحقق من مفاتيح Testnet
echo "BINANCE_BASE_URL=https://testnet.binance.vision/api" >> .env
```

#### 3. "Tests failing"
```bash
# تأكد من التبعيات
npm install
cd server && npm install && cd ..

# تشغيل اختبار محدد
npm run test -- --grep "RSI"

# تنظيف وإعادة التثبيت
rm -rf node_modules package-lock.json
npm install
```

#### 4. "Port already in use"
```bash
# تغيير المنفذ
echo "BACKEND_PORT=3002" >> .env

# أو إيقاف العملية المستخدمة للمنفذ
lsof -ti:3001 | xargs kill -9
```

#### 5. "Rate Limited"
```bash
# تحقق من إعدادات Rate Limiting
echo "RATE_LIMIT_REQUESTS=50" >> .env
echo "RATE_LIMIT_WINDOW=60000" >> .env

# أو استخدم Testnet
echo "BINANCE_BASE_URL=https://testnet.binance.vision/api" >> .env
```

## 📊 مراقبة الأداء

### لوحة المراقبة:
- **الصحة العامة**: `/api/health`
- **إحصائيات النظام**: `/api/stats`  
- **اختبار Binance**: `/api/binance/test`

### المقاييس المتاحة:
- عدد الصفقات المنفذة
- معدل نجاح الاستراتيجيات
- أوقات الاستجابة (latency)
- استخدام الذاكرة والمعالج
- حالة الاتصال بـ Binance
- إحصائيات إعادة المحاولة

### مثال على مراقبة الأداء:
```bash
# فحص صحة النظام
curl http://localhost:3001/api/health

# فحص الاتصال بـ Binance
curl http://localhost:3001/api/binance/test

# الحصول على إحصائيات
curl -H "X-Frontend-Token: your-token" http://localhost:3001/api/stats
```

## 🔐 إعداد مفاتيح API

### للتطوير (Testnet):

1. **إنشاء حساب Testnet:**
   - اذهب إلى [testnet.binance.vision](https://testnet.binance.vision/)
   - سجل الدخول بحساب Binance العادي
   - احصل على أموال وهمية للاختبار

2. **إنشاء API Keys:**
   - اذهب إلى API Management في Testnet
   - أنشئ API Key جديد
   - فعّل صلاحيات التداول
   - انسخ API Key و Secret Key

3. **إعداد .env:**
   ```env
   VITE_DRY_RUN=false
   BINANCE_BASE_URL=https://testnet.binance.vision/api
   BINANCE_API_KEY=your_testnet_api_key
   BINANCE_SECRET_KEY=your_testnet_secret_key
   ```

### للإنتاج (Live Trading):

⚠️ **تحذير**: استخدم بحذر شديد!

1. **إعداد حساب Binance:**
   - فعّل المصادقة الثنائية (2FA)
   - تحقق من الهوية (KYC)
   - أمّن حسابك بكلمة مرور قوية

2. **إنشاء API Keys:**
   - اذهب إلى [API Management](https://www.binance.com/en/my/settings/api-management)
   - أنشئ API Key جديد
   - فعّل صلاحيات التداول فقط (لا تفعّل السحب!)
   - قيّد الوصول لـ IP الخاص بك
   - احتفظ بنسخة احتياطية آمنة

3. **إعداد .env:**
   ```env
   VITE_DRY_RUN=false
   BINANCE_BASE_URL=https://api.binance.com/api
   BINANCE_API_KEY=your_live_api_key
   BINANCE_SECRET_KEY=your_live_secret_key
   ```

## 🎯 دليل الاختبار التفصيلي

### اختبار الاستراتيجيات خطوة بخطوة:

#### 1. إعداد البيئة:
```bash
# تأكد من Paper Trading
echo "VITE_DRY_RUN=true" >> .env

# شغّل النظام
npm run full-dev
```

#### 2. اختبار Trend Following:
```bash
# في الواجهة:
# 1. اذهب إلى "الاستراتيجيات"
# 2. اختر "تتبع الاتجاه"  
# 3. اضغط "اختبار تاريخي"
# 4. راقب النتائج:
#    - معدل النجاح > 60%
#    - أقصى انخفاض < 10%
#    - نسبة شارب > 1.0
```

#### 3. اختبار Mean Reversion:
```bash
# نفس الخطوات مع "العودة للمتوسط"
# توقع:
# - معدل نجاح أعلى (70%+)
# - مخاطر أقل
# - أرباح أصغر لكن أكثر اتساقاً
```

#### 4. اختبار Grid + DCA:
```bash
# نفس الخطوات مع "الشبكة + DCA"
# توقع:
# - معدل نجاح أقل (45%)
# - لكن أرباح أكبر عند النجاح
# - يحتاج وقت أطول للتعافي
```

#### 5. اختبار Scalping:
```bash
# نفس الخطوات مع "السكالبينج"
# توقع:
# - صفقات كثيرة وسريعة
# - أرباح صغيرة (0.2-0.5%)
# - يحتاج سيولة عالية
```

#### 6. اختبار Market Making:
```bash
# نفس الخطوات مع "صناعة السوق"
# توقع:
# - معدل نجاح عالي (85%+)
# - أرباح صغيرة ومستقرة
# - يعتمد على السبريد
```

#### 7. اختبار Hybrid Manager:
```bash
# نفس الخطوات مع "النظام الهجين"
# توقع:
# - يجمع بين جميع الاستراتيجيات
# - يتكيف مع حالة السوق
# - أداء متوازن وذكي
```

### تفسير النتائج:

#### ✅ نتائج مقبولة:
- معدل النجاح ≥ 60%
- أقصى انخفاض ≤ 10%  
- نسبة شارب ≥ 1.0
- عدد الصفقات ≥ 10

#### ⚠️ نتائج تحتاج تحسين:
- معدل النجاح 50-60%
- أقصى انخفاض 10-15%
- نسبة شارب 0.5-1.0

#### ❌ نتائج مرفوضة:
- معدل النجاح < 50%
- أقصى انخفاض > 15%
- نسبة شارب < 0.5

## 🚀 النشر والإنتاج

### التحضير للنشر:

#### 1. اختبار شامل:
```bash
# تشغيل جميع الاختبارات
npm run test

# اختبار الأداء
npm run test -- --grep "Performance"

# اختبار التكامل
npm run test -- --grep "Integration"
```

#### 2. بناء الإنتاج:
```bash
# بناء الواجهة
npm run build

# اختبار البناء
npm run preview
```

#### 3. إعداد الخادم:
```bash
# تثبيت تبعيات الإنتاج
cd server
npm install --production

# تشغيل الخادم
npm start
```

### متطلبات الخادم:
- **المعالج**: 2+ cores
- **الذاكرة**: 4GB+ RAM
- **التخزين**: 10GB+ SSD
- **الشبكة**: اتصال مستقر بالإنترنت
- **نظام التشغيل**: Linux/Ubuntu مُفضل

## 📚 الوثائق الإضافية

- 📖 [سياسة أمان API](./docs/API_SECURITY_POLICY.md)
- 🔄 [استراتيجية إعادة المحاولة](./docs/RETRY_STRATEGY.md)
- 🧪 [دليل Paper Trading](./docs/PAPER_TRADING_GUIDE.md)
- 📊 [اختبار الاستراتيجيات](./docs/STRATEGY_TESTING.md)

## 🤝 المساهمة

### خطوات المساهمة:
1. **Fork** المشروع
2. **إنشاء branch** جديد (`git checkout -b feature/amazing-feature`)
3. **كتابة الاختبارات** للكود الجديد
4. **التأكد من نجاح الاختبارات** (`npm run test`)
5. **Commit** التغييرات (`git commit -m 'Add amazing feature'`)
6. **Push** إلى Branch (`git push origin feature/amazing-feature`)
7. **فتح Pull Request**

### معايير المساهمة:
- ✅ جميع الاختبارات تمر بنجاح
- ✅ تغطية اختبار ≥ 80%
- ✅ كود مُوثق ومُعلق
- ✅ اتباع معايير TypeScript
- ✅ لا توجد تحذيرات ESLint

## ⚠️ تحذيرات الأمان المهمة

### 🔴 ممنوع منعاً باتاً:
1. **رفع ملف .env إلى Git**
2. **مشاركة مفاتيح API مع أي شخص**
3. **استخدام Live API بدون اختبار Testnet أولاً**
4. **تعطيل إدارة المخاطر**
5. **تشغيل البوت بدون مراقبة**

### ✅ إجراءات أمان مطلوبة:
1. **استخدم VITE_DRY_RUN=true دائماً أثناء التطوير**
2. **غيّر FRONTEND_TOKEN في الإنتاج**
3. **فعّل المصادقة الثنائية على Binance**
4. **ابدأ بمبالغ صغيرة في Live Trading**
5. **راقب السجلات بانتظام**
6. **ضع حدود يومية للخسائر**
7. **احتفظ بنسخة احتياطية من الإعدادات**
8. **اختبر جميع الاستراتيجيات في Paper Trading أولاً**

## 📞 الدعم والمساعدة

### الحصول على المساعدة:
- **GitHub Issues**: [رفع مشكلة](https://github.com/your-username/ellen-trading-bot/issues)
- **Discussions**: [مناقشات المجتمع](https://github.com/your-username/ellen-trading-bot/discussions)
- **Wiki**: [دليل المستخدم المفصل](https://github.com/your-username/ellen-trading-bot/wiki)

### قبل طلب المساعدة:
1. تحقق من السجلات (`/api/health`)
2. جرب Paper Trading أولاً
3. تأكد من إعدادات .env
4. شغّل الاختبارات (`npm run test`)

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## 🙏 شكر وتقدير

- [Binance API](https://binance-docs.github.io/apidocs/) للوثائق الممتازة
- [React](https://reactjs.org/) و [TypeScript](https://www.typescriptlang.org/) للتقنيات الرائعة
- [Vitest](https://vitest.dev/) لإطار الاختبار السريع
- [Tailwind CSS](https://tailwindcss.com/) للتصميم الجميل
- [Express.js](https://expressjs.com/) للخادم الخلفي الموثوق

---

## 📋 قائمة التحقق النهائية

### قبل التشغيل:
- [ ] تم نسخ .env.example إلى .env
- [ ] تم تعيين VITE_DRY_RUN=true
- [ ] تم تثبيت جميع التبعيات
- [ ] تم تشغيل الاختبارات بنجاح
- [ ] تم تشغيل الخادم الخلفي

### قبل النشر:
- [ ] جميع الاختبارات تمر بنجاح
- [ ] تم اختبار جميع الاستراتيجيات
- [ ] تم تأمين مفاتيح API
- [ ] تم إعداد مراقبة السجلات
- [ ] تم تعيين حدود المخاطر

### قبل Live Trading:
- [ ] تم اختبار Testnet بنجاح
- [ ] تم تأمين الخادم
- [ ] تم إعداد التنبيهات
- [ ] تم تحديد مبلغ صغير للبداية
- [ ] تم إعداد مراقبة مستمرة

---

**⚠️ تنبيه قانوني:** التداول في العملات المشفرة ينطوي على مخاطر عالية. استخدم هذا البوت على مسؤوليتك الخاصة. المطورون غير مسؤولين عن أي خسائر مالية.

**💡 نصيحة:** ابدأ دائماً بـ Paper Trading واختبر جميع الاستراتيجيات قبل استخدام أموال حقيقية.

---

<div align="center">
  <strong>Ellen Trading Bot</strong> - تداول ذكي وآمن 🚀<br>
  <em>Built with ❤️ for the crypto trading community</em>
</div>