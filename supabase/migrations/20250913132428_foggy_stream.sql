/*
  # Initial Database Schema

  1. New Tables
    - `trade_logs` - سجلات الصفقات مع تفاصيل التنفيذ
    - `decision_logs` - سجلات القرارات والتحليل
    - `risk_logs` - سجلات فحص المخاطر
    - `system_logs` - سجلات النظام العامة

  2. Security
    - لا تحتوي الجداول على معلومات حساسة
    - فهارس محسنة للأداء
    - تصميم قابل للتوسع

  3. Features
    - دعم pagination
    - فلترة متقدمة
    - تخزين metadata كـ JSON
*/

-- جدول سجلات الصفقات
CREATE TABLE IF NOT EXISTS trade_logs (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL,
  price REAL,
  size REAL,
  reason TEXT,
  confidence REAL,
  timestamp TEXT NOT NULL,
  strategy TEXT,
  is_dry_run BOOLEAN DEFAULT 1,
  order_id TEXT,
  executed_price REAL,
  executed_size REAL,
  fees REAL,
  status TEXT DEFAULT 'PENDING',
  metadata TEXT -- JSON string
);

-- جدول سجلات القرارات
CREATE TABLE IF NOT EXISTS decision_logs (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  strategy TEXT NOT NULL,
  market_condition TEXT,
  indicators TEXT, -- JSON string
  decision TEXT NOT NULL,
  confidence REAL,
  reasons TEXT, -- JSON array
  timestamp TEXT NOT NULL,
  processing_time REAL,
  metadata TEXT -- JSON string
);

-- جدول سجلات المخاطر
CREATE TABLE IF NOT EXISTS risk_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  current_drawdown REAL,
  daily_loss REAL,
  position_size REAL,
  risk_level TEXT,
  approved BOOLEAN,
  reason TEXT,
  timestamp TEXT NOT NULL,
  metadata TEXT -- JSON string
);

-- جدول سجلات النظام العامة
CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL, -- INFO, WARN, ERROR, DEBUG
  type TEXT NOT NULL, -- CONNECTION, API, SECURITY, PERFORMANCE
  message TEXT NOT NULL,
  source TEXT NOT NULL, -- FRONTEND, BACKEND, BINANCE
  timestamp TEXT NOT NULL,
  metadata TEXT -- JSON string
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_trade_logs_symbol ON trade_logs(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_logs_timestamp ON trade_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_trade_logs_strategy ON trade_logs(strategy);
CREATE INDEX IF NOT EXISTS idx_trade_logs_status ON trade_logs(status);

CREATE INDEX IF NOT EXISTS idx_decision_logs_strategy ON decision_logs(strategy);
CREATE INDEX IF NOT EXISTS idx_decision_logs_timestamp ON decision_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_decision_logs_symbol ON decision_logs(symbol);

CREATE INDEX IF NOT EXISTS idx_risk_logs_timestamp ON risk_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_risk_logs_action ON risk_logs(action);
CREATE INDEX IF NOT EXISTS idx_risk_logs_approved ON risk_logs(approved);

CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(type);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);