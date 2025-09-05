# Ellen Trading Bot 🚀

## هدف المشروع

Ellen Trading Bot هو بوت تداول ذكي ومتطور للعملات المشفرة يستخدم الذكاء الاصطناعي والتحليل الفني لتنفيذ صفقات سريعة ومربحة على منصة Binance.

### الميزات الرئيسية:
- 🤖 **تداول تلقائي ذكي** مع إعدادات قابلة للتخصيص
- ⚡ **سرعة فائقة** في التحليل وتنفيذ الصفقات (100ms - 5s)
- 📊 **تحليل فني متقدم** باستخدام مؤشرات متعددة
- 🛡️ **إدارة مخاطر محكمة** مع وقف الخسارة وجني الأرباح
- 📈 **هامش ربح مرن** من 1% إلى 10%
- 🔗 **ربط آمن مع Binance** API
- 📱 **واجهة مستخدم متطورة** مع إحصائيات مفصلة
- 🧪 **Paper Trading** للاختبار الآمن بدون مخاطر مالية
- 🔄 **Retry Logic** مع Exponential Backoff للموثوقية
- 📝 **تسجيل شامل** لجميع القرارات والصفقات

## متطلبات التشغيل

### المتطلبات الأساسية:
- Node.js (الإصدار 18 أو أحدث)
- npm أو yarn
- حساب Binance مع API Keys (للتداول الحقيقي فقط)

### المتطلبات الاختيارية:
- Redis (للتخزين المؤقت المتقدم)
- PostgreSQL (لقاعدة البيانات المتقدمة)

## التثبيت

### 1. استنساخ المشروع
```bash
git clone https://github.com/your-username/ellen-trading-bot.git
cd ellen-trading-bot
```

### 2. تثبيت التبعيات
```bash
npm install

# تثبيت تبعيات الخادم الخلفي
cd server
npm install
cd ..
```

### 3. إعداد متغيرات البيئة
انسخ ملف `.env.example\` إلى `.env\` وقم بتعديل القيم:

```bash
cp .env.example .env
```

**⚠️ مهم جداً:** تأكد من تعيين `VITE_DRY_RUN=true\` للاختبار الآمن!

## أوامر التشغيل

### التطوير
```bash
# تشغيل الخادم المحلي للتطوير
npm run dev

# تشغيل الخادم الخلفي
npm run server

# تشغيل الواجهة والخادم معاً
npm run full-dev

# تشغيل الاختبارات
npm run test

# فحص الكود
npm run lint
```

### الإنتاج
```bash
# بناء المشروع للإنتاج
npm run build

# تشغيل الخادم الخلفي للإنتاج
npm run server:start

# معاينة البناء
npm run preview
```

## 🧪 وضع Paper Trading (الاختبار الآمن)

Ellen Bot يدعم وضع Paper Trading للاختبار الآمن بدون استخدام أموال حقيقية.

### تفعيل Paper Trading:
```env
# في ملف .env
VITE_DRY_RUN=true
```

### مميزات Paper Trading:
- ✅ **آمن 100%** - لا يتم تنفيذ صفقات حقيقية
- ✅ **محاكاة واقعية** - يحاكي انزلاق الأسعار والرسوم
- ✅ **رصيد افتراضي** - يبدأ بـ $10,000 USDT
- ✅ **تسجيل كامل** - جميع الصفقات تُسجل وتُعرض
- ✅ **إحصائيات مفصلة** - تتبع الأداء والأرباح/الخسائر

### مثال على استخدام Paper Trading:
```bash
# 1. تأكد من تفعيل DRY_RUN
echo "VITE_DRY_RUN=true" >> .env

# 2. شغّل البوت
npm run full-dev

# 3. راقب النتائج في واجهة المستخدم
# جميع الصفقات ستكون محاكاة آمنة
```

## 🔄 نظام إعادة المحاولة والموثوقية

Ellen Bot يتضمن نظام متقدم لإعادة المحاولة لضمان الموثوقية:

### الميزات:
- **Exponential Backoff**: زيادة تدريجية في وقت الانتظار
- **Jitter**: إضافة عشوائية لتجنب التحميل المتزامن
- **Rate Limit Handling**: معالجة ذكية لحدود المعدل
- **Non-Retryable Errors**: تجنب إعادة المحاولة للأخطاء غير القابلة للإصلاح

### الإعدادات الافتراضية:
```typescript
{
  maxAttempts: 3,        // أقصى 3 محاولات
  baseDelay: 1000,       // تأخير أساسي 1 ثانية
  maxDelay: 30000,       // أقصى تأخير 30 ثانية
  backoffMultiplier: 2,  // مضاعف التأخير
  jitterRange: 0.1       // نطاق العشوائية ±10%
}
```

## 🧪 الاختبارات

Ellen Bot يتضمن مجموعة شاملة من الاختبارات:

### تشغيل الاختبارات:
```bash
# تشغيل جميع الاختبارات
npm run test

