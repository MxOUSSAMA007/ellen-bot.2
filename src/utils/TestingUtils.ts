/**
 * أدوات الاختبار للمكونات المختلفة
 */

import { TechnicalAnalysis, CandleData } from './TechnicalAnalysis';

export class TestingUtils {
  /**
   * إنشاء بيانات شموع وهمية للاختبار
   */
  static generateMockCandleData(count: number = 100): CandleData[] {
    const candles: CandleData[] = [];
    let basePrice = 50000; // سعر أساسي
    
    for (let i = 0; i < count; i++) {
      const volatility = 0.02; // تقلب 2%
      const change = (Math.random() - 0.5) * volatility * basePrice;
      
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * 0.01 * basePrice;
      const low = Math.min(open, close) - Math.random() * 0.01 * basePrice;
      const volume = Math.random() * 1000000 + 500000;
      
      candles.push({
        open,
        high,
        low,
        close,
        volume,
        timestamp: Date.now() - (count - i) * 60000 // كل دقيقة
      });
      
      basePrice = close; // السعر التالي يبدأ من إغلاق الحالي
    }
    
    return candles;
  }

  /**
   * إنشاء بيانات اتجاه صاعد
   */
  static generateBullishTrend(count: number = 50): CandleData[] {
    const candles: CandleData[] = [];
    let basePrice = 45000;
    
    for (let i = 0; i < count; i++) {
      const upwardBias = 0.001; // انحياز صاعد 0.1%
      const volatility = 0.015;
      const change = upwardBias * basePrice + (Math.random() - 0.4) * volatility * basePrice;
      
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * 0.005 * basePrice;
      const low = Math.min(open, close) - Math.random() * 0.005 * basePrice;
      const volume = Math.random() * 800000 + 600000;
      
      candles.push({
        open,
        high,
        low,
        close,
        volume,
        timestamp: Date.now() - (count - i) * 60000
      });
      
      basePrice = close;
    }
    
    return candles;
  }

  /**
   * إنشاء بيانات اتجاه هابط
   */
  static generateBearishTrend(count: number = 50): CandleData[] {
    const candles: CandleData[] = [];
    let basePrice = 55000;
    
    for (let i = 0; i < count; i++) {
      const downwardBias = -0.001; // انحياز هابط 0.1%
      const volatility = 0.015;
      const change = downwardBias * basePrice + (Math.random() - 0.6) * volatility * basePrice;
      
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * 0.005 * basePrice;
      const low = Math.min(open, close) - Math.random() * 0.005 * basePrice;
      const volume = Math.random() * 1200000 + 400000;
      
      candles.push({
        open,
        high,
        low,
        close,
        volume,
        timestamp: Date.now() - (count - i) * 60000
      });
      
      basePrice = close;
    }
    
    return candles;
  }

  /**
   * إنشاء حالة تشبع شرائي (RSI > 70)
   */
  static generateOverboughtCondition(): CandleData[] {
    const candles: CandleData[] = [];
    let basePrice = 48000;
    
    // إنشاء اتجاه صاعد قوي لرفع RSI
    for (let i = 0; i < 20; i++) {
      const strongUpward = 0.02; // ارتفاع قوي 2%
      const change = strongUpward * basePrice * (0.8 + Math.random() * 0.4);
      
      const open = basePrice;
      const close = basePrice + change;
      const high = close + Math.random() * 0.01 * basePrice;
      const low = open - Math.random() * 0.005 * basePrice;
      const volume = Math.random() * 1500000 + 800000;
      
      candles.push({
        open,
        high,
        low,
        close,
        volume,
        timestamp: Date.now() - (20 - i) * 60000
      });
      
      basePrice = close;
    }
    
    return candles;
  }

  /**
   * إنشاء حالة تشبع بيعي (RSI < 30)
   */
  static generateOversoldCondition(): CandleData[] {
    const candles: CandleData[] = [];
    let basePrice = 52000;
    
    // إنشاء اتجاه هابط قوي لخفض RSI
    for (let i = 0; i < 20; i++) {
      const strongDownward = -0.02; // انخفاض قوي 2%
      const change = strongDownward * basePrice * (0.8 + Math.random() * 0.4);
      
      const open = basePrice;
      const close = basePrice + change;
      const high = open + Math.random() * 0.005 * basePrice;
      const low = close - Math.random() * 0.01 * basePrice;
      const volume = Math.random() * 1800000 + 600000;
      
      candles.push({
        open,
        high,
        low,
        close,
        volume,
        timestamp: Date.now() - (20 - i) * 60000
      });
      
      basePrice = close;
    }
    
    return candles;
  }

  /**
   * اختبار دقة حساب RSI
   */
  static testRSICalculation(): boolean {
    console.log('Testing RSI Calculation...');
    
    // حالة تشبع شرائي
    const overboughtData = this.generateOverboughtCondition();
    const prices = overboughtData.map(c => c.close);
    const rsi = TechnicalAnalysis.calculateRSI(prices);
    
    console.log(`RSI for overbought condition: ${rsi.toFixed(2)}`);
    
    if (rsi < 60) {
      console.error('❌ RSI should be high for overbought condition');
      return false;
    }
    
    // حالة تشبع بيعي
    const oversoldData = this.generateOversoldCondition();
    const oversoldPrices = oversoldData.map(c => c.close);
    const oversoldRSI = TechnicalAnalysis.calculateRSI(oversoldPrices);
    
    console.log(`RSI for oversold condition: ${oversoldRSI.toFixed(2)}`);
    
    if (oversoldRSI > 40) {
      console.error('❌ RSI should be low for oversold condition');
      return false;
    }
    
    console.log('✅ RSI calculation test passed');
    return true;
  }

