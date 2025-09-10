const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const isDryRun = process.env.DRY_RUN === 'true';

// إعدادات التشفير
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

// تخزين مؤقت للمفاتيح المشفرة (في الإنتاج، استخدم Redis أو Secrets Manager)
let encryptedApiKeys = {
  apiKey: null,
  secretKey: null,
  testnet: true,
  validated: false,
  timestamp: null
};

// إعداد الأمان
app.use(helmet({
  contentSecurityPolicy: false, // تعطيل CSP للتطوير
  crossOriginEmbedderPolicy: false
}));

// إعداد Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 دقيقة
  max: parseInt(process.env.RATE_LIMIT_REQUESTS) || 100, // 100 طلب في الدقيقة
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
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

  // إضافة فهارس للأداء
  db.run(`CREATE INDEX IF NOT EXISTS idx_trade_logs_symbol ON trade_logs(symbol)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trade_logs_timestamp ON trade_logs(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_decision_logs_strategy ON decision_logs(strategy)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_risk_logs_timestamp ON risk_logs(timestamp)`);
});

// Middleware
app.use(cors());
app.use(express.json());

// Middleware للتحقق من الأمان
const authMiddleware = (req, res, next) => {
  const frontendToken = req.headers['x-frontend-token'];
  const expectedToken = process.env.FRONTEND_TOKEN || 'ellen-bot-secure-token';
  
  if (!frontendToken || frontendToken !== expectedToken) {
    console.warn(`[SECURITY] Unauthorized access attempt from ${req.ip}`);
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized access',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Middleware للتحقق من DRY_RUN للعمليات الحساسة
const dryRunMiddleware = (req, res, next) => {
  if (!isDryRun && req.path.includes('/order')) {
    console.warn(`[SECURITY] Live trading attempt detected: ${req.method} ${req.path}`);
    
    // في الإنتاج، يمكن إضافة تأكيد إضافي هنا
    const confirmation = req.headers['x-live-trading-confirmed'];
    if (!confirmation) {
      return res.status(403).json({
        success: false,
        error: 'Live trading requires explicit confirmation',
        isDryRun: false,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  next();
};
// Middleware للتسجيل
const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // تسجيل الطلب والاستجابة
    const logData = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'],
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime
    };
    
    // تسجيل مفصل للعمليات الحساسة فقط
    if (req.path.includes('/order') || req.path.includes('/account')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, logData);
    }
    
    originalSend.call(this, data);
  };
  
  req.startTime = Date.now();
  next();
};

app.use(auditMiddleware);
app.use(dryRunMiddleware);

// Routes العامة (لا تحتاج مصادقة)
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Ellen Bot Backend is running',
    timestamp: new Date().toISOString(),
    mode: isDryRun ? 'DRY_RUN' : 'LIVE',
    version: '1.0.0',
    uptime: process.uptime(),
    nodeVersion: process.version
  });
});

