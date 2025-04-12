const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Use MongoDB connection string from environment variables
    // For development, you can use a local MongoDB instance
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/cumpair';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Import routes
const priceComparisonRoutes = require('./routes/priceComparison');
const groqApiRoutes = require('./routes/groqApi');

// Use routes
app.use('/api/price-comparison', priceComparisonRoutes);
app.use('/api/groq', groqApiRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Cumpair API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Set port
const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
  }
};

startServer();