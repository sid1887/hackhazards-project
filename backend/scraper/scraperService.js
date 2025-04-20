/**
 * Enhanced Scraper Service
 * Provides multiple scraping strategies with fallbacks and parallelization
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Worker } = require('worker_threads');
const { cpus } = require('os');
const { firefox } = require('playwright');
const { PuppeteerCrawler, CheerioCrawler, RequestList } = require('crawlee');
const { gotScraping } = require('got-scraping');
const crypto = require('crypto');
const pRetry = require('p-retry');
const UserAgent = require('user-agents');
const { parse } = require('node-html-parser');
const cheerio = require('cheerio');

// Import custom modules
const PlaywrightManager = require('./improvedPlaywright');
const DirectApiService = require('./directApiService');

// Configuration
const DEBUG_MODE = process.env.DEBUG_SCRAPING === 'true';
const NUM_WORKERS = Math.max(1, Math.min(cpus().length - 1, 4)); // Use all cores minus one, max 4
const ENABLE_FALLBACKS = process.env.ENABLE_FALLBACKS !== 'false';
const PARALLEL_RETAILERS = parseInt(process.env.PARALLEL_RETAILERS || '3'); // Default: 3 retailers in parallel

/**
 * Main Scraper Service class that manages different scraping strategies
 */
class ScraperService {
  constructor() {
    this.workerPool = [];
    this.playwrightManager = PlaywrightManager;
    this.directApiService = DirectApiService;
    this.workerPath = path.join(__dirname, 'scraperWorker.js');
    
    // Initialize browser pool for reuse
    this.initializeBrowsers();
    
    // Supported retailers and their configurations
    this.retailers = {
      amazon: {
        name: 'Amazon',
        url: (query) => `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
        selectors: {
          products: '[data-component-type="s-search-result"]',
          name: '.a-link-normal .a-text-normal',
          price: '.a-price .a-offscreen',
          originalPrice: '.a-text-price .a-offscreen',
          image: '.s-image',
          rating: 'i.a-icon-star-small .a-icon-alt',
          link: 'a.a-link-normal.a-text-normal'
        },
        priority: 1
      },
      flipkart: {
        name: 'Flipkart',
        url: (query) => `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`,
        selectors: {
          products: '._1AtVbE ._13oc-S',
          name: '._4rR01T, ._2WkVRV',
          price: '._30jeq3',
          originalPrice: '._3I9_wc',
          image: '._396cs4',
          rating: '._1lRcqv ._3LWZlK',
          link: '._1fQZEK, ._2rpwqI'
        },
        priority: 2
      },
      meesho: {
        name: 'Meesho',
        url: (query) => `https://www.meesho.com/search?q=${encodeURIComponent(query)}`,
        selectors: {
          products: '.ProductList__GridCol',
          name: '.NewProductCard__ProductName__cJGJx',
          price: '.NewProductCard__DiscountedPriceText',
          originalPrice: '.NewProductCard__MRPText',
          image: '.NewProductCard__Image',
          link: 'a[href^="/"]'
        },
        priority: 3
      },
      croma: {
        name: 'Croma',
        url: (query) => `https://www.croma.com/search/?text=${encodeURIComponent(query)}`,
        selectors: {
          products: '.product-list .product-item',
          name: '.product-title',
          price: '.new-price',
          originalPrice: '.old-price',
          image: '.product-img img',
          rating: '.rating .plp-ratings-count',
          link: '.product-title a'
        },
        priority: 4
      },
      relianceDigital: {
        name: 'Reliance Digital',
        url: (query) => `https://www.reliancedigital.in/search?q=${encodeURIComponent(query)}:relevance`,
        selectors: {
          products: '.sp .grid',
          name: '.sp__name',
          price: '.sp__price',
          originalPrice: '.sp__price--old',
          image: '.img-responsive',
          rating: '.dynamic-stars',
          link: '.sp a'
        },
        priority: 5
      }
    };
  }

