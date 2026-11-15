/* =================================================================
   Health Check — Food Health, Nutrition & Hybrid ML Engine
   
   Integrates:
     1. Deterministic FSSAI nutrient table extraction (Sugar, Sat Fat, Sodium, Energy).
     2. Ingredient matching against canonical ingredientDB via ML /match-ingredients.
     3. ML /rate-food model inference with fallback to rule-based Nutri-Score.
     4. Clear indication of engine: "ml" | "rules", and ingredient position heuristics
        (top 3 = "likely high quantity", no exact percentages claimed).
   ================================================================= */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const healthModelService = require('./healthModelService');

const mlUrl = new URL(process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001');
const ML_SERVICE_HOST = mlUrl.hostname;
const ML_SERVICE_PORT = parseInt(mlUrl.port || '8001', 10);
const ML_TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS || '4000', 10);
const INGREDIENT_DB_PATH = path.join(__dirname, '../../data/ingredientDB.json');

/**
 * FSSAI Statutory per-100g thresholds.
 */
const NUTRIENT_RULES = [
  {
    id: 'sugar',
    label: 'Sugar',
    unit: 'g',
    patterns: [
      /(?:total\s*)?sugar[s]?\s*[:|\-\s]+\s*([\d.]+)\s*g/i,
      /of\s*which\s*sugar[s]?\s*[:|\-\s]+\s*([\d.]+)\s*g/i,
      /sugar[s]?\s*[:|\-\s]*([\d.]+)/i
    ],
    thresholds: { low: 5, high: 22.5 }
  },
  {
    id: 'saturated_fat',
    label: 'Saturated Fat',
    unit: 'g',
    patterns: [
      /saturat\w*\s*(?:fat)?\s*[:|\-\s]+\s*([\d.]+)\s*g/i,
      /of\s*which\s*saturate[ds]?\s*[:|\-\s]+\s*([\d.]+)\s*g/i,
      /sat\.\s*fat\s*[:|\-\s]+\s*([\d.]+)\s*g/i,
      /saturat\w*\s*(?:fat)?\s*[:|\-\s]*([\d.]+)/i
    ],
    thresholds: { low: 1.5, high: 5 }
  },
  {
    id: 'sodium',
    label: 'Sodium',
    unit: 'mg',
    patterns: [
      /sod[iu]+m\s*[:|\-\s]+\s*([\d.]+)\s*mg/i,
      /salt\s*[:|\-\s]+\s*([\d.]+)\s*g/i,
      /sod[iu]+m\s*[:|\-\s]+\s*([\d.]+)\s*g/i,
      /na\s*[:|\-\s]+\s*([\d.]+)\s*mg/i,
      /sod[iu]+m\s*[:|\-\s]*([\d.]+)/i
    ],
    thresholds: { low: 120, high: 600 }
  },
  {
    id: 'energy',
    label: 'Energy',
    unit: 'kcal',
    patterns: [
      /energy\s*[:|\-\s]+\s*(\d[\d.]*)\s*kcal/i,
      /calories?\s*[:|\-\s]+\s*(\d[\d.]*)\s*kcal/i,
      /energy\s*[:|\-\s]+\s*(\d[\d.]*)\s*kj/i,
      /cal(?:orie)?[s]?\s*[:|\-\s]+(\d[\d.]*)/i,
      /energy\s*[:|\-\s]*(\d+)/i
    ],
    thresholds: null
  }
];

function classify(value, thresholds) {
  if (!thresholds) return null;
  if (value < thresholds.low)  return 'Low';
  if (value > thresholds.high) return 'High';
  return 'Medium';
}

function scoreToNutriScore(score) {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 45) return 'C';
  if (score >= 25) return 'D';
  return 'E';
}

function nutriScoreToScore5(grade) {
  const map = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1 };
  return map[grade] || 3;
}

/**
 * Extracts quantitative nutrients from text via regex.
 */
function extractNutrients(text) {
  const nutrients = [];
  let foundAny = false;

  for (const rule of NUTRIENT_RULES) {
    let value = null;
    let rawMatch = '';

    for (const pattern of rule.patterns) {
      const m = text.match(pattern);
      if (m) {
        rawMatch = m[0].trim();
        value = parseFloat(m[1]);

        if (rule.id === 'sodium' && /salt/i.test(m[0]) && /\bg\b/i.test(m[0])) {
          value = value * 400; // 1g salt ≈ 400mg sodium
        }
        if (rule.id === 'sodium' && /sodium/i.test(m[0]) && /\bg\b/i.test(m[0]) && !/mg/i.test(m[0])) {
          value = value * 1000;
        }
        break;
      }
    }

    if (value !== null && !isNaN(value)) {
      foundAny = true;
      nutrients.push({
        id: rule.id,
        name: rule.label,
        value: value,
        valuePer100g: value,
        unit: rule.unit,
        level: classify(value, rule.thresholds) || 'Medium',
        raw: rawMatch
      });
    }
  }

  return { nutrients, hasTable: foundAny && nutrients.length >= 2 };
}

