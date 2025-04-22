const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const cheerio = require('cheerio');
const path = require('path');
const mime = require('mime-types');
const crypto = require('crypto');
const prompts = require('./groqPrompts.json');

// Import scraper service for hybrid search
let scraperService;
try {
  scraperService = require('../scraper/scraperService');
} catch (error) {
  console.warn('Scraper service not available for hybrid search:', error.message);
}

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
    
    // Import system prompts from external file
    this.systemPrompts = prompts.systemPrompts;
    this.userPrompts = prompts.userPrompts;
    this.errorHandling = prompts.errorHandling;

    // Simple cache to prevent duplicate API calls
    this.cache = {
      textRequests: {},
      visionRequests: {},
      imageHashes: {}, // Store image hashes for quicker lookups
      maxCacheSize: 100,
      cacheKeys: []
    };
    
    // Debug mode for logging
    this.debugMode = process.env.DEBUG_GROQ === 'true';
    
    // Create debug directory if it doesn't exist
    this.debugDir = path.join(__dirname, '../../debug/groq');
    if (this.debugMode && !fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
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
      
      // Generate hash of image for cache lookup
      const imageHash = this.getImageHash(imagePath);
      
      // Create a cache key - for vision, use image hash + prompt
      const cacheKey = `${imageHash}::${prompt}::${JSON.stringify(parameters)}`;
      
      // Check cache first
      const cachedResponse = this.getFromCache('visionRequests', cacheKey);
      if (cachedResponse) {
        console.log('Retrieved vision response from cache');
        return cachedResponse;
      }
      
      // Read the image file as base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Use mime-types to detect content type dynamically
      const contentType = mime.lookup(imagePath) || 'image/jpeg';
      
      // Log image details in debug mode
      if (this.debugMode) {
        console.log(`Processing image: ${path.basename(imagePath)}`);
        console.log(`Image hash: ${imageHash}`);
        console.log(`Content type: ${contentType}`);
        console.log(`Image size: ${imageBuffer.length} bytes`);
        
        // Save debug info
        const debugInfo = {
          timestamp: new Date().toISOString(),
          imagePath,
          imageHash,
          contentType,
          imageSize: imageBuffer.length,
          prompt
        };
        
        fs.writeFileSync(
          path.join(this.debugDir, `vision_request_${Date.now()}.json`),
          JSON.stringify(debugInfo, null, 2)
        );
      }
      
      // Create request payload with token-efficient prompt
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${contentType};base64,${base64Image}`
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
          max_tokens: parameters.max_tokens ?? 2048,
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
      
      // Store the image hash for future reference
      this.cache.imageHashes[imageHash] = {
        path: imagePath,
        contentType,
        timestamp: Date.now()
      };
      
      // Save response in debug mode
      if (this.debugMode) {
        fs.writeFileSync(
          path.join(this.debugDir, `vision_response_${imageHash}.json`),
          JSON.stringify(response.data, null, 2)
        );
      }
      
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
   * Generate MD5 hash of an image file
   * @param {string} imagePath - Path to image file
   * @returns {string} - MD5 hash of image
   */
  getImageHash(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      return crypto.createHash('md5').update(imageBuffer).digest('hex');
    } catch (error) {
      console.error('Error generating image hash:', error);
      return `error-${Date.now()}`;
    }
  }
  
  /**
   * Process an image in base64 format
   * @param {string} base64Image - Base64 encoded image
   * @param {string} contentType - MIME type of the image
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Product identification results
   */
  async processBase64Image(base64Image, contentType = 'image/jpeg', options = {}) {
    try {
      if (!base64Image) {
        return {
          success: false,
          error: 'No image data provided',
          suggestion: 'Please provide a valid base64 encoded image',
          code: 'NO_IMAGE_DATA'
        };
      }
      
      // Clean the base64 string if it includes the data URL prefix
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      
      // Generate a hash for the image data
      const imageHash = crypto.createHash('md5').update(base64Data).digest('hex');
      
      // Check cache first
      const cacheKey = `${imageHash}::${this.userPrompts.productIdentification}`;
      const cachedResponse = this.getFromCache('visionRequests', cacheKey);
      
      if (cachedResponse) {
        console.log('Retrieved vision response from cache for base64 image');
        
        // Process the cached response
        const responseText = cachedResponse.choices[0].message.content;
        
        try {
          // Try to parse the JSON from the response
          const jsonMatch = responseText.match(/```(?:json)?\n([\s\S]*?)\n```/) || 
                           responseText.match(/{[\s\S]*?}/);
                           
          let productData;
          if (jsonMatch) {
            productData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } else {
            productData = JSON.parse(responseText);
          }
          
          // Normalize the product data
          const normalizedData = this.normalizeProductData(productData);
          
          // Trigger search if needed
          let searchResults = null;
          if (options.autoSearch !== false) {
            searchResults = await this.triggerProductSearch(normalizedData);
          }
          
          return {
            success: true,
            productData: normalizedData,
            rawResponse: responseText,
            searchResults,
            fromCache: true
          };
        } catch (parseError) {
          console.error('Error parsing cached response:', parseError);
          // Continue with API call if parsing fails
        }
      }
      
      // Create a temporary file to store the image
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const extension = contentType.split('/')[1] || 'jpg';
      const tempFilePath = path.join(tempDir, `${imageHash}.${extension}`);
      
      // Write the base64 data to a temporary file
      fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));
      
      try {
        // Process the image using the file-based method
        const result = await this.identifyProductFromImage(tempFilePath, options);
        
        // Clean up the temporary file
        fs.unlinkSync(tempFilePath);
        
        return result;
      } catch (error) {
        // Clean up the temporary file in case of error
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error processing base64 image:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown error processing base64 image',
        suggestion: this.errorHandling.suggestion.generic,
        code: 'BASE64_PROCESSING_ERROR'
      };
    }
  }
  
  /**
   * Identify a product from an image
   * @param {string} imagePath - Path to image file
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Product identification results
   */
  async identifyProductFromImage(imagePath, options = {}) {
    try {
      // Validate image file
      if (!fs.existsSync(imagePath)) {
        return {
          success: false,
          error: 'Image file not found',
          suggestion: this.errorHandling.suggestion.generic,
          code: 'FILE_NOT_FOUND'
        };
      }
      
      // Check image size
      const stats = fs.statSync(imagePath);
      if (stats.size > 20 * 1024 * 1024) { // 20MB limit
        return {
          success: false,
          error: 'Image file is too large',
          suggestion: 'Please upload an image smaller than 20MB',
          code: 'FILE_TOO_LARGE'
        };
      }
      
      // Check image format
      const imageExt = path.extname(imagePath).toLowerCase();
      const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      if (!supportedFormats.includes(imageExt)) {
        return {
          success: false,
          error: 'Unsupported image format',
          suggestion: 'Please upload a JPG, PNG, WebP, or GIF image',
          code: 'UNSUPPORTED_FORMAT'
        };
      }
      
      // Use external prompt template
      const prompt = this.userPrompts.productIdentification;
      
      console.log('Calling Groq Vision API for product identification...');
      
      // Log image analysis start in debug mode
      if (this.debugMode) {
        console.log(`Starting product identification for image: ${path.basename(imagePath)}`);
      }
      
      const response = await this.callGroqVisionAPI(imagePath, prompt, {
        temperature: 0.3,
        max_tokens: 1500
      });
      
      // Extract the product data from the response
      const responseText = response.choices[0].message.content;
      
      if (this.debugMode) {
        console.log('Raw response from Groq Vision API:', responseText);
      }
      
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
        
        // Normalize the product data structure
        const normalizedData = this.normalizeProductData(productData);
        
        console.log('Successfully parsed product data:', normalizedData);
        
        // Check if the product was actually identified
        if (!normalizedData.product || normalizedData.product === 'Unknown product') {
          return {
            success: false,
            error: this.errorHandling.noProductFound,
            suggestion: this.errorHandling.suggestion.generic,
            code: 'NO_PRODUCT_DETECTED',
            partialData: normalizedData
          };
        }
        
        // Automatically trigger a search with the identified keywords
        // Only if autoSearch option is enabled (default: true)
        let searchResults = null;
        if (options.autoSearch !== false) {
          searchResults = await this.triggerProductSearch(normalizedData);
        }
        
        return {
          success: true,
          productData: normalizedData,
          rawResponse: responseText,
          searchResults: searchResults
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
        
        // Normalize the extracted data
        const normalizedData = this.normalizeProductData(productData);
        
        console.log('Extracted product data using alternative method:', normalizedData);
        
        // Check if the product was actually identified
        if (!normalizedData.product || normalizedData.product === 'Unknown product') {
          return {
            success: false,
            error: this.errorHandling.noProductFound,
            suggestion: this.errorHandling.suggestion.generic,
            code: 'NO_PRODUCT_DETECTED',
            partialData: normalizedData
          };
        }
        
        // Automatically trigger a search with the identified keywords
        // Only if autoSearch option is enabled (default: true)
        let searchResults = null;
        if (options.autoSearch !== false) {
          searchResults = await this.triggerProductSearch(normalizedData);
        }
        
        return {
          success: true,
          productData: normalizedData,
          rawResponse: responseText,
          searchResults: searchResults
        };
      }
    } catch (error) {
      console.error('Error identifying product from image:', error);
      
      // Enhanced visual feedback on errors with error codes
      if (error.message && error.message.toLowerCase().includes('blur')) {
        return {
          success: false,
          error: this.errorHandling.blurredImage,
          suggestion: this.errorHandling.suggestion.blurredImage,
          code: 'BLURRED_IMAGE'
        };
      } else if (error.message && error.message.toLowerCase().includes('resolution')) {
        return {
          success: false,
          error: this.errorHandling.lowResolution,
          suggestion: this.errorHandling.suggestion.lowResolution,
          code: 'LOW_RESOLUTION'
        };
      } else if (error.message && error.message.toLowerCase().includes('angle')) {
        return {
          success: false,
          error: 'Poor image angle for product identification',
          suggestion: this.errorHandling.suggestion.badAngle,
          code: 'BAD_ANGLE'
        };
      } else if (error.message && error.message.toLowerCase().includes('partial')) {
        return {
          success: false,
          error: 'Only partial product visible in image',
          suggestion: this.errorHandling.suggestion.partial,
          code: 'PARTIAL_PRODUCT'
        };
      } else if (error.message && error.message.includes('API key')) {
        return {
          success: false,
          error: 'API key configuration issue. Please check your Groq API key.',
          suggestion: 'Contact support to verify your API configuration.',
          code: 'API_KEY_ERROR'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred during product identification',
        suggestion: this.errorHandling.suggestion.generic,
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Normalize product data to a standard structure
   * @param {Object} productData - Raw product data
   * @returns {Object} - Normalized product data
   */
  normalizeProductData(productData) {
    // Ensure we have at least the basic fields
    const normalized = {
      product: productData.product || productData.name || productData.title || 'Unknown product',
      brand: productData.brand || productData.manufacturer || '',
      category: productData.category || productData.productCategory || productData.type || '',
      features: productData.features || productData.keyFeatures || [],
      description: productData.description || '',
      keywords: []
    };
    
    // Process keywords - could be string or array
    if (typeof productData.keywords === 'string') {
      normalized.keywords = productData.keywords.split(/,|;/).map(k => k.trim());
    } else if (Array.isArray(productData.keywords)) {
      normalized.keywords = productData.keywords;
    } else {
      // Generate keywords from product name and category if not provided
      const keywords = [];
      if (normalized.product) keywords.push(normalized.product);
      if (normalized.brand) keywords.push(normalized.brand);
      if (normalized.category) keywords.push(normalized.category);
      
      normalized.keywords = keywords;
    }
    
    // Ensure keywords are unique and non-empty
    normalized.keywords = [...new Set(normalized.keywords.filter(k => k))];
    
    // Generate search string
    normalized.searchString = [
      normalized.product,
      normalized.brand,
      ...normalized.keywords.slice(0, 3)
    ].filter(Boolean).join(' ');
    
    return normalized;
  }
  
  /**
   * Trigger a product search based on identified keywords
   * @param {Object} productData - Normalized product data
   * @returns {Promise<Object>} - Search results
   */
  async triggerProductSearch(productData) {
    try {
      // Use the search string from normalized product data
      const searchQuery = productData.searchString || 
                         productData.keywords?.join(' ') || 
                         productData.product;
      
      console.log(`Triggering product search for: "${searchQuery}"`);
      
      // Log search details in debug mode
      if (this.debugMode) {
        const debugInfo = {
          timestamp: new Date().toISOString(),
          productData,
          searchQuery
        };
        
        fs.writeFileSync(
          path.join(this.debugDir, `search_trigger_${Date.now()}.json`),
          JSON.stringify(debugInfo, null, 2)
        );
      }
      
      // Check if scraperService is available
      if (scraperService) {
        try {
          console.log('Using scraper service for product search');
          
          // Use the searchProducts method from scraperService
          const searchResults = await scraperService.searchProducts(searchQuery);
          
          // Log search results in debug mode
          if (this.debugMode) {
            fs.writeFileSync(
              path.join(this.debugDir, `search_results_${Date.now()}.json`),
              JSON.stringify({
                query: searchQuery,
                resultsCount: searchResults.products?.length || 0,
                success: searchResults.success
              }, null, 2)
            );
          }
          
          return {
            success: true,
            searchQuery,
            searchResults
          };
        } catch (scraperError) {
          console.error('Error using scraper service:', scraperError);
          
          // Return partial success with error info
          return {
            success: false,
            searchQuery,
            error: scraperError.message,
            pending: true
          };
        }
      } else {
        console.log('Scraper service not available, returning search query only');
        
        // Return pending status when scraper service is not available
        return {
          success: true,
          searchQuery,
          pending: true
        };
      }
    } catch (error) {
      console.error('Error triggering product search:', error);
      
      return {
        success: false,
        error: error.message,
        suggestion: 'Try searching with more specific keywords'
      };
    }
  }
  
  /**
   * Process multiple images of the same product for better accuracy
   * @param {Array<string>} imagePaths - Array of paths to images
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Consolidated product identification
   */
  async processMultipleImages(imagePaths, options = {}) {
    if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
      return {
        success: false,
        error: 'No valid images provided',
        suggestion: 'Please provide at least one product image',
        code: 'NO_IMAGES'
      };
    }
    
    // Limit the number of images to process
    const maxImages = options.maxImages || 3;
    const imagesToProcess = imagePaths.slice(0, maxImages);
    
    if (this.debugMode) {
      console.log(`Processing ${imagesToProcess.length} images out of ${imagePaths.length} provided`);
    }
    
    // Process each image in parallel for faster results
    const imagePromises = imagesToProcess.map(imagePath => {
      if (fs.existsSync(imagePath)) {
        // Disable auto search for individual images to avoid multiple searches
        return this.identifyProductFromImage(imagePath, { autoSearch: false })
          .then(result => {
            if (result.success) {
              return {
                path: imagePath,
                data: result.productData,
                hash: this.getImageHash(imagePath)
              };
            }
            return null;
          })
          .catch(error => {
            console.error(`Error processing image ${imagePath}:`, error);
            return null;
          });
      }
      return Promise.resolve(null);
    });
    
    // Wait for all image processing to complete
    const imageResults = await Promise.all(imagePromises);
    
    // Filter out null results
    const validResults = imageResults.filter(result => result !== null);
    
    if (validResults.length === 0) {
      return {
        success: false,
        error: 'Could not identify the product from any of the provided images',
        suggestion: this.errorHandling.suggestion.generic,
        code: 'NO_PRODUCT_DETECTED'
      };
    }
    
    // Consolidate results from multiple images
    const consolidated = this.consolidateMultiImageResults(validResults);
    
    // Log consolidated results in debug mode
    if (this.debugMode) {
      fs.writeFileSync(
        path.join(this.debugDir, `multi_image_results_${Date.now()}.json`),
        JSON.stringify({
          imageCount: validResults.length,
          totalImages: imagePaths.length,
          imageHashes: validResults.map(r => r.hash),
          consolidated
        }, null, 2)
      );
    }
    
    // Trigger a search with the consolidated data
    let searchResults = null;
    if (options.autoSearch !== false) {
      searchResults = await this.triggerProductSearch(consolidated);
    }
    
    return {
      success: true,
      productData: consolidated,
      imageCount: validResults.length,
      totalImages: imagePaths.length,
      searchResults,
      confidence: validResults.length / Math.min(imagePaths.length, maxImages)
    };
  }
  
  /**
   * Consolidate results from multiple images of the same product
   * @param {Array<Object>} results - Results from multiple images
   * @returns {Object} - Consolidated product data
   */
  consolidateMultiImageResults(results) {
    // Start with the first result as base
    const consolidated = { ...results[0].data };
    
    // Keep track of all keywords and features
    const allKeywords = new Set([...consolidated.keywords]);
    const allFeatures = new Set([...consolidated.features]);
    
    // Consolidate data from other results
    for (let i = 1; i < results.length; i++) {
      const data = results[i].data;
      
      // Add new keywords
      data.keywords.forEach(keyword => allKeywords.add(keyword));
      
      // Add new features
      data.features.forEach(feature => allFeatures.add(feature));
      
      // Keep the longest description
      if (data.description && data.description.length > consolidated.description.length) {
        consolidated.description = data.description;
      }
    }
    
    // Update consolidated data
    consolidated.keywords = [...allKeywords];
    consolidated.features = [...allFeatures];
    
    // Regenerate search string
    consolidated.searchString = [
      consolidated.product,
      consolidated.brand,
      ...consolidated.keywords.slice(0, 5)
    ].filter(Boolean).join(' ');
    
    return consolidated;
  }
  
  /**
   * Enhance web scraping with AI analysis using external prompts
   * @param {string} query - Search query
   * @param {string} html - HTML content
   * @returns {Promise<Object>} - Enhanced data
   */
  async enhanceWebScraping(query, html) {
    try {
      console.log(`Enhancing web scraping for query: "${query}"`);
      
      // Extract relevant content to reduce token usage
      const relevantContent = this.extractRelevantContent(html, query);
      
      // Use prompt template and replace the query
      const prompt = this.userPrompts.webScraping.replace('{{QUERY}}', query);
      
      // Call the Groq API
      const response = await this.callGroqAPI([
        { role: 'system', content: this.systemPrompts.webScraping },
        { role: 'user', content: prompt + '\n\nHTML Content:\n' + relevantContent }
      ], {
        temperature: 0.2,
        max_tokens: 2048
      });
      
      // Extract the enhanced data
      const enhancedData = response.choices[0].message.content;
      
      // Try to parse as JSON
      let parsedData;
      try {
        parsedData = JSON.parse(enhancedData);
      } catch (e) {
        console.warn('Response was not valid JSON:', e);
      }
      
      return {
        success: true,
        enhancedData: parsedData || enhancedData,
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
   * Generate a comprehensive product summary from consolidated data
   * @param {Object} consolidatedData - Consolidated product data
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
      
      // Use the template and replace the product data placeholder
      const userPrompt = this.userPrompts.productSummary.replace(
        '{{PRODUCT_DATA}}', 
        JSON.stringify(simplifiedData, null, 2)
      );
      
      const messages = [
        {
          role: 'system',
          content: this.systemPrompts.productSummary
        },
        {
          role: 'user',
          content: userPrompt
        }
      ];
      
      const response = await this.callGroqAPI(messages, {
        temperature: 0.5,
        max_tokens: 2048
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
  
  /**
   * Extract relevant content from HTML to reduce token usage
   * @param {string} html - HTML content
   * @param {string} query - Search query
   * @returns {string} - Extracted relevant content
   */
  extractRelevantContent(html, query) {
    try {
      if (!html) return '';
      
      const $ = cheerio.load(html);
      
      // Remove unnecessary elements
      $('script, style, iframe, noscript, svg, path, footer, nav, header, aside').remove();
      
      // Extract product elements based on common selectors
      const productSelectors = [
        '.product', '.item', '.product-item', '.product-card', '.product-container',
        '[data-product]', '[data-item]', '[data-sku]', '[data-pid]',
        '.card', '.listing', '.result', '.search-result'
      ];
      
      let relevantContent = '';
      
      // Try to find product elements
      for (const selector of productSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          elements.each((i, el) => {
            relevantContent += $(el).text() + '\n';
          });
          
          // If we found enough content, stop looking
          if (relevantContent.length > 1000) break;
        }
      }
      
      // If no product elements found, extract main content
      if (relevantContent.length < 100) {
        relevantContent = $('main, #main, #content, .content, .main-content').text();
      }
      
      // If still no content, extract body
      if (relevantContent.length < 100) {
        relevantContent = $('body').text();
      }
      
      // Clean up the text
      relevantContent = relevantContent
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
      
      // Limit the content length to reduce token usage
      const maxLength = 4000;
      if (relevantContent.length > maxLength) {
        relevantContent = relevantContent.substring(0, maxLength) + '...';
      }
      
      return relevantContent;
    } catch (error) {
      console.error('Error extracting relevant content:', error);
      return html.substring(0, 4000); // Return truncated HTML as fallback
    }
  }
  
  /**
   * Log debug information
   * @param {string} type - Type of debug info
   * @param {Object} data - Debug data
   */
  logDebug(type, data) {
    if (!this.debugMode) return;
    
    try {
      const timestamp = Date.now();
      const filename = path.join(this.debugDir, `${type}_${timestamp}.json`);
      
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error logging debug info for ${type}:`, error);
    }
  }
  
  /**
   * Enhance product data with AI-generated details
   * @param {Object} productData - Basic product data
   * @returns {Promise<Object>} - Enhanced product data
   */
  async enhanceProductData(productData) {
    try {
      if (!productData || !productData.product) {
        return {
          success: false,
          error: 'Invalid product data provided',
          code: 'INVALID_PRODUCT_DATA'
        };
      }
      
      // Log the enhancement request
      this.logDebug('enhance_request', { productData });
      
      // Use the template and replace the product data placeholder
      const userPrompt = this.userPrompts.productEnhancement.replace(
        '{{PRODUCT_DATA}}', 
        JSON.stringify(productData, null, 2)
      );
      
      const messages = [
        {
          role: 'system',
          content: this.systemPrompts.productEnhancement
        },
        {
          role: 'user',
          content: userPrompt
        }
      ];
      
      const response = await this.callGroqAPI(messages, {
        temperature: 0.4,
        max_tokens: 2048
      });
      
      const enhancedContent = response.choices[0].message.content;
      
      // Try to parse the JSON from the response
      try {
        // First try to extract a JSON object if it's wrapped in markdown code blocks
        const jsonMatch = enhancedContent.match(/```(?:json)?\n([\s\S]*?)\n```/) || 
                         enhancedContent.match(/{[\s\S]*?}/);
                         
        let enhancedData;
        if (jsonMatch) {
          enhancedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          // If no JSON found, try parsing the whole response text
          enhancedData = JSON.parse(enhancedContent);
        }
        
        // Merge the enhanced data with the original data
        const mergedData = {
          ...productData,
          ...enhancedData,
          // Ensure we keep the original product name if the enhanced one is empty
          product: enhancedData.product || productData.product,
          // Merge keywords from both sources
          keywords: [...new Set([
            ...(Array.isArray(productData.keywords) ? productData.keywords : []),
            ...(Array.isArray(enhancedData.keywords) ? enhancedData.keywords : [])
          ])],
          // Merge features from both sources
          features: [...new Set([
            ...(Array.isArray(productData.features) ? productData.features : []),
            ...(Array.isArray(enhancedData.features) ? enhancedData.features : [])
          ])],
          // Add enhancement metadata
          enhanced: true,
          enhancedAt: new Date().toISOString()
        };
        
        // Regenerate search string with enhanced data
        mergedData.searchString = [
          mergedData.product,
          mergedData.brand,
          ...(mergedData.searchTerms || []),
          ...(mergedData.keywords.slice(0, 5) || [])
        ].filter(Boolean).join(' ');
        
        // Log the enhancement result
        this.logDebug('enhance_result', { 
          original: productData,
          enhanced: enhancedData,
          merged: mergedData
        });
        
        return {
          success: true,
          productData: mergedData,
          rawResponse: enhancedContent
        };
      } catch (parseError) {
        console.error('Error parsing enhanced product data:', parseError);
        
        return {
          success: false,
          error: 'Failed to parse enhanced product data',
          rawResponse: enhancedContent,
          code: 'PARSE_ERROR'
        };
      }
    } catch (error) {
      console.error('Error enhancing product data:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred during product enhancement',
        code: 'ENHANCEMENT_ERROR'
      };
    }
  }
}

// Create and export a singleton instance
const groqService = new GroqService();
module.exports = groqService;