  /**
   * Initialize browser instances for improved performance
   */
  async initializeBrowsers() {
    try {
      // Pre-initialize Playwright browsers
      await this.playwrightManager.initBrowsers(['chromium', 'firefox']);
      console.log('Browser instances initialized successfully');
    } catch (error) {
      console.error('Error initializing browsers:', error);
    }
  }

  /**
   * Create a worker to run in a separate thread
   * @param {Object} data - Data to pass to the worker
   * @returns {Promise<Object>} - Worker results
   */
  createWorker(data) {
    return new Promise((resolve, reject) => {
      try {
        // Check if worker file exists
        if (!fs.existsSync(this.workerPath)) {
          throw new Error(`Worker script not found: ${this.workerPath}`);
        }

        const worker = new Worker(this.workerPath, { workerData: data });
        
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
        
        return worker;
      } catch (error) {
        console.error('Error creating worker:', error);
        reject(error);
      }
    });
  }

  /**
   * Search for products across multiple retailers using multiple strategies
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Search results with products from various retailers
   */
  async searchProduct(query) {
    console.log(`Searching for products matching "${query}" across retailers`);
    
    // Track performance
    const startTime = Date.now();
    
    // Try direct API calls first (fastest method)
    console.log('Trying direct API integration first...');
    try {
      const apiResults = await this.directApiService.searchProducts(query);
      
      if (apiResults.success && apiResults.products && apiResults.products.length > 0) {
        console.log(`Found ${apiResults.products.length} products via direct API integration`);
        
        const endTime = Date.now();
        console.log(`Direct API search completed in ${(endTime - startTime) / 1000}s`);
        
        return {
          ...apiResults,
          source: 'direct_api',
          executionTime: endTime - startTime
        };
      } else {
        console.log('Direct API search did not find enough results, trying browser methods...');
      }
    } catch (error) {
      console.error('Error with direct API search:', error.message);
      // Continue with browser-based approaches
    }

    // Fallback to browser-based approaches
    return await this.executeParallelBrowserSearch(query);
  }

  /**
   * Execute parallel browser-based searches
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Search results with products from various retailers
   */
  async executeParallelBrowserSearch(query) {
    console.log('Starting parallel browser search...');
    const startTime = Date.now();
    
    // Get list of retailers sorted by priority
    const retailersList = Object.entries(this.retailers)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([key]) => key);
    
    let allProducts = [];
    const failedRetailers = [];
    const scrapedRetailers = [];
    