# تشغيل الاختبارات مع واجهة مرئية
npm run test:ui

# تشغيل الاختبارات مرة واحدة
npm run test:run
```

### أنواع الاختبارات:
1. **اختبارات المؤشرات الفنية**:
   - RSI calculation
   - MACD calculation
   - Bollinger Bands
   - Moving Averages

2. **اختبارات منطق القرارات**:
   - EMA crossover signals
   - Multi-indicator confirmation
   - Risk management rules

3. **اختبارات الأداء**:
   - سرعة حساب المؤشرات
   - معالجة البيانات الكبيرة
   - استهلاك الذاكرة

## الهيكل الجديد للمشروع

```
ellen-trading-bot/
├── src/                          # الواجهة الأمامية (React + TypeScript)
│   ├── components/               # مكونات React
│   ├── services/                 # خدمات الاتصال والتسجيل
│   │   ├── RetryService.ts       # خدمة إعادة المحاولة
│   │   ├── PaperTradingService.ts # خدمة Paper Trading
│   │   └── SecureLoggingService.ts # خدمة التسجيل الآمن
│   ├── strategies/               # استراتيجيات التداول
│   ├── utils/                    # أدوات مساعدة
│   └── test/                     # ملفات الاختبار
├── server/                       # الخادم الخلفي (Node.js + Express)
│   ├── index.js                  # الخادم الرئيسي
│   ├── utils/                    # أدوات الخادم
│   ├── logs/                     # قاعدة بيانات السجلات
│   └── package.json              # تبعيات الخادم
├── .env.example                  # مثال على متغيرات البيئة
└── docs/                         # الوثائق
```

## 🔄 التبديل بين أوضاع التشغيل

### 1. وضع Paper Trading (DRY_RUN) - الافتراضي والآمن

```env
# في ملف .env
DRY_RUN=true
```

**مميزات وضع المحاكاة:**
- ✅ لا يتم تنفيذ صفقات حقيقية
- ✅ آمن للتطوير والاختبار
- ✅ يسجل جميع العمليات في قاعدة البيانات
- ✅ رصيد افتراضي $10,000 للاختبار
- ✅ محاكاة واقعية للانزلاق والرسوم

### 2. وضع Testnet - للاختبار مع Binance Testnet

```env
# في ملف .env
VITE_DRY_RUN=false
BINANCE_BASE_URL=https://testnet.binance.vision/api
BINANCE_API_KEY=your_testnet_api_key
BINANCE_SECRET_KEY=your_testnet_secret_key
```

**للحصول على مفاتيح Testnet:**
1. اذهب إلى [Binance Testnet](https://testnet.binance.vision/)
)
2. سجل الدخول بحساب Binance
3. أنشئ API Keys للاختبار

### 3. وضع التداول الحقيقي (Live Trading) - ⚠️ خطر!

```env
# في ملف .env
VITE_DRY_RUN=false
BINANCE_BASE_URL=https://api.binance.com/api
BINANCE_API_KEY=your_live_api_key
BINANCE_SECRET_KEY=your_live_secret_key
```

**⚠️ تحذير:** وضع التداول الحقيقي يستخدم أموال حقيقية!

**للحصول على مفاتيح Live:**
1. اذهب إلى [Binance API Management](https://www.binance.com/en/my/settings/api-management)
)
2. أنشئ API Key جديد
3. فعّل صلاحيات التداول
4. قم بتأمين IP الخاص بك
5. فعّل المصادقة الثنائية

## 🔒 الأمان والحماية المتقدمة

## الميزات الأمنية الجديدة

### 1. فصل الواجهة عن الخادم
- الواجهة الأمامية لا تحتوي على أي مفاتيح API
- جميع العمليات الحساسة تتم عبر الخادم الخلفي
- مصادقة آمنة باستخدام Frontend Token
- نظام Retry متقدم لضمان الموثوقية

### 2. تسجيل شامل ومراجعة
- تسجيل جميع القرارات والصفقات في قاعدة بيانات SQLite
- تتبع كامل لجميع العمليات مع timestamps
- إمكانية تصدير السجلات للمراجعة
- تسجيل أسباب كل قرار تداول

### 3. إدارة مخاطر متقدمة
- فحص المخاطر قبل كل صفقة
- حدود يومية للخسائر
- إيقاف تلقائي عند تجاوز الحدود
- Paper Trading للاختبار الآمن

### 4. واجهة مراقبة السجلات
- عرض السجلات المحلية والخادم
- فلترة وبحث متقدم
- إحصائيات مفصلة للأداء

## 🎯 اختبار الاستراتيجيات الست

Ellen Bot يدعم 6 استراتيجيات تداول متقدمة:

### 1. **Trend Following** - تتبع الاتجاه
- يتبع الاتجاهات القوية باستخدام EMA و MACD
- مناسب للأسواق ذات الاتجاه الواضح
- معدل نجاح متوقع: 65%

### 2. **Mean Reversion** - العودة للمتوسط
- يستغل التشبع الشرائي والبيعي
- يستخدم RSI و Bollinger Bands
- معدل نجاح متوقع: 72%

### 3. **Grid + DCA** - الشبكة مع متوسط التكلفة
- شبكة تداول مع متوسط التكلفة
- مناسب للأسواق المتذبذبة
- معدل نجاح متوقع: 45% (لكن أرباح أكبر)

### 4. **Scalping** - السكالبينج
- صفقات سريعة بأرباح صغيرة
- يستهدف أرباح 0.2-0.5%
- معدل نجاح متوقع: 58%

### 5. **Market Making** - صناعة السوق
- توفير السيولة والربح من السبريد
- يتطلب سيولة عالية
- معدل نجاح متوقع: 85% (أرباح صغيرة)

### 6. **Hybrid Manager** - المدير الهجين
- يختار الاستراتيجية المناسبة تلقائياً
- يحلل حالة السوق ويتكيف معها
- يجمع بين جميع الاستراتيجيات

### اختبار الاستراتيجيات:
```bash
# 1. تأكد من تفعيل Paper Trading
echo "VITE_DRY_RUN=true" >> .env

