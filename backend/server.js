/**
 * Enhanced Price Comparison Backend Server
 * With optimized scraping strategies and resource management
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const { cpus } = require('os');
const morgan = require('morgan');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// MongoDB connection setup (if needed)
if (process.env.MONGO_URI) {
  console.log('MongoDB connection string found. If your app needs MongoDB, make sure to install mongoose package.');
  // Uncomment the following lines if you need MongoDB
  // const mongoose = require('mongoose');
  // mongoose.connect(process.env.MONGO_URI)
  //   .then(() => console.log('MongoDB connected'))
  //   .catch(err => console.error('MongoDB connection error:', err));
}

// Import routes
const priceComparisonRoutes = require('./routes/priceComparison');
const groqApiRoutes = require('./routes/groqApi');

// Import services
const scraperService = require('./scraper/scraperService');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Performance configuration
const WORKER_COUNT = Math.max(1, Math.min(cpus().length - 1, 4)); // Use all cores minus one, max 4
console.log(`Server configured to use ${WORKER_COUNT} worker threads for scraping`);

// Middleware
app.use(morgan('dev')); // Logging
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(uploadsDir));

// API routes
app.use('/api/price-comparison', priceComparisonRoutes);
app.use('/api/groq', groqApiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug info endpoint
app.get('/debug-info', (req, res) => {
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: cpus().length,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Initialize server with proper shutdown handling
let server;

// Function to initialize the server
async function initializeServer() {
  try {
    // Initialize scraper service
    console.log('Initializing scraper service...');
    await scraperService.init();
    
    // Start the server
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
    
    // Handle graceful shutdown
    setupGracefulShutdown(server);
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
function setupGracefulShutdown(server) {
  // Handle process termination signals
  ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      
      // Close HTTP server first to stop accepting new requests
      server.close(() => {
        console.log('HTTP server closed.');
      });
      
      try {
        // Clean up resources
        console.log('Cleaning up resources...');
        await scraperService.shutdown();
        console.log('All resources cleaned up successfully');
        
        // Exit process
        console.log('Server shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });
  });

  // Handle unhandled errors and rejections to prevent crashes
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    // Don't exit immediately, try to keep the server running
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    // Don't exit immediately, try to keep the server running
  });
}

// Initialize
initializeServer();

module.exports = app;