const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// إعداد قاعدة البيانات
const dbPath = path.join(__dirname, 'logs', 'ellen-bot.db');
const db = new sqlite3.Database(dbPath);

// إنشاء جداول السجلات
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS trade_logs (
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
    status TEXT DEFAULT 'PENDING'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS decision_logs (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    strategy TEXT NOT NULL,
    market_condition TEXT,
    indicators TEXT,
    decision TEXT NOT NULL,
    confidence REAL,
    reasons TEXT,
    timestamp TEXT NOT NULL,
    processing_time REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS risk_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    current_drawdown REAL,
    daily_loss REAL,
    position_size REAL,
    risk_level TEXT,
    approved BOOLEAN,
    reason TEXT,
    timestamp TEXT NOT NULL
  )`);
});

// Middleware
app.use(cors());
app.use(express.json());

// Middleware للتحقق من الأمان
const authMiddleware = (req, res, next) => {
  const frontendToken = req.headers['x-frontend-token'];
  const expectedToken = process.env.FRONTEND_TOKEN || 'ellen-bot-secure-token';
  
  if (!frontendToken || frontendToken !== expectedToken) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized access' 
    });
  }
  
  next();
};

// Middleware للتسجيل
const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // تسجيل الطلب والاستجابة
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.body,
      response: typeof data === 'string' ? JSON.parse(data) : data
    });
    
    originalSend.call(this, data);
  };
  
  next();
};

app.use(auditMiddleware);

// Routes العامة (لا تحتاج مصادقة)
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Ellen Bot Backend is running',
    timestamp: new Date().toISOString(),
    mode: process.env.DRY_RUN === 'true' ? 'DRY_RUN' : 'LIVE'
  });
});

// الحصول على بيانات الشموع (عام)
app.get('/api/klines', async (req, res) => {
  try {
    const { symbol, interval, limit } = req.query;
    
    if (!symbol || !interval) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and interval are required'
      });
    }

    // استدعاء Binance API مباشرة للبيانات العامة
    const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 100}`;
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(binanceUrl);
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // تحويل البيانات إلى تنسيق مناسب
    const candles = data.map(kline => ({
      timestamp: kline[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5])
    }));
    
    res.json({
      success: true,
      data: candles,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching klines:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Routes المحمية (تحتاج مصادقة)
app.use('/api/order', authMiddleware);
app.use('/api/account', authMiddleware);
app.use('/api/logs', authMiddleware);

// تنفيذ أمر تداول
app.post('/api/order', async (req, res) => {
  try {
    const { symbol, side, type, quantity, price } = req.body;
    const isDryRun = process.env.DRY_RUN === 'true';
    
    // التحقق من صحة البيانات
    if (!symbol || !side || !type || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required order parameters'
      });
    }

    const orderId = generateOrderId();
    const timestamp = new Date().toISOString();
    
    let result;
    
    if (isDryRun) {
      // محاكاة تنفيذ الأمر
      result = {
        orderId,
        symbol,
        status: 'SIMULATED',
        executedQty: quantity,
        executedPrice: price || 0,
        fills: [],
        transactTime: Date.now()
      };
      
      console.log(`[DRY_RUN] Simulated order: ${side} ${quantity} ${symbol} @ ${price || 'MARKET'}`);
      
    } else {
      // تنفيذ حقيقي عبر Binance API
      result = await executeBinanceOrder({
        symbol,
        side,
        type,
        quantity,
        price
      });
    }

    // تسجيل الصفقة
    await logTrade({
      id: orderId,
      symbol,
      action: side,
      price: result.executedPrice || price || 0,
      size: quantity,
      reason: 'Manual order execution',
      confidence: 100,
      timestamp,
      strategy: 'MANUAL',
      is_dry_run: isDryRun,
      order_id: result.orderId,
      executed_price: result.executedPrice,
      executed_size: result.executedQty,
      status: result.status
    });

    res.json({
      success: true,
      data: result,
      timestamp
    });
    
  } catch (error) {
    console.error('Error executing order:', error);
    
    // تسجيل الخطأ
    await logError({
      action: 'ORDER_EXECUTION',
      error: error.message,
      details: req.body
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// الحصول على معلومات الحساب
app.get('/api/account/info', async (req, res) => {
  try {
    const isDryRun = process.env.DRY_RUN === 'true';
    
    if (isDryRun) {
      // إرجاع بيانات وهمية للاختبار
      res.json({
        success: true,
        data: {
          accountType: 'SPOT',
          balances: [
            { asset: 'USDT', free: '1000.00000000', locked: '0.00000000' },
            { asset: 'BTC', free: '0.00000000', locked: '0.00000000' }
          ],
          canTrade: true,
          canWithdraw: false,
          canDeposit: false,
          updateTime: Date.now()
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // استدعاء Binance API الحقيقي
      const accountInfo = await getBinanceAccountInfo();
      res.json({
        success: true,
        data: accountInfo,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Error getting account info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// تسجيل قرار تداول
app.post('/api/logs/decision', async (req, res) => {
  try {
    const logEntry = {
      id: generateLogId(),
      ...req.body,
      timestamp: new Date().toISOString()
    };
    
    await logDecision(logEntry);
    
    res.json({
      success: true,
      data: { logId: logEntry.id },
      timestamp: logEntry.timestamp
    });
    
  } catch (error) {
    console.error('Error logging decision:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// تسجيل فحص المخاطر
app.post('/api/logs/risk', async (req, res) => {
  try {
    const logEntry = {
      id: generateLogId(),
      ...req.body,
      timestamp: new Date().toISOString()
    };
    
    await logRisk(logEntry);
    
    res.json({
      success: true,
      data: { logId: logEntry.id },
      timestamp: logEntry.timestamp
    });
    
  } catch (error) {
    console.error('Error logging risk check:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// الحصول على السجلات
app.get('/api/logs/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 100, symbol, strategy } = req.query;
    
    let query;
    let params = [limit];
    
    switch (type) {
      case 'trades':
        query = 'SELECT * FROM trade_logs';
        if (symbol) {
          query += ' WHERE symbol = ?';
          params.unshift(symbol);
        }
        query += ' ORDER BY timestamp DESC LIMIT ?';
        break;
        
      case 'decisions':
        query = 'SELECT * FROM decision_logs';
        if (strategy) {
          query += ' WHERE strategy = ?';
          params.unshift(strategy);
        }
        query += ' ORDER BY timestamp DESC LIMIT ?';
        break;
        
      case 'risk':
        query = 'SELECT * FROM risk_logs ORDER BY timestamp DESC LIMIT ?';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid log type'
        });
    }
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error'
        });
      }
      
      res.json({
        success: true,
        data: rows,
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// دوال مساعدة
function generateOrderId() {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateLogId() {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function logTrade(tradeData) {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO trade_logs (
      id, symbol, action, price, size, reason, confidence, timestamp,
      strategy, is_dry_run, order_id, executed_price, executed_size, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
      tradeData.id,
      tradeData.symbol,
      tradeData.action,
      tradeData.price,
      tradeData.size,
      tradeData.reason,
      tradeData.confidence,
      tradeData.timestamp,
      tradeData.strategy,
      tradeData.is_dry_run,
      tradeData.order_id,
      tradeData.executed_price,
      tradeData.executed_size,
      tradeData.status
    ];
    
    db.run(query, values, function(err) {
      if (err) {
        console.error('Error logging trade:', err);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

async function logDecision(decisionData) {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO decision_logs (
      id, symbol, strategy, market_condition, indicators, decision,
      confidence, reasons, timestamp, processing_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
      decisionData.id,
      decisionData.symbol,
      decisionData.strategy,
      decisionData.market_condition,
      JSON.stringify(decisionData.indicators),
      decisionData.decision,
      decisionData.confidence,
      JSON.stringify(decisionData.reasons),
      decisionData.timestamp,
      decisionData.processing_time
    ];
    
    db.run(query, values, function(err) {
      if (err) {
        console.error('Error logging decision:', err);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

async function logRisk(riskData) {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO risk_logs (
      id, action, current_drawdown, daily_loss, position_size,
      risk_level, approved, reason, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
      riskData.id,
      riskData.action,
      riskData.current_drawdown,
      riskData.daily_loss,
      riskData.position_size,
      riskData.risk_level,
      riskData.approved,
      riskData.reason,
      riskData.timestamp
    ];
    
    db.run(query, values, function(err) {
      if (err) {
        console.error('Error logging risk:', err);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

async function logError(errorData) {
  console.error(`[ERROR] ${errorData.action}: ${errorData.error}`, errorData.details);
  
  // يمكن إضافة تسجيل الأخطاء في قاعدة البيانات هنا
}

async function executeBinanceOrder(orderData) {
  // تنفيذ أمر حقيقي عبر Binance API
  // هذا يتطلب استخدام مفاتيح API الحقيقية
  const signature = require('./utils/signature');
  
  const timestamp = Date.now();
  const queryString = `symbol=${orderData.symbol}&side=${orderData.side}&type=${orderData.type}&quantity=${orderData.quantity}&timestamp=${timestamp}`;
  
  if (orderData.price) {
    queryString += `&price=${orderData.price}`;
  }
  
  const sig = signature.createSignature(queryString);
  
  const fetch = (await import('node-fetch')).default;
  const response = await fetch('https://api.binance.com/api/v3/order', {
    method: 'POST',
    headers: {
      'X-MBX-APIKEY': process.env.BINANCE_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `${queryString}&signature=${sig}`
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Binance API error: ${error.msg}`);
  }
  
  return await response.json();
}

async function getBinanceAccountInfo() {
  const signature = require('./utils/signature');
  
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const sig = signature.createSignature(queryString);
  
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(`https://api.binance.com/api/v3/account?${queryString}&signature=${sig}`, {
    headers: {
      'X-MBX-APIKEY': process.env.BINANCE_API_KEY
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Binance API error: ${error.msg}`);
  }
  
  return await response.json();
}

// إنشاء مجلد السجلات
const fs = require('fs');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// بدء الخادم
app.listen(PORT, () => {
  console.log(`🚀 Ellen Bot Backend running on port ${PORT}`);
  console.log(`📊 Mode: ${process.env.DRY_RUN === 'true' ? 'DRY_RUN (Safe Testing)' : 'LIVE (Real Trading)'}`);
  console.log(`🔒 Security: Frontend token authentication enabled`);
  console.log(`📝 Logging: SQLite database at ${dbPath}`);
});

// معالجة الإغلاق الآمن
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Ellen Bot Backend...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('📝 Database connection closed.');
    }
    process.exit(0);
  });
});