/**
 * Calls ML /rate-food
 */
function callMlRateFood(nutrientsMap, ingredientsText) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      nutrients: nutrientsMap,
      ingredients_text: ingredientsText
    });

    const req = http.request({
      hostname: ML_SERVICE_HOST,
      port: ML_SERVICE_PORT,
      path: '/rate-food',
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
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Calls ML /match-ingredients
 */
function callMlMatchIngredients(text, domain = "food") {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ text, domain });
    const req = http.request({
      hostname: ML_SERVICE_HOST,
      port: ML_SERVICE_PORT,
      path: '/match-ingredients',
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
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Fallback local ingredient matcher
 */
function localMatchFoodIngredients(text) {
  let db = [];
  try {
    if (fs.existsSync(INGREDIENT_DB_PATH)) {
      db = JSON.parse(fs.readFileSync(INGREDIENT_DB_PATH, 'utf-8'));
    }
  } catch (_) {}

  const lower = (text || '').toLowerCase();
  const matched = [];
  const seen = new Set();
  const tokens = text.replace(/^(?:ingredients?|contains)[.:\s]*/i, '').split(/[,;•\n]/).map(t => t.trim()).filter(Boolean);

  for (const item of db) {
    if (item.domain !== 'food' && item.domain !== 'both') continue;
    const names = [item.name, ...(item.aliases || [])];
    for (const n of names) {
      if (lower.includes(n.toLowerCase())) {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          let pos = 99;
          for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].toLowerCase().includes(n.toLowerCase())) {
              pos = i + 1;
              break;
            }
          }
          matched.push({
            name: item.name,
            raw_token: n,
            position: pos === 99 ? matched.length + 1 : pos,
            concern: item.concern,
            type: item.type,
            reason: item.reason,
            source_note: item.source_note,
            domain: item.domain,
            likely_high_quantity: pos <= 3,
            match_score: 95.0
          });
        }
        break;
      }
    }
  }

  return { matched_ingredients: matched };
}

/**
 * Calculates deterministic rule-based health score (0-100)
 */
function calculateHealthScore(nutrients, ocrText = '') {
  let score = 100;
  let highCount = 0;
  const textLower = (ocrText || '').toLowerCase();

  for (const n of nutrients) {
    if (n.id === 'sugar') {
      if (n.value > 22.5) { score -= 35; highCount++; }
      else if (n.value > 5) score -= 15;
    }
    if (n.id === 'saturated_fat') {
      if (n.value > 5) { score -= 35; highCount++; }
      else if (n.value > 1.5) score -= 14;
    }
    if (n.id === 'sodium') {
      if (n.value > 900) { score -= 45; highCount++; }
      else if (n.value > 600) { score -= 32; highCount++; }
      else if (n.value > 120) score -= 14;
    }
  }

  const hasPalmOil = /\b(?:palm\s*oil|palmolein|palm\s*fat)\b/i.test(textLower);
  if (hasPalmOil) score -= 12;

  const hasMaida = /\b(?:refined\s*wheat\s*flour|maida)\b/i.test(textLower);
  const hasAtta = /\b(?:whole\s*wheat(?:\s*flour)?|\batta\b)\b/i.test(textLower);
  if (hasMaida && !hasAtta) score -= 10;
  else if (hasAtta) score += 6;

  if (highCount >= 2) score = Math.min(score, 24);
  else if (highCount === 1) score = Math.min(score, 40);

  return Math.max(8, Math.min(100, Math.round(score)));
}

/**
 * Master Food Health Assessment
 * @param {string} ocrText
 * @param {string} [filename]
 * @returns {Promise<Object>}
 */
