/* =================================================================
   Data Store — Concurrency-Safe JSON File-Based Persistence Layer
   
   Features:
     - Promise-based serialized write queue preventing concurrent write collisions.
     - Atomic filesystem writes via temporary file creation and atomic rename.
     - Test isolation: records with `isTest: true` are excluded from live stats,
       dashboard KPIs, and history logs.
     - Dynamic DATA_FILE resolution supporting testing overrides.
   ================================================================= */

const fs   = require('fs');
const path = require('path');

function getDataFilePath() {
  return process.env.DATA_FILE
    ? path.resolve(process.env.DATA_FILE)
    : path.join(__dirname, '../../data/scans.json');
}

/**
 * Ensures the data storage file and directory exist.
 */
function init() {
  const filePath = getDataFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf-8');
    console.log(`[dataStore] Initialized clean data store at: ${filePath}`);
  }
}

/**
 * Reads and normalizes all scan records.
 * @param {boolean} includeTest - Whether to include test runs (default: false)
 * @returns {Array}
 */
function getAllScans(includeTest = false) {
  const filePath = getDataFilePath();
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf-8');
    const records = JSON.parse(raw);
    
    return records
      .filter(r => includeTest ? true : !r.isTest)
      .map(r => ({
        ...r,
        mode: r.mode || 'retailer',
        category: r.category || (r.isFood ? 'food' : 'other'),
        engine: r.engine || 'rules',
        ratingOrConcern: r.ratingOrConcern || r.nutriScoreGrade || r.healthBadge || 'N/A'
      }));
  } catch (err) {
    console.error('[dataStore] Error reading scans data:', err.message);
    return [];
  }
}

/**
 * Returns recent scans matching optional filters (mode, category).
 * @param {number} n
 * @param {Object} [filters]
 * @param {boolean} [includeTest]
 * @returns {Array}
 */
function getRecentScans(n = 10, filters = {}, includeTest = false) {
  let scans = getAllScans(includeTest);

  if (filters.mode && filters.mode !== 'all') {
    scans = scans.filter(s => s.mode === filters.mode);
  }
  if (filters.category && filters.category !== 'all') {
    scans = scans.filter(s => s.category === filters.category);
  }

  return scans
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, n);
}

// Global promise queue to serialize file writes
let writeQueue = Promise.resolve();

/**
 * Concurrency-safe record persistence using queue serialization and atomic rename.
 * @param {Object} record
 * @returns {Promise<Object>}
 */
function addScan(record) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      const filePath = getDataFilePath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let records = [];
      if (fs.existsSync(filePath)) {
        try {
          const raw = await fs.promises.readFile(filePath, 'utf-8');
          records = JSON.parse(raw);
        } catch (_) {
          records = [];
        }
      }

      records.push(record);

      const tempFile = path.join(dir, `.tmp_scans_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.json`);
      try {
        await fs.promises.writeFile(tempFile, JSON.stringify(records, null, 2), 'utf-8');
        await fs.promises.rename(tempFile, filePath);
        resolve(record);
      } catch (writeErr) {
        if (fs.existsSync(tempFile)) {
          try { await fs.promises.unlink(tempFile); } catch (_) {}
        }
        console.error('[dataStore] Atomic write failed:', writeErr.message);
        reject(writeErr);
      }
    }).catch(err => {
      console.error('[dataStore] Write queue error:', err);
      reject(err);
    });
  });
}

/**
 * Computes aggregate statistics across scans with optional mode/category filters.
 * @param {Object} [filters]
 * @param {boolean} [includeTest]
 * @returns {Object}
 */
function getStats(filters = {}, includeTest = false) {
  let scans = getAllScans(includeTest);

  if (filters.mode && filters.mode !== 'all') {
    scans = scans.filter(s => s.mode === filters.mode);
  }
  if (filters.category && filters.category !== 'all') {
    scans = scans.filter(s => s.category === filters.category);
  }

  const total = scans.length;
  if (total === 0) {
    return {
      totalScans: 0,
      averageComplianceScore: 0,
      averageHealthScore: 0,
      mostCommonlyMissingField: 'None',
      healthyPercentage: 0,
      fullyCompliantPercentage: 0
    };
  }

  const avgScore = Math.round(
    scans.reduce((sum, s) => sum + (s.complianceScore || 0), 0) / total
  );

  const failCounts = {};
  for (const scan of scans) {
    if (scan.fieldsDetected) {
      for (const field of scan.fieldsDetected) {
        if (!field.passed) {
          failCounts[field.label] = (failCounts[field.label] || 0) + 1;
        }
      }
    }
  }

  let mostMissing = 'None';
  let maxCount = 0;
  for (const [label, count] of Object.entries(failCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostMissing = label;
    }
  }

  // Shorten label for neat card presentation
  if (mostMissing.toLowerCase().includes('consumer care')) {
    mostMissing = 'Consumer care';
  } else if (mostMissing.toLowerCase().includes('net quantity')) {
    mostMissing = 'Net quantity';
  } else if (mostMissing.toLowerCase().includes('price') || mostMissing.toLowerCase().includes('mrp')) {
    mostMissing = 'MRP';
  } else if (mostMissing.toLowerCase().includes('manufacturer')) {
    mostMissing = 'Manufacturer';
  } else if (mostMissing.toLowerCase().includes('date')) {
    mostMissing = 'Dates';
  }

  const fullyCompliantCount = scans.filter(s => (s.complianceScore || 0) === 100).length;
  const fullyCompliantPct = Math.round((fullyCompliantCount / total) * 100);

  const healthyCount = scans.filter(s => s.healthBadge === 'Healthy' || s.ratingOrConcern === 'A' || s.ratingOrConcern === 'B').length;
  const healthyPct = Math.round((healthyCount / total) * 100);

  // Mode-aware health breakdowns
  const foodGradesAB = scans.filter(s => s.category === 'food' && ['A', 'B'].includes(s.ratingOrConcern)).length;
  const foodGradesDE = scans.filter(s => s.category === 'food' && ['D', 'E'].includes(s.ratingOrConcern)).length;
  const highConcernCosmetics = scans.filter(s => s.category === 'cosmetic' && (s.concernLevel === 'High' || s.ratingOrConcern === 'High')).length;

  const foodScansWithScore = scans.filter(s => s.healthScore !== null && s.healthScore !== undefined);
  const avgHealthScore = foodScansWithScore.length > 0
    ? Math.round(foodScansWithScore.reduce((sum, s) => sum + s.healthScore, 0) / foodScansWithScore.length)
    : 0;

  return {
    totalScans: total,
    averageComplianceScore: avgScore,
    averageHealthScore: avgHealthScore,
    mostCommonlyMissingField: mostMissing,
    healthyPercentage: healthyPct,
    fullyCompliantPercentage: fullyCompliantPct,
    foodGradesAB,
    foodGradesDE,
    highConcernCosmetics
  };
}

module.exports = {
  init,
  getDataFilePath,
  getAllScans,
  getRecentScans,
  addScan,
  getStats
};
