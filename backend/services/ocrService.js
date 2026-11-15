/* =================================================================
   OCR Service — Tesseract.js wrapper with Sharp Image Preprocessing
   
   Preprocesses incoming label images with Sharp (grayscale, normalization,
   2x upscale, and mild sharpening) to significantly enhance OCR character
   clarity before passing to Tesseract.js (v5).
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

/**
 * Preprocesses image using Sharp to boost OCR accuracy.
 * @param {string} inputPath
 * @returns {Promise<string>} Path to preprocessed image (or original on error)
 */
async function preprocessImage(inputPath) {
  if (!sharp) return inputPath;
  try {
    const ext = path.extname(inputPath);
    const preprocessedPath = inputPath.replace(ext, '_preprocessed.png');
    
    await sharp(inputPath)
      .resize({ width: 2400, withoutEnlargement: false, fit: 'inside' })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.2 })
      .png({ quality: 90 })
      .toFile(preprocessedPath);

    return preprocessedPath;
  } catch (err) {
    console.warn('[ocrService] Image preprocessing fallback:', err.message);
    return inputPath;
  }
}

const TESSDATA_DIR = process.env.TESSDATA_PATH 
  ? path.resolve(process.env.TESSDATA_PATH)
  : path.join(__dirname, '../assets/tessdata');

/**
 * Runs OCR on the given image file and returns extracted text and confidence.
 * @param   {string} imagePath — Absolute path to the image file on disk.
 * @returns {Promise<Object>}  { text, confidence, preprocessed, error? }
 */
async function extractText(imagePath) {
  let targetPath = imagePath;
  let isTemp = false;

  try {
    targetPath = await preprocessImage(imagePath);
    if (targetPath !== imagePath) {
      isTemp = true;
    }

    const worker = await Tesseract.createWorker('eng', 1, {
      langPath: TESSDATA_DIR,
      cachePath: TESSDATA_DIR,
      gzip: false
    });
    const result = await worker.recognize(targetPath);
    await worker.terminate();

    // Clean up temporary preprocessed image
    if (isTemp && fs.existsSync(targetPath)) {
      try { fs.unlinkSync(targetPath); } catch (_) {}
    }

    const text       = (result.data.text || '').trim();
    const confidence = Math.round(result.data.confidence || 0);

    return { text, confidence, preprocessed: isTemp };

  } catch (err) {
    console.error('[ocrService] OCR failed:', err.message);
    if (isTemp && fs.existsSync(targetPath)) {
      try { fs.unlinkSync(targetPath); } catch (_) {}
    }
    return {
      text: '',
      confidence: 0,
      error: err.message || 'Unknown OCR error'
    };
  }
}

module.exports = { extractText };