# 2. شغّل البوت
npm run full-dev

# 3. اذهب إلى تبويب "الاستراتيجيات"
# 4. اختر الاستراتيجية المطلوبة
# 5. شغّل الاختبار التاريخي
# 6. راقب النتائج في تبويب "السجلات"
```

## إعداد ملفات البيئة

### ملف .env (الواجهة الأمامية)
```env
VITE_BACKEND_URL=http://localhost:3001/api
VITE_FRONTEND_TOKEN=ellen-bot-secure-token
VITE_DRY_RUN=true
VITE_DEV_MODE=true
```

**ملاحظة:** جميع الإعدادات الآن في ملف `.env\` واحد في الجذر.

## 🚀 البدء السريع

### للمبتدئين:
```bash
# 1. استنسخ المشروع
git clone https://github.com/your-username/ellen-trading-bot.git
cd ellen-trading-bot

# 2. ثبّت التبعيات
npm install
cd server && npm install && cd ..

# 3. انسخ ملف البيئة
cp .env.example .env

# 4. شغّل البوت (وضع آمن)
npm run full-dev

# 5. افتح المتصفح على:
# http://localhost:5173
```

### للمطورين المتقدمين:
```bash
# تشغيل الاختبارات
npm run test

# فحص الكود
npm run lint

