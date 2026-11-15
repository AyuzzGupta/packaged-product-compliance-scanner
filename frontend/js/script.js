/* =================================================================
   ComplianceScan Client Controller (script.js)
   
   Manages:
     - Retailer vs Consumer mode switching (stored in localStorage)
     - Single & Batch label image uploading via Express APIs
     - Rule 6 Legal Metrology tabular rendering
     - Category-based Consumer Intelligence rendering (Food / Cosmetic / Other)
     - Interactive raw OCR editing & re-analysis (/api/analyze-text)
     - Batch CSV export for Retailer mode
     - ML microservice liveness detection & graceful fallback UI
   ================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let currentMode = localStorage.getItem('compliance_mode') || 'consumer';
let currentCategory = 'auto';
let lastScanResult = null;
let currentBatchItems = [];

function initApp() {
  setupModeSwitch();
  setupUploadHandlers();
  setupSampleButtons();
  setupOcrDrawer();
  setupBatchCsvExport();
  
  // Liveness check & initial data loads
  checkMlServiceHealth();
  loadStats();
  loadHistory();

  // Listen to history filter change
  const historyFilter = document.getElementById('historyFilterMode');
  if (historyFilter) {
    historyFilter.addEventListener('change', (e) => {
      loadHistory(e.target.value);
    });
  }
}

/* =================================================================
   MODE SWITCHING (RETAILER vs CONSUMER)
   ================================================================= */
function setupModeSwitch() {
  const btnRetailer = document.getElementById('modeBtnRetailer');
  const btnConsumer = document.getElementById('modeBtnConsumer');

  applyModeUI(currentMode);

  btnRetailer.addEventListener('click', () => switchMode('retailer'));
  btnConsumer.addEventListener('click', () => switchMode('consumer'));
}

function switchMode(newMode) {
  currentMode = newMode;
  localStorage.setItem('compliance_mode', newMode);
  applyModeUI(newMode);

  // If a result is currently displayed, re-render it to reflect mode change
  if (lastScanResult) {
    renderScanResult(lastScanResult);
  }
}

function applyModeUI(mode) {
  const btnRetailer = document.getElementById('modeBtnRetailer');
  const btnConsumer = document.getElementById('modeBtnConsumer');
  const title = document.getElementById('pageModeTitle');
  const desc = document.getElementById('pageModeDesc');
  const catWrap = document.getElementById('categorySelectWrap');
  const dropPrompt = document.getElementById('dropPromptText');
  const dropSubprompt = document.getElementById('dropSubpromptText');

  if (mode === 'retailer') {
    btnRetailer.classList.add('active');
    btnConsumer.classList.remove('active');
    
    title.textContent = "Retailer Mode: Mandatory Statutory Inspection";
    desc.textContent = "Verifies mandatory Rule 6 disclosures (Net Quantity, MRP, Manufacturer, Consumer Care, Mfg/Expiry Dates) under Legal Metrology Rules, 2011. Supports single or batch scan (up to 10 images) with summary table and CSV export.";
    
    catWrap.style.display = 'none';
    dropPrompt.textContent = "Drag & drop single or batch commodity labels here";
    dropSubprompt.innerHTML = "Supports up to 10 images (JPG, PNG, WEBP) &bull; or <span class='browse-action'>browse files</span>";
  } else {
    btnConsumer.classList.add('active');
    btnRetailer.classList.remove('active');

    title.textContent = "Consumer Mode: Label Inspection & Health Risk Screening";
    desc.textContent = "Verifies mandatory packaging disclosures under Legal Metrology Rules, 2011 (Rule 6) and evaluates product health risks, nutritional quality, and ingredient safety.";

    catWrap.style.display = 'flex';
    dropPrompt.textContent = "Drag & drop package photograph here";
    dropSubprompt.innerHTML = "Supports JPG, PNG, WEBP &bull; or <span class='browse-action'>browse device / camera</span>";
  }
}


/* =================================================================
   UPLOAD & FILE PROCESSING
   ================================================================= */
