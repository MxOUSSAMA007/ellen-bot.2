import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// إضافة matchers مخصصة
expect.extend(matchers);

// تنظيف بعد كل اختبار
afterEach(() => {
  cleanup();
});