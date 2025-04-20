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
const fs = require('fs');
const path = require('path');
const playwrightHelpers = require('./improvedPlaywright');

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
          productContainer: '[data-component-type="s-search-result"], .s-result-item, .sg-col-20-of-24, .sg-col-16-of-20',
          productLink: 'a.a-link-normal.s-no-outline, h2 a, .a-link-normal.a-text-normal, .rush-component a.a-link-normal',
          productTitle: '.a-size-medium.a-color-base.a-text-normal, .a-size-base-plus.a-color-base.a-text-normal, h2 .a-link-normal, .a-color-base.a-text-normal',
          productPrice: '.a-price .a-offscreen, .a-price-whole, .a-price span[aria-hidden="true"], .a-color-base span.a-price-whole',
          productImage: '.s-image, img[data-image-load], .a-dynamic-image, img[srcset]',
          productRating: '.a-icon-star-small, .a-icon-star, .a-size-small.a-color-base span, i.a-icon.a-icon-star',
          detailPrice: '#priceblock_ourprice, .a-price span.a-offscreen, #price_inside_buybox, .a-price .a-offscreen',
          detailTitle: '#productTitle, #title, .product-title-word-break',
          detailImage: '#landingImage, #imgTagWrapperId img, .imgTagWrapper img, #main-image-container img',
          detailFeatures: '#feature-bullets, #productOverview_feature_div, .a-unordered-list.a-vertical.a-spacing-mini',
          detailSpecs: '.a-size-base.a-color-secondary, .prodDetTable, .a-expander-content, .product-facts-wrapper'
        },
        type: 'dynamic'
      },
      flipkart: {
        name: 'Flipkart',
        baseUrl: 'https://www.flipkart.com',
        searchUrl: 'https://www.flipkart.com/search?q=',
        selectors: {
          productContainer: '._1AtVbE, ._1YokD2, ._4ddWXP, ._2B099V',
          productLink: '._1fQZEK, ._2rpwqI, ._3pLy-c, a[href*="/p/"]',
          productTitle: '._4rR01T, .s1Q9rs, ._2WkVRV, .IRpwTa',
          productPrice: '._30jeq3, ._1_WHN1, ._30jeq3._1_WHN1, ._3I9_wc',
          productImage: '._396cs4, ._2r_T1I, ._3exPp9, img[src*="www.flipkart.com"]',
          productRating: '._3LWZlK, ._1wB99o, .hGSR34, ._2_R_DZ',
          detailPrice: '._30jeq3._16Jk6d, ._30jeq3, .CEmiEU, ._25b18c',
          detailTitle: '.B_NuCI, ._30jeq3, .yhB1nd, .aMaAEs',
          detailImage: '._396cs4, ._2r_T1I, .CXW8mj img, ._3nMexc img',
          detailFeatures: '._2418kt, ._3_A9FP, ._2cM9lP, .X3BRps ul',
          detailSpecs: '._3dtsli, ._14cfVK, .g2dDAR, ._2777T5 table'
        },
        type: 'dynamic'
      },
      meesho: {
        name: 'Meesho',
        baseUrl: 'https://www.meesho.com',
        searchUrl: 'https://www.meesho.com/search?q=',
        selectors: {
          productContainer: '.sc-dkrFOg, .ProductList__GridCol-sc-8lnc8o-0, [data-testid="product-card"]',
          productLink: 'a[href*="/product/"]',
          productTitle: '.Card__Title-sc-1rfqasg-2, .NewProductCard__ProductTitle_Desktop-sc-j0e7tu-4, .Text-sc-1p3bmpa-0',
          productPrice: '.Card__Price-sc-1rfqasg-3, .NewProductCard__PriceFlex-sc-j0e7tu-6, [data-testid="product-price"]',
          productImage: '.NewProductCard__Image-sc-j0e7tu-2 img, .Card__Image-sc-1rfqasg-0 img, img[src*="meesho"]',
          productRating: '.NewProductCard__Ratings-sc-j0e7tu-5, .Card__Ratings-sc-1rfqasg-4, [data-testid="rating"]',
          detailPrice: '[data-testid="price"], .ProductDetails__DiscountText-sc-1weu2lw-7, .Text-sc-1p3bmpa-0',
          detailTitle: '[data-testid="name"], .ProductDetails__ProductTitle-sc-1weu2lw-3, .Text-sc-1p3bmpa-0',
          detailImage: '.ImageZoom__ZoomLensImage-sc-18m58v1-1 img, [data-testid="image-preview"] img',
          detailFeatures: '.ProductDetails__AttributeContent-sc-1weu2lw-2, .Accordion__Content-sc-10ezwvt-3, [data-testid="product-description"]',
          detailSpecs: '.ProductDetails__DetailRow-sc-1weu2lw-10, .Accordion__Content-sc-10ezwvt-3, [data-testid="product-specifications"]'
        },
        type: 'dynamic'
      },
      croma: {
        name: 'Croma',
        baseUrl: 'https://www.croma.com',
        searchUrl: 'https://www.croma.com/searchB?q=',
        selectors: {
          productContainer: '.product-item, .product-grid__item, .cp-product-list-box',
          productLink: 'a.product-title, a[href*="/p/"], .product__details a',
          productTitle: '.product-title, .pdp-title, h1.pd-title',
          productPrice: '.pdp-price, .amount, .cp-price span, .new-price',
          productImage: '.product-img img, .plp-card-image img, .pd-img-container img',
          productRating: '.rating, .product-rating, .cp-rating',
          detailPrice: '.pdp-price, .new-price, #price',
          detailTitle: '.pdp-title, h1.pd-title, .pd-product-title',
          detailImage: '.pd-main-img img, .product-image img',
          detailFeatures: '.feature-list, .product-features-container, .cp-feature-list',
          detailSpecs: '.specification-list, .specifications-container, .cp-spec-list'
        },
        type: 'dynamic'
      },
      relianceDigital: {
        name: 'Reliance Digital',
        baseUrl: 'https://www.reliancedigital.in',
        searchUrl: 'https://www.reliancedigital.in/search?q=',
        selectors: {
          productContainer: '.sp.grid, .product-grid, .prod-grid, .pl__container, .grid-item, .card-container',
          productLink: '.pl__container a, .prod-name a, .product-name a, .slider-link, .gtm-product-click a',
          productTitle: '.sp__name, .prod-name, .product-name, h3.product-title, .slider-text .slider-h',
          productPrice: '.sp__price, .prod-price, .product-price, .current-price, .slider-p.slidertext', 
          productImage: '.productImg img, .prod-img img, .product-image img, .slider-img, .js-gtm-product-click img',
          productRating: '.SP__ratings, .prod-rating, .rating-stars, div.rating, .slider-rating',
          detailPrice: '.pdp__price, .prod-sp, .final-price, .pdp-price, .pdp__offerPrice',
          detailTitle: '.pdp__title, .prod-title, .product-title, h1.pdp__title',
          detailImage: '.pdp__imgCont img, .prod-img-container img, .image-section img',
          detailFeatures: '.pdp__features li, .prod-features li, .features-list li',
          detailSpecs: '.specification-table tr, .prod-specs tr, .esp-attributes div'
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
   * Extract numeric price from a price string
   * @param {string} priceStr - Price string (e.g., "₹1,299.00")
   * @returns {number} - Numeric price value
   */
  extractNumericPrice(priceStr) {
    if (!priceStr) return 0;
    
    // Remove currency symbols, commas, and other non-numeric characters
    const numericStr = priceStr.replace(/[^\d.]/g, '');
    
    // Parse as float
    return parseFloat(numericStr) || 0;
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
          '--no-proxy-server', // Force disable any system proxies
          '--disable-features=IsolateOrigins,site-per-process' // Disable site isolation
        ],
        ignoreHTTPSErrors: true,
        defaultViewport: null // Let the browser determine viewport size
      };

      console.log(`Launching Puppeteer with direct connection for ${url}`);
      browser = await puppeteerExtra.launch(launchOptions);
      page = await browser.newPage();

      // Set random viewport size to avoid detection
      await page.setViewport({
        width: 1366 + Math.floor(Math.random() * 100),
        height: 768 + Math.floor(Math.random() * 100),
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

      // Set cookies to appear more like a real user
      await page.setCookie({
        name: 'visitor_id',
        value: randomString.generate(16),
        domain: new URL(url).hostname,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 // 24 hours
      });

      // Intercept requests to block unnecessary resources
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Set timeout for navigation
      page.setDefaultNavigationTimeout(180000); // 180 seconds (3 minutes)

      // Navigate to the URL
      console.log(`Navigating to ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 180000 });
      
      // Wait for a short random time
      await this.randomDelay(2000, 4000);
      
      // Detect and handle cookie consent popups
      await this.handleCookieConsent(page);
      
      // Simulate random scrolling behavior
      await this.simulateHumanScroll(page);
      
      // Wait for product containers based on the URL
      await this.waitForProductContainers(page, url);

      // Get the page content
      const html = await page.content();
      
      // Take a screenshot for debugging
      const fs = require('fs');
      const path = require('path');
      const debugDir = path.join(__dirname, '../../debug');
      
      // Create debug directory if it doesn't exist
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      // Save screenshot
      const screenshotPath = path.join(debugDir, `puppeteer-${new URL(url).hostname}-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved screenshot to ${screenshotPath}`);
      
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
   * Handle cookie consent popups
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<void>}
   */
  async handleCookieConsent(page) {
    try {
      // Common cookie consent button selectors
      const consentSelectors = [
        '#accept-cookies',
        '#accept-cookie-consent',
        '.cookie-consent-accept',
        '.cookie-accept',
        'button[aria-label="Accept cookies"]',
        'button[aria-label="Accept all cookies"]',
        'button:contains("Accept")',
        'button:contains("Accept all")',
        'button:contains("Accept cookies")',
        '.cookie-banner button',
        '#cookie-banner button',
        '.cookie-notice button',
        '#cookie-notice button',
        '.consent-banner button',
        '#consent-banner button',
        '.gdpr-banner button',
        '#gdpr-banner button',
        '.privacy-banner button',
        '#privacy-banner button',
        '.cookie-policy button',
        '#cookie-policy button',
        '.cookie-dialog button',
        '#cookie-dialog button',
        '.cookie-popup button',
        '#cookie-popup button',
        '.cookie-modal button',
        '#cookie-modal button',
        '.cookie-overlay button',
        '#cookie-overlay button',
        '.cookie-notification button',
        '#cookie-notification button',
        '.cookie-message button',
        '#cookie-message button',
        '.cookie-alert button',
        '#cookie-alert button',
        '.cookie-warning button',
        '#cookie-warning button',
        '.cookie-info button',
        '#cookie-info button',
        '.cookie-consent button',
        '#cookie-consent button',
        '.cookie-agreement button',
        '#cookie-agreement button',
        '.cookie-notice-banner button',
        '#cookie-notice-banner button',
        '.cookie-consent-banner button',
        '#cookie-consent-banner button',
        '.cookie-policy-banner button',
        '#cookie-policy-banner button',
        '.cookie-banner-overlay button',
        '#cookie-banner-overlay button',
        '.cookie-consent-overlay button',
        '#cookie-consent-overlay button',
        '.cookie-policy-overlay button',
        '.cookie-banner-modal button',
        '#cookie-banner-modal button',
        '.cookie-consent-modal button',
        '#cookie-consent-modal button',
        '.cookie-policy-modal button',
        '.cookie-banner-dialog button',
        '#cookie-banner-dialog button',
        '.cookie-consent-dialog button',
        '#cookie-consent-dialog button',
        '.cookie-policy-dialog button',
        '.cookie-banner-popup button',
        '#cookie-banner-popup button',
        '.cookie-consent-popup button',
        '#cookie-consent-popup button',
        '.cookie-policy-popup button',
        '.cookie-banner-notification button',
        '#cookie-banner-notification button',
        '.cookie-consent-notification button',
        '#cookie-consent-notification button',
        '.cookie-policy-notification button',
        '.cookie-banner-message button',
        '#cookie-banner-message button',
        '.cookie-consent-message button',
        '#cookie-consent-message button',
        '.cookie-policy-message button',
        '.cookie-banner-alert button',
        '#cookie-banner-alert button',
        '.cookie-consent-alert button',
        '#cookie-consent-alert button',
        '.cookie-policy-alert button',
        '.cookie-banner-warning button',
        '#cookie-banner-warning button',
        '.cookie-consent-warning button',
        '#cookie-consent-warning button',
        '.cookie-policy-warning button',
        '.cookie-banner-info button',
        '#cookie-banner-info button',
        '.cookie-consent-info button',
        '#cookie-consent-info button',
        '.cookie-policy-info button',
        '.cookie-banner-agreement button',
        '#cookie-banner-agreement button',
        '.cookie-consent-agreement button',
        '#cookie-consent-agreement button',
        '.cookie-policy-agreement button'
      ];
      
      // Try each selector
      for (const selector of consentSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`Found cookie consent button: ${selector}`);
            await button.click();
            console.log('Clicked cookie consent button');
            await this.randomDelay(1000, 2000);
            break;
          }
        } catch (error) {
          // Ignore errors and try the next selector
        }
      }
    } catch (error) {
      console.error('Error handling cookie consent:', error);
    }
  }
  
  /**
   * Wait for product containers based on the URL
   * @param {Page} page - Puppeteer page object
   * @param {string} url - URL being scraped
   * @returns {Promise<void>}
   */
  async waitForProductContainers(page, url) {
    try {
      const hostname = new URL(url).hostname;
      
      // Define selectors for different sites
      const selectors = {
        'amazon.in': '[data-component-type="s-search-result"]',
        'flipkart.com': 'div._1YokD2._3Mn1Gg ._1AtVbE, div._2kHMtA',
        'meesho.com': '.ProductList__Wrapper, div[data-testid="product-container"]',
        'croma.com': '.product-item, .cp-card, .product-list__item',
        'reliancedigital.in': '.sp.grid, .product-grid, .prod-grid, .pl__container'
      };
      
      // Find the matching selector
      let selector = null;
      for (const [domain, sel] of Object.entries(selectors)) {
        if (hostname.includes(domain)) {
          selector = sel;
          break;
        }
      }
      
      if (selector) {
        console.log(`Waiting for product containers with selector: ${selector}`);
        await page.waitForSelector(selector, { timeout: 10000 }).catch(e => {
          console.log(`Selector ${selector} not found, continuing anyway`);
        });
      } else {
        console.log(`No specific selector for ${hostname}, using default wait`);
        await this.randomDelay(5000, 8000);
      }
    } catch (error) {
      console.error('Error waiting for product containers:', error);
      // Continue anyway
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
      
      // Increased timeout to avoid hanging too long
      const timeout = 180000; // 180 seconds (3 minutes) instead of 30 seconds
      
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
   * Search for a product across all retailers
   * @param {string} query - Product search query
   * @returns {Promise<Array<Object>>} - Array of product objects from all retailers
   */
  async searchProduct(query) {
    try {
      console.log(`Searching for product: ${query}`);
      const allResults = [];
      const failedRetailers = [];
      const scrapedRetailers = [];
      
      // Normalize the query for URL usage
      const normalizedQuery = encodeURIComponent(query.trim());
      
      // For each retailer, try to scrape product data
      for (const [retailerKey, retailer] of Object.entries(this.retailers)) {
        try {
          console.log(`Scraping from ${retailer.name}...`);
          
          // Construct the search URL
          const searchUrl = `${retailer.searchUrl}${normalizedQuery}`;
          console.log(`Search URL: ${searchUrl}`);
          
          // Use the most reliable scraping method for this retailer
          let scrapeResult;
          if (retailer.type === 'dynamic') {
            // Try with playwright first (more modern and reliable browser automation)
            scrapeResult = await this.scrapeWithPlaywright(searchUrl);
            
            // If playwright fails, fall back to puppeteer
            if (!scrapeResult.success) {
              console.log(`Playwright failed for ${retailer.name}, trying puppeteer...`);
              scrapeResult = await this.scrapeWithPuppeteer(searchUrl);
            }
          } else {
            // For static sites, use simple HTTP request
            scrapeResult = await this.makeRequest(searchUrl);
          }
          
          // If scraping was successful, parse the products
          if (scrapeResult.success && scrapeResult.html) {
            // Parse HTML to extract products
            const products = await this.parseProductsFromHTML(scrapeResult.html, retailer, query);
            
            if (products && products.length > 0) {
              // Add retailer name to each product
              const productsWithRetailer = products.map(product => ({
                ...product,
                retailer: retailer.name
              }));
              
              // Add to results array
              allResults.push(...productsWithRetailer);
              scrapedRetailers.push(retailer.name);
              
              // Save HTML to debug folder
              this.saveHtmlForDebug(retailer.name, scrapeResult.html);
            } else {
              console.log(`No products found from ${retailer.name}`);
              failedRetailers.push(retailer.name);
            }
          } else {
            console.error(`Failed to scrape from ${retailer.name}`);
            failedRetailers.push(retailer.name);
          }
        } catch (error) {
          console.error(`Error scraping from ${retailer.name}:`, error);
          failedRetailers.push(retailer.name);
        }
        
        // Add a slight delay between retailers to avoid rate limiting
        await this.randomDelay(1000, 2000);
      }
      
      console.log(`Search complete. Found ${allResults.length} products from ${scrapedRetailers.length} retailers`);
      
      // Return the results along with metadata
      return {
        products: allResults,
        failedRetailers,
        scrapedRetailers,
        count: allResults.length,
        query
      };
    } catch (error) {
      console.error('Error in searchProduct:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Save HTML content to debug folder for analysis
   * @param {string} retailerName - Name of the retailer
   * @param {string} html - HTML content to save
   */
  saveHtmlForDebug(retailerName, html) {
    try {
      const fs = require('fs');
      const path = require('path');
      const debugDir = path.join(__dirname, '../../debug');
      
      // Create debug directory if it doesn't exist
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      // Save HTML content
      const fileName = `${retailerName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.html`;
      const filePath = path.join(debugDir, fileName);
      fs.writeFileSync(filePath, html);
      console.log(`Saved debug HTML to ${filePath}`);
    } catch (error) {
      console.error('Error saving debug HTML:', error);
    }
  }

  /**
   * Search for products using keywords extracted from an image
   * @param {string} keywords - Keywords for product search
   * @returns {Promise<Object>} - Search results with products and metadata
   */
  async scrapeProductsByKeywords(keywords) {
    try {
      console.log(`Searching for products using keywords: ${keywords}`);
      // Reuse the searchProduct function with the keywords
      const results = await this.searchProduct(keywords);
      
      return results;
    } catch (error) {
      console.error('Error in scrapeProductsByKeywords:', error);
      throw new Error(`Keyword search failed: ${error.message}`);
    }
  }
}

module.exports = new ScraperService();