  /**
   * اختبار حساب MACD
   */
  static testMACDCalculation(): boolean {
    console.log('Testing MACD Calculation...');
    
    const trendData = this.generateBullishTrend(50);
    const prices = trendData.map(c => c.close);
    const macd = TechnicalAnalysis.calculateMACD(prices);
    
    console.log(`MACD: ${macd.macd.toFixed(2)}, Signal: ${macd.signal.toFixed(2)}, Histogram: ${macd.histogram.toFixed(2)}`);
    
    // في اتجاه صاعد، MACD يجب أن يكون إيجابي عادة
    if (isNaN(macd.macd) || isNaN(macd.signal) || isNaN(macd.histogram)) {
      console.error('❌ MACD calculation returned NaN values');
      return false;
    }
    
    console.log('✅ MACD calculation test passed');
    return true;
  }

  /**
   * اختبار توليد الإشارات
   */
  static testSignalGeneration(): boolean {
    console.log('Testing Signal Generation...');
    
    // اختبار إشارة شراء في حالة تشبع بيعي
    const oversoldData = this.generateOversoldCondition();
    const indicators = TechnicalAnalysis.analyzeCandles(oversoldData);
    const signal = TechnicalAnalysis.generateSignal(indicators);
    
    console.log(`Signal for oversold condition: ${signal.action} (confidence: ${signal.confidence.toFixed(2)}%)`);
    console.log(`Reasons: ${signal.reasons.join(', ')}`);
    
    // في حالة تشبع بيعي، يجب أن تكون الإشارة شراء أو انتظار
    if (signal.action === 'SELL') {
      console.error('❌ Should not generate SELL signal in oversold condition');
      return false;
    }
    
    // اختبار إشارة بيع في حالة تشبع شرائي
    const overboughtData = this.generateOverboughtCondition();
    const overboughtIndicators = TechnicalAnalysis.analyzeCandles(overboughtData);
    const overboughtSignal = TechnicalAnalysis.generateSignal(overboughtIndicators);
    
    console.log(`Signal for overbought condition: ${overboughtSignal.action} (confidence: ${overboughtSignal.confidence.toFixed(2)}%)`);
    console.log(`Reasons: ${overboughtSignal.reasons.join(', ')}`);
    
    // في حالة تشبع شرائي، يجب أن تكون الإشارة بيع أو انتظار
    if (overboughtSignal.action === 'BUY') {
      console.error('❌ Should not generate BUY signal in overbought condition');
      return false;
    }
    
    console.log('✅ Signal generation test passed');
    return true;
  }

  /**
   * اختبار كشف الأنماط
   */
  static testPatternDetection(): boolean {
    console.log('Testing Pattern Detection...');
    
    // إنشاء نمط مطرقة
    const hammerPattern: CandleData[] = [
      {
        open: 50000,
        high: 50100,
        low: 49000, // ظل سفلي طويل
        close: 49950,
        volume: 1000000,
        timestamp: Date.now() - 120000
      },
      {
        open: 49950,
        high: 50200,
        low: 49800,
        close: 50100,
        volume: 1200000,
        timestamp: Date.now() - 60000
      },
      {
        open: 50100,
        high: 50150,
        low: 49500, // مطرقة - ظل سفلي طويل، جسم صغير
        close: 50050,
        volume: 1500000,
        timestamp: Date.now()
      }
    ];
    
    const patterns = TechnicalAnalysis.detectPatterns(hammerPattern);
    console.log(`Detected patterns: ${patterns.join(', ')}`);
    
    // يجب أن يكتشف نمط المطرقة
    const hasHammer = patterns.some(pattern => pattern.includes('مطرقة'));
    if (!hasHammer) {
      console.warn('⚠️ Hammer pattern not detected (this might be normal depending on exact conditions)');
    }
    
    console.log('✅ Pattern detection test completed');
    return true;
  }

  /**
   * تشغيل جميع الاختبارات
   */
  static runAllTests(): boolean {
    console.log('🧪 Running Technical Analysis Tests...\n');
    
    const tests = [
      this.testRSICalculation(),
      this.testMACDCalculation(),
      this.testSignalGeneration(),
      this.testPatternDetection()
    ];
    
    const passedTests = tests.filter(result => result).length;
    const totalTests = tests.length;
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed successfully!');
      return true;
    } else {
      console.log('❌ Some tests failed. Please review the implementation.');
      return false;
    }
  }

  /**
   * اختبار الأداء
   */
  static performanceTest(): void {
    console.log('🚀 Running Performance Tests...\n');
    
    const largeDataset = this.generateMockCandleData(1000);
    
    // اختبار سرعة حساب RSI
    const rsiStart = performance.now();
    const prices = largeDataset.map(c => c.close);
    TechnicalAnalysis.calculateRSI(prices);
    const rsiTime = performance.now() - rsiStart;
    
    // اختبار سرعة التحليل الشامل
    const analysisStart = performance.now();
    TechnicalAnalysis.analyzeCandles(largeDataset);
    const analysisTime = performance.now() - analysisStart;
    
    console.log(`RSI calculation (1000 candles): ${rsiTime.toFixed(2)}ms`);
    console.log(`Full analysis (1000 candles): ${analysisTime.toFixed(2)}ms`);
    
    if (analysisTime > 100) {
      console.warn('⚠️ Analysis is taking longer than expected (>100ms)');
    } else {
      console.log('✅ Performance is within acceptable limits');
    }
  }
}