function setupUploadHandlers() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const batchFileInput = document.getElementById('batchFileInput');
  const categorySelect = document.getElementById('categorySelect');

  categorySelect.addEventListener('change', (e) => {
    currentCategory = e.target.value;
  });

  dropZone.addEventListener('click', () => {
    if (currentMode === 'retailer') {
      batchFileInput.click();
    } else {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSingleUpload(e.target.files[0]);
    }
  });

  batchFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files.length === 1) {
        handleSingleUpload(e.target.files[0]);
      } else {
        handleBatchUpload(Array.from(e.target.files).slice(0, 10));
      }
    }
  });

  // Drag and drop events
  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      if (currentMode === 'retailer' && dt.files.length > 1) {
        handleBatchUpload(Array.from(dt.files).slice(0, 10));
      } else {
        handleSingleUpload(dt.files[0]);
      }
    }
  });
}

function setupSampleButtons() {
  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const sample = chip.getAttribute('data-sample');
      if (!sample) return;

      setLoading(true, `Loading sample "${sample}"...`, 'Fetching bundled test label and initializing OCR');
      hideAlerts();

      try {
        const res = await fetch(`/samples/${sample}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const file = new File([blob], sample, { type: blob.type || 'image/jpeg' });
        handleSingleUpload(file);
      } catch (err) {
        setLoading(false);
        showError('Could not load sample label: ' + err.message);
      }
    });
  });
}

async function handleSingleUpload(file) {
  setLoading(true, `Analyzing ${file.name}...`, 'Running OCR preprocessing and legal verification rules');
  hideAlerts();
  document.getElementById('batchResultsWrapper').style.display = 'none';

  const formData = new FormData();
  formData.append('image', file);
  formData.append('mode', currentMode);
  formData.append('category', currentCategory);

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      body: formData
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok || !json.success) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }

    lastScanResult = json.data;
    renderScanResult(json.data);
    loadStats();
    loadHistory();

  } catch (err) {
    setLoading(false);
    showError(err.message || 'Failed to analyze label image.');
  }
}

async function handleBatchUpload(files) {
  setLoading(true, `Processing Batch Scan (${files.length} images)...`, 'Sequentially executing Legal Metrology inspections');
  hideAlerts();
  document.getElementById('resultsWrapper').style.display = 'none';

  const formData = new FormData();
  files.forEach(f => formData.append('images', f));

  try {
    const res = await fetch('/api/scan-batch', {
      method: 'POST',
      body: formData
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok || !json.success) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }

    currentBatchItems = json.data.items || [];
    renderBatchResult(json.data);
    loadStats();
    loadHistory();

  } catch (err) {
    setLoading(false);
    showError(err.message || 'Failed to process batch scans.');
  }
}


/* =================================================================
   RENDERING: SINGLE RESULT (SECTION A & SECTION B)
   ================================================================= */
function renderScanResult(data) {
  const resultsWrapper = document.getElementById('resultsWrapper');
  resultsWrapper.style.display = 'flex';

  // Check low confidence alert
  const lowAlert = document.getElementById('lowConfidenceAlert');
  if (data.lowConfidence) {
    lowAlert.style.display = 'flex';
  } else {
    lowAlert.style.display = 'none';
  }

  // 1. SECTION A: Legal Metrology Table
  renderMetrologyCard(data);

  // 2. SECTION B: Consumer Intelligence Card (if in Consumer mode)
  const consumerCard = document.getElementById('consumerIntelligenceCard');
  if (currentMode === 'consumer') {
    consumerCard.style.display = 'block';
    renderConsumerCard(data);
  } else {
    consumerCard.style.display = 'none';
  }

  // 3. SECTION C: OCR Text Drawer & Editor
  populateOcrDrawer(data);

  // Smooth scroll to results
  resultsWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderMetrologyCard(data) {
  const scoreVal = document.getElementById('metrologyScoreVal');
  const summaryText = document.getElementById('metrologySummaryText');
  const tableBody = document.getElementById('metrologyTableBody');
  const engineTag = document.getElementById('metrologyEngineTag');

  scoreVal.textContent = `${data.complianceScore || 0}%`;
  summaryText.innerHTML = `${escapeHtml(data.complianceSummary || 'Verification completed.')}<br><small style="color: var(--text-subtle); display: block; margin-top: 4px;">Presence check only. Preliminary screening, not official certification.</small>`;
  engineTag.textContent = data.engine === 'ml' ? 'ML + Rules' : 'Deterministic Rules';

  const statutoryRef = {
    net_quantity: 'Rule 6(1)(e) — Standard Units of Weight/Measure',
    mrp: 'Rule 6(1)(c) — Retail Sale Price Incl. All Taxes',
    manufacturer: 'Rule 6(1)(a) — Name & Complete Address of Packer/Mfg',
    consumer_care: 'Rule 6(1)(h) — Helpline, Email & Contact Person',
    dates: 'Rule 6(1)(d) — Month & Year of Mfg or Best Before'
  };

  const fields = data.fieldsDetected || [];
  tableBody.innerHTML = fields.map(f => {
    const isPassed = f.passed;
    const ref = statutoryRef[f.id] || 'Statutory Mandatory Rule';
    const snippet = f.matchedText
      ? `<span class="matched-snippet-code">${escapeHtml(f.matchedText)}</span>`
      : `<span style="color: var(--text-subtle); font-style: italic;">Not detected in extracted text</span>`;

    const statusBadge = isPassed
      ? `<span class="status-badge pass"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> PASSED</span>`
      : `<span class="status-badge fail"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> MISSING</span>`;

    return `
      <tr>
        <td>
          <span class="rule-meta-name">${escapeHtml(f.label)}</span>
          <span class="rule-meta-statute">${escapeHtml(ref)}</span>
        </td>
        <td>${statusBadge}</td>
        <td>${snippet}</td>
      </tr>
    `;
  }).join('');
}

function renderConsumerCard(data) {
  const heading = document.getElementById('consumerCardHeading');
  const engineTag = document.getElementById('consumerEngineTag');
  const body = document.getElementById('consumerCardBody');
  const cat = data.category || 'other';

  engineTag.textContent = data.engine === 'ml' ? 'ML Model' : 'Rule-Based';

  if (cat === 'food') {
    heading.textContent = "Food Health & Nutritional Quality Assessment";
    renderFoodConsumerBody(data, body);
  } else if (cat === 'cosmetic') {
    heading.textContent = "Cosmetic & Personal Care Ingredient Safety";
    renderCosmeticConsumerBody(data, body);
  } else {
    heading.textContent = "Product Classification: Non-Food Commodity";
    body.innerHTML = `
      <div class="other-commodity-notice">
        <strong>Commodity Category: ${escapeHtml(cat.toUpperCase())}</strong>
        <p style="margin-top: 4px;">This product is classified as a non-food, non-cosmetic commodity (such as electronics, apparel, or hardware). Statutory Legal Metrology verification applies as verified above. No nutritional or cosmetic ingredient screening is required.</p>
      </div>
    `;
  }
}

function renderFoodConsumerBody(data, container) {
  const grade = data.rating || data.nutriScoreGrade || 'C';
  const score5 = data.score_out_of_5 || 3;
  const whyReasons = data.why || ["Evaluated against statutory nutritional guidelines."];
  const nutrients = data.nutrientsDetected || [];
  const ingredients = data.ingredients || [];

  const gradeClass = `grade-${grade.toLowerCase()}`;

  let nutrientCardsHtml = nutrients.map(n => {
    const lvl = (n.level || 'medium').toLowerCase();
    return `
      <div class="nutrient-card ${lvl}">
        <div class="nutrient-name">${escapeHtml(n.name || n.label)}</div>
        <div class="nutrient-value">${n.value}${escapeHtml(n.unit || 'g')}</div>
        <div class="nutrient-level-tag ${lvl}">${lvl.toUpperCase()}</div>
      </div>
    `;
  }).join('');

  if (!nutrientCardsHtml) {
    nutrientCardsHtml = `<div style="grid-column: 1/-1; font-size: 12px; color: var(--text-muted); font-style: italic;">Nutrition table not detected on label &mdash; evaluation conducted via ingredient list.</div>`;
  }

  let ingredientsHtml = ingredients.map(ing => {
    const concern = (ing.concern || 'low').toLowerCase();
    const isHighQty = ing.likelyHighQuantity ? `<span class="pos-pill">#${ing.position}</span>` : '';
    const titleAttr = escapeHtml(ing.reason || 'Permitted food ingredient');
    return `<span class="ing-badge ${concern}" title="${titleAttr}">${isHighQty}${escapeHtml(ing.name)}</span>`;
  }).join('');

  if (!ingredientsHtml) {
    ingredientsHtml = `<span style="font-size: 12px; color: var(--text-muted);">No flagged ingredients detected.</span>`;
  }

  container.innerHTML = `
    <div class="health-overview-grid">
      <div class="nutri-score-card">
        <div class="grade-badge-huge ${gradeClass}">${escapeHtml(grade)}</div>
        <div class="grade-score-subtitle">Nutri-Score Rating</div>
        <div class="grade-score-meta">Health Score: ${score5} / 5</div>
      </div>

      <div class="why-rating-box">
        <div class="why-title">Why this rating:</div>
        <ul class="why-list">
          ${whyReasons.map(r => `<li class="why-item"><span class="bullet-dash">&bull;</span><span>${escapeHtml(r)}</span></li>`).join('')}
        </ul>
      </div>
    </div>

    <div>
      <div class="why-title" style="margin-bottom: 10px;">Per 100g Nutritional Profile:</div>
      <div class="nutrients-grid">${nutrientCardsHtml}</div>
    </div>

    <div class="ingredients-wrap">
      <div class="why-title">Detected Ingredients Analysis:</div>
      <div class="ingredients-notice">Ingredients are listed in descending order of weight. Items in the first 3 positions are likely present in high proportion.</div>
      <div class="ingredients-list">${ingredientsHtml}</div>
    </div>
  `;
}

