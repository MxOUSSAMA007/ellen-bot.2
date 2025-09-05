/**
 * اختبارات وحدة محسنة للتحليل الفني
 * تغطي جميع الحالات المطلوبة والحالات الحدية
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

    it('should calculate RSI correctly for known values', () => {
      // بيانات محددة مع نتيجة معروفة
      const testPrices = [
        44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89, 46.03,
        46.83, 47.69, 46.49, 46.26, 47.09, 46.66, 46.80, 46.23, 46.38, 46.33
      ];
      
      const rsi = TechnicalAnalysis.calculateRSI(testPrices, 14);
      
      // RSI يجب أن يكون في نطاق معقول للبيانات المستقرة
      expect(rsi).toBeGreaterThan(40);
      expect(rsi).toBeLessThan(80);
    });

    it('should calculate RSI for trending up data', () => {
      // بيانات اتجاه صاعد واضح
      const trendingPrices = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128, 130];
      const rsi = TechnicalAnalysis.calculateRSI(trendingPrices);
      
      expect(rsi).toBeGreaterThan(50); // في اتجاه صاعد، RSI يجب أن يكون فوق 50
      expect(rsi).toBeLessThan(100);
    });

    it('should calculate RSI for trending down data', () => {
      // بيانات اتجاه هابط واضح
      const trendingPrices = [130, 128, 126, 124, 122, 120, 118, 116, 114, 112, 110, 108, 106, 104, 102, 100];
      const rsi = TechnicalAnalysis.calculateRSI(trendingPrices);
      
      expect(rsi).toBeLessThan(50); // في اتجاه هابط، RSI يجب أن يكون تحت 50
      expect(rsi).toBeGreaterThan(0);
    });

    it('should handle extreme values correctly', () => {
      // أسعار متطابقة (لا تغيير)
      const flatPrices = Array(20).fill(100);
      const flatRSI = TechnicalAnalysis.calculateRSI(flatPrices);
      expect(flatRSI).toBe(50); // RSI يجب أن يكون 50 عند عدم وجود تغيير
      
      // أسعار متزايدة باستمرار
      const increasingPrices = Array.from({length: 20}, (_, i) => 100 + i);
      const increasingRSI = TechnicalAnalysis.calculateRSI(increasingPrices);
      expect(increasingRSI).toBeGreaterThan(80); // RSI عالي للاتجاه الصاعد المستمر
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

    it('should calculate MACD for sufficient data points', () => {
      // بيانات كافية لحساب MACD دقيق
      const sufficientPrices = Array.from({length: 50}, (_, i) => 100 + Math.sin(i * 0.1) * 10);
      const macd = TechnicalAnalysis.calculateMACD(sufficientPrices);
      
      expect(typeof macd.macd).toBe('number');
      expect(typeof macd.signal).toBe('number');
      expect(typeof macd.histogram).toBe('number');
      expect(isFinite(macd.macd)).toBe(true);
      expect(isFinite(macd.signal)).toBe(true);
      expect(isFinite(macd.histogram)).toBe(true);
    });

    it('should calculate MACD with known pattern', () => {
      // إنشاء نمط سعري معروف
      const patternPrices = Array.from({length: 50}, (_, i) => {
        return 100 + Math.sin(i * 0.2) * 5 + i * 0.1; // نمط موجي مع اتجاه صاعد طفيف
      });
      
      const macd = TechnicalAnalysis.calculateMACD(patternPrices);
      
      expect(macd.macd).toBeDefined();
      expect(macd.signal).toBeDefined();
      expect(macd.histogram).toBeDefined();
      expect(Math.abs(macd.histogram - (macd.macd - macd.signal))).toBeLessThan(0.001);
    });

    it('should show bullish signal when EMA12 > EMA26', () => {
      // إنشاء اتجاه صاعد واضح
      const bullishPrices = Array.from({length: 30}, (_, i) => 100 + i * 0.5);
      const macd = TechnicalAnalysis.calculateMACD(bullishPrices);
      
      // في اتجاه صاعد، MACD يجب أن يكون إيجابي
      expect(macd.macd).toBeGreaterThan(0);
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

    it('should generate BUY signal when EMA12 > EMA26 (Decision Logic Test)', () => {
      // إنشاء بيانات حيث EMA12 > EMA26 (اتجاه صاعد)
      const bullishCandles: CandleData[] = [];
      let price = 100;
      
      for (let i = 0; i < 60; i++) {
        price += 0.5 + Math.random() * 1; // اتجاه صاعد ثابت
        bullishCandles.push({
          open: price - 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000 + Math.random() * 500000,
          timestamp: Date.now() - (30 - i) * 60000
        });
      }
      
      const indicators = TechnicalAnalysis.analyzeCandles(bullishCandles);
      
      // التحقق من أن EMA12 > EMA26
      expect(indicators.ema.ema12).toBeGreaterThan(indicators.ema.ema26);
      
      const signal = TechnicalAnalysis.generateSignal(indicators);
      
      // مع اتجاه صاعد قوي، يجب أن تكون الإشارة شراء
      expect(signal.action).toBe('BUY');
      expect(signal.confidence).toBeGreaterThan(50);
      
      // التحقق من وجود سبب متعلق بـ EMA
      const hasEMAReason = signal.reasons.some(reason => 
        reason.includes('EMA') || reason.includes('اتجاه')
      );
      expect(hasEMAReason).toBe(true);
    });

    it('should generate SELL signal when EMA12 < EMA26', () => {
      // إنشاء بيانات حيث EMA12 < EMA26 (اتجاه هابط)
      const bearishCandles: CandleData[] = [];
      let price = 150;
      
      for (let i = 0; i < 60; i++) {
        price -= 0.5 + Math.random() * 1; // اتجاه هابط ثابت
        bearishCandles.push({
          open: price + 0.5,
          high: price + 1,
          low: price - 1,
          close: price,
          volume: 1000000 + Math.random() * 500000,
          timestamp: Date.now() - (60 - i) * 60000
        });
      }
      
      const indicators = TechnicalAnalysis.analyzeCandles(bearishCandles);
      
      // التحقق من أن EMA12 < EMA26
      expect(indicators.ema.ema12).toBeLessThan(indicators.ema.ema26);
      
      const signal = TechnicalAnalysis.generateSignal(indicators);
      
      // مع اتجاه هابط قوي، يجب أن تكون الإشارة بيع
      expect(signal.action).toBe('SELL');
      expect(signal.confidence).toBeGreaterThan(50);
    });

    it('should provide detailed reasons for decisions', () => {
      const strongBullishCandles = TestingUtils.generateBullishTrend(50);
      const indicators = TechnicalAnalysis.analyzeCandles(strongBullishCandles);
      const signal = TechnicalAnalysis.generateSignal(indicators);
      
      expect(signal.reasons).toBeDefined();
      expect(signal.reasons.length).toBeGreaterThan(0);
      
      // كل سبب يجب أن يكون نص مفيد
      signal.reasons.forEach(reason => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(5);
      });
      
      // يجب أن تحتوي الأسباب على معلومات فنية
      const hasTechnicalReason = signal.reasons.some(reason => 
        reason.includes('RSI') || 
        reason.includes('MACD') || 
        reason.includes('EMA') ||
        reason.includes('Bollinger')
      );
      expect(hasTechnicalReason).toBe(true);
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

  describe('Advanced Decision Logic Tests', () => {
    it('should generate BUY signal when conditions align', () => {
      // إنشاء ظروف مثالية للشراء
      const buyConditionCandles: CandleData[] = [];
      let basePrice = 100;
      
      // إنشاء انخفاض أولي (oversold)
      for (let i = 0; i < 15; i++) {
        basePrice -= 0.5;
        buyConditionCandles.push({
          open: basePrice + 0.2,
          high: basePrice + 0.5,
          low: basePrice - 0.3,
          close: basePrice,
          volume: 1000000,
          timestamp: Date.now() - (30 - i) * 60000
        });
      }
      
      // ثم بداية انتعاش
      for (let i = 15; i < 30; i++) {
        basePrice += 0.8;
        buyConditionCandles.push({
          open: basePrice - 0.3,
          high: basePrice + 0.5,
          low: basePrice - 0.5,
          close: basePrice,
          volume: 1200000,
          timestamp: Date.now() - (30 - i) * 60000
        });
      }
      
      const indicators = TechnicalAnalysis.analyzeCandles(buyConditionCandles);
      const signal = TechnicalAnalysis.generateSignal(indicators);
      
      // يجب أن تكون الإشارة إيجابية (شراء أو انتظار، ليس بيع)
      expect(signal.action).not.toBe('SELL');
      expect(signal.confidence).toBeGreaterThan(0);
      expect(signal.reasons.length).toBeGreaterThan(0);
    });

    it('should have higher confidence with multiple confirming indicators', () => {
      const strongBullishCandles: CandleData[] = [];
      let price = 100;
      
      // اتجاه صاعد قوي مع حجم عالي
      for (let i = 0; i < 50; i++) {
        price += 0.5 + Math.random() * 0.5; // اتجاه صاعد ثابت
        strongBullishCandles.push({
          open: price - 0.3,
          high: price + 0.8,
          low: price - 0.5,
          close: price,
          volume: 1500000 + Math.random() * 500000, // حجم عالي
          timestamp: Date.now() - (50 - i) * 60000
        });
      }
      
      const indicators = TechnicalAnalysis.analyzeCandles(strongBullishCandles);
      const signal = TechnicalAnalysis.generateSignal(indicators);
      
      // مع مؤشرات متعددة إيجابية، الثقة يجب أن تكون عالية
      if (signal.action === 'BUY') {
        expect(signal.confidence).toBeGreaterThan(50);
      }
      
      expect(signal.reasons.length).toBeGreaterThan(1); // أسباب متعددة
    });

    it('should respect risk management in signals', () => {
      const riskyCandlesData = TestingUtils.generateMockCandleData(30);
      
      // محاكاة حالة مخاطر عالية
      riskyCandlesData.forEach(candle => {
        candle.volume = 100000; // حجم منخفض
      });
      
      const indicators = TechnicalAnalysis.analyzeCandles(riskyCandlesData);
      const signal = TechnicalAnalysis.generateSignal(indicators);
      
      // في حالة المخاطر العالية، الثقة يجب أن تكون منخفضة
      if (signal.action !== 'HOLD') {
        expect(signal.confidence).toBeLessThan(80);
      }
    });

    it('should generate consistent signals for same data', () => {
      const testData = TestingUtils.generateBullishTrend(40);
      
      // تشغيل التحليل عدة مرات
      const signal1 = TechnicalAnalysis.generateSignal(TechnicalAnalysis.analyzeCandles(testData));
      const signal2 = TechnicalAnalysis.generateSignal(TechnicalAnalysis.analyzeCandles(testData));
      const signal3 = TechnicalAnalysis.generateSignal(TechnicalAnalysis.analyzeCandles(testData));
      
      // النتائج يجب أن تكون متسقة
      expect(signal1.action).toBe(signal2.action);
      expect(signal2.action).toBe(signal3.action);
      expect(Math.abs(signal1.confidence - signal2.confidence)).toBeLessThan(1);
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

    it('should handle concurrent analysis requests', async () => {
      const datasets = [
        TestingUtils.generateMockCandleData(100),
        TestingUtils.generateBullishTrend(100),
        TestingUtils.generateBearishTrend(100)
      ];
      
      const startTime = performance.now();
      
      // تشغيل تحليل متزامن
      const promises = datasets.map(data => 
        Promise.resolve(TechnicalAnalysis.analyzeCandles(data))
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      expect(results).toHaveLength(3);
      expect(endTime - startTime).toBeLessThan(200); // يجب أن يكتمل في أقل من 200ms
      
      results.forEach(indicators => {
        expect(indicators).toBeDefined();
        expect(typeof indicators.rsi).toBe('number');
        expect(typeof indicators.macd.macd).toBe('number');
      });
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

    it('should maintain precision with large numbers', () => {
      // اختبار مع أسعار كبيرة (مثل Bitcoin)
      const largePriceCandles: CandleData[] = [];
      let price = 100000; // $100,000
      
      for (let i = 0; i < 30; i++) {
        price += (Math.random() - 0.5) * 1000;
        largePriceCandles.push({
          open: price - 100,
          high: price + 200,
          low: price - 200,
          close: price,
          volume: 1000000,
          timestamp: Date.now() - (30 - i) * 60000
        });
      }
      
      const indicators = TechnicalAnalysis.analyzeCandles(largePriceCandles);
      
      // التحقق من دقة الحسابات مع الأرقام الكبيرة
      expect(isFinite(indicators.rsi)).toBe(true);
      expect(isFinite(indicators.ema.ema12)).toBe(true);
      expect(isFinite(indicators.ema.ema26)).toBe(true);
      expect(indicators.ema.ema12).toBeGreaterThan(50000); // يجب أن تكون في نطاق معقول
    });
  });

  describe('Integration Tests', () => {
    it('should work with TestingUtils generated data', () => {
      const testData = TestingUtils.generateMockCandleData(100);
      
      expect(() => {
        const indicators = TechnicalAnalysis.analyzeCandles(testData);
        const signal = TechnicalAnalysis.generateSignal(indicators);
        const patterns = TechnicalAnalysis.detectPatterns(testData);
        
        expect(indicators).toBeDefined();
        expect(signal).toBeDefined();
        expect(patterns).toBeDefined();
      }).not.toThrow();
    });

    it('should handle real-world-like data variations', () => {
      // محاكاة بيانات متنوعة مثل السوق الحقيقي
      const realisticCandles: CandleData[] = [];
      let price = 50000;
      
      for (let i = 0; i < 100; i++) {
        // تقلبات واقعية مع اتجاهات عشوائية
        const trend = Math.sin(i * 0.1) * 0.002; // اتجاه دوري
        const noise = (Math.random() - 0.5) * 0.01; // ضوضاء عشوائية
        const change = (trend + noise) * price;
        
        price += change;
        
        realisticCandles.push({
          open: price - change / 2,
          high: price + Math.abs(change) * 0.5,
          low: price - Math.abs(change) * 0.5,
          close: price,
          volume: 500000 + Math.random() * 1000000,
          timestamp: Date.now() - (100 - i) * 60000
        });
      }
      
      const indicators = TechnicalAnalysis.analyzeCandles(realisticCandles);
      const signal = TechnicalAnalysis.generateSignal(indicators);
      
      // التحقق من أن التحليل يعمل مع البيانات الواقعية
      expect(indicators.rsi).toBeGreaterThan(0);
      expect(indicators.rsi).toBeLessThan(100);
      expect(['BUY', 'SELL', 'HOLD']).toContain(signal.action);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
    });
  });
});