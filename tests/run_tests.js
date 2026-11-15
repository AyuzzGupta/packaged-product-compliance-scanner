#!/usr/bin/env node
/* =================================================================
   End-to-End Test Suite (tests/run_tests.js)
   
   Iterates through 8 diverse sample label texts:
     - 2 Food (Healthy vs HFSS)
     - 2 Cosmetic (High vs Low sensitivity)
     - 1 Electronics
     - 1 Clothing
     - 1 Incomplete label (Rule 6 violation)
     - 1 Noisy OCR label
   Runs them through POST /api/analyze-text and outputs formatted test table.
   ================================================================= */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const SAMPLE_PATH = path.join(__dirname, 'sample_texts.json');
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
      timeout: 5000
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

async function runTests() {
  console.log('========================================================================================');
  console.log(' RUNNING END-TO-END PIPELINE TESTS: PACKAGED PRODUCT COMPLIANCE SCANNER (SIH26034)');
  console.log(` Target Server: http://127.0.0.1:${SERVER_PORT}/api/analyze-text`);
  console.log('========================================================================================\n');

  if (!fs.existsSync(SAMPLE_PATH)) {
    console.error(`Error: Sample file not found at ${SAMPLE_PATH}`);
    process.exit(1);
  }

  const samples = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf-8'));
  const results = [];

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    process.stdout.write(`[${i+1}/${samples.length}] Testing "${sample.name}" ... `);

    try {
      const response = await sendPostRequest(SERVER_PORT, '/api/analyze-text', {
        text: sample.text,
        filename: sample.id + '.txt',
        mode: sample.mode || 'consumer',
        category: 'auto'
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

  console.log('\n========================================================================================');
  console.log(' SUMMARY RESULTS TABLE');
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
  console.log(`TOTAL TESTS: ${samples.length} | RESULT: ${allPassed ? 'ALL PASSED (100%)' : 'SOME CHECKS FAILED'}`);
  console.log('========================================================================================\n');
}

runTests();
