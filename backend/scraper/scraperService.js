/**
 * Enhanced Scraper Service for robust e-commerce data extraction
 * Combines multiple scraping techniques to handle various anti-bot measures
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { chromium } = require('playwright');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const torRequest = require('tor-request');
const randomString = require('randomstring');
const proxyChain = require('proxy-chain');
const fakeUserAgent = require('fake-useragent');
const groqService = require('../services/groqService');

// Apply stealth plugin to puppeteer
puppeteerExtra.use(StealthPlugin());

class ScraperService {
  constructor() {
    // List of rotating user agents
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0'
    ];

    // Free proxy servers - replaced with some actual free proxy servers
    this.proxyList = [
      // These are example proxies - in production, use a proxy rotation service
      'http://public.proxyscrape.com:8080',
      'http://free-proxy.cz:8080',
      'http://ipv4.webshare.io:80',
      // Direct connections as fallback
      'direct://'
    ];

    // E-commerce retailers to scrape
    this.retailers = {
      amazon: {
        name: 'Amazon',
        baseUrl: 'https://www.amazon.in',
        searchUrl: 'https://www.amazon.in/s?k=',
        selectors: {
          productContainer: '[data-component-type="s-search-result"], .s-result-item, .sg-col-4-of-24',
          productLink: 'h2 a.a-link-normal, .a-size-mini a, a.a-link-normal.a-text-normal',
          productTitle: 'h2 span.a-text-normal, .a-size-medium.a-color-base.a-text-normal, .a-size-base-plus.a-color-base.a-text-normal',
          productPrice: '.a-price .a-offscreen, .a-price-whole, span.a-price span[aria-hidden="true"]',
          productImage: '.s-image, img[data-image-latency="s-product-image"]',
          productRating: '.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt, .a-size-small .a-link-normal',
          detailPrice: '#priceblock_ourprice, #priceblock_dealprice, .a-price .a-offscreen, .a-price span[aria-hidden="true"], #corePrice_feature_div .a-price',
          detailTitle: '#productTitle, #title',
          detailImage: '#landingImage, #imgBlkFront, .a-dynamic-image',
          detailFeatures: '#feature-bullets .a-list-item, #productDescription p, #productDetails_feature_div tr',
          detailSpecs: '.a-expander-content .a-span3, .a-expander-content .a-span9, .a-size-base, .prodDetTable tr'
        },
        type: 'dynamic'
      },
      flipkart: {
        name: 'Flipkart',
        baseUrl: 'https://www.flipkart.com',
        searchUrl: 'https://www.flipkart.com/search?q=',
        selectors: {
          productContainer: 'div._1YokD2._3Mn1Gg ._1AtVbE',
          productLink: 'a._1fQZEK, a.s1Q9rs, a._2rpwqI, a.IRpwTa',
          productTitle: 'div._4rR01T, a.s1Q9rs, ._2B099V, .IRpwTa',
          productPrice: '._30jeq3, ._1_WHN1',
          productImage: '._396cs4, ._2r_T1I',
          productRating: '._3LWZlK, ._1lRcqv',
          detailPrice: '._30jeq3._16Jk6d, ._30jeq3',
          detailTitle: '.B_NuCI, ._35KyD6',
          detailImage: '._396cs4, ._2r_T1I',
          detailFeatures: '._2418kt li, ._1133E2 li, ._3_6Uyw row',
          detailSpecs: '._14cfVK, ._3-wDH3, ._3k-BhJ'
        },
        type: 'dynamic'
      },
      meesho: {
        name: 'Meesho',
        baseUrl: 'https://www.meesho.com',
        searchUrl: 'https://www.meesho.com/search?q=',
        selectors: {
          productContainer: '.ProductList__Wrapper, div[data-testid="product-container"]',
          productLink: 'a[data-testid="product-card-link"], a[href*="/product/"]',
          productTitle: 'h5[data-testid="product-name"], .NewProductCard__Title',
          productPrice: 'h4[data-testid="product-price"], .NewProductCard__Price',
          productImage: 'img[data-testid="product-image"], .NewProductCard__Image img',
          productRating: 'span[data-testid="product-rating"], .NewProductCard__Rating',
          detailPrice: 'h1[data-testid="product-price"], .ProductDetails__Price',
          detailTitle: 'h1[data-testid="product-name"], .ProductDetails__Title',
          detailImage: 'img[data-testid="product-image"], .ImageGalleryComponent__BgImg',
          detailFeatures: 'div[data-testid="product-details"] li, .ProductDesc__Details li',
          detailSpecs: 'div[data-testid="product-specs"] td, .ProductDesc__Details td'
        },
        type: 'dynamic'
      },
      croma: {
        name: 'Croma',
        baseUrl: 'https://www.croma.com',
        searchUrl: 'https://www.croma.com/searchB?q=',
        selectors: {
          productContainer: '.product-item, .cp-card, .product-list__item',
          productLink: '.product-title a, h3 a, .pd-title a',
          productTitle: '.product-title, h3 a, .pd-title',
          productPrice: '.pdpPrice, .cp-price, .amount, .new-price',
          productImage: '.product-img img, .plp-card-image, .pd-image',
          productRating: '.rating-value, .pr-ratings, .rating',
          detailPrice: '.offer-pricing, .amount, .pdp-price',
          detailTitle: '.pdp-title, .pd-heading',
          detailImage: '.carousel-item img, .pd-img',
          detailFeatures: '.highlightLink li, .spec-list li, .pd-specs-wrap li',
          detailSpecs: '.specification-table tr, .pd-specs-table tr'
        },
        type: 'dynamic'
      },
      relianceDigital: {
        name: 'Reliance Digital',
        baseUrl: 'https://www.reliancedigital.in',
        searchUrl: 'https://www.reliancedigital.in/search?q=',
        selectors: {
          productContainer: '.sp.grid, .product-grid, .prod-grid, .pl__container',
          productLink: '.pl__container a, .prod-name a, .product-name a',
          productTitle: '.sp__name, .prod-name, .product-name',
          productPrice: '.sp__price, .prod-price, .product-price, .current-price',
          productImage: '.productImg img, .prod-img img, .product-image img',
          productRating: '.SP__ratings, .prod-rating, .rating-stars',
          detailPrice: '.pdp__price, .prod-sp, .final-price',
          detailTitle: '.pdp__title, .prod-title, .product-title',
          detailImage: '.pdp__imgCont img, .prod-img-container img',
          detailFeatures: '.pdp__features li, .prod-features li',
          detailSpecs: '.specification-table tr, .prod-specs tr'
        },
        type: 'dynamic'
      }
    };

    // Initialize Tor connection
    this.initializeTor();
  }

  /**
   * Initialize Tor connection for anonymous scraping
   */
  initializeTor() {
    // Completely disabled Tor functionality
    console.log('Tor functionality is completely disabled to prevent connection issues.');
  }

  /**
   * Get a random user agent
   * @returns {string} - Random user agent string
   */
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Get a dynamic user agent using fake-useragent
   * @returns {string} - Random user agent string
   */
  getDynamicUserAgent() {
    try {
      return fakeUserAgent();
    } catch (error) {
      console.error('Error generating dynamic user agent:', error);
      return this.getRandomUserAgent();
    }
  }

  /**
   * Get a random proxy from the list
   * @returns {string} - Random proxy URL
   */
  getRandomProxy() {
    return this.proxyList[Math.floor(Math.random() * this.proxyList.length)];
  }

  /**
   * Create a proxy agent for HTTP requests
   * @param {string} proxyUrl - Proxy URL
   * @returns {HttpsProxyAgent|SocksProxyAgent} - Proxy agent
   */
  createProxyAgent(proxyUrl) {
    if (proxyUrl.startsWith('socks')) {
      return new SocksProxyAgent(proxyUrl);
    }
    return new HttpsProxyAgent(proxyUrl);
  }

  /**
   * Delay execution for a random time to simulate human behavior
   * @param {number} min - Minimum delay in milliseconds
   * @param {number} max - Maximum delay in milliseconds
   * @returns {Promise<void>}
   */
  async randomDelay(min = 1000, max = 5000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Make HTTP request with anti-detection measures
   * @param {string} url - URL to request
   * @param {boolean} useProxy - Whether to use a proxy (ignored - always uses direct connection)
   * @param {boolean} useTor - Whether to use Tor (ignored - always uses direct connection)
   * @returns {Promise<{data: string, success: boolean, error: string}>}
   */
  async makeRequest(url, useProxy = false, useTor = false) {
    try {
      const headers = {
        'User-Agent': this.getDynamicUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'TE': 'trailers',
        // Add a random browser fingerprint header
        'X-Browser-FingerPrint': randomString.generate(32)
      };

      const config = { headers };

      console.log(`Making direct request to ${url} - no proxy or Tor`);
      const response = await axios.get(url, config);
      return { data: response.data, success: true };
    } catch (error) {
      console.error(`Error making request to ${url}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Scrape using Puppeteer with stealth plugin
   * @param {string} url - URL to scrape
   * @param {boolean} useProxy - Whether to use a proxy (ignored - always uses direct connection)
   * @returns {Promise<{html: string, success: boolean, error: string}>}
   */
  async scrapeWithPuppeteer(url, useProxy = false) {
    let browser = null;
    let page = null;

    try {
      const launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-infobars',
          '--window-size=1920,1080',
          '--disable-web-security',
          '--no-proxy-server' // Force disable any system proxies
        ]
      };

      console.log(`Launching Puppeteer with direct connection for ${url}`);
      browser = await puppeteerExtra.launch(launchOptions);
      page = await browser.newPage();

      // Set random viewport size to avoid detection
      await page.setViewport({
        width: 1280 + Math.floor(Math.random() * 100),
        height: 720 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: false,
        isMobile: false
      });

      // Set user agent
      await page.setUserAgent(this.getDynamicUserAgent());

      // Set extra headers to avoid detection
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1',
        'X-Browser-FingerPrint': randomString.generate(32)
      });

      // Navigate with random delays to simulate human behavior
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Simulate random scrolling behavior
      await this.simulateHumanScroll(page);

      // Get the page content
      const html = await page.content();
      return { html, success: true };
    } catch (error) {
      console.error(`Error scraping with Puppeteer (${url}):`, error.message);
      return { success: false, error: error.message };
    } finally {
      if (page) await page.close().catch(err => console.error('Error closing page:', err));
      if (browser) await browser.close().catch(err => console.error('Error closing browser:', err));
    }
  }

  /**
   * Scrape using Playwright
   * @param {string} url - URL to scrape
   * @param {boolean} useProxy - Whether to use a proxy (ignored - always uses direct connection)
   * @returns {Promise<{html: string, success: boolean, error: string}>}
   */
  async scrapeWithPlaywright(url, useProxy = false) {
    let browser = null;
    let context = null;
    let page = null;

    try {
      const launchOptions = {
        headless: true,
        args: [
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-infobars',
          '--no-proxy-server', // Force disable any proxy
          '--disable-blink-features=AutomationControlled', // Hide automation
          '--disable-features=IsolateOrigins,site-per-process', // Disable site isolation
          '--no-sandbox',
          '--window-size=1920,1080'
        ]
      };

      console.log(`Launching Playwright with direct connection for ${url}`);
      browser = await chromium.launch(launchOptions);
      context = await browser.newContext({
        userAgent: this.getDynamicUserAgent(),
        viewport: {
          width: 1280 + Math.floor(Math.random() * 100),
          height: 720 + Math.floor(Math.random() * 100)
        },
        bypassCSP: true,
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
        hasTouch: Math.random() > 0.5, // Randomize touch capability
        locale: 'en-US',
        timezoneId: 'Asia/Kolkata' // Set to Indian timezone for better regional results
      });

      // Add random fingerprint to avoid detection
      await context.addInitScript(() => {
        // Override WebGL
        const getParameterProxyHandler = {
          apply: function(target, thisArg, args) {
            const paramName = args[0];
            if (paramName === 37445) return 'NVIDIA Corporation';
            if (paramName === 37446) return 'NVIDIA GeForce GTX 1050';
            return Reflect.apply(target, thisArg, args);
          }
        };
        
        // Override navigator properties
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        Object.defineProperty(navigator, 'appVersion', { get: () => '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36' });
        
        // Hide automation flags
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        
        // Add language preferences
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'hi'] });
        
        // Modify plugins to appear more human-like
        Object.defineProperty(navigator, 'plugins', { 
          get: () => [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', filename: 'internal-nacl-plugin' }
          ] 
        });
      });

      page = await context.newPage();
      
      // Set extra HTTP headers to appear more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      });
      
      // Reduce timeout to avoid hanging too long
      const timeout = 30000; // 30 seconds instead of 60
      
      // Try different navigation strategies
      try {
        // First try with networkidle
        await page.goto(url, { waitUntil: 'networkidle', timeout: timeout });
      } catch (navError) {
        console.log(`Navigation with networkidle failed for ${url}, trying with domcontentloaded...`);
        try {
          // If networkidle fails, try with domcontentloaded
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeout });
        } catch (domError) {
          console.log(`Navigation with domcontentloaded failed for ${url}, trying with load...`);
          // Last resort, try with load
          await page.goto(url, { waitUntil: 'load', timeout: timeout });
        }
      }
      
      // Wait for common selectors that indicate content has loaded
      try {
        await Promise.race([
          page.waitForSelector('div[class*="product"], div[class*="item"], a[href*="product"]', { timeout: 5000 }),
          page.waitForSelector('img[src*="product"], div[class*="price"]', { timeout: 5000 }),
          page.waitForTimeout(5000) // Fallback timeout
        ]);
      } catch (selectorError) {
        // Ignore selector errors, just continue
        console.log(`No product selectors found on ${url}, continuing anyway`);
      }
      
      // Simulate human interaction
      await this.simulateHumanInteraction(page);

      // Get the page content
      const html = await page.content();
      return { html, success: true };
    } catch (error) {
      console.error(`Error scraping with Playwright (${url}):`, error.message);
      return { success: false, error: error.message };
    } finally {
      if (page) await page.close().catch(err => console.error('Error closing page:', err));
      if (context) await context.close().catch(err => console.error('Error closing context:', err));
      if (browser) await browser.close().catch(err => console.error('Error closing browser:', err));
    }
  }

  /**
   * Simulate human scrolling behavior
   * @param {Page} page - Puppeteer page object
   */
  async simulateHumanScroll(page) {
    try {
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const numOfScreens = Math.floor(scrollHeight / viewportHeight);
      
      for (let i = 0; i < numOfScreens; i++) {
        // Random scroll amount within the viewport height
        const scrollAmount = viewportHeight * (0.3 + Math.random() * 0.7);
        await page.evaluate((amount) => {
          window.scrollBy(0, amount);
        }, scrollAmount);
        
        // Random delay between scrolls
        await this.randomDelay(500, 2000);
      }
      
      // Scroll back to a random position
      const randomPosition = Math.floor(Math.random() * scrollHeight);
      await page.evaluate((position) => {
        window.scrollTo(0, position);
      }, randomPosition);
      
      await this.randomDelay(500, 1000);
    } catch (error) {
      console.error('Error during human scroll simulation:', error);
    }
  }

  /**
   * Simulate human interaction with the page
   * @param {Page} page - Playwright page object
   */
  async simulateHumanInteraction(page) {
    try {
      // Scroll down slowly
      await page.evaluate(() => {
        const height = document.body.scrollHeight;
        let scrollPosition = 0;
        const scrollInterval = setInterval(() => {
          window.scrollBy(0, 100);
          scrollPosition += 100;
          if (scrollPosition >= height) {
            clearInterval(scrollInterval);
          }
        }, 100);
      });
      
      await this.randomDelay(2000, 5000);
      
      // Find and hover some random elements (like links or buttons)
      const elements = await page.$$('a, button');
      if (elements.length > 0) {
        const randomIndex = Math.floor(Math.random() * elements.length);
        await elements[randomIndex].hover();
      }
      
      await this.randomDelay(1000, 2000);
      
      // Random mouse movements
      const viewportSize = await page.viewportSize();
      for (let i = 0; i < 5; i++) {
        await page.mouse.move(
          Math.floor(Math.random() * viewportSize.width),
          Math.floor(Math.random() * viewportSize.height)
        );
        await this.randomDelay(200, 800);
      }
    } catch (error) {
      console.error('Error during human interaction simulation:', error);
    }
  }

  /**
   * Normalize URL to ensure consistency
   * @param {string} url - Raw URL
   * @param {string} baseUrl - Base URL for relative links
   * @returns {string} - Normalized URL
   */
  normalizeUrl(url, baseUrl) {
    if (!url || url === '#') {
      return '#';
    }
    
    // Already absolute URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Relative URL
    if (baseUrl) {
      return url.startsWith('/')
        ? `${baseUrl}${url}`
        : `${baseUrl}/${url}`;
    }
    
    return url;
  }

  /**
   * Parse products from HTML content
   * @param {string} html - HTML content
   * @param {Object} retailer - Retailer configuration
   * @param {string} keywords - Search keywords
   * @returns {Promise<Array<Object>>} - Array of product objects
   */
  async parseProductsFromHTML(html, retailer, keywords) {
    try {
      console.log(`Parsing HTML from ${retailer.name}...`);
      
      const $ = cheerio.load(html);
      const products = [];
      const selectors = retailer.selectors;
      
      // Find product containers
      const productContainers = $(selectors.productContainer);
      console.log(`Found ${productContainers.length} potential product containers`);
      
      if (productContainers.length === 0) {
        console.log('No product containers found, trying alternative parsing...');
        return await this.parseProductsAlternative($, retailer, keywords);
      }
      
      // Process each product container
      productContainers.each((index, container) => {
        try {
          // Limit to first 10 products for performance
          if (index >= 10) return false;
          
          const $container = $(container);
          
          // Extract product details
          let name = $container.find(selectors.productTitle).first().text().trim();
          let price = $container.find(selectors.productPrice).first().text().trim();
          let imageUrl = $container.find(selectors.productImage).first().attr('src');
          let rating = $container.find(selectors.productRating).first().text().trim();
          
          // Extract link - handle relative URLs using normalizeUrl utility
          let link = $container.find(selectors.productLink).first().attr('href');
          link = this.normalizeUrl(link, retailer.baseUrl);
          
          // Skip if essential data is missing
          if (!name || !price) return;
          
          // Clean up data
          name = name.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
          price = price.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
          
          // Extract original price and discount if available
          let originalPrice = null;
          let discount = null;
          
          // Look for original price near the current price
          const priceParent = $container.find(selectors.productPrice).first().parent();
          const originalPriceEl = priceParent.find('.a-text-price, .a-price-strike, ._3I9_wc, ._30jeq3');
          
          if (originalPriceEl.length > 0) {
            originalPrice = originalPriceEl.first().text().trim();
          }
          
          // Look for discount percentage
          const discountEl = $container.find('.a-badge-text, .a-badge-percentage, ._3Ay6Sb, ._1V_ZGU');
          if (discountEl.length > 0) {
            discount = discountEl.first().text().trim();
            // Ensure discount has % symbol
            if (discount && !discount.includes('%')) {
              discount = `${discount}%`;
            }
          }
          
          // Add product to results with both url and link fields for compatibility
          products.push({
            name,
            price,
            originalPrice,
            discount,
            imageUrl,
            rating,
            url: link,
            link: link,
            inStock: true // Assume in stock by default
          });
          
        } catch (error) {
          console.error(`Error parsing product ${index} from ${retailer.name}:`, error);
        }
      });
      
      console.log(`Successfully parsed ${products.length} products from ${retailer.name}`);
      return products;
      
    } catch (error) {
      console.error(`Error parsing HTML from ${retailer.name}:`, error);
      return [];
    }
  }

  /**
   * Alternative parsing method when standard selectors fail
   * @param {Object} $ - Cheerio instance
   * @param {Object} retailer - Retailer configuration
   * @param {string} keywords - Search keywords
   * @returns {Promise<Array<Object>>} - Array of product objects
   */
  async parseProductsAlternative($, retailer, keywords) {
    try {
      console.log(`Using alternative parsing for ${retailer.name}...`);
      
      const products = [];
      
      // Look for common product patterns
      const productPatterns = [
        // Look for elements with price and image
        'div:has(img):has(a):has(.price, [class*="price"], [class*="Price"])',
        // Look for card-like elements
        '.card, .product-card, .item, [class*="product-"], [class*="item-"]',
        // Look for elements with links and prices
        'a:has(img):has([class*="price"], [class*="Price"])',
        // Amazon specific
        '[data-component-type="s-search-result"]',
        // Flipkart specific
        '._1AtVbE, ._4ddWXP',
        // Generic product containers
        '[class*="product-container"], [class*="search-result"]'
      ];
      
      // Try each pattern until we find products
      for (const pattern of productPatterns) {
        const elements = $(pattern);
        console.log(`Found ${elements.length} elements matching pattern: ${pattern}`);
        
        if (elements.length > 0) {
          elements.each((index, element) => {
            try {
              // Limit to first 10 products
              if (index >= 10) return false;
              
              // Look for elements with price-like content
              const priceRegex = /(?:₹|Rs\.?|INR)\s*\d+([.,]\d+)?/i;
              const text = $(element).text();
              
              if (priceRegex.test(text)) {
                // Found a potential product
                const title = $(element).find('h3, h2, .title, .product-title').text().trim()
                  || $(element).find('a[title]').attr('title')
                  || '';
                  
                if (!title) return;
                
                const priceMatch = text.match(priceRegex);
                const price = priceMatch ? priceMatch[0].trim() : '';
                let link = $(element).find('a').attr('href') || '#';
                // Normalize URL
                link = this.normalizeUrl(link, retailer.baseUrl);
                const image = $(element).find('img').attr('src') || '';
                
                products.push({
                  name: title,
                  price: price,
                  imageUrl: image,
                  // Store both url and link fields for compatibility
                  url: link,
                  link: link,
                  rating: 'N/A',
                  inStock: true
                });
              }
            } catch (error) {
              console.error(`Error in alternative parsing for element ${index}:`, error);
            }
          });
          
          // If we found products, return them
          if (products.length > 0) {
            console.log(`Found ${products.length} products using alternative parsing`);
            return products;
          }
        }
      }
      
      return products;
    } catch (error) {
      console.error(`Error in alternative parsing for ${retailer.name}:`, error);
      return [];
    }
  }

  /**
   * Scrape products by keywords across multiple retailers
   * @param {string} keywords - Search keywords
   * @returns {Promise<{data: Array<Object>, count: number, query: string}>} - Product search results
   */
  async scrapeProductsByKeywords(keywords) {
    console.log(`Scraping products for keywords: ${keywords}`);
    
    // Encode keywords for URL
    const encodedKeywords = encodeURIComponent(keywords);
    
    // Results container
    const allProducts = [];
    const scrapedRetailers = [];
    const failedRetailers = [];
    
    // For each retailer, create a promise that resolves with products
    const retailerPromises = Object.values(this.retailers).map(async (retailer) => {
      try {
        console.log(`Scraping from ${retailer.name}...`);
        const searchUrl = `${retailer.searchUrl}${encodedKeywords}`;
        
        // Object to store scraping result
        let scrapingResult = { success: false, error: null, html: null };
        let scrapingMethod = '';
        
        // First try with Playwright - most modern approach
        try {
          scrapingResult = await this.scrapeWithPlaywright(searchUrl, false);
          scrapingMethod = 'Playwright';
        } catch (playwrightError) {
          console.error(`Playwright error for ${retailer.name}:`, playwrightError);
          scrapingResult = { success: false, error: playwrightError.message };
        }
        
        // If Playwright fails, try Puppeteer
        if (!scrapingResult.success) {
          console.log(`Playwright failed for ${retailer.name}, trying Puppeteer...`);
          try {
            scrapingResult = await this.scrapeWithPuppeteer(searchUrl, false);
            scrapingMethod = 'Puppeteer';
          } catch (puppeteerError) {
            console.error(`Puppeteer error for ${retailer.name}:`, puppeteerError);
            scrapingResult = { success: false, error: puppeteerError.message };
          }
        }
        
        // If both fail, try direct request
        if (!scrapingResult.success) {
          console.log(`Both browser methods failed for ${retailer.name}, trying direct request...`);
          try {
            const requestResult = await this.makeRequest(searchUrl, false, false);
            scrapingResult = { html: requestResult.data, success: requestResult.success, error: requestResult.error };
            scrapingMethod = 'Direct Request';
          } catch (requestError) {
            console.error(`Direct request error for ${retailer.name}:`, requestError);
            scrapingResult = { success: false, error: requestError.message };
          }
        }
        
        // If we got HTML content, parse it
        if (scrapingResult.success && scrapingResult.html) {
          console.log(`Successfully scraped HTML from ${retailer.name}, parsing products...`);
          
          // Parse HTML to extract products
          const products = await this.parseProductsFromHTML(scrapingResult.html, retailer, keywords);
          
          if (products && products.length > 0) {
            console.log(`Successfully parsed ${products.length} products from ${retailer.name}`);
            
            // Add retailer info and ensure URL consistency
            const productsWithRetailer = products.map(product => {
              // Ensure URLs are absolute
              const productUrl = this.normalizeUrl(product.url || product.link, retailer.baseUrl);
              
              return {
                ...product,
                retailer: retailer.name,
                vendor: retailer.name,
                vendorLogo: this.getRetailerLogo(retailer.name),
                id: `${retailer.name.toLowerCase()}-${Math.random().toString(36).substring(2, 10)}`,
                // Ensure both url and link fields exist for compatibility
                url: productUrl,
                link: productUrl
              };
            });
            
            // Add to all products array
            allProducts.push(...productsWithRetailer);
            scrapedRetailers.push(retailer.name);
          } else {
            console.log(`No products found from ${retailer.name}`);
            failedRetailers.push(retailer.name);
          }
        } else {
          console.error(`Failed to scrape from ${retailer.name}: ${scrapingResult.error || 'Unknown error'}`);
          failedRetailers.push(retailer.name);
        }
      } catch (error) {
        console.error(`Error scraping from ${retailer.name}:`, error);
        failedRetailers.push(retailer.name);
      }
    });
    
    // Wait for all retailer scraping to complete
    await Promise.all(retailerPromises);
    
    console.log(`Scraping complete. Found ${allProducts.length} products from ${scrapedRetailers.length} retailers.`);
    console.log(`Failed retailers: ${failedRetailers.join(', ')}`);
    
    // Return standardized results
    const processedProducts = this.processProductResults(allProducts, keywords);
    
    return {
      data: processedProducts,
      count: processedProducts.length,
      query: keywords,
      scrapedRetailers,
      failedRetailers
    };
  }

  /**
   * Search for products across all retailers
   * @param {string} query - Search query
   * @returns {Promise<Array<Object>>} - Array of product objects
   */
  async searchProduct(query) {
    try {
      console.log(`Searching for products matching: ${query}`);
      const results = await this.scrapeProductsByKeywords(query);
      
      // Process results through our standardization method
      const processedProducts = this.processProductResults(results.data || [], query);
      
      return processedProducts;
    } catch (error) {
      console.error('Error in searchProduct:', error);
      return [];
    }
  }

  /**
   * Process and enhance product results
   * @param {Array<Object>} products - Raw product data
   * @param {string} keywords - Search keywords
   * @returns {Array<Object>} - Processed products
   */
  processProductResults(products, keywords) {
    // Filter out duplicates and invalid products
    const validProducts = products.filter(p => 
      p && (p.name || p.title) && p.price && 
      (p.imageUrl || p.image) && 
      (p.url || p.link)
    );
    
    // Standardize product fields
    const standardizedProducts = validProducts.map(product => {
      // Ensure consistency in field naming for URLs
      const productUrl = product.url || product.link || '#';
      
      return {
        id: product.id || `product-${Math.random().toString(36).substring(2, 10)}`,
        name: product.name || product.title || 'Unknown Product',
        price: product.price || 'Check on site',
        originalPrice: product.originalPrice || product.oldPrice || null,
        discount: product.discount || null,
        vendor: product.vendor || product.retailer || 'Unknown',
        vendorLogo: product.vendorLogo || this.getRetailerLogo(product.vendor || product.retailer || ''),
        rating: product.rating || null,
        inStock: product.inStock !== undefined ? product.inStock : true,
        imageUrl: product.imageUrl || product.image || 'https://via.placeholder.com/300x300?text=No+Image',
        // Store both url and link fields for compatibility
        url: productUrl,
        link: productUrl
      };
    });
    
    // Sort by price (lowest first)
    const sortedProducts = [...standardizedProducts].sort((a, b) => {
      const priceA = this.extractNumericPrice(a.price);
      const priceB = this.extractNumericPrice(b.price);
      return priceA - priceB;
    });
    
    return sortedProducts;
  }
  
  /**
   * Extract numeric price value from price string
   * @param {string} priceString - Price string (e.g., "₹1,499", "Rs.2000")
   * @returns {number} - Numeric price value
   */
  extractNumericPrice(priceString) {
    if (!priceString || typeof priceString !== 'string') return 99999999;
    
    // Extract only numbers from the price string
    const matches = priceString.match(/[0-9,]+(\.[0-9]+)?/);
    if (!matches || !matches[0]) return 99999999;
    
    // Convert to number, removing commas
    return parseFloat(matches[0].replace(/,/g, '')) || 99999999;
  }

  /**
   * Fetch detailed information for a specific product
   * @param {Object} product - Basic product information
   * @returns {Promise<Object>} - Detailed product information
   */
  async fetchProductDetails(product) {
    try {
      // Ensure we have a valid URL to fetch details from
      const productUrl = product.url || product.link;
      if (!productUrl || productUrl === '#') {
        throw new Error('Invalid product URL');
      }
      
      // Determine which retailer this product is from
      const retailerName = product.vendor || product.retailer;
      const retailer = Object.values(this.retailers).find(r => r.name === retailerName);
      
      if (!retailer) {
        console.log(`Unknown retailer: ${retailerName}, using generic selectors`);
        // Create a generic retailer configuration based on the product URL
        const urlObj = new URL(productUrl);
        const hostname = urlObj.hostname;
        const baseUrl = `${urlObj.protocol}//${hostname}`;
        
        const genericRetailer = {
          name: retailerName || hostname,
          baseUrl: baseUrl,
          selectors: {
            detailPrice: '.price, [class*="price"], [class*="Price"], .offer-price, .pdp-price',
            detailTitle: 'h1, .product-title, .pdp-title, [class*="title"], [class*="name"]',
            detailImage: '.product-image img, .pdp-image img, [class*="product"] img, [class*="main-image"]',
            detailFeatures: '.features li, .specifications li, .product-details li, [class*="feature"] li, [class*="detail"] li',
            detailSpecs: '.specifications tr, .specs tr, .table tr, [class*="spec"] tr, table tr'
          }
        };
        
        return await this.scrapeProductDetailsWithRetailer(productUrl, genericRetailer, product);
      }
      
      console.log(`Fetching details for product from ${retailerName}: ${product.name || product.title}`);
      return await this.scrapeProductDetailsWithRetailer(productUrl, retailer, product);
      
    } catch (error) {
      console.error('Error fetching product details:', error);
      
      // Return the original product with an error flag
      return {
        ...product,
        error: error.message,
        errorDetail: 'Failed to fetch detailed information'
      };
    }
  }

  /**
   * Scrape product details with specific retailer configuration
   * @param {string} url - Product URL
   * @param {Object} retailer - Retailer configuration
   * @param {Object} originalProduct - Original product data
   * @returns {Promise<Object>} - Detailed product information
   */
  async scrapeProductDetailsWithRetailer(url, retailer, originalProduct) {
    // First try with Playwright - best for dynamic content
    let scrapingResult = { success: false };
    
    try {
      scrapingResult = await this.scrapeWithPlaywright(url, false);
    } catch (playwrightError) {
      console.log(`Playwright error fetching ${url}: ${playwrightError.message}`);
    }
    
    // If Playwright fails, try Puppeteer
    if (!scrapingResult.success) {
      try {
        scrapingResult = await this.scrapeWithPuppeteer(url, false);
      } catch (puppeteerError) {
        console.log(`Puppeteer error fetching ${url}: ${puppeteerError.message}`);
      }
    }
    
    // If both fail, try direct request
    if (!scrapingResult.success) {
      try {
        const requestResult = await this.makeRequest(url, false, false);
        scrapingResult = { 
          html: requestResult.data, 
          success: requestResult.success
        };
      } catch (requestError) {
        console.log(`Direct request error fetching ${url}: ${requestError.message}`);
      }
    }
    
    // If we couldn't fetch the page, return original product with error
    if (!scrapingResult.success || !scrapingResult.html) {
      return {
        ...originalProduct,
        error: 'Failed to fetch product page',
        url: url,
        link: url
      };
    }
    
    // Parse the scraped HTML
    const $ = cheerio.load(scrapingResult.html);
    const selectors = retailer.selectors;
    
    // Extract product details
    const findMultipleSelectors = (selectorStr) => {
      // Try each selector until we find a match
      const selectorList = selectorStr.split(', ');
      for (const selector of selectorList) {
        const element = $(selector).first();
        if (element.length > 0) {
          return element;
        }
      }
      return $();
    };
    
    // Use various selector fallbacks to find the data
    const titleElement = findMultipleSelectors(selectors.detailTitle);
    const priceElement = findMultipleSelectors(selectors.detailPrice);
    const imageElement = findMultipleSelectors(selectors.detailImage);
    
    const detailTitle = titleElement.text().trim() || originalProduct.name || originalProduct.title;
    const detailPrice = priceElement.text().trim() || originalProduct.price;
    
    // Try multiple ways to get the image
    let detailImage = imageElement.attr('src') || 
                      imageElement.attr('data-src') || 
                      imageElement.attr('data-lazy-src') || 
                      originalProduct.image || 
                      originalProduct.imageUrl;
    
    // Extract features
    const features = [];
    $(selectors.detailFeatures).each((i, element) => {
      const feature = $(element).text().trim();
      if (feature) features.push(feature);
    });
    
    // Extract specifications
    const specifications = [];
    $(selectors.detailSpecs).each((i, element) => {
      const cells = $(element).find('td, th');
      if (cells.length >= 2) {
        const key = cells.eq(0).text().trim();
        const value = cells.eq(1).text().trim();
        if (key && value) specifications.push({ name: key, value });
      }
    });
    
    // Check if we got meaningful data
    if (!detailTitle && !detailPrice && features.length === 0 && specifications.length === 0) {
      console.log('Traditional parsing failed, trying alternate methods...');
      
      // Try a more general approach
      const h1Text = $('h1').first().text().trim();
      const priceText = $('[class*="price"], [class*="Price"]').first().text().trim();
      const description = $('meta[name="description"]').attr('content') || 
                          $('p').slice(0, 2).text().trim();
      
      return {
        name: h1Text || originalProduct.name || originalProduct.title,
        title: h1Text || originalProduct.name || originalProduct.title,
        price: priceText || originalProduct.price,
        url: url,
        link: url,
        image: detailImage,
        imageUrl: detailImage,
        vendor: retailer.name,
        retailer: retailer.name,
        rating: originalProduct.rating || 'N/A',
        features: [],
        description,
        specifications: [],
        inStock: true,
        vendorLogo: this.getRetailerLogo(retailer.name)
      };
    }
    
    // Return the detailed product information
    return {
      name: detailTitle,
      title: detailTitle,
      price: detailPrice,
      url: url,
      link: url,
      image: detailImage,
      imageUrl: detailImage,
      vendor: retailer.name,
      retailer: retailer.name,
      rating: originalProduct.rating || 'N/A',
      features,
      description: features.join('. '),
      specifications,
      inStock: true,
      vendorLogo: this.getRetailerLogo(retailer.name)
    };
  }

  /**
   * Get retailer logo URL
   * @param {string} retailerName - Name of the retailer
   * @returns {string} - Logo URL
   */
  getRetailerLogo(retailerName) {
    const logos = {
      'Amazon': 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      'Flipkart': 'https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/flipkart-plus_8d85f4.png',
      'Meesho': 'https://images.meesho.com/images/marketing/1686234749596_512.webp',
      'Croma': 'https://media.croma.com/image/upload/v1637759004/Croma%20Assets/CMS/CAS/Croma_Logo_R8nzz4.png',
      'Reliance Digital': 'https://www.reliancedigital.in/build/client/images/loaders/rd_logo.svg',
      'Myntra': 'https://assets.myntassets.com/assets/images/retaillabs/2023/7/31/389f7a69-6bcf-478d-a812-ac9ce627d0621690822284100-myntra-logo-gezxh-QR.png',
      'Snapdeal': 'https://logos-world.net/wp-content/uploads/2020/11/Snapdeal-Logo.png',
      'Ajio': 'https://assets.ajio.com/static/img/Ajio-Logo.svg'
    };
    
    // Return the logo URL for the retailer or a placeholder if not found
    return logos[retailerName] || 'https://via.placeholder.com/150x50?text=Retailer';
  }
  /**
   * Fetch detailed information for a specific product
   * @param {Object} product - Basic product information
   * @returns {Promise<Object>} - Detailed product information
   */
  async fetchProductDetails(product) {
    try {
      console.log(`Fetching details for product: ${product.name}`);
      
      if (!product.url || product.url === '#') {
        console.error('Invalid product URL');
        return product;
      }
      
      // Determine which retailer this product is from
      const retailerName = product.vendor || product.seller || 'Unknown';
      const retailer = Object.values(this.retailers).find(r => r.name === retailerName) || 
                      Object.values(this.retailers).find(r => product.url.includes(r.baseUrl));
      
      if (!retailer) {
        console.error(`Could not determine retailer for URL: ${product.url}`);
        return product;
      }
      
      console.log(`Fetching details from ${retailer.name} for URL: ${product.url}`);
      
      // Fetch the product page
      let result;
      if (retailer.type === 'dynamic') {
        console.log('Using Playwright for product details');
        result = await this.scrapeWithPlaywright(product.url);
      } else {
        console.log('Using direct request for product details');
        result = await this.makeRequest(product.url);
      }
      
      // If first method fails, try alternative methods
      if (!result.success || !result.html) {
        console.log('First attempt failed, trying Puppeteer');
        result = await this.scrapeWithPuppeteer(product.url);
      }
      
      if (!result.success || !result.html) {
        console.log('Second attempt failed, trying direct request');
        result = await this.makeRequest(product.url);
      }
      
      if (!result.success || !result.html) {
        console.error('All scraping methods failed');
        return product;
      }
      
      // Parse the HTML to extract detailed product information
      const $ = cheerio.load(result.html);
      const selectors = retailer.selectors;
      
      // Extract detailed information
      const detailedProduct = { ...product };
      
      // Extract price (if not already available)
      if (!detailedProduct.price || detailedProduct.price === 'Check on site') {
        const priceEl = $(selectors.detailPrice);
        if (priceEl.length > 0) {
          detailedProduct.price = priceEl.first().text().trim();
        }
      }
      
      // Extract title (if not already available)
      if (!detailedProduct.name) {
        const titleEl = $(selectors.detailTitle);
        if (titleEl.length > 0) {
          detailedProduct.name = titleEl.first().text().trim();
        }
      }
      
      // Extract image (if not already available)
      if (!detailedProduct.imageUrl) {
        const imageEl = $(selectors.detailImage);
        if (imageEl.length > 0) {
          detailedProduct.imageUrl = imageEl.first().attr('src');
        }
      }
      
      // Extract features
      const features = [];
      $(selectors.detailFeatures).each((i, el) => {
        const featureText = $(el).text().trim();
        if (featureText && !features.includes(featureText)) {
          features.push(featureText);
        }
      });
      detailedProduct.features = features;
      
      // Extract specifications
      const specs = {};
      $(selectors.detailSpecs).each((i, el) => {
        if (i % 2 === 0) {
          const key = $(el).text().trim();
          const value = $(selectors.detailSpecs).eq(i + 1).text().trim();
          if (key && value) {
            specs[key] = value;
          }
        }
      });
      detailedProduct.specifications = specs;
      
      // Check if in stock
      const stockText = $('body').text();
      detailedProduct.inStock = !stockText.includes('out of stock') && 
                               !stockText.includes('currently unavailable') &&
                               !stockText.includes('sold out');
      
      console.log(`Successfully fetched details for ${detailedProduct.name}`);
      return detailedProduct;
      
    } catch (error) {
      console.error('Error fetching product details:', error);
      return product;
    }
  }

  /**
   * Parse products from HTML content
   * @param {string} html - HTML content
   * @param {Object} retailer - Retailer configuration
   * @param {string} keywords - Search keywords
   * @returns {Promise<Array<Object>>} - Array of product objects
   */
  async parseProductsFromHTML(html, retailer, keywords) {
    try {
      console.log(`Parsing HTML from ${retailer.name}...`);
      
      const $ = cheerio.load(html);
      const products = [];
      const selectors = retailer.selectors;
      
      // Find product containers
      const productContainers = $(selectors.productContainer);
      console.log(`Found ${productContainers.length} potential product containers`);
      
      if (productContainers.length === 0) {
        console.log('No product containers found, trying alternative parsing...');
        return await this.parseProductsAlternative($, retailer, keywords);
      }
      
      // Process each product container
      productContainers.each((index, container) => {
        try {
          // Limit to first 10 products for performance
          if (index >= 10) return false;
          
          const $container = $(container);
          
          // Extract product details
          let name = $container.find(selectors.productTitle).first().text().trim();
          let price = $container.find(selectors.productPrice).first().text().trim();
          let imageUrl = $container.find(selectors.productImage).first().attr('src');
          let rating = $container.find(selectors.productRating).first().text().trim();
          
          // Extract link - handle relative URLs
          let link = $container.find(selectors.productLink).first().attr('href');
          if (link && !link.startsWith('http')) {
            link = link.startsWith('/') 
              ? `${retailer.baseUrl}${link}` 
              : `${retailer.baseUrl}/${link}`;
          }
          
          // Skip if essential data is missing
          if (!name || !price) return;
          
          // Clean up data
          name = name.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
          price = price.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
          
          // Extract original price and discount if available
          let originalPrice = null;
          let discount = null;
          
          // Look for original price near the current price
          const priceParent = $container.find(selectors.productPrice).first().parent();
          const originalPriceEl = priceParent.find('.a-text-price, .a-price-strike, ._3I9_wc, ._30jeq3');
          
          if (originalPriceEl.length > 0) {
            originalPrice = originalPriceEl.first().text().trim();
          }
          
          // Look for discount percentage
          const discountEl = $container.find('.a-badge-text, .a-badge-percentage, ._3Ay6Sb, ._1V_ZGU');
          if (discountEl.length > 0) {
            discount = discountEl.first().text().trim();
            // Ensure discount has % symbol
            if (discount && !discount.includes('%')) {
              discount = `${discount}%`;
            }
          }
          
          // Add product to results
          products.push({
            name,
            price,
            originalPrice,
            discount,
            imageUrl,
            rating,
            url: link,
            vendor: retailer.name,
            inStock: true // Assume in stock by default
          });
          
        } catch (error) {
          console.error(`Error parsing product ${index} from ${retailer.name}:`, error);
        }
      });
      
      console.log(`Successfully parsed ${products.length} products from ${retailer.name}`);
      return products;
      
    } catch (error) {
      console.error(`Error parsing HTML from ${retailer.name}:`, error);
      return [];
    }
  }
  
  /**
   * Alternative parsing method when standard selectors fail
   * @param {Object} $ - Cheerio instance
   * @param {Object} retailer - Retailer configuration
   * @param {string} keywords - Search keywords
   * @returns {Promise<Array<Object>>} - Array of product objects
   */
  async parseProductsAlternative($, retailer, keywords) {
    try {
      console.log(`Using alternative parsing for ${retailer.name}...`);
      
      const products = [];
      
      // Look for common product patterns
      const productPatterns = [
        // Look for elements with price and image
        'div:has(img):has(a):has(.price, [class*="price"], [class*="Price"])',
        // Look for card-like elements
        '.card, .product-card, .item, [class*="product-"], [class*="item-"]',
        // Look for elements with links and prices
        'a:has(img):has([class*="price"], [class*="Price"])',
        // Amazon specific
        '[data-component-type="s-search-result"]',
        // Flipkart specific
        '._1AtVbE, ._4ddWXP, ._1xHGtK, ._3pLy-c',
        // Meesho specific
        '.ProductList__Wrapper, [data-testid="product-container"]',
        // Croma specific
        '.product-item, .cp-card, .product-list__item',
        // Reliance Digital specific
        '.sp.grid, .product-grid, .prod-grid, .pl__container',
        // Generic product containers
        '[class*="product-container"], [class*="search-result"]'
      ];
      
      // Try each pattern until we find products
      for (const pattern of productPatterns) {
        const elements = $(pattern);
        console.log(`Found ${elements.length} elements matching pattern: ${pattern}`);
        
        if (elements.length > 0) {
          elements.each((index, element) => {
            try {
              // Limit to first 10 products
              if (index >= 10) return false;
              
              // Look for elements with price-like content
              const priceRegex = /(?:₹|Rs\.?|INR)\s*\d+([.,]\d+)?/i;
              const text = $(element).text();
              
              if (priceRegex.test(text)) {
                // Found a potential product
                const title = $(element).find('h3, h2, .title, .product-title, ._4rR01T, ._3wU53n, .s1Q9rs, ._2B099V, .IRpwTa').text().trim()
                  || $(element).find('a[title]').attr('title')
                  || '';
                  
                if (!title) return;
                
                const priceMatch = text.match(priceRegex);
                const price = priceMatch ? priceMatch[0].trim() : '';
                
                // Find link - try multiple selectors
                let link = $(element).find('a').attr('href') || '#';
                if (link === '#') {
                  // Try specific selectors for different sites
                  link = $(element).find('a._1fQZEK, a.s1Q9rs, a._2rpwqI, a.IRpwTa').attr('href') || '#';
                }
                
                // Find image - try multiple selectors
                let image = $(element).find('img').attr('src') || '';
                if (!image) {
                  // Try data-src attribute (lazy loading)
                  image = $(element).find('img').attr('data-src') || '';
                }
                if (!image) {
                  // Try specific selectors for different sites
                  image = $(element).find('img._396cs4, img._2r_T1I, .s-image, img[data-image-latency="s-product-image"]').attr('src') || '';
                }
                
                // Find rating
                let rating = 'N/A';
                const ratingEl = $(element).find('._3LWZlK, ._1lRcqv, .a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt');
                if (ratingEl.length > 0) {
                  rating = ratingEl.first().text().trim();
                }
                
                // Find original price
                let originalPrice = null;
                const originalPriceEl = $(element).find('._3I9_wc, .a-text-price, .a-price-strike');
                if (originalPriceEl.length > 0) {
                  originalPrice = originalPriceEl.first().text().trim();
                }
                
                // Find discount
                let discount = null;
                const discountEl = $(element).find('._3Ay6Sb, ._1V_ZGU, .a-badge-text, .a-badge-percentage');
                if (discountEl.length > 0) {
                  discount = discountEl.first().text().trim();
                  if (discount && !discount.includes('%')) {
                    discount = `${discount}%`;
                  }
                }
                
                products.push({
                  name: title,
                  price: price,
                  originalPrice: originalPrice,
                  discount: discount,
                  imageUrl: image,
                  url: link.startsWith('http') ? link : (link.startsWith('/') ? `${retailer.baseUrl}${link}` : `${retailer.baseUrl}/${link}`),
                  rating: rating,
                  inStock: true,
                  vendor: retailer.name
                });
              }
            } catch (error) {
              console.error(`Error in alternative parsing for element ${index}:`, error);
            }
          });
          
          // If we found products, return them
          if (products.length > 0) {
            console.log(`Found ${products.length} products using alternative parsing`);
            return products;
          }
        }
      }
      
      return products;
    } catch (error) {
      console.error(`Error in alternative parsing for ${retailer.name}:`, error);
      return [];
    }
  }
}

  /**
   * Scrape products by keywords
   * @param {string} keywords - Search keywords
   * @returns {Promise<Object>} - Object containing results and metadata
   */
  async scrapeProductsByKeywords(keywords) {
    try {
      console.log(`Scraping products for keywords: ${keywords}`);
      
      // Use the searchProduct method to get results
      const results = await this.searchProduct(keywords);
      
      return {
        query: keywords,
        count: results.length,
        results
      };
    } catch (error) {
      console.error('Error scraping products by keywords:', error);
      return {
        query: keywords,
        count: 0,
        results: []
      };
    }
  }
  
  /**
   * Search for a product across multiple retailers
   * @param {string} query - Search query
   * @returns {Promise<Array<Object>>} - Array of product objects
   */
  async searchProduct(query) {
    try {
      console.log(`Searching for product: ${query}`);
      
      // Normalize the query
      const normalizedQuery = query.trim().toLowerCase();
      
      // Array to store all results
      const allResults = [];
      
      // Search across all retailers
      for (const retailerKey in this.retailers) {
        const retailer = this.retailers[retailerKey];
        console.log(`Searching on ${retailer.name}...`);
        
        try {
          // Construct the search URL
          const searchUrl = retailer.searchUrl.replace('{query}', encodeURIComponent(normalizedQuery));
          console.log(`Search URL: ${searchUrl}`);
          
          // Determine the scraping method based on retailer type
          let result;
          if (retailer.type === 'dynamic') {
            console.log(`Using ${retailer.preferredMethod} for ${retailer.name}`);
            
            if (retailer.preferredMethod === 'playwright') {
              result = await this.scrapeWithPlaywright(searchUrl);
            } else {
              result = await this.scrapeWithPuppeteer(searchUrl);
            }
          } else {
            console.log(`Using direct request for ${retailer.name}`);
            result = await this.makeRequest(searchUrl);
          }
          
          // Check if scraping was successful
          if (!result.success || !result.html) {
            console.log(`Failed to scrape ${retailer.name}, trying alternative method...`);
            
            // Try alternative method
            if (retailer.type === 'dynamic') {
              if (retailer.preferredMethod === 'playwright') {
                result = await this.scrapeWithPuppeteer(searchUrl);
              } else {
                result = await this.scrapeWithPlaywright(searchUrl);
              }
            }
            
            // If still unsuccessful, skip this retailer
            if (!result.success || !result.html) {
              console.log(`Skipping ${retailer.name} due to scraping failure`);
              continue;
            }
          }
          
          // Parse the HTML to extract products
          const products = await this.parseProductsFromHTML(result.html, retailer, normalizedQuery);
          
          // Add retailer information to each product
          const retailerProducts = products.map(product => ({
            ...product,
            retailer: retailer.name,
            retailerLogo: this.getRetailerLogo(retailer.name)
          }));
          
          console.log(`Found ${retailerProducts.length} products from ${retailer.name}`);
          
          // Add to all results
          allResults.push(...retailerProducts);
        } catch (error) {
          console.error(`Error searching on ${retailer.name}:`, error);
        }
      }
      
      // Sort results by price (lowest first)
      allResults.sort((a, b) => {
        const priceA = this.extractNumericPrice(a.price);
        const priceB = this.extractNumericPrice(b.price);
        return priceA - priceB;
      });
      
      // Mark the lowest price product
      if (allResults.length > 0) {
        allResults[0].isLowestPrice = true;
      }
      
      // Mark the best deal (highest discount)
      const bestDeal = allResults.reduce((best, current) => {
        const currentDiscount = current.discount ? 
          parseFloat(current.discount.replace(/[^0-9.]/g, '')) : 0;
        const bestDiscount = best ? 
          parseFloat(best.discount?.replace(/[^0-9.]/g, '') || '0') : 0;
        
        return currentDiscount > bestDiscount ? current : best;
      }, null);
      
      if (bestDeal) {
        bestDeal.isBestDeal = true;
      }
      
      console.log(`Total products found across all retailers: ${allResults.length}`);
      return allResults;
    } catch (error) {
      console.error('Error searching for product:', error);
      return [];
    }
  }
}

module.exports = new ScraperService();