    // Execute in batches for controlled parallelism
    for (let i = 0; i < retailersList.length; i += PARALLEL_RETAILERS) {
      const batch = retailersList.slice(i, i + PARALLEL_RETAILERS);
      console.log(`Processing batch of ${batch.length} retailers: ${batch.join(', ')}`);
      
      // Process batch in parallel
      const batchPromises = batch.map(retailerKey => this.scrapeRetailerWithRetries(retailerKey, query));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, index) => {
        const retailer = batch[index];
        
        if (result.status === 'fulfilled' && result.value.success) {
          allProducts = [...allProducts, ...result.value.products];
          scrapedRetailers.push(retailer);
          console.log(`Successfully scraped ${result.value.products.length} products from ${retailer}`);
        } else {
          failedRetailers.push(retailer);
          const errorMsg = result.status === 'rejected' ? result.reason : result.value?.error || 'Unknown error';
          console.error(`Failed to scrape ${retailer}:`, errorMsg);
        }
      });
      
      // Early exit if we already have sufficient results
      if (allProducts.length >= 15) {
        console.log(`Found ${allProducts.length} products, which is sufficient. Stopping search.`);
        break;
      }
    }
    
    // Prepare response
    const results = {
      success: allProducts.length > 0,
      products: allProducts,
      failedRetailers,
      scrapedRetailers,
      count: allProducts.length,
      query
    };
    
    const endTime = Date.now();
    console.log(`Parallel browser search completed in ${(endTime - startTime) / 1000}s`);
    console.log(`Found a total of ${allProducts.length} products from ${scrapedRetailers.length} retailers`);
    
    return {
      ...results,
      source: 'browser',
      executionTime: endTime - startTime
    };
  }

  /**
   * Scrape a specific retailer with retries and fallbacks
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Scraping results
   */
  async scrapeRetailerWithRetries(retailerKey, query) {
    return pRetry(
      async () => {
        // Try different strategies in order of expected speed/reliability
        const strategies = [
          this.scrapeWithPlaywright.bind(this),
          this.scrapeWithCheerioCrawler.bind(this),
          this.scrapeWithPuppeteerCrawler.bind(this)
        ];

        let lastError = null;
        
        // Try each strategy until one succeeds
        for (const strategy of strategies) {
          try {
            console.log(`Trying ${strategy.name} for ${retailerKey}...`);
            const results = await strategy(retailerKey, query);
            
            if (results.success) {
              return results;
            }
          } catch (error) {
            console.warn(`Strategy ${strategy.name} failed for ${retailerKey}:`, error.message);
            lastError = error;
            
            // Add some delay before trying next strategy
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        // If we get here, all strategies failed
        throw lastError || new Error(`All scraping strategies failed for ${retailerKey}`);
      },
      {
        retries: 2, // Try 3 times total (initial + 2 retries)
        onRetry: (error, attemptNumber) => {
          console.log(`Retry attempt ${attemptNumber} for ${retailerKey} due to: ${error.message}`);
        }
      }
    );
  }

  /**
   * Scrape with optimized Playwright
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Scraping results
   */
  async scrapeWithPlaywright(retailerKey, query) {
    console.log(`Scraping ${retailerKey} with Playwright for query "${query}"`);
    
    // Generate search URL
    const retailer = this.retailers[retailerKey];
    if (!retailer) {
      throw new Error(`Retailer ${retailerKey} not supported`);
    }
    
    const searchUrl = retailer.url(query);
    const startTime = Date.now();
    
    // Select a random browser engine
    const browserTypes = ['chromium', 'firefox'];
    const browserType = browserTypes[Math.floor(Math.random() * browserTypes.length)];
    
    // Get or create browser context
    const context = await this.playwrightManager.getBrowserContext(browserType);
    let page = null;
    
    try {
      // Create optimized page with resource blocking
      page = await this.playwrightManager.newOptimizedPage(context, {
        blockResources: true,
        allowedDomains: [retailerKey],
        timeout: 30000 // 30 seconds
      });
      
      // Navigate with retries
      await this.playwrightManager.navigateWithRetries(page, searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000
      });
      
      // Handle cookie consent popups
      await this.playwrightManager.handlePopupsAndConsent(page);
      
      // Wait for products to appear
      await this.playwrightManager.waitForPageContent(page, retailerKey);
      
      // Add small delay to ensure dynamic content is loaded
      await page.waitForTimeout(1000);
      
      // Take debug screenshot if in debug mode
      await this.playwrightManager.takeDebugScreenshot(page, `${retailerKey}-${Date.now()}`);
      
      // Simulate human-like behavior to avoid detection
      await this.playwrightManager.simulateHumanInteraction(page);
      
      // Extract products from the page
      const selectors = retailer.selectors;
      const products = await page.$$eval(selectors.products, (elements, selectors, retailerName) => {
        return elements.slice(0, 20).map(el => {
          // Helper function to safely extract text
          const getText = (element, selector) => {
            try {
              const targetEl = selector ? element.querySelector(selector) : element;
              return targetEl ? targetEl.textContent.trim() : null;
            } catch (e) { 
              return null; 
            }
          };
          
          // Helper function to safely extract attribute
          const getAttribute = (element, selector, attr) => {
            try {
              const targetEl = selector ? element.querySelector(selector) : element;
              return targetEl ? targetEl.getAttribute(attr) : null;
            } catch (e) { 
              return null; 
            }
          };
          
          // Helper function to safely extract href and make it absolute
          const getHref = (element, selector) => {
            try {
              const targetEl = selector ? element.querySelector(selector) : element;
              if (!targetEl) return null;
              const href = targetEl.getAttribute('href');
              if (!href) return null;
              
              // Check if URL is relative and prepend domain if needed
              if (href.startsWith('/')) {
                return window.location.origin + href;
              }
              return href;
            } catch (e) { 
              return null; 
            }
          };
          
          // Extract product data
          const name = getText(el, selectors.name);
          const price = getText(el, selectors.price);
          const originalPrice = getText(el, selectors.originalPrice);
          const imageUrl = getAttribute(el, selectors.image, 'src');
          const link = getHref(el, selectors.link);
          const rating = getText(el, selectors.rating);
          
          return {
            name,
            price: price?.replace(/[^\d,.]/g, ''),
            originalPrice: originalPrice?.replace(/[^\d,.]/g, ''),
            imageUrl,
            url: link,
            retailer: retailerName,
            rating: rating ? parseFloat(rating) : undefined
          };
        }).filter(product => product.name && product.price); // Only return products with name and price
      }, selectors, retailer.name);
      
      const endTime = Date.now();
      console.log(`Playwright scraping for ${retailerKey} completed in ${(endTime - startTime) / 1000}s`);
      
      return {
        success: products.length > 0,
        products,
        retailer: retailerKey,
        executionTime: endTime - startTime
      };
    } catch (error) {
      console.error(`Playwright scraping error for ${retailerKey}:`, error.message);
      throw error;
    } finally {
      // Always close the page to free resources
      if (page) {
        try {
          await page.close();
        } catch (e) {
          // Ignore page close errors
        }
      }
      
      // Run cleanup to prevent memory leaks
      await this.playwrightManager.cleanup();
    }
  }

  /**
   * Scrape with CheerioCrawler (fast HTML parsing without JS rendering)
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Scraping results
   */
  async scrapeWithCheerioCrawler(retailerKey, query) {
    console.log(`Scraping ${retailerKey} with CheerioCrawler for query "${query}"`);
    
    // Generate search URL
    const retailer = this.retailers[retailerKey];
    if (!retailer) {
      throw new Error(`Retailer ${retailerKey} not supported`);
    }
    
    const searchUrl = retailer.url(query);
    const startTime = Date.now();
    const products = [];
    
    try {
      // Create request list with just the search URL
      const requestList = await RequestList.open('search-list', [{
        url: searchUrl,
        userData: { retailerKey, query }
      }]);
      
      // Create and run crawler
      const crawler = new CheerioCrawler({
        requestList,
        maxRequestRetries: 2,
        requestHandlerTimeoutSecs: 30,
        maxConcurrency: 1,
        preNavigationHooks: [
          async ({ request }) => {
            // Add random user agent
            const userAgent = new UserAgent({ deviceCategory: 'desktop' }).toString();
            request.headers['User-Agent'] = userAgent;
            
            // Add additional headers to appear more legitimate
            request.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
            request.headers['Accept-Language'] = 'en-US,en;q=0.5';
            request.headers['Cache-Control'] = 'no-cache';
            request.headers['Pragma'] = 'no-cache';
          }
        ],
        // Handle the response
        async requestHandler({ $, request, response }) {
          const { retailerKey } = request.userData;
          const retailer = this.retailers[retailerKey];
          const selectors = retailer.selectors;
          
          // Save HTML for debugging if needed
          if (DEBUG_MODE) {
            const debugDir = path.join(__dirname, '../../debug');
            if (!fs.existsSync(debugDir)) {
              fs.mkdirSync(debugDir, { recursive: true });
            }
            
            fs.writeFileSync(
              path.join(debugDir, `${retailerKey}-${Date.now()}.html`),
              $.html()
            );
          }
          
          // Extract products
          $(selectors.products).each((i, element) => {
            if (i >= 20) return false; // Limit to 20 products
            
            // Helper function to safely extract text
            const getText = (selector) => {
              try {
                return $(element).find(selector).first().text().trim() || null;
              } catch (e) { 
                return null; 
              }
            };
            
            // Helper function to safely extract attribute
            const getAttribute = (selector, attr) => {
              try {
                return $(element).find(selector).first().attr(attr) || null;
              } catch (e) { 
                return null; 
              }
            };
            
            // Helper function to safely extract href and make it absolute
            const getHref = (selector) => {
              try {
                let href = $(element).find(selector).first().attr('href');
                if (!href) return null;
                
                // Convert relative URL to absolute
                if (href.startsWith('/')) {
                  const urlObj = new URL(request.url);
                  href = `${urlObj.protocol}//${urlObj.hostname}${href}`;
                } else if (!href.startsWith('http')) {
                  const urlObj = new URL(request.url);
                  href = `${urlObj.protocol}//${urlObj.hostname}/${href}`;
                }
                
                return href;
              } catch (e) { 
                return null; 
              }
            };
            
            const name = getText(selectors.name);
            const price = getText(selectors.price);
            const originalPrice = getText(selectors.originalPrice);
            const imageUrl = getAttribute(selectors.image, 'src');
            const link = getHref(selectors.link);
            const rating = getText(selectors.rating);
            
            // Only add valid products
            if (name && price) {
              products.push({
                name,
                price: price?.replace(/[^\d,.]/g, ''),
                originalPrice: originalPrice?.replace(/[^\d,.]/g, ''),
                imageUrl,
                url: link,
                retailer: retailer.name,
                rating: rating ? parseFloat(rating.replace(/[^\d.]/g, '')) : undefined
              });
            }
          });
        },
      });
      
      await crawler.run();
      
      const endTime = Date.now();
      console.log(`CheerioCrawler scraping for ${retailerKey} completed in ${(endTime - startTime) / 1000}s`);
      
      return {
        success: products.length > 0,
        products,
        retailer: retailerKey,
        executionTime: endTime - startTime
      };
    } catch (error) {
      console.error(`CheerioCrawler scraping error for ${retailerKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Scrape with PuppeteerCrawler
   * @param {string} retailerKey - Retailer key
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Scraping results
   */
  async scrapeWithPuppeteerCrawler(retailerKey, query) {
    console.log(`Scraping ${retailerKey} with PuppeteerCrawler for query "${query}"`);
    
    // Generate search URL
    const retailer = this.retailers[retailerKey];
    if (!retailer) {
      throw new Error(`Retailer ${retailerKey} not supported`);
    }
    
    const searchUrl = retailer.url(query);
    const startTime = Date.now();
    const products = [];
    
    try {
      // Create request list with just the search URL
      const requestList = await RequestList.open('puppeteer-search-list', [{
        url: searchUrl,
        userData: { retailerKey, query }
      }]);
      
      // Create and run crawler
      const crawler = new PuppeteerCrawler({
        requestList,
        maxRequestRetries: 2,
        requestHandlerTimeoutSecs: 45,
        maxConcurrency: 1,
        launchContext: {
          launchOptions: {
            headless: true,
            args: [
              '--disable-dev-shm-usage',
              '--disable-setuid-sandbox',
              '--no-sandbox',
              '--disable-accelerated-2d-canvas',
              '--disable-gpu',
              '--disable-notifications',
              '--disable-extensions',
            ],
          },
        },
        preNavigationHooks: [
          async ({ page, request }) => {
            // Add random user agent
            const userAgent = new UserAgent({ deviceCategory: 'desktop' }).toString();
            await page.setUserAgent(userAgent);
            
            // Block unnecessary resources
            await page.setRequestInterception(true);
            page.on('request', (req) => {
              const resourceType = req.resourceType();
              const url = req.url();
              
              if (['image', 'stylesheet', 'font', 'media'].includes(resourceType) ||
                  url.match(/\.(jpg|jpeg|png|gif|svg|woff|woff2|ttf|otf|mp4|webm)$/i)) {
                req.abort();
              } else {
                req.continue();
              }
            });
          }
        ],
        async handlePageFunction({ page, request }) {
          const { retailerKey } = request.userData;
          const retailer = this.retailers[retailerKey];
          const selectors = retailer.selectors;
          
          // Wait for product elements
          try {
            await page.waitForSelector(selectors.products, { timeout: 10000 });
          } catch (e) {
            console.warn(`Timeout waiting for products on ${retailerKey}`);
            // Try to continue anyway
          }
          
          // Take screenshot if in debug mode
          if (DEBUG_MODE) {
            const debugDir = path.join(__dirname, '../../debug');
            if (!fs.existsSync(debugDir)) {
              fs.mkdirSync(debugDir, { recursive: true });
            }
            
            await page.screenshot({
              path: path.join(debugDir, `${retailerKey}-${Date.now()}.png`),
              fullPage: true
            });
            
            // Also save HTML
            const html = await page.content();
            fs.writeFileSync(
              path.join(debugDir, `${retailerKey}-${Date.now()}.html`),
              html
            );
          }
          
          // Extract products
          const extractedProducts = await page.evaluate((selectors, retailerName) => {
            const productElements = document.querySelectorAll(selectors.products);
            const products = [];
            
            const getTextContent = (element, selector) => {
              try {
                const targetEl = element.querySelector(selector);
                return targetEl ? targetEl.textContent.trim() : null;
              } catch (e) {
                return null;
              }
            };
            
            const getAttribute = (element, selector, attr) => {
              try {
                const targetEl = element.querySelector(selector);
                return targetEl ? targetEl.getAttribute(attr) : null;
              } catch (e) {
                return null;
              }
            };
            
            const getHref = (element, selector) => {
              try {
                const targetEl = element.querySelector(selector);
                if (!targetEl) return null;
                
                const href = targetEl.getAttribute('href');
                if (!href) return null;
                
                if (href.startsWith('/')) {
                  return window.location.origin + href;
                }
                return href;
              } catch (e) {
                return null;
              }
            };
            
            for (let i = 0; i < Math.min(20, productElements.length); i++) {
              const el = productElements[i];
              
              const name = getTextContent(el, selectors.name);
              const price = getTextContent(el, selectors.price);
              const originalPrice = getTextContent(el, selectors.originalPrice);
              const imageUrl = getAttribute(el, selectors.image, 'src');
              const link = getHref(el, selectors.link);
              const rating = getTextContent(el, selectors.rating);
              
              if (name && price) {
                products.push({
                  name,
                  price: price?.replace(/[^\d,.]/g, ''),
                  originalPrice: originalPrice?.replace(/[^\d,.]/g, ''),
                  imageUrl,
                  url: link,
                  retailer: retailerName,
                  rating: rating ? parseFloat(rating.replace(/[^\d.]/g, '')) : undefined
                });
              }
            }
            
            return products;
          }, selectors, retailer.name);
          
          products.push(...extractedProducts);
        },
      });
      
      await crawler.run();
      
      const endTime = Date.now();
      console.log(`PuppeteerCrawler scraping for ${retailerKey} completed in ${(endTime - startTime) / 1000}s`);
      
      return {
        success: products.length > 0,
        products,
        retailer: retailerKey,
        executionTime: endTime - startTime
      };
    } catch (error) {
      console.error(`PuppeteerCrawler scraping error for ${retailerKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Search for products based on image and extracted keywords
   * @param {string} imageData - Base64 encoded image data
   * @param {string} extractedKeywords - Keywords extracted from the image
   * @returns {Promise<Object>} - Search results with products from various retailers
   */
  async searchProductByImage(imageData, extractedKeywords) {
    // If we have extracted keywords, use them for search
    if (extractedKeywords && extractedKeywords.trim().length > 0) {
      console.log(`Using extracted keywords from image: "${extractedKeywords}"`);
      return this.searchProduct(extractedKeywords);
    }

    // Otherwise, handle the case where we need to extract keywords from the image
    console.log('No keywords provided with image. Need image analysis implementation.');
    throw new Error('Image search without keywords is not implemented yet.');
  }

  /**
   * Scrape products by keyword search
   * @param {string} keywords - Search keywords
   * @returns {Promise<Object>} - Search results
   */
  async scrapeProductsByKeywords(keywords) {
    return this.searchProduct(keywords);
  }
  
  /**
   * Clean up resources (call this when the server is shutting down)
   */
  async cleanup() {
    console.log('Cleaning up scraper resources...');
    
    // Close all browsers
    await this.playwrightManager.close();
    
    console.log('Scraper cleanup complete');
  }
}

module.exports = new ScraperService();