/**
 * Enhanced Price Comparison API
 * Provides product search across multiple retailers with optimized scraping strategies
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const scraperService = require('../scraper/scraperService');
const directApiService = require('../scraper/directApiService');

// Configure multer storage for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Initialize multer upload
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

/**
 * @route   POST /api/search
 * @desc    Search for products by keyword
 * @access  Public
 */
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }
    
    console.log(`Received search request for: "${query}"`);
    
    // Try the aggressive direct API approach first (fastest and most reliable)
    console.log('Starting aggressive direct API search...');
    const searchResults = await directApiService.aggressiveSearch(query);
    
    // If we have enough results, return them
    if (searchResults && searchResults.products && searchResults.products.length > 0) {
      console.log(`Found ${searchResults.products.length} products using aggressive direct API search`);
      return res.json(searchResults);
    }
    
    // If direct API search failed, fallback to browser-based scraping
    console.log('Direct API search failed, trying browser-based scraping...');
    const scraperResults = await scraperService.searchProduct(query);
    
    console.log(`Found ${scraperResults.products ? scraperResults.products.length : 0} products using browser-based scraping`);
    res.json(scraperResults);
    
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ success: false, message: 'Error searching products', error: error.message });
  }
});

/**
 * @route   POST /api/search/image
 * @desc    Search for products by image
 * @access  Public
 */
router.post('/search/image', upload.single('image'), async (req, res) => {
  try {
    const { extractedKeywords } = req.body;
    const imageFile = req.file;
    
    if (!imageFile && (!extractedKeywords || extractedKeywords.trim().length === 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either an image or extracted keywords are required' 
      });
    }
    
    // Read the image file if available
    let imageData = null;
    if (imageFile) {
      const imagePath = imageFile.path;
      imageData = fs.readFileSync(imagePath, { encoding: 'base64' });
    }
    
    console.log(`Received image search request${extractedKeywords ? ` with keywords: "${extractedKeywords}"` : ''}`);
    
    // Search products using the image or extracted keywords
    const searchResults = await scraperService.searchProductByImage(imageData, extractedKeywords);
    
    console.log(`Found ${searchResults.products.length} products from image search`);
    res.json(searchResults);
    
  } catch (error) {
    console.error('Error searching products by image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error searching products by image', 
      error: error.message 
    });
  }
});

module.exports = router;