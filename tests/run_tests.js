#!/usr/bin/env node
/* =================================================================
   End-to-End Test Suite (tests/run_tests.js)
   
   Iterates through 12 total verification tests:
     - 8 Diverse sample label texts (Rule 6, Food HFSS, Cosmetic allergens, Electronics, Clothing, OCR Typos)
     - 4 Real physical packaging label images (Complete Sharp preprocessing + Tesseract OCR + Rules pipeline)
   Runs them through Express endpoints and outputs formatted test summary table.
   ================================================================= */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const SAMPLE_PATH = path.join(__dirname, 'fixtures/sample_texts.json');
const IMAGES_DIR = path.join(__dirname, 'images');
const SERVER_PORT = process.env.PORT || 5001;

function sendPostRequest(port, endpoint, payload) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      },
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.write(dataString);
    req.end();
  });
}

function sendMultipartImageScan(port, imagePath, mode = 'consumer') {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(imagePath)) {
      return reject(new Error(`Image file not found: ${imagePath}`));
    }

    const boundary = '----TestBoundary' + Math.random().toString(36).substring(2);
    const filename = path.basename(imagePath);
    const fileBuffer = fs.readFileSync(imagePath);

    const postDataStart = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="mode"\r\n\r\n${mode}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="isTest"\r\n\r\ntrue\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="${filename}"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`
    );
    const postDataEnd = Buffer.from(`\r\n--${boundary}--\r\n`);
    const totalLength = postDataStart.length + fileBuffer.length + postDataEnd.length;

    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: '/api/scan',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLength
      },
      timeout: 25000
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(new Error(`Failed to parse multipart response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Image OCR scan timed out'));
    });

    req.write(postDataStart);
    req.write(fileBuffer);
    req.write(postDataEnd);
    req.end();
  });
}

