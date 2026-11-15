/* =================================================================
   Compliance Dashboard Controller (dashboard.js)
   
   Coordinates:
     - Real-time KPI statistics fetching (/api/stats)
     - Rule 6 statutory breakdown percentage calculation
     - ML model accuracy reports display (/api/models)
     - Filterable audit trail table (search, mode filter, category filter)
   ================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

let allAuditScans = [];

async function initDashboard() {
  await loadDashboardStats();
  await loadRuleBreakdownAndHistory();
  await loadMlModelReports();

  // Search & filter handlers
  const searchInput = document.getElementById('dashSearchInput');
  const filterMode = document.getElementById('dashFilterMode');
  const filterCategory = document.getElementById('dashFilterCategory');

  if (searchInput) searchInput.addEventListener('input', filterAndRenderTable);
  if (filterMode) filterMode.addEventListener('change', filterAndRenderTable);
  if (filterCategory) filterCategory.addEventListener('change', filterAndRenderTable);
}

async function loadDashboardStats() {
  try {
    const res = await fetch('/api/stats');
    const json = await res.json();
    if (json.success && json.data) {
      const s = json.data;
      document.getElementById('dashTotalScans').textContent = s.totalScans || 0;
      document.getElementById('dashAvgCompliance').textContent = `${s.averageComplianceScore || 0}%`;
      document.getElementById('dashMostMissing').textContent = s.mostCommonlyMissingField || 'None';
      document.getElementById('dashAvgHealth').textContent = s.averageHealthScore ? `${s.averageHealthScore}%` : '--%';
    }
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
  }
}

async function loadRuleBreakdownAndHistory() {
  try {
    const res = await fetch('/api/history?limit=100');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      allAuditScans = json.data;
      computeRuleBreakdown(allAuditScans);
      filterAndRenderTable();
    }
  } catch (err) {
    console.error('Failed to load audit history:', err);
  }
}

function computeRuleBreakdown(scans) {
  if (!scans || scans.length === 0) return;

  const counts = {
    net_quantity: { pass: 0, total: 0 },
    mrp: { pass: 0, total: 0 },
    manufacturer: { pass: 0, total: 0 },
    consumer_care: { pass: 0, total: 0 },
    dates: { pass: 0, total: 0 }
  };

  scans.forEach(s => {
    if (Array.isArray(s.fieldsDetected)) {
      s.fieldsDetected.forEach(f => {
        if (counts[f.id]) {
          counts[f.id].total++;
          if (f.passed) counts[f.id].pass++;
        }
      });
    }
  });

  const getPct = (key) => counts[key].total > 0
    ? `${Math.round((counts[key].pass / counts[key].total) * 100)}%`
    : '--%';

  document.getElementById('rateNetQty').textContent = getPct('net_quantity');
  document.getElementById('rateMrp').textContent = getPct('mrp');
  document.getElementById('rateMfg').textContent = getPct('manufacturer');
  document.getElementById('rateCare').textContent = getPct('consumer_care');
  document.getElementById('rateDates').textContent = getPct('dates');
}

function filterAndRenderTable() {
  const search = (document.getElementById('dashSearchInput')?.value || '').toLowerCase().trim();
  const mode = document.getElementById('dashFilterMode')?.value || 'all';
  const category = document.getElementById('dashFilterCategory')?.value || 'all';
  const tableBody = document.getElementById('dashTableBody');

  let filtered = allAuditScans;

  if (mode !== 'all') {
    filtered = filtered.filter(s => (s.mode || 'retailer') === mode);
  }

  if (category !== 'all') {
    filtered = filtered.filter(s => (s.category || 'other') === category);
  }

  if (search) {
    filtered = filtered.filter(s =>
      (s.filename || '').toLowerCase().includes(search) ||
      (s.rawOcrText || '').toLowerCase().includes(search) ||
      (s.category || '').toLowerCase().includes(search)
    );
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No matching records found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(item => {
    const date = item.timestamp ? new Date(item.timestamp).toLocaleString() : '--';
    const score = item.complianceScore || 0;
    const modeBadge = `<span class="status-badge ${item.mode === 'retailer' ? 'info' : 'pass'}" style="font-size: 10px;">${(item.mode || 'retailer').toUpperCase()}</span>`;
    const verdict = item.ratingOrConcern || (score === 100 ? 'Compliant' : 'Non-Compliant');

    return `
      <tr>
        <td style="font-size: 12px; color: var(--text-muted);">${escapeHtml(date)}</td>
        <td><strong>${escapeHtml(item.filename)}</strong></td>
        <td>${modeBadge}</td>
        <td style="text-transform: capitalize;">${escapeHtml(item.category || 'other')}</td>
        <td><span style="font-family: var(--font-heading); font-weight: 700;">${score}%</span></td>
        <td><span style="font-weight: 600;">${escapeHtml(verdict)}</span></td>
      </tr>
    `;
  }).join('');
}

async function loadMlModelReports() {
  const catPre = document.getElementById('categoryReportPre');
  const nutriPre = document.getElementById('nutriscoreReportPre');

  try {
    const res = await fetch('/api/ml/metrics');
    const json = await res.json();
    if (json.success && json.data) {
      const m = json.data;
      if (m.category_classifier) {
        const cat = m.category_classifier;
        const kpiCat = document.getElementById('kpiCatAcc');
        if (kpiCat) kpiCat.textContent = `${(cat.accuracy * 100).toFixed(1)}%`;
        if (catPre) {
          catPre.textContent = `Overall Accuracy: ${(cat.accuracy * 100).toFixed(2)}%\n` +
            `Train Samples: ${cat.train_samples} | Test Samples: ${cat.test_samples}\n` +
            `Other Class Synthetic: ${cat.other_class_is_synthetic ? 'YES (synthetic expansion)' : 'NO'}\n\n` +
            `Per-Class Performance:\n` +
            JSON.stringify(cat.per_class, null, 2);
        }
      }
      if (m.food_nutriscore) {
        const fn = m.food_nutriscore;
        const kpiRf = document.getElementById('kpiRfExact');
        const kpiRule = document.getElementById('kpiRuleExact');
        if (kpiRf) kpiRf.textContent = `${(fn.random_forest_model.exact_grade_accuracy * 100).toFixed(1)}%`;
        if (kpiRule) kpiRule.textContent = `${(fn.rule_based_baseline.exact_grade_accuracy * 100).toFixed(1)}%`;
        if (nutriPre) {
          nutriPre.textContent = `Random Forest Model (Test N=${fn.test_samples}):\n` +
            `  - Exact-Grade Accuracy: ${(fn.random_forest_model.exact_grade_accuracy * 100).toFixed(2)}%\n` +
            `  - Within-1-Grade Accuracy: ${(fn.random_forest_model.within_one_grade_accuracy * 100).toFixed(2)}%\n\n` +
            `Rule-Based Baseline (Same N=${fn.test_samples}):\n` +
            `  - Exact-Grade Accuracy: ${(fn.rule_based_baseline.exact_grade_accuracy * 100).toFixed(2)}%\n` +
            `  - Within-1-Grade Accuracy: ${(fn.rule_based_baseline.within_one_grade_accuracy * 100).toFixed(2)}%\n\n` +
            `Top Feature Importances (%):\n` +
            JSON.stringify(fn.feature_importances_percentage, null, 2);
        }
      }
      return;
    }
  } catch (_) {
    // Fall back to /api/models if /api/ml/metrics fails
  }

  try {
    const res = await fetch('/api/models');
    const json = await res.json();
    if (json.success && json.data) {
      if (catPre) catPre.textContent = json.data.categoryReport || 'No report found.';
      if (nutriPre) nutriPre.textContent = json.data.nutriscoreReport || 'No report found.';
    }
  } catch (err) {
    if (catPre) catPre.textContent = 'Failed to load report: ' + err.message;
    if (nutriPre) nutriPre.textContent = 'Failed to load report: ' + err.message;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
