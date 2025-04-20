/**
 * Enhanced Price Comparison API
 * Provides product search across multiple retailers with optimized scraping strategies
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const scraperService = require('../scraper/scraperService');
const directApiService = require('../scraper/directApiService');
const groqService = require('../services/groqService');

// Configure multer storage for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-image-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper to convert file to base64
const fileToBase64 = async (filePath) => {
  const readFile = promisify(fs.readFile);
  const data = await readFile(filePath);
  return data.toString('base64');
};

/**
 * Text search endpoint
 * Performs product search with fallbacks and parallelization
 */
router.post('/search', async (req, res) => {
  try {
    // Get search query
    const { query } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid search query (minimum 2 characters)'
      });
    }
    
    console.log(`Received search request for "${query}"`);
    const startTime = Date.now();
    
    // First try with direct API service (fastest method)
    try {
      console.log('Trying direct API approach...');
      const apiResults = await directApiService.searchProducts(query);
      
      if (apiResults.success && apiResults.products && apiResults.products.length > 0) {
        const endTime = Date.now();
        console.log(`Direct API search found ${apiResults.products.length} products in ${(endTime - startTime) / 1000}s`);
        
        return res.json({
          ...apiResults,
          executionTime: endTime - startTime
        });
      } else {
        console.log('Direct API approach did not find enough results, trying scraper service...');
      }
    } catch (error) {
      console.warn('Direct API error:', error.message);
      // Continue to scraper method
    }
    
    // Fall back to full scraper service
    try {
      console.log('Using full scraper service...');
      const results = await scraperService.searchProduct(query);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      console.log(`Search completed in ${executionTime / 1000}s, found ${results.count} products`);
      
      // Return the results
      return res.json({
        ...results,
        executionTime
      });
    } catch (error) {
      console.error('Scraper error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error performing search',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Search endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * Image search endpoint
 * Extracts product info from image and searches for matching products
 */
router.post('/image-search', upload.single('image'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }
    
    console.log('Received image search request');
    const startTime = Date.now();
    const imagePath = req.file.path;
    
    try {
      // Convert image to base64
      const imageBase64 = await fileToBase64(imagePath);
      
      // Extract keywords from image using GROQ if available
      let extractedKeywords = req.body.extractedKeywords || '';
      
      // If no keywords provided and GROQ is available, extract them
      if (!extractedKeywords && groqService) {
        try {
          console.log('Extracting keywords from image using GROQ...');
          extractedKeywords = await groqService.extractProductInfoFromImage(imageBase64);
          console.log('Extracted keywords:', extractedKeywords);
        } catch (err) {
          console.warn('GROQ keyword extraction failed:', err.message);
          // Continue with empty keywords, fall back to image-only search
        }
      }
      
      // Perform search based on image and/or extracted keywords
      const results = await scraperService.searchProductByImage(imageBase64, extractedKeywords);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      console.log(`Image search completed in ${executionTime / 1000}s, found ${results.count} products`);
      
      // Clean up the uploaded file
      fs.unlink(imagePath, (err) => {
        if (err) console.warn('Error deleting uploaded image:', err);
      });
      
      // Return the results
      return res.json({
        ...results,
        executionTime,
        extractedKeywords
      });
    } catch (error) {
      console.error('Image search error:', error);
      
      // Clean up the uploaded file
      fs.unlink(imagePath, (err) => {
        if (err) console.warn('Error deleting uploaded image:', err);
      });
      
      return res.status(500).json({
        success: false,
        message: 'Error processing image search',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Image search endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * Get list of supported retailers
 */
router.get('/retailers', (req, res) => {
  try {
    const retailers = scraperService.retailers ? 
      Object.keys(scraperService.retailers).map(key => ({
        id: key,
        name: scraperService.retailers[key].name
      })) : [];
    
    res.json({
      success: true,
      retailers
    });
  } catch (error) {
    console.error('Error fetching retailers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supported retailers',
      error: error.message
    });
  }
});

module.exports = router;