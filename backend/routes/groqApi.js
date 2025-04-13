const express = require('express');
const router = express.Router();
const groqService = require('../services/groqService');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  fileFilter: function(req, file, cb) {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

/**
 * @route   POST api/groq/enhance-scraping
 * @desc    Enhance web scraping results using Groq AI
 * @access  Public
 */
router.post('/enhance-scraping', async (req, res) => {
  try {
    const { productName, htmlContent } = req.body;
    
    if (!productName || !htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'Product name and HTML content are required'
      });
    }
    
    const enhancedData = await groqService.enhanceWebScraping(productName, htmlContent);
    
    return res.json({
      success: true,
      data: enhancedData
    });
  } catch (error) {
    console.error('Error enhancing web scraping:', error);
    return res.status(500).json({
      success: false,
      message: 'Error enhancing web scraping',
      error: error.message
    });
  }
});

/**
 * @route   POST api/groq/process-image
 * @desc    Process product image to extract information
 * @access  Public
 */
router.post('/process-image', upload.single('productImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Product image is required'
      });
    }
    
    // Read the uploaded file as base64
    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath);
    const base64Image = fileData.toString('base64');
    
    // Process the image with Groq
    const imageAnalysis = await groqService.processProductImage(base64Image);
    
    // Clean up temporary file
    fs.unlinkSync(filePath);
    
    return res.json({
      success: true,
      data: imageAnalysis
    });
  } catch (error) {
    console.error('Error processing product image:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting temporary file:', unlinkError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error processing product image',
      error: error.message
    });
  }
});

/**
 * @route   POST api/groq/summarize
 * @desc    Summarize and compare product data from different retailers
 * @access  Public
 */
router.post('/summarize', async (req, res) => {
  try {
    const { productData } = req.body;
    
    if (!productData || !Array.isArray(productData)) {
      return res.status(400).json({
        success: false,
        message: 'Product data array is required'
      });
    }
    
    const summary = await groqService.summarizeAndCompare(productData);
    
    return res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error summarizing product data:', error);
    return res.status(500).json({
      success: false,
      message: 'Error summarizing product data',
      error: error.message
    });
  }
});

/**
 * @route   POST api/groq/recommendations
 * @desc    Get personalized product recommendations
 * @access  Public
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { productName, userPreferences, budget, scrapedData } = req.body;
    
    if (!productName || !scrapedData) {
      return res.status(400).json({
        success: false,
        message: 'Product name and scraped data are required'
      });
    }
    
    const recommendations = await groqService.getPersonalizedRecommendations(
      productName,
      userPreferences,
      budget,
      scrapedData
    );
    
    return res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting recommendations',
      error: error.message
    });
  }
});

/**
 * @route   POST api/groq/creative-content
 * @desc    Generate creative product reviews or descriptions
 * @access  Public
 */
router.post('/creative-content', async (req, res) => {
  try {
    const { productDetails } = req.body;
    
    if (!productDetails) {
      return res.status(400).json({
        success: false,
        message: 'Product details are required'
      });
    }
    
    const creativeContent = await groqService.generateCreativeContent(productDetails);
    
    return res.json({
      success: true,
      data: creativeContent
    });
  } catch (error) {
    console.error('Error generating creative content:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating creative content',
      error: error.message
    });
  }
});

/**
 * @route   POST api/groq/explain-features
 * @desc    Explain technical product features in simple terms
 * @access  Public
 */
router.post('/explain-features', async (req, res) => {
  try {
    const { specifications } = req.body;
    
    if (!specifications) {
      return res.status(400).json({
        success: false,
        message: 'Product specifications are required'
      });
    }
    
    const explanation = await groqService.explainFeatures(specifications);
    
    return res.json({
      success: true,
      data: explanation
    });
  } catch (error) {
    console.error('Error explaining features:', error);
    return res.status(500).json({
      success: false,
      message: 'Error explaining features',
      error: error.message
    });
  }
});

/**
 * @route   POST api/groq/analyze-prices
 * @desc    Analyze price comparison data to provide insights
 * @access  Public
 */
router.post('/analyze-prices', async (req, res) => {
  try {
    const { priceData } = req.body;
    
    if (!priceData) {
      return res.status(400).json({
        success: false,
        message: 'Price data is required'
      });
    }
    
    const analysis = await groqService.analyzePriceComparison(priceData);
    
    return res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing prices:', error);
    return res.status(500).json({
      success: false,
      message: 'Error analyzing prices',
      error: error.message
    });
  }
});

/**
 * @route   POST api/groq/process-barcode
 * @desc    Process barcode data to identify a product
 * @access  Public
 */
router.post('/process-barcode', async (req, res) => {
  try {
    const { barcodeData } = req.body;
    
    if (!barcodeData) {
      return res.status(400).json({
        success: false,
        message: 'Barcode data is required'
      });
    }
    
    const productInfo = await groqService.processBarcodeData(barcodeData);
    
    return res.json({
      success: true,
      data: productInfo
    });
  } catch (error) {
    console.error('Error processing barcode:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing barcode',
      error: error.message
    });
  }
});

/**
 * @route   POST api/groq/process-ocr
 * @desc    Process OCR text from an image to extract product information
 * @access  Public
 */
router.post('/process-ocr', async (req, res) => {
  try {
    const { ocrText } = req.body;
    
    if (!ocrText) {
      return res.status(400).json({
        success: false,
        message: 'OCR text is required'
      });
    }
    
    const analysis = await groqService.processOCRText(ocrText);
    
    return res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error processing OCR text:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing OCR text',
      error: error.message
    });
  }
});

module.exports = router;