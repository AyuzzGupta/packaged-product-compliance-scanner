/* =================================================================
   Packaged Product Compliance Scanner (SIH26034)
   Main Express Server Entry Point
   ================================================================= */

const express = require('express');
const path    = require('path');
const fs      = require('fs');

const dataStore = require('./data/dataStore');
const apiRoutes = require('./routes/api');

const app  = express();
const PORT = process.env.PORT || 5000;

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

// Serve sample label images
app.use('/samples', express.static(path.join(__dirname, 'samples')));

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
const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);

function startServer(port) {
  const server = app.listen(port, () => {
    console.log('====================================================');
    console.log(` Packaged Product Compliance Scanner Server (SIH26034)`);
    console.log(` Status: Running at http://localhost:${port}`);
    console.log(` Static Frontend: ${frontendDir}`);
    console.log(` Samples Directory: ${path.join(__dirname, 'samples')}`);
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
