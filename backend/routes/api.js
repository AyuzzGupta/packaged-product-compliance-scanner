/* =================================================================
   API Routes — Express router for Packaged Product Compliance Scanner
   
   Endpoints:
     POST /api/scan         — Single label scan (Retailer or Consumer mode)
     POST /api/scan-batch   — Batch scan up to 10 images (Retailer mode)
     POST /api/analyze-text — Re-analyze / test with raw or edited text (no OCR)
     GET  /api/history      — Recent inspection log (with mode/category filters)
     GET  /api/stats        — Aggregated compliance metrics
     GET  /api/health       — System & Python ML microservice health
     GET  /api/models       — ML model accuracy metrics for dashboard
   ================================================================= */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const http    = require('http');

const dataStore       = require('../services/dataStore');
const ocrService      = require('../services/ocrService');
const complianceCheck = require('../services/complianceCheck');
const categoryDetect  = require('../services/categoryDetect');
const healthCheck     = require('../services/healthCheck');
const cosmeticCheck   = require('../services/cosmeticCheck');

const router = express.Router();

// Uploads dir
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
  }
});

const maxUploadMb = parseInt(process.env.MAX_UPLOAD_MB || '8', 10);
const maxBatchFiles = parseInt(process.env.MAX_BATCH_FILES || '10', 10);
const mlUrl = new URL(process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001');
const ML_SERVICE_HOST = mlUrl.hostname;
const ML_SERVICE_PORT = parseInt(mlUrl.port || '8001', 10);
const ML_TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS || '4000', 10);

const upload = multer({
  storage: storage,
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/i;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP) are allowed'));
    }
  }
});

/**
 * Checks if ML service on ML_SERVICE_URL is reachable.
 */
function checkMlHealth() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: ML_SERVICE_HOST,
      port: ML_SERVICE_PORT,
      path: '/health',
      method: 'GET',
      timeout: ML_TIMEOUT_MS
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          resolve({ reachable: res.statusCode === 200, data: JSON.parse(data) });
        } catch (_) {
          resolve({ reachable: false, error: 'Invalid JSON' });
        }
      });
    });
    req.on('error', (err) => resolve({ reachable: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ reachable: false, error: 'Timeout' }); });
    req.end();
  });
}

/**
 * Common analysis pipeline given text, filename, mode, and category override.
 */
async function processAnalysisPipeline({ text, filename = 'label.jpg', mode = 'consumer', category = 'auto', ocrConfidence = 100, isEdited = false }) {
  const selectedMode = (mode || 'consumer').toLowerCase();
  const compliance = complianceCheck.runComplianceCheck(text);
  const lowConfidence = !isEdited && (text.length < 15 || ocrConfidence < 60);

  let record = {
    id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    filename,
    timestamp: new Date().toISOString(),
    mode: selectedMode,
    complianceScore: compliance.score,
    fieldsDetected: compliance.fields,
    complianceSummary: compliance.summary,
    rawOcrText: text,
    ocrConfidence,
    lowConfidence,
    isEdited
  };

  if (selectedMode === 'retailer') {
    // Retailer mode: Metrology ONLY, no health/cosmetics
    record.category = 'other';
    record.engine = 'rules';
    record.ratingOrConcern = compliance.score === 100 ? 'Compliant' : 'Non-Compliant';
    return record;
  }

  // Consumer mode: Metrology + Category-specific analysis
  const catResult = await categoryDetect.detectCategory(text, category);
  const detectedCategory = catResult.category;
  record.category = detectedCategory;
  record.categoryConfidence = catResult.confidence;
  record.categoryEngine = catResult.engine;

  if (detectedCategory === 'food') {
    const foodHealth = await healthCheck.runHealthCheck(text, filename);
    record.isFood = true;
    record.engine = foodHealth.engine;
    record.rating = foodHealth.rating;
    record.nutriScoreGrade = foodHealth.rating;
    record.healthScore = foodHealth.healthScore;
    record.score_out_of_5 = foodHealth.score_out_of_5;
    record.healthBadge = foodHealth.badge;
    record.ratingOrConcern = foodHealth.rating;
    record.why = foodHealth.why;
    record.nutrientsDetected = foodHealth.nutrients;
    record.ingredients = foodHealth.ingredients;
    record.flagged = foodHealth.flagged;
    record.positives = foodHealth.positives;
    record.warnings = foodHealth.warnings;
    record.nutritionTableDetected = foodHealth.nutritionTableDetected;
  } else if (detectedCategory === 'cosmetic') {
    const cosResult = await cosmeticCheck.analyzeCosmetic(text);
    record.isCosmetic = true;
    record.engine = cosResult.engine;
    record.concernLevel = cosResult.concernLevel;
    record.ratingOrConcern = cosResult.concernLevel;
    record.ingredients = cosResult.ingredients;
    record.flagged = cosResult.flagged;
    record.positives = cosResult.positives;
    record.warnings = cosResult.warnings;
    record.disclaimer = cosResult.disclaimer;
  } else {
    // 'other' commodity (electronics, apparel, hardware...)
    record.engine = catResult.engine;
    record.ratingOrConcern = compliance.score === 100 ? 'Compliant' : 'Non-Compliant';
    record.note = "No ingredient analysis for this product type.";
  }

  return record;
}


// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/health
 */
router.get('/health', async (req, res) => {
  const mlStatus = await checkMlHealth();
  res.json({
    status: 'ok',
    server: 'Express',
    mlService: mlStatus
  });
});

/**
 * GET /api/models
 */
router.get('/models', (req, res) => {
  const modelsDir = path.join(__dirname, '../../ml-service/models');
  let categoryReport = 'Report not found.';
  let nutriscoreReport = 'Report not found.';

  const catPath = path.join(modelsDir, 'category_report.txt');
  const nutriPath = path.join(modelsDir, 'nutriscore_report.txt');

  if (fs.existsSync(catPath)) categoryReport = fs.readFileSync(catPath, 'utf-8');
  if (fs.existsSync(nutriPath)) nutriscoreReport = fs.readFileSync(nutriPath, 'utf-8');

  res.json({
    success: true,
    data: {
      categoryReport,
      nutriscoreReport
    }
  });
});

/**
 * POST /api/scan (Single Image)
 */
router.post('/scan', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded.' });

    try {
      const mode = req.body.mode || req.query.mode || 'consumer';
      const category = req.body.category || req.query.category || 'auto';
      const imagePath = req.file.path;

      console.log(`[POST /api/scan] File: ${req.file.originalname}, Mode: ${mode}, Category: ${category}`);

      // 1. OCR with Sharp preprocessing
      const ocrResult = await ocrService.extractText(imagePath);
      const rawText = ocrResult.text || '';
      const confidence = ocrResult.confidence || 0;

      // 2. Run analysis pipeline
      const record = await processAnalysisPipeline({
        text: rawText,
        filename: req.file.originalname,
        mode,
        category,
        ocrConfidence: confidence
      });

      // 3. Save to dataStore
      dataStore.addScan(record);

      return res.json({ success: true, data: record });
    } catch (procErr) {
      console.error('[API /scan] Error:', procErr);
      return res.status(500).json({ success: false, error: procErr.message });
    }
  });
});

/**
 * POST /api/scan-batch (Retailer Batch Scan up to 10 images)
 */
router.post('/scan-batch', (req, res) => {
  upload.array('images', maxBatchFiles)(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Please select at least 1 image for batch scan.' });
    }

    try {
      console.log(`[POST /api/scan-batch] Processing ${req.files.length} images sequentially for retailer mode.`);
      const results = [];

      for (const file of req.files) {
        try {
          const ocrResult = await ocrService.extractText(file.path);
          const rawText = ocrResult.text || '';
          const confidence = ocrResult.confidence || 0;

          const record = await processAnalysisPipeline({
            text: rawText,
            filename: file.originalname,
            mode: 'retailer',
            category: 'other',
            ocrConfidence: confidence
          });

          dataStore.addScan(record);
          results.push(record);
        } catch (itemErr) {
          results.push({
            filename: file.originalname,
            error: itemErr.message,
            complianceScore: 0,
            status: 'Error'
          });
        }
      }

      // Aggregate stats for batch
      const total = results.length;
      const fullyCompliant = results.filter(r => r.complianceScore === 100).length;
      const avgScore = Math.round(results.reduce((sum, r) => sum + (r.complianceScore || 0), 0) / (total || 1));

      return res.json({
        success: true,
        data: {
          total,
          fullyCompliant,
          averageScore: avgScore,
          items: results
        }
      });

    } catch (batchErr) {
      console.error('[API /scan-batch] Error:', batchErr);
      return res.status(500).json({ success: false, error: batchErr.message });
    }
  });
});

/**
 * POST /api/analyze-text (Skip OCR, process raw/edited text)
 */
router.post('/analyze-text', async (req, res) => {
  try {
    const { text, filename = 'manual_input.txt', mode = 'consumer', category = 'auto' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Text cannot be empty.' });
    }

    const record = await processAnalysisPipeline({
      text: text.trim(),
      filename,
      mode,
      category,
      ocrConfidence: 100,
      isEdited: true
    });

    dataStore.addScan(record);
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[API /analyze-text] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/history
 */
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const mode = req.query.mode || 'all';
    const category = req.query.category || 'all';

    const scans = dataStore.getRecentScans(limit, { mode, category });
    return res.json({ success: true, data: scans });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/stats
 */
router.get('/stats', (req, res) => {
  try {
    const mode = req.query.mode || 'all';
    const category = req.query.category || 'all';

    const stats = dataStore.getStats({ mode, category });
    return res.json({ success: true, data: stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