async function runTests() {
  console.log('========================================================================================');
  console.log(' RUNNING END-TO-END PIPELINE TESTS: PACKAGED PRODUCT COMPLIANCE SCANNER (SIH26034)');
  console.log(` Target Server: http://127.0.0.1:${SERVER_PORT}`);
  console.log(' Suite: 8 Synthetic Text Cases + 4 Physical Packaging Label OCR Image Cases');
  console.log('========================================================================================\n');

  if (!fs.existsSync(SAMPLE_PATH)) {
    console.error(`Error: Sample file not found at ${SAMPLE_PATH}`);
    process.exit(1);
  }

  const textSamples = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf-8'));
  const imageSamples = [
    {
      id: 'img_test_maggi',
      name: 'Image OCR 1: Maggi Noodles Pouch',
      file: 'sample_label_maggi.png',
      expectedCat: 'food',
      mode: 'consumer'
    },
    {
      id: 'img_test_juice',
      name: 'Image OCR 2: Mixed Fruit Juice Pack',
      file: 'sample_label_juice.jpg',
      expectedCat: 'food',
      mode: 'consumer'
    },
    {
      id: 'img_test_soap',
      name: 'Image OCR 3: PureGlow Soap Label',
      file: 'sample_label_soap.jpg',
      expectedCat: 'cosmetic',
      mode: 'consumer'
    },
    {
      id: 'img_test_electronics',
      name: 'Image OCR 4: Smart LED Packaging',
      file: 'sample_label_electronics.jpg',
      expectedCat: 'other',
      mode: 'consumer'
    }
  ];

  const totalCount = textSamples.length + imageSamples.length;
  const results = [];

  // 1. Text-based tests (1 to 8)
  for (let i = 0; i < textSamples.length; i++) {
    const sample = textSamples[i];
    process.stdout.write(`[${i + 1}/${totalCount}] Testing "${sample.name}" ... `);

    try {
      const response = await sendPostRequest(SERVER_PORT, '/api/analyze-text', {
        text: sample.text,
        filename: sample.id + '.txt',
        mode: sample.mode || 'consumer',
        category: 'auto',
        isTest: true
      });

      if (response.status !== 200 || !response.data.success) {
        console.log('FAILED (Server Error)');
        results.push({ name: sample.name, status: 'FAIL', reason: response.data?.error });
        continue;
      }

      const resData = response.data.data;
      const cat = resData.category || 'other';
      const score = resData.complianceScore;
      const rating = resData.ratingOrConcern || 'N/A';
      const engine = resData.engine || 'rules';
      const flaggedCount = (resData.flagged || []).length;

      console.log(`OK -> [Cat: ${cat}, Score: ${score}%, Verdict: ${rating}, Engine: ${engine}]`);

      results.push({
        id: sample.id,
        name: sample.name,
        expectedCat: sample.expected_category,
        detectedCat: cat,
        score: score + '%',
        verdict: rating,
        engine: engine,
        flagged: flaggedCount,
        passed: sample.expected_category ? (cat === sample.expected_category) : true
      });

    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({ name: sample.name, status: 'ERROR', reason: err.message });
    }
  }

  // 2. Real Image OCR tests (9 to 12)
  for (let j = 0; j < imageSamples.length; j++) {
    const item = imageSamples[j];
    const idx = textSamples.length + j + 1;
    const imgPath = path.join(IMAGES_DIR, item.file);
    process.stdout.write(`[${idx}/${totalCount}] Testing "${item.name}" (Sharp+Tesseract OCR) ... `);

    try {
      const response = await sendMultipartImageScan(SERVER_PORT, imgPath, item.mode);
      if (response.status !== 200 || !response.data.success) {
        console.log('FAILED (Server OCR Error)');
        results.push({ name: item.name, status: 'FAIL', reason: response.data?.error });
        continue;
      }

      const resData = response.data.data;
      const cat = resData.category || 'other';
      const score = resData.complianceScore;
      const rating = resData.ratingOrConcern || 'N/A';
      const engine = resData.engine || 'rules';
      const flaggedCount = (resData.flagged || []).length;
      const conf = resData.ocrConfidence || 0;
      const variant = resData.winningVariant || 'none';

      console.log(`OK -> [Cat: ${cat}, Score: ${score}%, Conf: ${conf}%, Variant: ${variant}, Verdict: ${rating}]`);

      results.push({
        id: item.id,
        name: item.name,
        expectedCat: item.expectedCat,
        detectedCat: cat,
        score: score + '%',
        verdict: rating,
        engine: engine,
        flagged: flaggedCount,
        passed: (cat === item.expectedCat) && (conf > 0)
      });

    } catch (imgErr) {
      console.log(`ERROR: ${imgErr.message}`);
      results.push({ name: item.name, status: 'ERROR', reason: imgErr.message });
    }
  }

  console.log('\n========================================================================================');
  console.log(' SUMMARY RESULTS TABLE (12 TOTAL VERIFICATION PIPELINE TESTS)');
  console.log('========================================================================================');
  console.log(
    'Test ID'.padEnd(28) + ' | ' +
    'Exp. Cat'.padEnd(10) + ' | ' +
    'Got Cat'.padEnd(10) + ' | ' +
    'Score'.padEnd(7) + ' | ' +
    'Verdict / Grade'.padEnd(16) + ' | ' +
    'Engine'.padEnd(8) + ' | ' +
    'Flags'
  );
  console.log('-'.repeat(96));

  for (const r of results) {
    if (r.status) {
      console.log(`${r.name.padEnd(28)} | ERROR: ${r.reason}`);
      continue;
    }
    console.log(
      (r.id || '').padEnd(28) + ' | ' +
      (r.expectedCat || '').padEnd(10) + ' | ' +
      (r.detectedCat || '').padEnd(10) + ' | ' +
      (r.score || '').padEnd(7) + ' | ' +
      (r.verdict || '').padEnd(16) + ' | ' +
      (r.engine || '').padEnd(8) + ' | ' +
      String(r.flagged)
    );
  }

  console.log('========================================================================================');
  const allPassed = results.every(r => r.passed && !r.status);
  console.log(`TOTAL TESTS: ${totalCount} | RESULT: ${allPassed ? 'ALL PASSED (100%)' : 'SOME CHECKS FAILED'}`);
  console.log('========================================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runTests();
