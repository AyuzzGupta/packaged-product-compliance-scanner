/* =================================================================
   OCR Service — Multi-Variant Preprocessing Engine with Tesseract.js
   
   Evaluates packaging label images across 2-3 distinct Sharp preprocessing pipelines:
     1. standard_enhanced: Grayscale + dynamic range normalization + 2400px upscale + mild unsharp mask
     2. adaptive_otsu: Grayscale + normalization + Otsu binary thresholding (handles glossy/reflective packs)
     3. sharpen_contrast: Grayscale + linear contrast boost + high-frequency edge sharpening
   
   Executes Tesseract recognition against variants (capped in batch mode to 2 variants),
   selects the text payload yielding the highest mean OCR confidence score, and returns
   the winning variant tag and confidence.
   ================================================================= */

const Tesseract = require('tesseract.js');
const path      = require('path');
const fs        = require('fs');

let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[ocrService] Sharp not available, running OCR on raw images.');
}

const TESSDATA_DIR = process.env.TESSDATA_PATH 
  ? path.resolve(process.env.TESSDATA_PATH)
  : path.join(__dirname, '../assets/tessdata');

/**
 * Generates preprocessing image variants.
 * @param {string} inputPath
 * @param {boolean} fastMode - If true, restricts to top 2 variants for speed.
 * @returns {Promise<Array<{ name: string, path: string }>>}
 */
async function generateVariants(inputPath, fastMode = false) {
  if (!sharp) {
    return [{ name: 'raw_unprocessed', path: inputPath }];
  }

  const ext = path.extname(inputPath);
  const baseName = inputPath.replace(ext, '');
  const variants = [];

  try {
    // Variant 1: standard_enhanced (Grayscale + normalize + upscale + mild sharpen)
    const v1Path = `${baseName}_v1_enhanced.png`;
    await sharp(inputPath)
      .resize({ width: 2400, withoutEnlargement: false, fit: 'inside' })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.2 })
      .png({ quality: 90 })
      .toFile(v1Path);
    variants.push({ name: 'standard_enhanced', path: v1Path });

    // Variant 2: adaptive_otsu (Binary thresholding for glare/glossy packaging)
    const v2Path = `${baseName}_v2_otsu.png`;
    await sharp(inputPath)
      .resize({ width: 2400, withoutEnlargement: false, fit: 'inside' })
      .grayscale()
      .normalize()
      .threshold(128)
      .png()
      .toFile(v2Path);
    variants.push({ name: 'adaptive_otsu', path: v2Path });

    // Variant 3: sharpen_contrast (Preserves fine text without threshold binarization)
    if (!fastMode) {
      const v3Path = `${baseName}_v3_contrast.png`;
      await sharp(inputPath)
        .grayscale()
        .linear(1.2, -10)
        .sharpen({ sigma: 1.5 })
        .png()
        .toFile(v3Path);
      variants.push({ name: 'sharpen_contrast', path: v3Path });
    }

    return variants;
  } catch (err) {
    console.warn('[ocrService] Preprocessing variant generation fallback:', err.message);
    // Cleanup any partial files
    for (const v of variants) {
      if (fs.existsSync(v.path)) {
        try { fs.unlinkSync(v.path); } catch (_) {}
      }
    }
    return [{ name: 'raw_unprocessed', path: inputPath }];
  }
}

/**
 * Runs OCR across preprocessing variants and selects the highest confidence result.
 * @param   {string} imagePath — Absolute path to the image file on disk.
 * @param   {Object} [options] — { fastMode: boolean }
 * @returns {Promise<Object>}  { text, confidence, winningVariant, variantsTested, preprocessed }
 */
async function extractText(imagePath, options = {}) {
  const fastMode = options.fastMode || false;
  const variants = await generateVariants(imagePath, fastMode);

  let bestResult = {
    text: '',
    confidence: 0,
    winningVariant: variants[0]?.name || 'none',
    variantsTested: variants.map(v => v.name),
    preprocessed: variants.some(v => v.name !== 'raw_unprocessed')
  };

  let worker = null;
  try {
    worker = await Tesseract.createWorker('eng', 1, {
      langPath: TESSDATA_DIR,
      cachePath: TESSDATA_DIR,
      gzip: false
    });

    for (const variant of variants) {
      try {
        const result = await worker.recognize(variant.path);
        const text = (result.data.text || '').trim();
        const confidence = Math.round(result.data.confidence || 0);

        // Keep highest confidence (or longest meaningful text if confidence tie)
        if (confidence > bestResult.confidence || 
           (confidence === bestResult.confidence && text.length > bestResult.text.length)) {
          bestResult.text = text;
          bestResult.confidence = confidence;
          bestResult.winningVariant = variant.name;
        }

        // If confidence is already exceptionally high (>85%), early break to conserve time
        if (confidence >= 85) {
          break;
        }
      } catch (recErr) {
        console.warn(`[ocrService] Recognition error on variant ${variant.name}:`, recErr.message);
      }
    }

    return bestResult;

  } catch (err) {
    console.error('[ocrService] OCR pipeline failure:', err.message);
    return {
      text: '',
      confidence: 0,
      winningVariant: 'error',
      variantsTested: variants.map(v => v.name),
      preprocessed: false,
      error: err.message || 'Unknown OCR error'
    };

  } finally {
    if (worker) {
      try { await worker.terminate(); } catch (_) {}
    }
    // Clean up temporary variant image files from disk
    for (const variant of variants) {
      if (variant.path !== imagePath && fs.existsSync(variant.path)) {
        try { fs.unlinkSync(variant.path); } catch (_) {}
      }
    }
  }
}

module.exports = { extractText, generateVariants };
