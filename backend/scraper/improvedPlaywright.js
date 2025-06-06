/**
 * Enhanced Playwright Manager for stealth browsing and efficient scraping
 * Supports browser recycling, network interception, and anti-detection techniques
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');
const UserAgent = require('user-agents');
const crypto = require('crypto');

// Debug mode flag
const DEBUG_MODE = process.env.DEBUG_SCRAPING === 'true';
const DEBUG_DIR = path.join(__dirname, '../../debug');

// Ensure debug directory exists
if (DEBUG_MODE && !fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

/**
 * ImprovedPlaywright class - Manages browser instances with advanced features
 */
class ImprovedPlaywright {
  constructor() {
    this.browsers = {
      chromium: null,
      firefox: null,
      webkit: null
    };
    
    this.contexts = {
      chromium: [],
      firefox: [],
      webkit: []
    };
    
    this.maxContextsPerBrowser = 3;
    this.requestCounter = 0;
    
    this.cookieConsentSelectors = {
      'amazon': [
        '#sp-cc-accept',
        'input[name="accept"]',
        'button:has-text("Accept")',
        'button:has-text("Accept all")'
      ],
      'flipkart': [
        '._2KpZ6l._2doB4z',
        'button:has-text("✕")',
        'button:has-text("Accept")'
      ],
      'meesho': [
        'button:has-text("Accept")',
        'button:has-text("I Accept")',
        'button:has-text("Agree")'
      ],
      'croma': [
        '.cookie-accept-button',
        'button:has-text("Accept")',
        'button:has-text("Accept All Cookies")'
      ],
      'relianceDigital': [
        'button:has-text("Accept")',
        'button:has-text("I Accept")',
        '.cookie-btn'
      ],
      // Generic selectors that work across sites
      'generic': [
        'button:has-text("Accept")',
        'button:has-text("Accept All")',
        'button:has-text("I Agree")',
        'button:has-text("OK")',
        'button:has-text("Allow")',
        'button[aria-label="Accept cookies"]',
        '.cookie-consent-accept',
        '.cc-accept',
        '.cc-allow',
        '#onetrust-accept-btn-handler'
      ]
    };
  }

  /**
   * Initialize browser instances for later use
   * @param {Array} types - Array of browser types to initialize ('chromium', 'firefox', 'webkit')
   */
  async initBrowsers(types = ['chromium']) {
    for (const type of types) {
      if (!this.browsers[type]) {
        try {
          console.log(`Initializing ${type} browser...`);
          this.browsers[type] = await playwright[type].launch({
            headless: true,
            args: [
              '--disable-dev-shm-usage',
              '--disable-setuid-sandbox',
              '--no-sandbox',
              '--disable-accelerated-2d-canvas',
              '--disable-gpu',
              '--disable-notifications',
              '--disable-extensions',
              '--disable-component-extensions-with-background-pages',
              '--disable-default-apps',
              '--mute-audio'
            ]
          });
          console.log(`${type} browser initialized`);
        } catch (error) {
          console.error(`Error initializing ${type} browser:`, error.message);
        }
      }
    }
  }

  /**
   * Get or create a browser context with predefined settings
   * @param {string} browserType - Browser type ('chromium', 'firefox', 'webkit')
   * @returns {Promise<Object>} - Browser context
   */
  async getBrowserContext(browserType = 'chromium') {
    // Initialize browser if not already done
    if (!this.browsers[browserType]) {
      await this.initBrowsers([browserType]);
    }

    if (!this.browsers[browserType]) {
      throw new Error(`Failed to initialize ${browserType} browser`);
    }

    // Reuse an existing context if we have less than maxContextsPerBrowser
    if (this.contexts[browserType].length < this.maxContextsPerBrowser) {
      try {
        console.log(`Creating new ${browserType} context`);
        
        const userAgent = new UserAgent({ deviceCategory: 'desktop' }).toString();
        
        // Create a context with stealth mode settings
        const context = await this.browsers[browserType].newContext({
          userAgent,
          viewport: {
            width: 1920 + Math.floor(Math.random() * 100),
            height: 1080 + Math.floor(Math.random() * 100)
          },
          deviceScaleFactor: 1 + (Math.random() * 0.3),
          hasTouch: false,
          javaScriptEnabled: true,
          locale: 'en-US',
          timezoneId: 'Asia/Kolkata',
          geolocation: {
            latitude: 28.6139 + (Math.random() * 0.01),
            longitude: 77.2090 + (Math.random() * 0.01)
          },
          permissions: ['geolocation'],
          colorScheme: 'light',
          ignoreHTTPSErrors: true
        });
        
        // Add context to our pool
        this.contexts[browserType].push(context);
        return context;
      } catch (error) {
        console.error(`Error creating ${browserType} context:`, error.message);
        throw error;
      }
    } else {
      // Return an existing context in round-robin fashion
      const index = this.requestCounter % this.contexts[browserType].length;
      this.requestCounter++;
      return this.contexts[browserType][index];
    }
  }

