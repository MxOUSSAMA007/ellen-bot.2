const crypto = require('crypto');

/**
 * إنشاء توقيع HMAC SHA256 لـ Binance API
 */
function createSignature(queryString, secretKey = null) {
  // إذا لم يتم تمرير secretKey، حاول الحصول عليه من متغيرات البيئة
  const key = secretKey || process.env.BINANCE_SECRET_KEY;
  
  if (!key) {
    throw new Error('BINANCE_SECRET_KEY is not set in environment variables');
  }
  
  return crypto
    .createHmac('sha256', key)
    .update(queryString)
    .digest('hex');
}

/**
 * التحقق من صحة التوقيع
 */
function verifySignature(queryString, signature, secretKey = null) {
  const expectedSignature = createSignature(queryString, secretKey);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * إنشاء timestamp آمن
 */
function createTimestamp() {
  return Date.now();
}

/**
 * التحقق من صحة الـ timestamp (ضمن نافزة 5 دقائق)
 */
function isValidTimestamp(timestamp, windowMs = 300000) {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= windowMs;
}

module.exports = {
  createSignature,
  verifySignature,
  createTimestamp,
  isValidTimestamp
};