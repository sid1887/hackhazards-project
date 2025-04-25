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
const NodeCache = require('node-cache');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const playwright = require('playwright');

// A simpler implementation of pLimit that doesn't rely on the ES module
function createPLimit(concurrency) {
  const queue = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()();
    }
  };

  const run = async (fn, resolve, args) => {
    activeCount++;
    try {
      const result = await fn(...args);
      resolve(result);
    } catch (error) {
      resolve(Promise.reject(error));
    }
    next();
  };

  const enqueue = (fn, resolve, args) => {
    queue.push(() => run(fn, resolve, args));
  };

  const generator = (fn, ...args) => new Promise(resolve => {
    if (activeCount < concurrency) {
      run(fn, resolve, args);
    } else {
      enqueue(fn, resolve, args);
    }
  });

  generator.activeCount = () => activeCount;
  generator.pendingCount = () => queue.length;
  return generator;
}

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
    
    // Use our simple built-in implementation instead of the ES module
    this.requestLimiter = createPLimit(MAX_CONCURRENT_REQUESTS);
    
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
          search: 'https://www.croma.com/mobilesite/search',
          catalog: 'https://api.croma.com/searchservices/v1/search',
          product: 'https://www.croma.com/mobilesite/product/',
          mobileSearch: 'https://www.croma.com/mobilesite/search/mobileapi'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
          'Accept': 'application/json,text/html',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.croma.com/',
          'x-device-type': 'mobile',
          'x-requested-with': 'XMLHttpRequest'
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
    try {
      // Check if we have a mobile site response
      if (data && data.searchResultsVO && data.searchResultsVO.products) {
        return this._parseCromaMobileSiteResponse(data);
      }
      
      // Check for regular API response format
      if (data && data.products && Array.isArray(data.products)) {
        return data.products.map(product => {
          const productUrl = product.url || `/p/${product.code}`;
          
          // Extract price data
          let price = 0;
          if (product.price && product.price.value) {
            price = parseFloat(product.price.value);
          } else if (product.sellingPrice) {
            price = parseFloat(product.sellingPrice);
          }
          
          return {
            id: product.code || product.productId,
            name: product.name || product.displayName,
            url: productUrl.startsWith('http') ? productUrl : `https://www.croma.com${productUrl}`,
            image: product.plpImage || (product.images && product.images.length > 0 ? product.images[0] : ''),
            price: price,
            originalPrice: parseFloat(product.mrp || price),
            source: 'croma',
            fetch_strategy: 'api_response_parser'
          };
        }).filter(p => p.id && p.name);
      }
      
      return [];
    } catch (error) {
      console.error('Error parsing Croma API response:', error.message);
      return [];
    }
  }

  /**
   * Parse Croma mobile site response format
   * @param {Object} data - Response data
   * @returns {Array} Parsed products
   * @private
   */
  _parseCromaMobileSiteResponse(data) {
    try {
      const products = data.searchResultsVO.products;
      
      return products.map(product => {
        // Extract URL and ensure it's complete
        const url = product.productURL || `/product/${product.productId}`;
        
        // Extract price information
        let price = 0;
        if (product.sellingPrice) {
          price = parseFloat(product.sellingPrice);
        } else if (product.price) {
          price = parseFloat(product.price);
        }
        
        // Extract original price
        let originalPrice = price;
        if (product.mrp) {
          originalPrice = parseFloat(product.mrp);
        } else if (product.listPrice) {
          originalPrice = parseFloat(product.listPrice);
        }
        
        // Calculate discount if not provided
        let discountPercentage = 0;
        if (product.discount) {
          discountPercentage = parseInt(product.discount, 10);
        } else if (originalPrice > price && price > 0) {
          discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
        }
        
        return {
          id: product.productId || product.code,
          name: product.productName || product.name,
          url: url.startsWith('http') ? url : `https://www.croma.com${url}`,
          image: product.imageURL || product.image,
          price: price,
          originalPrice: originalPrice,
          discountPercentage: discountPercentage,
          rating: parseFloat(product.rating || 0),
          ratingCount: parseInt(product.reviewCount || 0, 10),
          source: 'croma',
          available: true,
          fetch_strategy: 'mobile_site_parser'
        };
      }).filter(p => p.id && p.name);
    } catch (error) {
      console.error('Error parsing Croma mobile site response:', error.message);
      return [];
    }
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
      console.error(`GotScraping fast fetch failed for ${retailerKey}: ${error.message}`);
      return [];
    }
  }

  /**
   * Fast fetch for Amazon using gotScraping approach
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _fastFetchAmazon(query) {
    console.log(`Executing optimized Amazon search fetch for "${query}"`);
    
    try {
      // Use a mobile user agent for better experience with fewer anti-bot measures
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
      
      const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}&ref=nb_sb_noss`;
      const headers = {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.amazon.in/',
        'Cache-Control': 'max-age=0'
      };
      
      console.log('Amazon request:', {
        url,
        headers: { 'User-Agent': userAgent }
      });
      
      // Make the request
      const response = await gotScraping.get(url, {
        headers,
        responseType: 'text',
        timeout: {
          request: 15000
        }
      }).catch(error => {
        console.log(`Amazon request error: ${error.message}`);
        throw error;
      });
      
      if (response.body) {
        // Save HTML for debugging if enabled
        if (DEBUG_MODE) {
          const timestamp = Date.now();
          fs.writeFileSync(path.join(DEBUG_DIR, `amazon-mobile-${timestamp}.html`), response.body);
        }
        
        // Use cheerio to parse HTML
        const $ = cheerio.load(response.body);
        const products = [];
        
        // Check if we hit a CAPTCHA
        if (response.body.includes('Type the characters you see in this image') || 
            response.body.includes('Enter the characters you see below') ||
            response.body.includes('Robot Check')) {
          console.log('Amazon CAPTCHA detected, trying fallback with clean session');
          return await this._amazonFallbackScrape(query);
        }
        
        // Look for product grids/cards in mobile view
        $('.s-result-item[data-asin]:not([data-asin=""])').each((i, element) => {
          try {
            const card = $(element);
            const asin = card.attr('data-asin');
            
            if (!asin || asin === '') return;
            
            // Extract name
            const nameElement = card.find('h2 span.a-text-normal, .a-size-base-plus');
            const name = nameElement.text().trim();
            
            if (!name) return;
            
            // Extract URL
            const linkElement = card.find('a.a-link-normal[href*="/dp/"]').first();
            const url = linkElement.attr('href');
            const fullUrl = url ? (url.startsWith('http') ? url : `https://www.amazon.in${url}`) : '';
            
            if (!fullUrl) return;
            
            // Extract price - mobile site typically has .a-price-whole
            let price = 0;
            const priceElement = card.find('.a-price .a-offscreen, .a-price-whole');
            if (priceElement.length) {
              const priceText = priceElement.first().text().trim();
              price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
            }
            
            // Extract original price if available
            let originalPrice = price;
            const originalPriceElement = card.find('.a-text-price span');
            if (originalPriceElement.length) {
              const originalPriceText = originalPriceElement.first().text().trim();
              originalPrice = parseFloat(originalPriceText.replace(/[^0-9.]/g, '')) || price;
            }
            
            // Calculate discount
            let discountPercentage = 0;
            if (originalPrice > price && price > 0) {
              discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
            }
            
            // Extract image
            const imageElement = card.find('img.s-image');
            const image = imageElement.attr('src') || '';
            
            // Extract rating
            let rating = 0;
            const ratingElement = card.find('i.a-icon-star, .a-star-small');
            if (ratingElement.length) {
              const ratingText = ratingElement.first().text().trim();
              const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
              if (ratingMatch && ratingMatch[1]) {
                rating = parseFloat(ratingMatch[1]);
              }
            }
            
            // Extract rating count
            let ratingCount = 0;
            const ratingCountElement = card.find('.a-size-small:contains("ratings"), .a-size-mini:contains("ratings")');
            if (ratingCountElement.length) {
              const ratingCountText = ratingCountElement.first().text().trim();
              const ratingCountMatch = ratingCountText.match(/\((\d+[,\d]*)\)/);
              if (ratingCountMatch && ratingCountMatch[1]) {
                ratingCount = parseInt(ratingCountMatch[1].replace(/,/g, ''), 10);
              }
            }
            
            products.push({
              id: asin,
              name,
              url: fullUrl,
              image,
              price,
              originalPrice,
              discountPercentage,
              rating,
              ratingCount,
              source: 'amazon',
              available: true,
              fetch_strategy: 'mobile_html_scrape'
            });
          } catch (error) {
            console.warn(`Error extracting Amazon product: ${error.message}`);
          }
        });
        
        console.log(`Found ${products.length} products from Amazon mobile site`);
        
        if (products.length > 0) {
          return products;
        } else {
          // No products found, try fallback method
          return await this._amazonFallbackScrape(query);
        }
      }
      
      return [];
    } catch (error) {
      console.error(`Fast Amazon fetch error: ${error.message}`);
      // Try fallback approach
      return await this._amazonFallbackScrape(query);
    }
  }
  
  /**
   * Amazon fallback scraping method with alternate user agent
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _amazonFallbackScrape(query) {
    console.log(`Executing Amazon fallback scraping for "${query}"`);
    
    try {
      // Try with desktop user agent instead
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
      
      const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
      const headers = {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Google Chrome";v="123"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Upgrade-Insecure-Requests': '1'
      };
      
      const response = await gotScraping.get(url, {
        headers,
        responseType: 'text',
        timeout: {
          request: 15000
        }
      });
      
      // Use cheerio to parse HTML
      const $ = cheerio.load(response.body);
      const products = [];
      
      // Desktop site selectors are different
      $('.s-result-item[data-asin]:not([data-asin=""]), [data-component-type="s-search-result"]').each((i, element) => {
        try {
          const card = $(element);
          const asin = card.attr('data-asin');
          
          if (!asin || asin === '') return;
          
          // Extract name
          const titleElement = card.find('h2 a span, .a-size-medium.a-text-normal, .a-size-base-plus.a-color-base');
          const name = titleElement.text().trim();
          
          if (!name) return;
          
          // Extract URL
          const linkElement = card.find('h2 a, a.a-link-normal.a-text-normal');
          const url = linkElement.attr('href');
          
          if (!url) return;
          
          const fullUrl = url.startsWith('http') ? url : `https://www.amazon.in${url}`;
          
          // Extract price
          let price = 0;
          const priceElement = card.find('.a-price .a-offscreen, .a-price-whole').first();
          if (priceElement.length) {
            const priceText = priceElement.text().trim();
            price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
          }
          
          // Extract original price
          let originalPrice = price;
          const originalPriceElement = card.find('.a-text-price .a-offscreen, .a-text-price').first();
          if (originalPriceElement.length) {
            const originalPriceText = originalPriceElement.text().trim();
            originalPrice = parseFloat(originalPriceText.replace(/[^0-9.]/g, '')) || price;
          }
          
          // Calculate discount
          let discountPercentage = 0;
          if (originalPrice > price && price > 0) {
            discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
          }
          
          // Extract image
          const imageElement = card.find('img.s-image');
          const image = imageElement.attr('src') || '';
          
          // Extract rating
          let rating = 0;
          const ratingElement = card.find('.a-icon-star-small');
          if (ratingElement.length) {
            const ratingText = ratingElement.attr('aria-label') || ratingElement.text().trim();
            const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
            if (ratingMatch && ratingMatch[1]) {
              rating = parseFloat(ratingMatch[1]);
            }
          }
          
          products.push({
            id: asin,
            name,
            url: fullUrl,
            image,
            price,
            originalPrice,
            discountPercentage,
            rating,
            source: 'amazon',
            available: true,
            fetch_strategy: 'desktop_fallback'
          });
        } catch (error) {
          console.warn(`Error extracting Amazon fallback product: ${error.message}`);
        }
      });
      
      console.log(`Found ${products.length} products from Amazon fallback scraping`);
      return products;
    } catch (error) {
      console.error(`Amazon fallback scraping error: ${error.message}`);
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