function renderCosmeticConsumerBody(data, container) {
  const concernLevel = data.concernLevel || 'Low';
  const ingredients = data.ingredients || [];
  const warnings = data.warnings || [];
  const disclaimer = data.disclaimer || "Informational only. Reactions vary by skin type and allergies. Not medical advice. Do a patch test.";

  let badgeColor = 'pass';
  if (concernLevel === 'High') badgeColor = 'fail';
  else if (concernLevel === 'Moderate') badgeColor = 'warn';

  let ingredientsHtml = ingredients.map(ing => {
    const c = (ing.concern || 'low').toLowerCase();
    const isHighQty = ing.likely_high_quantity ? `<span class="pos-pill">#${ing.position}</span>` : '';
    const titleAttr = escapeHtml(ing.reason || 'Cosmetic ingredient');
    return `<span class="ing-badge ${c}" title="${titleAttr}">${isHighQty}${escapeHtml(ing.name)}</span>`;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
      <div>
        <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Formulation Sensitivity Profile:</span>
        <div style="margin-top: 4px;">
          <span class="status-badge ${badgeColor}" style="font-size: 13px; padding: 6px 12px;">
            ${escapeHtml(concernLevel.toUpperCase())} CONCERN
          </span>
        </div>
      </div>
    </div>

    ${warnings.length > 0 ? `
      <div style="margin-bottom: 16px;">
        <div class="why-title">Formulation Observations:</div>
        <ul class="why-list">
          ${warnings.map(w => `<li class="why-item"><span class="bullet-dash">&bull;</span><span>${escapeHtml(w)}</span></li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <div class="ingredients-wrap">
      <div class="why-title">Identified Cosmetic Ingredients:</div>
      <div class="ingredients-notice">Hover or tap on any flagged ingredient to read regulatory safety notes.</div>
      <div class="ingredients-list">${ingredientsHtml || '<span style="font-size: 12px; color: var(--text-muted);">No specific regulated cosmetic actives detected.</span>'}</div>
    </div>

    <div class="disclaimer-banner">
      <strong>Safety Notice:</strong> ${escapeHtml(disclaimer)}
    </div>
  `;
}


/* =================================================================
   RENDERING: RETAILER BATCH RESULT & CSV EXPORT
   ================================================================= */
function renderBatchResult(batchData) {
  const batchWrapper = document.getElementById('batchResultsWrapper');
  const avgScore = document.getElementById('batchAvgScore');
  const summaryText = document.getElementById('batchSummaryText');
  const tableBody = document.getElementById('batchTableBody');

  batchWrapper.style.display = 'flex';
  avgScore.textContent = `${batchData.averageScore || 0}%`;
  summaryText.textContent = `Completed batch audit across ${batchData.total} packaged commodity labels. ${batchData.fullyCompliant} items passed 100% statutory metrology checks.`;

  const items = batchData.items || [];
  tableBody.innerHTML = items.map(item => {
    const isError = !!item.error;
    const score = item.complianceScore || 0;
    const isCompliant = score === 100;

    let missingText = 'None (Fully Compliant)';
    if (item.fieldsDetected) {
      const missing = item.fieldsDetected.filter(f => !f.passed).map(f => f.label);
      if (missing.length > 0) missingText = missing.join(', ');
    }

    const statusBadge = isCompliant
      ? `<span class="status-badge pass">COMPLIANT</span>`
      : `<span class="status-badge ${score >= 60 ? 'warn' : 'fail'}">${score >= 60 ? 'PARTIAL' : 'NON-COMPLIANT'}</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(item.filename)}</strong></td>
        <td><span style="font-family: var(--font-heading); font-weight: 700;">${score}%</span></td>
        <td style="font-size: 12px; color: ${missingText === 'None (Fully Compliant)' ? 'var(--pass-green)' : 'var(--fail-red)'};">${escapeHtml(missingText)}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');

  batchWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupBatchCsvExport() {
  const exportBtn = document.getElementById('exportBatchCsvBtn');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    if (!currentBatchItems || currentBatchItems.length === 0) {
      alert('No batch scan data available to export.');
      return;
    }

    const headers = ["Filename", "ComplianceScore", "Status", "MissingRules", "Timestamp"];
    const rows = currentBatchItems.map(item => {
      const missing = item.fieldsDetected
        ? item.fieldsDetected.filter(f => !f.passed).map(f => f.label).join(' | ')
        : 'None';
      const status = item.complianceScore === 100 ? 'Compliant' : 'Non-Compliant';
      return [
        `"${item.filename}"`,
        item.complianceScore,
        `"${status}"`,
        `"${missing || 'None'}"`,
        `"${item.timestamp || new Date().toISOString()}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `legal_metrology_batch_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}


/* =================================================================
   SECTION C: OCR TEXT DRAWER & RE-ANALYZE
   ================================================================= */
function setupOcrDrawer() {
  const toggleBar = document.getElementById('ocrToggleBar');
  const contentBox = document.getElementById('ocrContentBox');
  const indicator = document.getElementById('ocrToggleIndicator');
  const copyBtn = document.getElementById('copyOcrBtn');
  const reanalyzeBtn = document.getElementById('reanalyzeBtn');
  const textArea = document.getElementById('ocrTextArea');

  toggleBar.addEventListener('click', () => {
    const isHidden = contentBox.style.display === 'none';
    contentBox.style.display = isHidden ? 'block' : 'none';
    indicator.innerHTML = isHidden ? 'Collapse &uarr;' : 'Edit / View &darr;';
  });

  copyBtn.addEventListener('click', () => {
    if (!textArea.value) return;
    navigator.clipboard.writeText(textArea.value).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy Text'; }, 1500);
    });
  });

  reanalyzeBtn.addEventListener('click', async () => {
    const editedText = textArea.value.trim();
    if (!editedText) return;

    setLoading(true, 'Re-analyzing Edited Label Text...', 'Executing regulatory rules on updated text');
    try {
      const res = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editedText,
          filename: lastScanResult?.filename || 'manual_edited.txt',
          mode: currentMode,
          category: currentCategory
        })
      });

      const json = await res.json();
      setLoading(false);

      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);

      lastScanResult = json.data;
      renderScanResult(json.data);
      loadStats();
      loadHistory();

    } catch (err) {
      setLoading(false);
      showError('Failed to re-analyze edited text: ' + err.message);
    }
  });

  textArea.addEventListener('input', () => {
    document.getElementById('ocrCharCount').textContent = `${textArea.value.length} characters`;
  });
}

