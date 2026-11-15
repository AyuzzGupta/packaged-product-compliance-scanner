/* =================================================================
   Cosmetic & Personal Care Check Service (cosmeticCheck.js)
   
   Evaluates cosmetic, personal care, and topical hygiene product labels.
   Matches ingredients against the curated ingredientDB (containing EU SCCS,
   CosIng, and CIR regulatory assessments).
   
   Classifies overall concern as: Low / Moderate / High.
   * NEVER outputs "safe/unsafe".
   * Always attaches the mandatory safety disclaimer:
     "Informational only. Reactions vary by skin type and allergies.
      Not medical advice. Do a patch test."
   ================================================================= */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const ML_SERVICE_HOST = process.env.ML_SERVICE_HOST || '127.0.0.1';
const ML_SERVICE_PORT = process.env.ML_SERVICE_PORT || 8001;
const INGREDIENT_DB_PATH = path.join(__dirname, '../data/ingredientDB.json');

const MANDATORY_DISCLAIMER = "Informational only. Reactions vary by skin type and allergies. Not medical advice. Do a patch test.";

let localIngredientDB = null;
function getLocalDB() {
  if (!localIngredientDB) {
    try {
      if (fs.existsSync(INGREDIENT_DB_PATH)) {
        localIngredientDB = JSON.parse(fs.readFileSync(INGREDIENT_DB_PATH, 'utf-8'));
      } else {
        localIngredientDB = [];
      }
    } catch (_) {
      localIngredientDB = [];
    }
  }
  return localIngredientDB;
}

/**
 * Calls ML service /match-ingredients endpoint.
 */
function callMlMatchIngredients(text, domain = "cosmetic") {
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
      timeout: 2500
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
 * Fallback regex/substring ingredient matching against local JSON DB.
 */
function localRuleMatchIngredients(text) {
  const db = getLocalDB();
  const lower = (text || '').toLowerCase();
  const matched = [];
  const seen = new Set();

  // Basic token splitting
  const rawTokens = text.replace(/^(?:ingredients?|composition|contains)[.:\s]*/i, '').split(/[,;•\n]/).map(t => t.trim()).filter(Boolean);

  for (const item of db) {
    if (item.domain !== 'cosmetic' && item.domain !== 'both') continue;

    const namesToCheck = [item.name, ...(item.aliases || [])];
    for (const n of namesToCheck) {
      const nLower = n.toLowerCase();
      if (lower.includes(nLower)) {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          
          // Estimate position
          let pos = 99;
          for (let i = 0; i < rawTokens.length; i++) {
            if (rawTokens[i].toLowerCase().includes(nLower)) {
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

  const highCount = matched.filter(m => m.concern === 'high').length;
  const modCount = matched.filter(m => m.concern === 'moderate').length;

  let overall = 'low';
  if (highCount > 0) overall = 'high';
  else if (modCount >= 2) overall = 'moderate';

  return {
    matched_ingredients: matched,
    total_parsed_tokens: rawTokens.length,
    flagged_count: matched.length,
    overall_concern: overall
  };
}

/**
 * Analyzes cosmetic product label text.
 * @param {string} text - OCR text
 * @returns {Promise<Object>} Cosmetic analysis result
 */
async function analyzeCosmetic(text) {
  let matchData;
  let engine = 'ml';

  try {
    matchData = await callMlMatchIngredients(text, 'cosmetic');
  } catch (err) {
    console.log(`[cosmeticCheck] ML matching failed (${err.message}), using rule fallback.`);
    matchData = localRuleMatchIngredients(text);
    engine = 'rules';
  }

  const ingredients = matchData.matched_ingredients || [];

  // Categorize
  const flagged = ingredients.filter(i => i.concern === 'high' || i.concern === 'moderate');
  const positives = ingredients.filter(i => i.concern === 'low' && ['humectant', 'barrier_lipid', 'botanical_soother', 'skin_active', 'natural_oil', 'natural_emollient', 'antioxidant'].includes(i.type));

  // Determine overall concern
  const highCount = ingredients.filter(i => i.concern === 'high').length;
  const modCount = ingredients.filter(i => i.concern === 'moderate').length;

  let concernLevel = 'Low';
  if (highCount > 0) {
    concernLevel = 'High';
  } else if (modCount >= 2) {
    concernLevel = 'Moderate';
  }

  // Construct plain warnings
  const warnings = [];
  if (highCount > 0) {
    const highNames = ingredients.filter(i => i.concern === 'high').map(i => i.name).join(', ');
    warnings.push(`Contains high-concern ingredient(s): ${highNames}.`);
  }
  if (modCount > 0) {
    warnings.push(`Contains ${modCount} ingredient(s) with moderate sensitivity concern (such as potential allergens or drying agents).`);
  }
  const highQtyFlagged = flagged.filter(i => i.likely_high_quantity);
  if (highQtyFlagged.length > 0) {
    warnings.push(`${highQtyFlagged.map(i => i.name).join(', ')} appear(s) in the top 3 ingredients, indicating likely high concentration.`);
  }

  return {
    concernLevel,
    engine,
    totalIngredientsFound: ingredients.length,
    ingredients,
    flagged,
    positives,
    warnings,
    disclaimer: MANDATORY_DISCLAIMER
  };
}

module.exports = { analyzeCosmetic, MANDATORY_DISCLAIMER };
