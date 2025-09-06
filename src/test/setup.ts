import { expect } from 'vitest';

// إعداد بيئة الاختبار
global.console = {
  ...console,
  warn: () => {}, // تجاهل التحذيرات في الاختبارات
  error: () => {} // تجاهل الأخطاء في الاختبارات
};