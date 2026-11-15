/* =================================================================
   Packaged Product Compliance Scanner (SIH26034)
   Main Express Server Entry Point
   ================================================================= */

const path    = require('path');
const dotenv  = require('dotenv');
// Load .env from project root or current working dir
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const express = require('express');
const fs      = require('fs');

const dataStore = require('./services/dataStore');
const apiRoutes = require('./routes/api');

const app  = express();
const PORT = parseInt(process.env.PORT || '5001', 10);

// Ensure necessary directories exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize JSON database
dataStore.init();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve sample label images from data/samples
const samplesDir = path.join(__dirname, '../data/samples');
app.use('/samples', express.static(samplesDir));

// Serve uploaded images (for debugging / review)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes
app.use('/api', apiRoutes);

// Serve frontend static assets from /frontend directory
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

// Specific page routes
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(frontendDir, 'dashboard.html'));
});

app.get('/health', (req, res) => {
  res.sendFile(path.join(frontendDir, 'health.html'));
});

app.get('/any-product', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Fallback route for single page app
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Start Server with fallback if port (e.g. 5000 on macOS) is in use
const DEFAULT_PORT = PORT;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log('====================================================');
    console.log(` Packaged Product Compliance Scanner Server (SIH26034)`);
    console.log(` Status: Running at http://localhost:${port}`);
    console.log(` Static Frontend: ${frontendDir}`);
    console.log(` Samples Directory: ${samplesDir}`);
    console.log('====================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${port} is in use (often by macOS AirPlay). Shifting to port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[Server] Startup error:', err);
    }
  });
}

startServer(DEFAULT_PORT);
