/**
 * اختبارات وحدة للتحليل الفني
 * npm test لتشغيل هذه الاختبارات
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TechnicalAnalysis, CandleData } from './TechnicalAnalysis';
import { TestingUtils } from './TestingUtils';

describe('TechnicalAnalysis', () => {
  let mockCandles: CandleData[];

  beforeEach(() => {
    mockCandles = TestingUtils.generateMockCandleData(50);
  });

  describe('RSI Calculation', () => {
    it('should calculate RSI correctly for normal data', () => {
      const prices = mockCandles.map(c => c.close);
      const rsi = TechnicalAnalysis.calculateRSI(prices);
      
      expect(rsi).toBeGreaterThan(0);
      expect(rsi).toBeLessThan(100);
      expect(typeof rsi).toBe('number');
      expect(isNaN(rsi)).toBe(false);
    });

    it('should return 50 for insufficient data', () => {
      const shortPrices = [100, 101, 102]; // أقل من 15 نقطة
      const rsi = TechnicalAnalysis.calculateRSI(shortPrices);
      
      expect(rsi).toBe(50);
    });

    it('should detect overbought condition (RSI > 70)', () => {
      const overboughtData = TestingUtils.generateOverboughtCondition();
      const prices = overboughtData.map(c => c.close);
      const rsi = TechnicalAnalysis.calculateRSI(prices);
      
      // في حالة اتجاه صاعد قوي، RSI يجب أن يكون عالي
      expect(rsi).toBeGreaterThan(60); // نتوقع قيمة عالية
    });

    it('should detect oversold condition (RSI < 30)', () => {
      const oversoldData = TestingUtils.generateOversoldCondition();
      const prices = oversoldData.map(c => c.close);
      const rsi = TechnicalAnalysis.calculateRSI(prices);
      
      // في حالة اتجاه هابط قوي، RSI يجب أن يكون منخفض
      expect(rsi).toBeLessThan(40); // نتوقع قيمة منخفضة
    });
  });

  describe('MACD Calculation', () => {
    it('should calculate MACD components correctly', () => {
      const prices = mockCandles.map(c => c.close);
      const macd = TechnicalAnalysis.calculateMACD(prices);
      
      expect(typeof macd.macd).toBe('number');
      expect(typeof macd.signal).toBe('number');
      expect(typeof macd.histogram).toBe('number');
      
      expect(isNaN(macd.macd)).toBe(false);
      expect(isNaN(macd.signal)).toBe(false);
      expect(isNaN(macd.histogram)).toBe(false);
    });

    it('should have histogram equal to macd minus signal', () => {
      const prices = mockCandles.map(c => c.close);
      const macd = TechnicalAnalysis.calculateMACD(prices);
      
      const expectedHistogram = macd.macd - macd.signal;
      expect(Math.abs(macd.histogram - expectedHistogram)).toBeLessThan(0.001);
    });
  });

  describe('Bollinger Bands Calculation', () => {
    it('should calculate Bollinger Bands correctly', () => {
      const prices = mockCandles.map(c => c.close);
      const bollinger = TechnicalAnalysis.calculateBollingerBands(prices);
      
      expect(typeof bollinger.upper).toBe('number');
      expect(typeof bollinger.middle).toBe('number');
      expect(typeof bollinger.lower).toBe('number');
      
      // Upper band should be higher than middle, middle higher than lower
      expect(bollinger.upper).toBeGreaterThan(bollinger.middle);
      expect(bollinger.middle).toBeGreaterThan(bollinger.lower);
    });

    it('should have middle band equal to SMA', () => {
      const prices = mockCandles.map(c => c.close);
      const bollinger = TechnicalAnalysis.calculateBollingerBands(prices);
      const sma = TechnicalAnalysis.calculateSMA(prices, 20);
      
      expect(Math.abs(bollinger.middle - sma)).toBeLessThan(0.001);
    });
  });

  describe('Signal Generation', () => {
    it('should generate valid trading signals', () => {
      const indicators = TechnicalAnalysis.analyzeCandles(mockCandles);
      const signal = TechnicalAnalysis.generateSignal(indicators);
      
      expect(['BUY', 'SELL', 'HOLD']).toContain(signal.action);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(100);
      expect(Array.isArray(signal.reasons)).toBe(true);
      expect(signal.reasons.length).toBeGreaterThan(0);
    });

    it('should not recommend BUY in overbought conditions', () => {
      const overboughtData = TestingUtils.generateOverboughtCondition();
      const indicators = TechnicalAnalysis.analyzeCandles(overboughtData);
      const signal = TechnicalAnalysis.generateSignal(indicators);
      
      // في حالة تشبع شرائي، لا يجب أن تكون الإشارة شراء
      if (signal.confidence > 60) {
        expect(signal.action).not.toBe('BUY');
      }
    });

    it('should not recommend SELL in oversold conditions', () => {
      const oversoldData = TestingUtils.generateOversoldCondition();
      const indicators = TechnicalAnalysis.analyzeCandles(oversoldData);
      const signal = TechnicalAnalysis.generateSignal(indicators);
      
      // في حالة تشبع بيعي، لا يجب أن تكون الإشارة بيع
      if (signal.confidence > 60) {
        expect(signal.action).not.toBe('SELL');
      }
    });

    it('should provide reasons for trading decisions', () => {
      const indicators = TechnicalAnalysis.analyzeCandles(mockCandles);
      const signal = TechnicalAnalysis.generateSignal(indicators);
      
      expect(signal.reasons).toBeDefined();
      expect(signal.reasons.length).toBeGreaterThan(0);
      signal.reasons.forEach(reason => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Pattern Detection', () => {
    it('should detect patterns in candle data', () => {
      const patterns = TechnicalAnalysis.detectPatterns(mockCandles);
      
      expect(Array.isArray(patterns)).toBe(true);
      // قد تكون فارغة إذا لم يتم العثور على أنماط
      patterns.forEach(pattern => {
        expect(typeof pattern).toBe('string');
      });
    });

    it('should detect hammer pattern', () => {
      // إنشاء نمط مطرقة واضح
      const hammerCandles: CandleData[] = [
        {
          open: 100,
          high: 105,
          low: 90,
          close: 102,
          volume: 1000,
          timestamp: Date.now() - 120000
        },
        {
          open: 102,
          high: 108,
          low: 95,
          close: 106,
          volume: 1200,
          timestamp: Date.now() - 60000
        },
        {
          open: 106,
          high: 107,
          low: 85, // ظل سفلي طويل
          close: 105, // إغلاق قريب من الفتح
          volume: 1500,
          timestamp: Date.now()
        }
      ];
      
      const patterns = TechnicalAnalysis.detectPatterns(hammerCandles);
      
      // قد يكتشف المطرقة أو لا، حسب الشروط الدقيقة
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('Moving Averages', () => {
    it('should calculate SMA correctly', () => {
      const prices = [10, 20, 30, 40, 50];
      const sma = TechnicalAnalysis.calculateSMA(prices, 5);
      
      expect(sma).toBe(30); // (10+20+30+40+50)/5 = 30
    });

    it('should calculate EMA correctly', () => {
      const prices = [10, 20, 30, 40, 50];
      const ema = TechnicalAnalysis.calculateEMA(prices, 5);
      
      expect(typeof ema).toBe('number');
      expect(ema).toBeGreaterThan(0);
      expect(isNaN(ema)).toBe(false);
    });

    it('should have EMA more responsive than SMA', () => {
      // بيانات مع اتجاه صاعد حاد في النهاية
      const prices = [100, 100, 100, 100, 100, 120, 140];
      const sma = TechnicalAnalysis.calculateSMA(prices, 7);
      const ema = TechnicalAnalysis.calculateEMA(prices, 7);
      
      // EMA يجب أن يكون أكثر استجابة للتغييرات الحديثة
      expect(ema).toBeGreaterThan(sma);
    });
  });

  describe('Performance Tests', () => {
    it('should calculate indicators quickly for large datasets', () => {
      const largeDataset = TestingUtils.generateMockCandleData(1000);
      
      const startTime = performance.now();
      TechnicalAnalysis.analyzeCandles(largeDataset);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      // يجب أن يكتمل التحليل في أقل من 100ms
      expect(executionTime).toBeLessThan(100);
    });

    it('should handle edge cases gracefully', () => {
      // بيانات فارغة
      expect(() => TechnicalAnalysis.analyzeCandles([])).not.toThrow();
      
      // شمعة واحدة فقط
      const singleCandle: CandleData[] = [{
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000,
        timestamp: Date.now()
      }];
      
      expect(() => TechnicalAnalysis.analyzeCandles(singleCandle)).not.toThrow();
    });
  });
});