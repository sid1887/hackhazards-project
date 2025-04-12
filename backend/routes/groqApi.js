const express = require('express');
const router = express.Router();
const axios = require('axios');

// @route   POST api/groq/enhance-scraping
// @desc    Use Groq API to enhance web scraping capabilities
// @access  Private
router.post('/enhance-scraping', async (req, res) => {
  try {
    const { productDetails, scrapedHtml } = req.body;
    
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Groq API key not configured'
      });
    }

    // Call the Groq API
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'system',
          content: 'You are an AI specialized in extracting product information and prices from e-commerce websites.'
        },
        {
          role: 'user',
          content: `Extract the following information from this HTML content for the product "${productDetails.name}": 
          1. Current price
          2. Original price (if available)
          3. Discount percentage (if available)
          4. Availability/stock status
          5. Shipping information
          6. Seller/vendor name
          7. Product ratings
          
          HTML content: ${scrapedHtml.substring(0, 8000)}` // Limit to avoid token limits
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return res.json({
      success: true,
      enhancedData: response.data.choices[0].message.content
    });
  } catch (error) {
    console.error('Error calling Groq API:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing with Groq API',
      error: error.message
    });
  }
});

// @route   POST api/groq/product-recommendations
// @desc    Get AI-powered product recommendations using Groq
// @access  Public
router.post('/product-recommendations', async (req, res) => {
  try {
    const { productName, userPreferences, budget } = req.body;
    
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Groq API key not configured'
      });
    }

    // Call the Groq API for intelligent product recommendations
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'system',
          content: 'You are an AI specialized in providing product recommendations based on user preferences and budget constraints.'
        },
        {
          role: 'user',
          content: `Provide 3-5 product recommendations for someone interested in "${productName}" with these preferences: ${userPreferences || 'No specific preferences'} and a budget of ${budget || 'unspecified'}. For each recommendation, include product name, key features, estimated price range, and why it's a good choice.`
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return res.json({
      success: true,
      recommendations: response.data.choices[0].message.content
    });
  } catch (error) {
    console.error('Error getting product recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: error.message
    });
  }
});

module.exports = router;