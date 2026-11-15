#!/usr/bin/env node
/* =================================================================
   scripts/start-ml.js — Cross-platform Python ML Service Launcher
   
   Resolves the appropriate Python executable across operating systems:
     1. venv/bin/python (macOS / Linux)
     2. venv\Scripts\python.exe (Windows)
     3. .venv/bin/python or .venv\Scripts\python.exe
     4. Falls back to global 'python3' or 'python'
   Spawns ml-service/app.py with stdio inherited.
   ================================================================= */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const targetScript = process.argv[2] 
  ? path.resolve(projectRoot, process.argv[2]) 
  : path.join(projectRoot, 'ml-service', 'app.py');

function findPythonExecutable() {
  const candidates = [
    // Project virtual environments
    path.join(projectRoot, 'venv', 'bin', 'python'),
    path.join(projectRoot, 'venv', 'Scripts', 'python.exe'),
    path.join(projectRoot, '.venv', 'bin', 'python'),
    path.join(projectRoot, '.venv', 'Scripts', 'python.exe'),
    // System paths
    'python3',
    'python'
  ];

  for (const candidate of candidates) {
    if (candidate.startsWith(projectRoot)) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } else {
      return candidate; // fallback to PATH resolution
    }
  }
  return 'python';
}

const pythonBin = findPythonExecutable();
console.log(`[start-ml] Launching script: ${targetScript} using Python interpreter: ${pythonBin}`);

const mlProcess = spawn(pythonBin, [targetScript, ...process.argv.slice(3)], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env
});

mlProcess.on('error', (err) => {
  console.error(`[start-ml] Failed to start Python process (${pythonBin}):`, err.message);
  process.exit(1);
});

mlProcess.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[start-ml] Python ML service exited with code ${code}`);
  }
  process.exit(code || 0);
});

process.on('SIGINT', () => mlProcess.kill('SIGINT'));
process.on('SIGTERM', () => mlProcess.kill('SIGTERM'));
