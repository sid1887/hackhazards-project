const puppeteer = require('puppeteer');
const groqService = require('../services/groqService');

/**
 * Enhanced Scraper Service for retrieving product pricing data from various e-commerce websites
 * Implements anti-detection measures, error handling, and AI-powered data extraction
 */
class ScraperService {
  constructor() {
    // User agents to rotate through to avoid detection
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
    ];
    
    // E-commerce sites to search
    this.retailers = [
      {
        name: 'Amazon',
        url: 'https://www.amazon.in/s?k=',
        itemSelector: '.s-result-item[data-asin]:not([data-asin=""])',
        nameSelector: 'h2 .a-link-normal span',
        priceSelector: '.a-price-whole',
        originalPriceSelector: '.a-text-price .a-offscreen',
        linkSelector: 'h2 .a-link-normal',
        ratingSelector: '.a-icon-star-small .a-icon-alt',
        imageSelector: '.s-image',
        deliverySelector: '.a-color-success',
        enhanceScraping: true
      },
      {
        name: 'Flipkart',
        url: 'https://www.flipkart.com/search?q=',
        itemSelector: '._1AtVbE',
        nameSelector: '._4rR01T, .s1Q9rs',
        priceSelector: '._30jeq3',
        originalPriceSelector: '._3I9_wc',
        linkSelector: '._1fQZEK, ._2rpwqI',
        ratingSelector: '._3LWZlK',
        imageSelector: '._396cs4',
        deliverySelector: '._2Tpdn3',
        enhanceScraping: true
      },
      {
        name: 'Reliance Digital',
        url: 'https://www.reliancedigital.in/search?q=',
        itemSelector: '.sp grid',
        nameSelector: '.sp__name',
        priceSelector: '.gimRtM',
        originalPriceSelector: '.fCwZOJ',
        linkSelector: '.product-item',
        ratingSelector: '.sp__ratings',
        imageSelector: '.product-img img',
        deliverySelector: '.pd__offer',
        enhanceScraping: false
      },
      {
        name: 'Croma',
        url: 'https://www.croma.com/searchB?q=',
        itemSelector: '.product-item',
        nameSelector: '.product-title',
        priceSelector: '.pdpPrice',
        originalPriceSelector: '.old-price',
        linkSelector: '.product-title a',
        ratingSelector: '.text-nowrap',
        imageSelector: '.product-img img',
        deliverySelector: '.freeShipping',
        enhanceScraping: false
      },
      {
        name: 'DMart Online',
        url: 'https://www.dmart.in/searchB?q=',
        itemSelector: '.product-item',
        nameSelector: '.product-name',
        priceSelector: '.price',
        originalPriceSelector: '.original-price',
        linkSelector: '.product-link',
        ratingSelector: '.rating',
        imageSelector: '.product-image img',
        deliverySelector: '.delivery-info',
        enhanceScraping: false
      }
    ];
    
    // Max number of products to scrape per retailer
    this.maxProductsPerRetailer = 5;
    
