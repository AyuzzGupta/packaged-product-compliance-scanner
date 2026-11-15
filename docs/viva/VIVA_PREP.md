# Packaged Product Compliance Scanner (SIH26034)
# Comprehensive Viva-Voce Master Preparation Guide

**Candidate Name**: Ayush Gupta  
**Project Title**: Packaged Product Compliance Scanner for Legal Metrology & Health Risk Screening  
**Problem Statement ID**: SIH26034  
**Date of Evaluation**: 15 November 2026  

---

> [!IMPORTANT]
> **Kaise use karein is guide ko?**  
> Ye guide examiner ke har standard aur trap question ko tackle karne ke liye real codebase par banayi gayi hai. Isme saare technical terms ko real-life analogies ke sath Hinglish mein samjhaya gaya hai. Code snippets English mein hain aur exact repository file names ke sath quoted hain.

---

# TABLE OF CONTENTS
1. [Project in 60 Seconds & in 3 Minutes (Speakable)](#1-project-in-60-seconds--in-3-minutes)
2. [Architecture & Full Request Flow](#2-architecture--full-request-flow)
3. [Repository File Map](#3-repository-file-map)
4. [Frontend Deep-Dive (DOM, Events, Async, Functions)](#4-frontend-deep-dive)
5. [Backend Deep-Dive (Express, .env, Multer, Concurrency)](#5-backend-deep-dive)
6. [Machine Learning & OCR Deep-Dive](#6-machine-learning--ocr-deep-dive)
7. [The "Why Not React?" Guide & React Rewrites](#7-the-why-not-react-guide--react-rewrites)
8. [Comprehensive Question Bank (~150 Questions)](#8-comprehensive-question-bank)
9. [30 Code-Reading Drills (Easy to Hard)](#9-30-code-reading-drills)
10. [Honest Weaknesses & Safe Phrases](#10-honest-weaknesses--safe-phrases)
11. [One-Page Master Cheat Sheet](#11-one-page-master-cheat-sheet)

---

## 1. Project in 60 Seconds & in 3 Minutes

### A. Project in 60 Seconds (Elevator Pitch)
*"Good morning Sir/Ma'am. Mera project hai **ComplianceScan (SIH26034)** — ek automated web inspection system jo packaged goods ke printed label ko photo se scan karke verify karta hai.*  
*Indian law (**Legal Metrology Packaged Commodities Rules, 2011 Rule 6**) ke tehat har packet par 5 statutory cheezein hona mandatory hai: Net Quantity, MRP with taxes, Manufacturer address, Consumer helpline, aur Dates. Hamara system **Tesseract OCR aur Sharp image processing** se label ka text nikalta hai, regex engine se 5 statutory rules ka presence audit karta hai, aur **Python FastAPI microservice (Scikit-Learn models)** se product ki category (Food, Cosmetic, Other) pehchan kar deep health analysis karta hai — jaise Food ke liye Nutri-Score (Grade A to E) aur Cosmetics ke liye allergens aur harmful preservatives ko flag karna.*  
*Iski sabse badi khasiyat hai ki ye 100% offline aur lightweight hai, bina kisi expensive cloud API ke."*

---

### B. Project in 3 Minutes (Detailed Overview)
*"Sir, hamare desh mein daily hazaron naye packaged products market mein aate hain. Yahan do badi problems hain:*  
*1. **Enforcement Officers aur Shopkeepers ke liye**: Hazaron packets ko haath mein magnifying glass lekar check karna impossible hai ki unpe customer care number hai ya nahi, ya MRP pe stamp manipulation to nahi hua.*  
*2. **Ordinary Consumers ke liye**: Packet ke piche microscopic font mein likhe complex chemical names, hidden palm oils, excessive added sugars aur harmful preservatives aam insaan ki samajh se bahar hote hain.*  
*Normal apps barcode scan karti hain, lekin agar koi local manufacturer ho ya packet naya ho jiska barcode online database mein na ho, toh barcode apps completely fail ho jaati hain.*

*Humne iska solution banaya hai ek end-to-end 3-tier architecture:*  
* **Tier 1 (Frontend)**: Pure Vanilla HTML5, CSS3 aur ES6 JavaScript. Zero framework overhead, super fast load time. Isme do dedicated modes hain: **Retailer Mode** (jisme shopkeeper ek saath 10 images batch upload karke CSV report download kar sakta hai) aur **Consumer Mode** (jisme deep health risk assessment hota hai).*  
* **Tier 2 (Backend)**: Node.js Express server on port 5001. Ye `sharp` library se image ka contrast aur Otsu thresholding improve karta hai, phir `Tesseract.js` WebAssembly OCR se text extract karke Rule 6 compliance check karta hai.*  
* **Tier 3 (ML Microservice)**: Python FastAPI server on port 8001. Isme do trained models hain: pehla **TF-IDF + Calibrated Logistic Regression** jo label text padh kar batata hai ki product Food hai, Cosmetic hai ya Other (electronics/apparel). Agar Food hai, toh hamara **14-feature Random Forest model** FSSAI guidelines ke mutabiq Nutri-Score calculate karta hai aur high sugar/palm oil ko flag karta hai. Agar Cosmetic hai, toh `RapidFuzz` string matching se 113+ chemical database scan karke parabens aur allergens alert karta hai.*

*Saara data hamare concurrency-safe JSON persistence store (`dataStore.js`) mein save hota hai, jisme atomic file-rename mechanism lagaya hai taaki high traffic mein data loss na ho."*

---

## 2. Architecture & Full Request Flow

### Request Flow Step-by-Step (User drops an image -> Result on screen)

```
[User Browser]
      │
      │ 1. Drag & Drop Image (e.g. maggi.png)
      ▼
[frontend/js/script.js: handleDrop()]
      │ 2. Client MIME validation (jpg/png/webp < 8MB)
      │ 3. Pack into FormData object
      ▼
[HTTP POST /api/scan (Port 5001)]
      │
      ▼
[backend/routes/api.js: upload.single('image')]
      │ 4. Multer saves image temporarily in backend/uploads/
      ▼
[backend/services/ocrService.js: extractText()]
      │ 5. Sharp generates 3 preprocessing variants:
      │    - standard_enhanced (Grayscale + Normalization + 2400px upscale + Sharpen)
      │    - adaptive_otsu (Otsu binary thresholding for glossy glare)
      │    - sharpen_contrast (Linear contrast stretch)
      │ 6. Tesseract.js recognizes variants using backend/assets/tessdata/eng.traineddata
      │ 7. Selects text with highest mean confidence score
      ▼
[backend/routes/api.js: finally block]
      │ 8. Ephemeral Cleanup: Immediately deletes uploaded image from disk
      ▼
[backend/services/complianceCheck.js: runComplianceCheck()]
      │ 9. Regex audits 5 core Rule 6 declarations (Net Qty, MRP, Mfg, Helpline, Dates)
      │    Calculates Statutory Score (0-100%) and generates presence summary
      ▼
[backend/services/categoryDetect.js: detectCategory()]
      │ 10. Calls HTTP POST http://localhost:8001/classify
      │     Python ML Model returns: category='food', confidence=0.98
      ▼
[backend/services/healthCheck.js: runHealthCheck()]
      │ 11. Extracts nutrition table (Sugars, Sat Fat, Sodium, Energy)
      │ 12. Calls HTTP POST http://localhost:8001/rate-food
      │     Random Forest returns Grade D, top feature importances
      │ 13. Calls HTTP POST http://localhost:8001/match-ingredients
      │     RapidFuzz matches Palm Oil, Maida, Tartrazine
      ▼
[backend/services/dataStore.js: addScan()]
      │ 14. Serialized Promise queue writes record to data/scans.json via atomic .tmp rename
      ▼
[HTTP 200 JSON Response to Browser]
      │
      ▼
[frontend/js/script.js: renderScanResult()]
      │ 15. Updates DOM elements:
      │     - SVG circular compliance gauge & score badge
      │     - Statutory Rule 6 table checklist
      │     - Nutri-Score Grade banner & circular nutrient meters
      │     - Flags list & Human-in-the-loop OCR text drawer
```

---

## 3. Repository File Map

* `backend/server.js`: Express web server entry point; loads `.env` at top, sets middleware, serves frontend static assets and sample images, starts on port 5001.
* `backend/routes/api.js`: Express REST router exposing `/scan`, `/scan-batch`, `/analyze-text`, `/history`, `/stats`, `/health`, and `/ml/metrics`.
* `backend/services/ocrService.js`: Multi-variant image preprocessing pipeline using Sharp and Tesseract.js WebAssembly OCR; auto-selects highest confidence text.
* `backend/services/complianceCheck.js`: Statutory regex engine verifying presence of mandatory Rule 6 declarations under Legal Metrology Rules, 2011.
* `backend/services/categoryDetect.js`: Hybrid category detection router; queries Python ML microservice `/classify` with deterministic keyword fallback.
* `backend/services/healthCheck.js`: Food health analysis coordinator; extracts nutrition tables, calls ML Nutri-Score, and matches food additives.
* `backend/services/cosmeticCheck.js`: Cosmetic safety analyzer; matches topical ingredients against EU CosIng / SCCS database via fuzzy string matching.
* `backend/services/healthModelService.js`: Local Open Food Facts nutrient classification heuristics service.
* `backend/services/dataStore.js`: Concurrency-safe JSON database manager; implements Promise write queue, atomic temp rename, and test record isolation.
* `backend/assets/tessdata/eng.traineddata`: Local neural network traineddata language model file for offline Tesseract OCR.
* `frontend/index.html`: Primary client application single-page interface with Consumer and Retailer mode switching.
* `frontend/dashboard.html`: Centralized regulatory compliance audit dashboard with charts, KPI cards, and filterable history table.
* `frontend/health.html`: Lightweight redirect and system health monitor page.
* `frontend/css/styles.css`: Custom vanilla CSS design system engineered with CSS Custom Properties, flexbox, and responsive grid layouts.
* `frontend/js/script.js`: Core client frontend controller managing file ingestion, API fetch calls, DOM rendering, and the interactive OCR text drawer.
* `frontend/js/dashboard.js`: Dashboard controller aggregating real-time audit statistics, Rule 6 pass rates, and model accuracy reports.
* `ml-service/app.py`: Python FastAPI REST microservice running on port 8001 exposing `/classify`, `/rate-food`, and `/match-ingredients`.
* `ml-service/evaluate.py`: Standalone evaluation script testing models on held-out test splits and outputting `metrics.json`.
* `ml-service/scripts/train_category.py`: Trains the Product Category Classifier (TF-IDF + Calibrated Logistic Regression) with OCR noise simulation.
* `ml-service/scripts/train_nutriscore.py`: Trains the 14-Feature Random Forest Food Nutri-Score Classifier against rule-based baselines.
* `ml-service/scripts/build_ingredient_db.py`: Compiles the canonical 113-entry ingredient knowledge base from statutory sources.
* `ml-service/scripts/prepare_data.py`: Generates and splits training datasets for category and nutritional classifiers.
* `ml-service/models/category_model.joblib`: Serialized binary artifact of trained category classification pipeline (~2.4MB).
* `ml-service/models/nutriscore_model.joblib`: Serialized binary artifact of trained Nutri-Score Random Forest classifier (~415KB).
* `ml-service/models/metrics.json`: Empirical evaluation metrics containing exact accuracies, precision, recall, F1, and baseline comparisons.
* `data/ingredientDB.json`: Curated database of 113 statutory food and cosmetic ingredients with regulatory citations, concerns, and aliases.
* `data/scans.json`: Primary runtime database storing historical scan records (gitignored).
* `data/samples/`: Pre-loaded real packaging label photographs for instant zero-upload evaluation.
* `tests/run_tests.js`: Master 12-test automated verification suite (8 diverse text test cases + 4 real physical image OCR tests).
* `tests/unit/test_datastore_concurrency.js`: Concurrency verification test firing 10 concurrent asynchronous saves to prove thread safety.
* `tests/eval/run_ocr_eval.js`: Empirical OCR evaluation script benchmarking physical packaging photos against ground truth annotations.
* `tests/eval/ground_truth.csv`: Benchmark ground truth dataset defining expected statutory field detections per test image.
* `scripts/start-ml.js`: Cross-platform Node.js launcher automatically detecting virtual environment Python executables across macOS, Linux, and Windows.
* `scripts/reset-data.js`: Database utility that creates an automated timestamped backup of `scans.json` before resetting the store to `[]`.
* `scripts/validate-ingredients.js`: Automated knowledge-base validator ensuring every ingredient has reason, regulatory source, and zero duplicate aliases.
* `.env`: Active local environment configuration file defining ports, timeouts, and storage paths.
* `.env.example`: Committed template defining all required environment variables with safe defaults.

---

## 4. Frontend Deep-Dive

### A. HTML / CSS / JavaScript Basics & What the DOM Is
* **Real-life Analogy**: Imagine a web page as an office building.
  * **HTML** is the concrete bricks and beams (the structure: walls, doors, rooms).
  * **CSS** is the interior design, paint, lighting, and signs (the appearance and styling).
  * **JavaScript** is the electricity, elevators, and automated doors (the logic and interactivity).
  * **The DOM (Document Object Model)** is the live digital blueprint kept at the security desk. When JavaScript wants to open a door or turn on a light, it doesn't smash the brick wall; it asks the blueprint: *"Hey DOM, find the door with ID 'room101' and change its state to open."* The browser immediately updates the actual room on screen.

### Where Our Code Touches the DOM:
1. `document.getElementById('metrologyScoreVal')`: Looks up a specific DOM node by its unique HTML ID. Used in `script.js` to select score numbers, tables, and buttons.
2. `document.querySelector('.drop-zone')`: Searches the DOM tree using CSS selectors.
3. `document.createElement('div')`: Dynamically constructs a brand new HTML node in browser memory before attaching it to the live tree.
4. `element.textContent = "100%"` vs `element.innerHTML = "<p>Text</p>"`:
   * `textContent` sets raw, unparsed text safely (prevents Cross-Site Scripting / XSS).
   * `innerHTML` parses the string as HTML tags (used when rendering dynamic tables and status badges).
5. `element.classList.add('active')` / `element.classList.remove('active')`: Dynamically toggles CSS styling rules on a DOM element without inline style mess.

### B. Events & Event Handling
* **Events**: Signals fired by the browser when something happens (user clicks, types, drags a file).
* **Event Listeners**: Functions registered with `element.addEventListener('click', handler)` waiting patiently for that signal.
* **Event Bubbling**: When you drop an image into an inner icon inside the drop zone, the event starts at the icon, then "bubbles" upward to the parent box, and finally to the window. In our code, we call `e.preventDefault()` and `e.stopPropagation()` inside `setupUploadHandlers` so the browser doesn't execute its default behavior (which would be opening the image file directly in the browser tab).

### C. Network Requests: fetch, async/await, Promises & FormData
* **Promise**: A token for a future value (like a token you get at a burger counter). It starts *pending*, and ends either *resolved* (burger ready) or *rejected* (out of burgers).
* **async/await**: Modern syntax that makes asynchronous Promise code read like regular synchronous code without callback hell.
* **FormData**: A browser API that bundles binary files and text into a `multipart/form-data` HTTP payload, identical to how a traditional HTML `<form>` uploads a file.
* **Request Flow**: `script.js` captures the dropped file, appends it to a `FormData` object with `formData.append('image', file)`, calls `await fetch('/api/scan', { method: 'POST', body: formData })`, waits for the Express server to reply with JSON, and passes the parsed result to `renderScanResult()`.

### D. Local Storage & Responsive Styling
* **localStorage**: A key-value storage sandbox built into the browser that survives page reloads. We use `localStorage.setItem('compliance_mode', newMode)` so when a shopkeeper refreshes the page, it stays in Retailer Mode.
* **Responsive CSS**: We use CSS Grid (`grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`) and Flexbox (`display: flex; align-items: center; justify-content: space-between;`) combined with native media queries (`@media (max-width: 768px)`). No Bootstrap or Tailwind was needed.

---

### E. Line-by-Line Walkthrough of 5 Core Frontend Functions

#### Function 1: `switchMode(newMode)` in `frontend/js/script.js`
```javascript
function switchMode(newMode) {
  currentMode = newMode;                                // 1. Updates global mode state variable
  localStorage.setItem('compliance_mode', newMode);    // 2. Persists mode in browser storage
  applyModeUI(newMode);                                 // 3. Toggles button styles, headings, & batch controls
  loadStats();                                          // 4. Fetches mode-aware statistics from /api/stats
  if (lastScanResult) {                                 // 5. If a scan is currently visible on screen:
    renderScanResult(lastScanResult);                   // 6. Immediately re-renders it to reflect new mode
  }
}
```
* **Explanation**: Toggles the user experience between high-speed bulk metrology auditing for shopkeepers and deep nutritional/chemical safety screening for everyday consumers.

#### Function 2: `handleDrop(e)` in `frontend/js/script.js`
```javascript
function handleDrop(e) {
  e.preventDefault();                                  // 1. Prevents browser from opening image file directly
  e.stopPropagation();                                 // 2. Stops event from bubbling to outer containers
  dropZone.classList.remove('drag-over');               // 3. Removes active border highlighting CSS class
  const files = e.dataTransfer.files;                  // 4. Extracts array of dropped files from event data
  if (files && files.length > 0) {
    if (currentMode === 'retailer' && files.length > 1) {
      processBatchFiles(files);                        // 5. If multiple files in retailer mode -> batch pipeline
    } else {
      processSingleFile(files[0]);                     // 6. Otherwise processes primary file through single pipeline
    }
  }
}
```

#### Function 3: `renderMetrologyCard(data)` in `frontend/js/script.js`
```javascript
function renderMetrologyCard(data) {
  const scoreVal = document.getElementById('metrologyScoreVal');
  const summaryText = document.getElementById('metrologySummaryText');
  const tableBody = document.getElementById('metrologyTableBody');
  const engineTag = document.getElementById('metrologyEngineTag');
  const ocrConfTag = document.getElementById('ocrConfidenceTag');
  const reanalyzeHint = document.getElementById('reanalyzeHint');

  scoreVal.textContent = `${data.complianceScore || 0}%`;  // 1. Injects calculated percentage into gauge
  summaryText.innerHTML = `${escapeHtml(data.complianceSummary || 'Verification completed.')}<br><small style="color: var(--text-subtle); display: block; margin-top: 4px;">Presence check only. Preliminary screening, not official certification.</small>`;

  engineTag.textContent = data.engine === 'ml' ? 'ML Engine' : (data.engine === 'hybrid' ? 'Hybrid (ML+Rules)' : 'Rule-Based');

  if (ocrConfTag) {
    ocrConfTag.textContent = `OCR Conf: ${data.ocrConfidence || 0}%`; // 2. Displays confidence percentage
    ocrConfTag.className = `engine-tag ${(data.ocrConfidence < 60) ? 'warning' : 'ml'}`;
  }

  if (reanalyzeHint) {
    reanalyzeHint.style.display = (data.ocrConfidence < 60 || data.lowConfidence) ? 'flex' : 'none'; // 3. Prompts edit drawer
  }

  const fields = data.fieldsDetected || [];
  tableBody.innerHTML = fields.map(f => `              // 4. Generates table rows for all 5 statutory rules
    <tr>
      <td><strong>${escapeHtml(f.label)}</strong></td>
      <td><span class="status-badge ${f.passed ? 'pass' : 'fail'}">${f.passed ? 'PASSED' : 'MISSING'}</span></td>
      <td>${f.passed ? `<span class="matched-snippet-code">${escapeHtml(f.matchedText)}</span>` : '<span style="color:var(--text-subtle);">Not detected</span>'}</td>
    </tr>
  `).join('');
}
```

#### Function 4: `renderConsumerHealth(data)` in `frontend/js/script.js`
```javascript
function renderConsumerHealth(data) {
  const wrapper = document.getElementById('consumerHealthSection');
  if (data.mode === 'retailer' || data.category === 'other') {
    wrapper.style.display = 'none';                    // 1. Hides health section if not food/cosmetics
    return;
  }
  wrapper.style.display = 'block';                     // 2. Reveals health scorecard container
  if (data.isFood) {
    renderFoodScorecard(data);                         // 3. Renders Nutri-Score (A-E) banner and nutrient table
  } else if (data.isCosmetic) {
    renderCosmeticScorecard(data);                     // 4. Renders chemical sensitivity meter and allergen flags
  }
}
```

#### Function 5: `reanalyzeText()` in `frontend/js/script.js`
```javascript
async function reanalyzeText() {
  const editedText = document.getElementById('ocrEditorTextarea').value; // 1. Reads user-edited text from drawer
  if (!editedText.trim()) return;
  showScanningIndicator('Re-analyzing Edited Text...', 'Processing statutory rules without re-running OCR');

  const res = await fetch('/api/analyze-text', {        // 2. Sends text directly to backend (bypassing OCR)
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: editedText,
      filename: lastScanResult?.filename || 'edited_label.txt',
      mode: currentMode,
      category: currentCategory
    })
  });
  const json = await res.json();
  hideScanningIndicator();
  if (json.success && json.data) {
    lastScanResult = json.data;                         // 3. Updates cached result
    renderScanResult(json.data);                        // 4. Re-renders UI with updated scores immediately
  }
}
```

---

## 5. Backend Deep-Dive

### A. Node.js, Express & Server Architecture
* **Node.js vs Browser JS**:
  * Browser JavaScript runs inside a security sandbox, has no direct access to files, and controls the UI.
  * Node.js is an open-source JavaScript runtime built on Chrome's V8 engine that runs on the operating system, with direct access to file systems (`fs`), network ports (`http`), and operating system processes.
* **Express.js**: A lightweight, minimalist web framework for Node.js. It simplifies HTTP request routing (`app.get`, `app.post`), middleware chaining, and JSON payload handling.
* **Middleware**: Functions that execute in the middle of an incoming request and the final route handler (e.g., `express.json()` to parse request bodies, `multer` to handle file streams).

### B. The `.env` Configuration File (Answerable in 30 Seconds)
* **Model Answer for Viva**:  
  *"Sir, `.env` file hamare application ke sensitive aur environment-dependent settings ko store karti hai — jaise server ports, timeouts, file size limits, aur database file paths. Isse code aur configuration separate rehte hain (`Twelve-Factor App methodology`). Hum `dotenv` package use karke `.env` ke values ko `process.env` object mein load karte hain. `.env` ko `.gitignore` mein rakha jata hai taaki hardcoded credentials git repo mein leak na hon, aur humne ek committed `.env.example` file banayi hai jisse koi bhi naya developer defaults dekh sake."*

#### Our Exact `.env` Keys Explained:
1. `PORT=5001`: Port for the Express server. We use `5001` on macOS because Apple's AirPlay Receiver daemon occupies port `5000` by default.
2. `NODE_ENV=development`: Sets execution environment mode.
3. `ML_SERVICE_URL=http://localhost:8001`: Base URL where the Python FastAPI microservice listens.
4. `ML_TIMEOUT_MS=4000`: Maximum wait time (4 seconds) before timing out ML HTTP requests and falling back to rule engines.
5. `MAX_UPLOAD_MB=8`: Maximum single packaging image size accepted by Multer.
6. `MAX_BATCH_FILES=10`: Limit for simultaneous images in Retailer batch audit mode.
7. `DATA_FILE=data/scans.json`: Path to persistent JSON database.
8. `TESSDATA_PATH=backend/assets/tessdata`: Path to local offline Tesseract OCR neural network traineddata model.
9. `ML_PORT=8001`: Port bound by Python FastAPI microservice.

### C. Concurrency Safety & Data Persistence (`dataStore.js`)
* **The Problem**: If two users upload packets at the exact same millisecond, a standard `fs.writeFileSync` reads the file, pushes an item, and writes back. The second write completely overwrites and destroys the first user's record.
* **Our Solution**:
  1. **Promise Write Queue**: Every call to `dataStore.addScan(record)` is appended to an in-memory Promise chain (`writeQueue = writeQueue.then(...)`). This guarantees writes happen one after another in strict sequence (FIFO serialization).
  2. **Atomic Write & Rename**: The record is written to a unique temporary file (`.tmp_scans_<timestamp>_<random>.json`). Once fully written, Node executes `fs.promises.rename(tempFile, targetPath)`. On POSIX filesystems, file rename is an **atomic kernel operation** — meaning the file is never seen in a half-written or corrupted state.
  3. **Verification**: Verified via `node tests/unit/test_datastore_concurrency.js`, which fires 10 concurrent asynchronous saves simultaneously. The test confirmed exactly 10/10 records were persisted with zero dropped rows.

---

### D. Line-by-Line Walkthrough of 5 Core Backend Functions

#### Function 1: `runComplianceCheck(ocrText)` in `backend/services/complianceCheck.js`
```javascript
function runComplianceCheck(ocrText) {
  const fields = [];

  for (const field of FIELDS) {                        // 1. Loops through all 5 Rule 6 field definitions
    let passed = false;
    let matchedText = '';

    for (const pattern of field.patterns) {            // 2. Evaluates regex patterns in order of specificity
      const m = ocrText.match(pattern);
      if (m) {
        passed = true;
        matchedText = (m[1] || m[0]).trim().substring(0, 120); // 3. Captures matching statutory text
        break;
      }
    }

    fields.push({ id: field.id, label: field.label, passed, matchedText });
  }

  const passedCount = fields.filter(f => f.passed).length;
  const total = fields.length;
  const score = Math.round((passedCount / total) * 100); // 4. Calculates 0-100% compliance percentage

  // 5. Generates honest presence verdict
  const verdict = score === 100 ? 'All 5 core declarations detected' : `${passedCount} of ${total} declarations detected`;
  const summary = score === 100
    ? 'All 5 core declarations detected. Presence check only. Preliminary screening, not official certification.'
    : `${passedCount} of ${total} declarations detected (${total - passedCount} missing or unverified). Presence check only. Preliminary screening, not official certification.`;

  return { score, fields, summary, verdict };
}
```

#### Function 2: `detectCategory(text, manualCategory)` in `backend/services/categoryDetect.js`
```javascript
async function detectCategory(text, manualCategory = 'auto') {
  if (manualCategory && manualCategory !== 'auto') {
    return { category: manualCategory.toLowerCase(), confidence: 1.0, engine: 'manual' };
  }

  try {
    const mlRes = await callMlClassifier(text);        // 1. Calls Python FastAPI /classify endpoint
    if (mlRes && mlRes.confidence >= 0.60) {
      // Reconcile: If ML predicts 'other' due to standard address boilerplate,
      // but deterministic statutory markers (FSSAI, nutrition, soap) are present:
      if (mlRes.category === 'other') {
        const ruleCheck = ruleBasedClassify(text);
        if (ruleCheck.category !== 'other' && ruleCheck.confidence >= 0.65) {
          return { category: ruleCheck.category, confidence: ruleCheck.confidence, engine: 'hybrid' };
        }
      }
      return { category: mlRes.category, confidence: mlRes.confidence, engine: 'ml' };
    }
  } catch (err) {
    console.log(`[categoryDetect] ML Service unavailable, using rule fallback.`);
  }

  return ruleBasedClassify(text);                      // 2. Deterministic keyword fallback
}
```

#### Function 3: `POST /api/scan` Route Handler in `backend/routes/api.js`
```javascript
router.post('/scan', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return handleMulterError(err, res);       // 1. Handles file size/type errors with friendly JSON
    if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded.' });

    const imagePath = req.file.path;
    try {
      const mode = req.body.mode || 'consumer';
      const category = req.body.category || 'auto';

      // 2. Executes multi-variant Sharp preprocessing + Tesseract OCR
      const ocrResult = await ocrService.extractText(imagePath, { fastMode: false });

      // 3. Runs full analysis pipeline (Rule 6 + ML inference)
      const record = await processAnalysisPipeline({
        text: ocrResult.text || '',
        filename: req.file.originalname,
        mode,
        category,
        ocrConfidence: ocrResult.confidence || 0,
        winningVariant: ocrResult.winningVariant,
        variantsTested: ocrResult.variantsTested
      });

      // 4. Concurrency-safe atomic persistence
      await dataStore.addScan(record);
      return res.json({ success: true, data: record });

    } catch (procErr) {
      return res.status(500).json({ success: false, error: procErr.message });
    } finally {
      // 5. Ephemeral Retention Policy: Immediately deletes image from server disk
      if (fs.existsSync(imagePath)) {
        try { fs.unlinkSync(imagePath); } catch (_) {}
      }
    }
  });
});
```

#### Function 4: `runHealthCheck(ocrText, filename)` in `backend/services/healthCheck.js`
```javascript
async function runHealthCheck(ocrText, filename) {
  const { nutrients, hasTable } = extractNutrients(ocrText); // 1. Extracts sugar, sat fat, sodium per 100g
  let matchedIngs = [];

  try {
    const mlMatch = await callMlMatchIngredients(ocrText, "food"); // 2. Calls Python /match-ingredients
    matchedIngs = mlMatch.matched_ingredients;
  } catch (_) {
    matchedIngs = localMatchFoodIngredients(ocrText);            // 3. Graceful fallback to local DB match
  }

  let rating = 'C';
  let engine = 'rules';
  if (hasTable) {
    try {
      const mlFood = await callMlRateFood(nutrients, ocrText);   // 4. Calls 14-feature Random Forest model
      rating = mlFood.grade;
      engine = 'ml';
    } catch (_) {
      rating = scoreToNutriScore(calculateHealthScore(nutrients, ocrText)); // 5. Rule baseline fallback
    }
  }
  return { nutriScoreGrade: rating, engine, nutrients, ingredients: matchedIngs };
}
```

#### Function 5: `analyzeCosmetic(ocrText)` in `backend/services/cosmeticCheck.js`
```javascript
async function analyzeCosmetic(ocrText) {
  let matchedIngs = [];
  try {
    const mlRes = await callMlMatchIngredients(ocrText, "cosmetic");
    matchedIngs = mlRes.matched_ingredients || [];
  } catch (_) {
    matchedIngs = localMatchCosmeticIngredients(ocrText);
  }

  const highConcern = matchedIngs.filter(i => i.concern === 'high');
  const modConcern = matchedIngs.filter(i => i.concern === 'moderate');

  let concernLevel = 'Low';
  if (highConcern.length > 0) concernLevel = 'High';
  else if (modConcern.length >= 2) concernLevel = 'Moderate';

  return {
    concernLevel,
    ingredients: matchedIngs,
    disclaimer: "Informational only. Reactions vary by skin type and allergies. Not medical advice. Do a patch test."
  };
}
```

---

## 6. Machine Learning & OCR Deep-Dive

### A. Core Machine Learning Concepts Simplified
1. **TF-IDF (Term Frequency - Inverse Document Frequency)**:
   * *Analogy*: Think of a book index. If the word *"the"* appears 1,000 times, it tells you nothing about the topic. But if the word *"paraben"* or *"sls"* appears 5 times, it strongly signals the document is about cosmetics. TF-IDF boosts words that are frequent in this document but rare across all other documents.
2. **Logistic Regression with Calibrated Probabilities**:
   * *Analogy*: Drawing a straight dividing line between two groups of students (pass vs fail). It calculates the mathematical odds (between 0.0 and 1.0) of a text belonging to `food`, `cosmetic`, or `other`.
3. **Random Forest Classifier**:
   * *Analogy*: A council of 100 independent experts (decision trees). Each tree looks at different random subsets of nutrients (sugar, sodium, palm oil) and votes on a grade. The final Nutri-Score is the majority vote of the forest.
4. **Train / Test Split**:
   * Splitting data into 80% for training and 20% for testing. The model never sees the test set during training.
5. **Accuracy vs Precision vs Recall vs F1-Score**:
   * *Accuracy*: Overall percentage of correct predictions.
   * *Precision*: When the model says "this is cosmetic", how often is it actually cosmetic?
   * *Recall*: Out of all actual cosmetics in the test set, how many did the model catch?
   * *F1-Score*: The harmonic balance between precision and recall.
6. **Confusion Matrix**:
   * A 3x3 table showing where the model was right and where it confused one category for another.

---

### B. Real Empirical Metrics from `metrics.json` (Real Numbers Only)

#### 1. Product Category Classifier
* **Architecture**: Word n-grams (1–2) + Character n-grams (3–5) TF-IDF Vectorizer with Calibrated Logistic Regression.
* **Dataset**: 1,700 samples (1,360 Train / 340 Test).
* **Overall Test Accuracy**: **100.00%**
* **Per-Class Breakdown**:
  * `food`: Precision 1.00 | Recall 1.00 | F1 1.00 (120 test samples)
  * `cosmetic`: Precision 1.00 | Recall 1.00 | F1 1.00 (120 test samples)
  * `other`: Precision 1.00 | Recall 1.00 | F1 1.00 (100 test samples)
* **Confusion Matrix**: Zero false positives, zero false negatives across all 3 classes on the test split.
* **Important Evaluation Note**: The `other` class (electronics/apparel/hardware) relies on synthetic templates of standard warranty and BIS declarations, which is clearly disclosed in `metrics.json`.

#### 2. Food Nutri-Score Model vs Rule-Based Baseline
* **Architecture**: 14-Feature Random Forest Classifier.
* **Dataset**: 1,750 products (1,400 Train / 350 Test) stratified evenly across grades A, B, C, D, E.
* **Comparative Evaluation on the Exact Same 350 Held-Out Test Rows**:
  * **Random Forest Model**:
    * **Exact-Grade Accuracy**: **100.00%**
    * **Within-One-Grade Accuracy**: **100.00%**
  * **Rule-Based Rayner/FSA Baseline Formula**:
    * **Exact-Grade Accuracy**: **50.86%**
    * **Within-One-Grade Accuracy**: **95.71%**

#### 3. Top Feature Importances (% Contribution):
1. `sugars_100g`: **16.94%** (Primary negative nutrient driver)
2. `energy_kcal`: **12.58%** (Caloric density)
3. `saturated_fat_100g`: **12.32%** (Atherogenic fat)
4. `sodium_100g`: **11.42%** (Hypertension indicator)
5. `fiber_100g`: **11.10%** (Positive gut health nutrient)
6. `additives_count`: **10.89%** (Ultra-processing signal)
7. `proteins_100g`: **6.65%** (Positive macronutrient)
8. `has_palm_oil`: **5.04%** (Indian dietary penalty)
9. `sugar_in_top_3`: **4.64%** (High-concentration sugar flag)
10. `salt_in_top_3`: **3.95%** (High-concentration sodium flag)
11. `oil_in_top_3`: **3.24%** (High-concentration fat flag)
12. `has_refined_flour`: **1.24%** (Maida penalty)

#### 4. The "Nutri-Score Honesty" Question:
* **Viva Question**: *"Nutri-Score toh ek fixed formula hota hai, toh aapne Machine Learning kyu use kiya?"*
* **Model Answer**:  
  *"Sir, bilkul sahi baat hai. Original European Nutri-Score ek mathematical point-based formula hai. Lekin humne dekha ki standard European formula Indian context ke harmful ingredients — jaise Refined Palm Oil, Refined Maida, aur ingredient list ke top 3 positions par chashni/sugar hone ko consider nahi karta.*  
  *Isliye humne 14 features par Random Forest train kiya. Hamare benchmark test (`metrics.json`) par standard rule baseline exact grade sirf **50.86%** baar match karta hai, jabki hamara Random Forest Indian statutory penalties ko accurately predict karta hai. Hum system mein hybrid transparency rakhte hain: response mein explicitly mention hota hai ki grade ML engine ne diya ya rule baseline ne."*

---

### C. OCR Preprocessing & Fuzzy Matching Deep-Dive
* **Why Multi-Variant Sharp Preprocessing?**  
  Glossy plastic packaging reflects flash and ambient lights, making plain Otsu binarization wash out characters. Our engine runs 3 variants:
  1. `standard_enhanced`: Grayscale + dynamic range stretching + 2400px upscale + mild sharpening.
  2. `adaptive_otsu`: Grayscale + Otsu binary thresholding (handles extreme glare).
  3. `sharpen_contrast`: Linear contrast boost without binary thresholding (preserves fine font serifs).  
  Tesseract evaluates them and auto-selects the text with the highest mean character confidence.
* **Why Fuzzy String Matching (`RapidFuzz`)?**  
  OCR text on crinkled packets frequently introduces typos (e.g., `"Sodlum Benzoate"` instead of `"Sodium Benzoate"`). Exact lookup (`db.includes(token)`) completely fails. We use `RapidFuzz` Token-Sort Levenshtein distance with an 82% similarity threshold to reliably match misspelled chemical names to our canonical 113-ingredient database.

---

## 7. The "Why Not React?" Guide & React Rewrites

### A. The Safe Answer for Viva
*"Sir, humne frontend ke liye Vanilla JavaScript chuna because of 3 deliberate engineering reasons:*  
*1. **Zero Bundle Overhead**: React library aur ReactDOM milkar 140KB+ ka bundle banate hain jo client par parse aur hydrate hone mein time leta hai. Vanilla JS se hamara page instantly load hota hai bina kisi client compilation delay ke.*  
*2. **No Build Step Dependency**: Vanilla code standard ES6 browser APIs par chalta hai. Isme Webpack, Vite, ya Babel build errors ya npm vulnerability breaks ka zero risk rehta hai.*  
*3. **Straightforward State**: Is application mein UI state simple hai (Retailer vs Consumer mode toggle, aur file upload response). Iske liye complex Redux ya Virtual DOM reconciliation ki architectural zaroorat nahi thi.*  
*However, hum React ke core concepts (Components, Hooks, Virtual DOM) se thoroughly familiar hain aur agar production requirement ho toh hum isko React mein migrate kar sakte hain."*

---

### B. React Fundamentals Explained Simply
* **Component**: A reusable, independent Lego block of UI (e.g. `<Button />`, `<ScanCard />`).
* **JSX**: JavaScript XML. Allows writing HTML-like markup directly inside JavaScript files.
* **Props**: Arguments passed from a parent component to a child component (like function parameters).
* **useState**: A React Hook that holds dynamic data. When state updates, React automatically re-renders only that specific part of the screen.
* **useEffect**: A Hook for handling side-effects (e.g. fetching API data, adding window listeners, reading localStorage).
* **Virtual DOM**: A lightweight in-memory representation of the real DOM. When data changes, React compares the new Virtual DOM with the old one (diffing) and updates *only* the modified nodes in the real browser DOM.

---

### C. Side-by-Side: 5 Frontend Features (Vanilla Code vs React Code)

#### 1. Retailer vs Consumer Mode Toggle with localStorage

**Our Vanilla JS Code (`frontend/js/script.js`):**
```javascript
let currentMode = localStorage.getItem('compliance_mode') || 'consumer';

function setupModeSwitch() {
  const btnRetailer = document.getElementById('modeBtnRetailer');
  const btnConsumer = document.getElementById('modeBtnConsumer');
  btnRetailer.addEventListener('click', () => switchMode('retailer'));
  btnConsumer.addEventListener('click', () => switchMode('consumer'));
}

function switchMode(newMode) {
  currentMode = newMode;
  localStorage.setItem('compliance_mode', newMode);
  applyModeUI(newMode);
  loadStats();
}
```

**Equivalent React Component:**
```jsx
import React, { useState, useEffect } from 'react';

export function ModeToggle({ onModeChange }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('compliance_mode') || 'consumer';
  });

  const handleSwitch = (newMode) => {
    setMode(newMode);
    localStorage.setItem('compliance_mode', newMode);
    if (onModeChange) onModeChange(newMode);
  };

  return (
    <div className="mode-toggle-group">
      <button 
        className={`mode-btn ${mode === 'consumer' ? 'active' : ''}`}
        onClick={() => handleSwitch('consumer')}
      >
        Consumer Mode
      </button>
      <button 
        className={`mode-btn ${mode === 'retailer' ? 'active' : ''}`}
        onClick={() => handleSwitch('retailer')}
      >
        Retailer Mode
      </button>
    </div>
  );
}
```
* **Explanation**: In Vanilla JS, we manually find buttons by ID and attach click listeners. In React, `mode` is stored in `useState`, and JSX handles conditional styling (`className={...}`) automatically based on state.

---

#### 2. Drag & Drop File Upload Zone

**Our Vanilla JS Code (`frontend/js/script.js`):**
```javascript
function setupUploadHandlers() {
  const dropZone = document.getElementById('dropZone');
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });
  });
  dropZone.addEventListener('drop', handleDrop);
}
```

**Equivalent React Component:**
```jsx
import React, { useState } from 'react';

export function DropZone({ onFileSelect }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <p>Drag & drop package photograph here</p>
    </div>
  );
}
```

---

#### 3. Single File Upload API Handler (`FormData` + `fetch`)

**Our Vanilla JS Code (`frontend/js/script.js`):**
```javascript
async function processSingleFile(file) {
  showScanningIndicator('Analyzing Label Image...');
  const formData = new FormData();
  formData.append('image', file);
  formData.append('mode', currentMode);

  try {
    const res = await fetch('/api/scan', { method: 'POST', body: formData });
    const json = await res.json();
    hideScanningIndicator();
    if (json.success) renderScanResult(json.data);
  } catch (err) {
    showError(err.message);
  }
}
```

**Equivalent React Hook & Component:**
```jsx
import React, { useState } from 'react';

export function FileScanner({ mode, onScanSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const scanFile = async (file) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('mode', mode);

    try {
      const res = await fetch('/api/scan', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        onScanSuccess(json.data);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && <div>Analyzing Label Image...</div>}
      {error && <div className="alert error">{error}</div>}
    </div>
  );
}
```

---

#### 4. Fetch & Render History Table

**Our Vanilla JS Code (`frontend/js/script.js`):**
```javascript
async function loadHistory(filterMode = 'all') {
  const res = await fetch(`/api/history?limit=10&mode=${filterMode}`);
  const json = await res.json();
  const tableBody = document.getElementById('historyTableBody');
  tableBody.innerHTML = json.data.map(item => `
    <tr>
      <td>${escapeHtml(item.filename)}</td>
      <td>${item.complianceScore}%</td>
      <td>${escapeHtml(item.ratingOrConcern)}</td>
    </tr>
  `).join('');
}
```

**Equivalent React Component:**
```jsx
import React, { useState, useEffect } from 'react';

export function HistoryTable({ modeFilter }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      const res = await fetch(`/api/history?limit=10&mode=${modeFilter}`);
      const json = await res.json();
      if (json.success) setHistory(json.data);
      setLoading(false);
    }
    fetchHistory();
  }, [modeFilter]); // Re-fetches whenever modeFilter prop changes

  if (loading) return <p>Loading audit trail...</p>;

  return (
    <table>
      <tbody>
        {history.map((item) => (
          <tr key={item.id}>
            <td>{item.filename}</td>
            <td>{item.complianceScore}%</td>
            <td>{item.ratingOrConcern}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

#### 5. Category Selection Dropdown (Controlled Component)

**Our Vanilla JS Code (`frontend/js/script.js`):**
```javascript
const select = document.getElementById('categorySelect');
select.addEventListener('change', (e) => {
  currentCategory = e.target.value;
});
```

**Equivalent React Controlled Input:**
```jsx
import React, { useState } from 'react';

export function CategorySelector({ onChange }) {
  const [category, setCategory] = useState('auto');

  const handleChange = (e) => {
    setCategory(e.target.value);
    if (onChange) onChange(e.target.value);
  };

  return (
    <select value={category} onChange={handleChange} className="select-control">
      <option value="auto">Auto-detect (ML Model)</option>
      <option value="food">Food &amp; Beverages</option>
      <option value="cosmetic">Cosmetics &amp; Personal Care</option>
      <option value="other">Other (Electronics, Apparel)</option>
    </select>
  );
}
```

---

## 8. Comprehensive Question Bank (~150 Questions)

> [!NOTE]
> Format: **Q** -> Simple Technical Answer -> *"Viva me aise bolo"* -> **Likely Follow-up Question**.

### Group 1: Project Overview (Q1–Q15)

**Q1. What is the objective of this project?**  
*Answer*: To automate statutory packaging verification under Legal Metrology Rule 6 and conduct health/chemical risk screening using computer vision and machine learning.  
*Viva me aise bolo*: *"Sir, market ke packaged food aur cosmetics ke labels ko camera photo se scan karke statutory rules aur health risks automatically verify karna."*  
*Follow-up*: Barcode scanning se ye kaise alag hai?

**Q2. Why not scan barcodes instead of OCR?**  
*Answer*: Barcodes require pre-existing online databases. New, regional, or repackaged products without online records fail on barcode scanners, whereas direct OCR inspects physical labels in real-time.  
*Viva me aise bolo*: *"Barcode tab chalta hai jab product pehle se database mein ho. Agar nayi packaging ho ya local product ho, toh barcode fail ho jata hai. OCR packet par likha actual text padhta hai."*  
*Follow-up*: Agar label ganda ya muda ho tab OCR kaise kaam karega?

**Q3. What are the two modes and why?**  
*Answer*: Retailer Mode is built for shopkeepers for high-speed batch auditing (up to 10 images) and CSV export. Consumer Mode provides deep health screening (Nutri-Score, allergens).  
*Viva me aise bolo*: *"Retailer mode speed aur bulk audit ke liye hai, consumer mode health aur chemical safety transparency ke liye hai."*  
*Follow-up*: Retailer mode mein nutrition check kyu skip karte ho?

**Q4. Why skip nutrition analysis in Retailer Mode?**  
*Answer*: Retailers and statutory inspectors only enforce legal Rule 6 declarations (MRP, Net Qty). Skipping deep ML health inference speeds up batch processing.  
*Viva me aise bolo*: *"Shopkeeper ko sirf legal rules (MRP, expiry) se matlab hota hai. ML skip karne se batch speed fast ho jaati hai."*  
*Follow-up*: Batch mode mein kitne images allow karte ho?

**Q5. What is the batch processing limit?**  
*Answer*: Configured via `.env` (`MAX_BATCH_FILES=10`), capped at 10 concurrent images to prevent memory spikes.  
*Viva me aise bolo*: *"Maximum 10 images ek batch mein, jo .env file se dynamically controlled hai."*  
*Follow-up*: Batch images sequentially process hoti hain ya parallel?

**Q6. Are batch images processed sequentially or in parallel?**  
*Answer*: Sequentially in a `for...of` loop with fast 2-variant preprocessing to prevent CPU starvation on local machines.  
*Viva me aise bolo*: *"Ek ke baad ek process hoti hain fast mode mein taaki server CPU hang na ho."*  
*Follow-up*: Single scan mein kitne preprocessing variants chalte hain?

**Q7. Is this project connected to any paid cloud APIs?**  
*Answer*: No. It runs 100% locally and offline using Tesseract.js WASM and local Python Scikit-Learn models.  
*Viva me aise bolo*: *"Nahi sir, zero cloud dependency hai. Poora pipeline machine par offline chalta hai."*  
*Follow-up*: Internet band ho tab bhi chalega?

**Q8. Will this project work without internet?**  
*Answer*: Yes, both Tesseract.js (with local `eng.traineddata`) and Python FastAPI run completely offline on localhost.  
*Viva me aise bolo*: *"Haan sir, local models aur traineddata ki wajah se bina internet ke bhi 100% chalta hai."*  
*Follow-up*: Google fonts ka kya?

**Q9. What if external Google Fonts fail to load offline?**  
*Answer*: CSS specifies system fallback fonts (`sans-serif`, `system-ui`) so the UI renders properly even without internet.  
*Viva me aise bolo*: *"CSS mein fallback fonts dale hain, page layout bilkul nahi tootta."*  
*Follow-up*: Architecture kitne tiers mein divided hai?

**Q10. Explain the 3 tiers of your architecture.**  
*Answer*: Tier 1 is Vanilla JS client, Tier 2 is Node.js Express server on port 5001, Tier 3 is Python FastAPI ML microservice on port 8001.  
*Viva me aise bolo*: *"Tier 1 frontend browser hai, Tier 2 Node Express backend hai, aur Tier 3 Python FastAPI ML microservice hai."*  
*Follow-up*: Node aur Python aapas mein kaise communicate karte hain?

**Q11. How do Node.js and Python communicate?**  
*Answer*: Over local HTTP REST requests (`http://localhost:8001`) with JSON payloads and configurable timeouts (`ML_TIMEOUT_MS`).  
*Viva me aise bolo*: *"Local HTTP REST APIs ke through JSON format mein communicate karte hain."*  
*Follow-up*: Agar Python server band ho jaye toh Node crash hoga?

**Q12. What happens if the Python microservice is down?**  
*Answer*: Node catches the connection error and gracefully falls back to deterministic rule engines without crashing.  
*Viva me aise bolo*: *"Node crash nahi hota sir, try/catch mein error handle karke rule-based fallback use kar leta hai."*  
*Follow-up*: Fallback hone par user ko kaise pata chalta hai?

**Q13. How does the user know fallback was used?**  
*Answer*: The UI engine tag displays "Rule-Based" instead of "ML Engine" and the top status pill turns red ("ML Offline").  
*Viva me aise bolo*: *"Top status pill offline show karta hai aur result badge par 'Rule-Based' likha aata hai."*  
*Follow-up*: Database kaunsa use kiya hai?

**Q14. What database are you using?**  
*Answer*: A lightweight, concurrency-safe JSON persistence store (`data/scans.json`) managed via Promise-serialized atomic writes.  
*Viva me aise bolo*: *"Local JSON store use kiya hai jisme atomic rename se concurrency safety di gayi hai."*  
*Follow-up*: Isme aur MongoDB mein kya farak hai?

**Q15. Why not MongoDB for the prototype?**  
*Answer*: To eliminate external daemon installation prerequisites so evaluators can run the project immediately with zero setup.  
*Viva me aise bolo*: *"Sir, evaluator ko bina MongoDB daemon install kiye zero-setup run karne dene ke liye JSON store chuna."*  
*Follow-up*: Real-world mein MongoDB kab lagayenge?

---

### Group 2: Frontend & DOM (Q16–Q35)

**Q16. What is the DOM?**  
*Answer*: Document Object Model — an in-memory tree representation of HTML tags created by browser for JS manipulation.  
*Viva me aise bolo*: *"HTML code ka live tree structure jo browser memory mein banata hai taaki JS usko change kar sake."*  
*Follow-up*: DOM manipulation slow kyu hoti hai?

**Q17. Why is DOM manipulation considered costly?**  
*Answer*: Direct DOM modifications trigger layout recalculations and repaint passes on the browser render engine.  
*Viva me aise bolo*: *"Browser ko har change par layout recalculate aur screen repaint karni padti hai."*  
*Follow-up*: Humne isko code mein kaise optimize kiya?

**Q18. How did our code optimize DOM manipulation?**  
*Answer*: We batch HTML updates using `array.map().join('')` into a single `innerHTML` assignment rather than modifying node-by-node.  
*Viva me aise bolo*: *"Loop ke andar bar-bar DOM touch karne ki jagah poora HTML string ek baar mein inject karte hain."*  
*Follow-up*: `innerHTML` vs `textContent` mein kya farak hai?

**Q19. What is the difference between `innerHTML` and `textContent`?**  
*Answer*: `textContent` sets raw unparsed text safely (XSS safe). `innerHTML` parses strings as HTML elements.  
*Viva me aise bolo*: *"textContent safe raw text dalta hai, innerHTML HTML tags ko render karta hai."*  
*Follow-up*: XSS kya hota hai?

**Q20. What is XSS (Cross-Site Scripting)?**  
*Answer*: A vulnerability where malicious scripts are injected into web pages via unsanitized user inputs.  
*Viva me aise bolo*: *"Jab koi user input ke zariye website mein dangerous JavaScript code inject kar deta hai."*  
*Follow-up*: Is project mein XSS se kaise bache?

**Q21. How do we prevent XSS in this project?**  
*Answer*: Through an `escapeHtml()` helper function that escapes `&`, `<`, `>`, `"`, and `'` characters before rendering.  
*Viva me aise bolo*: *"escapeHtml function banaya hai jo dangerous HTML characters ko entity codes mein convert kar deta hai."*  
*Follow-up*: Drag-and-drop events kaunse hote hain?

**Q22. Name the 4 drag-and-drop events used.**  
*Answer*: `dragenter`, `dragover`, `dragleave`, and `drop`.  
*Viva me aise bolo*: *"dragenter, dragover, dragleave, aur drop — ye chaar events listen karte hain."*  
*Follow-up*: `e.preventDefault()` kyu lagaya?

**Q23. Why call `e.preventDefault()` on dragover and drop?**  
*Answer*: To stop the browser's default behavior, which is opening the dropped image file directly in the browser tab.  
*Viva me aise bolo*: *"Browser file ko new tab mein open na kar de, isliye default behavior block karte hain."*  
*Follow-up*: FormData kya hota hai?

**Q24. What is `FormData`?**  
*Answer*: A built-in browser API that compiles form fields and binary files into `multipart/form-data` HTTP payloads.  
*Viva me aise bolo*: *"Browser ka tool jo image file aur text data ko ek sath backend bhejne ke liye bundle karta hai."*  
*Follow-up*: JSON stringify karke image kyu nahi bhejte?

**Q25. Why not send images as Base64 JSON strings?**  
*Answer*: Base64 encoding increases file payload size by ~33% and consumes heavy CPU during encoding and decoding.  
*Viva me aise bolo*: *"Base64 se image ka size 33% badh jata hai, jabki FormData raw binary efficiently bhejta hai."*  
*Follow-up*: `localStorage` ka size limit kitna hota hai?

**Q26. What is `localStorage` limit and what do we store in it?**  
*Answer*: Approximately 5MB per origin. We store only one lightweight key: `compliance_mode` ('consumer' | 'retailer').  
*Viva me aise bolo*: *"5MB limit hoti hai, aur hum sirf user ka mode preference ('consumer' ya 'retailer') store karte hain."*  
*Follow-up*: SessionStorage aur localStorage mein kya farak hai?

**Q27. Difference between `sessionStorage` and `localStorage`?**  
*Answer*: `sessionStorage` clears when the browser tab closes; `localStorage` persists indefinitely across browser restarts.  
*Viva me aise bolo*: *"sessionStorage tab band hote hi udd jata hai, localStorage refresh aur restart ke baad bhi rehta hai."*  
*Follow-up*: CSS Variables kya hote hain?

**Q28. What are CSS Custom Properties (Variables)?**  
*Answer*: Reusable values defined in `:root` (e.g. `--primary: #0F5B66;`) accessible across the stylesheet with `var(--primary)`.  
*Viva me aise bolo*: *"CSS mein variables define karne ka tarika, jisse poori website ka theme ek jagah se change ho sake."*  
*Follow-up*: Flexbox aur Grid mein kab kya use karna chahiye?

**Q29. When to use Flexbox vs CSS Grid?**  
*Answer*: Flexbox for 1-dimensional layouts (rows or columns, like navbars and stat cards); Grid for 2-dimensional grid layouts.  
*Viva me aise bolo*: *"Ek line ke liye Flexbox (navbar/buttons), poore page ke 2D grid ke liye CSS Grid."*  
*Follow-up*: Responsive layout bina media queries ke kaise banaya?

**Q30. How does `repeat(auto-fit, minmax(220px, 1fr))` make cards responsive?**  
*Answer*: Automatically fits as many 220px columns as fit on screen and stretches them (`1fr`) without needing explicit breakpoints.  
*Viva me aise bolo*: *"Screen ke hisaab se cards auto-wrap ho jaate hain, phone par 1 column aur laptop par 4 columns."*  
*Follow-up*: Status dot animation kaise kaam karti hai?

**Q31. How is the pulse animation on the online status dot achieved?**  
*Answer*: Using CSS `@keyframes pulse` animating `box-shadow` spread and opacity.  
*Viva me aise bolo*: *"CSS keyframes animation se dot ke charon taraf green glow fade-in fade-out hota hai."*  
*Follow-up*: Human-in-the-loop editor kya karta hai?

**Q32. What is the purpose of the OCR Text Drawer?**  
*Answer*: Allows the user to inspect raw OCR text, fix crinkle/glare typos, and re-analyze without re-uploading the image.  
*Viva me aise bolo*: *"Agar OCR kisi word ko galat padh le, toh user browser mein hi correct karke re-analyze kar sakta hai."*  
*Follow-up*: Re-analyze button backend ke kis endpoint ko call karta hai?

**Q33. Which endpoint does the re-analyze button call?**  
*Answer*: `POST /api/analyze-text`, which bypasses image preprocessing and OCR, evaluating the edited text directly.  
*Viva me aise bolo*: *"POST /api/analyze-text ko, jisse time bachta hai aur seedha regex aur ML rules execute hote hain."*  
*Follow-up*: Low confidence alert kab trigger hota hai?

**Q34. When does the Low Confidence Alert appear?**  
*Answer*: When OCR confidence is < 60% or extracted text length is < 15 characters on a raw unedited scan.  
*Viva me aise bolo*: *"Jab OCR confidence 60% se kam ho ya text 15 characters se chhota ho."*  
*Follow-up*: Event bubbling ko rokne ke liye kya function use hota hai?

**Q35. How do you stop event bubbling in JavaScript?**  
*Answer*: By calling `e.stopPropagation()`.  
*Viva me aise bolo*: *"e.stopPropagation() call karke event ko parent elements tak pahunchne se rok dete hain."*

---

### Group 3: Backend & Node.js (Q36–Q55)

**Q36. What is the Event Loop in Node.js?**  
*Answer*: The single-threaded coordination loop in Node.js that handles non-blocking I/O operations and dispatches callbacks.  
*Viva me aise bolo*: *"Node.js ka engine jo background tasks (file read, network request) complete hone par callbacks execute karta hai."*  
*Follow-up*: Node.js single threaded hai toh concurrent requests kaise handle karta hai?

**Q37. How does Node handle concurrency if it is single-threaded?**  
*Answer*: Heavy I/O (filesystem, sockets) is delegated to the C++ `libuv` thread pool in the background while main thread stays free.  
*Viva me aise bolo*: *"Main thread single hai, lekin background I/O libuv thread pool sambhalta hai, isliye server block nahi hota."*  
*Follow-up*: Multer kya karta hai?

**Q38. What is Multer and where is it used?**  
*Answer*: Multer is Express middleware for handling `multipart/form-data` file uploads, saving files to disk or buffer.  
*Viva me aise bolo*: *"Express ka middleware jo user ki upload ki hui packaging image ko server disk par temporarily save karta hai."*  
*Follow-up*: Multer mein file size limit kaise set karte hain?

**Q39. How is file size restricted in Multer?**  
*Answer*: In multer config options: `limits: { fileSize: maxUploadMb * 1024 * 1024 }`.  
*Viva me aise bolo*: *"limits option mein fileSize define karte hain jo .env se dynamically load hota hai."*  
*Follow-up*: Agar user 20MB ki file bhej de toh kya hoga?

**Q40. What happens if a user uploads a file exceeding `MAX_UPLOAD_MB`?**  
*Answer*: Multer throws `LIMIT_FILE_SIZE` error, caught by `handleMulterError` which returns HTTP 400 with a friendly JSON message.  
*Viva me aise bolo*: *"Server crash nahi hota, HTTP 400 error return karta hai ki file 8MB limit se badi hai."*  
*Follow-up*: Uploaded images ko disk par kitni der rakhte ho?

**Q41. What is your server's image retention policy?**  
*Answer*: Ephemeral. Uploaded images are unlinked immediately after OCR processing in a `finally` block to protect storage.  
*Viva me aise bolo*: *"Ephemeral storage hai sir. OCR khatam hote hi finally block mein image disk se delete kar di jaati hai."*  
*Follow-up*: Delete hone se disk space bachne ke alawa kya fayda hai?

**Q42. Why delete uploaded images immediately?**  
*Answer*: Privacy protection for proprietary packaging designs and preventing unbounded disk storage consumption.  
*Viva me aise bolo*: *"Storage bachta hai aur user ke packaging designs ki privacy maintain rehti hai."*  
*Follow-up*: Sharp library kya karti hai?

**Q43. What is Sharp and why use it before OCR?**  
*Answer*: Sharp is a fast C-based `libvips` image processing module used to convert images to grayscale, normalize, and sharpen.  
*Viva me aise bolo*: *"Superfast image processing library hai jo OCR se pehle photo ka contrast aur brightness theek karti hai."*  
*Follow-up*: Sharp Tesseract se fast kyu hai?

**Q44. Why is Sharp faster than ImageMagick or Canvas?**  
*Answer*: Sharp uses SIMD (Single Instruction Multiple Data) and multi-threaded libvips pipeline written in C.  
*Viva me aise bolo*: *"C aur SIMD instructions par bani hai, isliye memory aur CPU dono mein ultra-fast hai."*  
*Follow-up*: Port 5001 kyu use kiya port 5000 ki jagah?

**Q45. Why does backend default to port 5001 on macOS?**  
*Answer*: macOS AirPlay Receiver and Control Center bind to port 5000 by default. Shifting to 5001 avoids `EADDRINUSE`.  
*Viva me aise bolo*: *"Mac par Apple AirPlay port 5000 occupy kar leta hai. Clash se bachne ke liye standard 5001 port chuna."*  
*Follow-up*: Agar 5001 bhi busy ho tab kya hoga?

**Q46. What happens if port 5001 is also in use?**  
*Answer*: `server.js` listens for `EADDRINUSE` error and automatically increments `port + 1` (5002...) to bind cleanly.  
*Viva me aise bolo*: *"Server error handler port + 1 karke automatic next available port par shift ho jata hai."*  
*Follow-up*: DataStore mein race condition kaise banti thi?

**Q47. What is a Race Condition in file persistence?**  
*Answer*: When two processes read a file at the same time and write back, one write overwrites the other, causing data loss.  
*Viva me aise bolo*: *"Jab do requests ek hi waqt par file padhti hain aur likhti hain, toh ek ka data doosre se erase ho jata hai."*  
*Follow-up*: Isko solve karne ke liye kya lagaya?

**Q48. How does `writeQueue = writeQueue.then(...)` prevent race conditions?**  
*Answer*: It chains asynchronous write tasks into a single serial Promise queue, ensuring each save finishes before the next begins.  
*Viva me aise bolo*: *"Line mein khada kar deta hai har write ko Promise queue ke zariye, ek waqt par ek hi save hota hai."*  
*Follow-up*: Atomic file rename kya hota hai?

**Q49. Why write to a `.tmp` file and rename instead of writing directly?**  
*Answer*: If power cuts or process dies mid-write, direct write leaves corrupted JSON. Operating system rename is atomic.  
*Viva me aise bolo*: *"Temp file pura likhne ke baad rename karte hain. OS rename atomic hota hai, beech mein file corrupt nahi hoti."*  
*Follow-up*: Concurrency test kaise prove karta hai ye?

**Q50. How does `test_datastore_concurrency.js` verify thread safety?**  
*Answer*: Fires 10 concurrent asynchronous `addScan()` calls with `Promise.all` and asserts exactly 10 valid records exist.  
*Viva me aise bolo*: *"Ek sath 10 simultaneous saves fire karke verify karta hai ki pure 10 records file mein bina loss ke bache."*  
*Follow-up*: Test data live dashboard stats ko kharab kyu nahi karta?

**Q51. How is test data prevented from polluting live stats?**  
*Answer*: Test records carry `isTest: true`, and `dataStore.getAllScans()` filters out test records unless explicitly asked.  
*Viva me aise bolo*: *"Test records par isTest=true laga hota hai, jo dashboard aur stats calculation mein ignore ho jata hai."*  
*Follow-up*: `npm run reset-data` kya karta hai?

**Q52. What does `npm run reset-data` do?**  
*Answer*: Creates an automated timestamped backup copy (`scans.backup.<time>.json`) and resets `scans.json` to `[]`.  
*Viva me aise bolo*: *"Purane data ka timestamped backup banata hai aur database ko safe tarike se empty karta hai."*  
*Follow-up*: HTTP status codes 400 aur 500 mein kya farak hai?

**Q53. Difference between HTTP 400 and HTTP 500?**  
*Answer*: 400 is Bad Request (client error, like missing image or wrong format); 500 is Internal Server Error (server crash).  
*Viva me aise bolo*: *"400 client ki galti hai (jaise khali file bhejna), 500 server ke code mein crash hone ki galti hai."*  
*Follow-up*: CORS kya hota hai?

**Q54. What is CORS and why is it configured?**  
*Answer*: Cross-Origin Resource Sharing. Configured in Python FastAPI to allow the browser and Node backend to fetch its endpoints.  
*Viva me aise bolo*: *"Browser ki security policy jo alag ports ke beech mein API calls allow karti hai."*  
*Follow-up*: `package.json` mein `start-ml.js` kyu banaya?

**Q55. Why did we create `scripts/start-ml.js` instead of hardcoding python path?**  
*Answer*: Windows uses `venv\Scripts\python.exe` while Mac/Linux uses `venv/bin/python`. `start-ml.js` resolves this cross-platform.  
*Viva me aise bolo*: *"Mac par path alag hota hai aur Windows par alag. start-ml script dono OS par automatic sahi python dhoond leti hai."*

---

### Group 4: OCR & Computer Vision (Q56–Q70)

**Q56. What is Tesseract.js?**  
*Answer*: A pure JavaScript / WebAssembly port of HP/Google's open-source C++ Tesseract OCR engine.  
*Viva me aise bolo*: *"Google ke Tesseract OCR ka WebAssembly version jo bina external software install kiye Node mein chalta hai."*  
*Follow-up*: WebAssembly (WASM) kya hota hai?

**Q57. What is WebAssembly (WASM)?**  
*Answer*: A binary code format that runs low-level languages (like C/C++) in browsers and Node.js at near-native execution speed.  
*Viva me aise bolo*: *"C++ code ko browser aur Node mein superfast chalane ke liye binary execution format."*  
*Follow-up*: `eng.traineddata` file kya hai?

**Q58. What is `eng.traineddata`?**  
*Answer*: A pre-trained neural network weights file containing English character glyphs, fonts, and word dictionaries.  
*Viva me aise bolo*: *"Tesseract ka brain — jisme English alphabets aur numbers ko pehchanne ka neural network model store hai."*  
*Follow-up*: Is file ko root se kyu move kiya?

**Q59. Why did we move `eng.traineddata` to `backend/assets/tessdata/`?**  
*Answer*: For modular repo structure and passing explicit `langPath` so Tesseract never re-downloads the 5MB model from internet.  
*Viva me aise bolo*: *"Root clean karne ke liye aur Tesseract ko local path dene ke liye taaki internet se bar-bar download na kare."*  
*Follow-up*: Otsu thresholding kya hoti hai?

**Q60. What is Otsu Thresholding?**  
*Answer*: An automatic image binarization algorithm that calculates an optimal threshold separating foreground text from background.  
*Viva me aise bolo*: *"Ek algorithm jo photo ke pixels ko analyze karke automatically black text aur white background alag kar deta hai."*  
*Follow-up*: Otsu glossy packet par kyu fail hota hai?

**Q61. Why is Otsu alone unsafe on glossy packaging?**  
*Answer*: Glossy foil reflections create specular glare highlights that Otsu misinterprets as background, washing out letters.  
*Viva me aise bolo*: *"Foil packet par chamak padne se Otsu letters ko background samajhkar gayab kar deta hai."*  
*Follow-up*: Isko solve karne ke liye kya kiya?

**Q62. How does our multi-variant preprocessing solve the glare problem?**  
*Answer*: We generate 3 variants (enhanced, otsu, contrast sharpen), run OCR on each, and pick the one with highest confidence.  
*Viva me aise bolo*: *"Hum 3 alag-alag versions banate hain photo ke, aur jisme sabse clear text nikalta hai usko chun lete hain."*  
*Follow-up*: Teen variants ke naam kya hain?

**Q63. What are the 3 Sharp preprocessing variants?**  
*Answer*: `standard_enhanced` (upscale + norm), `adaptive_otsu` (binarization), and `sharpen_contrast` (linear contrast boost).  
*Viva me aise bolo*: *"standard_enhanced, adaptive_otsu, aur sharpen_contrast."*  
*Follow-up*: Batch mode mein teeno variants kyu nahi chalate?

**Q64. Why limit to 2 variants in batch mode?**  
*Answer*: To maintain high throughput; running 3 variants on 10 images would require 30 OCR passes, which is too slow.  
*Viva me aise bolo*: *"10 images par 30 baar OCR chalane se time lagta, isliye batch mode mein top 2 fast variants chalate hain."*  
*Follow-up*: OCR confidence score kya hota hai?

**Q65. What does the OCR Confidence score represent?**  
*Answer*: Tesseract's mean probability estimate (0–100%) indicating how certainty it recognized the detected character shapes.  
*Viva me aise bolo*: *"Tesseract ka confidence score ki usne letters ko kitni clarity se identify kiya hai."*  
*Follow-up*: Agar confidence 95% ho toh baaki variants check karte hain?

**Q66. What is the early-break condition in `ocrService.js`?**  
*Answer*: If any variant produces confidence >= 85%, the loop breaks early to conserve CPU and response time.  
*Viva me aise bolo*: *"Agar pehle variant mein hi 85%+ confidence mil jaye, toh baaki variants skip karke time bacha lete hain."*  
*Follow-up*: Noise simulation kya hoti hai?

**Q67. What is synthetic OCR noise simulation?**  
*Answer*: Deliberately replacing letters with OCR-like typos (e.g. '0' for 'O', '1' for 'l', 'rn' for 'm') in dataset generation.  
*Viva me aise bolo*: *"Training data mein janbujhkar OCR jaisi spelling mistakes dalna taaki model typos aane par bhi seekhe."*  
*Follow-up*: Character n-grams kyu use kiye?

**Q68. Why use Character n-grams (3–5) in category classification?**  
*Answer*: If OCR misreads `"ingredlents"`, word TF-IDF fails, but character trigrams (`ing`, `ngr`, `red`, `edl`) still match.  
*Viva me aise bolo*: *"Word galat hone par bhi 3-3 letters ke tukde match ho jaate hain, isliye spelling mistake se model nahi darta."*  
*Follow-up*: Image resize 2400px kyu karte ho?

**Q69. Why resize images to 2400px width?**  
*Answer*: Tesseract neural nets perform best when character heights are between 30 to 45 pixels. 2400px optimizes fine font clarity.  
*Viva me aise bolo*: *"Chhote fonts 30-40 pixels ke ban jaate hain, jo Tesseract ke neural network ke liye ideal size hai."*  
*Follow-up*: Ground truth CSV file kya hai?

**Q70. What is `ground_truth.csv`?**  
*Answer*: A human-verified empirical benchmark dataset specifying whether each Rule 6 field is actually present on sample photos.  
*Viva me aise bolo*: *"Ek table jisme humne haath se verify karke likha hai ki kis sample image par kaunsi rule present hai."*

---

### Group 5: Machine Learning & Nutri-Score (Q71–Q90)

**Q71. What machine learning algorithms are used?**  
*Answer*: Calibrated Logistic Regression for category classification and Random Forest for food Nutri-Score prediction.  
*Viva me aise bolo*: *"Category ke liye Logistic Regression aur Food Nutri-Score ke liye Random Forest use kiya hai."*  
*Follow-up*: Deep Learning kyu nahi use kiya category classification ke liye?

**Q72. Why not use BERT or deep Transformers for category classification?**  
*Answer*: Transformers require GPUs, have multi-hundred MB models, and introduce 500ms+ latency. Logistic regression runs in 5ms.  
*Viva me aise bolo*: *"BERT/LLMs ke liye heavy GPU aur seconds ka time chahiye. Hamara model 5 milliseconds mein lightweight CPU par chalta hai."*  
*Follow-up*: Model joblib format mein kyu save kiya?

**Q73. Why save models as `.joblib` instead of `.pkl` (Pickle)?**  
*Answer*: Joblib is specifically optimized by Scikit-Learn for efficiently serializing large NumPy arrays and sparse matrix pipelines.  
*Viva me aise bolo*: *"Joblib NumPy arrays aur Scikit-Learn pipelines ko fast compress aur load karne ke liye standard tool hai."*  
*Follow-up*: Model size kitna hai?

**Q74. What is the disk size of your trained ML models?**  
*Answer*: `category_model.joblib` is ~2.4MB and `nutriscore_model.joblib` is ~415KB (total < 3MB).  
*Viva me aise bolo*: *"Total 3MB se kam hai sir. Category model 2.4MB hai aur Nutri-Score model 415KB hai."*  
*Follow-up*: Isliye git mein commit kiya?

**Q75. Why are binary model files committed to git?**  
*Answer*: Because total size is under 3MB, allowing immediate clone-and-run evaluation without retraining offline datasets.  
*Viva me aise bolo*: *"Kyunki size bohot chhota hai, isliye repo clone karte hi evaluator bina retrain kiye turant chala sakta hai."*  
*Follow-up*: Nutri-Score kya hota hai?

**Q76. What is Nutri-Score?**  
*Answer*: A 5-color nutritional grading scale (A, B, C, D, E) originating in France, grading foods from healthiest (A) to poorest (E).  
*Viva me aise bolo*: *"A se E tak ka grading system jo batata hai packet healthy hai (A/B) ya unhealthy junk (D/E)."*  
*Follow-up*: Grade A aur Grade E ka kya matlab hai?

**Q77. What does Grade A vs Grade E mean?**  
*Answer*: Grade A indicates high nutrient density (protein, fiber) and low sugar/fat. Grade E indicates ultra-processed HFSS junk.  
*Viva me aise bolo*: *"Grade A healthy food hai (jaise oats), Grade E high sugar/palm oil wala junk food hai (jaise cream biscuit)."*  
*Follow-up*: Random Forest mein kitne features hain?

**Q78. What are the 14 features of our Nutri-Score model?**  
*Answer*: 7 tabular nutrients (calories, sugar, sat fat, sodium, fiber, protein, additives) + 7 ingredient flags (palm oil, maida, art colors, art sweeteners, and top-3 ingredient flags).  
*Viva me aise bolo*: *"7 nutrition table ke numbers aur 7 harmful ingredients ke flags (palm oil, maida, top-3 position)."*  
*Follow-up*: Sabse zyada important feature kaunsa hai?

**Q79. What is the most important feature according to `metrics.json`?**  
*Answer*: `sugars_100g` with **16.94%** importance, followed by `energy_kcal` (**12.58%**) and `saturated_fat_100g` (**12.32%**).  
*Viva me aise bolo*: *"Sugar sabse bada factor hai 16.94% importance ke sath, uske baad calories aur saturated fat."*  
*Follow-up*: Rule baseline exact match accuracy kitni thi?

**Q80. What was the exact accuracy of the rule baseline in evaluation?**  
*Answer*: **50.86%** exact match and **95.71%** within-one-grade match on the 350 test samples.  
*Viva me aise bolo*: *"Standard formula sirf 50.86% exact match karta hai kyunki wo Indian context ke palm oil ko consider nahi karta."*  
*Follow-up*: Category model ki test accuracy kitni aayi?

**Q81. What was the category classifier's test accuracy?**  
*Answer*: **100.00%** on 340 test samples across food, cosmetic, and other.  
*Viva me aise bolo*: *"100% test accuracy aayi sir 340 test samples par."*  
*Follow-up*: Kya 100% accuracy overfitting nahi hai?

**Q82. Isn't 100% accuracy a sign of overfitting?**  
*Answer*: No, because product label vocabularies across food, cosmetics, and electronics are distinct (e.g., "aqua" vs "carbohydrate" vs "bluetooth"). Character n-grams make boundaries clean.  
*Viva me aise bolo*: *"Nahi sir, kyunki food, cosmetic aur electronics ke words bohot alag hote hain. Aqua aur Bluetooth mein confusion nahi hota."*  
*Follow-up*: RapidFuzz kyu use kiya?

**Q83. What is RapidFuzz?**  
*Answer*: A high-performance C++ implementation of Levenshtein string distance algorithm for fast fuzzy matching.  
*Viva me aise bolo*: *"Spelling mistakes ko handle karne ke liye fast C++ library jo similar words dhoondti hai."*  
*Follow-up*: Levenshtein distance kya hota hai?

**Q84. What is Levenshtein Distance?**  
*Answer*: The minimum number of single-character edits (insertions, deletions, substitutions) required to change one word into another.  
*Viva me aise bolo*: *"Ek word ko doosre word mein badalne ke liye kitne letters change karne padenge uski count."*  
*Follow-up*: Threshold kitna set kiya hai?

**Q85. What fuzzy match threshold is used?**  
*Answer*: Score cutoff of 82.0 using `fuzz.token_sort_ratio`.  
*Viva me aise bolo*: *"82% similarity score cutoff set kiya hai taaki minor typos match hon lekin galat words match na hon."*  
*Follow-up*: Ingredient database mein kitne items hain?

**Q86. How many curated ingredients are in `ingredientDB.json`?**  
*Answer*: 113 statutory ingredients curated from FSSAI, EU CosIng, and SCCS.  
*Viva me aise bolo*: *"113 statutory ingredients hain jo FSSAI aur European safety database se liye gaye hain."*  
*Follow-up*: Har ingredient ke sath regulatory citation hai?

**Q87. Does every ingredient have a source citation?**  
*Answer*: Yes, verified by `scripts/validate-ingredients.js`, enforcing non-empty `reason` and regulatory `source`.  
*Viva me aise bolo*: *"Haan sir, script verify karti hai ki har chemical ke sath scientific reason aur source citation ho."*  
*Follow-up*: Cosmetic concern level kaise classify hota hai?

**Q88. How is cosmetic concern level calculated?**  
*Answer*: If >= 1 high-concern chemical (e.g. DMDM Hydantoin) is found -> "High". If >= 2 moderate -> "Moderate", else "Low".  
*Viva me aise bolo*: *"Agar ek bhi high-concern preservative mila toh High, do moderate mile toh Moderate, warna Low."*  
*Follow-up*: Kya cosmetic result mein "Safe" ya "Unsafe" bolte ho?

**Q89. Why do we NEVER say "Safe" or "Unsafe" for cosmetics?**  
*Answer*: Skin sensitivity and allergies vary by individual; claiming medical safety creates legal liability.  
*Viva me aise bolo*: *"Kyunki skin allergy har insaan ki alag hoti hai. Hum 'High/Low concern' bolte hain aur patch test ka disclaimer dete hain."*  
*Follow-up*: Cosmetic disclaimer kya likha hai?

**Q90. What is the mandatory cosmetic disclaimer?**  
*Answer*: *"Informational only. Reactions vary by skin type and allergies. Not medical advice. Do a patch test."*  
*Viva me aise bolo*: *"Sir disclaimer clearly bolta hai: Informational only, medical advice nahi hai, patch test zaroor karein."*

---

### Group 6: Legal Metrology Rule 6 & Domain (Q91–Q105)

**Q91. What is Legal Metrology Rule 6?**  
*Answer*: Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011 mandates the 5 statutory packaging declarations in India.  
*Viva me aise bolo*: *"Indian government ka packaging rule jo har packet par price, quantity, mfg, helpline aur date print karna compulsory karta hai."*  
*Follow-up*: Rule 6(1)(a) mein kya mandated hai?

**Q92. What does Rule 6(1)(a) mandate?**  
*Answer*: Name and complete physical address of the manufacturer, packer, or importer.  
*Viva me aise bolo*: *"Manufacturer ya packer ka naam aur complete factory/office address."*  
*Follow-up*: Rule 6(1)(c) kya hai?

**Q93. What does Rule 6(1)(c) mandate regarding MRP?**  
*Answer*: Maximum Retail Price inclusive of all taxes (e.g., `MRP ₹ xx.xx incl. of all taxes`).  
*Viva me aise bolo*: *"MRP saare taxes jodkar clearly print hona chahiye."*  
*Follow-up*: Rule 6(1)(e) kya mandate karta hai?

**Q94. What does Rule 6(1)(e) mandate regarding Net Quantity?**  
*Answer*: Net quantity in standard metric units (`g`, `kg`, `ml`, `l`, or `units/pieces`).  
*Viva me aise bolo*: *"Standard metric units mein net weight ya quantity likhna compulsory hai."*  
*Follow-up*: Rule 6(1)(h) kya hai?

**Q95. What does Rule 6(1)(h) mandate regarding Consumer Care?**  
*Answer*: Customer helpline phone number, email address, and postal address for grievance redressal.  
*Viva me aise bolo*: *"Consumer complaint ke liye helpline number, email ya contact address hona chahiye."*  
*Follow-up*: Rule 6(1)(d) kya hai?

**Q96. What does Rule 6(1)(d) mandate regarding dates?**  
*Answer*: Month and Year of manufacture, packaging, or import, and expiry or Best Before date.  
*Viva me aise bolo*: *"Manufacturing month/year aur Expiry/Best Before date likhna compulsory hai."*  
*Follow-up*: Dual MRP stamp lagana legal hai?

**Q97. Is dual-MRP stamping legal in India?**  
*Answer*: No. Under Legal Metrology Amendment Rules, charging different MRPs for identical commodities in different places is illegal.  
*Viva me aise bolo*: *"Nahi sir, ek hi product par alag-alag MRP stamp lagana ya sticker chipkana illegal hai."*  
*Follow-up*: Humne scoring logic kya rakha hai?

**Q98. How is the compliance score calculated?**  
*Answer*: Equal weightage: each of the 5 core declarations contributes 20%, totaling 100%.  
*Viva me aise bolo*: *"Har mandatory field ke 20% points hain, paanchon milkar 100% score banta hai."*  
*Follow-up*: Kya ye engine format verify karta hai ya presence?

**Q99. Does the engine verify legal font format or just presence?**  
*Answer*: It is an automated presence check screening tool, not an official legal certification.  
*Viva me aise bolo*: *"Ye presence check karta hai sir ki cheez likhi hai ya nahi. Format certification inspector ka kaam hai."*  
*Follow-up*: Isliye summary mein kya note add kiya?

**Q100. What disclaimer is attached to every Rule 6 verdict?**  
*Answer*: *"Presence check only. Preliminary screening, not official certification."*  
*Viva me aise bolo*: *"Har result par likha aata hai: Presence check only. Preliminary screening, not official certification."*  
*Follow-up*: FSSAI aur Legal Metrology mein kya farak hai?

**Q101. Difference between FSSAI and Legal Metrology?**  
*Answer*: Legal Metrology governs weights, measures, price, and trade fairness. FSSAI governs food safety, hygiene, and nutrition.  
*Viva me aise bolo*: *"Legal Metrology weight aur MRP check karti hai, FSSAI food quality aur nutrition check karta hai."*  
*Follow-up*: Most common non-compliance field kaunsa nikla?

**Q102. What was the most commonly missed rule in market audits?**  
*Answer*: Consumer Care details (`Rule 6(1)(h)`), especially missing grievance email addresses or complete helpline timings.  
*Viva me aise bolo*: *"Consumer Care details sabse zyada miss hoti hain market ke packets par."*  
*Follow-up*: Import packaging par kya extra hona zaroori hai?

**Q103. What is mandatory for imported packaged goods?**  
*Answer*: Name and address of the Indian importer and Country of Origin must be prominently declared.  
*Viva me aise bolo*: *"Country of Origin aur Indian Importer ka naam aur address hona zaroori hai."*  
*Follow-up*: Non-compliance par kya penalty hoti hai?

**Q104. What is the statutory penalty for Rule 6 violations?**  
*Answer*: Fines under Section 36 of Legal Metrology Act (up to ₹25,000 first offense, compounding fines for repeated violations).  
*Viva me aise bolo*: *"Legal Metrology Act Section 36 ke tehat fine aur packet seizure ho sakta hai."*  
*Follow-up*: Kya shopkeeper penalty ke liye responsible hota hai?

**Q105. Can a retailer be penalized for selling non-compliant packets?**  
*Answer*: Yes, under Section 36, storing or exhibiting non-compliant packaging for sale is also an offense.  
*Viva me aise bolo*: *"Haan sir, dukan par galat packet rakhne par shopkeeper par bhi penalty lag sakti hai, isliye Retailer mode zaroori hai."*

---

### Group 7: Testing & Quality Assurance (Q106–Q120)

**Q106. How many tests are in your automated test suite?**  
*Answer*: 12 total verification tests (8 text test cases + 4 real packaging image OCR tests).  
*Viva me aise bolo*: *"Total 12 automated pipeline tests hain: 8 diverse text cases aur 4 real packaging photo OCR cases."*  
*Follow-up*: Test suite run karne ka command kya hai?

**Q107. What command executes the test suite?**  
*Answer*: `npm test` (which triggers `node tests/run_tests.js`).  
*Viva me aise bolo*: *"npm test command se poora suite run hota hai."*  
*Follow-up*: 4 image test cases mein kaunse packaging images hain?

**Q108. What are the 4 physical packaging images tested?**  
*Answer*: Maggi Noodles pouch, Mixed Fruit Juice carton, PureGlow Soap wrapper, and Smart LED lamp box.  
*Viva me aise bolo*: *"Maggi pouch, fruit juice pack, soap label, aur LED bulb packaging."*  
*Follow-up*: Test results ka pass rate kya hai?

**Q109. What is the current pass rate of `npm test`?**  
*Answer*: Exactly 100% (12 out of 12 passed).  
*Viva me aise bolo*: *"100% pass rate hai sir, sabhi 12 checks green pass hote hain."*  
*Follow-up*: Incomplete label test case kya verify karta hai?

**Q110. What does the `test_incomplete_label` case verify?**  
*Answer*: It inputs a cleaner label missing 4 fields and asserts the score drops to 20% and verdict is 'Non-Compliant'.  
*Viva me aise bolo*: *"Verify karta hai ki jab packet par rules gayab hon, toh score correctly 20% par drop hota hai ya nahi."*  
*Follow-up*: `test_noisy_ocr` case kya verify karta hai?

**Q111. What does the `test_noisy_ocr` case verify?**  
*Answer*: It introduces OCR typos (`Krlspy Namkeen`, `Palmoleln 0il`) and verifies category and ingredient flags still match.  
*Viva me aise bolo*: *"Verify karta hai ki spelling mistakes hone ke bawajood fuzzy matcher harmful ingredients pehchanta hai."*  
*Follow-up*: Concurrency test kaise run karte hain?

**Q112. How do you run the concurrency test?**  
*Answer*: `node tests/unit/test_datastore_concurrency.js`.  
*Viva me aise bolo*: *"node tests/unit/test_datastore_concurrency.js command se concurrency safety verify hoti hai."*  
*Follow-up*: Ingredient validation script kya verify karta hai?

**Q113. What does `node scripts/validate-ingredients.js` verify?**  
*Answer*: Asserts all 113 ingredients have non-empty reason, regulatory source citation, and zero duplicate names or aliases.  
*Viva me aise bolo*: *"Verify karta hai ki database ke 113 ingredients mein har ek ka scientific source ho aur koi duplicate na ho."*  
*Follow-up*: OCR benchmark script kaunsa hai?

**Q114. What does `npm run eval:ocr` do?**  
*Answer*: Runs `tests/eval/run_ocr_eval.js`, benchmarks physical photos against `ground_truth.csv`, and outputs `docs/eval/ocr_eval.md`.  
*Viva me aise bolo*: *"Real photos ko ground truth se compare karke per-rule accuracy ka benchmark markdown report generate karta hai."*  
*Follow-up*: ML evaluation script kaunsa hai?

**Q115. What does `npm run eval:ml` do?**  
*Answer*: Runs `ml-service/evaluate.py`, tests both ML models on held-out splits, and writes real numbers to `metrics.json`.  
*Viva me aise bolo*: *"Scikit-learn models ko test data par chala kar exact accuracy aur F1 score metrics.json mein likhta hai."*  
*Follow-up*: Unit testing aur End-to-End testing mein kya farak hai?

**Q116. Difference between Unit Testing and E2E Testing in this project?**  
*Answer*: Concurrency test is a Unit Test on `dataStore.js`. `run_tests.js` is an E2E test verifying HTTP upload -> Sharp -> OCR -> Rules -> Output.  
*Viva me aise bolo*: *"Concurrency test akela dataStore function check karta hai (Unit test), run_tests poora server pipeline check karta hai (E2E test)."*  
*Follow-up*: Regression testing kya hota hai?

**Q117. What is Regression Testing?**  
*Answer*: Re-running existing tests after code changes to ensure new code hasn't broken previously working features.  
*Viva me aise bolo*: *"Har change ke baad purane tests chalana ye confirm karne ke liye ki koi purani cheez toot to nahi gayi."*  
*Follow-up*: Agar test fail ho toh debugging step kya hota hai?

**Q118. How do you debug when an image test fails?**  
*Answer*: Inspect `resData.rawOcrText` and `resData.ocrConfidence` to see what characters Tesseract actually extracted.  
*Viva me aise bolo*: *"rawOcrText inspect karte hain ki Tesseract ne image mein se kya padha aur kahan typo hua."*  
*Follow-up*: False Positive aur False Negative mein kya farak hai?

**Q119. Explain False Positive vs False Negative in Rule 6 checking.**  
*Answer*: False Positive: missing rule flagged as present. False Negative: present rule flagged as missing.  
*Viva me aise bolo*: *"False Positive: rule nahi tha par bol diya pass hai. False Negative: rule tha par padh nahi paya aur fail bol diya."*  
*Follow-up*: Dono mein se consumer ke liye zyada dangerous kaunsa hai?

**Q120. Which error is worse for consumer protection?**  
*Answer*: False Positive — claiming an unverified or dangerous label is compliant gives a false sense of legal safety.  
*Viva me aise bolo*: *"False Positive zyada dangerous hai, kyunki consumer galat packet ko legal samajh kar khareed lega."*

---

### Group 8: Security, Privacy & Deployment (Q121–Q135)

**Q121. How are user uploaded files secured?**  
*Answer*: Multer validates MIME types and extensions against strict whitelists, generates random UUID filenames, and unlinks files immediately.  
*Viva me aise bolo*: *"Sirf JPG/PNG allow karte hain, random filename dete hain, aur process hote hi delete kar dete hain."*  
*Follow-up*: Agar koi `.exe` ya `.php` file upload kar de toh kya hoga?

**Q122. What happens if someone uploads a malicious `.exe` or `.sh` script?**  
*Answer*: Multer `fileFilter` regex rejects it immediately with HTTP 400: *"Only image files (JPG, PNG, WEBP) are allowed"*.  
*Viva me aise bolo*: *"Multer fileFilter turant reject kar deta hai aur HTTP 400 error de deta hai."*  
*Follow-up*: Path Traversal attack kya hota hai?

**Q123. What is Path Traversal (`../`) and how do we prevent it?**  
*Answer*: An attack trying to read system files via `../../etc/passwd`. Prevented using `path.basename()` and absolute path resolving.  
*Viva me aise bolo*: *"Attacker ../ laga kar system files na padh sake, isliye hum path.basename() use karke filename sanitize karte hain."*  
*Follow-up*: Rate limiting kyu zaroori hoti hai?

**Q124. Why is Rate Limiting important for OCR endpoints?**  
*Answer*: OCR is CPU-intensive. Without rate limiting, an attacker could flood 100 uploads and freeze the CPU (Denial of Service).  
*Viva me aise bolo*: *"OCR mein CPU lagta hai. Agar koi bot hazaron images bhejega toh server hang ho sakta hai, isliye limiting zaroori hai."*  
*Follow-up*: Production mein rate limiting kaise lagayenge?

**Q125. How would you implement rate limiting in production?**  
*Answer*: Using `express-rate-limit` middleware or an Nginx reverse proxy limiting to 30 requests per IP per minute.  
*Viva me aise bolo*: *"express-rate-limit ya Nginx reverse proxy se ek IP par per minute 30 requests ka cap laga denge."*  
*Follow-up*: Containerization kya hoti hai?

**Q126. How would you containerize this dual-service project?**  
*Answer*: Using Docker Compose: one container for Node.js Express (`5001`) and one container for Python FastAPI (`8001`) on a private bridge.  
*Viva me aise bolo*: *"Docker Compose use karenge: ek container Node ke liye aur ek container Python ke liye internal bridge network par."*  
*Follow-up*: Environment variables Docker mein kaise pass honge?

**Q127. How are environment variables passed in Docker?**  
*Answer*: Via `env_file: .env` in `docker-compose.yml` or runtime `-e` flags.  
*Viva me aise bolo*: *"docker-compose.yml mein env_file: .env likh kar saare variables container mein inject ho jaate hain."*  
*Follow-up*: HTTPS kyu zaroori hai camera access ke liye?

**Q128. Why is HTTPS required for live camera packaging scans?**  
*Answer*: Web browser security policies (`navigator.mediaDevices.getUserMedia`) only permit camera access over `https://` or `localhost`.  
*Viva me aise bolo*: *"Browser camera access sirf secure HTTPS ya localhost par hi allow karta hai."*  
*Follow-up*: Reverse proxy ka kya role hota hai?

**Q129. What is the role of Nginx in production deployment?**  
*Answer*: SSL/TLS termination, gzip static compression, rate limiting, and reverse proxy routing to Node and Python upstream ports.  
*Viva me aise bolo*: *"Nginx front par baith kar SSL certificate sambhalta hai, static files serve karta hai aur backend par traffic route karta hai."*  
*Follow-up*: Ephemeral storage aur persistent volume mein kya farak hai?

**Q130. Why is `data/scans.json` mapped to a volume in Docker?**  
*Answer*: Containers are ephemeral. Mapping a volume (`-v ./data:/app/data`) ensures scan history is preserved across container restarts.  
*Viva me aise bolo*: *"Container restart hone par database udd na jaye, isliye data folder ko host volume se bind karte hain."*  
*Follow-up*: Logging kaise implement kar sakte hain?

**Q131. How is production logging handled?**  
*Answer*: Using structured logging libraries like Winston or Morgan outputting JSON logs to stdout for aggregation in Datadog/ELK.  
*Viva me aise bolo*: *"Winston ya Morgan se JSON format mein structured logs nikalte hain monitoring ke liye."*  
*Follow-up*: User authentication kyu nahi lagaya?

**Q132. Why doesn't the prototype have user login/passwords?**  
*Answer*: Consumer screening must be friction-free for instant shopping use; retailer batch audits are authenticated by network in enterprise.  
*Viva me aise bolo*: *"Consumer ko dukan par khade hoke turant scan karna hota hai, login screen lagane se friction badh jati."*  
*Follow-up*: Data encryption at rest kya hota hai?

**Q133. What is Data Encryption at Rest?**  
*Answer*: Encrypting stored files on disk using AES-256 so stolen hard drives cannot expose raw scan records.  
*Viva me aise bolo*: *"Hard drive par data ko AES-256 se encrypt karke rakhna taaki koi disk chura kar bhi data na padh sake."*  
*Follow-up*: Horizontal scaling kaise karenge?

**Q134. How to scale this horizontally if 10,000 users scan simultaneously?**  
*Answer*: Spin up multiple Node/Python worker pods behind a load balancer, replacing local JSON with Redis queue and PostgreSQL.  
*Viva me aise bolo*: *"Load balancer ke piche multiple containers chalayenge aur file store ko PostgreSQL aur Redis queue se replace kar denge."*  
*Follow-up*: Graceful shutdown kya hota hai?

**Q135. What is Graceful Shutdown?**  
*Answer*: Handling `SIGTERM` signals by allowing ongoing OCR requests to complete before closing HTTP sockets and exiting.  
*Viva me aise bolo*: *"Server band hone se pehle chal rahi scans ko finish hone deta hai, beech mein abruptly kill nahi karta."*

---

### Group 9: React & Modern Web (Q136–Q145)

**Q136. What is JSX?**  
*Answer*: JavaScript XML — a syntax extension allowing developers to write HTML tags inside JavaScript files, compiled by Babel.  
*Viva me aise bolo*: *"JavaScript ke andar HTML tags likhne ka syntax jo Babel compile karke standard JS banata hai."*  
*Follow-up*: Browser JSX direct execute kar sakta hai?

**Q137. Can browsers execute JSX directly?**  
*Answer*: No. Browsers only execute standard JavaScript. JSX must be transpiled by Babel into `React.createElement()` calls.  
*Viva me aise bolo*: *"Nahi sir, browser ko sirf normal JS aati hai. Babel JSX ko React.createElement() mein convert karta hai."*  
*Follow-up*: Props aur State mein kya difference hai?

**Q138. What is the difference between Props and State?**  
*Answer*: Props are read-only inputs passed from parent to child. State is internal data managed and updated within the component.  
*Viva me aise bolo*: *"Props bahar se aane wala read-only data hai, State component ka apna internal editable data hai."*  
*Follow-up*: `useState` hook kya karta hai?

**Q139. What does the `useState` hook do?**  
*Answer*: Declares a state variable and a setter function, triggering component re-render when the state value changes.  
*Viva me aise bolo*: *"Component mein dynamic data store karta hai, aur jab data update hota hai toh UI automatically update ho jati hai."*  
*Follow-up*: `useEffect` hook kab run hota hai?

**Q140. When does `useEffect` run?**  
*Answer*: After the component mounts, and on subsequent re-renders whenever values in its dependency array change.  
*Viva me aise bolo*: *"Component screen par aane ke baad run hota hai, aur jab dependency array ka variable badalta hai tab chalta hai."*  
*Follow-up*: Dependency array empty `[]` ho toh kya hoga?

**Q141. What happens if `useEffect` has an empty dependency array `[]`?**  
*Answer*: It executes exactly once when the component mounts on screen (equivalent to `componentDidMount`).  
*Viva me aise bolo*: *"Sirf ek baar chalta hai jab component pehli baar load hota hai."*  
*Follow-up*: Virtual DOM kya hai?

**Q142. What is the Virtual DOM and how does it work?**  
*Answer*: A lightweight in-memory JS tree. React diffs the old and new virtual trees and applies only the delta to the real DOM.  
*Viva me aise bolo*: *"Memory ke andar duplicate tree. React purane aur naye mein farak nikal kar sirf changed element ko update karta hai."*  
*Follow-up*: List rendering mein `key` prop kyu zaroori hai?

**Q143. Why is the `key` prop required when rendering lists in React?**  
*Answer*: Keys provide stable identity to items so React can track additions, removals, and re-orders without re-rendering the whole list.  
*Viva me aise bolo*: *"React ko pata chalta hai kaunsi row add ya delete hui hai, jisse poori table re-render nahi karni padti."*  
*Follow-up*: Controlled Component kya hota hai?

**Q144. What is a Controlled Component?**  
*Answer*: An input element whose value is driven by React state via `value` and updated via `onChange` handler.  
*Viva me aise bolo*: *"Aisa input jiska data React ki state se control hota hai aur onChange par update hota hai."*  
*Follow-up*: Agar React use karte toh project ka folder structure kaisa hota?

**Q145. What would the frontend folder structure look like in a React project?**  
*Answer*: `src/components/`, `src/hooks/`, `src/context/`, `src/assets/`, with `App.jsx` and `main.jsx` built via Vite.  
*Viva me aise bolo*: *"src ke andar components, hooks, aur context ke folders hote aur Vite se build hota."*

---

### Group 10: Hard & Trap Questions (Q146–Q155)

**Q146. Trap: "Did you use deep learning for text extraction?"**  
*Answer*: Yes, modern Tesseract.js (v5) uses LSTM (Long Short-Term Memory) recurrent neural networks under the hood.  
*Viva me aise bolo*: *"Haan sir, Tesseract v5 WebAssembly ke andar LSTM recurrent neural network traineddata model use hota hai."*  
*Follow-up*: Phir OCR error kyu aate hain?

**Q147. Trap: "If Tesseract uses deep learning, why does it miss text on wrinkled packets?"**  
*Answer*: Physical deformations distort character geometry and lighting glare masks pixel gradients beyond model training domain.  
*Viva me aise bolo*: *"Packet mudne se letters ki geometry distort ho jati hai aur glare se pixel contrast toot jata hai."*  
*Follow-up*: Isko solve karne ke liye human-in-the-loop kyu zaroori hai?

**Q148. Trap: "Can your system officially certify a product as legally compliant?"**  
*Answer*: No. This is an automated preliminary screening prototype. Official certification requires statutory Gazette inspection by an Inspector.  
*Viva me aise bolo*: *"Bilkul nahi sir. Ye preliminary screening tool hai. Official legal certification sirf Inspector hi de sakta hai."*  
*Follow-up*: Trap: "Agar food category dataset synthetic hai toh ML accuracy 100% bolna jhoot nahi hai?"

**Q149. Trap: "Is claiming 100% accuracy honest if the 'other' dataset has synthetic templates?"**  
*Answer*: It is honest regarding our empirical test split, and we explicitly flag `other_class_is_synthetic: true` in `metrics.json` and reports.  
*Viva me aise bolo*: *"Humne metrics.json mein openly disclose kiya hai ki 'other' class synthetic hai. Real benchmark real test split par based hai."*  
*Follow-up*: Trap: "Rule baseline exact accuracy sirf 50% kyu hai?"

**Q150. Trap: "Why is the rule baseline Nutri-Score exact accuracy only 50.86%?"**  
*Answer*: European FSA formula ignores Indian statutory hazards like palm oil and refined flour; our Random Forest penalizes them accurately.  
*Viva me aise bolo*: *"Kyunki standard European formula palm oil aur maida ko ignore karta hai, jabki hamara Random Forest unpe penalty lagata hai."*  
*Follow-up*: Trap: "Can someone upload a 100MB video and crash your server?"

**Q151. Trap: "What prevents someone from uploading a 100MB file and crashing your server?"**  
*Answer*: Multer `limits: { fileSize: 8 * 1024 * 1024 }` aborts the stream and returns HTTP 400 immediately.  
*Viva me aise bolo*: *"Multer stream ko 8MB par hi cut kar deta hai, server crash nahi ho sakta."*  
*Follow-up*: Trap: "What if the user's computer has no Python installed?"

**Q152. Trap: "Can the Node backend run if Python is not installed on the system?"**  
*Answer*: Yes. If the Python ML microservice is unavailable, Node gracefully activates the deterministic rule engines for both category and health.  
*Viva me aise bolo*: *"Haan sir, agar Python microservice na ho toh Node graceful fallback se rule engines chala deta hai."*  
*Follow-up*: Trap: "Agar product par 5 rules likhe hon par wrong font size mein hon toh kya tumhara system pakdega?"

**Q153. Trap: "Does your system check statutory font height (e.g. minimum 3mm for 500g)?"**  
*Answer*: No, camera images lack physical DPI scaling references. We verify presence of disclosures, which we clearly state in the UI.  
*Viva me aise bolo*: *"Nahi sir, kyunki photo kitni door se li gayi hai uska physical scale nahi pata. Hum presence check karte hain."*  
*Follow-up*: Trap: "Tumhare dataStore mein 100 simultaneous users write karein toh kya hoga?"

**Q154. Trap: "What happens if 100 users write to `dataStore.js` concurrently?"**  
*Answer*: The Promise queue serializes writes one-by-one. Each write takes ~2ms, so 100 writes take ~200ms with zero data loss.  
*Viva me aise bolo*: *"Promise queue unhe line mein laga kar serialize karegi. 100 writes 200 milliseconds mein bina data loss ke save ho jayengi."*  
*Follow-up*: Trap: "Agar MongoDB better hai toh tumne use kyu nahi kiya?"

**Q155. Trap: "If MongoDB is better, why didn't you use it from day one?"**  
*Answer*: Architectural parsimony: a prototype should have zero installation prerequisites for evaluators while meeting concurrency safety.  
*Viva me aise bolo*: *"Prototype ko evaluator ke machine par bina database configure kiye chalne layak banana primary goal tha."*

---

## 9. 30 Code-Reading Drills (Easy to Hard)

### Drill 1 (Easy): `frontend/js/script.js`
```javascript
const ext = path.extname(file.originalname).toLowerCase();
```
* **Prompt**: *"Ye line kya karti hai?"*  
* **Answer**: *"Uploaded file ke naam se uska extension nikal kar lowercase mein convert karti hai (e.g., 'LABEL.PNG' ban jata hai '.png')."*

### Drill 2 (Easy): `frontend/js/script.js`
```javascript
localStorage.setItem('compliance_mode', newMode);
```
* **Prompt**: *"Ye line kyu likhi hai?"*  
* **Answer**: *"Browser ke local storage mein user ka selected mode save karti hai taaki page refresh karne par mode reset na ho."*

### Drill 3 (Easy): `backend/server.js`
```javascript
const PORT = parseInt(process.env.PORT || '5001', 10);
```
* **Prompt**: *"parseInt aur || ka kya role hai?"*  
* **Answer**: *"Environment variable PORT ko base-10 integer mein convert karta hai, aur agar PORT define na ho toh default 5001 use karta hai."*

### Drill 4 (Easy): `backend/services/ocrService.js`
```javascript
if (fs.existsSync(imagePath)) { fs.unlinkSync(imagePath); }
```
* **Prompt**: *"unlinkSync kyu use kiya?"*  
* **Answer**: *"Disk se file delete karne ke liye. Ephemeral storage policy ke tehat uploaded label photo ko OCR ke baad turant delete kar dete hain."*

### Drill 5 (Easy): `frontend/js/script.js`
```javascript
e.preventDefault(); e.stopPropagation();
```
* **Prompt**: *"Dono functions mein kya farak hai?"*  
* **Answer**: *"preventDefault browser ka default action (tab mein file kholna) rokta hai; stopPropagation event ko parent containers mein bubble hone se rokta hai."*

### Drill 6 (Easy-Medium): `backend/services/complianceCheck.js`
```javascript
const score = Math.round((passedCount / total) * 100);
```
* **Prompt**: *"Score kaise calculate hota hai?"*  
* **Answer**: *"5 statutory rules mein se jitne pass hue, unka percentage nikal kar nearest whole number mein round off karta hai."*

### Drill 7 (Medium): `backend/services/complianceCheck.js`
```javascript
/(?:m\.?\s*r\.?\s*p\.?|mrp)[.:\s₹zZ2]*[₹rszZ.\s]*(\d[\d.,]+)/i
```
* **Prompt**: *"Ye regular expression kya dhoondta hai?"*  
* **Answer**: *"MRP ke alag-alag variations (MRP, M.R.P., Rs., ₹) ke baad aane wali price digits ko capture karta hai, chahe OCR ne ₹ ko 'z' ya '2' padha ho."*

### Drill 8 (Medium): `backend/services/complianceCheck.js`
```javascript
/(?:1800|1860|1300)[\s-]*\d{3,}[\s-:]*\d{3,}/i
```
* **Prompt**: *"Ye pattern kya dhoondta hai?"*  
* **Answer**: *"Indian toll-free aur helpline phone numbers jo 1800, 1860, ya 1300 se shuru hote hain Consumer Care verification ke liye."*

### Drill 9 (Medium): `backend/routes/api.js`
```javascript
const allowed = /jpeg|jpg|png|webp/i;
if (allowed.test(path.extname(file.originalname)) || allowed.test(file.mimetype))
```
* **Prompt**: *"Ye check kis cheez ke liye hai?"*  
* **Answer**: *"MIME type aur file extension dono verify karta hai taaki user sirf JPG, PNG ya WEBP images hi upload kar sake."*

### Drill 10 (Medium): `backend/services/dataStore.js`
```javascript
records.filter(r => includeTest ? true : !r.isTest)
```
* **Prompt**: *"Is line ka purpose kya hai?"*  
* **Answer**: *"Agar includeTest true na ho, toh automated test suite ke records (`isTest: true`) ko live stats aur dashboard history se filter karke bahar nikal deta hai."*

### Drill 11 (Medium): `backend/services/dataStore.js`
```javascript
let writeQueue = Promise.resolve();
writeQueue = writeQueue.then(async () => { ... });
```
* **Prompt**: *"Ye Promise chain kya achieve kar rahi hai?"*  
* **Answer**: *"Asynchronous writes ko serial queue mein daal kar ek ke baad ek execute karwati hai taaki race condition aur file corruption na ho."*

### Drill 12 (Medium): `backend/services/dataStore.js`
```javascript
await fs.promises.rename(tempFile, filePath);
```
* **Prompt**: *"Direct write ki jagah rename kyu kiya?"*  
* **Answer**: *"Operating system level par file rename ek atomic operation hota hai, jisse half-written corrupted file create hone ka risk zero ho jata hai."*

### Drill 13 (Medium): `backend/services/categoryDetect.js`
```javascript
const mlUrl = new URL(process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001');
```
* **Prompt**: *"URL constructor kyu use kiya?"*  
* **Answer**: *"URL string ko safely parse karke uska hostname (`127.0.0.1`) aur port (`8001`) alag-alag nikalne ke liye bina brittle string slicing ke."*

### Drill 14 (Medium): `backend/services/ocrService.js`
```javascript
const worker = await Tesseract.createWorker('eng', 1, { langPath: TESSDATA_DIR, gzip: false });
```
* **Prompt**: *"langPath pass karne ka kya fayda hai?"*  
* **Answer**: *"Tesseract ko local disk par stored `eng.traineddata` ka path deta hai taaki wo internet se dobara download na kare aur offline chale."*

### Drill 15 (Medium): `backend/services/ocrService.js`
```javascript
await sharp(inputPath).grayscale().normalize().threshold(128).png().toFile(v2Path);
```
* **Prompt**: *"threshold(128) kya karta hai?"*  
* **Answer**: *"Grayscale image ko binary black-and-white mein convert karta hai (Otsu binarization) taaki glossy reflective packaging ka text clear ho sake."*

### Drill 16 (Medium-Hard): `ml-service/app.py`
```python
tokens = [t.strip() for t in re.split(r'[,;•\n](?![^(]*\))', cleaned) if t.strip()]
```
* **Prompt**: *"Ye regex split kya karta hai?"*  
* **Answer**: *"Ingredients ko commas aur semicolons par split karta hai, LEKIN parentheses ke andar wale commas ko ignore karta hai (e.g. 'Oil (Palm, Soy)' ek single token rehta hai)."*

### Drill 17 (Medium-Hard): `ml-service/app.py`
```python
best = process.extractOne(token_lower, candidates, scorer=fuzz.token_sort_ratio, score_cutoff=82.0)
```
* **Prompt**: *"Token sort ratio aur cutoff 82 ka kya role hai?"*  
* **Answer**: *"Words ke order ko sort karke Levenshtein similarity calculate karta hai. 82% se upar match hone par typo-tolerant ingredient pehchan leta hai."*

### Drill 18 (Medium-Hard): `ml-service/app.py`
```python
probs = category_model.predict_proba([req.text])[0]
```
* **Prompt**: *"predict aur predict_proba mein kya farak hai?"*  
* **Answer**: *"predict sirf single class label deta hai; predict_proba har class ki probability percentage deta hai (e.g. food: 95%, cosmetic: 3%, other: 2%)."*

### Drill 19 (Hard): `ml-service/scripts/train_category.py`
```python
FeatureUnion([('word', TfidfVectorizer(ngram_range=(1,2))), ('char', TfidfVectorizer(ngram_range=(3,5), analyzer='char'))])
```
* **Prompt**: *"FeatureUnion mein word aur char n-grams combine kyu kiye?"*  
* **Answer**: *"Word n-grams poore phrases ('best before') seekhte hain; character n-grams OCR typos ('ingredlents') aane par bhi sub-words match kar lete hain."*

### Drill 20 (Hard): `ml-service/scripts/train_category.py`
```python
LogisticRegression(class_weight='balanced', C=2.0, max_iter=1000)
```
* **Prompt**: *"class_weight='balanced' kyu lagaya?"*  
* **Answer**: *"Agar dataset mein kisi category ke samples kam ya zyada hon, toh model minority class ko penalize na kare aur sabhi classes ko equal importance de."*

### Drill 21 (Hard): `ml-service/scripts/train_nutriscore.py`
```python
RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
```
* **Prompt**: *"n_estimators aur max_depth ka kya matlab hai?"*  
* **Answer**: *"100 alag-alag decision trees ka forest banata hai, aur har tree ki maximum depth 12 levels par limit karta hai taaki overfitting na ho."*

### Drill 22 (Hard): `backend/services/healthCheck.js`
```javascript
const hasHighIng = flagged.some(i => i.concern === 'high');
```
* **Prompt**: *"Array.prototype.some() kya return karta hai?"*  
* **Answer**: *"Boolean return karta hai: true agar array mein kam se kam ek bhi ingredient high concern ka ho, warna false."*

### Drill 23 (Hard): `backend/services/healthModelService.js`
```javascript
const score_out_of_5 = grade_map.get(grade, 3);
```
* **Prompt**: *"Grade to 1-5 score conversion kyu kiya?"*  
* **Answer**: *"Nutri-Score Grade A ko 5/5, B ko 4/5 ... E ko 1/5 deta hai taaki frontend par 5-star style health score render ho sake."*

### Drill 24 (Hard): `frontend/js/script.js`
```javascript
const pct = Math.min(100, Math.max(0, complianceScore));
const offset = 283 - (283 * pct) / 100;
circle.style.strokeDashoffset = offset;
```
* **Prompt**: *"SVG circular meter animation kaise kaam karti hai?"*  
* **Answer**: *"283 circumference ($2 \times \pi \times 45$) hai. Stroke dash offset ko percentage ke hisaab se ghatakar circle ko clockwise fill karwati hai."*

### Drill 25 (Hard): `scripts/start-ml.js`
```javascript
const mlProcess = spawn(pythonBin, [targetScript, ...process.argv.slice(3)], { stdio: 'inherit', env: process.env });
```
* **Prompt**: *"stdio: 'inherit' aur env pass karne ka kya fayda hai?"*  
* **Answer**: *"Python process ke saare console outputs aur errors directly terminal par print hote hain aur parent shell ke environment variables inherit ho jaate hain."*

### Drill 26 (Hard): `backend/routes/api.js`
```javascript
req.on('timeout', () => { req.destroy(); resolve({ reachable: false, error: 'Timeout' }); });
```
* **Prompt**: *"req.destroy() kyu zaroori hai timeout par?"*  
* **Answer**: *"Pending HTTP socket connection ko turant terminate karta hai taaki socket leak na ho aur server hang na rahe."*

### Drill 27 (Hard): `backend/services/categoryDetect.js`
```javascript
if (ruleCheck.category !== 'other' && ruleCheck.confidence >= 0.65) { return { ... engine: 'hybrid' }; }
```
* **Prompt**: *"Ye hybrid reconciliation logic kyu lagaya?"*  
* **Answer**: *"Jab packet par standard factory address likha ho toh ML usko 'other' samajh leta hai; lekin agar statutory food words (FSSAI/Best Before) hon toh ye override karke Food assign karta hai."*

### Drill 28 (Hard): `tests/run_tests.js`
```javascript
const boundary = '----TestBoundary' + Math.random().toString(36).substring(2);
```
* **Prompt**: *"Multipart boundary kya karti hai?"*  
* **Answer**: *"HTTP payload ke andar alag-alag form fields aur binary image data ke beech mein separator line ka kaam karti hai."*

### Drill 29 (Hard): `tests/eval/run_ocr_eval.js`
```javascript
const isMatch = (truthVal === detectedVal);
```
* **Prompt**: *"Empirical evaluation mein ground truth match kaise check hota hai?"*  
* **Answer**: *"Binary presence: agar ground truth CSV mein field 1 hai aur OCR ne bhi detect kiya (1), toh match true hota hai."*

### Drill 30 (Hard): `ml-service/evaluate.py`
```python
within_one = float(np.mean(np.abs(y_test_ints - y_pred_rf_ints) <= 1))
```
* **Prompt**: *"Within-one-grade accuracy mathematical formula kya calculate kar raha hai?"*  
* **Answer**: *"Check karta hai ki predicted grade actual grade se maximum ek step door ho (jaise actual B hai toh A, B, ya C accept hoga). Real baseline par ye 95.71% aati hai."*

---

## 10. Honest Weaknesses & Safe Phrases

### A. Real Known Limitations of the Project
1. **Camera Angle & Curved Bottles**:
   * *Limitation*: Curved cylindrical shampoo bottles par side ka text perspective warp hone ki wajah se OCR accuracy drop hoti hai.
   * *Defense*: We provide an interactive Human-in-the-Loop text drawer so the consumer can verify or correct characters.
2. **Physical Font Size Measurement**:
   * *Limitation*: Digital camera images mein absolute physical millimeters (e.g. minimum 3mm font height under Rule 6) measure nahi ho sakte bina distance sensor / AR calibration ke.
   * *Defense*: We audit the *presence* of disclosures rather than geometric font height, which is clearly disclosed in the UI.
3. **Synthetic "Other" Category Data**:
   * *Limitation*: Electronics and apparel label texts in training datasets were synthetically templated rather than scanned from physical factory archives.
   * *Defense*: Transparently reported in `metrics.json` (`other_class_is_synthetic: true`).
4. **Local File Persistence Scale**:
   * *Limitation*: `data/scans.json` is optimal for thousands of scans, but would require sharding into MongoDB/PostgreSQL at millions of records scale.

---

### B. Safe Phrases to Use When You Don't Know an Answer
1. *"Sir, current prototype scope mein humne is feature ko implement nahi kiya tha, lekin architectural perspective se hum isko [X library / approach] ke zariye integrate kar sakte hain."*
2. *"Sir, is exact edge case ko humne test suite mein cover nahi kiya tha, par system ka try/catch fallback ensure karega ki server crash na ho aur safe default return kare."*
3. *"Sir, humne research paper / FSSAI standard refer kiya tha jahan ye guideline mentioned thi, par practical implementation mein hum is parameter ko configure kar sakte hain."*
4. *"Sir, humne consciously over-engineering avoid karne ke liye simpler approach chuna tha, lekin enterprise scale par aapka bataya hua method better rahega."*

---

## 11. One-Page Master Cheat Sheet

### Ports, Endpoints & Versions Summary Table

| Service / Tool | Port / Path | Version / Tech | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Node.js Express** | `http://localhost:5001` | Node v18+, Express v4.21 | Static server, API routing, Multer uploads, dataStore |
| **Sharp Engine** | In-Process C++ | v0.35.5 (libvips) | 3-variant image preprocessing (Otsu, contrast, upscale) |
| **Tesseract.js** | WASM In-Process | v5.1.1 (LSTM Neural Net) | English character recognition from `assets/tessdata` |
| **Python ML Service**| `http://localhost:8001` | Python 3.13, FastAPI 0.115 | Category classification, Nutri-Score, chemical matching |
| **Scikit-Learn** | In ML Service | v1.6.1 | Logistic Regression & Random Forest classifiers |
| **RapidFuzz** | In ML Service | v3.12.1 | Token-sort fuzzy ingredient matching (82% cutoff) |
| **Database** | `data/scans.json` | JSON + Atomic Rename | Concurrency-safe scan persistence |

### Master Endpoints Quick Reference
* `POST /api/scan`: Single label photo upload (multipart/form-data) -> Sharp -> OCR -> Rule 6 -> ML -> JSON.
* `POST /api/scan-batch`: Up to 10 images concurrently for Retailer Mode -> Sequential fast OCR -> Batch stats.
* `POST /api/analyze-text`: Human-in-the-loop raw text re-analysis (skips OCR).
* `GET /api/history`: Recent audit trail with `?mode=retailer|consumer` and `?limit=10`.
* `GET /api/stats`: Mode-aware aggregate pass rates, most missed rule, and food/cosmetic health KPIs.
* `GET /api/ml/metrics`: Proxy exposing real evaluation metrics from `ml-service/models/metrics.json`.
* `POST http://localhost:8001/classify`: Classifies text into `food`, `cosmetic`, `other`.
* `POST http://localhost:8001/rate-food`: Computes Nutri-Score grade (A-E) using 14 features.
* `POST http://localhost:8001/match-ingredients`: Fuzzy matches tokens against 113 statutory chemicals.

### Real Numbers from Evaluation (Memorize These)
* **Total Automated Tests**: 12 / 12 Passing (100%).
* **Category Classifier Test Accuracy**: **100.00%** (N=340 test samples).
* **Random Forest Nutri-Score Test Accuracy**: **100.00%** exact, **100.00%** within-1 grade (N=350 test samples).
* **Rule-Based Baseline Nutri-Score Accuracy**: **50.86%** exact, **95.71%** within-1 grade (N=350 test samples).
* **Empirical OCR Confidence**: **61.6%** mean confidence on real physical packaging photos.
* **Statutory Field Detection Accuracy**: **88.0%** across physical packaging test labels.
* **Top Nutrient Importance**: Sugars (16.94%), Energy (12.58%), Saturated Fat (12.32%), Sodium (11.42%).

### The 10 Most Likely Viva Questions
1. *"Project kya karta hai?"* -> 60-second pitch (Rule 6 metrology + health risk screening).
2. *"Port 5001 kyu use kiya?"* -> macOS AirPlay port 5000 occupy kar leta hai.
3. *"React kyu nahi use kiya?"* -> Zero bundle bloat, no compile step, sub-second native rendering.
4. *"Nutri-Score ML kyu banaya jab formula exist karta hai?"* -> Formula ignores Indian palm oil/maida; ML penalizes them accurately.
5. *"Uploads delete kyu karte ho?"* -> Ephemeral retention for disk protection and packaging privacy.
6. *"Race condition kaise roki dataStore mein?"* -> Serialized Promise write queue + atomic `.tmp` file rename.
7. *"Otsu thresholding glossy packet par kyu fail hoti hai?"* -> Specular glare creates white highlights that wash out letters; solved with 3 variants.
8. *"Tesseract spelling mistake kare toh kya hota hai?"* -> RapidFuzz fuzzy matching with 82% cutoff and character n-grams.
9. *"Batch mode limit kitni hai?"* -> 10 images max via `.env` `MAX_BATCH_FILES`.
10. *"System legal certification de sakta hai?"* -> No, presence check only. Preliminary screening tool.
