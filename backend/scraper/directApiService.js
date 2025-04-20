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
const pLimit = require('p-limit');
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
    this.requestLimiter = pLimit(MAX_CONCURRENT_REQUESTS);
    
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
        responseParser: this._parseAmazonApiResponse.bind(this)
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
        responseParser: this._parseFlipkartApiResponse.bind(this)
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
        responseParser: this._parseCromaApiResponse.bind(this)
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
        responseParser: this._parseMeeshoApiResponse.bind(this)
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
        responseParser: this._parseRelianceDigitalApiResponse.bind(this)
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
   * Try direct API access strategy with proxy rotation
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _tryDirectApi(retailerKey, query, requestId) {
    console.log(`Trying direct API for ${retailerKey}...`);
    const retailer = this.apiConfig[retailerKey];
    let endpoint = retailer.endpoints.search;
    
    // Customize request based on retailer
    let requestData;
    let headers = { ...retailer.headers };
    headers['User-Agent'] = this._getRandomUserAgent();
    
    // Prepare request data similar to the existing code
    switch (retailerKey) {
      case 'amazon':
        requestData = {
          keywords: query,
          marketplace: 'IN',
          page: 1,
          filters: { price: { min: 100 } }
        };
        break;
        
      case 'flipkart':
        requestData = {
          query,
          queryContext: { fetchProducts: true },
          requestContext: { type: 'SEARCH', ppp: 20 }
        };
        break;
        
      case 'croma':
        // Croma uses query params instead of JSON body
        endpoint = `${endpoint}?q=${encodeURIComponent(query)}&currentPage=0&pageSize=20`;
        break;
        
      case 'meesho':
        requestData = {
          query: `query search($query: String!) {
            searchByQuery(query: $query) {
              products {
                id name slug media { url } price originalPrice rating
              }
            }
          }`,
          variables: { query }
        };
        break;
        
      case 'relianceDigital':
        // Reliance Digital uses query params
        endpoint = `${endpoint}?q=${encodeURIComponent(query)}&page=0&size=20`;
        break;
    }
    
    // Try with different proxies if available
    const maxAttempts = this.proxyList.length > 0 ? this.proxyList.length : 1;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Get proxy if available
        const proxy = this.proxyList.length > 0 ? this._getNextProxy() : null;
        const proxyAgent = proxy ? this._createProxyAgent(proxy) : null;
        
        // Make the request with or without proxy
        const response = await axios({
          method: requestData ? 'POST' : 'GET',
          url: endpoint,
          headers,
          data: requestData,
          timeout: 10000,
          ...(proxyAgent ? { httpsAgent: proxyAgent } : {})
        });
        
        // Debug logging
        if (DEBUG_MODE) {
          this._saveDebugData(retailerKey, 'api-response', response.data);
        }
        
        // Parse the response
        if (response.status === 200 && retailer.responseParser) {
          const products = retailer.responseParser(response.data);
          if (products && products.length > 0) {
            console.log(`Got ${products.length} products from ${retailerKey} API, attempt ${attempt + 1}`);
            return products;
          }
        }
      } catch (error) {
        console.error(`Direct API request failed for ${retailerKey} (attempt ${attempt + 1}):`, error.message);
        // Continue to next proxy
      }
    }
    
    return [];
  }

  /**
   * Try GraphQL endpoint strategy
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _tryGraphQlEndpoint(retailerKey, query, requestId) {
    console.log(`Trying GraphQL endpoint for ${retailerKey}...`);
    
    if (!this.apiConfig[retailerKey].endpoints.graphql) {
      return [];
    }
    
    const retailer = this.apiConfig[retailerKey];
    const endpoint = retailer.endpoints.graphql;
    let requestData;
    let headers = { ...retailer.headers };
    headers['User-Agent'] = this._getRandomUserAgent();
    
    // Prepare GraphQL query based on retailer
    switch (retailerKey) {
      case 'flipkart':
        requestData = {
          operationName: 'searchQuery',
          variables: {
            query,
            page: 1,
            pageSize: 30
          },
          query: `query searchQuery($query: String!, $page: Int!, $pageSize: Int!) {
            searchByQuery(query: $query, page: $page, pageSize: $pageSize) {
              products {
                productId
                name
                price
                originalPrice
                rating
                images
                url
              }
            }
          }`
        };
        break;
        
      case 'meesho':
        requestData = {
          operationName: 'searchProducts',
          variables: { query },
          query: `query searchProducts($query: String!) {
            searchByQuery(query: $query) {
              products {
                id
                name
                slug
                images
                price
                originalPrice
                rating
              }
            }
          }`
        };
        break;
        
      case 'amazon':
        // Amazon's GraphQL structure (this is an approximation)
        requestData = {
          query: `query SearchProducts($query: String!) {
            search(query: $query) {
              results {
                asin
                title
                price
                listPrice
                imageUrl
                rating
                url
              }
            }
          }`,
          variables: { query }
        };
        break;
        
      default:
        return [];
    }
    
    try {
      // Try with different proxies if available
      const maxAttempts = this.proxyList.length > 0 ? this.proxyList.length : 1;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          // Get proxy if available
          const proxy = this.proxyList.length > 0 ? this._getNextProxy() : null;
          const proxyAgent = proxy ? this._createProxyAgent(proxy) : null;
          
          // Make GraphQL request
          const response = await axios({
            method: 'POST',
            url: endpoint,
            headers,
            data: requestData,
            timeout: 15000,
            ...(proxyAgent ? { httpsAgent: proxyAgent } : {})
          });
          
          if (DEBUG_MODE) {
            this._saveDebugData(retailerKey, 'graphql-response', response.data);
          }
          
          // Parse GraphQL response
          if (response.status === 200) {
            let products = [];
            
            if (retailerKey === 'flipkart') {
              const data = response.data.data;
              if (data && data.searchByQuery && data.searchByQuery.products) {
                products = data.searchByQuery.products.map(item => ({
                  id: item.productId,
                  name: item.name,
                  price: item.price,
                  originalPrice: item.originalPrice,
                  imageUrl: item.images[0],
                  url: `https://www.flipkart.com${item.url}`,
                  retailer: 'Flipkart',
                  rating: item.rating
                }));
              }
            } else if (retailerKey === 'meesho') {
              const data = response.data.data;
              if (data && data.searchByQuery && data.searchByQuery.products) {
                products = data.searchByQuery.products.map(item => ({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  originalPrice: item.originalPrice,
                  imageUrl: item.images[0],
                  url: `https://www.meesho.com/${item.slug}/${item.id}`,
                  retailer: 'Meesho',
                  rating: item.rating
                }));
              }
            } else if (retailerKey === 'amazon') {
              const data = response.data.data;
              if (data && data.search && data.search.results) {
                products = data.search.results.map(item => ({
                  id: item.asin,
                  name: item.title,
                  price: item.price,
                  originalPrice: item.listPrice,
                  imageUrl: item.imageUrl,
                  url: `https://www.amazon.in/dp/${item.asin}`,
                  retailer: 'Amazon',
                  rating: item.rating
                }));
              }
            }
            
            if (products.length > 0) {
              console.log(`Got ${products.length} products from ${retailerKey} GraphQL, attempt ${attempt + 1}`);
              return products;
            }
          }
        } catch (error) {
          console.error(`GraphQL request failed for ${retailerKey} (attempt ${attempt + 1}):`, error.message);
          // Continue to next proxy
        }
      }
    } catch (error) {
      console.error(`Error in GraphQL strategy for ${retailerKey}:`, error.message);
    }
    
    return [];
  }
  
  /**
   * Try harvested endpoint strategy (alternative endpoints)
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _tryHarvestedEndpoint(retailerKey, query, requestId) {
    console.log(`Trying harvested endpoint for ${retailerKey}...`);
    let endpoint;
    let headers = { 
      'User-Agent': this._getRandomUserAgent(),
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9'
    };
    
    // Use retailer-specific harvested endpoints
    switch (retailerKey) {
      case 'amazon':
        endpoint = `https://completion.amazon.in/api/2017/suggestions?page-type=Search&prefix=${encodeURIComponent(query)}&limit=10`;
        break;
        
      case 'flipkart':
        endpoint = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}&otracker=search&marketplace=FLIPKART`;
        headers['Accept'] = 'text/html'; // This is an HTML endpoint we'll parse
        break;
        
      case 'croma':
        endpoint = `https://api.croma.com/productRecommendationwcs/v3/recommendations?name=search-result&query=${encodeURIComponent(query)}&pageindex=0&pagesize=24`;
        break;
        
      case 'relianceDigital':
        endpoint = `https://www.reliancedigital.in/search/v3/suggest?q=${encodeURIComponent(query)}&rows=24`;
        break;
        
      case 'meesho':
        endpoint = `https://meesho.com/api/v1/search/query?query=${encodeURIComponent(query)}&page=1&limit=24`;
        break;
        
      default:
        return [];
    }
    
    try {
      // Try with different proxies if available
      const maxAttempts = this.proxyList.length > 0 ? this.proxyList.length : 1;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          // Get proxy if available
          const proxy = this.proxyList.length > 0 ? this._getNextProxy() : null;
          const proxyAgent = proxy ? this._createProxyAgent(proxy) : null;
          
          // Use the correct fetching method based on response type
          let response;
          
          if (retailerKey === 'flipkart') {
            // For HTML endpoints, use got-scraping 
            const gotOptions = {
              headers,
              timeout: { request: 15000 },
              retry: { limit: 0 },
              ...(proxyAgent ? { agent: { https: proxyAgent } } : {})
            };
            
            response = await gotScraping.get(endpoint, gotOptions);
            
            if (response.statusCode === 200) {
              const html = response.body;
              const jsonData = await this._extractJsonFromHtml(html, retailerKey);
              
              if (jsonData && jsonData.length > 0) {
                console.log(`Extracted ${jsonData.length} products from Flipkart HTML`);
                return jsonData;
              }
            }
          } else {
            // For JSON endpoints use axios
            response = await axios({
              method: 'GET',
              url: endpoint,
              headers,
              timeout: 15000,
              ...(proxyAgent ? { httpsAgent: proxyAgent } : {})
            });
            
            if (DEBUG_MODE) {
              this._saveDebugData(retailerKey, 'harvested-response', response.data);
            }
            
            // Parse response based on retailer
            let products = [];
            
            switch (retailerKey) {
              case 'amazon':
                if (response.data.suggestions) {
                  products = response.data.suggestions.map(item => ({
                    id: item.strategyId || item.asin || crypto.randomUUID(),
                    name: item.value || item.displayTitle,
                    imageUrl: item.image || item.displayImage,
                    url: item.url,
                    retailer: 'Amazon',
                    price: item.price || '',
                    originalPrice: item.originalPrice || ''
                  }));
                }
                break;
                
              case 'croma':
                if (response.data && response.data.products) {
                  products = response.data.products.map(item => ({
                    id: item.productId || item.code,
                    name: item.name || item.title,
                    price: item.price && item.price.sellingPrice ? item.price.sellingPrice.formattedValue.replace(/[^\d,.]/g, '') : '',
                    originalPrice: item.price && item.price.mrp ? item.price.mrp.formattedValue.replace(/[^\d,.]/g, '') : '',
                    imageUrl: item.plpImage || (item.images && item.images.length > 0 ? item.images[0] : ''),
                    url: item.url ? `https://www.croma.com${item.url}` : '',
                    retailer: 'Croma',
                    rating: item.rating
                  }));
                }
                break;
                
              case 'relianceDigital':
                if (response.data && response.data.products) {
                  products = response.data.products.map(item => ({
                    id: item.productId || item.code,
                    name: item.name || item.title,
                    price: item.price || item.formattedValue || '',
                    originalPrice: item.mrp || item.mrpPrice || '',
                    imageUrl: item.image || '',
                    url: item.url ? `https://www.reliancedigital.in${item.url}` : '',
                    retailer: 'Reliance Digital',
                    rating: item.rating
                  }));
                }
                break;
                
              case 'meesho':
                if (response.data && response.data.data && response.data.data.products) {
                  products = response.data.data.products.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price.toString(),
                    originalPrice: item.originalPrice ? item.originalPrice.toString() : '',
                    imageUrl: item.images && item.images.length > 0 ? item.images[0] : '',
                    url: `https://www.meesho.com/${item.slug || 'product'}/${item.id}`,
                    retailer: 'Meesho',
                    rating: item.rating
                  }));
                }
                break;
            }
            
            if (products.length > 0) {
              console.log(`Got ${products.length} products from ${retailerKey} harvested endpoint, attempt ${attempt + 1}`);
              return products;
            }
          }
        } catch (error) {
          console.error(`Harvested endpoint request failed for ${retailerKey} (attempt ${attempt + 1}):`, error.message);
          // Continue to next proxy
        }
      }
    } catch (error) {
      console.error(`Error in harvested endpoint strategy for ${retailerKey}:`, error.message);
    }
    
    return [];
  }

  /**
   * Try headless browser with network sniffing strategy
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _tryHeadlessBrowserSniffing(retailerKey, query, requestId) {
    console.log(`Using headless browser network sniffing for ${retailerKey}...`);
    
    // Skip if browser is not initialized
    if (!this.browsers.chromium) {
      console.log('Browser not initialized, trying to initialize now...');
      await this._initializeBrowsers();
      
      if (!this.browsers.chromium) {
        throw new Error('Failed to initialize browser');
      }
    }
    
    const retailer = this.apiConfig[retailerKey];
    
    // Create stealth context
    const context = await this.browsers.chromium.newContext({
      userAgent: this._getRandomUserAgent(),
      viewport: {
        width: 1920 + Math.floor(Math.random() * 100),
        height: 1080 + Math.floor(Math.random() * 100)
      },
      locale: 'en-US',
      deviceScaleFactor: 1 + (Math.random() * 0.3),
      hasTouch: false,
      javaScriptEnabled: true,
    });
    
    try {
      // Create new page
      const page = await context.newPage();
      
      // Store network requests
      const requests = [];
      const jsonResponses = [];
      
      // Track XHR and Fetch requests
      await page.route('**/*', async (route) => {
        const request = route.request();
        const url = request.url();
        
        if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
          requests.push({
            url,
            method: request.method(),
            headers: request.headers()
          });
        }
        
        // Continue with the request
        await route.continue();
      });
      
      // Track responses
      page.on('response', async (response) => {
        const request = response.request();
        const url = response.url();
        
        if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
          try {
            const contentType = response.headers()['content-type'] || '';
            
            if (contentType.includes('application/json') || 
                contentType.includes('text/javascript') ||
                url.includes('api') || 
                url.includes('graphql')) {
              
              try {
                const body = await response.text();
                
                if (body && (body.startsWith('{') || body.startsWith('['))) {
                  jsonResponses.push({
                    url,
                    status: response.status(),
                    body
                  });
                }
              } catch (e) {
                // Ignore response read errors
              }
            }
          } catch (error) {
            // Ignore response processing errors
          }
        }
      });
      
      // Calculate the search URL based on retailer
      let searchUrl;
      
      switch (retailerKey) {
        case 'amazon':
          searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
          break;
        case 'flipkart':
          searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
          break;
        case 'meesho':
          searchUrl = `https://www.meesho.com/search?q=${encodeURIComponent(query)}`;
          break;
        case 'croma':
          searchUrl = `https://www.croma.com/search/?text=${encodeURIComponent(query)}`;
          break;
        case 'relianceDigital':
          searchUrl = `https://www.reliancedigital.in/search?q=${encodeURIComponent(query)}:relevance`;
          break;
        default:
          throw new Error(`No search URL defined for ${retailerKey}`);
      }
      
      // Add small random delays to mimic human behavior
      await page.addInitScript(() => {
        // Override Math.random
        const originalRandom = Math.random;
        Math.random = function() {
          return originalRandom() * 0.8 + 0.1; // Range 0.1-0.9
        };
        
        // Add jitter to setTimeout
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(fn, time, ...args) {
          const jitter = Math.floor(Math.random() * 100) - 50; // ±50ms
          return originalSetTimeout(fn, time + jitter, ...args);
        };
      });
      
      console.log(`Navigating to ${searchUrl}...`);
      
      // Wait for network to be idle
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      console.log(`Page loaded, waiting for additional activity...`);
      
      // Add a little delay to catch late XHR
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      
      // Also check if we need to handle cookie banners
      await this._handleCookieBanner(page, retailerKey);
      
      // Extract JSON from page HTML
      const html = await page.content();
      const extractedJson = await this._extractJsonFromHtml(html, retailerKey);
      
      if (extractedJson && Array.isArray(extractedJson) && extractedJson.length > 0) {
        console.log(`Successfully extracted JSON data from HTML for ${retailerKey}`);
        await context.close();
        return extractedJson;
      }
      
      // Process network responses
      let products = [];
      
      for (const response of jsonResponses) {
        try {
          if (DEBUG_MODE) {
            this._saveDebugData(retailerKey, `network-response-${Date.now()}`, response);
          }
          
          if (response.url.includes('/search') || 
              response.url.includes('graphql') || 
              response.url.includes('api') || 
              response.url.includes('products')) {
            
            const jsonData = JSON.parse(response.body);
            
            // Use retailer-specific parsers
            const parseMethod = `_parse${retailerKey.charAt(0).toUpperCase() + retailerKey.slice(1)}ApiResponse`;
            
            if (this[parseMethod]) {
              const parsedProducts = this[parseMethod](jsonData);
              
              if (parsedProducts && parsedProducts.length > 0) {
                console.log(`Found ${parsedProducts.length} products in network response`);
                products = parsedProducts;
                break;
              }
            }
          }
        } catch (error) {
          console.warn(`Error processing network response: ${error.message}`);
        }
      }
      
      // Fallback to DOM scraping if no products found from network
      if (products.length === 0) {
        console.log('No products from network responses, trying DOM extraction');
        products = await this._extractProductsFromDOM(page, retailerKey);
      }
      
      await context.close();
      return products;
      
    } catch (error) {
      console.error(`Headless browser error for ${retailerKey}:`, error);
      await context.close();
      throw error;
    }
  }

  /**
   * Handle cookie consent banners for different retailers
   * @param {Object} page - Playwright page object
   * @param {string} retailerKey - Retailer key
   * @private
   */
  async _handleCookieBanner(page, retailerKey) {
    try {
      // Wait a bit for cookie banner to appear
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Common accept button selectors
      const acceptSelectors = [
        // Generic
        'button:has-text("Accept")',
        'button:has-text("Accept All")',
        'button:has-text("I Agree")',
        'button:has-text("Allow")',
        'button:has-text("OK")',
        
        // Amazon
        '#sp-cc-accept',
        
        // Flipkart
        '._2KpZ6l._2doB4z',
        
        // Croma
        '.cookie-accept-button',
        
        // Retailer-specific selectors
        '[aria-label="Accept cookies"]',
        '.cookie-consent-accept'
      ];
      
      // Try each selector
      for (const selector of acceptSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`Found cookie consent button with selector "${selector}"`);
            
            // Add a small delay before clicking
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
            
            await button.click();
            console.log('Clicked cookie consent button');
            
            // Wait a bit for the banner to disappear
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    } catch (error) {
      console.warn(`Error handling cookie banner: ${error.message}`);
      // Continue execution, this is not critical
    }
  }

  /**
   * Extract products from DOM using page scraping
   * @param {Object} page - Playwright page object
   * @param {string} retailerKey - Retailer key
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _extractProductsFromDOM(page, retailerKey) {
    console.log(`Extracting products from DOM for ${retailerKey}...`);
    
    let products = [];
    
    try {
      // Use retailer-specific selectors
      const selectors = {
        amazon: {
          container: '[data-component-type="s-search-result"], .sg-col-4-of-12',
          title: 'h2 .a-link-normal, h2 span.a-text-normal',
          price: '.a-price .a-offscreen, .a-price-whole',
          originalPrice: '.a-text-price .a-offscreen',
          image: '.s-image',
          link: 'h2 a.a-link-normal',
          rating: '.a-icon-star-small .a-icon-alt'
        },
        flipkart: {
          container: '._1AtVbE, ._4ddWXP, div._2kHMtA',
          title: 'div._4rR01T, a.s1Q9rs, ._2B099V',
          price: '._30jeq3',
          originalPrice: '._3I9_wc',
          image: '._396cs4',
          link: 'a._1fQZEK, a.s1Q9rs',
          rating: '._3LWZlK'
        },
        meesho: {
          container: '[data-testid="product-container"]',
          title: '[data-testid="product-name"]',
          price: '[data-testid="product-price"]',
          originalPrice: '[data-testid="product-strike-price"]',
          image: '[data-testid="product-image"]',
          link: '[data-testid="product-card-link"]',
          rating: '[data-testid="product-rating"]'
        },
        croma: {
          container: '.product-item, .cp-card',
          title: '.product-title, h3 a',
          price: '.pdpPrice, .cp-price',
          originalPrice: '.old-price, .strike-price',
          image: '.product-img img',
          link: '.product-title a',
          rating: '.rating-value'
        },
        relianceDigital: {
          container: '.sp.grid, .product-grid, .pl__container',
          title: '.sp__name',
          price: '.sp__price',
          originalPrice: '.sp__price--old',
          image: '.productImg img',
          link: '.pl__container a',
          rating: '.SP__ratings'
        }
      };
      
      const retailerSelectors = selectors[retailerKey];
      
      if (!retailerSelectors) {
        throw new Error(`No DOM selectors defined for ${retailerKey}`);
      }
      
      // Use Playwright evaluation to extract products
      products = await page.evaluate((selectors) => {
        const extractedProducts = [];
        const containers = document.querySelectorAll(selectors.container);
        
        for (let i = 0; i < containers.length && i < 20; i++) {
          const container = containers[i];
          
          // Title
          const titleEl = container.querySelector(selectors.title);
          const title = titleEl ? titleEl.innerText.trim() : null;
          
          // Price
          const priceEl = container.querySelector(selectors.price);
          const price = priceEl ? priceEl.innerText.trim().replace(/[^\d,.]/g, '') : null;
          
          // Original price
          const originalPriceEl = container.querySelector(selectors.originalPrice);
          const originalPrice = originalPriceEl ? 
            originalPriceEl.innerText.trim().replace(/[^\d,.]/g, '') : null;
          
          // Image
          const imageEl = container.querySelector(selectors.image);
          const imageUrl = imageEl ? imageEl.getAttribute('src') : null;
          
          // Link
          const linkEl = container.querySelector(selectors.link);
          const link = linkEl ? linkEl.getAttribute('href') : null;
          
          // Rating
          const ratingEl = container.querySelector(selectors.rating);
          const ratingText = ratingEl ? ratingEl.innerText.trim() : null;
          const rating = ratingText ? parseFloat(ratingText.split(' ')[0]) : null;
          
          // Create product object
          if (title && price) {
            extractedProducts.push({
              id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
              name: title,
              price: price,
              originalPrice: originalPrice,
              imageUrl: imageUrl,
              url: link,
              retailer: retailerKey.charAt(0).toUpperCase() + retailerKey.slice(1),
              rating: rating
            });
          }
        }
        
        return extractedProducts;
      }, retailerSelectors);
      
      console.log(`Extracted ${products.length} products from DOM`);
      
    } catch (error) {
      console.error(`Error extracting products from DOM: ${error.message}`);
    }
    
    return products;
  }

  /**
   * Extract JSON data from HTML
   * @param {string} html - HTML content
   * @param {string} retailerKey - Retailer key
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _extractJsonFromHtml(html, retailerKey) {
    try {
      const $ = cheerio.load(html);
      let jsonData = null;
      
      // Advanced JSON extraction based on retailer
      switch (retailerKey) {
        case 'flipkart': 
          // Look for Flipkart's INITIAL_STATE
          const scripts = $('script').filter((i, el) => {
            return $(el).html().includes('window.__INITIAL_STATE__') || 
                  $(el).html().includes('INITIAL_DATA');
          });
          
          scripts.each((i, el) => {
            const script = $(el).html();
            
            // Try Flipkart's __INITIAL_STATE__
            const stateMatch = script.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s);
            if (stateMatch && stateMatch[1]) {
              try {
                const stateData = JSON.parse(stateMatch[1]);
                if (stateData && stateData.pageDataV4 && stateData.pageDataV4.page) {
                  const productData = stateData.pageDataV4.page.data;
                  if (productData && productData.products) {
                    console.log('Found product data in __INITIAL_STATE__');
                    jsonData = this._parseFlipkartApiResponse({
                      RESPONSE: { products: productData.products }
                    });
                  }
                }
              } catch (e) {
                console.warn('Error parsing Flipkart INITIAL_STATE:', e.message);
              }
            }
          });
          break;
          
        case 'meesho':
          // Look for Meesho's GraphQL response in script
          const meeshoScripts = $('script[id="__NEXT_DATA__"]');
          if (meeshoScripts.length > 0) {
            try {
              const scriptContent = meeshoScripts.html();
              const data = JSON.parse(scriptContent);
              
              // Navigate through Meesho Next.js data structure
              if (data && data.props && data.props.pageProps && 
                  data.props.pageProps.initialState && 
                  data.props.pageProps.initialState.search) {
                
                const searchResults = data.props.pageProps.initialState.search.results;
                if (searchResults && Array.isArray(searchResults.products)) {
                  jsonData = searchResults.products.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    originalPrice: item.originalPrice,
                    imageUrl: item.images[0],
                    url: `https://www.meesho.com/${item.slug}/${item.id}`,
                    retailer: 'Meesho',
                    rating: item.rating
                  }));
                }
              }
            } catch (e) {
              console.warn('Error parsing Meesho NEXT_DATA:', e.message);
            }
          }
          break;
          
        case 'amazon':
          // Try to find Amazon's search data
          const amazonScripts = $('script').filter((i, el) => {
            const content = $(el).html();
            return content.includes('window.aodJSONData') || 
                  content.includes('data["search-result-data"]') ||
                  content.includes('window.SEARCH_PAGESTATE');
          });
          
          amazonScripts.each((i, el) => {
            try {
              const content = $(el).html();
              
              // Try different patterns
              const patterns = [
                /data\["search-results-data"\]\s*=\s*({.+?});/s,
                /window\.s\s*=\s*({.+?});\s*window\.Search\./s,
                /SEARCH_PAGESTATE\s*=\s*({.+?});\s*</s,
                /aodJSONData\s*=\s*({.+?});\s*</s
              ];
              
              for (const pattern of patterns) {
                const match = content.match(pattern);
                if (match && match[1]) {
                  try {
                    const data = JSON.parse(match[1]);
                    
                    // Navigate Amazon data structure
                    let products = null;
                    
                    if (data.asin_data) {
                      // Format 1
                      products = Object.values(data.asin_data);
                    } else if (data.results && Array.isArray(data.results.results)) {
                      // Format 2
                      products = data.results.results;
                    } else if (data.products) {
                      // Format 3
                      products = data.products;
                    }
                    
                    if (products && products.length > 0) {
                      jsonData = products.map(item => ({
                        id: item.asin || item.id,
                        name: item.title || item.name,
                        price: item.price?.value || item.price,
                        originalPrice: item.listPrice?.value || item.originalPrice,
                        imageUrl: item.imageUrl || item.image,
                        url: item.detailPageUrl ? `https://www.amazon.in${item.detailPageUrl}` : null,
                        retailer: 'Amazon',
                        rating: item.rating
                      }));
                      
                      if (jsonData.length > 0) break;
                    }
                  } catch (e) {
                    // Try next pattern
                  }
                }
              }
            } catch (e) {
              // Try next script
            }
          });
          break;
      }
      
      return jsonData;
    } catch (error) {
      console.error(`Error extracting JSON from HTML: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse Amazon API response
   * @param {Object} data - Response data
   * @returns {Array} - Array of products
   * @private
   */
  _parseAmazonApiResponse(data) {
    try {
      let products = [];
      
      // Handle different Amazon response formats
      if (data.search && data.search.results) {
        // Format 1: GraphQL response
        products = data.search.results;
      } else if (data.results && Array.isArray(data.results)) {
        // Format 2: Search API response
        products = data.results;
      } else if (data.suggestions) {
        // Format 3: Autocomplete API response
        products = data.suggestions;
      } else if (data.widgets) {
        // Format 4: Widget API response
        const searchWidgets = data.widgets.filter(w => 
          w.widgetId && (w.widgetId.includes('search') || w.widgetId.includes('result'))
        );
        
        if (searchWidgets.length > 0) {
          for (const widget of searchWidgets) {
            if (widget.items && Array.isArray(widget.items)) {
              products = [...products, ...widget.items];
            }
          }
        }
      }
      
      // Map products to standard format
      if (products.length > 0) {
        return products.map(item => {
          // Extract data from various formats
          const id = item.asin || item.productId || item.strategyId || 
                   (item.entityId ? item.entityId.split('/').pop() : '');
          const name = item.title || item.name || item.value || item.displayTitle || '';
          const price = item.price?.value || item.price || item.displayPrice || '';
          const originalPrice = item.listPrice?.value || item.originalPrice || '';
          const imageUrl = item.imageUrl || item.image || item.displayImage || 
                         (item.images && item.images.length > 0 ? item.images[0] : '');
          const url = item.detailPageUrl || item.url || `https://www.amazon.in/dp/${id}`;
          const rating = item.rating || (item.reviews?.rating || 0);
          
          return {
            id,
            name,
            price: typeof price === 'string' ? price.replace(/[^\d,.]/g, '') : price.toString(),
            originalPrice: originalPrice ? (typeof originalPrice === 'string' ? 
                          originalPrice.replace(/[^\d,.]/g, '') : originalPrice.toString()) : '',
            imageUrl,
            url: url.startsWith('http') ? url : `https://www.amazon.in${url}`,
            retailer: 'Amazon',
            rating
          };
        });
      }
    } catch (error) {
      console.error('Error parsing Amazon API response:', error.message);
    }
    
    return [];
  }
  
  /**
   * Parse Flipkart API response
   * @param {Object} data - Response data
   * @returns {Array} - Array of products
   * @private
   */
  _parseFlipkartApiResponse(data) {
    try {
      let products = [];
      
      // Handle different Flipkart response formats
      if (data.RESPONSE && data.RESPONSE.products) {
        // Format 1: Direct search API response
        products = data.RESPONSE.products;
      } else if (data.data && data.data.searchByQuery) {
        // Format 2: GraphQL response
        products = data.data.searchByQuery.products;
      } else if (data.pageDataV4 && data.pageDataV4.page && data.pageDataV4.page.data) {
        // Format 3: Initial state data
        products = data.pageDataV4.page.data.products;
      }
      
      // Map products to standard format
      if (products.length > 0) {
        return products.map(item => {
          // Extract data from various formats
          const id = item.productId || item.id || '';
          const name = item.name || item.title || item.productName || '';
          const price = item.price || 
                      (item.pricing && item.pricing.finalPrice) || 
                      (item.productInfo && item.productInfo.value) || '';
          const originalPrice = item.originalPrice || 
                              (item.pricing && item.pricing.mrp) || 
                              (item.productInfo && item.productInfo.value) || '';
          const imageUrl = (item.images && item.images.length > 0 ? item.images[0] : '') || 
                         (item.image && (item.image.url || item.image)) || 
                         item.imageUrl || '';
          const url = item.url || 
                    (item.productUrl ? (item.productUrl.url || item.productUrl) : '') || 
                    `/product/${id}` || '';
          const rating = item.rating || 
                       (item.ratingInfo && item.ratingInfo.average) || 0;
          
          return {
            id,
            name,
            price: typeof price === 'string' ? price.replace(/[^\d,.]/g, '') : price.toString(),
            originalPrice: originalPrice ? (typeof originalPrice === 'string' ? 
                          originalPrice.replace(/[^\d,.]/g, '') : originalPrice.toString()) : '',
            imageUrl,
            url: url.startsWith('http') ? url : `https://www.flipkart.com${url}`,
            retailer: 'Flipkart',
            rating
          };
        });
      }
    } catch (error) {
      console.error('Error parsing Flipkart API response:', error.message);
    }
    
    return [];
  }

  /**
   * Parse Croma API response
   * @param {Object} data - Response data
   * @returns {Array} - Array of products
   * @private
   */
  _parseCromaApiResponse(data) {
    try {
      let products = [];
      
      // Handle different Croma response formats
      if (data.products) {
        // Format 1: Direct API response
        products = data.products;
      } else if (data.results) {
        // Format 2: Search results
        products = data.results;
      }
      
      // Map products to standard format
      if (products.length > 0) {
        return products.map(item => {
          // Extract data from various formats
          const id = item.productId || item.code || '';
          const name = item.name || item.title || '';
          let price = '';
          let originalPrice = '';
          
          // Extract price data from various possible formats
          if (item.price) {
            if (item.price.sellingPrice) {
              price = item.price.sellingPrice.formattedValue || item.price.sellingPrice.value;
            } else {
              price = item.price;
            }
            
            if (item.price.mrp) {
              originalPrice = item.price.mrp.formattedValue || item.price.mrp.value;
            }
          } else if (item.mrp) {
            originalPrice = item.mrp;
            if (item.salesPrice) {
              price = item.salesPrice;
            }
          }
          
          const imageUrl = item.plpImage || 
                         (item.images && item.images.length > 0 ? item.images[0] : '') || 
                         item.image || '';
          const url = item.url || item.pdpUrl || `/p/${id}`;
          const rating = item.rating || (item.ratings && item.ratings.averageRating) || 0;
          
          return {
            id,
            name,
            price: typeof price === 'string' ? price.replace(/[^\d,.]/g, '') : price.toString(),
            originalPrice: originalPrice ? (typeof originalPrice === 'string' ? 
                          originalPrice.replace(/[^\d,.]/g, '') : originalPrice.toString()) : '',
            imageUrl,
            url: url.startsWith('http') ? url : `https://www.croma.com${url}`,
            retailer: 'Croma',
            rating
          };
        });
      }
    } catch (error) {
      console.error('Error parsing Croma API response:', error.message);
    }
    
    return [];
  }
  
  /**
   * Parse Meesho API response
   * @param {Object} data - Response data
   * @returns {Array} - Array of products
   * @private
   */
  _parseMeeshoApiResponse(data) {
    try {
      let products = [];
      
      // Handle different Meesho response formats
      if (data.data && data.data.searchByQuery && data.data.searchByQuery.products) {
        // Format 1: GraphQL response
        products = data.data.searchByQuery.products;
      } else if (data.data && data.data.products) {
        // Format 2: REST API response
        products = data.data.products;
      }
      
      // Map products to standard format
      if (products.length > 0) {
        return products.map(item => {
          // Extract data
          const id = item.id || '';
          const name = item.name || '';
          const price = item.price || '';
          const originalPrice = item.originalPrice || '';
          const imageUrl = (item.images && item.images.length > 0 ? item.images[0] : '') || 
                        (item.media && item.media.url) || '';
          const url = `/product/${item.slug || 'product'}/${id}`;
          const rating = item.rating || 0;
          
          return {
            id,
            name,
            price: price.toString(),
            originalPrice: originalPrice ? originalPrice.toString() : '',
            imageUrl,
            url: `https://www.meesho.com${url}`,
            retailer: 'Meesho',
            rating
          };
        });
      }
    } catch (error) {
      console.error('Error parsing Meesho API response:', error.message);
    }
    
    return [];
  }
  
  /**
   * Parse Reliance Digital API response
   * @param {Object} data - Response data
   * @returns {Array} - Array of products
   * @private
   */
  _parseRelianceDigitalApiResponse(data) {
    try {
      let products = [];
      
      // Handle different Reliance Digital response formats
      if (data.products) {
        // Format 1: Direct API response
        products = data.products;
      } else if (data.suggestions) {
        // Format 2: Autocomplete API
        products = data.suggestions;
      }
      
      // Map products to standard format
      if (products.length > 0) {
        return products.map(item => {
          // Extract data
          const id = item.productId || item.id || '';
          const name = item.name || item.displayName || '';
          const price = item.price || item.listPrice || '';
          const originalPrice = item.mrp || item.mrpPrice || '';
          const imageUrl = item.imageUrl || item.image || '';
          const url = item.url || item.pdpUrl || `/product/${id}`;
          const rating = item.rating || (item.averageRating) || 0;
          
          return {
            id,
            name,
            price: typeof price === 'string' ? price.replace(/[^\d,.]/g, '') : price.toString(),
            originalPrice: originalPrice ? (typeof originalPrice === 'string' ? 
                          originalPrice.replace(/[^\d,.]/g, '') : originalPrice.toString()) : '',
            imageUrl,
            url: url.startsWith('http') ? url : `https://www.reliancedigital.in${url}`,
            retailer: 'Reliance Digital',
            rating
          };
        });
      }
    } catch (error) {
      console.error('Error parsing Reliance Digital API response:', error.message);
    }
    
    return [];
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