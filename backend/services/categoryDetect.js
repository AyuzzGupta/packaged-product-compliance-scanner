/* =================================================================
   Category Detection Service (categoryDetect.js)
   
   Hybrid classifier:
     1. First queries the Python ML microservice (http://localhost:8001/classify).
     2. If the ML service is down or confidence is < 0.60, deterministically
        falls back to regex/keyword rules.
     3. Reports the actual engine used ("ml" | "rules").
   ================================================================= */

const http = require('http');

const mlUrl = new URL(process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001');
const ML_SERVICE_HOST = mlUrl.hostname;
const ML_SERVICE_PORT = parseInt(mlUrl.port || '8001', 10);
const ML_TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS || '4000', 10);

const FOOD_KEYWORDS = [
  'nutrition', 'energy', 'carbohydrate', 'sugar', 'protein', 'fat', 'saturated fat',
  'sodium', 'salt', 'ingredients', 'fssai', 'flavour', 'edible vegetable oil',
  'flour', 'wheat', 'atta', 'maida', 'spices', 'preservative', 'best before', 'use by',
  'veg', 'non-veg', 'grams', 'serving size', 'kcal', 'food', 'juice', 'milk', 'biscuit',
  'rice', 'tea', 'coffee', 'chocolate', 'snack', 'pickle', 'sauce', 'honey'
];

const COSMETIC_KEYWORDS = [
  'aqua', 'water', 'glycerin', 'sodium laureth sulfate', 'sls', 'sles', 'parfum',
  'fragrance', 'shampoo', 'conditioner', 'face wash', 'body wash', 'cleanser',
  'lotion', 'cream', 'serum', 'sunscreen', 'spf', 'moisturizer', 'paraben',
  'methylparaben', 'propylparaben', 'dimethicone', 'cyclopentasiloxane', 'cetyl alcohol',
  'phenoxyethanol', 'dermatologically', 'external use only', 'patch test', 'neem',
  'aloe vera', 'cosmetic', 'bathing bar', 'toilet soap', 'hair oil', 'lipstick'
];

const OTHER_KEYWORDS = [
  'warranty', 'voltage', 'wattage', 'model no', 'serial no', 'bluetooth',
  'earbuds', 'headphone', 'audio', 'charger', 'usb', 'cable', 'battery',
  'bis reg', 'is 13252', 'apparel', 'cotton', 'polyester', 'fabric', 'wash care',
  'do not bleach', 'hardware', 'lock', 'stainless steel', 'tool', 'device', 'made in'
];

/**
 * Calls ML service /classify endpoint with timeout.
 */
function callMlClassifier(text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ text: text.substring(0, 4000) });
    const req = http.request({
      hostname: ML_SERVICE_HOST,
      port: ML_SERVICE_PORT,
      path: '/classify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: ML_TIMEOUT_MS
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } else {
            reject(new Error(`ML service returned HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('ML classify request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Deterministic keyword-scoring fallback when ML is unavailable or low-confidence.
 */
function ruleBasedClassify(text) {
  const lower = (text || '').toLowerCase();
  
  let foodScore = 0;
  let cosmeticScore = 0;
  let otherScore = 0;

  const matchedKeywords = [];

  FOOD_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) {
      foodScore += 1;
      matchedKeywords.push(kw);
    }
  });

  COSMETIC_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) {
      cosmeticScore += 1;
      matchedKeywords.push(kw);
    }
  });

  OTHER_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) {
      otherScore += 1;
      matchedKeywords.push(kw);
    }
  });

  const total = foodScore + cosmeticScore + otherScore || 1;
  let category = 'other';
  let maxScore = otherScore;

  if (foodScore > maxScore && foodScore > cosmeticScore) {
    category = 'food';
    maxScore = foodScore;
  } else if (cosmeticScore > maxScore) {
    category = 'cosmetic';
    maxScore = cosmeticScore;
  }

  const confidence = Math.min(0.95, Math.round((maxScore / total) * 100) / 100);

  return {
    category,
    confidence: confidence || 0.50,
    engine: 'rules',
    matchedKeywords: matchedKeywords.slice(0, 8)
  };
}

/**
 * Master classification function.
 * @param {string} text - OCR text
 * @param {string} [manualCategory] - 'auto' | 'food' | 'cosmetic' | 'other'
 */
async function detectCategory(text, manualCategory = 'auto') {
  if (manualCategory && manualCategory !== 'auto' && ['food', 'cosmetic', 'other'].includes(manualCategory.toLowerCase())) {
    return {
      category: manualCategory.toLowerCase(),
      confidence: 1.0,
      engine: 'manual',
      matchedKeywords: []
    };
  }

  // 1. Try ML Service
  try {
    const mlRes = await callMlClassifier(text);
    if (mlRes && mlRes.confidence >= 0.60) {
      return {
        category: mlRes.category,
        confidence: mlRes.confidence,
        probabilities: mlRes.probabilities,
        engine: 'ml',
        matchedKeywords: []
      };
    } else {
      console.log(`[categoryDetect] ML confidence low (${mlRes?.confidence}), falling back to rules.`);
    }
  } catch (err) {
    console.log(`[categoryDetect] ML Service unavailable (${err.message}), using rule fallback.`);
  }

  // 2. Fallback to keyword rules
  return ruleBasedClassify(text);
}

module.exports = { detectCategory, ruleBasedClassify };
