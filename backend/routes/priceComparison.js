const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const scraperService = require('../scraper/scraperService');
const groqService = require('../services/groqService');

// @route   POST api/price-comparison/search
// @desc    Search for product prices across different marketplaces
// @access  Public
router.post('/search', async (req, res) => {
  try {
    const { productName, category, specifications, expectedPrice } = req.body;

    if (!productName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product name is required' 
      });
    }

    // Use the scraperService to fetch prices from different marketplaces
    const scrapedResults = await scraperService.searchProduct(productName);

    // Use Groq API to analyze the price comparison results
    let aiAnalysis = null;
    try {
      if (groqService.isConfigured()) {
        const analysisResult = await groqService.analyzePriceComparison(scrapedResults);
        aiAnalysis = analysisResult.analysis;
      }
    } catch (groqError) {
      console.error('Error using Groq API for price analysis:', groqError);
      // Continue without AI analysis if there's an error
    }

    return res.json({
      success: true,
      productDetails: {
        name: productName,
        category,
        specifications
      },
      results: scrapedResults,
      aiAnalysis
    });
  } catch (error) {
    console.error('Error in price comparison search:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   POST api/price-comparison/barcode
// @desc    Get product details and prices by barcode
// @access  Public
router.post('/barcode', async (req, res) => {
  try {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Barcode is required' 
      });
    }

    // Use Groq API to process barcode data if configured
    let productDetails = null;
    try {
      if (groqService.isConfigured()) {
        const barcodeResult = await groqService.processBarcodeData(barcode);
        // Attempt to extract structured data from the AI response
        // This is a simplistic approach - in production you would parse this more carefully
        const aiResponse = barcodeResult.productIdentification;
        
        // Default fallback product details
        productDetails = {
          name: `Product for barcode ${barcode}`,
          category: 'Electronics',
          specifications: 'Sample specifications',
          barcodeData: barcode,
          aiIdentified: true,
          aiResponse
        };
      }
    } catch (groqError) {
      console.error('Error using Groq API for barcode processing:', groqError);
    }

    // If Groq API is not configured or fails, use fallback details
    if (!productDetails) {
      productDetails = {
        name: `Product for barcode ${barcode}`,
        category: 'Electronics',
        specifications: 'Sample specifications',
        barcodeData: barcode,
        aiIdentified: false
      };
    }

    // Use the scraper service to fetch prices for the identified product
    const scrapedResults = await scraperService.searchProduct(productDetails.name);

    return res.json({
      success: true,
      productDetails,
      results: scrapedResults
    });
  } catch (error) {
    console.error('Error in barcode lookup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Helper function to scrape product prices
// This is a placeholder implementation - in a real app,
// you would implement proper web scraping for each marketplace
async function scrapeProductPrices(productName) {
  // For demonstration purposes, return mock data
  // In a production app, you would use Puppeteer to scrape real prices
  return [
    {
      marketplace: 'Amazon',
      price: (Math.random() * 100 + 50).toFixed(2),
      url: `https://amazon.com/s?k=${encodeURIComponent(productName)}`,
      inStock: true,
      shipping: 'Free with Prime',
      rating: (Math.random() * 5).toFixed(1)
    },
    {
      marketplace: 'Flipkart',
      price: (Math.random() * 100 + 40).toFixed(2),
      url: `https://flipkart.com/search?q=${encodeURIComponent(productName)}`,
      inStock: true,
      shipping: '₹40',
      rating: (Math.random() * 5).toFixed(1)
    },
    {
      marketplace: 'Reliance Mart',
      price: (Math.random() * 100 + 45).toFixed(2),
      url: '#',
      inStock: Math.random() > 0.3,
      shipping: 'Varies by location',
      rating: (Math.random() * 5).toFixed(1)
    },
    {
      marketplace: 'DMart',
      price: (Math.random() * 100 + 30).toFixed(2),
      url: '#',
      inStock: Math.random() > 0.2,
      shipping: 'Store pickup only',
      rating: (Math.random() * 5).toFixed(1)
    }
  ];
}

module.exports = router;