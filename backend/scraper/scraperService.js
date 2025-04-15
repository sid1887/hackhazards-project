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
          productContainer: '._1YokD2 ._1AtVbE, ._4ddWXP',
          productLink: '._1fQZEK, ._2rpwqI, .s1Q9rs',
          productTitle: '._4rR01T, .s1Q9rs, ._2B099V',
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
          productContainer: '.ProductList__Wrapper',
          productLink: '.ProductList__ImageWrapper a',
          productTitle: '.Card__Title',
          productPrice: '.Card__Price',
          productImage: '.Card__Image',
          productRating: '.Card__Rating',
          detailPrice: '.ProdPriceBxCss__FinalPrc',
          detailTitle: '.PdpMainCss__PrdTitle',
          detailImage: '.ImageGalleryComponent__BgImg',
          detailFeatures: '.ProductDesc__Details li, .ProductSpec__SpecsBox',
          detailSpecs: '.ProductDesc__Details td'
        },
        type: 'dynamic'
      },
      croma: {
        name: 'Croma',
        baseUrl: 'https://www.croma.com',
        searchUrl: 'https://www.croma.com/searchB?q=',
        selectors: {
          productContainer: '.product-item',
          productLink: '.product-title a',
          productTitle: '.product-title',
          productPrice: '.pdpPrice',
          productImage: '.product-img img',
          productRating: '.rating-value',
          detailPrice: '.offer-pricing',
          detailTitle: '.pdp-title',
          detailImage: '.carousel-item img',
          detailFeatures: '.highlightLink li',
          detailSpecs: '.specification-table tr'
        },
        type: 'dynamic'
      },
      relianceDigital: {
        name: 'Reliance Digital',
        baseUrl: 'https://www.reliancedigital.in',
        searchUrl: 'https://www.reliancedigital.in/search?q=',
        selectors: {
          productContainer: '.sp grid',
          productLink: '.pl__container a',
          productTitle: '.sp__name',
          productPrice: '.sp__price',
          productImage: '.productImg img',
          productRating: '.SP__ratings',
          detailPrice: '.pdp__price',
          detailTitle: '.pdp__title',
          detailImage: '.pdp__imgCont img',
          detailFeatures: '.pdp__features li',
          detailSpecs: '.specification-table tr'
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
   * Scrape a retail website for products based on keywords
   * @param {string} keywords - Search keywords
   * @returns {Promise<{
   *   results: Array<{
   *     title: string,
   *     price: string,
   *     link: string,
   *     image: string,
   *     retailer: string,
   *     rating: string,
   *     delivery: string
   *   }>},
   *   count: number,
   *   retailersAttempted: number,
   *   retailersSuccessful: number,
   *   errors: Array<{retailer: string, error: string}>
   * }>}
   */
  async scrapeProductsByKeywords(keywords) {
    console.log(`Scraping products for keywords: ${keywords}`);
    
    const normalizedKeywords = encodeURIComponent(keywords.trim());
    const results = [];
    const errors = [];
    let retailersAttempted = 0;
    let retailersSuccessful = 0;
    
    // Process retailers sequentially to avoid overwhelming the system
    // This can help prevent detection and improve stability
    for (const retailer of Object.values(this.retailers)) {
      try {
        retailersAttempted++;
        const searchUrl = `${retailer.searchUrl}${normalizedKeywords}`;
        console.log(`Scraping ${retailer.name} with URL: ${searchUrl}`);
        
        // Add a small delay between retailers to avoid detection
        if (retailersAttempted > 1) {
          await this.randomDelay(1000, 3000);
        }
        
        // Choose scraping method based on retailer type
        let scrapingResult;
        let scrapingMethod = '';
        
        switch (retailer.type) {
          case 'dynamic':
            // Try Playwright first - no proxy
            try {
              scrapingResult = await this.scrapeWithPlaywright(searchUrl, false);
              scrapingMethod = 'Playwright';
            } catch (playwrightError) {
              console.error(`Playwright error for ${retailer.name}:`, playwrightError);
              scrapingResult = { success: false, error: playwrightError.message };
            }
            
            // If Playwright fails, fall back to Puppeteer - no proxy
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
            
            // If both fail, try direct request without proxy
            if (!scrapingResult.success) {
              console.log(`Puppeteer failed for ${retailer.name}, trying direct request...`);
              try {
                const directResult = await this.makeRequest(searchUrl, false, false);
                scrapingResult = { html: directResult.data, success: directResult.success, error: directResult.error };
                scrapingMethod = 'Direct Request';
              } catch (requestError) {
                console.error(`Direct request error for ${retailer.name}:`, requestError);
                scrapingResult = { success: false, error: requestError.message };
              }
            }
            break;
            
          case 'static':
          default:
            // For static sites, a simple direct request should work
            try {
              const requestResult = await this.makeRequest(searchUrl, false, false);
              scrapingResult = { html: requestResult.data, success: requestResult.success, error: requestResult.error };
              scrapingMethod = 'Direct Request';
            } catch (requestError) {
              console.error(`Direct request error for ${retailer.name}:`, requestError);
              scrapingResult = { success: false, error: requestError.message };
            }
            break;
        }
        
        if (!scrapingResult.success) {
          throw new Error(scrapingResult.error || `Unknown error during scraping with ${scrapingMethod}`);
        }
        
        // Parse the HTML to extract product data
        let productData = [];
        try {
          productData = await this.parseProductListHtml(scrapingResult.html, retailer);
          console.log(`Parsing found ${productData.length} products from ${retailer.name}`);
        } catch (parseError) {
          console.error(`Error parsing HTML for ${retailer.name}:`, parseError);
          throw new Error(`HTML parsing error: ${parseError.message}`);
        }
        
        if (productData.length > 0) {
          console.log(`Successfully scraped ${productData.length} products from ${retailer.name}`);
          retailersSuccessful++;
          
          // Add retailer info to each product
          productData.forEach(product => {
            product.retailer = retailer.name;
            product.retailerBaseUrl = retailer.baseUrl;
            product.scrapingMethod = scrapingMethod;
            
            // Make sure links are absolute
            if (product.link && !product.link.startsWith('http')) {
              product.link = retailer.baseUrl + (product.link.startsWith('/') ? product.link : `/${product.link}`);
            }
            
            results.push(product);
          });
        } else {
          console.log(`No products found on ${retailer.name}`);
          errors.push({
            retailer: retailer.name,
            error: 'No products found in the search results',
            scrapingMethod
          });
        }
      } catch (error) {
        console.error(`Error scraping ${retailer.name}:`, error);
        errors.push({
          retailer: retailer.name,
          error: error.message || 'Unknown error'
        });
      }
    }
    
    // If traditional scraping failed completely, try AI-based extraction
    if (results.length === 0 && retailersSuccessful === 0) {
      console.log('Traditional scraping failed. Attempting AI-based extraction...');
      try {
        const aiResults = await this.performAIBasedExtraction(keywords);
        if (aiResults.length > 0) {
          console.log(`AI-based extraction found ${aiResults.length} products`);
          results.push(...aiResults);
        } else {
          console.log('AI-based extraction found no products');
        }
      } catch (aiError) {
        console.error('Error during AI-based extraction:', aiError);
      }
    }
    
    // Sort by price (low to high)
    results.sort((a, b) => {
      const priceA = this.extractNumericPrice(a.price);
      const priceB = this.extractNumericPrice(b.price);
      return priceA - priceB;
    });
    
    console.log(`Scraping complete. Found ${results.length} products from ${retailersSuccessful} retailers.`);
    
    return {
      results,
      count: results.length,
      retailersAttempted,
      retailersSuccessful,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Extract numeric price from price string
   * @param {string} priceStr - Price string
   * @returns {number} - Numeric price
   */
  extractNumericPrice(priceStr) {
    if (!priceStr) return Infinity;
    
    // Remove currency symbols, commas, spaces, etc., and extract numbers
    const matches = priceStr.replace(/[^\d.]/g, '').match(/\d+(\.\d+)?/);
    return matches ? parseFloat(matches[0]) : Infinity;
  }

  /**
   * Parse HTML from a product listing page
   * @param {string} html - HTML content
   * @param {Object} retailer - Retailer configuration
   * @returns {Promise<Array<Object>>} - Array of product objects
   */
  async parseProductListHtml(html, retailer) {
    try {
      const $ = cheerio.load(html);
      const products = [];
      const selectors = retailer.selectors;
      
      // Debug: Log the HTML structure to help diagnose issues
      // console.log(`HTML structure for ${retailer.name}:`, $.html().substring(0, 500) + '...');
      
      // First try: Use retailer-specific selectors to extract product data
      $(selectors.productContainer).each((i, element) => {
        // Skip if we have enough products
        if (i >= 20) return false;
        
        try {
          // Extract product details
          const titleElement = $(element).find(selectors.productTitle);
          const priceElement = $(element).find(selectors.productPrice);
          const linkElement = $(element).find(selectors.productLink);
          const imageElement = $(element).find(selectors.productImage);
          const ratingElement = $(element).find(selectors.productRating);
          
          let title = titleElement.text().trim();
          
          // If no text found, try getting title from attributes
          if (!title) {
            title = titleElement.attr('title') || titleElement.attr('alt') || '';
          }
          
          // Skip if no title (likely not a product)
          if (!title) return;
          
          let price = priceElement.text().trim();
          let link = linkElement.attr('href') || '#';
          let image = imageElement.attr('src') || imageElement.attr('data-src') || '';
          let rating = ratingElement.text().trim();
          
          // Handle relative URLs
          if (link && link !== '#' && !link.startsWith('http')) {
            link = retailer.baseUrl + (link.startsWith('/') ? link : `/${link}`);
          }
          
          // Handle lazy-loaded images
          if (!image) {
            image = imageElement.attr('data-src') || imageElement.attr('data-lazy-src') || imageElement.attr('data-original') || '';
          }
          
          products.push({
            title,
            price: price || 'Check on site',
            link,
            image,
            rating: rating || 'N/A',
            retailer: retailer.name,
            delivery: 'Check website for details'
          });
        } catch (itemError) {
          console.error(`Error parsing product item for ${retailer.name}:`, itemError);
          // Continue with next item
        }
      });
      
      // Second try: If standard parsing failed, try alternative selectors
      if (products.length === 0) {
        console.log(`No products found with primary selectors for ${retailer.name}, trying alternative selectors...`);
        this.parseWithAlternativeSelectors($, retailer, products);
      }
      
      // Third try: If still no products, try a very generic approach
      if (products.length === 0) {
        console.log(`No products found with alternative selectors for ${retailer.name}, trying generic approach...`);
        
        // Look for any elements that might contain product information
        $('a[href*="product"], a[href*="/p/"], div[class*="product"], div[class*="item"]').each((i, element) => {
          if (products.length >= 20) return false;
          
          try {
            const link = $(element).attr('href') || $(element).find('a').attr('href') || '#';
            let title = $(element).attr('title') || $(element).text().trim();
            
            // Try to find title in nearby elements if not found
            if (!title || title.length < 3) {
              title = $(element).find('h2, h3, [class*="title"], [class*="name"]').text().trim();
            }
            
            // Skip if no valid title
            if (!title || title.length < 3) {
              return; // This is the correct way to 'continue' in jQuery each
            }
            
            // Look for price patterns in text
            const allText = $(element).text();
            const priceMatch = allText.match(/(?:₹|Rs\.?|INR)\s*[\d,]+(\.\d+)?/i);
            const price = priceMatch ? priceMatch[0].trim() : 'Check on site';
            
            // Try to find an image
            const image = $(element).find('img').attr('src') || 
                         $(element).find('img').attr('data-src') || 
                         '';
            
            products.push({
              title: title.substring(0, 100), // Limit title length
              price,
              link,
              image,
              rating: 'N/A',
              retailer: retailer.name,
              delivery: 'Check website for details',
              note: 'Found with generic selectors'
            });
          } catch (genericError) {
            // Ignore errors in generic parsing
          }
        });
      }
      
      return products;
    } catch (error) {
      console.error(`Error parsing HTML for ${retailer.name}:`, error);
      return [];
    }
  }

  /**
   * Parse HTML with alternative selectors if standard ones fail
   * @param {CheerioStatic} $ - Cheerio instance
   * @param {Object} retailer - Retailer configuration
   * @param {Array<Object>} products - Products array to append to
   */
  parseWithAlternativeSelectors($, retailer, products) {
    // Try common alternative selectors based on the retailer
    switch (retailer.name) {
      case 'Amazon':
        // Try multiple selector patterns for Amazon
        // First try standard search results
        $('div.s-result-item, div[data-component-type="s-search-result"], div.sg-col-4-of-24').each((i, element) => {
          if (i >= 20) return false;
          
          const title = $(element).find('h2, .a-size-medium, .a-size-base-plus').text().trim();
          if (!title) return;
          
          // Try multiple price selectors
          let price = '';
          const priceWhole = $(element).find('.a-price-whole').text().trim();
          const priceOffscreen = $(element).find('.a-price .a-offscreen').text().trim();
          const priceSymbol = $(element).find('.a-price-symbol').text().trim();
          
          if (priceOffscreen) {
            price = priceOffscreen;
          } else if (priceWhole) {
            price = priceSymbol ? `${priceSymbol}${priceWhole}` : `₹${priceWhole}`;
          }
          
          // Try multiple link selectors
          const link = $(element).find('a.a-link-normal[href*="/dp/"], a[href*="/gp/product/"]').attr('href') || 
                      $(element).find('h2 a, .a-size-medium a').attr('href') || '#';
                      
          // Try multiple image selectors
          const image = $(element).find('img.s-image, img[data-image-latency="s-product-image"]').attr('src') || 
                       $(element).find('img').attr('src') || '';
          
          // Try to find rating
          const ratingText = $(element).find('.a-icon-star-small, .a-icon-star').text().trim();
          const ratingAlt = $(element).find('.a-icon-alt').text().trim();
          const rating = ratingAlt || ratingText || 'N/A';
          
          products.push({
            title,
            price: price || 'Check on site',
            link,
            image,
            rating,
            retailer: retailer.name,
            delivery: 'Check website for details'
          });
        });
        
        // If no products found, try a more generic approach
        if (products.length === 0) {
          $('a[href*="/dp/"], a[href*="/gp/product/"]').each((i, element) => {
            if (i >= 20) return false;
            
            const link = $(element).attr('href') || '#';
            // Skip if not a product link
            if (!link.includes('/dp/') && !link.includes('/gp/product/')) return;
            
            const parentDiv = $(element).closest('div');
            const title = $(element).attr('title') || parentDiv.find('h2, .a-text-normal').text().trim();
            if (!title) return;
            
            // Look for price near this element
            const price = parentDiv.find('.a-price, .a-color-price').text().trim();
            const image = parentDiv.find('img').attr('src') || '';
            
            products.push({
              title,
              price: price || 'Check on site',
              link,
              image,
              rating: 'N/A',
              retailer: retailer.name,
              delivery: 'Check website for details'
            });
          });
        }
        break;
        
      case 'Flipkart':
        // Try multiple selector patterns for Flipkart
        // First try product grid items
        $('div._1YokD2 ._1AtVbE, ._4ddWXP, ._3pLy-c, div[data-id]').each((i, element) => {
          if (i >= 20) return false;
          
          const title = $(element).find('div._4rR01T, a.s1Q9rs, ._2B099V, .IRpwTa').text().trim();
          if (!title) return;
          
          const price = $(element).find('div._30jeq3, ._1_WHN1').text().trim();
          const link = $(element).find('a._1fQZEK, a.s1Q9rs, a._2rpwqI, a.IRpwTa').attr('href') || '#';
          const image = $(element).find('img._396cs4, img._2r_T1I').attr('src') || '';
          const rating = $(element).find('._3LWZlK, ._1lRcqv').text().trim();
          
          products.push({
            title,
            price,
            link,
            image,
            rating: rating || 'N/A',
            retailer: retailer.name,
            delivery: 'Check website for details'
          });
        });
        
        // If no products found, try a more generic approach
        if (products.length === 0) {
          $('a[href*="/p/"]').each((i, element) => {
            if (i >= 20) return false;
            
            const link = $(element).attr('href') || '#';
            // Skip if not a product link
            if (!link.includes('/p/')) return;
            
            const title = $(element).attr('title') || $(element).text().trim();
            if (!title) return;
            
            // Look for price near this element
            const parentDiv = $(element).closest('div');
            const price = parentDiv.find('div[class*="price"], span[class*="price"], ._30jeq3, ._1_WHN1').text().trim();
            const image = parentDiv.find('img').attr('src') || '';
            
            products.push({
              title,
              price: price || 'Check on site',
              link,
              image,
              rating: 'N/A',
              retailer: retailer.name,
              delivery: 'Check website for details'
            });
          });
        }
        break;
        
      // Add more retailers as needed
      default:
        // Generic attempt to find products
        $('div, li').each((i, element) => {
          if (i >= 100) return false; // Check more elements for generic approach
          
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
            const link = $(element).find('a').attr('href') || '#';
            const image = $(element).find('img').attr('src') || '';
            
            products.push({
              title,
              price,
              link,
              image,
              rating: 'N/A',
              retailer: retailer.name,
              delivery: 'Check website for details'
            });
          }
        });
        break;
    }
  }

  /**
   * Perform AI-based extraction when traditional scraping fails
   * @param {string} keywords - Search keywords
   * @returns {Promise<Array<Object>>} - Array of product objects
   */
  async performAIBasedExtraction(keywords) {
    try {
      console.log('Attempting AI-based product extraction...');
      
      // Choose a few major retailers to try
      const majorRetailers = ['Amazon', 'Flipkart'];
      const results = [];
      
      for (const retailerName of majorRetailers) {
        const retailer = Object.values(this.retailers).find(r => r.name === retailerName);
        if (!retailer) continue;
        
        const searchUrl = `${retailer.searchUrl}${encodeURIComponent(keywords.trim())}`;
        
        try {
          // Use a direct request with minimal headers
          const response = await axios.get(searchUrl, {
            headers: {
              'User-Agent': this.getRandomUserAgent(),
              'Accept': 'text/html'
            },
            timeout: 30000
          });
          
          // Use Groq API to extract product information from HTML
          const extractionResult = await groqService.enhanceWebScraping(keywords, response.data);
          
          if (extractionResult.success) {
            // Parse the AI-extracted data
            let aiProducts = [];
            try {
              // Try to parse as JSON
              const jsonMatch = extractionResult.enhancedData.match(/```(?:json)?\n([\s\S]*?)\n```/) || 
                             extractionResult.enhancedData.match(/{[\s\S]*?}/);
                             
              if (jsonMatch) {
                aiProducts = JSON.parse(jsonMatch[1] || jsonMatch[0]);
              } else {
                aiProducts = JSON.parse(extractionResult.enhancedData);
              }
              
              // Normalize the data structure
              if (!Array.isArray(aiProducts)) {
                aiProducts = [aiProducts];
              }
              
              // Transform AI format to our standard format
              aiProducts.forEach(product => {
                results.push({
                  title: product.productName || product.title || 'Unknown Product',
                  price: product.currentPrice || product.price || 'Check on site',
                  link: product.url || '#',
                  image: product.imageUrl || '',
                  rating: product.rating || 'N/A',
                  retailer: retailerName,
                  delivery: 'Check website for details',
                  aiExtracted: true
                });
              });
              
              console.log(`Successfully extracted ${aiProducts.length} products from ${retailerName} using AI`);
            } catch (parseError) {
              console.error('Error parsing AI extraction result:', parseError);
            }
          }
        } catch (error) {
          console.error(`Error during AI extraction for ${retailerName}:`, error);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in AI-based extraction:', error);
      return [];
    }
  }

  /**
   * Fetch detailed information for a specific product
   * @param {Object} product - Basic product information
   * @returns {Promise<Object>} - Detailed product information
   */
  async fetchProductDetails(product) {
    try {
      if (!product.link || product.link === '#') {
        throw new Error('Invalid product link');
      }
      
      // Determine which retailer this product is from
      const retailerName = product.retailer;
      const retailer = Object.values(this.retailers).find(r => r.name === retailerName);
      
      if (!retailer) {
        throw new Error('Unknown retailer');
      }
      
      console.log(`Fetching details for product from ${retailerName}: ${product.title}`);
      
      // Scrape the product page
      const scrapingResult = await this.scrapeWithPlaywright(product.link, false);
      
      if (!scrapingResult.success) {
        // Try fallback method
        const fallbackResult = await this.scrapeWithPuppeteer(product.link, false);
        
        if (!fallbackResult.success) {
          throw new Error('Failed to scrape product details page');
        }
        
        scrapingResult.html = fallbackResult.html;
        scrapingResult.success = true;
      }
      
      // Parse the product details
      const $ = cheerio.load(scrapingResult.html);
      const selectors = retailer.selectors;
      
      // Extract product details
      const detailPrice = $(selectors.detailPrice).first().text().trim() || product.price;
      const detailTitle = $(selectors.detailTitle).first().text().trim() || product.title;
      const detailImage = $(selectors.detailImage).first().attr('src') || product.image;
      
      // Extract features
      const features = [];
      $(selectors.detailFeatures).each((i, element) => {
        const feature = $(element).text().trim();
        if (feature) features.push(feature);
      });
      
      // Extract specifications
      const specifications = {};
      $(selectors.detailSpecs).each((i, element) => {
        if (i % 2 === 0) {
          const key = $(element).text().trim();
          const value = $(selectors.detailSpecs).eq(i + 1).text().trim();
          if (key && value) specifications[key] = value;
        }
      });
      
      // Check if we got meaningful data
      if (!detailTitle && !detailPrice && features.length === 0 && Object.keys(specifications).length === 0) {
        // If traditional parsing failed, use AI to extract details
        return await this.extractDetailsWithAI(product, scrapingResult.html);
      }
      
      // Return the detailed product information
      return {
        title: detailTitle,
        price: detailPrice,
        link: product.link,
        image: detailImage,
        retailer: retailerName,
        rating: product.rating || 'N/A',
        delivery: product.delivery || 'Check website for details',
        features,
        specifications,
        description: features.join('. '),
        inStock: true // Assume in stock by default
      };
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
   * Extract product details using AI when traditional parsing fails
   * @param {Object} product - Basic product information
   * @param {string} html - HTML content of product page
   * @returns {Promise<Object>} - Detailed product information
   */
  async extractDetailsWithAI(product, html) {
    try {
      console.log(`Using AI to extract details for ${product.title}`);
      
      // Use Groq to extract detailed information
      const extractionResult = await groqService.enhanceWebScraping(product.title, html);
      
      if (!extractionResult.success) {
        throw new Error('AI extraction failed');
      }
      
      // Parse the AI extraction result
      let detailedProduct = {};
      try {
        // Try to parse as JSON
        const jsonMatch = extractionResult.enhancedData.match(/```(?:json)?\n([\s\S]*?)\n```/) || 
                       extractionResult.enhancedData.match(/{[\s\S]*?}/);
                       
        if (jsonMatch) {
          detailedProduct = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          detailedProduct = JSON.parse(extractionResult.enhancedData);
        }
        
        // Combine original product data with AI-extracted data
        return {
          title: detailedProduct.productName || product.title,
          price: detailedProduct.currentPrice || product.price,
          originalPrice: detailedProduct.originalPrice,
          discount: detailedProduct.discount,
          link: product.link,
          image: detailedProduct.imageUrl || product.image,
          retailer: product.retailer,
          rating: detailedProduct.rating || product.rating || 'N/A',
          delivery: product.delivery || 'Check website for details',
          features: Array.isArray(detailedProduct.features) ? detailedProduct.features : [],
          specifications: detailedProduct.specifications || {},
          description: detailedProduct.description || '',
          inStock: detailedProduct.inStock !== false,
          aiExtracted: true
        };
      } catch (parseError) {
        console.error('Error parsing AI extraction result for product details:', parseError);
        throw new Error('Failed to parse AI-extracted product details');
      }
    } catch (error) {
      console.error('Error extracting product details with AI:', error);
      
      // Return the original product with an error flag
      return {
        ...product,
        error: error.message,
        errorDetail: 'Failed to extract detailed information'
      };
    }
  }

  /**
   * Search for a product across multiple retailers
   * @param {string} query - Search query
   * @returns {Promise<Array<Object>>} - Array of product objects
   */
  async searchProduct(query) {
    return (await this.scrapeProductsByKeywords(query)).results;
  }

  /**
   * Consolidate product data from multiple sources
   * @param {Array<Object>} products - Array of product objects
   * @param {string} keywords - Original search keywords
   * @returns {Promise<Object>} - Consolidated product data
   */
  async consolidateProductData(products, keywords) {
    try {
      if (!products || products.length === 0) {
        throw new Error('No products to consolidate');
      }
      
      // Group products by retailer
      const productsByRetailer = {};
      products.forEach(product => {
        const retailer = product.retailer;
        if (!productsByRetailer[retailer]) {
          productsByRetailer[retailer] = [];
        }
        productsByRetailer[retailer].push(product);
      });
      
      // Find the best match product (usually the most common one)
      const bestMatchProduct = await this.findBestMatchProduct(keywords, products);
      
      // Get detailed information for the best match
      const detailedBestMatch = await this.fetchProductDetails(bestMatchProduct);
      
      // Find price range
      const prices = products.map(p => this.extractNumericPrice(p.price)).filter(p => p !== Infinity);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      // Find retailers with the lowest and highest prices
      let lowestPriceRetailer = '';
      let highestPriceRetailer = '';
      let lowestPrice = Infinity;
      let highestPrice = -Infinity;
      
      for (const product of products) {
        const price = this.extractNumericPrice(product.price);
        if (price < lowestPrice) {
          lowestPrice = price;
          lowestPriceRetailer = product.retailer;
        }
        if (price > highestPrice) {
          highestPrice = price;
          highestPriceRetailer = product.retailer;
        }
      }
      
      // Return consolidated data
      return {
        productName: detailedBestMatch.title || bestMatchProduct.title,
        keywords,
        priceRange: {
          min: minPrice,
          max: maxPrice,
          avg: avgPrice,
          formattedMin: `₹${minPrice.toFixed(2)}`,
          formattedMax: `₹${maxPrice.toFixed(2)}`,
          formattedAvg: `₹${avgPrice.toFixed(2)}`
        },
        lowestPriceRetailer,
        highestPriceRetailer,
        priceVariancePercentage: ((maxPrice - minPrice) / minPrice * 100).toFixed(2),
        bestMatchProduct: detailedBestMatch,
        retailers: productsByRetailer,
        allProducts: products,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error consolidating product data:', error);
      
      return {
        error: error.message,
        keywords,
        products,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Find the best matching product from a list based on keywords
   * @param {string} keywords - Search keywords
   * @param {Array<Object>} products - Array of product objects
   * @returns {Promise<Object>} - Best matching product
   */
  async findBestMatchProduct(keywords, products) {
    if (!products || products.length === 0) {
      throw new Error('No products provided');
    }
    
    // If only one product, it's the best match by default
    if (products.length === 1) {
      return products[0];
    }
    
    try {
      // Normalize keywords
      const normalizedKeywords = keywords.toLowerCase().trim();
      
      // Score each product based on keyword match
      const scoredProducts = products.map(product => {
        const title = product.title.toLowerCase();
        const keywordMatches = normalizedKeywords.split(' ').filter(keyword => 
          title.includes(keyword.trim())
        ).length;
        
        return {
          product,
          score: keywordMatches
        };
      });
      
      // Sort by score (highest first)
      scoredProducts.sort((a, b) => b.score - a.score);
      
      // If the top score is good enough, return that product
      if (scoredProducts[0].score > 0) {
        return scoredProducts[0].product;
      }
      
      // Otherwise, use price as a tiebreaker (prefer middle price)
      const prices = products.map(p => this.extractNumericPrice(p.price)).filter(p => p !== Infinity);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      // Find product closest to average price
      products.sort((a, b) => {
        const priceA = this.extractNumericPrice(a.price);
        const priceB = this.extractNumericPrice(b.price);
        return Math.abs(priceA - avgPrice) - Math.abs(priceB - avgPrice);
      });
      
      return products[0];
    } catch (error) {
      console.error('Error finding best match product:', error);
      
      // Fallback to the first product
      return products[0];
    }
  }
}

module.exports = new ScraperService();