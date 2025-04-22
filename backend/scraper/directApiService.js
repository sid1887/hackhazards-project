/**
 * Direct API Service
 * Implements direct retailer API integrations for faster and more reliable data retrieval
 */

const axios = require('axios');
const crypto = require('crypto');
const cheerio = require('cheerio');
const UserAgent = require('user-agents');
const { gotScraping } = require('got-scraping');
const fs = require('fs');
const path = require('path');
const pLimit = require('p-limit').default; // Fix: Use CommonJS default export
const NodeCache = require('node-cache');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const playwright = require('playwright');

// Debug mode flag
const DEBUG_MODE = process.env.DEBUG_SCRAPING === 'true';
const DEBUG_DIR = path.join(__dirname, '../../debug');

// Cache settings
const CACHE_TTL = 300; // 5 minutes cache expiry
const MAX_CACHE_ITEMS = 1000;

// Concurrency settings
const MAX_CONCURRENT_REQUESTS = 3;

// Ensure debug directory exists
if (DEBUG_MODE && !fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

/**
 * DirectApiService class for accessing retailer APIs and JSON endpoints
 * Uses various strategies:
 * 1. Direct API calls to retailer APIs
 * 2. Network payload interception for harvesting JSON endpoints
 * 3. GraphQL/REST API reverse engineering
 * 4. Stealth browser with network sniffing
 */
class DirectApiService {
  constructor() {
    // Initialize proxy rotation system
    this.proxyList = [
      // Add your proxy list here
      { url: process.env.PROXY_1_URL, type: 'https' },
      { url: process.env.PROXY_2_URL, type: 'socks5' },
      { url: process.env.PROXY_3_URL, type: 'https' },
      { url: process.env.PROXY_4_URL, type: 'socks5' },
      { url: process.env.PROXY_5_URL, type: 'https' },
    ].filter(proxy => proxy.url);
    
    this.currentProxyIndex = 0;
    
    // Initialize response cache with TTL
    this.responseCache = new NodeCache({
      stdTTL: CACHE_TTL,
      maxKeys: MAX_CACHE_ITEMS,
      checkperiod: 60 // Check for expired keys every minute
    });
    
    // Promise concurrency limiter - make sure to call pLimit as a function 
    // Fix: Create a limiter by calling pLimit as a function
    const limiter = pLimit(MAX_CONCURRENT_REQUESTS);
    this.requestLimiter = limiter;
    
    // Headless browser instances
    this.browsers = {
      chromium: null,
      firefox: null
    };
    
    // Configuration for retailer APIs
    this.apiConfig = {
      amazon: {
        name: 'Amazon',
        endpoints: {
          search: 'https://www.amazon.in/s/query',
          graphql: 'https://www.amazon.in/api/graphql',
          completions: 'https://completion.amazon.in/api/2017/suggestions'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.amazon.in/'
        },
        responseParser: '_parseAmazonApiResponse'
      },
      flipkart: {
        name: 'Flipkart',
        endpoints: {
          search: 'https://www.flipkart.com/search/autosuggest',
          graphql: 'https://www.flipkart.com/api/4/page/fetch',
          payload: 'https://www.flipkart.com/_api/product-service/search'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.flipkart.com/'
        },
        responseParser: '_parseFlipkartApiResponse'
      },
      croma: {
        name: 'Croma',
        endpoints: {
          search: 'https://api.croma.com/searchservices/v1/search',
          product: 'https://api.croma.com/productservices/v1/product'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.croma.com/'
        },
        responseParser: '_parseCromaApiResponse'
      },
      meesho: {
        name: 'Meesho',
        endpoints: {
          search: 'https://www.meesho.com/api/v1/search',
          graphql: 'https://www.meesho.com/api/v1/graphql'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.meesho.com/'
        },
        responseParser: '_parseMeeshoApiResponse'
      },
      relianceDigital: {
        name: 'Reliance Digital',
        endpoints: {
          search: 'https://www.reliancedigital.in/search/v1/search',
          autocomplete: 'https://www.reliancedigital.in/search/v1/suggestions'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.reliancedigital.in/'
        },
        responseParser: '_parseRelianceDigitalApiResponse'
      }
    };

    // Initialize axios interceptors for debugging
    if (DEBUG_MODE) {
      this._setupDebugInterceptors();
    }
    
    // Initialize browsers
    this._initializeBrowsers();
  }

  /**
   * Initialize playwright browser instances
   * @private
   */
  async _initializeBrowsers() {
    try {
      this.browsers.chromium = await playwright.chromium.launch({
        headless: true,
        args: [
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-notifications',
          '--disable-extensions',
        ]
      });
      
      console.log('Chromium browser initialized for stealth operations');
      
    } catch (error) {
      console.error('Error initializing browsers:', error.message);
    }
  }
  
  /**
   * Close browser instances on process exit
   */
  async closeBrowsers() {
    try {
      if (this.browsers.chromium) await this.browsers.chromium.close();
      if (this.browsers.firefox) await this.browsers.firefox.close();
      console.log('Browser instances closed');
    } catch (error) {
      console.error('Error closing browsers:', error.message);
    }
  }

  /**
   * Get next proxy from rotation
   * @returns {Object|null} Proxy configuration or null if none available
   * @private
   */
  _getNextProxy() {
    if (this.proxyList.length === 0) return null;
    
    const proxy = this.proxyList[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
    
    return proxy;
  }
  
  /**
   * Create proxy agent based on proxy type
   * @param {Object} proxy - Proxy configuration
   * @returns {Object|null} Proxy agent
   * @private
   */
  _createProxyAgent(proxy) {
    if (!proxy || !proxy.url) return null;
    
    try {
      if (proxy.type === 'socks5') {
        return new SocksProxyAgent(proxy.url);
      } else {
        return new HttpsProxyAgent(proxy.url);
      }
    } catch (error) {
      console.error('Error creating proxy agent:', error.message);
      return null;
    }
  }

  /**
   * Setup axios interceptors for debugging API calls
   * @private
   */
  _setupDebugInterceptors() {
    axios.interceptors.request.use(request => {
      console.log('API Request:', {
        method: request.method,
        url: request.url,
        headers: request.headers,
        data: request.data
      });
      return request;
    });

    axios.interceptors.response.use(
      response => {
        console.log('API Response Status:', response.status);
        // Don't log the full response as it could be large
        return response;
      },
      error => {
        console.error('API Error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate a UUID for tracking requests
   * @returns {string} UUID
   * @private
   */
  _generateRequestId() {
    return crypto.randomUUID();
  }
  
  /**
   * Parse response data using the appropriate parser method
   * @param {string} retailerKey - Retailer key
   * @param {Object} data - Response data to parse
   * @returns {Promise<Array>} - Parsed products
   * @private
   */
  async _parseResponseData(retailerKey, data) {
    try {
      const retailer = this.apiConfig[retailerKey];
      if (!retailer || !retailer.responseParser) {
        return [];
      }
      
      // Get the parser method name
      const parserMethodName = retailer.responseParser;
      
      // Check if the method exists
      if (typeof this[parserMethodName] === 'function') {
        return await this[parserMethodName](data);
      }
      
      console.warn(`Parser method ${parserMethodName} not found for ${retailerKey}`);
      return [];
    } catch (error) {
      console.error(`Error parsing response for ${retailerKey}:`, error.message);
      return [];
    }
  }

  /**
   * Get a random user agent
   * @returns {string} User agent string
   * @private
   */
  _getRandomUserAgent() {
    return new UserAgent({ deviceCategory: 'desktop' }).toString();
  }

  /**
   * Save debug data to a file
   * @param {string} retailer - Retailer name
   * @param {string} type - Type of data (request/response)
   * @param {Object} data - Data to save
   * @private
   */
  _saveDebugData(retailer, type, data) {
    if (!DEBUG_MODE) return;

    const timestamp = Date.now();
    const filename = path.join(DEBUG_DIR, `${retailer}-${type}-${timestamp}.json`);
    
    try {
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving debug data for ${retailer}:`, error);
    }
  }

  /**
   * Enhanced request with automatic proxy rotation and retry for blocked requests
   * @param {string} url - URL to request
   * @param {Object} options - Request options
   * @param {number} retries - Number of retries (defaults to 3)
   * @returns {Promise<Object>} - Response object
   * @private
   */
  async _enhancedRequest(url, options = {}, retries = 3) {
    let lastError = null;
    let attempts = 0;
    
    while (attempts < retries) {
      try {
        attempts++;
        
        // Add some randomization for delays between attempts
        if (attempts > 1) {
          const delay = Math.floor(Math.random() * 1000) + (attempts * 500); // Increasing backoff
          console.log(`Retry attempt ${attempts} after ${delay}ms delay`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Get a fresh proxy for each retry
        if (attempts > 1 || Math.random() > 0.7) { // 30% chance of using proxy on first attempt
          const proxy = this._getNextProxy();
          if (proxy) {
            console.log(`Using ${proxy.type} proxy for request`);
            options.agent = this._createProxyAgent(proxy);
          }
        }

        // Add random user agent if not specified
        if (!options.headers?.['User-Agent']) {
          options.headers = {
            ...options.headers,
            'User-Agent': this._getRandomUserAgent()
          };
        }
        
        // Add additional randomized headers to appear more browser-like
        const randomizedHeaders = {
          'Accept-Language': Math.random() > 0.5 ? 'en-US,en;q=0.9' : 'en-IN,en;q=0.9,hi;q=0.8',
          'Cache-Control': Math.random() > 0.5 ? 'no-cache' : 'max-age=0',
          'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-User': '?1',
          'Connection': Math.random() > 0.3 ? 'keep-alive' : 'close'
        };
        
        options.headers = {
          ...randomizedHeaders,
          ...options.headers
        };

        // Make request with gotScraping
        const response = await gotScraping(url, options);
        
        // Check for typical blocking responses even if status is 200
        const body = response.body;
        if (typeof body === 'string') {
          if (body.includes('captcha') || 
              body.includes('Access Denied') || 
              body.includes('automated access') ||
              body.includes('security check') ||
              body.includes('bot detection')) {
            throw new Error('Detected anti-bot protection in response body');
          }
        }
        
        return response;
      } catch (error) {
        lastError = error;
        console.warn(`Request attempt ${attempts} failed: ${error.message}`);
        
        // If we get specific server errors or blocking responses, adjust retry strategy
        if (error.message.includes('403') || 
            error.message.includes('Access Denied') || 
            error.message.includes('captcha') ||
            error.message.includes('rate limit') ||
            error.message.includes('security check')) {
          console.log('Anti-bot protection detected, using enhanced evasion strategy on next attempt');
          
          // Enhance our evasion for the next attempt
          options.headers = {
            ...options.headers,
            'User-Agent': this._getMobileUserAgent(),
            'X-Requested-With': 'XMLHttpRequest',
            'Sec-Fetch-Site': 'same-origin'
          };
          
          // Add longer delay for rate limiting
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }
    
    // All attempts failed
    throw lastError || new Error(`All ${retries} request attempts failed`);
  }
  
  /**
   * Get a randomized mobile user agent
   * @returns {string} Mobile user agent string
   * @private
   */
  _getMobileUserAgent() {
    const mobileUserAgents = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      'Mozilla/5.0 (Linux; Android 10; SAMSUNG SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/13.2 Chrome/83.0.4103.106 Mobile Safari/537.36'
    ];
    
    return mobileUserAgents[Math.floor(Math.random() * mobileUserAgents.length)];
  }

  /**
   * Search products using direct API integration with tiered strategy
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Search results
   */
  async searchProducts(query) {
    console.log(`Searching products via direct API for query "${query}"`);
    
    // Check cache first
    const cacheKey = `search:${query}`;
    const cachedResults = this.responseCache.get(cacheKey);
    
    if (cachedResults) {
      console.log(`Cache hit for query "${query}", returning cached results`);
      return {
        ...cachedResults,
        source: 'cache',
        cached: true
      };
    }
    
    // Track performance
    const startTime = Date.now();
    
    // Get list of retailers
    const retailers = Object.keys(this.apiConfig);
    
    // Process retailers in parallel with concurrency limit
    const retailerPromises = retailers.map(retailer => {
      return this.requestLimiter(async () => {
        try {
          // Add a small random delay for each retailer to avoid patterns
          const delay = Math.floor(Math.random() * 200) + 100;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          console.log(`Trying direct API for ${retailer}...`);
          const products = await this._fetchFromApiEndpoint(retailer, query);
          
          return {
            retailer,
            success: products.length > 0,
            products
          };
        } catch (error) {
          console.error(`Error fetching from ${retailer} API:`, error.message);
          return {
            retailer,
            success: false,
            products: []
          };
        }
      });
    });
    
    // Wait for all requests to complete
    const results = await Promise.allSettled(retailerPromises);
    
    // Process results
    let allProducts = [];
    const scrapedRetailers = [];
    const failedRetailers = [];
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const retailerResult = result.value;
        
        if (retailerResult.success) {
          allProducts = [...allProducts, ...retailerResult.products];
          scrapedRetailers.push(retailerResult.retailer);
          console.log(`Successfully retrieved ${retailerResult.products.length} products from ${retailerResult.retailer} API`);
        } else {
          failedRetailers.push(retailerResult.retailer);
          console.log(`No products found from ${retailerResult.retailer} API`);
        }
      }
    });
    
    const endTime = Date.now();
    console.log(`Direct API search completed in ${(endTime - startTime) / 1000}s`);
    
    // Prepare results
    const searchResults = {
      success: allProducts.length > 0,
      products: allProducts,
      count: allProducts.length,
      query,
      scrapedRetailers,
      failedRetailers,
      executionTime: endTime - startTime
    };
    
    // Cache the results
    if (searchResults.success) {
      this.responseCache.set(cacheKey, searchResults);
    }
    
    return searchResults;
  }

  /**
   * Aggressive search that tries all strategies simultaneously for fastest results
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Search results
   */
  async aggressiveSearch(query) {
    console.log(`Performing aggressive search for query "${query}"`);
    
    // Check cache first
    const cacheKey = `aggressive-search:${query}`;
    const cachedResults = this.responseCache.get(cacheKey);
    
    if (cachedResults) {
      console.log(`Cache hit for aggressive search "${query}", returning cached results`);
      return {
        ...cachedResults,
        source: 'cache',
        cached: true
      };
    }
    
    // Track performance
    const startTime = Date.now();
    
    // First try standard search
    const standardResults = await this.searchProducts(query);
    if (standardResults.success && standardResults.products.length >= 5) {
      console.log(`Standard search found sufficient results (${standardResults.products.length}), returning`);
      return standardResults;
    }
    
    console.log('Standard search insufficient, trying aggressive parallel approach');
    
    try {
      // Get list of retailers and strategies
      const retailers = Object.keys(this.apiConfig);
      const strategies = [
        { name: 'Direct JSON API', fn: this._tryDirectApi.bind(this) },
        { name: 'GraphQL Endpoint', fn: this._tryGraphQlEndpoint.bind(this) },
        { name: 'Harvested Endpoint', fn: this._tryHarvestedEndpoint.bind(this) },
        { name: 'Headless Browser Network Sniffing', fn: this._tryHeadlessBrowserSniffing.bind(this) }
      ];
      
      // Create all possible retailer+strategy combinations
      const searchTasks = [];
      for (const retailer of retailers) {
        for (const strategy of strategies) {
          searchTasks.push({
            retailer,
            strategy: strategy.name,
            execute: async () => {
              try {
                const requestId = this._generateRequestId();
                return {
                  retailer,
                  strategy: strategy.name,
                  products: await strategy.fn(retailer, query, requestId)
                };
              } catch (error) {
                console.error(`Error executing ${strategy.name} for ${retailer}:`, error.message);
                return { retailer, strategy: strategy.name, products: [] };
              }
            }
          });
        }
      }
      
      // Run all tasks with concurrency limit
      console.log(`Launching ${searchTasks.length} parallel search tasks`);
      const parallelPromises = searchTasks.map(task => this.requestLimiter(task.execute));
      const settledResults = await Promise.allSettled(parallelPromises);
      
      // Process results, taking the first successful response for each retailer
      let allProducts = [...(standardResults.products || [])];
      const successfulRetailers = new Set(standardResults.scrapedRetailers || []);
      const failedRetailers = new Set();
      
      // Group results by retailer
      const retailerResults = {};
      settledResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value && result.value.products.length > 0) {
          const { retailer, strategy, products } = result.value;
          
          if (!retailerResults[retailer]) {
            retailerResults[retailer] = [];
          }
          
          retailerResults[retailer].push({
            strategy,
            products,
            count: products.length
          });
          
          successfulRetailers.add(retailer);
        }
      });
      
      // Take the best result for each retailer
      for (const retailer of Object.keys(retailerResults)) {
        // Sort by product count (desc)
        retailerResults[retailer].sort((a, b) => b.count - a.count);
        
        // Add the products from the best result
        if (retailerResults[retailer].length > 0) {
          const bestResult = retailerResults[retailer][0];
          allProducts = [...allProducts, ...bestResult.products];
          console.log(`Selected ${bestResult.count} products from ${retailer} using ${bestResult.strategy}`);
        }
      }
      
      // Mark failed retailers
      for (const retailer of retailers) {
        if (!successfulRetailers.has(retailer)) {
          failedRetailers.add(retailer);
        }
      }
      
      const endTime = Date.now();
      console.log(`Aggressive search completed in ${(endTime - startTime) / 1000}s`);
      
      // Prepare results
      const searchResults = {
        success: allProducts.length > 0,
        products: allProducts,
        count: allProducts.length,
        query,
        scrapedRetailers: Array.from(successfulRetailers),
        failedRetailers: Array.from(failedRetailers),
        executionTime: endTime - startTime,
        aggressive: true
      };
      
      // Cache the results
      if (searchResults.success) {
        this.responseCache.set(cacheKey, searchResults);
      }
      
      return searchResults;
    } catch (error) {
      console.error('Error in aggressive search:', error);
      
      // Fallback to standard results if available
      if (standardResults.success) {
        return standardResults;
      }
      
      // Otherwise return error
      return {
        success: false,
        error: error.message,
        query,
        products: [],
        count: 0,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Fetch products from a retailer API endpoint with tiered strategy
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fetchFromApiEndpoint(retailerKey, query) {
    const retailer = this.apiConfig[retailerKey];
    if (!retailer) {
      throw new Error(`Retailer ${retailerKey} not configured for direct API access`);
    }
    
    // Generate request ID for tracking
    const requestId = this._generateRequestId();
    
    // Try each strategy in tiered approach
    const strategies = [
      // Start with the new fastest non-browser strategy
      { name: 'GotScraping Fast API', fn: this._tryGotScrapingFast.bind(this) },
      // Then the original strategies
      { name: 'Direct JSON API', fn: this._tryDirectApi.bind(this) },
      { name: 'GraphQL Endpoint', fn: this._tryGraphQlEndpoint.bind(this) },
      { name: 'Harvested Endpoint', fn: this._tryHarvestedEndpoint.bind(this) },
      { name: 'Headless Browser Network Sniffing', fn: this._tryHeadlessBrowserSniffing.bind(this) }
    ];
    
    for (const strategy of strategies) {
      try {
        console.log(`Trying ${strategy.name} for ${retailerKey}...`);
        const products = await strategy.fn(retailerKey, query, requestId);
        
        if (products && products.length > 0) {
          console.log(`Strategy ${strategy.name} succeeded for ${retailerKey}, found ${products.length} products`);
          return products;
        }
      } catch (error) {
        console.warn(`Strategy ${strategy.name} failed for ${retailerKey}:`, error.message);
      }
    }
    
    return [];
  }

  /**
   * Try Direct API approach
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _tryDirectApi(retailerKey, query, requestId) {
    console.log(`Trying Direct API approach for ${retailerKey} with query "${query}"`);
    // Implement direct API logic
    try {
      // For now, fall back to the fast fetch methods
      return await this._tryGotScrapingFast(retailerKey, query, requestId);
    } catch (error) {
      console.error(`Direct API approach failed for ${retailerKey}:`, error.message);
      return [];
    }
  }

  /**
   * Try GraphQL Endpoint approach
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _tryGraphQlEndpoint(retailerKey, query, requestId) {
    console.log(`Trying GraphQL Endpoint approach for ${retailerKey} with query "${query}"`);
    
    // Special case for Meesho which already has a good GraphQL implementation
    if (retailerKey === 'meesho') {
      return await this._fastFetchMeeshoGraphQL(query);
    }
    
    // Placeholder for other retailers
    return [];
  }

  /**
   * Try Harvested Endpoint approach
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _tryHarvestedEndpoint(retailerKey, query, requestId) {
    console.log(`Trying Harvested Endpoint approach for ${retailerKey} with query "${query}"`);
    // Placeholder implementation
    return [];
  }

  /**
   * Try Headless Browser Network Sniffing approach
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _tryHeadlessBrowserSniffing(retailerKey, query, requestId) {
    console.log(`Trying Headless Browser Network Sniffing approach for ${retailerKey} with query "${query}"`);
    // Placeholder implementation
    return [];
  }

  /**
   * Parse Amazon API response
   * @param {Object} data - Response data
   * @returns {Array} Parsed products
   * @private
   */
  _parseAmazonApiResponse(data) {
    // Placeholder implementation
    return [];
  }

  /**
   * Parse Flipkart API response
   * @param {Object} data - Response data
   * @returns {Array} Parsed products
   * @private
   */
  _parseFlipkartApiResponse(data) {
    // Placeholder implementation
    return [];
  }

  /**
   * Parse Croma API response
   * @param {Object} data - Response data
   * @returns {Array} Parsed products
   * @private
   */
  _parseCromaApiResponse(data) {
    // Placeholder implementation
    return [];
  }

  /**
   * Parse Meesho API response
   * @param {Object} data - Response data
   * @returns {Array} Parsed products
   * @private
   */
  _parseMeeshoApiResponse(data) {
    // Placeholder implementation
    return [];
  }

  /**
   * Parse Reliance Digital API response
   * @param {Object} data - Response data
   * @returns {Array} Parsed products
   * @private
   */
  _parseRelianceDigitalApiResponse(data) {
    // Placeholder implementation
    return [];
  }

  /**
   * Try fetching products using gotScraping with stealth headers (fastest approach)
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _tryGotScrapingFast(retailerKey, query, requestId) {
    const retailer = this.apiConfig[retailerKey];
    if (!retailer) return [];
    
    console.log(`Attempting gotScraping fast fetch for ${retailerKey} with query "${query}"`);
    
    try {
      // Use retailer-specific optimized approach
      switch (retailerKey) {
        case 'flipkart':
          return await this._fastFetchFlipkart(query);
        case 'meesho':
          return await this._fastFetchMeeshoGraphQL(query);
        case 'relianceDigital':
          return await this._fastFetchRelianceDigital(query);
        case 'croma':
          return await this._fastFetchCroma(query);
        case 'amazon':
          return await this._fastFetchAmazon(query);
        default:
          return [];
      }
    } catch (error) {
      console.error(`GotScraping fast fetch failed for ${retailerKey}:`, error.message);
      return [];
    }
  }

  /**
   * Fast fetch for Flipkart using direct product search API
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fastFetchFlipkart(query) {
    console.log(`Executing optimized Flipkart product search API fetch for "${query}"`);
    
    try {
      // From the logs, we can see GraphQL API is giving bifrost errors at status 533
      // Try direct product search API instead
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.flipkart.com/_api/product-service/search?query=${encodedQuery}&page=1`;
      
      // Enhanced headers that match browser behavior
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
      const headers = {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'en-IN,en;q=0.9',
        'Origin': 'https://www.flipkart.com',
        'Referer': `https://www.flipkart.com/search?q=${encodedQuery}`,
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'X-User-ID': '',
        'X-Source': 'searchPage'
      };

      console.log('Flipkart product API request:', {url, headers});
      
      // Make request with gotScraping
      const response = await gotScraping.get(url, {
        headers: headers,
        responseType: 'json',
        timeout: 10000
      });

      // Debug response status and headers
      console.log('Flipkart product API response status:', response.statusCode);
      
      // Log a sample of the response data
      const responseData = response.body;
      console.log('Flipkart product API response sample:', 
        typeof responseData, 
        JSON.stringify(responseData).substring(0, 200) + '...');

      // Save full response for debugging if enabled
      if (DEBUG_MODE) {
        this._saveDebugData('flipkart', 'product-api-response', responseData);
      }

      // Extract products from response
      let products = [];
      if (responseData && responseData.data && responseData.data.products) {
        products = responseData.data.products.map(product => {
          return {
            id: product.productId || product.id,
            name: product.title || product.name,
            url: `https://www.flipkart.com${product.url || `/p/${product.productId}`}`,
            image: product.imageUrl || product.image,
            price: product.price?.current || product.sellingPrice || 0,
            originalPrice: product.price?.original || product.mrp || product.price?.current || 0,
            discountPercentage: product.discountPercentage || 0,
            rating: product.rating?.average || 0,
            ratingCount: product.rating?.count || 0,
            source: 'flipkart',
            available: true,
            fetch_strategy: 'product_search_api'
          };
        }).filter(p => p.id && p.name); // Filter out incomplete products
      }

      console.log(`Successfully retrieved ${products.length} products from Flipkart Product Search API`);
      
      // If direct API fails (returns empty), try the mobile API
      if (products.length === 0) {
        console.log('Flipkart Product Search API returned no products, trying mobile API endpoint');
        return await this._fallbackFlipkartMobileApi(query);
      }
      
      return products;
      
    } catch (error) {
      console.error(`Error in Flipkart Product Search API fetch:`, error.message);
      console.log('Attempting Flipkart mobile API fallback');
      return await this._fallbackFlipkartMobileApi(query);
    }
  }

  /**
   * Fallback to Flipkart Mobile API
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fallbackFlipkartMobileApi(query) {
    console.log(`Executing Flipkart mobile API fallback for "${query}"`);
    
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.flipkart.com/mobile-api/1/search?q=${encodedQuery}&page=1`;
      
      // Use mobile user agent
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 FKUA/website/42/website/Mobile';
      const headers = {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.flipkart.com',
        'Referer': `https://www.flipkart.com/search?q=${encodedQuery}`,
        'X-User-Agent': userAgent,
        'X-Device-Type': 'mobile'
      };
      
      console.log('Flipkart mobile API request:', {url, headers});
      
      // Make request with gotScraping
      const response = await gotScraping.get(url, {
        headers: headers,
        responseType: 'json',
        timeout: 8000
      });
      
      // Log response status
      console.log('Flipkart mobile API response status:', response.statusCode);
      
      // Log a sample of the response data
      const responseData = response.body;
      console.log('Flipkart mobile API response sample:', 
        typeof responseData, 
        JSON.stringify(responseData).substring(0, 200) + '...');
      
      // Save for debugging
      if (DEBUG_MODE) {
        this._saveDebugData('flipkart', 'mobile-api-response', responseData);
      }
      
      // Process response
      let products = [];
      if (responseData && responseData.results && Array.isArray(responseData.results)) {
        products = responseData.results
          .filter(result => result.type === 'PRODUCT')
          .map(result => {
            const product = result.data;
            return {
              id: product.id,
              name: product.title,
              url: `https://www.flipkart.com${product.url || `/p/${product.id}`}`,
              image: product.image,
              price: product.price?.value || 0,
              originalPrice: product.originalPrice?.value || product.price?.value || 0,
              discountPercentage: product.discount || 0,
              rating: product.rating?.value || 0,
              ratingCount: product.rating?.count || 0,
              source: 'flipkart',
              available: true,
              fetch_strategy: 'mobile_api'
            };
          });
      }
      
      console.log(`Successfully retrieved ${products.length} products from Flipkart Mobile API`);
      
      // If mobile API fails, fall back to HTML scraping
      if (products.length === 0) {
        console.log('Flipkart Mobile API returned no products, falling back to HTML scraping');
        return await this._fallbackFlipkartHtmlScrape(query);
      }
      
      return products;
    } catch (error) {
      console.error(`Error in Flipkart mobile API fallback:`, error.message);
      console.log('Attempting fallback to HTML scraping as last resort');
      return await this._fallbackFlipkartHtmlScrape(query);
    }
  }

  /**
   * Fallback method for Flipkart to scrape HTML when APIs fail
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private 
   */
  async _fallbackFlipkartHtmlScrape(query) {
    console.log(`Executing Flipkart HTML scrape fallback for "${query}"`);
    
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.flipkart.com/search?q=${encodedQuery}`;
      
      // Prepare headers with enhanced stealth
      const userAgent = this._getRandomUserAgent();
      const headers = {
        'User-Agent': userAgent,
        'Referer': 'https://www.flipkart.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'DNT': '1'
      };

      // Make request with gotScraping to avoid detection
      const response = await gotScraping.get(url, {
        headers: headers,
        responseType: 'text'
      });
      
      // Save HTML for debugging if enabled
      if (DEBUG_MODE) {
        const timestamp = Date.now();
        fs.writeFileSync(path.join(DEBUG_DIR, `flipkart-${timestamp}.html`), response.body);
      }

      // Use cheerio to parse HTML response
      const $ = cheerio.load(response.body);
      const products = [];
      
      // Flipkart product grid selector - modern pattern
      $('._1AtVbE').each((i, element) => {
        try {
          const card = $(element);
          
          // Skip if not a product card
          if (!card.find('._4rR01T').length && !card.find('.s1Q9rs').length) {
            return;
          }
          
          // Title is in different places depending on layout
          let name = card.find('._4rR01T').first().text().trim();
          if (!name) {
            name = card.find('.s1Q9rs').first().text().trim();
          }
          if (!name) {
            name = card.find('.IRpwTa').first().text().trim();
          }
          
          // Product link extraction
          let url = card.find('._1fQZEK').attr('href') || 
                   card.find('._2rpwqI').attr('href') || 
                   card.find('.s1Q9rs').attr('href');
                  
          if (!name || !url) return;
          
          const fullUrl = url.startsWith('http') ? url : `https://www.flipkart.com${url}`;
          
          // Extract ID from URL
          let id = '';
          const idMatch = url.match(/pid=([^&]+)/);
          if (idMatch && idMatch[1]) {
            id = idMatch[1];
          } else {
            // Alternative: try to get from URL path
            const pathMatch = url.match(/\/p\/([^?/]+)/);
            if (pathMatch && pathMatch[1]) {
              id = pathMatch[1];
            }
          }
          
          // Price extraction
          let price = 0;
          const priceElement = card.find('._30jeq3');
          if (priceElement.length) {
            const priceText = priceElement.first().text().trim().replace(/[₹,]/g, '');
            price = parseFloat(priceText) || 0;
          }
          
          // Original price
          let originalPrice = price;
          const originalPriceElement = card.find('._3I9_wc');
          if (originalPriceElement.length) {
            const originalPriceText = originalPriceElement.first().text().trim().replace(/[₹,]/g, '');
            originalPrice = parseFloat(originalPriceText) || price;
          }
          
          // Discount
          let discountPercentage = 0;
          const discountElement = card.find('._3Ay6Sb');
          if (discountElement.length) {
            const discountText = discountElement.first().text().trim();
            const discountMatch = discountText.match(/(\d+)%/);
            if (discountMatch && discountMatch[1]) {
              discountPercentage = parseInt(discountMatch[1], 10);
            }
          }
          
          // Image
          const image = card.find('img').attr('src') || '';
          
          // Ratings
          let rating = 0;
          const ratingElement = card.find('._3LWZlK');
          if (ratingElement.length) {
            rating = parseFloat(ratingElement.first().text().trim()) || 0;
          }
          
          // Rating count (often not available in search results)
          let ratingCount = 0;
          const ratingCountElement = card.find('._2_R_DZ');
          if (ratingCountElement.length) {
            const ratingCountText = ratingCountElement.first().text().trim();
            const ratingCountMatch = ratingCountText.match(/(\d+[\d,]*)/);
            if (ratingCountMatch && ratingCountMatch[1]) {
              ratingCount = parseInt(ratingCountMatch[1].replace(/,/g, ''), 10) || 0;
            }
          }
          
          if (name) {
            products.push({
              id: id || `flipkart-${i}`,  // Use index as fallback ID
              name,
              url: fullUrl,
              image,
              price,
              originalPrice,
              discountPercentage,
              rating,
              ratingCount,
              source: 'flipkart',
              available: true,
              fetch_strategy: 'html_scrape'
            });
          }
        } catch (error) {
          console.warn(`Error parsing Flipkart product card:`, error.message);
        }
      });
      
      console.log(`Successfully scraped ${products.length} products from Flipkart HTML`);
      return products;
      
    } catch (error) {
      console.error(`Error in fallback Flipkart HTML scrape:`, error.message);
      return [];
    }
  }

  /**
   * Fast fetch for Reliance Digital using JSON API
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fastFetchRelianceDigital(query) {
    console.log(`Executing optimized Reliance Digital API fetch for "${query}"`);
    
    try {
      // Use the correct searchservice endpoint as indicated in your suggestion
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.reliancedigital.in/searchservice/v1/search?q=${encodedQuery}&page=1`;
      
      // Prepare headers with enhanced stealth
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
      const headers = {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'en-IN,en;q=0.9',
        'Referer': `https://www.reliancedigital.in/search?q=${encodedQuery}`,
        'Origin': 'https://www.reliancedigital.in',
        'X-Requested-With': 'XMLHttpRequest',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      };

      console.log('Reliance Digital request:', {url, headers});

      // Make request with gotScraping for better anti-bot avoidance
      const response = await gotScraping.get(url, {
        headers: headers,
        responseType: 'json'
      });

      // Debug response status and headers
      console.log('Reliance Digital response status:', response.statusCode);
      console.log('Reliance Digital response headers:', response.headers);
      
      // Log a sample of the response data
      const responseData = response.body;
      console.log('Reliance Digital response sample:', 
        typeof responseData, 
        JSON.stringify(responseData).substring(0, 200) + '...');

      // Debug response if needed
      if (DEBUG_MODE) {
        this._saveDebugData('relianceDigital', 'api-response', responseData);
      }

      // Process Reliance Digital JSON response
      let products = [];
      
      if (responseData && responseData.data && responseData.data.products) {
        products = responseData.data.products.map(product => {
          const productUrl = product.url || product.productLink || `/product/${product.productId}`;
          
          return {
            id: product.productId || product.id || productUrl.split('/').pop(),
            name: product.name || product.productName || product.displayName,
            url: `https://www.reliancedigital.in${productUrl}`,
            image: product.imageUrl || product.image || product.productImage,
            price: parseFloat(product.currentPrice || product.price || 0),
            originalPrice: parseFloat(product.mrp || product.originalPrice || product.price || 0),
            discountPercentage: product.discountPercent || 0,
            rating: parseFloat(product.rating || 0),
            ratingCount: parseInt(product.ratingCount || 0, 10),
            source: 'relianceDigital',
            available: product.available !== false && product.inStock !== false,
            fetch_strategy: 'searchservice_api'
          };
        }).filter(p => p.id && p.name);
      }

      console.log(`Successfully retrieved ${products.length} products from Reliance Digital Searchservice API`);
      
      // If searchservice API fails, fall back to regular API
      if (products.length === 0) {
        console.log('Reliance Digital Searchservice API returned no products, falling back to regular API');
        return await this._fallbackRelianceDigitalApi(query);
      }
      
      return products;
      
    } catch (error) {
      console.error(`Error in Reliance Digital Searchservice API fetch:`, error.message);
      console.log('Attempting fallback to regular Reliance Digital API...');
      return await this._fallbackRelianceDigitalApi(query);
    }
  }
  
  /**
   * Fallback to regular Reliance Digital API
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fallbackRelianceDigitalApi(query) {
    console.log(`Executing Reliance Digital regular API fallback for "${query}"`);
    
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.reliancedigital.in/api/search/v1/search?q=${encodedQuery}`;
      
      // Prepare headers with enhanced stealth
      const userAgent = this._getRandomUserAgent();
      const headers = {
        'User-Agent': userAgent,
        'Referer': `https://www.reliancedigital.in/search?q=${encodedQuery}`,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      };

      // Make request with gotScraping
      const response = await gotScraping.get(url, {
        headers: headers,
        responseType: 'json'
      });

      // Process response
      const data = response.body;
      if (data?.products && Array.isArray(data.products)) {
        const products = data.products;
        console.log(`Successfully retrieved ${products.length} products from Reliance Digital regular API`);

        return products.map(product => ({
          id: product.productId || product.PDPPageURL.split('/').pop(),
          name: product.productName || product.displayName,
          url: `https://www.reliancedigital.in${product.PDPPageURL || product.url || ''}`,
          image: product.imageURL || product.productImage,
          price: parseFloat(product.price?.value || product.sellingPrice || 0),
          originalPrice: parseFloat(product.MRP?.value || product.mrp || 0),
          discountPercentage: product.discountPercent || Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100) || 0,
          rating: parseFloat(product.averageRating || 0),
          ratingCount: parseInt(product.ratingCount || 0, 10),
          source: 'relianceDigital',
          available: product.isAvailable !== false,
          inStock: product.isInStock !== false,
          fetch_strategy: 'api_v1'
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`Error in Reliance Digital regular API fallback:`, error.message);
      return [];
    }
  }

  /**
   * Fast fetch for Meesho using GraphQL API
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fastFetchMeeshoGraphQL(query) {
    console.log(`Executing optimized Meesho GraphQL fetch for "${query}"`);
    
    try {
      // The error logs show that "/api/v1/graphql" is giving a 404, try without the opName parameter
      // Use a different URL path based on the error logs
      const url = 'https://www.meesho.com/api/v2/search';
      
      // Format GraphQL query payload for Meesho with correct structure
      const payload = {
        query: query,
        page: 1,
        responseFields: [
          "products.id",
          "products.name", 
          "products.slug", 
          "products.images", 
          "products.rating", 
          "products.price",
          "products.originalPrice", 
          "products.discountPct", 
          "products.shippingTime",
          "totalCount"
        ]
      };

      // Prepare headers with enhanced stealth and no GraphQL specific headers
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
      const headers = {
        'User-Agent': userAgent,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'en-IN,en;q=0.9',
        'Origin': 'https://www.meesho.com',
        'Referer': `https://www.meesho.com/search?q=${encodeURIComponent(query)}`,
        'Connection': 'keep-alive'
      };
      
      console.log('Meesho request:', {url, headers, payload});
      
      // Make request with gotScraping for better anti-bot avoidance
      const response = await gotScraping.post(url, {
        json: payload,
        headers: headers,
        responseType: 'json'
      });
      
      // Debug response status and headers
      console.log('Meesho response status:', response.statusCode);
      
      // Log a sample of the response data
      const responseData = response.body;
      console.log('Meesho response sample:', 
        typeof responseData, 
        JSON.stringify(responseData).substring(0, 200) + '...');

      // Debug response if needed
      if (DEBUG_MODE) {
        this._saveDebugData('meesho', 'api-response', response.body);
      }

      // Process Meesho API response
      if (responseData && responseData.products && Array.isArray(responseData.products)) {
        const products = responseData.products;
        console.log(`Successfully retrieved ${products.length} products from Meesho API`);

        return products.map(product => ({
          id: product.id,
          name: product.name,
          url: `https://www.meesho.com/product/${product.slug || product.id}`,
          image: product.images && product.images[0],
          price: product.price,
          originalPrice: product.originalPrice || product.price,
          discountPercentage: product.discountPct || 0,
          rating: product.rating || 0,
          ratingCount: product.ratingCount || 0,
          source: 'meesho',
          available: !product.isOutOfStock,
          deliveryDays: product.shippingTime || '5-7 days',
          fetch_strategy: 'api_v2'
        }));
      }
      
      // Try alternate endpoints if the first one fails
      if (!responseData?.products || !Array.isArray(responseData.products)) {
        console.log('Meesho API v2 endpoint returned no products, trying mobile API endpoint');
        return await this._fallbackMeeshoMobileApi(query);
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching from Meesho API:`, error.message);
      // Try fallback on error
      console.log('Attempting fallback to Meesho mobile API endpoint');
      return await this._fallbackMeeshoMobileApi(query);
    }
  }

  /**
   * Fallback for Meesho using the mobile API endpoint
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fallbackMeeshoMobileApi(query) {
    console.log(`Executing Meesho mobile API fetch for "${query}"`);
    
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.meesho.com/api/v1/products/search?q=${encodedQuery}&page=1`;
      
      // Use mobile user agent to mimic app requests
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
      const headers = {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.meesho.com',
        'Referer': `https://www.meesho.com/search?q=${encodedQuery}`,
        'X-Requested-With': 'XMLHttpRequest'
      };

      console.log('Meesho mobile API request:', {url, headers});
      
      // Make request with gotScraping for better anti-bot avoidance
      const response = await gotScraping.get(url, {
        headers: headers,
        responseType: 'json'
      });
      
      // Log response status
      console.log('Meesho mobile API response status:', response.statusCode);
      
      // Log a sample of the response data
      const responseData = response.body;
      console.log('Meesho mobile API response sample:', 
        typeof responseData, 
        JSON.stringify(responseData).substring(0, 200) + '...');
      
      // Process response
      if (responseData && responseData.data && Array.isArray(responseData.data)) {
        const products = responseData.data;
        console.log(`Successfully retrieved ${products.length} products from Meesho mobile API`);

        return products.map(product => ({
          id: product.id,
          name: product.name,
          url: `https://www.meesho.com/product/${product.slug || product.id}`,
          image: product.image || (product.images && product.images[0]),
          price: product.price || product.discountedPrice,
          originalPrice: product.originalPrice || product.mrp || product.price,
          discountPercentage: product.discountPct || product.discount || 0,
          rating: product.rating || 0,
          ratingCount: product.ratingCount || 0,
          source: 'meesho',
          available: !product.isOutOfStock,
          deliveryDays: product.deliveryDays || '5-7 days',
          fetch_strategy: 'mobile_api'
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`Error in Meesho mobile API fallback:`, error.message);
      return [];
    }
  }

  /**
   * Fast fetch for Croma using catalog API
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fastFetchCroma(query) {
    console.log(`Executing optimized Croma catalog API fetch for "${query}"`);
    
    try {
      // Use catalog API instead of commerce API (which is returning 404)
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.croma.com/catalog/v1/search?currentPage=0&query=${encodedQuery}&fields=FULL`;
      
      // Prepare headers with required fields for Croma API
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
      const headers = {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Referer': `https://www.croma.com/search?q=${encodedQuery}`,
        'Origin': 'https://www.croma.com',
        'Accept-Language': 'en-IN,en;q=0.9'
      };

      console.log('Croma catalog request:', {url, headers});

      // Make request with gotScraping
      const response = await gotScraping.get(url, {
        headers: headers,
        responseType: 'json'
      });
      
      // Debug response status and headers
      console.log('Croma catalog API response status:', response.statusCode);
      
      // Log a sample of the response data
      const responseData = response.body;
      console.log('Croma catalog API response sample:', 
        typeof responseData, 
        JSON.stringify(responseData).substring(0, 200) + '...');
      
      // Save full response for debugging if enabled
      if (DEBUG_MODE) {
        this._saveDebugData('croma', 'catalog-api-response', responseData);
      }

      // Process Croma catalog API response
      let products = [];
      
      if (responseData && responseData.products && Array.isArray(responseData.products)) {
        products = responseData.products.map(product => {
          const url = product.url || `/p/${product.code}`;
          
          // Try to get price information from various locations in the response
          const currentPrice = 
            (product.price && product.price.value) ? 
            parseFloat(product.price.value) : 
            (product.sellingPrice ? parseFloat(product.sellingPrice) : 0);
          
          const originalPrice = 
            (product.mrp) ? 
            parseFloat(product.mrp) : 
            currentPrice;
          
          // Calculate discount
          let discountPercentage = 0;
          if (originalPrice > currentPrice && currentPrice > 0) {
            discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
          } else if (product.discountPercent) {
            discountPercentage = parseInt(product.discountPercent, 10);
          }
          
          return {
            id: product.code,
            name: product.name,
            url: url.startsWith('http') ? url : `https://www.croma.com${url}`,
            image: product.plpImage || (product.images && product.images.length > 0 ? product.images[0].url : ''),
            price: currentPrice,
            originalPrice: originalPrice,
            discountPercentage: discountPercentage,
            rating: product.averageRating || 0,
            ratingCount: product.numberOfReviews || 0,
            source: 'croma',
            available: product.stock && product.stock.stockLevelStatus !== 'outOfStock',
            inStock: product.stock && product.stock.stockLevelStatus === 'inStock',
            fetch_strategy: 'catalog_api'
          };
        }).filter(p => p.id && p.name);
      }

      console.log(`Successfully retrieved ${products.length} products from Croma Catalog API`);
      
      // If catalog API fails, try mobile API
      if (products.length === 0) {
        console.log('Croma Catalog API returned no products, trying mobile API');
        return await this._fallbackCromaMobileApi(query);
      }
      
      return products;
    } catch (error) {
      console.error(`Error in Croma Catalog API fetch:`, error.message);
      console.log('Attempting fallback to Croma Mobile API...');
      return await this._fallbackCromaMobileApi(query);
    }
  }

  /**
   * Fallback to Croma Mobile API
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fallbackCromaMobileApi(query) {
    console.log(`Executing Croma Mobile API fallback for "${query}"`);
    
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.croma.com/mobile/v1/search?query=${encodedQuery}&page=0&size=20`;
      
      // Use mobile user agent
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
      const headers = {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://m.croma.com',
        'Referer': `https://m.croma.com/search?q=${encodedQuery}`,
        'x-device-type': 'mobile'
      };

      console.log('Croma mobile API request:', {url, headers});
      
      // Make request with gotScraping
      const response = await gotScraping.get(url, {
        headers: headers,
        responseType: 'json'
      });
      
      // Log response status
      console.log('Croma mobile API response status:', response.statusCode);
      
      // Log a sample of the response data
      const responseData = response.body;
      console.log('Croma mobile API response sample:', 
        typeof responseData, 
        JSON.stringify(responseData).substring(0, 200) + '...');
      
      // Process response
      let products = [];
      if (responseData && responseData.products && Array.isArray(responseData.products)) {
        products = responseData.products.map(product => {
          return {
            id: product.code,
            name: product.name,
            url: `https://www.croma.com${product.url || `/p/${product.code}`}`,
            image: product.plpImage || (product.images && product.images.length > 0 ? product.images[0] : ''),
            price: parseFloat(product.price?.value || product.sellingPrice || 0),
            originalPrice: parseFloat(product.mrp || 0),
            discountPercentage: parseInt(product.discountPercent || 0, 10),
            rating: product.averageRating || 0,
            ratingCount: product.numberOfReviews || 0,
            source: 'croma',
            available: product.stock?.stockLevelStatus !== 'outOfStock',
            inStock: product.stock?.stockLevelStatus === 'inStock',
            fetch_strategy: 'mobile_api'
          };
        }).filter(p => p.id && p.name);
      }
      
      console.log(`Successfully retrieved ${products.length} products from Croma Mobile API`);
      
      // If mobile API fails, fall back to regular search API as last resort
      if (products.length === 0) {
        console.log('Croma Mobile API returned no products, falling back to search API');
        return await this._fallbackCromaSearchApi(query);
      }
      
      return products;
    } catch (error) {
      console.error(`Error in Croma Mobile API fallback:`, error.message);
      console.log('Attempting fallback to search API as last resort');
      return await this._fallbackCromaSearchApi(query);
    }
  }

  /**
   * Fallback to Croma's search API
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fallbackCromaSearchApi(query) {
    console.log(`Executing Croma Search API fallback for "${query}"`);
    
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.croma.com/searchservices/v1/search?query=${encodedQuery}&currentPage=0&fields=FULL&pageSize=20`;
      
      // Prepare headers with random user agent
      const userAgent = this._getRandomUserAgent();
      const headers = {
        'User-Agent': userAgent,
        'Referer': `https://www.croma.com/search?q=${encodedQuery}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      console.log('Croma search API request:', {url, headers});
      
      // Make request with gotScraping
      const response = await gotScraping.get(url, {
        headers: headers,
        responseType: 'json'
      });
      
      // Log response status
      console.log('Croma search API response status:', response.statusCode);
      
      // Log a sample of the response data
      const responseData = response.body;
      console.log('Croma search API response sample:', 
        typeof responseData, 
        JSON.stringify(responseData).substring(0, 200) + '...');
      
      // Process response
      if (responseData && responseData.products && Array.isArray(responseData.products)) {
        const products = responseData.products;
        console.log(`Successfully retrieved ${products.length} products from Croma Search API`);

        return products.map(product => ({
          id: product.code,
          name: product.name,
          url: `https://www.croma.com${product.url || `/p/${product.code}`}`,
          image: product.images && product.images[0]?.url,
          price: parseFloat(product.price?.value || 0),
          originalPrice: parseFloat(product.mrp || 0),
          discountPercentage: parseInt(product.discountPercent || 0, 10),
          rating: product.averageRating || 0,
          ratingCount: product.numberOfReviews || 0,
          source: 'croma',
          available: product.stock?.stockLevelStatus !== 'outOfStock',
          inStock: product.stock?.stockLevelStatus === 'inStock',
          fetch_strategy: 'search_api'
        }));
      }
      
      // If search API fails, fall back to HTML scraping
      console.log('Croma search API returned no products, falling back to HTML scraping');
      return await this._fallbackCromaHtmlScrape(query);
    } catch (error) {
      console.error(`Error in Croma search API fallback:`, error.message);
      console.log('Attempting fallback to HTML scraping as last resort');
      return await this._fallbackCromaHtmlScrape(query);
    }
  }

  /**
   * HTML scraping fallback for Croma
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fallbackCromaHtmlScrape(query) {
    console.log(`Executing Croma HTML scrape fallback for "${query}"`);
    
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.croma.com/search?q=${encodedQuery}`;
      
      // Prepare headers with enhanced stealth
      const userAgent = this._getRandomUserAgent();
      const headers = {
        'User-Agent': userAgent,
        'Referer': 'https://www.croma.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1'
      };

      // Make request with gotScraping
      const response = await gotScraping.get(url, {
        headers: headers,
        responseType: 'text'
      });
      
      // Save HTML for debugging if needed
      if (DEBUG_MODE) {
        const timestamp = Date.now();
        fs.writeFileSync(path.join(DEBUG_DIR, `croma-${timestamp}.html`), response.body);
      }

      // Parse HTML with cheerio
      const $ = cheerio.load(response.body);
      const products = [];
      
      // Croma product cards
      $('.product-card').each((i, element) => {
        try {
          const card = $(element);
          
          // Get product name
          const name = card.find('.product-title').text().trim();
          if (!name) return;
          
          // Get product URL
          const urlElement = card.find('.product-title a');
          const url = urlElement.attr('href');
          if (!url) return;
          
          const fullUrl = url.startsWith('http') ? url : `https://www.croma.com${url}`;
          
          // Get product ID
          let id = '';
          const idMatch = url.match(/\/p\/([^?/]+)/);
          if (idMatch && idMatch[1]) {
            id = idMatch[1];
          }
          
          // Get price
          let price = 0;
          const priceElement = card.find('.new-price');
          if (priceElement.length) {
            const priceText = priceElement.text().trim().replace(/[₹,]/g, '');
            price = parseFloat(priceText) || 0;
          }
          
          // Get original price
          let originalPrice = price;
          const originalPriceElement = card.find('.old-price');
          if (originalPriceElement.length) {
            const originalPriceText = originalPriceElement.text().trim().replace(/[₹,]/g, '');
            originalPrice = parseFloat(originalPriceText) || price;
          }
          
          // Calculate discount
          let discountPercentage = 0;
          if (originalPrice > price && price > 0) {
            discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
          }
          
          // Get discount from UI if available
          const discountElement = card.find('.discount');
          if (discountElement.length) {
            const discountText = discountElement.text().trim();
            const discountMatch = discountText.match(/(\d+)%/);
            if (discountMatch && discountMatch[1]) {
              discountPercentage = parseInt(discountMatch[1], 10);
            }
          }
          
          // Get image
          const image = card.find('img').attr('src') || '';
          
          // Get rating
          let rating = 0;
          const ratingElement = card.find('.rating');
          if (ratingElement.length) {
            const ratingText = ratingElement.text().trim();
            const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
            if (ratingMatch && ratingMatch[1]) {
              rating = parseFloat(ratingMatch[1]);
            }
          }
          
          // Get rating count
          let ratingCount = 0;
          const ratingCountElement = card.find('.reviews-count');
          if (ratingCountElement.length) {
            const ratingCountText = ratingCountElement.text().trim();
            const ratingCountMatch = ratingCountText.match(/(\d+)/);
            if (ratingCountMatch && ratingCountMatch[1]) {
              ratingCount = parseInt(ratingCountMatch[1], 10);
            }
          }
          
          if (name && (id || url)) {
            products.push({
              id: id || `croma-${i}`,
              name,
              url: fullUrl,
              image,
              price,
              originalPrice,
              discountPercentage,
              rating,
              ratingCount,
              source: 'croma',
              available: true,
              fetch_strategy: 'html_scrape'
            });
          }
        } catch (error) {
          console.warn(`Error parsing Croma product card:`, error.message);
        }
      });
      
      console.log(`Successfully scraped ${products.length} products from Croma HTML`);
      return products;
      
    } catch (error) {
      console.error(`Error in Croma HTML scrape fallback:`, error.message);
      return [];
    }
  }

  /**
   * Fast fetch for Amazon using gotScraping
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fastFetchAmazon(query) {
    console.log(`Executing optimized Amazon fetch for "${query}"`);
    
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.amazon.in/s?k=${encodedQuery}`;
      
      // Prepare headers with enhanced stealth
      const userAgent = this._getRandomUserAgent();
      const headers = {
        'User-Agent': userAgent,
        'Referer': 'https://www.amazon.in/',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'DNT': '1'
      };

      // Make request with gotScraping for better anti-bot avoidance
      const response = await gotScraping.get(url, {
        headers: headers,
        responseType: 'text'
      });
      
      // Save HTML for debugging if enabled
      if (DEBUG_MODE) {
        const timestamp = Date.now();
        fs.writeFileSync(path.join(DEBUG_DIR, `amazon-${timestamp}.html`), response.body);
      }

      // Use cheerio to parse HTML response
      const $ = cheerio.load(response.body);
      const products = [];
      
      // Amazon product grid selector
      const productCards = $('div[data-asin]:not([data-asin=""])');
      
      productCards.each((i, element) => {
        try {
          const card = $(element);
          const asin = card.attr('data-asin');
          
          if (!asin || asin === '') return;
          
          // Extract product data
          const titleElement = card.find('h2 a.a-link-normal').first();
          const name = titleElement.text().trim();
          const url = titleElement.attr('href');
          
          if (!name || !url) return;
          
          const fullUrl = url.startsWith('http') ? url : `https://www.amazon.in${url}`;
          
          // Get price information with fallback selectors
          const wholePriceText = card.find('.a-price-whole').first().text().trim();
          const fractionPriceText = card.find('.a-price-fraction').first().text().trim();
          
          let price = 0;
          if (wholePriceText) {
            price = parseFloat(`${wholePriceText.replace(/[,.]/g, '')}${fractionPriceText ? `.${fractionPriceText}` : ''}`);
          }
          
          // Get original price with fallback selectors
          const originalPriceText = card.find('.a-text-price .a-offscreen').first().text().replace(/[₹,]/g, '');
          const originalPrice = parseFloat(originalPriceText) || price;
          
          // Calculate discount or get it from the UI
          let discountPercentage = 0;
          if (originalPrice > price && price > 0) {
            discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
          }
          
          const discountElement = card.find('.a-row.a-size-base .a-color-secondary').text().match(/(\d+)%/);
          if (discountElement && discountElement[1]) {
            discountPercentage = parseInt(discountElement[1], 10);
          }
          
          // Get image URL
          const image = card.find('img.s-image').attr('src');
          
          // Get rating information
          const ratingText = card.find('.a-icon-star-small .a-icon-alt').first().text();
          const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
          
          // Get rating count
          const ratingCountText = card.find('.a-size-small .a-link-normal').text().replace(/[^0-9]/g, '');
          const ratingCount = parseInt(ratingCountText, 10) || 0;
          
          if (asin && name) {
            products.push({
              id: asin,
              name,
              url: fullUrl,
              image,
              price,
              originalPrice: originalPrice || price,
              discountPercentage,
              rating,
              ratingCount,
              source: 'amazon',
              available: true,
              fetch_strategy: 'html_scrape_fast'
            });
          }
        } catch (error) {
          console.warn(`Error parsing Amazon product card:`, error.message);
        }
      });
      
      console.log(`Successfully scraped ${products.length} products from Amazon HTML`);
      return products;
      
    } catch (error) {
      console.error(`Error in fast Amazon fetch:`, error.message);
      return [];
    }
  }
}

// Create singleton instance
const directApiService = new DirectApiService();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down DirectApiService...');
  await directApiService.closeBrowsers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down DirectApiService...');
  await directApiService.closeBrowsers();
  process.exit(0);
});

module.exports = directApiService;