const express = require('express');
const router = express.Router();
const scraperService = require('../scraper/scraperService');
const groqService = require('../services/groqService');

/**
 * @route   POST api/price-comparison/search
 * @desc    Search for a product across multiple retailers
 * @access  Public
 */
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const results = await scraperService.searchProduct(query);
    
    return res.json({
      success: true,
      query,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error in product search:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching for products',
      error: error.message
    });
  }
});

/**
 * @route   POST api/price-comparison/image-search
 * @desc    Search products based on image analysis
 * @access  Public
 */
router.post('/image-search', async (req, res) => {
  try {
    const { imageData, keywords } = req.body;
    
    // If user provided both image and keywords, prioritize keywords
    if (keywords) {
      const results = await scraperService.scrapeProductsByKeywords(keywords);
      
      return res.json({
        success: true,
        source: 'user keywords',
        ...results
      });
    }
    
    // If no explicit keywords but image is provided in base64
    if (imageData) {
      // Process the image with Groq Vision
      const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
      
      // Save image to temp file for processing
      const fs = require('fs');
      const path = require('path');
      const tempFilePath = path.join(__dirname, '../uploads', `temp-${Date.now()}.jpg`);
      
      fs.writeFileSync(tempFilePath, Buffer.from(base64Image, 'base64'));
      
      // Process the image using Groq Vision
      const identificationResult = await groqService.identifyProductFromImage(tempFilePath);
      
      // Clean up temp file
      try { fs.unlinkSync(tempFilePath); } catch (e) { console.error('Error deleting temp file:', e); }
      
      if (!identificationResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to identify product from the image',
          error: identificationResult.error || 'Unknown error',
          suggestion: identificationResult.suggestion
        });
      }
      
      // Extract keywords for search
      const { productData } = identificationResult;
      const searchKeywords = productData.keywords || productData.product;
      
      if (!searchKeywords) {
        return res.status(400).json({
          success: false,
          message: 'Could not extract search keywords from the image',
          productData
        });
      }
      
      // Use the extracted keywords to search for products
      const scrapingResults = await scraperService.scrapeProductsByKeywords(searchKeywords);
      
      return res.json({
        success: true,
        source: 'image analysis',
        identificationResult: {
          productData,
          rawResponse: identificationResult.rawResponse
        },
        ...scrapingResults
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Either image data or keywords are required'
    });
    
  } catch (error) {
    console.error('Error in image-based product search:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching for products based on image',
      error: error.message
    });
  }
});

/**
 * @route   POST api/price-comparison/consolidate
 * @desc    Consolidate product data from multiple sources using AI
 * @access  Public
 */
router.post('/consolidate', async (req, res) => {
  try {
    const { products, keywords } = req.body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product data array is required'
      });
    }
    
    if (!keywords) {
      return res.status(400).json({
        success: false,
        message: 'Search keywords are required for consolidation'
      });
    }
    
    const consolidatedData = await scraperService.consolidateProductData(products, keywords);
    
    return res.json({
      success: true,
      data: consolidatedData
    });
  } catch (error) {
    console.error('Error consolidating product data:', error);
    return res.status(500).json({
      success: false,
      message: 'Error consolidating product data',
      error: error.message
    });
  }
});

/**
 * @route   POST api/price-comparison/details
 * @desc    Get detailed information for a specific product
 * @access  Public
 */
router.post('/details', async (req, res) => {
  try {
    const { product } = req.body;
    
    if (!product || !product.link || product.link === '#') {
      return res.status(400).json({
        success: false,
        message: 'Valid product with link is required'
      });
    }
    
    const detailedProduct = await scraperService.fetchProductDetails(product);
    
    return res.json({
      success: true,
      data: detailedProduct
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching product details',
      error: error.message
    });
  }
});

/**
 * @route   POST api/price-comparison/best-match
 * @desc    Find the best matching product for given keywords
 * @access  Public
 */
router.post('/best-match', async (req, res) => {
  try {
    const { keywords, products } = req.body;
    
    if (!keywords) {
      return res.status(400).json({
        success: false,
        message: 'Keywords are required'
      });
    }
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products array is required'
      });
    }
    
    const bestMatchProduct = await scraperService.findBestMatchProduct(keywords, products);
    
    return res.json({
      success: true,
      keywords,
      bestMatch: bestMatchProduct
    });
  } catch (error) {
    console.error('Error finding best match product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error finding best match product',
      error: error.message
    });
  }
});

/**
 * @route   POST api/price-comparison/analyze
 * @desc    Analyze product data and provide AI-powered insights
 * @access  Public
 */
router.post('/analyze', async (req, res) => {
  try {
    const { products, query } = req.body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product data array is required'
      });
    }
    
    // Get consolidated data
    const consolidatedData = await scraperService.consolidateProductData(
      products, 
      query || 'product comparison'
    );
    
    // Generate comprehensive product summary
    const summaryResult = await groqService.generateProductSummary(consolidatedData);
    
    return res.json({
      success: true,
      consolidatedData,
      summary: summaryResult
    });
  } catch (error) {
    console.error('Error analyzing product data:', error);
    return res.status(500).json({
      success: false,
      message: 'Error analyzing product data',
      error: error.message
    });
  }
});

module.exports = router;