async function runHealthCheck(ocrText, filename = '') {
  const textLower = ((ocrText || '') + ' ' + (filename || '')).toLowerCase();

  // 1. Extract nutrients
  const { nutrients, hasTable } = extractNutrients(ocrText);

  // 2. Extract ingredients via ML match-ingredients or fallback
  let ingredientRes;
  let engine = 'ml';
  try {
    ingredientRes = await callMlMatchIngredients(ocrText, 'food');
  } catch (_) {
    ingredientRes = localMatchFoodIngredients(ocrText);
    engine = 'rules';
  }

  const matchedIngs = (ingredientRes.matched_ingredients || []).map(ing => ({
    name: ing.name,
    position: ing.position,
    concern: ing.concern,
    reason: ing.reason,
    type: ing.type,
    likelyHighQuantity: ing.likely_high_quantity || ing.position <= 3
  }));

  const flagged = matchedIngs.filter(i => i.concern === 'high' || i.concern === 'moderate');
  const positives = matchedIngs.filter(i => i.concern === 'low' && ['healthy_fat', 'whole_grain', 'antioxidant', 'prebiotic_fiber', 'natural_color'].includes(i.type));

  let rating = 'C';
  let probability = 0.85;
  let healthScore = 55;
  let whyReasons = [];
  let warnings = [];

  // Map nutrients into ML model input format
  const nutrientMap = {
    energy_kcal: 0,
    sugars_100g: 0,
    saturated_fat_100g: 0,
    sodium_100g: 0,
    fiber_100g: 0,
    proteins_100g: 0,
    additives_count: flagged.length
  };

  nutrients.forEach(n => {
    if (n.id === 'energy') nutrientMap.energy_kcal = n.value;
    if (n.id === 'sugar') nutrientMap.sugars_100g = n.value;
    if (n.id === 'saturated_fat') nutrientMap.saturated_fat_100g = n.value;
    if (n.id === 'sodium') nutrientMap.sodium_100g = n.value;
  });

  if (hasTable) {
    // Try ML /rate-food
    try {
      const mlFood = await callMlRateFood(nutrientMap, ocrText);
      rating = mlFood.grade;
      probability = mlFood.probability;
      engine = 'ml';

      const gradeScoreMap = { 'A': 90, 'B': 75, 'C': 55, 'D': 35, 'E': 15 };
      healthScore = gradeScoreMap[rating] || 50;

    } catch (err) {
      console.log(`[healthCheck] ML /rate-food failed (${err.message}), using rule baseline.`);
      healthScore = calculateHealthScore(nutrients, ocrText);
      rating = scoreToNutriScore(healthScore);
      engine = 'rules';
    }
  } else {
    // Nutrition table not detected - rating based on ingredient analysis!
    engine = 'rules';
    const hasHighIng = flagged.some(i => i.concern === 'high');
    const hasModIng = flagged.filter(i => i.concern === 'moderate').length >= 2;

    if (hasHighIng) {
      rating = 'D';
      healthScore = 32;
    } else if (hasModIng) {
      rating = 'C';
      healthScore = 55;
    } else {
      rating = 'B';
      healthScore = 72;
    }
    warnings.push("Nutrition table not detected — rating based on ingredient analysis.");
  }

  // Build 3-5 plain reasons for user
  const sugarObj = nutrients.find(n => n.id === 'sugar');
  const fatObj = nutrients.find(n => n.id === 'saturated_fat');
  const sodiumObj = nutrients.find(n => n.id === 'sodium');

  if (sugarObj && sugarObj.level === 'High') {
    whyReasons.push(`High Sugar (${sugarObj.value}g/100g) exceeds FSSAI recommended low thresholds.`);
    warnings.push(`High sugar content (${sugarObj.value}g per 100g).`);
  } else if (sugarObj && sugarObj.level === 'Low') {
    whyReasons.push(`Low Sugar (${sugarObj.value}g/100g) meets healthy statutory benchmarks.`);
  }

  if (fatObj && fatObj.level === 'High') {
    whyReasons.push(`Saturated Fat (${fatObj.value}g/100g) is elevated above the 5g/100g threshold.`);
    warnings.push(`High saturated fat (${fatObj.value}g per 100g).`);
  }

  if (sodiumObj && sodiumObj.level === 'High') {
    whyReasons.push(`Sodium level (${sodiumObj.value}mg/100g) exceeds the 600mg HFSS guideline.`);
    warnings.push(`High sodium level (${sodiumObj.value}mg per 100g).`);
  }

  const highQtyFlagged = flagged.filter(i => i.likelyHighQuantity);
  if (highQtyFlagged.length > 0) {
    const names = highQtyFlagged.map(i => i.name).join(', ');
    whyReasons.push(`${names} appear(s) in the first 3 ingredients, indicating likely high proportion.`);
    warnings.push(`${names} listed in top 3 ingredients.`);
  }

  if (positives.length > 0) {
    whyReasons.push(`Contains beneficial ingredients: ${positives.map(p => p.name).join(', ')}.`);
  }

  if (whyReasons.length === 0) {
    whyReasons.push("Nutrient levels and formulation are balanced for everyday consumption.");
  }

  let badge = 'Moderate';
  if (rating === 'A' || rating === 'B') badge = 'Healthy';
  else if (rating === 'D' || rating === 'E') badge = 'Unhealthy';

  return {
    found: true,
    isFood: true,
    rating,
    nutriScoreGrade: rating,
    score_out_of_5: nutriScoreToScore5(rating),
    healthScore,
    badge,
    engine,
    why: whyReasons.slice(0, 5),
    nutrients,
    ingredients: matchedIngs,
    flagged,
    positives,
    warnings,
    nutritionTableDetected: hasTable,
    reason: whyReasons[0] || 'Evaluated under FSSAI and Open Food Facts benchmarks.'
  };
}

module.exports = {
  runHealthCheck,
  calculateHealthScore,
  scoreToNutriScore
};
