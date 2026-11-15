/* =================================================================
   Data Store — JSON file-based persistence layer
   
   Provides read/write access to scans.json. Normalizes legacy records
   without mode/category (defaulting mode='retailer', category='other').
   Supports filtering by mode and category.
   ================================================================= */

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'scans.json');

/**
 * Ensures the scans.json file exists.
 */
function init() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
    console.log('[dataStore] Created empty scans.json');
  }
}

/**
 * Reads, parses, and normalizes all scan records.
 * @returns {Array}
 */
function getAllScans() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const records = JSON.parse(raw);
    
    // Normalize older records
    return records.map(r => ({
      ...r,
      mode: r.mode || 'retailer',
      category: r.category || (r.isFood ? 'food' : 'other'),
      engine: r.engine || 'rules',
      ratingOrConcern: r.ratingOrConcern || r.nutriScoreGrade || r.healthBadge || 'N/A'
    }));
  } catch (err) {
    console.error('[dataStore] Error reading scans.json:', err.message);
    return [];
  }
}

/**
 * Returns recent scans matching optional filters (mode, category).
 * @param {number} n
 * @param {Object} [filters]
 * @returns {Array}
 */
function getRecentScans(n = 10, filters = {}) {
  let scans = getAllScans();

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

/**
 * Appends a new scan record to scans.json.
 * @param {Object} record
 */
function addScan(record) {
  const scans = getAllScans();
  scans.push(record);
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(scans, null, 2), 'utf-8');
  } catch (err) {
    console.error('[dataStore] Error writing scans.json:', err.message);
  }
}

/**
 * Computes aggregate statistics across scans with optional mode/category filters.
 * @param {Object} [filters]
 * @returns {Object}
 */
function getStats(filters = {}) {
  let scans = getAllScans();

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

  const fullyCompliantCount = scans.filter(s => (s.complianceScore || 0) === 100).length;
  const fullyCompliantPct = Math.round((fullyCompliantCount / total) * 100);

  const healthyCount = scans.filter(s => s.healthBadge === 'Healthy' || s.ratingOrConcern === 'A' || s.ratingOrConcern === 'B').length;
  const healthyPct = Math.round((healthyCount / total) * 100);

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
    fullyCompliantPercentage: fullyCompliantPct
  };
}

module.exports = { init, getAllScans, getRecentScans, addScan, getStats };