    // Cache to store recent search results
    this.cache = new Map();
    this.cacheExpiryTime = 1000 * 60 * 15; // 15 minutes
  }

  /**
   * Gets a random user agent from the list
   * @returns {string} A random user agent string
   */
  getRandomUserAgent() {
    const randomIndex = Math.floor(Math.random() * this.userAgents.length);
    return this.userAgents[randomIndex];
  }

  /**
   * Check if we have cached results for a query
   * @param {string} query - The search query
   * @returns {Array|null} - The cached results or null if not found or expired
   */
  getCachedResults(query) {
    const normalizedQuery = query.toLowerCase().trim();
    if (this.cache.has(normalizedQuery)) {
      const { timestamp, results } = this.cache.get(normalizedQuery);
      const now = Date.now();
      
      if (now - timestamp < this.cacheExpiryTime) {
        return results;
      }
      
      // Clear expired cache entry
      this.cache.delete(normalizedQuery);
    }
    
    return null;
  }

  /**
   * Store search results in the cache
   * @param {string} query - The search query
   * @param {Array} results - The search results to cache
   */
  cacheResults(query, results) {
    const normalizedQuery = query.toLowerCase().trim();
    this.cache.set(normalizedQuery, {
      timestamp: Date.now(),
      results
    });
  }

  /**
   * Format price string to consistent format
   * @param {string} priceString - The price string to format
   * @returns {string} - Formatted price string
   */
  formatPrice(priceString) {
    if (!priceString) return 'N/A';
    
    // Remove currency symbols, commas, and other characters
    let price = priceString.replace(/[^\d.]/g, '');
    
    // Parse as float and format
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) return priceString;
    
    return `₹${numericPrice.toLocaleString('en-IN')}`;
  }

  /**
   * Extract numeric rating from text (e.g., "4.5 out of 5" -> 4.5)
   * @param {string} ratingText - The rating text to parse
   * @returns {number|null} - Extracted numeric rating or null if not found
   */
  extractRating(ratingText) {
    if (!ratingText) return null;
    
    const ratingMatch = ratingText.match(/([0-9]+(\.[0-9]+)?)/);
    if (ratingMatch && ratingMatch[1]) {
      return parseFloat(ratingMatch[1]);
    }
    
    return null;
  }

  /**
   * Launch browser with anti-detection settings
   * @returns {Promise<Browser>} - Puppeteer browser instance
   */
  async launchBrowser() {
    return puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--user-agent=' + this.getRandomUserAgent(),
        '--disabled-features=site-per-process'
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
  }
  
  /**
   * Set up a new page with anti-detection measures
   * @param {Browser} browser - Puppeteer browser instance
   * @returns {Promise<Page>} - Configured Puppeteer page
   */
  async setupPage(browser) {
    const page = await browser.newPage();
    
    // Set a random user agent
    await page.setUserAgent(this.getRandomUserAgent());
    
    // Set extra HTTP headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Block unnecessary resources to speed up scraping
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const blockedResources = ['image', 'media', 'font', 'stylesheet'];
      
      if (blockedResources.includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Add additional JavaScript to the page to make detection harder
    await page.evaluateOnNewDocument(() => {
      // Overwrite navigator properties to make them less detectable
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      
      // Hide that we're using Puppeteer/Chrome headless
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
    
    return page;
  }
  
  /**
   * Extract structured product data from a retailer page
   * @param {Page} page - Puppeteer page object
   * @param {Object} retailer - Retailer configuration
   * @returns {Promise<Array>} - Array of extracted product data
   */
  async extractProductData(page, retailer) {
    try {
      // Wait for items to load on the page
      await page.waitForSelector(retailer.itemSelector, { timeout: 10000 })
        .catch(() => console.log(`No products found on ${retailer.name} for this search`));
      
      // If we're using Groq AI to enhance scraping, get the HTML content
      if (retailer.enhanceScraping) {
        try {
          const productName = await page.evaluate(() => {
            const searchInput = document.querySelector('input[type="search"]');
            return searchInput ? searchInput.value : '';
          });
          
          const htmlContent = await page.content();
          
          // Get enhanced data using Groq AI
          const enhancedData = await groqService.enhanceWebScraping(productName, htmlContent);
          
          // Parse the enhanced data if it's in JSON format
          try {
            const enhancedDataObj = JSON.parse(enhancedData.enhancedData);
            if (enhancedDataObj && Array.isArray(enhancedDataObj.products)) {
              return enhancedDataObj.products.slice(0, this.maxProductsPerRetailer).map(product => ({
                retailer: retailer.name,
                title: product.productName || 'Unknown Product',
                currentPrice: this.formatPrice(product.currentPrice),
                originalPrice: this.formatPrice(product.originalPrice),
                discount: product.discountPercentage || 'N/A',
                availability: product.availability || 'Unknown',
                shipping: product.shippingInfo || 'N/A',
                seller: product.sellerName || retailer.name,
                rating: product.productRatings || null,
                link: product.productUrl || '#',
                image: product.imageUrl || '',
                specifications: product.technicalSpecifications || {},
                description: product.productDescription || '',
                source: 'AI-enhanced scraping'
              }));
            }
          } catch (parseError) {
            console.error(`Error parsing enhanced data from ${retailer.name}:`, parseError);
          }
        } catch (enhanceError) {
          console.error(`Error enhancing scraping for ${retailer.name}:`, enhanceError);
        }
      }
      
      // Fall back to traditional scraping if AI enhancement fails or is disabled
      return await page.evaluate((retailer, maxProducts) => {
        const items = Array.from(document.querySelectorAll(retailer.itemSelector)).slice(0, maxProducts);
        
        return items.map(item => {
          // Get element or null for each selector
          const nameEl = item.querySelector(retailer.nameSelector);
          const priceEl = item.querySelector(retailer.priceSelector);
          const originalPriceEl = item.querySelector(retailer.originalPriceSelector);
          const linkEl = item.querySelector(retailer.linkSelector);
          const ratingEl = item.querySelector(retailer.ratingSelector);
          const imageEl = item.querySelector(retailer.imageSelector);
          const deliveryEl = item.querySelector(retailer.deliverySelector);
          
          // Extract data or provide defaults
          const title = nameEl ? nameEl.innerText.trim() : 'Unknown Product';
          const currentPrice = priceEl ? priceEl.innerText.trim() : 'N/A';
          const originalPrice = originalPriceEl ? originalPriceEl.innerText.trim() : '';
          
          // Extract link, handling relative URLs
          let link = '#';
          if (linkEl && linkEl.href) {
            link = linkEl.href;
          } else if (linkEl && linkEl.getAttribute('href')) {
            const href = linkEl.getAttribute('href');
            if (href.startsWith('http')) {
              link = href;
            } else if (href.startsWith('/')) {
              // Convert relative URL to absolute
              const baseUrl = window.location.origin;
              link = `${baseUrl}${href}`;
            }
          }
          
          // Extract image URL
          let image = '';
          if (imageEl && imageEl.src) {
            image = imageEl.src;
          } else if (imageEl && imageEl.getAttribute('src')) {
            image = imageEl.getAttribute('src');
          } else if (imageEl && imageEl.dataset && imageEl.dataset.src) {
            image = imageEl.dataset.src;
          }
          
          // Calculate discount percentage if both prices are available
          let discount = 'N/A';
          if (currentPrice && originalPrice) {
            const current = parseFloat(currentPrice.replace(/[^\d.]/g, ''));
            const original = parseFloat(originalPrice.replace(/[^\d.]/g, ''));
            
            if (!isNaN(current) && !isNaN(original) && original > current) {
              const discountAmount = ((original - current) / original) * 100;
              discount = `${Math.round(discountAmount)}%`;
            }
          }
          
          return {
            retailer: retailer.name,
            title,
            currentPrice,
            originalPrice,
            discount,
            availability: 'In Stock', // Default assumption
            shipping: deliveryEl ? deliveryEl.innerText.trim() : 'Standard delivery',
            seller: retailer.name, // Default to retailer name
            rating: ratingEl ? ratingEl.innerText.trim() : null,
            link,
            image,
            source: 'Traditional scraping'
          };
        }).filter(item => item.title !== 'Unknown Product' && item.currentPrice !== 'N/A');
      }, retailer, this.maxProductsPerRetailer);
    } catch (error) {
      console.error(`Error extracting product data from ${retailer.name}:`, error);
      
      // Generate corrective code using Groq AI
      const fixData = await this.generateScrapeFixCode(retailer.name, retailer.productName, error);
      
      // Apply the fix and retry
      return await this.applyScrapeFixAndRetry(fixData, page, retailer);
    }
  }

  /**
   * Generate corrective code using Groq when scraping fails
   * @param {string} retailer - The retailer name 
   * @param {string} productName - The product being searched
   * @param {Error} error - The error that occurred
   * @returns {Promise<Object>} - AI-generated corrective code and explanations
   */
  async generateScrapeFixCode(retailer, productName, error) {
    try {
      console.log(`Using Groq API to generate corrective code for ${retailer}`);
      
      const errorMessage = error.message || String(error);
      const prompt = `
        You are an expert web scraping engineer. The following error occurred while scraping product data from ${retailer} for product "${productName}":
        
        ERROR: ${errorMessage}
        
        Analyze the error and generate a robust retry routine with enhanced error handling.
        Include code that can be injected into the scraper to fix this issue.
        Your response should include:
        1. A brief analysis of what went wrong
        2. JavaScript code that can be used to fix the issue (compatible with Puppeteer)
        3. Explanation of how the fix works
        
        Format as valid JSON with these keys: "analysis", "fixCode", "explanation"
      `;
      
      const messages = [
        { role: 'system', content: 'You are an AI specialized in generating and fixing web scraping code.' },
        { role: 'user', content: prompt }
      ];
      
      const response = await groqService.callGroqAPI(messages, {
        model: groqService.models.default,
        temperature: 0.3,
        max_tokens: 2048
      });
      
      // Parse the response and return as an object
      try {
        const content = response.choices[0].message.content;
        const jsonStartIdx = content.indexOf('{');
        const jsonEndIdx = content.lastIndexOf('}') + 1;
        
        if (jsonStartIdx >= 0 && jsonEndIdx > jsonStartIdx) {
          const jsonStr = content.substring(jsonStartIdx, jsonEndIdx);
          return JSON.parse(jsonStr);
        }
        
        return {
          analysis: "Failed to extract valid JSON from AI response",
          fixCode: "// No valid code was generated",
          explanation: "The AI didn't generate a properly formatted response. Manual intervention may be required."
        };
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        return {
          analysis: "Error parsing AI response: " + parseError.message,
          fixCode: "// Error parsing code",
          explanation: "There was an error processing the AI-generated solution."
        };
      }
    } catch (error) {
      console.error("Error generating fix code:", error);
      return {
        analysis: "Error communicating with Groq API: " + error.message,
        fixCode: "// API error occurred",
        explanation: "There was an error communicating with the Groq API to generate a fix."
      };
    }
  }

  /**
   * Apply AI-generated fix code and retry scraping
   * @param {Object} fixData - The fix data generated by AI
   * @param {Page} page - Puppeteer page object
   * @param {Object} retailer - Retailer configuration
   * @returns {Promise<Array>} - Array of extracted product data after fix
   */
  async applyScrapeFixAndRetry(fixData, page, retailer) {
    console.log(`Applying AI-generated fix for ${retailer.name}`);
    console.log(`Analysis: ${fixData.analysis}`);
    console.log(`Explanation: ${fixData.explanation}`);
    
    try {
      // Validate the fix code for security
      if (!fixData.fixCode || typeof fixData.fixCode !== 'string') {
        throw new Error('Invalid fix code provided by AI');
      }

      // Simple security check to prevent harmful code execution
      const securityCheck = this.validateFixCode(fixData.fixCode);
      if (!securityCheck.valid) {
        throw new Error(`Security check failed: ${securityCheck.reason}`);
      }

      // Log the fix that will be applied
      console.log("Applying fix code:");
      console.log(fixData.fixCode);
      
      // Execute the AI-generated fix code in the context of the page
      // Add a timeout to prevent infinite loops or hanging executions
      const fixedData = await Promise.race([
        page.evaluate((fixCode, retailerConfig, maxProducts) => {
          // Create a function from the fix code string and execute it
          const fixFunction = new Function('retailer', 'maxProducts', fixCode);
          return fixFunction(retailerConfig, maxProducts);
        }, fixData.fixCode, retailer, this.maxProductsPerRetailer),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout executing fix code')), 30000)
        )
      ]);
      
      if (Array.isArray(fixedData) && fixedData.length > 0) {
        console.log(`Fix successful! Retrieved ${fixedData.length} products from ${retailer.name}`);
        
        // Add a source flag to indicate this data came from the AI-fixed code
        return fixedData.map(item => ({
          ...item,
          retailer: retailer.name,
          source: 'AI-fixed scraping'
        }));
      } else {
        console.log(`Fix did not return valid data for ${retailer.name}`);
        
        // Try one more time with a different model if first attempt failed
        if (!fixData.retryAttempt) {
          console.log(`Attempting to generate a new fix with advanced model...`);
          const newFixData = await this.generateScrapeFixCode(
            retailer.name, 
            retailer.productName, 
            new Error('First fix attempt returned invalid data')
          );
          newFixData.retryAttempt = true;
          return this.applyScrapeFixAndRetry(newFixData, page, retailer);
        }
        
        return [{
          retailer: retailer.name,
          title: `Failed to retrieve products from ${retailer.name}`,
          currentPrice: 'N/A',
          originalPrice: 'N/A',
          error: true,
          source: 'AI-fixed scraping (failed)'
        }];
      }
    } catch (fixError) {
      console.error(`Error applying fix for ${retailer.name}:`, fixError);
      return [{
        retailer: retailer.name,
        title: `Error with ${retailer.name} scraper`,
        currentPrice: 'N/A',
        originalPrice: 'N/A',
        error: true,
        errorMessage: fixError.message,
        source: 'Error in AI-fixed scraping'
      }];
    }
  }

  /**
   * Validate AI-generated fix code for security issues
   * @param {string} code - The code to validate
   * @returns {Object} - Validation result with valid flag and reason if invalid
   */
  validateFixCode(code) {
    // List of potentially dangerous patterns to check for
    const dangerousPatterns = [
      { pattern: /process\.exit/i, reason: 'Attempt to exit the process' },
      { pattern: /require\s*\(/i, reason: 'Attempt to import modules' },
      { pattern: /child_process/i, reason: 'Potential command execution' },
      { pattern: /fs\./i, reason: 'Potential file system access' },
      { pattern: /eval\s*\(/i, reason: 'Use of eval' },
      { pattern: /Function\s*\(/i, reason: 'Dynamic Function constructor' },
      { pattern: /fetch\s*\(/i, reason: 'External network request' }
    ];
    
    // Check against dangerous patterns
    for (const { pattern, reason } of dangerousPatterns) {
      if (pattern.test(code)) {
        return { valid: false, reason };
      }
    }
    
    // Check for balanced braces, parentheses, and brackets
    const openingChars = ['(', '{', '['];
    const closingChars = [')', '}', ']'];
    const stack = [];
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      
      if (openingChars.includes(char)) {
        stack.push(char);
      } else if (closingChars.includes(char)) {
        const openingChar = openingChars[closingChars.indexOf(char)];
        if (stack.pop() !== openingChar) {
          return { valid: false, reason: 'Unbalanced brackets or braces' };
        }
      }
    }
    
    if (stack.length > 0) {
      return { valid: false, reason: 'Unbalanced brackets or braces' };
    }
    
    // Limit code length
    if (code.length > 10000) {
      return { valid: false, reason: 'Code too long' };
    }
    
    return { valid: true };
  }

  /**
   * Search for a product across multiple retailers
   * @param {string} productName - The product name to search for
   * @returns {Promise<Array>} - Array of product results from multiple retailers
   */
  async searchProduct(productName) {
    if (!productName) {
      throw new Error('Product name is required');
    }
    
    // Check cache first
    const cachedResults = this.getCachedResults(productName);
    if (cachedResults) {
      console.log(`Using cached results for "${productName}"`);
      return cachedResults;
    }
    
    const browser = await this.launchBrowser();
    const allResults = [];
    
    try {
      const searchPromises = this.retailers.map(async (retailer) => {
        try {
          const page = await this.setupPage(browser);
          const searchUrl = retailer.url + encodeURIComponent(productName);
          
          console.log(`Searching ${retailer.name} for "${productName}"...`);
          
          // Set a longer timeout for navigation
          await page.goto(searchUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          
          // Add a slight delay to allow dynamic content to load
          await page.waitForTimeout(2000);
          
          // Extract product data
          const results = await this.extractProductData(page, retailer);
          
          // Add source identifier
          const retailerResults = results.map(result => ({
            ...result,
            retailer: retailer.name
          }));
          
          allResults.push(...retailerResults);
          
          // Close the page to free resources
          await page.close();
          
        } catch (error) {
          console.error(`Error searching ${retailer.name}:`, error);
        }
      });
      
      // Wait for all retailer searches to complete
      await Promise.all(searchPromises);
      
    } catch (error) {
      console.error('Error in searchProduct:', error);
    } finally {
      // Close the browser
      await browser.close();
    }
    
    // Process and format the results
    const formattedResults = allResults.map(result => ({
      ...result,
      currentPrice: this.formatPrice(result.currentPrice),
      originalPrice: result.originalPrice ? this.formatPrice(result.originalPrice) : null,
      rating: this.extractRating(result.rating)
    }));
    
    // Sort results by price (lowest first)
    const sortedResults = formattedResults.sort((a, b) => {
      const priceA = parseFloat(a.currentPrice.replace(/[^\d.]/g, '')) || Infinity;
      const priceB = parseFloat(b.currentPrice.replace(/[^\d.]/g, '')) || Infinity;
      return priceA - priceB;
    });
    
    // Cache the results
    this.cacheResults(productName, sortedResults);
    
    return sortedResults;
  }
}

module.exports = new ScraperService();