  /**
   * Create a new optimized page with resource blocking capabilities
   * @param {Object} context - Browser context
   * @param {Object} options - Page options
   * @returns {Promise<Object>} - New page
   */
  async newOptimizedPage(context, options = {}) {
    const page = await context.newPage();
    
    // Set default timeout
    page.setDefaultTimeout(options.timeout || 30000);
    
    // Block unnecessary resources
    if (options.blockResources) {
      await page.route('**/*', async (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const url = request.url();
        
        // Block resources that aren't essential for scraping
        if (
          resourceType === 'image' ||
          resourceType === 'media' ||
          resourceType === 'font' ||
          url.includes('.jpg') ||
          url.includes('.jpeg') ||
          url.includes('.png') ||
          url.includes('.gif') ||
          url.includes('.css') ||
          url.includes('.woff') ||
          url.includes('.mp4') ||
          url.includes('analytics') ||
          url.includes('tracker') ||
          url.includes('telemetry')
        ) {
          await route.abort();
          return;
        }
        
        // Allow requests to specific domains
        if (options.allowedDomains && options.allowedDomains.length > 0) {
          let isAllowed = false;
          for (const domain of options.allowedDomains) {
            if (url.includes(domain)) {
              isAllowed = true;
              break;
            }
          }
          
          if (!isAllowed) {
            await route.abort();
            return;
          }
        }
        
        await route.continue();
      });
    }
    
    // Add stealth features to avoid detection
    await this.addStealthSettings(page);
    
    return page;
  }