// اختبار الاتصال مع Binance (آمن)
app.get('/api/binance/test', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const startTime = Date.now();
    
    const response = await fetch('https://api.binance.com/api/v3/ping');
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      res.json({
        success: true,
        data: {
          status: 'connected',
          latency: `${latency}ms`,
          server: response.headers.get('server')
        },
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(`Binance API error: ${response.status}`);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
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

    // استدعاء Binance API للبيانات الحقيقية
    const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 100}`;
    
    const fetch = (await import('node-fetch')).default;
    
    // استخدام retry logic للطلبات الخارجية
    const response = await retryFetch(binanceUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Ellen-Bot/1.0'
      }
    });
    
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

// الحصول على عمق السوق (Order Book)
app.get('/api/depth', async (req, res) => {
  try {
    const { symbol, limit } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
    }

    // استدعاء Binance API للحصول على Order Book
    const binanceUrl = `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${limit || 100}`;
    
    const fetch = (await import('node-fetch')).default;
    
    const response = await retryFetch(binanceUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Ellen-Bot/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // تحويل البيانات إلى تنسيق مناسب
    const orderBook = {
      lastUpdateId: data.lastUpdateId,
      bids: data.bids.map(bid => ({
        price: parseFloat(bid[0]),
        quantity: parseFloat(bid[1])
      })),
      asks: data.asks.map(ask => ({
        price: parseFloat(ask[0]),
        quantity: parseFloat(ask[1])
      })),
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      data: orderBook,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching order book:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// الحصول على أسعار السوق الحالية
app.get('/api/ticker/price', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    let binanceUrl;
    if (symbol) {
      binanceUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
    } else {
      binanceUrl = 'https://api.binance.com/api/v3/ticker/price';
    }
    
    const fetch = (await import('node-fetch')).default;
    
    const response = await retryFetch(binanceUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Ellen-Bot/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching ticker price:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Routes المحمية (تحتاج مصادقة)
app.use('/api/order*', authMiddleware);
app.use('/api/account*', authMiddleware);
app.use('/api/logs*', authMiddleware);
app.use('/api/trading*', authMiddleware);

// نقطة نهاية آمنة لتعيين مفاتيح Binance API
app.post('/api/settings/binance-api-keys', async (req, res) => {
  try {
    const { apiKey, secretKey, testnet = true } = req.body;
    
    // التحقق من صحة المدخلات
    if (!apiKey || !secretKey) {
      return res.status(400).json({
        success: false,
        error: 'API Key and Secret Key are required',
        timestamp: new Date().toISOString()
      });
    }

    // التحقق من تنسيق المفاتيح
    if (apiKey.length < 20 || secretKey.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[SECURITY] API keys validation started for ${testnet ? 'testnet' : 'live'} environment`);

    // التحقق من صحة المفاتيح مع Binance
    const validationResult = await validateBinanceApiKeys(apiKey, secretKey, testnet);
    
    if (!validationResult.valid) {
      console.warn(`[SECURITY] API keys validation failed: ${validationResult.error}`);
      return res.status(400).json({
        success: false,
        error: validationResult.error,
        timestamp: new Date().toISOString()
      });
    }

    // تشفير وحفظ المفاتيح
    try {
      encryptedApiKeys = {
        apiKey: encryptData(apiKey),
        secretKey: encryptData(secretKey),
        testnet,
        validated: true,
        timestamp: new Date().toISOString()
      };

      console.log(`[SECURITY] ✅ API keys encrypted and stored securely`);
      console.log(`[SECURITY] Permissions: ${validationResult.permissions?.join(', ') || 'Unknown'}`);

      res.json({
        success: true,
        data: {
          validated: true,
          testnet,
          permissions: validationResult.permissions || [],
          timestamp: encryptedApiKeys.timestamp
        },
        timestamp: new Date().toISOString()
      });

    } catch (encryptionError) {
      console.error('[SECURITY] Encryption failed:', encryptionError);
      res.status(500).json({
        success: false,
        error: 'Failed to encrypt API keys',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('[SECURITY] API keys setup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during API key setup',
      timestamp: new Date().toISOString()
    });
  }
});

// مسح مفاتيح API
app.delete('/api/settings/binance-api-keys', (req, res) => {
  try {
    encryptedApiKeys = {
      apiKey: null,
      secretKey: null,
      testnet: true,
      validated: false,
      timestamp: null
    };
    
    console.log('[SECURITY] API keys cleared from server');
    
    res.json({
      success: true,
      message: 'API keys cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SECURITY] Failed to clear API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear API keys',
      timestamp: new Date().toISOString()
    });
  }
});

