const { parentPort, workerData } = require('worker_threads');
const directApiService = require('./directApiService');
const { launchImprovedPlaywright } = require('./improvedPlaywright');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Debug mode flag
const DEBUG_MODE = process.env.DEBUG_SCRAPING === 'true';
const DEBUG_DIR = path.join(__dirname, '../../debug');

// Ensure debug directory exists
if (DEBUG_MODE && !fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

/**
 * Main worker function - processes scraping tasks in worker thread
 * Now with tiered fallback strategies:
 * 1. Try direct API with harvested JSON endpoints (fastest)
 * 2. Try network sniffing with headless browser (reliable)
 * 3. Fall back to Playwright DOM scraping (slowest, last resort)
 */
async function runScraperWorker() {
  try {
    const { retailer, query, requestId } = workerData;
    
    console.log(`[Worker ${process.pid}] Starting scrape for ${retailer} with query: "${query}"`);
    
    // First tier: Try direct API service with enhanced endpoint harvesting
    try {
      console.log(`[Worker ${process.pid}] Trying direct API for ${retailer}...`);
      
      // Create a timeout to abort if direct API takes too long
      const directApiPromise = directApiService._fetchFromApiEndpoint(retailer, query);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Direct API timeout')), 15000)
      );
      
      // Race the API request against the timeout
      const products = await Promise.race([directApiPromise, timeoutPromise]);
      
      if (products && products.length > 0) {
        console.log(`[Worker ${process.pid}] Found ${products.length} products via direct API`);
        parentPort.postMessage({
          success: true,
          products,
          retailer,
          source: 'direct-api',
          count: products.length
        });
        return;
      }
    } catch (error) {
      console.error(`[Worker ${process.pid}] Direct API failed for ${retailer}:`, error.message);
    }

    // Final fallback: Full Playwright scraping if needed
    console.log(`[Worker ${process.pid}] All faster methods failed. Falling back to Playwright for ${retailer}...`);
    
    // Launch browser and scrape with full DOM traversal
    const { browser, page } = await launchImprovedPlaywright();
    
    try {
      // Implement retailer-specific scraping logic similar to the improved headless approach
      let searchUrl;
      switch (retailer.toLowerCase()) {
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
        case 'reliancedigital':
          searchUrl = `https://www.reliancedigital.in/search?q=${encodeURIComponent(query)}:relevance`;
          break;
        default:
          throw new Error(`Unknown retailer: ${retailer}`);
      }
      
      console.log(`[Worker ${process.pid}] Navigating to ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      // Handle cookie consent
      try {
        await directApiService._handleCookieBanner(page, retailer.toLowerCase());
      } catch (e) {
        // Continue if cookie handling fails
      }
      
      // Save debug HTML if needed
      if (DEBUG_MODE) {
        const content = await page.content();
        const timestamp = Date.now();
        fs.writeFileSync(path.join(DEBUG_DIR, `${retailer.toLowerCase()}-${timestamp}.html`), content);
      }
      
      // Extract products using the DOM extraction method from directApiService
      const products = await directApiService._extractProductsFromDOM(page, retailer.toLowerCase());
      
      if (products && products.length > 0) {
        console.log(`[Worker ${process.pid}] Extracted ${products.length} products via Playwright`);
        parentPort.postMessage({
          success: true,
          products,
          retailer,
          source: 'playwright-dom',
          count: products.length
        });
      } else {
        console.log(`[Worker ${process.pid}] No products found for ${retailer}`);
        parentPort.postMessage({
          success: false,
          products: [],
          retailer,
          error: 'No products found'
        });
      }
    } catch (error) {
      console.error(`[Worker ${process.pid}] Playwright scraping error for ${retailer}:`, error.message);
      parentPort.postMessage({
        success: false,
        retailer,
        error: error.message
      });
    } finally {
      // Clean up
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    console.error(`[Worker ${process.pid}] Fatal worker error:`, error);
    parentPort.postMessage({
      success: false,
      error: error.message
    });
  }
}

// Start the worker
runScraperWorker().catch(err => {
  console.error('Uncaught worker error:', err);
  parentPort.postMessage({
    success: false,
    error: err.message
  });
});