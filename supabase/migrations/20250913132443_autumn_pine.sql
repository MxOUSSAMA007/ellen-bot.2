/*
  # Add Log Retention and Cleanup

  1. New Tables
    - `migration_history` - تتبع الترحيلات المطبقة
    - `log_retention_policy` - سياسات الاحتفاظ بالسجلات

  2. Features
    - تنظيف تلقائي للسجلات القديمة
    - تتبع الترحيلات المطبقة
    - إعدادات الاحتفاظ القابلة للتخصيص
*/

-- جدول تتبع الترحيلات
CREATE TABLE IF NOT EXISTS migration_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  migration_name TEXT UNIQUE NOT NULL,
  applied_at TEXT NOT NULL,
  checksum TEXT,
  execution_time REAL
);

-- جدول سياسات الاحتفاظ
CREATE TABLE IF NOT EXISTS log_retention_policy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_type TEXT UNIQUE NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 30,
  max_records INTEGER DEFAULT 100000,
  auto_cleanup BOOLEAN DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- إدراج سياسات افتراضية
INSERT OR IGNORE INTO log_retention_policy (log_type, retention_days, max_records, auto_cleanup, created_at, updated_at)
VALUES 
  ('trade_logs', 90, 50000, 1, datetime('now'), datetime('now')),
  ('decision_logs', 30, 100000, 1, datetime('now'), datetime('now')),
  ('risk_logs', 60, 25000, 1, datetime('now'), datetime('now')),
  ('system_logs', 14, 200000, 1, datetime('now'), datetime('now'));