function populateOcrDrawer(data) {
  const textArea = document.getElementById('ocrTextArea');
  const charCount = document.getElementById('ocrCharCount');
  const confidenceLabel = document.getElementById('ocrConfidenceLabel');

  textArea.value = data.rawOcrText || '';
  charCount.textContent = `${(data.rawOcrText || '').length} characters`;
  confidenceLabel.textContent = `(Confidence: ${data.ocrConfidence || 0}%)`;
}


/* =================================================================
   LIVENESS CHECK & DATA LOADING
   ================================================================= */
async function checkMlServiceHealth() {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('engineStatusText');

  try {
    const res = await fetch('/api/health');
    const json = await res.json();
    if (json.mlService && json.mlService.reachable) {
      dot.className = 'status-dot';
      text.textContent = "ML Service: Online (Port 8001)";
    } else {
      dot.className = 'status-dot offline';
      text.textContent = "ML Service: Offline (Using Rule Fallback)";
    }
  } catch (_) {
    dot.className = 'status-dot offline';
    text.textContent = "ML Service: Offline (Using Rule Fallback)";
  }
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const json = await res.json();
    if (json.success && json.data) {
      const s = json.data;
      document.getElementById('statTotalScans').textContent = s.totalScans || 0;
      document.getElementById('statAvgScore').textContent = `${s.averageComplianceScore || 0}%`;
      document.getElementById('statMissingField').textContent = s.mostCommonlyMissingField || 'None';
      document.getElementById('statCompliantPct').textContent = `${s.fullyCompliantPercentage || 0}%`;
    }
  } catch (_) {}
}

