/* =================================================================
   Food Health Checker Controller (health.js)
   Uploads food labels to /api/scan, renders the Health Score,
   Nutri-Score ribbon, ingredient warnings, and nutrient grid.
   ================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initHealthChecker();
});

function initHealthChecker() {
  const dropZone  = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      scanFoodLabel(e.target.files[0]);
    }
  });

  // Drag and drop
  ['dragenter', 'dragover'].forEach(n => {
    dropZone.addEventListener(n, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(n => {
    dropZone.addEventListener(n, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      scanFoodLabel(e.dataTransfer.files[0]);
    }
  });

  // Sample buttons
  document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sample = btn.getAttribute('data-sample');
      if (sample) loadSample(sample);
    });
  });

  // Raw OCR panel toggle
  const ocrToggle = document.getElementById('ocrToggleBtn');
  if (ocrToggle) {
    ocrToggle.addEventListener('click', () => {
      const content = document.getElementById('ocrPanelContent');
      const arrow   = document.getElementById('ocrToggleArrow');
      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? 'block' : 'none';
      arrow.classList.toggle('open', isHidden);
    });
  }
}

async function loadSample(sampleFileName) {
  setLoading(true, `Loading sample "${sampleFileName}"...`);
  try {
    const url = sampleFileName.startsWith('17899') 
      ? `/uploads/${sampleFileName}` 
      : `/samples/${sampleFileName}`;
      
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const file = new File([blob], sampleFileName, { type: blob.type || 'image/jpeg' });
    scanFoodLabel(file);
  } catch (err) {
    setLoading(false);
    showError('Could not load sample: ' + err.message);
  }
}

async function scanFoodLabel(file) {
  setLoading(true, `Scanning ${file.name}...`, 'Running Open Food Facts AI & Indian ingredient analysis');
  hideError();

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);

    setLoading(false);
    renderHealthResults(json.data);

    const results = document.getElementById('resultsSection');
    if (results) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    setLoading(false);
    showError(err.message);
  }
}

function renderHealthResults(data) {
  const results = document.getElementById('resultsSection');
  results.style.display = 'block';

  const scoreEl = document.getElementById('healthScoreVal');
  const circleEl = document.getElementById('healthScoreCircle');
  const badgeEl = document.getElementById('healthModelBadge');

  if (badgeEl) badgeEl.textContent = data.modelSource || 'Open Food Facts AI';

  if (data.isFood === false) {
    scoreEl.textContent = 'N/A';
    circleEl.className = 'score-badge-circle neutral';
  } else {
    const s = data.healthScore !== null && data.healthScore !== undefined ? data.healthScore : 50;
    scoreEl.textContent = `${s}%`;
    circleEl.className = 'score-badge-circle';
    if (s >= 75) {
      // green
    } else if (s >= 45) {
      circleEl.classList.add('warning');
    } else {
      circleEl.classList.add('danger');
    }
  }

  // Ribbon
  const targetGrade = (data.nutriScoreGrade || '').toUpperCase();
  ['A', 'B', 'C', 'D', 'E'].forEach(g => {
    const el = document.getElementById(`grade${g}`);
    if (el) {
      if (data.isFood !== false && targetGrade === g) el.classList.add('active');
      else el.classList.remove('active');
    }
  });

  // Reason
  document.getElementById('healthReasonText').textContent = data.healthReason || 'Assessment complete.';

  // Nutrients
  const nutrientsGrid = document.getElementById('nutrientsGrid');
  nutrientsGrid.innerHTML = '';
  const list = data.nutrientsDetected || [];

  if (data.isFood !== false && list.length > 0) {
    list.forEach(n => {
      const card = document.createElement('div');
      card.className = 'nutrient-card';

      let tagClass = 'low';
      if (n.level === 'High') tagClass = 'high';
      else if (n.level === 'Medium') tagClass = 'medium';

      card.innerHTML = `
        <div class="nutrient-card-header">
          <span class="nutrient-name">${escapeHtml(n.label)}</span>
          <span class="nutrient-tag ${tagClass}">${n.level || 'Info'}</span>
        </div>
        <div class="nutrient-value-row">
          ${n.value}<span class="nutrient-unit">${escapeHtml(n.unit)}</span>
        </div>
      `;
      nutrientsGrid.appendChild(card);
    });
  } else if (data.isFood === false) {
    nutrientsGrid.innerHTML = `<div class="nutrients-empty">🧼 Non-Food Item — No nutritional scoring required.</div>`;
  } else {
    nutrientsGrid.innerHTML = `<div class="nutrients-empty">Nutritional facts not detected.</div>`;
  }

  // Raw OCR
  document.getElementById('ocrConfidenceTag').textContent = `Confidence: ${data.ocrConfidence || 0}%`;
  document.getElementById('rawOcrPre').textContent = data.rawOcrText || '(No text)';
}

function setLoading(isLoading, title = '', subtitle = '') {
  const card = document.getElementById('scanningCard');
  if (!card) return;
  if (isLoading) {
    document.getElementById('scanningTitle').textContent = title;
    document.getElementById('scanningSubtitle').textContent = subtitle;
    card.style.display = 'flex';
  } else {
    card.style.display = 'none';
  }
}

function showError(msg) {
  const alert = document.getElementById('errorAlert');
  const body = document.getElementById('errorMessage');
  if (alert && body) {
    body.textContent = msg;
    alert.style.display = 'flex';
  }
}

function hideError() {
  const alert = document.getElementById('errorAlert');
  if (alert) alert.style.display = 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