  /**
   * Add stealth settings to page to avoid detection
   * @param {Object} page - Playwright page
   */
  async addStealthSettings(page) {
    // Override JavaScript variables used for bot detection
    await page.addInitScript(() => {
      // Hide webdriver properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true
      });
      
      // Spoof plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [{
            name: "Chrome PDF Plugin",
            description: "Portable Document Format",
            filename: "internal-pdf-viewer"
          }, {
            name: "Chrome PDF Viewer",
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai"
          }, {
            name: "Native Client",
            description: "",
            filename: "internal-nacl-plugin"
          }];
        },
        configurable: true
      });
      
      // Spoof languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en', 'hi'],
        configurable: true
      });
      
      // Spoof hardware concurrency (CPU cores)
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
        configurable: true
      });
      
      // Spoof device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true
      });
      
      // Prevent iframe checks
      Object.defineProperty(window, 'parent', {
        get: () => window
      });
      
      // Modify toString behavior to avoid detection
      const nativeToString = Function.prototype.toString;
      Function.prototype.toString = function() {
        if (this === Function.prototype.toString) return nativeToString.call(nativeToString);
        if (this === Object.defineProperty) return "function defineProperty() { [native code] }";
        if (this === Object.defineProperties) return "function defineProperties() { [native code] }";
        return nativeToString.call(this);
      };
    });
  }

  /**
   * Navigate to URL with retry capabilities
   * @param {Object} page - Playwright page
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   */
  async navigateWithRetries(page, url, options = {}) {
    const maxRetries = options.retries || 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Navigation attempt ${attempt + 1}/${maxRetries + 1} to ${url}`);
        
        // Add a random delay to look more like a human
        const delay = Math.floor(Math.random() * 1000) + 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        await page.goto(url, {
          waitUntil: options.waitUntil || 'domcontentloaded',
          timeout: options.timeout || 30000
        });
        
        console.log('Navigation successful');
        return;
      } catch (error) {
        console.error(`Navigation attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Handle cookie consent popups and other common popups
   * @param {Object} page - Playwright page
   * @param {string} retailer - Retailer name for retailer-specific selectors
   */
  async handlePopupsAndConsent(page, retailer = '') {
    try {
      // Wait a bit for popups to appear
      await page.waitForTimeout(1000);
      
      // Try retailer-specific selectors first
      let selectors = [];
      if (retailer && this.cookieConsentSelectors[retailer]) {
        selectors = [...this.cookieConsentSelectors[retailer]];
      }
      
      // Add generic selectors
      selectors = [...selectors, ...this.cookieConsentSelectors.generic];
      
      // Try each selector
      for (const selector of selectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`Found consent button with selector: ${selector}`);
            
            // Add small random delay before clicking
            await page.waitForTimeout(300 + Math.floor(Math.random() * 400));
            
            await button.click();
            console.log('Clicked consent button');
            
            // Wait for popup to disappear
            await page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Ignore errors and try next selector
        }
      }
      
      // Handle other common popups (login, notifications, etc.)
      const commonCloseSelectors = [
        'button.close',
        '.modal-close',
        '.popup-close',
        '.drawer-close',
        'button:has-text("Close")',
        '[aria-label="Close"]'
      ];
      
      for (const selector of commonCloseSelectors) {
        try {
          const closeButton = await page.$(selector);
          if (closeButton) {
            await closeButton.click();
            console.log(`Closed popup with selector: ${selector}`);
            await page.waitForTimeout(500);
          }
        } catch (e) {
          // Ignore and try next
        }
      }
    } catch (error) {
      console.warn(`Error handling popups: ${error.message}`);
      // Continue execution, this is not critical
    }
  }

  /**
   * Wait for page content to load
   * @param {Object} page - Playwright page
   * @param {string} retailer - Retailer name
   */
  async waitForPageContent(page, retailer = '') {
    try {
      // Common product container selectors for popular retailers
      const selectors = {
        'amazon': '[data-component-type="s-search-result"]',
        'flipkart': '._1AtVbE, ._4ddWXP, div._2kHMtA',
        'meesho': '[data-testid="product-container"]',
        'croma': '.product-item, .cp-card',
        'relianceDigital': '.sp.grid, .product-grid, .pl__container'
      };
      
      // Wait for product containers to appear
      const selector = retailer ? selectors[retailer] : '.product-container, .product-card, .item';
      
      if (selector) {
        await page.waitForSelector(selector, { 
          state: 'attached', 
          timeout: 10000 
        }).catch(() => {
          console.log(`Could not find selector ${selector} for ${retailer}, continuing anyway`);
        });
      }
      
      // Also wait for images to start loading
      await page.waitForSelector('img[src]', { 
        state: 'attached', 
        timeout: 5000 
      }).catch(() => {
        console.log('Could not find any images, continuing anyway');
      });
    } catch (error) {
      console.warn(`Error waiting for page content: ${error.message}`);
      // Continue execution, this is not critical
    }
  }

  /**
   * Simulate human interaction with the page
   * @param {Object} page - Playwright page
   */
  async simulateHumanInteraction(page) {
    try {
      // Get page dimensions
      const dimensions = await page.evaluate(() => {
        return {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight
        };
      });
      
      // Random scrolling
      for (let i = 0; i < 3; i++) {
        // Random scroll position
        const scrollY = Math.floor(Math.random() * dimensions.height / 2) + 100;
        
        await page.evaluate((y) => {
          window.scrollBy(0, y);
        }, scrollY);
        
        // Random delay between scrolls
        await page.waitForTimeout(300 + Math.floor(Math.random() * 500));
      }
      
      // Random mouse movements
      for (let i = 0; i < 2; i++) {
        const x = Math.floor(Math.random() * dimensions.width);
        const y = Math.floor(Math.random() * dimensions.height);
        
        await page.mouse.move(x, y);
        await page.waitForTimeout(100 + Math.floor(Math.random() * 200));
      }
    } catch (error) {
      console.warn(`Error simulating human interaction: ${error.message}`);
      // Continue execution, this is not critical
    }
  }

  /**
   * Take a debug screenshot
   * @param {Object} page - Playwright page
   * @param {string} name - Screenshot name
   */
  async takeDebugScreenshot(page, name = '') {
    if (!DEBUG_MODE) return;
    
    try {
      const timestamp = Date.now();
      const filename = path.join(DEBUG_DIR, `${name || 'screenshot'}-${timestamp}.png`);
      
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`Debug screenshot saved: ${filename}`);
    } catch (error) {
      console.warn(`Error taking debug screenshot: ${error.message}`);
    }
  }

  /**
   * Launch a new browser instance
   * @param {string} browserType - Browser type ('chromium', 'firefox', 'webkit')
   * @returns {Promise<Object>} - { browser, context, page }
   */
  async launchBrowser(browserType = 'chromium') {
    try {
      // Launch browser
      const browser = await playwright[browserType].launch({
        headless: true,
        args: [
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
      
      // Create context with stealth settings
      const userAgent = new UserAgent({ deviceCategory: 'desktop' }).toString();
      const context = await browser.newContext({
        userAgent,
        viewport: {
          width: 1920 + Math.floor(Math.random() * 100),
          height: 1080 + Math.floor(Math.random() * 100)
        },
        locale: 'en-US',
        timezoneId: 'Asia/Kolkata',
        deviceScaleFactor: 1,
        hasTouch: false,
        javaScriptEnabled: true,
      });
      
      // Create page
      const page = await context.newPage();
      
      // Add stealth settings
      await this.addStealthSettings(page);
      
      return { browser, context, page };
    } catch (error) {
      console.error(`Error launching ${browserType}:`, error.message);
      throw error;
    }
  }

  /**
   * Cleanup resources by closing unused browser contexts
   */
  async cleanup() {
    try {
      // Clean up unused contexts to free memory
      for (const browserType in this.contexts) {
        // Keep one context per browser type for reuse
        while (this.contexts[browserType].length > 1) {
          const context = this.contexts[browserType].pop();
          try {
            await context.close();
          } catch (e) {
            // Ignore close errors
          }
        }
      }
    } catch (error) {
      console.warn(`Error during cleanup: ${error.message}`);
    }
  }

  /**
   * Close all browsers and free resources
   */
  async close() {
    try {
      for (const browserType in this.browsers) {
        if (this.browsers[browserType]) {
          for (const context of this.contexts[browserType]) {
            try {
              await context.close();
            } catch (e) {
              // Ignore close errors
            }
          }
          this.contexts[browserType] = [];
          
          try {
            await this.browsers[browserType].close();
          } catch (e) {
            // Ignore close errors
          }
          this.browsers[browserType] = null;
        }
      }
      console.log('All browser resources closed');
    } catch (error) {
      console.error(`Error closing browsers: ${error.message}`);
    }
  }

  /**
   * Search for products with Playwright
   * @param {string} retailer - Retailer key
   * @param {string} query - Search query
   * @param {string} requestId - Request ID for tracking
   * @returns {Promise<Array>} - Array of products
   */
  async searchWithPlaywright(retailer, query, requestId) {
    try {
      console.log(`Searching ${retailer} using Playwright for query "${query}"`);
      
      // Launch browser and create page
      const { browser, context, page } = await this.launchBrowser('chromium');
      
      // Determine search URL based on retailer
      let searchUrl;
      if (retailer === 'amazon') {
        searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
      } else if (retailer === 'flipkart') {
        searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
      } else if (retailer === 'croma') {
        searchUrl = `https://www.croma.com/searchB?q=${encodeURIComponent(query)}`;
      } else if (retailer === 'meesho') {
        searchUrl = `https://www.meesho.com/search?q=${encodeURIComponent(query)}`;
      } else if (retailer === 'relianceDigital') {
        searchUrl = `https://www.reliancedigital.in/search?q=${encodeURIComponent(query)}`;
      } else {
        throw new Error(`Unsupported retailer for Playwright search: ${retailer}`);
      }
      
      // Navigate to search page
      await this.navigateWithRetries(page, searchUrl, { retries: 2 });
      
      // Handle cookie consent and other popups
      await this.handlePopupsAndConsent(page, retailer);
      
      // Wait for content to load
      await this.waitForPageContent(page, retailer);
      
      // Simulate human behavior
      await this.simulateHumanInteraction(page);
      
      // Take debug screenshot if debug mode is enabled
      await this.takeDebugScreenshot(page, `${retailer}-search-${Date.now()}`);
      
      // Extract product data - implementation varies by retailer
      let products = [];
      
      if (retailer === 'amazon') {
        products = await this._extractAmazonProducts(page);
      } else if (retailer === 'flipkart') {
        products = await this._extractFlipkartProducts(page);
      } else if (retailer === 'croma') {
        products = await this._extractCromaProducts(page);
      } else if (retailer === 'meesho') {
        products = await this._extractMeeshoProducts(page);
      } else if (retailer === 'relianceDigital') {
        products = await this._extractRelianceDigitalProducts(page);
      }
      
      // Close context to free resources
      await context.close();
      
      return products;
    } catch (error) {
      console.error(`Error searching with Playwright for ${retailer}:`, error.message);
      throw error;
    }
  }

  /**
   * Extract product data from Amazon search page
   * @param {Object} page - Playwright page
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _extractAmazonProducts(page) {
    return await page.evaluate(() => {
      const products = [];
      
      document.querySelectorAll('[data-component-type="s-search-result"]').forEach(item => {
        try {
          const asin = item.getAttribute('data-asin');
          if (!asin) return;
          
          const titleElement = item.querySelector('h2 a span');
          const priceElement = item.querySelector('.a-price .a-offscreen');
          const imageElement = item.querySelector('img.s-image');
          
          if (!titleElement) return;
          
          const title = titleElement.textContent.trim();
          const price = priceElement ? priceElement.textContent.trim() : '';
          const imageUrl = imageElement ? imageElement.getAttribute('src') : '';
          const url = `/dp/${asin}`;
          
          products.push({
            id: asin,
            name: title,
            price: price.replace(/[^\d,.]/g, ''),
            originalPrice: '',
            imageUrl,
            url: `https://www.amazon.in${url}`,
            retailer: 'Amazon'
          });
        } catch (e) {
          // Skip this item if extraction fails
        }
      });
      
      return products;
    });
  }

  /**
   * Extract product data from Flipkart search page
   * @param {Object} page - Playwright page
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _extractFlipkartProducts(page) {
    return await page.evaluate(() => {
      const products = [];
      
      document.querySelectorAll('div._1AtVbE, div._4ddWXP, div._2kHMtA').forEach(item => {
        try {
          const linkElement = item.querySelector('a[href*="/p/"]');
          if (!linkElement) return;
          
          const url = linkElement.getAttribute('href');
          const id = url.split('/p/')[1]?.split('/')[0] || '';
          
          const titleElement = item.querySelector('div._4rR01T, a.s1Q9rs, div.UE-OLD, div._2WkVRV');
          const priceElement = item.querySelector('div._30jeq3');
          const originalPriceElement = item.querySelector('div._3I9_wc');
          const imageElement = item.querySelector('img._396cs4, img._2r_T1I, img._2Ys_sh');
          
          if (!titleElement) return;
          
          const title = titleElement.textContent.trim();
          const price = priceElement ? priceElement.textContent.trim() : '';
          const originalPrice = originalPriceElement ? originalPriceElement.textContent.trim() : '';
          const imageUrl = imageElement ? (imageElement.getAttribute('src') || imageElement.getAttribute('data-src')) : '';
          
          products.push({
            id,
            name: title,
            price: price.replace(/[^\d,.]/g, ''),
            originalPrice: originalPrice.replace(/[^\d,.]/g, ''),
            imageUrl,
            url: url.startsWith('http') ? url : `https://www.flipkart.com${url}`,
            retailer: 'Flipkart'
          });
        } catch (e) {
          // Skip this item if extraction fails
        }
      });
      
      return products;
    });
  }

  /**
   * Extract product data from Croma search page
   * @param {Object} page - Playwright page
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _extractCromaProducts(page) {
    return await page.evaluate(() => {
      const products = [];
      
      document.querySelectorAll('.product-item, .cp-card').forEach(item => {
        try {
          const linkElement = item.querySelector('a[href*="/p/"]');
          if (!linkElement) return;
          
          const url = linkElement.getAttribute('href');
          const id = url.split('/p/')[1]?.split('/')[0] || '';
          
          const titleElement = item.querySelector('h3, .product-title');
          const priceElement = item.querySelector('.new-price, .pd-price');
          const originalPriceElement = item.querySelector('.old-price, .pd-old-price');
          const imageElement = item.querySelector('.product-img img');
          
          if (!titleElement) return;
          
          const title = titleElement.textContent.trim();
          const price = priceElement ? priceElement.textContent.trim() : '';
          const originalPrice = originalPriceElement ? originalPriceElement.textContent.trim() : '';
          const imageUrl = imageElement ? (imageElement.getAttribute('src') || imageElement.getAttribute('data-src')) : '';
          
          products.push({
            id,
            name: title,
            price: price.replace(/[^\d,.]/g, ''),
            originalPrice: originalPrice.replace(/[^\d,.]/g, ''),
            imageUrl,
            url: url.startsWith('http') ? url : `https://www.croma.com${url}`,
            retailer: 'Croma'
          });
        } catch (e) {
          // Skip this item if extraction fails
        }
      });
      
      return products;
    });
  }

  /**
   * Extract product data from Meesho search page
   * @param {Object} page - Playwright page
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _extractMeeshoProducts(page) {
    return await page.evaluate(() => {
      const products = [];
      
      document.querySelectorAll('[data-testid="product-container"]').forEach(item => {
        try {
          const linkElement = item.querySelector('a');
          if (!linkElement) return;
          
          const url = linkElement.getAttribute('href');
          const id = url.split('/').pop();
          
          const titleElement = item.querySelector('p.card-title, .ProductList__ProductTitle');
          const priceElement = item.querySelector('.sc-AykKC, .final-price, .product-price');
          const originalPriceElement = item.querySelector('.original-price');
          const imageElement = item.querySelector('img.product-image, .img-main');
          
          if (!titleElement) return;
          
          const title = titleElement.textContent.trim();
          const price = priceElement ? priceElement.textContent.trim() : '';
          const originalPrice = originalPriceElement ? originalPriceElement.textContent.trim() : '';
          const imageUrl = imageElement ? (imageElement.getAttribute('src') || imageElement.getAttribute('data-src')) : '';
          
          products.push({
            id,
            name: title,
            price: price.replace(/[^\d,.]/g, ''),
            originalPrice: originalPrice.replace(/[^\d,.]/g, ''),
            imageUrl,
            url: url.startsWith('http') ? url : `https://www.meesho.com${url}`,
            retailer: 'Meesho'
          });
        } catch (e) {
          // Skip this item if extraction fails
        }
      });
      
      return products;
    });
  }

  /**
   * Extract product data from Reliance Digital search page
   * @param {Object} page - Playwright page
   * @returns {Promise<Array>} - Array of products
   * @private
   */
  async _extractRelianceDigitalProducts(page) {
    return await page.evaluate(() => {
      const products = [];
      
      document.querySelectorAll('.sp__product, .grid-item, .product-item').forEach(item => {
        try {
          const linkElement = item.querySelector('a');
          if (!linkElement) return;
          
          const url = linkElement.getAttribute('href');
          const id = url.split('/').pop();
          
          const titleElement = item.querySelector('.sp__name, .product-name');
          const priceElement = item.querySelector('.slider-product__price, .sp__price');
          const originalPriceElement = item.querySelector('.sp__mrp, .product-mrp');
          const imageElement = item.querySelector('.slider-product__img img, .main-img');
          
          if (!titleElement) return;
          
          const title = titleElement.textContent.trim();
          const price = priceElement ? priceElement.textContent.trim() : '';
          const originalPrice = originalPriceElement ? originalPriceElement.textContent.trim() : '';
          const imageUrl = imageElement ? (imageElement.getAttribute('src') || imageElement.getAttribute('data-src')) : '';
          
          products.push({
            id,
            name: title,
            price: price.replace(/[^\d,.]/g, ''),
            originalPrice: originalPrice.replace(/[^\d,.]/g, ''),
            imageUrl,
            url: url.startsWith('http') ? url : `https://www.reliancedigital.in${url}`,
            retailer: 'Reliance Digital'
          });
        } catch (e) {
          // Skip this item if extraction fails
        }
      });
      
      return products;
    });
  }
}

// Create a singleton instance for the application
const playwrightManager = new ImprovedPlaywright();

// Launch improved Playwright with stealth mode
async function launchImprovedPlaywright() {
  return await playwrightManager.launchBrowser('chromium');
}

module.exports = {
  playwrightManager,
  launchImprovedPlaywright
};