const express = require('express');
const cors = require('cors');
const path = require('path');
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
const groqApiRoutes = require('./routes/groqApi');
const priceComparisonRoutes = require('./routes/priceComparison');

// Initialize express app
const app = express();

// Set up middleware
app.use(morgan('dev')); // Logging
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies (with increased limit for images)
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static files for uploads (with appropriate security headers)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(uploadsDir));

// API routes
app.use('/api/groq', groqApiRoutes);
app.use('/api/price-comparison', priceComparisonRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// Set port
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;