// فحص حالة اتصال Binance
app.get('/api/binance/connection-status', (req, res) => {
  try {
    const hasKeys = encryptedApiKeys.apiKey && encryptedApiKeys.secretKey;
    
    res.json({
      success: true,
      data: {
        connected: hasKeys && encryptedApiKeys.validated,
        testnet: encryptedApiKeys.testnet,
        permissions: hasKeys ? ['SPOT'] : [],
        lastValidation: encryptedApiKeys.timestamp
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check connection status',
      timestamp: new Date().toISOString()
    });
  }
});

// تنفيذ أمر تداول
app.post('/api/order', async (req, res) => {
  try {
    const { symbol, side, type, quantity, price } = req.body;
    
    // التحقق من صحة البيانات
    if (!symbol || !side || !type || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required order parameters',
        timestamp: new Date().toISOString()
      });
    }

    // التحقق من صحة القيم
    if (quantity <= 0 || (price && price <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quantity or price values',
        timestamp: new Date().toISOString()
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
      if (!encryptedApiKeys.validated) {
        return res.status(400).json({
          success: false,
          error: 'Binance API keys not configured or validated',
          timestamp: new Date().toISOString()
        });
      }
      
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
      timestamp,
      mode: isDryRun ? 'DRY_RUN' : 'LIVE'
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

// إلغاء أمر
app.delete('/api/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { symbol } = req.query;
    
    if (!orderId || !symbol) {
      return res.status(400).json({
        success: false,
        error: 'Order ID and symbol are required',
        timestamp: new Date().toISOString()
      });
    }

    let result;
    
    if (isDryRun) {
      // محاكاة إلغاء الأمر
      result = {
        symbol,
        origClientOrderId: orderId,
        orderId: parseInt(orderId.split('_')[1]) || Date.now(),
        status: 'CANCELED'
      };
      
      console.log(`[DRY_RUN] Simulated order cancellation: ${orderId}`);
    } else {
      // إلغاء حقيقي عبر Binance API
      result = await cancelBinanceOrder(symbol, orderId);
    }

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
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
            { asset: 'USDT', free: '10000.00000000', locked: '0.00000000' },
            { asset: 'BTC', free: '0.00000000', locked: '0.00000000' },
            { asset: 'ETH', free: '0.00000000', locked: '0.00000000' },
            { asset: 'BNB', free: '0.00000000', locked: '0.00000000' }
          ],
          canTrade: true,
          canWithdraw: false,
          canDeposit: false,
          updateTime: Date.now(),
          accountType: 'PAPER_TRADING'
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

// الحصول على الأوامر المفتوحة
app.get('/api/orders/open', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    let result;
    
    if (isDryRun) {
      // إرجاع أوامر وهمية للاختبار
      result = [];
    } else {
      result = await getBinanceOpenOrders(symbol);
    }

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting open orders:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
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

// تسجيل صفقة
app.post('/api/logs/trade', async (req, res) => {
  try {
    const logEntry = {
      id: generateLogId(),
      ...req.body,
      timestamp: new Date().toISOString()
    };
    
    await logTrade(logEntry);
    
    res.json({
      success: true,
      data: { logId: logEntry.id },
      timestamp: logEntry.timestamp
    });
    
  } catch (error) {
    console.error('Error logging trade:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
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

// إحصائيات النظام
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
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

// دالة retry للطلبات الخارجية
async function retryFetch(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url, {
        timeout: options.timeout || 10000,
        ...options
      });
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        
        console.warn(`[RETRY] Rate limited. Waiting ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      
      return response;
      
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[RETRY] Request failed. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// دوال مساعدة
function generateOrderId() {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateLogId() {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function getSystemStats() {
  return new Promise((resolve, reject) => {
    const queries = [
      'SELECT COUNT(*) as total_trades FROM trade_logs',
      'SELECT COUNT(*) as total_decisions FROM decision_logs',
      'SELECT COUNT(*) as total_risk_checks FROM risk_logs',
      'SELECT COUNT(*) as successful_trades FROM trade_logs WHERE status = "FILLED"',
      'SELECT AVG(processing_time) as avg_processing_time FROM decision_logs'
    ];
    
    Promise.all(queries.map(query => 
      new Promise((resolve, reject) => {
        db.get(query, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      })
    )).then(results => {
      resolve({
        totalTrades: results[0].total_trades,
        totalDecisions: results[1].total_decisions,
        totalRiskChecks: results[2].total_risk_checks,
        successfulTrades: results[3].successful_trades,
        avgProcessingTime: results[4].avg_processing_time,
        mode: isDryRun ? 'DRY_RUN' : 'LIVE',
        uptime: process.uptime()
      });
    }).catch(reject);
  });
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

async function cancelBinanceOrder(symbol, orderId) {
  const signature = require('./utils/signature');
  
  const timestamp = Date.now();
  const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;
  const sig = signature.createSignature(queryString);
  
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(`${process.env.BINANCE_BASE_URL}/v3/order?${queryString}&signature=${sig}`, {
    method: 'DELETE',
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

async function getBinanceOpenOrders(symbol) {
  const signature = require('./utils/signature');
  
  const timestamp = Date.now();
  let queryString = `timestamp=${timestamp}`;
  if (symbol) {
    queryString = `symbol=${symbol}&${queryString}`;
  }
  
  const sig = signature.createSignature(queryString);
  
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(`${process.env.BINANCE_BASE_URL}/v3/openOrders?${queryString}&signature=${sig}`, {
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

async function executeBinanceOrder(orderData) {
  // تنفيذ أمر حقيقي عبر Binance API
  // هذا يتطلب استخدام مفاتيح API الحقيقية
  
  if (!encryptedApiKeys.validated) {
    throw new Error('Binance API keys not configured');
  }
  
  // فك تشفير المفاتيح للاستخدام
  const apiKey = decryptData(encryptedApiKeys.apiKey);
  const secretKey = decryptData(encryptedApiKeys.secretKey);
  
  const signature = require('./utils/signature');
  
  const timestamp = Date.now();
  let queryString = `symbol=${orderData.symbol}&side=${orderData.side}&type=${orderData.type}&quantity=${orderData.quantity}&timestamp=${timestamp}`;
  
  if (orderData.price) {
    queryString += `&price=${orderData.price}`;
  }
  
  if (orderData.timeInForce) {
    queryString += `&timeInForce=${orderData.timeInForce}`;
  }
  
  const sig = signature.createSignature(queryString);
  
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(`${process.env.BINANCE_BASE_URL}/v3/order`, {
    method: 'POST',
    headers: {
      'X-MBX-APIKEY': apiKey,
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
  if (!encryptedApiKeys.validated) {
    throw new Error('Binance API keys not configured');
  }
  
  const apiKey = decryptData(encryptedApiKeys.apiKey);
  
  const signature = require('./utils/signature');
  
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const sig = signature.createSignature(queryString);
  
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(`${process.env.BINANCE_BASE_URL}/v3/account?${queryString}&signature=${sig}`, {
    headers: {
      'X-MBX-APIKEY': apiKey
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Binance API error: ${error.msg}`);
  }
  
  return await response.json();
}

// دوال التشفير الآمنة
function encryptData(text) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('[ENCRYPTION] Failed to encrypt data:', error);
    throw new Error('Encryption failed');
  }
}

function decryptData(encryptedData) {
  try {
    if (!encryptedData || !encryptedData.encrypted) {
      throw new Error('No encrypted data provided');
    }
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[DECRYPTION] Failed to decrypt data:', error);
    throw new Error('Decryption failed');
  }
}

// التحقق من صحة مفاتيح Binance API
async function validateBinanceApiKeys(apiKey, secretKey, testnet = true) {
  try {
    const baseUrl = testnet 
      ? 'https://testnet.binance.vision/api'
      : 'https://api.binance.com/api';
    
    // إنشاء توقيع للاختبار
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('hex');
    
    // اختبار الاتصال مع account endpoint
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${baseUrl}/v3/account?${queryString}&signature=${signature}`, {
      headers: {
        'X-MBX-APIKEY': apiKey
      },
      timeout: 10000
    });
    
    if (response.ok) {
      const accountData = await response.json();
      
      return {
        valid: true,
        permissions: accountData.permissions || ['SPOT'],
        accountType: accountData.accountType || 'SPOT',
        canTrade: accountData.canTrade || false
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      
      let errorMessage = 'Invalid API credentials';
      if (response.status === 401) {
        errorMessage = 'API key or signature invalid';
      } else if (response.status === 403) {
        errorMessage = 'API key does not have required permissions';
      } else if (errorData.msg) {
        errorMessage = errorData.msg;
      }
      
      return {
        valid: false,
        error: errorMessage
      };
    }
    
  } catch (error) {
    console.error('[VALIDATION] Binance API validation failed:', error);
    
    let errorMessage = 'Connection failed';
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Network connection failed';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timeout - please try again';
    }
    
    return {
      valid: false,
      error: errorMessage
    };
  }
}

// إنشاء مجلد السجلات
const fs = require('fs');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// بدء الخادم
app.listen(PORT, () => {
  console.log(`\n🚀 Ellen Bot Backend Server Started`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`📊 Mode: ${isDryRun ? '🧪 DRY_RUN (Safe Testing)' : '⚠️  LIVE (Real Trading)'}`);
  console.log(`🔒 Security: Frontend token authentication enabled`);
  console.log(`📝 Database: SQLite at ${dbPath}`);
  console.log(`🔄 Rate Limiting: ${process.env.RATE_LIMIT_REQUESTS || 100} requests/minute`);
  console.log(`🔐 API Keys: ${encryptedApiKeys.validated ? '✅ Configured and validated' : '❌ Not configured'}`);
  console.log(`🌐 Binance Mode: ${encryptedApiKeys.testnet ? '🧪 Testnet' : '⚠️ Live Trading'}`);
  
  if (isDryRun) {
    console.log(`\n✅ Safe Mode Active - No real trades will be executed`);
  } else {
    console.log(`\n⚠️  WARNING: Live Trading Mode - Real money will be used!`);
  }
  
  console.log(`\n📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔒 Security: API keys encrypted with AES-256`);
  console.log(`📝 Database: SQLite at ${dbPath}`);
  console.log(`🔑 Encryption: ${ENCRYPTION_KEY.length === 64 ? '✅ Strong key' : '⚠️ Weak key'}`);
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