async function loadHistory(filterMode = 'all') {
  try {
    const res = await fetch(`/api/history?limit=10&mode=${filterMode}`);
    const json = await res.json();
    const tableBody = document.getElementById('historyTableBody');

    if (!json.success || !json.data || json.data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No scan history recorded yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = json.data.map(item => {
      const date = item.timestamp ? new Date(item.timestamp).toLocaleString() : '--';
      const modeBadge = `<span class="status-badge ${item.mode === 'retailer' ? 'info' : 'pass'}" style="font-size: 10px;">${(item.mode || 'retailer').toUpperCase()}</span>`;
      const score = `${item.complianceScore || 0}%`;
      const verdict = item.ratingOrConcern || (item.complianceScore === 100 ? 'Compliant' : 'Non-Compliant');

      return `
        <tr>
          <td style="font-size: 12px; color: var(--text-muted);">${escapeHtml(date)}</td>
          <td><strong>${escapeHtml(item.filename)}</strong></td>
          <td>${modeBadge}</td>
          <td style="text-transform: capitalize;">${escapeHtml(item.category || 'other')}</td>
          <td><span style="font-family: var(--font-heading); font-weight: 700;">${score}</span></td>
          <td><span style="font-weight: 600;">${escapeHtml(verdict)}</span></td>
        </tr>
      `;
    }).join('');

  } catch (_) {}
}


/* =================================================================
   HELPERS & UI UTILITIES
   ================================================================= */
function setLoading(isLoading, mainText = '', subText = '') {
  const indicator = document.getElementById('scanningIndicator');
  const main = document.getElementById('scanningMainText');
  const sub = document.getElementById('scanningSubText');

  if (isLoading) {
    main.textContent = mainText || 'Processing...';
    sub.textContent = subText || 'Executing background algorithms';
    indicator.style.display = 'flex';
  } else {
    indicator.style.display = 'none';
  }
}

function showError(msg) {
  const alert = document.getElementById('errorAlert');
  const text = document.getElementById('errorMessage');
  text.textContent = msg;
  alert.style.display = 'flex';
}

function hideAlerts() {
  document.getElementById('errorAlert').style.display = 'none';
  document.getElementById('lowConfidenceAlert').style.display = 'none';
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
