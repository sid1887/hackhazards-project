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
    const { productName, category, expectedPrice, specifications } = req.body;
    
    if (!productName) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }
    
    // Get price comparison results from scraper service
    const results = await scraperService.searchProduct(productName);
    
    // Format specifications for AI analysis if provided
    let userPreferences = '';
    if (category) userPreferences += `Category: ${category}. `;
    if (expectedPrice) userPreferences += `Expected price range: ₹${expectedPrice}. `;
    if (specifications) userPreferences += `Desired specifications: ${specifications}. `;
    
    // Use Groq AI to analyze the price comparison results
    const aiAnalysis = await groqService.analyzePriceComparison(results);
    
    // Get AI-enhanced recommendations if user provided preferences
    let recommendations = null;
    if (userPreferences) {
      recommendations = await groqService.getPersonalizedRecommendations(
        productName,
        userPreferences,
        expectedPrice,
        results
      );
    }
    
    // Get technical specifications explanation if available
    let specExplanation = null;
    if (results.length > 0 && results[0].specifications) {
      specExplanation = await groqService.explainFeatures(results[0].specifications);
    }
    
    return res.json({
      success: true,
      results,
      aiAnalysis: aiAnalysis.analysis,
      recommendations: recommendations ? recommendations.recommendations : null,
      specExplanation: specExplanation ? specExplanation.simplifiedExplanation : null
    });
  } catch (error) {
    console.error('Error searching product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching product',
      error: error.message
    });
  }
});

/**
 * @route   POST api/price-comparison/barcode
 * @desc    Search for a product using barcode data
 * @access  Public
 */
router.post('/barcode', async (req, res) => {
  try {
    const { barcode } = req.body;
    
    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: 'Barcode data is required'
      });
    }
    
    // Process barcode data to identify the product
    const productInfo = await groqService.processBarcodeData(barcode);
    
    // Extract product name and details from AI response
    const productIdentification = productInfo.productIdentification;
    
    // Try to parse the AI response to get structured data
    let productName = 'Unknown Product';
    let productCategory = '';
    let productSpecs = '';
    
    try {
      // This assumes the AI formats its response in a somewhat consistent way
      const nameMatch = productIdentification.match(/product name:?\s*([^\n.]+)/i);
      if (nameMatch && nameMatch[1]) {
        productName = nameMatch[1].trim();
      }
      
      const categoryMatch = productIdentification.match(/category:?\s*([^\n.]+)/i);
      if (categoryMatch && categoryMatch[1]) {
        productCategory = categoryMatch[1].trim();
      }
      
      const specsMatch = productIdentification.match(/specifications:?\s*([^\n.]+)/i);
      if (specsMatch && specsMatch[1]) {
        productSpecs = specsMatch[1].trim();
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }
    
    // Now use the extracted product name to search for prices
    const results = await scraperService.searchProduct(productName);
    
    // Use AI to generate a product review/description
    const firstProduct = results.length > 0 ? results[0] : { title: productName };
    const creativeContent = await groqService.generateCreativeContent({
      ...firstProduct,
      category: productCategory,
      specifications: productSpecs
    });
    
    return res.json({
      success: true,
      productDetails: {
        name: productName,
        category: productCategory,
        specifications: productSpecs,
        barcodeData: barcode
      },
      results,
      aiDescription: creativeContent.creativeContent
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
 * @route   POST api/price-comparison/image
 * @desc    Process product image and search for prices
 * @access  Public
 */
router.post('/image', async (req, res) => {
  try {
    const { base64Image } = req.body;
    
    if (!base64Image) {
      return res.status(400).json({
        success: false,
        message: 'Product image is required'
      });
    }
    
    // Process the image to extract product information
    const imageAnalysis = await groqService.processProductImage(base64Image);
    
    if (imageAnalysis.isError) {
      return res.status(400).json({
        success: false,
        message: 'Unable to process image',
        guidance: imageAnalysis.productInfo
      });
    }
    
    // Extract product name from AI analysis
    const productInfo = imageAnalysis.productInfo;
    
    // Try to parse the AI response to get structured data
    let productName = 'Unknown Product';
    
    try {
      // Look for product name in the AI analysis
      const productNameMatch = productInfo.match(/product(?:\s+name)?(?:\s+is)?:?\s*([^.\n]+)/i);
      if (productNameMatch && productNameMatch[1]) {
        productName = productNameMatch[1].trim();
      } else {
        // If no explicit product name, use the first sentence or part of it
        const firstSentence = productInfo.split(/[.!?]/)[0];
        if (firstSentence && firstSentence.length > 10) {
          productName = firstSentence.length > 50 
            ? firstSentence.substring(0, 50) + '...'
            : firstSentence;
        }
      }
    } catch (parseError) {
      console.error('Error parsing image analysis:', parseError);
    }
    
    // Now use the extracted product name to search for prices
    const results = await scraperService.searchProduct(productName);
    
    return res.json({
      success: true,
      productDetails: {
        name: productName,
        imageAnalysis: productInfo
      },
      results
    });
  } catch (error) {
    console.error('Error processing product image:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing product image',
      error: error.message
    });
  }
});

module.exports = router;