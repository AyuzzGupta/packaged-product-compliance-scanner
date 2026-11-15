#!/usr/bin/env node
/* =================================================================
   scripts/reset-data.js — Reset Scan Records Database Safely
   
   Creates a timestamped backup of data/scans.json, then resets
   the primary store to an empty array [].
   ================================================================= */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const dataFilePath = process.env.DATA_FILE 
  ? path.resolve(projectRoot, process.env.DATA_FILE)
  : path.join(projectRoot, 'data', 'scans.json');

const dataDir = path.dirname(dataFilePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(dataFilePath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(dataDir, `scans.backup.${timestamp}.json`);
  
  try {
    fs.copyFileSync(dataFilePath, backupPath);
    console.log(`[reset-data] Backed up existing scans to: ${backupPath}`);
  } catch (err) {
    console.warn(`[reset-data] Warning: Could not create backup: ${err.message}`);
  }
}

fs.writeFileSync(dataFilePath, '[]', 'utf-8');
console.log(`[reset-data] Successfully reset database at: ${dataFilePath}`);