# بناء للإنتاج
npm run build
```

## 📊 مراقبة الأداء

### لوحة السجلات:
- عرض السجلات المحلية والخادم
- فلترة حسب العملة والاستراتيجية
- إحصائيات مفصلة للأداء
- تصدير السجلات للتحليل

### المقاييس المتاحة:
- عدد الصفقات المنفذة
- معدل نجاح الاستراتيجيات
- أوقات الاستجابة
- استخدام الذاكرة والمعالج
- حالة الاتصال بـ Binance

## 🔧 استكشاف الأخطاء

### مشاكل شائعة:

1. **"Connection failed"**:
   ```bash
   # تأكد من تشغيل الخادم الخلفي
   npm run server
   ```

2. **"API Key invalid"**:
   ```bash
   # تأكد من صحة مفاتيح API في .env
   # أو استخدم Paper Trading
   echo "VITE_DRY_RUN=true" >> .env
   ```

3. **"Tests failing"**:
   ```bash
   # تأكد من تثبيت جميع التبعيات
   npm install
   cd server && npm install && cd ..
   npm run test
   ```

## الأمان والحماية


### الميزات الأمنية الجديدة:
- فصل كامل بين الواجهة والخادم
- تشفير جميع الاتصالات
- تسجيل مراجعة شامل
- حماية من CSRF و XSS
- Rate limiting للحماية من الهجمات

### نصائح الأمان:
- ابدأ بمبالغ صغيرة في التداول الحقيقي
- راقب البوت باستمرار في البداية
- ضع حدود يومية للخسائر
- احتفظ بنسخة احتياطية من الإعدادات
- راجع السجلات بانتظام

## مراقبة الأداء

### لوحة السجلات الجديدة:
- عرض السجلات المحلية والخادم
- فلترة حسب العملة والاستراتيجية
- إحصائيات مفصلة للأداء
- تصدير السجلات للتحليل

### المقاييس المتاحة:
- عدد الصفقات المنفذة
- معدل نجاح الاستراتيجيات
- أوقات الاستجابة
- استخدام الذاكرة والمعالج
- حالة الاتصال بـ Binance

```env
# وضع التشغيل
NODE_ENV=development
DRY_RUN=true

# إعدادات Binance
BINANCE_BASE_URL=https://testnet.binance.vision/api
BINANCE_API_KEY=your_testnet_api_key_here
BINANCE_SECRET_KEY=your_testnet_secret_key_here

# إعدادات الأمان
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
ENCRYPTION_KEY=your_fernet_encryption_key_here

# إعدادات قاعدة البيانات (اختيارية)
DATABASE_URL=postgresql://user:password@localhost:5432/ellen_bot

# إعدادات Redis (اختيارية)
REDIS_URL=redis://localhost:6379

# إعدادات الخادم الخلفي
VITE_BACKEND_URL=http://localhost:3001/api

# إعدادات التداول
DEFAULT_PROFIT_TARGET=2.0
DEFAULT_STOP_LOSS=1.0
MAX_DAILY_LOSS=100
```

4. **"Port already in use"**:
   ```bash
   # غيّر المنفذ في .env
   echo "BACKEND_PORT=3002" >> .env
   ```

## 📚 الوثائق الإضافية

- [سياسة أمان API](./docs/API_SECURITY_POLICY.md)
- [استراتيجية إعادة المحاولة](./docs/RETRY_STRATEGY.md)
- [دليل Paper Trading](./docs/PAPER_TRADING_GUIDE.md)
- [اختبار الاستراتيجيات](./docs/STRATEGY_TESTING.md)

## 🤝 المساهمة

1. Fork المشروع
2. أنشئ branch جديد للميزة (`git checkout -b feature/amazing-feature`)
3. اكتب الاختبارات للكود الجديد
4. تأكد من نجاح جميع الاختبارات (`npm run test`)
5. Commit التغييرات (`git commit -m 'Add amazing feature'`)
6. Push إلى Branch (`git push origin feature/amazing-feature`)
7. افتح Pull Request

## 📋 قائمة التحقق قبل النشر

### ⚠️ تحذيرات مهمة:
- **لا تشارك مفاتيح API مع أي شخص**
- **لا ترفع ملف .env إلى Git**
- **استخدم Testnet دائماً أثناء التطوير**
- **فعّل المصادقة الثنائية على حساب Binance**

### نصائح الأمان:
- ابدأ بمبالغ صغيرة في التداول الحقيقي
- راقب البوت باستمرار في البداية
- ضع حدود يومية للخسائر
- احتفظ بنسخة احتياطية من الإعدادات

## الدعم والمساعدة

### الوثائق:
- [API Security Policy](./docs/API_SECURITY_POLICY.md)
- [Technical Improvements](./IMPROVEMENTS.md)
- [Architecture Documentation](./ARCHITECTURE_IMPROVEMENTS.md)

### المساهمة:
1. Fork المشروع
2. أنشئ branch جديد للميزة
3. اكتب الاختبارات
4. ارسل Pull Request

## الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

---

**تنبيه:** التداول في العملات المشفرة ينطوي على مخاطر عالية. استخدم هذا البوت على مسؤوليتك الخاصة.