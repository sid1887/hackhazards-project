/**
 * Improved Playwright scraping function
 * @param {string} url - URL to scrape
 * @param {boolean} useProxy - Whether to use a proxy
 * @returns {Promise<{html: string, success: boolean, error: string}>}
 */
async function scrapeWithPlaywright(url, useProxy = false) {
  let browser = null;
  let context = null;
  let page = null;

  try {
    console.log(`Launching Playwright for ${url}`);
    
    // Launch browser with improved settings
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-infobars',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      chromiumSandbox: false,
      timeout: 60000
    });

    // Create a browser context with enhanced fingerprinting
    context = await browser.newContext({
      userAgent: this.getDynamicUserAgent(),
      viewport: {
        width: 1366 + Math.floor(Math.random() * 100),
        height: 768 + Math.floor(Math.random() * 100)
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
      'DNT': '1',
      'X-Client-Data': Buffer.from('CIm2yQEIpbbJAQjEtskBCKmdygEIq8fKAQj4x8oBCJeYywEI15zLAQjknMsBCKmdywEI+Z3LAQ==', 'base64').toString('base64')
    });

    // Add cookies to appear more like a returning visitor
    await context.addCookies([
      {
        name: 'visitor_id',
        value: randomString.generate(16),
        domain: new URL(url).hostname,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        httpOnly: false,
        secure: url.startsWith('https'),
        sameSite: 'Lax'
      }
    ]);

    // Route requests to block unnecessary resources
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,otf,eot}', route => route.abort());
    await page.route('**/{analytics,gtm,ga,pixel,tracking,stats,metrics}*', route => route.abort());
    
    // Navigate to the URL with a timeout
    console.log(`Navigating to ${url} with Playwright`);
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // Wait for a short random time
    await this.randomDelay(2000, 4000);
    
    // Handle cookie consent popups
    await this.handlePlaywrightCookieConsent(page);
    
    // Simulate human-like scrolling
    await this.simulatePlaywrightScroll(page);
    
    // Wait for product containers based on the URL
    await this.waitForPlaywrightProductContainers(page, url);
    
    // Take a screenshot for debugging
    const fs = require('fs');
    const path = require('path');
    const debugDir = path.join(__dirname, '../../debug');
    
    // Create debug directory if it doesn't exist
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    // Save screenshot
    const screenshotPath = path.join(debugDir, `playwright-${new URL(url).hostname}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);
    
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
 * Handle cookie consent popups in Playwright
 * @param {Page} page - Playwright page object
 * @returns {Promise<void>}
 */
async function handlePlaywrightCookieConsent(page) {
  try {
    // Common cookie consent button selectors
    const consentSelectors = [
      '#accept-cookies',
      '#accept-cookie-consent',
      '.cookie-consent-accept',
      '.cookie-accept',
      'button:has-text("Accept")',
      'button:has-text("Accept all")',
      'button:has-text("Accept cookies")',
      '.cookie-banner button',
      '#cookie-banner button',
      '.cookie-notice button',
      '#cookie-notice button',
      '.consent-banner button',
      '#consent-banner button',
      '.gdpr-banner button',
      '#gdpr-banner button'
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
 * Simulate human-like scrolling in Playwright
 * @param {Page} page - Playwright page object
 * @returns {Promise<void>}
 */
async function simulatePlaywrightScroll(page) {
  try {
    // Get page height
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    
    // Calculate a random number of scroll steps (between 5 and 10)
    const scrollSteps = Math.floor(Math.random() * 6) + 5;
    const scrollIncrement = bodyHeight / scrollSteps;
    
    console.log(`Simulating scrolling with ${scrollSteps} steps`);
    
    // Scroll down in steps
    for (let i = 1; i <= scrollSteps; i++) {
      await page.evaluate((position) => {
        window.scrollTo({
          top: position,
          behavior: 'smooth'
        });
      }, scrollIncrement * i);
      
      // Random delay between scrolls
      await this.randomDelay(500, 1500);
    }
    
    // Scroll back up to a random position
    const randomPosition = Math.floor(Math.random() * (bodyHeight / 2));
    await page.evaluate((position) => {
      window.scrollTo({
        top: position,
        behavior: 'smooth'
      });
    }, randomPosition);
    
    await this.randomDelay(1000, 2000);
  } catch (error) {
    console.error('Error simulating scrolling:', error);
  }
}

/**
 * Wait for product containers in Playwright
 * @param {Page} page - Playwright page object
 * @param {string} url - URL being scraped
 * @returns {Promise<void>}
 */
async function waitForPlaywrightProductContainers(page, url) {
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

module.exports = {
  scrapeWithPlaywright,
  handlePlaywrightCookieConsent,
  simulatePlaywrightScroll,
  waitForPlaywrightProductContainers
};