/**
 * Enhanced Scraper Service
 * Provides multiple scraping strategies with fallbacks and parallelization
 */

const { Worker } = require('worker_threads');
const path = require('path');
const crypto = require('crypto');
const directApiService = require('./directApiService');
const pLimit = require('p-limit');
const NodeCache = require('node-cache');

/**
 * ScraperService - Manages product scraping operations with tiered approach:
 * 1. Direct API calls (fastest, ~200ms)
 * 2. Headless browser with network sniffing (~1s)
 * 3. Fallback to DOM scraping (~2-3s)
 */
class ScraperService {
  constructor() {
    this.requestLimiter = pLimit(5); // Maximum concurrent scraper operations
    this.workerLimiter = pLimit(3); // Maximum concurrent worker threads per retailer
    
    // Request cache with 5-minute TTL
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60, // Check for expired keys every minute
      maxKeys: 1000
    });

    // Known retailers
    this.retailers = [
      'amazon',
      'flipkart',
      'meesho',
      'croma',
      'relianceDigital'
    ];
  }
  
  /**
   * Search for products across multiple retailers
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Search results
   */
  async searchProducts(query) {
    console.log(`Starting product search for "${query}"...`);
    const startTime = Date.now();
    
    // Generate a unique request ID
    const requestId = crypto.randomUUID();
    
    // Check cache first
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    const cachedResults = this.cache.get(cacheKey);
    
    if (cachedResults) {
      console.log(`Cache hit for "${query}", returning cached results`);
      return {
        ...cachedResults,
        source: 'cache',
        cached: true
      };
    }

    try {
      // First attempt: Try direct API for all retailers in parallel
      console.log('Trying direct API service first');
      const directApiResults = await directApiService.searchProducts(query);
      
      if (directApiResults.success && directApiResults.products.length > 0) {
        console.log(`Direct API service found ${directApiResults.products.length} products in ${directApiResults.executionTime}ms`);
        
        // Cache the results
        this.cache.set(cacheKey, directApiResults);
        
        return directApiResults;
      }

      // Extract which retailers failed in the direct API service
      const failedRetailers = directApiResults.failedRetailers || this.retailers;
      const allProducts = directApiResults.products || [];
      
      // For failed retailers, try scraper workers in parallel
      console.log(`Direct API failed for ${failedRetailers.length} retailers, trying scraper workers`);
      
      if (failedRetailers.length > 0) {
        const scraperPromises = failedRetailers.map(retailer => 
          this.requestLimiter(() => this._scrapeRetailer(retailer, query, requestId))
        );
        
        const scraperResults = await Promise.allSettled(scraperPromises);
        
        // Process scraper results
        const scrapedRetailers = [];
        
        scraperResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            const { products, retailer } = result.value;
            
            if (products && products.length > 0) {
              scrapedRetailers.push(retailer);
              allProducts.push(...products);
              console.log(`Successfully scraped ${products.length} products from ${retailer}`);
            }
          } else {
            console.error(`Scraping failed for ${failedRetailers[index]}:`, 
              result.reason || (result.value ? result.value.error : 'Unknown error'));
          }
        });
        
        // Prepare final results
        const combinedResults = {
          success: allProducts.length > 0,
          products: allProducts,
          count: allProducts.length,
          query,
          scrapedRetailers: [...(directApiResults.scrapedRetailers || []), ...scrapedRetailers],
          executionTime: Date.now() - startTime
        };
        
        // Cache successful results
        if (combinedResults.success) {
          this.cache.set(cacheKey, combinedResults);
        }
        
        return combinedResults;
      }
      
      return directApiResults;
    } catch (error) {
      console.error('Error in product search:', error.message);
      return {
        success: false,
        error: error.message,
        query
      };
    }
  }
  
  /**
   * Scrape a specific retailer using worker threads
   * @param {string} retailer - Retailer name
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Object>} - Scraper results
   * @private
   */
  async _scrapeRetailer(retailer, query, requestId) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Starting scraper worker for ${retailer}`);
        
        const worker = new Worker(path.join(__dirname, 'scraperWorker.js'), {
          workerData: { retailer, query, requestId }
        });
        
        // Handle worker messages
        worker.on('message', message => {
          resolve(message);
        });
        
        // Handle worker errors
        worker.on('error', error => {
          console.error(`Worker error for ${retailer}:`, error);
          reject(error);
        });
        
        // Handle worker exit
        worker.on('exit', code => {
          if (code !== 0) {
            const error = new Error(`Worker for ${retailer} exited with code ${code}`);
            console.error(error.message);
            reject(error);
          }
        });
        
        // Add timeout to kill worker if it takes too long
        setTimeout(() => {
          try {
            worker.terminate();
            reject(new Error(`Scraper worker for ${retailer} timed out after 30s`));
          } catch (e) {
            // Ignore errors during termination
          }
        }, 30000);
      } catch (error) {
        console.error(`Error creating worker for ${retailer}:`, error);
        reject(error);
      }
    });
  }
}

// Create singleton instance
const scraperService = new ScraperService();

module.exports = scraperService;