/**
 * Scraper Worker
 * Runs scraping operations in a separate thread
 */

const { parentPort, workerData } = require('worker_threads');
const { chromium } = require('playwright');
const { gotScraping } = require('got-scraping');
const UserAgent = require('user-agents');
const fs = require('fs');
const path = require('path');

// Configuration - passed as workerData when creating the worker
const DEBUG_MODE = workerData?.debug || process.env.DEBUG_SCRAPING === 'true';

/**
 * Process a scraping task
 */
async function processScrapingTask() {
  const { retailerKey, retailerConfig, query, taskType } = workerData;
  
  console.log(`Worker processing ${taskType} for ${retailerKey} with query "${query}"`);
  
  try {
    let result;
    
    // Different task types (direct API, Playwright, etc.)
    switch (taskType) {
      case 'direct_api':
        result = await processDirectApi();
        break;
      case 'playwright':
        result = await processPlaywright();
        break;
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
    
    // Send result back to main thread
    parentPort.postMessage({
      success: true,
      retailerKey,
      data: result
    });
    
  } catch (error) {
    console.error(`Worker error for ${retailerKey}:`, error.message);
    
    // Send error back to main thread
    parentPort.postMessage({
      success: false,
      retailerKey,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
}

/**
 * Process using direct API approach
 */
async function processDirectApi() {
  const { retailerKey, apiConfig, query } = workerData;
  
  console.log(`Processing direct API for ${retailerKey}`);
  
  try {
    // Basic config for API request
    const headers = {
      'user-agent': new UserAgent().toString(),
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      ...apiConfig.headers
    };
    
    // Different handling for GET vs POST
    let response;
    if (apiConfig.method === 'GET') {
      response = await gotScraping({
        url: apiConfig.url,
        searchParams: apiConfig.getSearchParams(query),
        headers,
        timeout: { request: apiConfig.timeout || 15000 },
        retry: { limit: 2 }
      });
    } else {
      response = await gotScraping({
        url: apiConfig.url,
        method: 'POST',
        json: apiConfig.getRequestBody(query),
        headers,
        timeout: { request: apiConfig.timeout || 15000 },
        retry: { limit: 2 }
      });
    }
    
    // Save response for debugging if enabled
    if (DEBUG_MODE) {
      const debugDir = path.join(__dirname, '../../debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(debugDir, `${retailerKey}-api-${Date.now()}.json`),
        response.body
      );
    }
    
    // Parse response according to retailer-specific logic
    return apiConfig.parseResponse(response.body);
    
  } catch (error) {
    console.error(`Direct API error for ${retailerKey}:`, error);
    throw error;
  }
}

/**
 * Process using Playwright
 */
async function processPlaywright() {
  const { retailerKey, retailerConfig, query, selectors } = workerData;
  
  console.log(`Processing Playwright for ${retailerKey}`);
  
  // Launch browser
  const browser = await chromium.launch({
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
  
  try {
    // Create new context
    const context = await browser.newContext({
      userAgent: new UserAgent().toString(),
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US'
    });
    
    // Create new page
    const page = await context.newPage();
    
    // Block unnecessary resources
    await page.route('**/*', async (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      
      if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
        await route.abort();
      } else {
        await route.continue();
      }
    });
    
    // Set reasonable timeouts
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);
    
    // Navigate to search URL
    const searchUrl = retailerConfig.url(query);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    
    // Handle cookie consent by looking for common accept buttons
    try {
      const consentButtons = [
        'button[id*="accept"]',
        'button[id*="cookie"]',
        'button[id*="consent"]',
        'a[id*="accept"]',
        '.accept-cookies',
        '#accept-cookies'
      ];
      
      for (const selector of consentButtons) {
        const button = await page.$(selector);
        if (button) {
          await button.click().catch(() => {});
          break;
        }
      }
    } catch (e) {
      // Ignore errors in consent handling
    }
    
    // Wait for product elements
    try {
      await page.waitForSelector(selectors.products, { timeout: 10000 });
    } catch (e) {
      console.warn(`Timeout waiting for products on ${retailerKey}`);
      // Try to continue anyway
    }
    
    // Take screenshot for debugging if enabled
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
    }, selectors, retailerKey);
    
    return {
      success: products.length > 0,
      products,
      retailer: retailerKey
    };
    
  } catch (error) {
    console.error(`Playwright error for ${retailerKey}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Start processing when the worker is created
processScrapingTask().catch((error) => {
  console.error('Fatal worker error:', error);
  parentPort.postMessage({
    success: false,
    error: {
      message: error.message,
      stack: error.stack
    }
  });
});