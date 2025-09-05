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

## متطلبات التشغيل

### المتطلبات الأساسية:
- Node.js (الإصدار 18 أو أحدث)
- npm أو yarn
- حساب Binance مع API Keys

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
```

### 3. إعداد متغيرات البيئة
انسخ ملف `.env.example` إلى `.env` وقم بتعديل القيم:

```bash
cp .env.example .env
```

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
npm test

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

## الهيكل الجديد للمشروع

```
ellen-trading-bot/
├── src/                          # الواجهة الأمامية (React + TypeScript)
│   ├── components/               # مكونات React
│   ├── services/                 # خدمات الاتصال والتسجيل
│   ├── strategies/               # استراتيجيات التداول
│   └── utils/                    # أدوات مساعدة
├── server/                       # الخادم الخلفي (Node.js + Express)
│   ├── index.js                  # الخادم الرئيسي
│   ├── utils/                    # أدوات الخادم
│   └── logs/                     # قاعدة بيانات السجلات
└── docs/                         # الوثائق
```

## التبديل بين DRY_RUN و Live Trading

### وضع المحاكاة (DRY_RUN) - الافتراضي للتطوير
```env
# في ملف .env
DRY_RUN=true
VITE_BACKEND_URL=http://localhost:3001/api
```

**مميزات وضع المحاكاة:**
- ✅ لا يتم تنفيذ صفقات حقيقية
- ✅ آمن للتطوير والاختبار
- ✅ يسجل جميع العمليات في قاعدة البيانات
- ✅ واجهة آمنة بدون مفاتيح API

### وضع التداول الحقيقي (Live Trading)
```env
# في ملف server/.env
DRY_RUN=false
BINANCE_API_KEY=your_live_api_key
BINANCE_SECRET_KEY=your_live_secret_key
```

**⚠️ تحذير:** وضع التداول الحقيقي يستخدم أموال حقيقية!

## الميزات الأمنية الجديدة

### 1. فصل الواجهة عن الخادم
- الواجهة الأمامية لا تحتوي على أي مفاتيح API
- جميع العمليات الحساسة تتم عبر الخادم الخلفي
- مصادقة آمنة باستخدام Frontend Token

### 2. تسجيل شامل ومراجعة
- تسجيل جميع القرارات والصفقات في قاعدة بيانات SQLite
- تتبع كامل لجميع العمليات مع timestamps
- إمكانية تصدير السجلات للمراجعة

### 3. إدارة مخاطر متقدمة
- فحص المخاطر قبل كل صفقة
- حدود يومية للخسائر
- إيقاف تلقائي عند تجاوز الحدود

### 4. واجهة مراقبة السجلات
- عرض السجلات المحلية والخادم
- فلترة وبحث متقدم
- إحصائيات مفصلة للأداء

### التبديل من الواجهة
يمكنك التبديل بين الأوضاع من خلال:
1. الذهاب إلى صفحة "الإعدادات"
2. تفعيل/إلغاء تفعيل "وضع المحاكاة"
3. حفظ الإعدادات

## إعداد ملفات البيئة

### ملف .env (الواجهة الأمامية)
```env
VITE_BACKEND_URL=http://localhost:3001/api
VITE_FRONTEND_TOKEN=ellen-bot-secure-token
VITE_DEV_MODE=true
```

### ملف server/.env (الخادم الخلفي)
```env
NODE_ENV=development
DRY_RUN=true
BACKEND_PORT=3001
FRONTEND_TOKEN=ellen-bot-secure-token

# للتداول الحقيقي فقط
BINANCE_API_KEY=your_api_key
BINANCE_SECRET_KEY=your_secret_key
```

## اختبار الاستراتيجيات

يمكنك الآن اختبار جميع الاستراتيجيات الست بأمان:

1. **Trend Following** - تتبع الاتجاهات القوية
2. **Mean Reversion** - العودة للمتوسط
3. **Grid + DCA** - الشبكة مع متوسط التكلفة
4. **Scalping** - الصفقات السريعة
5. **Market Making** - صناعة السوق
6. **Hybrid Manager** - الإدارة الذكية للاستراتيجيات

### تشغيل الاختبار:
```bash
# تشغيل الواجهة والخادم
npm run full-dev

# في متصفح آخر، اذهب إلى:
# http://localhost:5173

# لمراقبة السجلات، اذهب إلى تبويب "السجلات"
```

## مثال كامل لملف .env القديم (للمرجع):

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

## الأمان والحماية

### ⚠️ تحذيرات مهمة:
- **لا تشارك Frontend Token مع أي شخص**
- **لا ترفع ملفات .env إلى Git**
- **استخدم DRY_RUN دائماً أثناء التطوير**
- **فعّل المصادقة الثنائية على حساب Binance**

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

## التبديل بين Testnet و Live

### استخدام Binance Testnet (للتطوير)
```env
BINANCE_BASE_URL=https://testnet.binance.vision/api
```

**للحصول على مفاتيح Testnet:**
1. اذهب إلى [Binance Testnet](https://testnet.binance.vision/)
2. سجل الدخول بحساب Binance
3. أنشئ API Keys للاختبار

### استخدام Binance Live (للإنتاج)
```env
BINANCE_BASE_URL=https://api.binance.com/api
```

**للحصول على مفاتيح Live:**
1. اذهب إلى [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. أنشئ API Key جديد
3. فعّل صلاحيات التداول
4. قم بتأمين IP الخاص بك

## الأمان والحماية

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