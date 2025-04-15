const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const cheerio = require('cheerio');

/**
 * Service for interacting with Groq API for various AI and ML tasks
 * Handles image analysis, text processing, and product data enhancement
 */
class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.groqApiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    this.groqVisionEndpoint = 'https://api.groq.com/openai/v1/vision/chat/completions';
    
    // Default LLM model selection - using smaller models to reduce token usage
    this.defaultTextModel = 'llama3-8b-8192';  // Changed from llama3-70b-8192 to reduce token usage
    this.defaultVisionModel = 'llama3-8b-8192-vision';
    
    // System prompts for different tasks - optimized for token efficiency
    this.systemPrompts = {
      productIdentification: 'Identify products in images. Return JSON with product name, brand, category, features, keywords.',
      
      webScraping: 'Extract product data from HTML. Return JSON with name, price, specs, features.',
      
      productSummary: 'Analyze product data and create an informative comparison summary.'
    };

    // Simple cache to prevent duplicate API calls
    this.cache = {
      textRequests: {},
      visionRequests: {},
      maxCacheSize: 100,
      cacheKeys: []
    };
  }

  /**
   * Add an item to cache with expiration
   * @param {string} cacheType - Type of cache (textRequests or visionRequests)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds
   */
  addToCache(cacheType, key, value, ttlSeconds = 600) {
    // Manage cache size
    if (this.cache.cacheKeys.length >= this.cache.maxCacheSize) {
      const oldestKey = this.cache.cacheKeys.shift();
      const [oldCacheType, oldKey] = oldestKey.split('::');
      delete this.cache[oldCacheType][oldKey];
    }

    // Add to cache with expiration
    this.cache[cacheType][key] = {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    };
    
    // Add to cache keys list
    this.cache.cacheKeys.push(`${cacheType}::${key}`);
    
    // Set timeout to remove from cache after TTL
    setTimeout(() => {
      delete this.cache[cacheType][key];
      this.cache.cacheKeys = this.cache.cacheKeys.filter(k => k !== `${cacheType}::${key}`);
    }, ttlSeconds * 1000);
  }

  /**
   * Get an item from cache
   * @param {string} cacheType - Type of cache (textRequests or visionRequests)
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found or expired
   */
  getFromCache(cacheType, key) {
    const cached = this.cache[cacheType][key];
    if (!cached) return null;
    
    // Check if expired
    if (cached.expiry < Date.now()) {
      delete this.cache[cacheType][key];
      this.cache.cacheKeys = this.cache.cacheKeys.filter(k => k !== `${cacheType}::${key}`);
      return null;
    }
    
    return cached.value;
  }

  /**
   * Create a cache key from messages and parameters
   * @param {Array} messages - Message array
   * @param {Object} parameters - API parameters
   * @returns {string} - Cache key
   */
  createCacheKey(messages, parameters) {
    const contentString = messages.map(m => `${m.role}:${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('|');
    const paramsString = JSON.stringify(parameters || {});
    return `${contentString}::${paramsString}`;
  }

  /**
   * Call the Groq API with provided messages and parameters
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} parameters - API parameters like temperature, max_tokens, etc.
   * @returns {Promise<Object>} - API response
   */
  async callGroqAPI(messages, parameters = {}, retryCount = 0) {
    try {
      if (!this.apiKey) {
        throw new Error('Groq API key is not configured');
      }
      
      // Create a cache key
      const cacheKey = this.createCacheKey(messages, parameters);
      
      // Check cache first
      const cachedResponse = this.getFromCache('textRequests', cacheKey);
      if (cachedResponse) {
        console.log('Retrieved response from cache');
        return cachedResponse;
      }
      
      const response = await axios.post(
        this.groqApiEndpoint,
        {
          model: parameters.model || this.defaultTextModel,
          messages,
          temperature: parameters.temperature ?? 0.5,
          max_tokens: parameters.max_tokens ?? 2048, // Reduced from 4096 to save tokens
          top_p: parameters.top_p ?? 1.0,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      // Cache the successful response
      this.addToCache('textRequests', cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error calling Groq API:', error);
      
      if (error.response) {
        console.error('API response error:', error.response.data);
        
        // Handle rate limiting with retry logic
        if (error.response.status === 429 && retryCount < 3) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10);
          console.warn(`Rate limit hit! Retrying after ${retryAfter}s (Attempt ${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.callGroqAPI(messages, parameters, retryCount + 1);
        }
        
        throw new Error(`Groq API error: ${error.response.data.error?.message || 'Unknown API error'}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Call the Groq Vision API for image analysis
   * @param {string} imagePath - Path to image file
   * @param {string} prompt - Text prompt for image analysis
   * @param {Object} parameters - API parameters
   * @returns {Promise<Object>} - API response
   */
  async callGroqVisionAPI(imagePath, prompt, parameters = {}, retryCount = 0) {
    try {
      if (!this.apiKey) {
        throw new Error('Groq API key is not configured');
      }
      
      // Create a cache key - for vision, use image path + prompt
      const cacheKey = `${imagePath}::${prompt}::${JSON.stringify(parameters)}`;
      
      // Check cache first
      const cachedResponse = this.getFromCache('visionRequests', cacheKey);
      if (cachedResponse) {
        console.log('Retrieved vision response from cache');
        return cachedResponse;
      }
      
      // Read the image file as base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Create request payload with token-efficient prompt
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ];
      
      const response = await axios.post(
        this.groqVisionEndpoint,
        {
          model: parameters.model || this.defaultVisionModel,
          messages,
          temperature: parameters.temperature ?? 0.2,
          max_tokens: parameters.max_tokens ?? 2048, // Reduced from 4096
          top_p: parameters.top_p ?? 1.0,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      // Cache the successful response
      this.addToCache('visionRequests', cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error calling Groq Vision API:', error);
      
      if (error.response) {
        console.error('API response error:', error.response.data);
        
        // Handle rate limiting with retry logic
        if (error.response.status === 429 && retryCount < 3) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10);
          console.warn(`Vision API rate limit hit! Retrying after ${retryAfter}s (Attempt ${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.callGroqVisionAPI(imagePath, prompt, parameters, retryCount + 1);
        }
        
        throw new Error(`Groq Vision API error: ${error.response.data.error?.message || 'Unknown API error'}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Identify a product from an image
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} - Product identification results
   */
  async identifyProductFromImage(imagePath) {
    try {
      if (!fs.existsSync(imagePath)) {
        return {
          success: false,
          error: 'Image file not found',
          suggestion: 'Please upload a valid image file'
        };
      }
      
      // Token-efficient prompt
      const prompt = `Identify this product. Return JSON with: product name, brand, category, key features (only 2-3), keywords for search.`;
      
      const response = await this.callGroqVisionAPI(imagePath, prompt, {
        temperature: 0.2,
        max_tokens: 1024
      });
      
      // Extract the product data from the response
      const responseText = response.choices[0].message.content;
      
      try {
        // Try to parse the JSON from the response
        // First try to extract a JSON object if it's wrapped in markdown code blocks
        const jsonMatch = responseText.match(/```(?:json)?\n([\s\S]*?)\n```/) || 
                         responseText.match(/{[\s\S]*?}/);
                         
        let productData;
        if (jsonMatch) {
          productData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          // If no JSON found, try parsing the whole response text
          productData = JSON.parse(responseText);
        }
        
        return {
          success: true,
          productData,
          rawResponse: responseText
        };
      } catch (parseError) {
        console.error('Error parsing product identification response:', parseError);
        
        // If we can't parse JSON, extract keywords using a simple approach
        const productMatch = responseText.match(/product[:\s]+"([^"]+)"/i) || 
                            responseText.match(/product[:\s]+(.+)(?:\n|$)/i);
                            
        const keywordsMatch = responseText.match(/keywords[:\s]+"([^"]+)"/i) || 
                             responseText.match(/keywords[:\s]+(.+)(?:\n|$)/i);
        
        if (productMatch || keywordsMatch) {
          return {
            success: true,
            productData: {
              product: productMatch ? productMatch[1].trim() : 'Unknown product',
              keywords: keywordsMatch ? keywordsMatch[1].trim() : (productMatch ? productMatch[1].trim() : 'Unknown product')
            },
            rawResponse: responseText
          };
        }
        
        return {
          success: false,
          error: 'Failed to parse product identification data',
          suggestion: 'The image may not contain a clearly identifiable product. Try uploading a clearer image or specify the product keywords manually.',
          rawResponse: responseText
        };
      }
    } catch (error) {
      console.error('Error identifying product from image:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred during product identification',
        suggestion: 'There was an issue processing your image. Try a different image or specify the product keywords manually.'
      };
    }
  }
  
  /**
   * Extract relevant content from HTML to reduce token usage
   * @param {string} html - Full HTML content
   * @param {string} query - Search query
   * @returns {string} - Extracted relevant content
   */
  extractRelevantContent(html, query) {
    try {
      // Maximum content size (characters) to send to API
      const MAX_CONTENT_SIZE = 3000; // Drastically reduced from 12000 to stay under token limits
      
      let $ = cheerio.load(html);
      let relevantContent = "";
      
      // Extract product-specific elements
      const productElements = [
        // Product containers with direct product info
        $('.product, .item, .product-item, [data-component-type="s-search-result"]'),
        
        // E-commerce specific elements - Amazon
        $('#productTitle, #priceblock_ourprice, .a-price, .a-offscreen, #feature-bullets'),
        
        // Flipkart elements
        $('._4rR01T, ._30jeq3, ._1AtVbE'),
        
        // Generic product elements
        $('[class*="product"], [class*="item"], [class*="price"]')
      ];
      
      // Focus on extracting only critical product data
      for (const elements of productElements) {
        elements.each((i, element) => {
          const elementText = $(element).text().trim();
          const elementHtml = $(element).html();
          
          // Only include elements that are likely product related
          if (elementText.length > 0 && 
             (elementText.toLowerCase().includes(query.toLowerCase()) || 
              elementText.match(/₹|rs\.?|price|₨|inr|\$/i))) {
            relevantContent += elementHtml + "\n";
          }
          
          if (relevantContent.length > MAX_CONTENT_SIZE) {
            return false; // Break the loop if we've collected enough
          }
        });
        
        if (relevantContent.length > MAX_CONTENT_SIZE) {
          break; // Break the outer loop if we've collected enough
        }
      }
      
      // If we didn't get enough relevant content, try direct product selectors
      if (relevantContent.length < 500) {
        // Common product selector patterns
        const productSelectors = [
          '[data-component-type="s-search-result"]', // Amazon
          '._1AtVbE', // Flipkart 
          '.product-item', // Generic
          '.s-result-item', // Amazon
          '.product', // Generic
          '[class*="product-"]', // Generic pattern
          '[class*="price"]' // Price elements
        ];
        
        let tempContent = "";
        for (const selector of productSelectors) {
          $(selector).each((i, element) => {
            // Limit to first few products only
            if (i < 3) {
              tempContent += $(element).html() + "\n";
            }
          });
          
          if (tempContent.length > 500) {
            break;
          }
        }
        
        if (tempContent.length > relevantContent.length) {
          relevantContent = tempContent;
        }
      }
      
      // Ensure we don't exceed maximum size
      if (relevantContent.length > MAX_CONTENT_SIZE) {
        relevantContent = relevantContent.substring(0, MAX_CONTENT_SIZE);
      }
      
      // Add a note about truncation
      if (relevantContent.length < html.length) {
        relevantContent += "\n\n[Content truncated for token efficiency]";
      }
      
      return relevantContent;
    } catch (error) {
      console.error('Error extracting relevant content:', error);
      // Return a very small truncated version as fallback
      return html.substring(0, 3000) + "\n\n[Content was truncated]";
    }
  }
  
  /**
   * Enhance web scraping results using AI
   * @param {string} query - Search query or product name
   * @param {string} htmlContent - HTML content from the web page
   * @returns {Promise<Object>} - Enhanced data extracted from HTML
   */
  async enhanceWebScraping(query, htmlContent) {
    try {
      // Extract key content sections to drastically reduce token usage
      const extractedContent = this.extractRelevantContent(htmlContent, query);
      
      // Create a very token-efficient prompt
      const userPrompt = `Extract key product data for "${query}" from HTML. Return JSON only with: productName, currentPrice, discount.`;
      
      const messages = [
        {
          role: 'system',
          content: this.systemPrompts.webScraping
        },
        {
          role: 'user',
          content: `${userPrompt}\n\nHTML:\n${extractedContent}`
        }
      ];
      
      const response = await this.callGroqAPI(messages, {
        temperature: 0.3,
        max_tokens: 1024 // Reduced from 4096 to save tokens
      });
      
      return {
        success: true,
        enhancedData: response.choices[0].message.content
      };
    } catch (error) {
      console.error('Error enhancing web scraping:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred during web scraping enhancement'
      };
    }
  }
  
  /**
   * Generate a comprehensive product summary from consolidated data
   * @param {Object} consolidatedData - Consolidated product data from multiple sources
   * @returns {Promise<Object>} - Detailed product summary and analysis
   */
  async generateProductSummary(consolidatedData) {
    try {
      // Simplify the input data to reduce tokens
      const simplifiedData = {
        productName: consolidatedData.productName,
        priceRange: consolidatedData.priceRange,
        lowestPriceRetailer: consolidatedData.lowestPriceRetailer,
        highestPriceRetailer: consolidatedData.highestPriceRetailer,
        bestMatch: {
          title: consolidatedData.bestMatchProduct.title,
          price: consolidatedData.bestMatchProduct.price,
          features: consolidatedData.bestMatchProduct.features?.slice(0, 5) || [],
          specifications: consolidatedData.bestMatchProduct.specifications || {}
        }
      };
      
      const messages = [
        {
          role: 'system',
          content: this.systemPrompts.productSummary
        },
        {
          role: 'user',
          content: `Generate a brief product summary for:\n${JSON.stringify(simplifiedData, null, 2)}\n\nInclude: product overview, price comparison, best value, key features, and buying recommendation.`
        }
      ];
      
      const response = await this.callGroqAPI(messages, {
        temperature: 0.5,
        max_tokens: 2048 // Reduced from 4096
      });
      
      const summaryContent = response.choices[0].message.content;
      
      // Extract structured sections from the summary
      const sections = {
        overview: this.extractSection(summaryContent, 'overview', 'price comparison'),
        priceComparison: this.extractSection(summaryContent, 'price comparison', 'best value'),
        bestValue: this.extractSection(summaryContent, 'best value', 'key features'),
        keyFeatures: this.extractSection(summaryContent, 'key features', 'pros and cons'),
        prosAndCons: this.extractSection(summaryContent, 'pros and cons', 'buying recommendations'),
        buyingRecommendations: this.extractSection(summaryContent, 'buying recommendations', 'alternative products'),
        alternativeProducts: this.extractSection(summaryContent, 'alternative products', null),
        fullSummary: summaryContent
      };
      
      return {
        success: true,
        summaryContent,
        sections
      };
    } catch (error) {
      console.error('Error generating product summary:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred during summary generation'
      };
    }
  }
  
  /**
   * Extract a section from markdown content
   * @param {string} content - Markdown content
   * @param {string} sectionStart - Start of the section (case insensitive)
   * @param {string|null} sectionEnd - End of the section (case insensitive), null if last section
   * @returns {string} - Extracted section
   */
  extractSection(content, sectionStart, sectionEnd) {
    try {
      // Create pattern for finding the section
      const startPattern = new RegExp(`(#+\\s*${sectionStart}|${sectionStart})`, 'i');
      const startMatch = content.match(startPattern);
      
      if (!startMatch) return '';
      
      const startIndex = startMatch.index;
      
      let endIndex;
      if (sectionEnd) {
        const endPattern = new RegExp(`(#+\\s*${sectionEnd}|${sectionEnd})`, 'i');
        const endMatch = content.slice(startIndex).match(endPattern);
        endIndex = endMatch ? startIndex + endMatch.index : content.length;
      } else {
        endIndex = content.length;
      }
      
      return content.slice(startIndex, endIndex).trim();
    } catch (error) {
      console.error('Error extracting section:', error);
      return '';
    }
  }
}

// Create and export a singleton instance
const groqService = new GroqService();
module.exports = groqService;