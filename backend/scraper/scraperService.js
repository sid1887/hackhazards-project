/**
 * Scraper Service
 * Handles orchestration of different scraping strategies and retries
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const retailerConfigs = require('./retailerScrapers');
const DirectApiService = require('./directApiService');
const PlaywrightService = require('./improvedPlaywright');

// Debug mode configuration
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
const DEBUG_DIR = path.join(__dirname, '../../debug');

// Ensure debug directory exists if DEBUG_MODE is enabled
if (DEBUG_MODE && !fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

class ScraperService {
  constructor() {
    this.directApiService = DirectApiService; // Use the imported instance directly
    this.playwrightService = PlaywrightService.playwrightManager; // Use the playwrightManager from the imported object
    this.retailers = Object.keys(retailerConfigs);
    
    // Configuration for maximum retries and delay between retries
    this.maxRetries = 3;
    this.retryDelayMs = 1500;
    
    // Track IP ban status for each retailer
    this.retailerStatus = {};
    this.retailers.forEach(retailer => {
      this.retailerStatus[retailer] = {
        ipBanned: false,
        lastSuccessful: null,
        consecutiveFailures: 0,
        cooldownUntil: null
      };
    });
  }

  /**
   * Initialize the scraper service
   * @returns {Promise<void>}
   */
  async init() {
    await this.playwrightService.initBrowsers(['chromium']); // Changed from initialize() to initBrowsers(['chromium'])
    console.log('Scraper Service initialized successfully');
  }

  /**
   * Search for a product across all retailers
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Search results grouped by retailer
   */
  async searchProduct(query) {
    console.log(`Searching for product: ${query}`);
    const results = {};
    const promises = [];
    const requestId = uuidv4();

    // Execute searches for each retailer in parallel
    for (const retailer of this.retailers) {
      promises.push(
        this.searchRetailerWithFallback(retailer, query, requestId)
          .then(retailerResults => {
            results[retailer] = retailerResults;
          })
          .catch(error => {
            console.error(`Error searching ${retailer}:`, error.message);
            results[retailer] = [];
          })
      );
    }

    await Promise.all(promises);
    return results;
  }

  /**
   * Search a specific retailer with fallback strategies
   * @param {string} retailer - Retailer key
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Array>} - Array of products
   */
  async searchRetailerWithFallback(retailer, query, requestId) {
    // Skip if this retailer is in cooldown period due to IP ban or excessive failures
    if (this.isRetailerInCooldown(retailer)) {
      console.log(`Skipping ${retailer} - currently in cooldown period`);
      return [];
    }

    // Try different strategies with retry logic
    let results = [];
    let error = null;
    let retryCount = 0;
    
    // Array of strategies to try in order
    const strategies = [
      { name: 'directApi', fn: () => this.directApiService.searchByApi(retailer, query, requestId) },
      { name: 'headlessBrowser', fn: () => this.directApiService._tryHeadlessBrowserSniffing(retailer, query, requestId) },
      { name: 'playwright', fn: () => this.playwrightService.searchWithPlaywright(retailer, query, requestId) }
    ];
    
    for (const strategy of strategies) {
      if (results.length > 0) break; // Stop if we already have results
      
      retryCount = 0;
      while (retryCount < this.maxRetries) {
        try {
          console.log(`Trying ${strategy.name} strategy for ${retailer} (attempt ${retryCount + 1})`);
          results = await strategy.fn();
          
          if (results && results.length > 0) {
            console.log(`Successfully retrieved ${results.length} results from ${retailer} using ${strategy.name} strategy`);
            this.updateRetailerStatus(retailer, true);
            break;
          }
          
          retryCount++;
          if (retryCount < this.maxRetries) {
            await this.delay(this.retryDelayMs * (retryCount + 1)); // Exponential backoff
          }
        } catch (e) {
          error = e;
          console.error(`Error in ${strategy.name} strategy for ${retailer}:`, e.message);
          
          // Check for IP ban or CAPTCHA related errors
          if (this.isIpBanError(e, retailer)) {
            this.markRetailerIpBanned(retailer);
            break; // Stop retrying this strategy
          }
          
          retryCount++;
          if (retryCount < this.maxRetries) {
            await this.delay(this.retryDelayMs * (retryCount + 1)); // Exponential backoff
          }
        }
      }
      
      if (results && results.length > 0) break; // Stop trying other strategies if we have results
    }
    
    // Update status if all strategies failed
    if (results.length === 0) {
      this.updateRetailerStatus(retailer, false);
    }
    
    return results;
  }
  
  /**
   * Check if a retailer is currently in cooldown period
   * @param {string} retailer - Retailer key
   * @returns {boolean} - Whether the retailer is in cooldown
   * @private
   */
  isRetailerInCooldown(retailer) {
    const status = this.retailerStatus[retailer];
    if (!status) return false;
    
    if (status.cooldownUntil && status.cooldownUntil > new Date()) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Mark a retailer as IP banned and set cooldown period
   * @param {string} retailer - Retailer key
   * @private
   */
  markRetailerIpBanned(retailer) {
    const status = this.retailerStatus[retailer];
    if (!status) return;
    
    status.ipBanned = true;
    status.consecutiveFailures++;
    
    // Calculate cooldown time based on consecutive failures (exponential backoff)
    // Start with 10 minutes, increase exponentially up to 4 hours
    const cooldownMinutes = Math.min(10 * Math.pow(2, status.consecutiveFailures - 1), 240);
    const cooldownMs = cooldownMinutes * 60 * 1000;
    
    status.cooldownUntil = new Date(Date.now() + cooldownMs);
    console.log(`${retailer} marked as IP banned or rate limited. Cooldown for ${cooldownMinutes} minutes until ${status.cooldownUntil}`);
  }
  
  /**
   * Update retailer status after an attempt
   * @param {string} retailer - Retailer key
   * @param {boolean} success - Whether the attempt was successful
   * @private
   */
  updateRetailerStatus(retailer, success) {
    const status = this.retailerStatus[retailer];
    if (!status) return;
    
    if (success) {
      status.lastSuccessful = new Date();
      status.consecutiveFailures = 0;
      status.ipBanned = false;
      status.cooldownUntil = null;
    } else {
      status.consecutiveFailures++;
      
      // If too many consecutive failures, assume rate limiting and set a cooldown
      if (status.consecutiveFailures >= 3) {
        const cooldownMinutes = Math.min(5 * Math.pow(2, status.consecutiveFailures - 3), 120);
        const cooldownMs = cooldownMinutes * 60 * 1000;
        status.cooldownUntil = new Date(Date.now() + cooldownMs);
        
        console.log(`${retailer} failed ${status.consecutiveFailures} times in a row. Cooldown for ${cooldownMinutes} minutes.`);
      }
    }
  }
  
  /**
   * Check if an error indicates an IP ban or CAPTCHA challenge
   * @param {Error} error - The error to check
   * @param {string} retailer - Retailer key
   * @returns {boolean} - Whether this appears to be an IP ban error
   * @private
   */
  isIpBanError(error, retailer) {
    const errorMsg = error.message.toLowerCase();
    
    // Generic indicators of IP blocking or CAPTCHA
    const ipBanIndicators = [
      'captcha', 
      'robot', 
      'automated', 
      'blocked', 
      'access denied',
      'too many requests',
      '429',
      '403',
      'rate limit',
      'forbidden',
      'unusual traffic'
    ];
    
    // Check for generic indicators
    for (const indicator of ipBanIndicators) {
      if (errorMsg.includes(indicator)) {
        return true;
      }
    }
    
    // Retailer-specific checks
    if (retailer === 'amazon' && 
        (errorMsg.includes('sorry') || errorMsg.includes('to verify'))) {
      return true;
    }
    
    if (retailer === 'flipkart' && 
        (errorMsg.includes('unusual activity') || errorMsg.includes('verify'))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Utility method to create a delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async shutdown() {
    await this.playwrightService.close();
    console.log('Scraper Service shut down successfully');
  }
}

// Export an instance of the class instead of the class itself
module.exports = new ScraperService();