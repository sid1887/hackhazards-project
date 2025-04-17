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
   * Extract relevant content from HTML to reduce token usage
   * @param {string} html - HTML content
   * @param {string} query - Search query
   * @returns {string} - Relevant HTML content
   */
  extractRelevantContent(html, query) {
    try {
      // Load HTML with cheerio
      const $ = cheerio.load(html);
      
      // Remove unnecessary elements
      $('script, style, meta, link, noscript, iframe, svg').remove();
      
      // Extract product-related elements
      const productElements = [];
      
      // Common product container selectors
      const selectors = [
        // Generic product containers
        '[class*="product"], [class*="item"], [class*="card"]',
        // Elements with price
        '[class*="price"]',
        // Elements with product in the class name
        '[class*="product"]',
        // List items with images and text
        'li:has(img):has(a)',
        // Divs with images, text and price-like content
        'div:has(img):has([class*="price"])',
        // Amazon specific
        '[data-component-type="s-search-result"]',
        // Flipkart specific
        '._1AtVbE, ._4ddWXP',
        // Meesho specific
        '.ProductList__Wrapper, [data-testid="product-container"]'
      ];
      
      // Extract elements matching selectors
      selectors.forEach(selector => {
        try {
          $(selector).each((i, el) => {
            const text = $(el).text().toLowerCase();
            // Only include if it might be related to the query
            if (text.includes(query.toLowerCase())) {
              productElements.push($(el).html());
            }
          });
        } catch (err) {
          // Ignore selector errors
        }
      });
      
      // If no product elements found, return a portion of the body
      if (productElements.length === 0) {
        return $('body').html().substring(0, 10000); // Limit to 10K chars
      }
      
      // Join the product elements
      return productElements.join('\n');
      
    } catch (error) {
      console.error('Error extracting relevant content:', error);
      // Return a portion of the original HTML if extraction fails
      return html.substring(0, 10000); // Limit to 10K chars
    }
  }

  /**
   * Enhance web scraping with AI analysis
   * @param {string} query - Search query
   * @param {string} html - HTML content
   * @returns {Promise<Object>} - Enhanced data
   */
  async enhanceWebScraping(query, html) {
    try {
      console.log(`Enhancing web scraping for query: ${query}`);
      
      // Extract relevant content to reduce token usage
      const relevantContent = this.extractRelevantContent(html, query);
      
      // Create a prompt for the AI
      const prompt = `
        Extract product information from this HTML content for the search query: "${query}".
        
        Return a JSON array of products with these fields:
        - productName: Full product name
        - price: Current price with currency symbol
        - originalPrice: Original price before discount (if available)
        - discount: Discount percentage (if available)
        - imageUrl: URL of the product image
        - url: URL to the product page
        - rating: Product rating (if available)
        
        Only include products that are relevant to the search query.
        Format your response as valid JSON only.
        
        HTML Content:
        ${relevantContent}
      `;
      
      // Call the Groq API
      const response = await this.callGroqAPI([
        { role: 'system', content: 'You are an expert at extracting structured product data from HTML content.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.2,
        max_tokens: 2048
      });
      
      // Extract the enhanced data
      const enhancedData = response.choices[0].message.content;
      
      return {
        success: true,
        enhancedData,
        rawResponse: response
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
      
      // More detailed prompt for better product identification
      const prompt = `
        Analyze this product image in detail and identify what it shows.
        
        Please provide the following information in JSON format:
        1. product: The exact product name
        2. brand: The brand name if visible
        3. category: Product category (e.g., Electronics, Clothing, etc.)
        4. features: 2-3 key features visible in the image
        5. keywords: 5-8 specific search terms that would help find this exact product online
        6. description: A brief description of what you see (30 words max)
        
        Format your response as valid JSON only.
      `;
      
      console.log('Calling Groq Vision API for product identification...');
      
      const response = await this.callGroqVisionAPI(imagePath, prompt, {
        temperature: 0.3, // Slightly higher temperature for more detailed responses
        max_tokens: 1500  // Increased token limit for more detailed analysis
      });
      
      // Extract the product data from the response
      const responseText = response.choices[0].message.content;
      console.log('Raw response from Groq Vision API:', responseText);
      
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
        
        // Ensure we have at least the basic fields
        if (!productData.product) {
          productData.product = 'Unknown product';
        }
        
        if (!productData.keywords) {
          // Generate keywords from product name and category if not provided
          const keywords = [];
          if (productData.product) keywords.push(productData.product);
          if (productData.brand) keywords.push(productData.brand);
          if (productData.category) keywords.push(productData.category);
          
          productData.keywords = keywords.join(', ');
        }
        
        console.log('Successfully parsed product data:', productData);
        
        return {
          success: true,
          productData,
          rawResponse: responseText
        };
      } catch (parseError) {
        console.error('Error parsing product identification response:', parseError);
        console.log('Attempting alternative parsing method...');
        
        // If we can't parse JSON, extract information using regex patterns
        const extractField = (field) => {
          const patterns = [
            new RegExp(`"?${field}"?\\s*:\\s*"([^"]+)"`, 'i'),
            new RegExp(`"?${field}"?\\s*:\\s*([^,\\n\\}]+)`, 'i'),
            new RegExp(`${field}[:\\s]+"?([^"\\n]+)"?`, 'i'),
            new RegExp(`${field}[:\\s]+([^\\n]+)`, 'i')
          ];
          
          for (const pattern of patterns) {
            const match = responseText.match(pattern);
            if (match) return match[1].trim();
          }
          
          return null;
        };
        
        // Extract key fields
        const product = extractField('product') || extractField('name') || 'Unknown product';
        const brand = extractField('brand') || extractField('manufacturer') || '';
        const category = extractField('category') || extractField('type') || '';
        const keywords = extractField('keywords') || extractField('search terms') || product;
        
        const productData = {
          product,
          brand,
          category,
          keywords: keywords || `${product} ${brand} ${category}`.trim()
        };
        
        console.log('Extracted product data using alternative method:', productData);
        
        return {
          success: true,
          productData,
          rawResponse: responseText
        };
      }
    } catch (error) {
      console.error('Error identifying product from image:', error);
      
      // Check if it's an API key issue
      if (error.message && error.message.includes('API key')) {
        return {
          success: false,
          error: 'API key configuration issue. Please check your Groq API key.',
          suggestion: 'Contact support to verify your API configuration.'
        };
      }
      
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