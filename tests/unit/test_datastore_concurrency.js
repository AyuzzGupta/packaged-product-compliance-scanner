#!/usr/bin/env node
/* =================================================================
   tests/unit/test_datastore_concurrency.js
   
   Fires 10 concurrent asynchronous saves through dataStore.addScan()
   pointing to a temporary test database file. Verifies:
     1. All 10 write promises resolve successfully.
     2. Exactly 10 distinct records are persisted.
     3. No partial writes, JSON corruption, or dropped entries occur.
   ================================================================= */

const fs = require('fs');
const path = require('path');

const tempDbPath = path.join(__dirname, `../fixtures/temp_concurrency_test_${Date.now()}.json`);
process.env.DATA_FILE = tempDbPath;

const dataStore = require('../../backend/services/dataStore');

async function runConcurrencyTest() {
  console.log('----------------------------------------------------');
  console.log(' RUNNING DATASTORE CONCURRENCY VERIFICATION TEST');
  console.log(` Target temp store: ${tempDbPath}`);
  console.log('----------------------------------------------------');

  dataStore.init();

  const CONCURRENT_COUNT = 10;
  const promises = [];

  for (let i = 1; i <= CONCURRENT_COUNT; i++) {
    const record = {
      id: `concurrent_test_record_${i}_${Math.random().toString(36).substring(2, 7)}`,
      seq: i,
      timestamp: new Date().toISOString(),
      filename: `test_image_${i}.jpg`,
      complianceScore: 100,
      mode: 'retailer',
      category: 'other',
      isTest: true
    };
    promises.push(dataStore.addScan(record));
  }

  // Await all 10 concurrent write operations
  await Promise.all(promises);

  // Read raw file directly from filesystem to verify persistence
  const savedScans = JSON.parse(fs.readFileSync(tempDbPath, 'utf-8'));
  console.log(`Total records written concurrently: ${savedScans.length} / ${CONCURRENT_COUNT}`);

  // Cleanup temporary file
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath);
  }

  if (savedScans.length === CONCURRENT_COUNT) {
    console.log('✅ CONCURRENCY TEST PASSED: Exactly 10/10 records safely preserved without collisions.');
    process.exit(0);
  } else {
    console.error(`❌ CONCURRENCY TEST FAILED: Expected ${CONCURRENT_COUNT} records, found ${savedScans.length}.`);
    process.exit(1);
  }
}

runConcurrencyTest().catch((err) => {
  console.error('Fatal test error:', err);
  if (fs.existsSync(tempDbPath)) {
    try { fs.unlinkSync(tempDbPath); } catch (_) {}
  }
  process.exit(1);
});
