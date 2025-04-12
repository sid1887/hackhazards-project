const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Service for integrating with the Groq API for AI-assisted tasks
 */
class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.model = 'mixtral-8x7b-32768'; // Default model
  }

  /**
   * Validates if the Groq API key is configured
   * @returns {boolean} - Whether the API key is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Helper method to make API calls to Groq
   * @param {Object} messages - The messages to send to the API
   * @param {Object} options - Additional options for the API call
   * @returns {Object} - The response from the Groq API
   */
  async callGroqAPI(messages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Groq API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: options.model || this.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1024
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error calling Groq API:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Enhance web scraping results using Groq's AI
   * @param {string} productName - The name of the product
   * @param {string} htmlContent - The HTML content from web scraping
   * @returns {Object} - Enhanced data extracted from the HTML
   */
  async enhanceWebScraping(productName, htmlContent) {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in extracting product information and prices from e-commerce websites.'
      },
      {
        role: 'user',
        content: `Extract the following information from this HTML content for the product "${productName}": 
        1. Current price
        2. Original price (if available)
        3. Discount percentage (if available)
        4. Availability/stock status
        5. Shipping information
        6. Seller/vendor name
        7. Product ratings
        
        HTML content: ${htmlContent.substring(0, 8000)}` // Limit to avoid token limits
      }
    ];

    const response = await this.callGroqAPI(messages, {
      temperature: 0.3 // Lower temperature for factual extraction
    });

    return {
      enhancedData: response.choices[0].message.content,
      usage: response.usage
    };
  }

  /**
   * Get product recommendations based on user preferences
   * @param {string} productName - The product name to get recommendations for
   * @param {string} userPreferences - User preferences for recommendations
   * @param {string} budget - User's budget constraint
   * @returns {Object} - Product recommendations
   */
  async getProductRecommendations(productName, userPreferences, budget) {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in providing product recommendations based on user preferences and budget constraints.'
      },
      {
        role: 'user',
        content: `Provide 3-5 product recommendations for someone interested in "${productName}" with these preferences: ${userPreferences || 'No specific preferences'} and a budget of ${budget || 'unspecified'}. For each recommendation, include product name, key features, estimated price range, and why it's a good choice.`
      }
    ];

    const response = await this.callGroqAPI(messages, {
      temperature: 0.7,
      max_tokens: 2048
    });

    return {
      recommendations: response.choices[0].message.content,
      usage: response.usage
    };
  }

  /**
   * Analyze price comparison data to provide insights
   * @param {Array} priceData - Array of price data from different sources
   * @returns {Object} - Analysis of price data with insights
   */
  async analyzePriceComparison(priceData) {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in analyzing price comparison data and providing valuable insights to consumers.'
      },
      {
        role: 'user',
        content: `Analyze this price comparison data and provide insights on:
        1. Which marketplace offers the best deal
        2. Price trends or patterns
        3. Recommendations for the buyer (buy now, wait, etc.)
        4. Any other relevant insights
        
        Price data: ${JSON.stringify(priceData)}`
      }
    ];

    const response = await this.callGroqAPI(messages, {
      temperature: 0.5
    });

    return {
      analysis: response.choices[0].message.content,
      usage: response.usage
    };
  }

  /**
   * Process a barcode to identify a product
   * @param {string} barcodeData - The data extracted from a barcode scan
   * @returns {Object} - Product identification information
   */
  async processBarcodeData(barcodeData) {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in identifying products from barcode data.'
      },
      {
        role: 'user',
        content: `Based on this barcode data, provide the most likely product information:
        
        Barcode data: ${barcodeData}
        
        Include product name, category, typical specifications, and any other identifiable information.`
      }
    ];

    const response = await this.callGroqAPI(messages, {
      temperature: 0.4
    });

    return {
      productIdentification: response.choices[0].message.content,
      usage: response.usage
    };
  }
}

module.exports = new GroqService();