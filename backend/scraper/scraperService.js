const puppeteer = require('puppeteer');

/**
 * Scraper service for extracting product prices from various e-commerce websites
 */
class ScraperService {
  /**
   * Initialize the scraper service
   */
  constructor() {
    this.browser = null;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
    ];
  }

  /**
   * Get a random user agent from the list
   * @returns {string} - A random user agent
   */
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Launch the browser instance if not already launched
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Close the browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Create a new page with optimal settings for web scraping
   * @returns {Object} - A configured Puppeteer page
   */
  async createPage() {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    // Set a random user agent to avoid detection
    await page.setUserAgent(this.getRandomUserAgent());
    
    // Set viewport size
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Block unnecessary resources to speed up scraping
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });

    return page;
  }

  /**
   * Format price string to a consistent format
   * @param {string} priceStr - The raw price string
   * @returns {string} - Formatted price string
   */
  formatPrice(priceStr) {
    if (!priceStr) return 'N/A';
    
    // Remove non-numeric characters except decimal point
    let price = priceStr.replace(/[^\d.]/g, '');
    
    // Ensure it's a valid number
    if (isNaN(parseFloat(price))) return priceStr;
    
    // Format with the ₹ symbol and 2 decimal places
    return `₹${parseFloat(price).toFixed(2)}`;
  }

  /**
   * Scrape Amazon for product prices
   * @param {string} productName - The name of the product to search for
   * @returns {Object} - Product information from Amazon
   */
  async scrapeAmazon(productName) {
    let page = null;
    
    try {
      page = await this.createPage();
      
      // Navigate to Amazon search page
      await page.goto(`https://www.amazon.in/s?k=${encodeURIComponent(productName)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for results to load
      await page.waitForSelector('.s-result-item', { timeout: 10000 }).catch(() => {});
      
      // Take a small pause to ensure page is fully loaded
      await page.waitForTimeout(2000);
      
      // Extract product information from the first result
      const result = await page.evaluate(() => {
        const firstProduct = document.querySelector('.s-result-item[data-component-type="s-search-result"]');
        
        if (!firstProduct) return null;
        
        // Get the product title
        const title = firstProduct.querySelector('h2 > a > span')?.textContent?.trim() || 'Unknown Product';
        
        // Get the current price
        const priceElement = firstProduct.querySelector('.a-price .a-offscreen');
        const price = priceElement ? priceElement.textContent.trim() : 'N/A';
        
        // Get the original price (if available)
        const originalPriceElement = firstProduct.querySelector('.a-text-price .a-offscreen');
        const originalPrice = originalPriceElement ? originalPriceElement.textContent.trim() : null;
        
        // Calculate discount percentage
        let discount = null;
        if (price !== 'N/A' && originalPrice) {
          const currentPrice = parseFloat(price.replace(/[^\d.]/g, ''));
          const origPrice = parseFloat(originalPrice.replace(/[^\d.]/g, ''));
          
          if (!isNaN(currentPrice) && !isNaN(origPrice) && origPrice > currentPrice) {
            const discountPercent = Math.round(((origPrice - currentPrice) / origPrice) * 100);
            discount = `${discountPercent}%`;
          }
        }
        
        // Get rating
        const ratingElement = firstProduct.querySelector('.a-icon-star-small .a-icon-alt');
        const rating = ratingElement ? ratingElement.textContent.split(' ')[0] : 'N/A';
        
        // Get availability
        const availabilityElement = firstProduct.querySelector('.a-color-success');
        const inStock = availabilityElement ? 
          !availabilityElement.textContent.toLowerCase().includes('out of stock') : true;
        
        // Get shipping information
        const shippingElement = firstProduct.querySelector('.a-color-secondary .a-row');
        const shipping = shippingElement ? 
          shippingElement.textContent.trim() : 'Check on Amazon';
        
        // Get URL
        const linkElement = firstProduct.querySelector('h2 > a');
        const productUrl = linkElement ? 
          'https://www.amazon.in' + linkElement.getAttribute('href') : 
          `https://www.amazon.in/s?k=${encodeURIComponent(title)}`;
        
        // Get image URL
        const imageElement = firstProduct.querySelector('img.s-image');
        const imageUrl = imageElement ? imageElement.getAttribute('src') : null;
        
        return {
          title,
          price,
          originalPrice,
          discount,
          rating,
          inStock,
          shipping,
          productUrl,
          imageUrl,
          marketplace: 'Amazon'
        };
      });
      
      if (page) {
        await page.close();
      }
      
      if (result) {
        // Format prices consistently
        result.price = this.formatPrice(result.price);
        if (result.originalPrice) {
          result.originalPrice = this.formatPrice(result.originalPrice);
        }
        return result;
      }
      
      // Return a default response if no results found
      return {
        title: productName,
        price: 'N/A',
        originalPrice: null,
        discount: null,
        rating: 'N/A',
        inStock: false,
        shipping: 'N/A',
        productUrl: `https://www.amazon.in/s?k=${encodeURIComponent(productName)}`,
        imageUrl: null,
        marketplace: 'Amazon'
      };
    } catch (error) {
      console.error('Error scraping Amazon:', error);
      
      if (page) {
        await page.close();
      }
      
      return {
        title: productName,
        price: 'Error fetching price',
        originalPrice: null,
        discount: null,
        rating: 'N/A',
        inStock: false,
        shipping: 'N/A',
        productUrl: `https://www.amazon.in/s?k=${encodeURIComponent(productName)}`,
        imageUrl: null,
        marketplace: 'Amazon',
        error: error.message
      };
    }
  }

  /**
   * Scrape Flipkart for product prices
   * @param {string} productName - The name of the product to search for
   * @returns {Object} - Product information from Flipkart
   */
  async scrapeFlipkart(productName) {
    let page = null;
    
    try {
      page = await this.createPage();
      
      // Navigate to Flipkart search page
      await page.goto(`https://www.flipkart.com/search?q=${encodeURIComponent(productName)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for results to load
      await page.waitForSelector('._1AtVbE', { timeout: 10000 }).catch(() => {});
      
      // Take a small pause to ensure page is fully loaded
      await page.waitForTimeout(2000);
      
      // Extract product information from the first result
      const result = await page.evaluate(() => {
        // Try to find product in grid view
        let firstProduct = document.querySelector('._1AtVbE ._13oc-S');
        
        // If not found, try list view
        if (!firstProduct) {
          firstProduct = document.querySelector('._1AtVbE ._4ddWXP');
        }
        
        if (!firstProduct) return null;
        
        // Get the product title
        const titleElement = firstProduct.querySelector('._4rR01T, .s1Q9rs, .IRpwTa');
        const title = titleElement ? titleElement.textContent.trim() : 'Unknown Product';
        
        // Get the current price
        const priceElement = firstProduct.querySelector('._30jeq3');
        const price = priceElement ? priceElement.textContent.trim() : 'N/A';
        
        // Get the original price (if available)
        const originalPriceElement = firstProduct.querySelector('._3I9_wc');
        const originalPrice = originalPriceElement ? originalPriceElement.textContent.trim() : null;
        
        // Get the discount percentage
        const discountElement = firstProduct.querySelector('._3Ay6Sb');
        const discount = discountElement ? discountElement.textContent.trim() : null;
        
        // Get rating
        const ratingElement = firstProduct.querySelector('._3LWZlK');
        const rating = ratingElement ? ratingElement.textContent.trim() : 'N/A';
        
        // Flipkart usually shows in-stock items first, but try to check
        const availabilityElement = firstProduct.querySelector('._192laR');
        const inStock = !availabilityElement || 
          !availabilityElement.textContent.toLowerCase().includes('out of stock');
        
        // Get shipping information
        const shippingElement = firstProduct.querySelector('._2Tpdn3');
        const shipping = shippingElement ? 
          shippingElement.textContent.trim() : 'Standard Delivery';
        
        // Get URL
        const linkElement = firstProduct.querySelector('a._1fQZEK, a._2rpwqI, a.s1Q9rs');
        const productUrl = linkElement ? 
          'https://www.flipkart.com' + linkElement.getAttribute('href') : 
          `https://www.flipkart.com/search?q=${encodeURIComponent(title)}`;
        
        // Get image URL
        const imageElement = firstProduct.querySelector('img._396cs4, img._2r_T1I');
        const imageUrl = imageElement ? imageElement.getAttribute('src') : null;
        
        return {
          title,
          price,
          originalPrice,
          discount,
          rating,
          inStock,
          shipping,
          productUrl,
          imageUrl,
          marketplace: 'Flipkart'
        };
      });
      
      if (page) {
        await page.close();
      }
      
      if (result) {
        // Format prices consistently
        result.price = this.formatPrice(result.price);
        if (result.originalPrice) {
          result.originalPrice = this.formatPrice(result.originalPrice);
        }
        return result;
      }
      
      // Return a default response if no results found
      return {
        title: productName,
        price: 'N/A',
        originalPrice: null,
        discount: null,
        rating: 'N/A',
        inStock: false,
        shipping: 'N/A',
        productUrl: `https://www.flipkart.com/search?q=${encodeURIComponent(productName)}`,
        imageUrl: null,
        marketplace: 'Flipkart'
      };
    } catch (error) {
      console.error('Error scraping Flipkart:', error);
      
      if (page) {
        await page.close();
      }
      
      return {
        title: productName,
        price: 'Error fetching price',
        originalPrice: null,
        discount: null,
        rating: 'N/A',
        inStock: false,
        shipping: 'N/A',
        productUrl: `https://www.flipkart.com/search?q=${encodeURIComponent(productName)}`,
        imageUrl: null,
        marketplace: 'Flipkart',
        error: error.message
      };
    }
  }

  /**
   * Get mock data for local stores that don't have public APIs
   * In a real app, you could connect to store APIs or use web scraping if available
   * @param {string} productName - The name of the product
   * @returns {Array} - Array of product information from local stores
   */
  getMockLocalStoreData(productName) {
    // Generate random prices that are somewhat aligned with each other
    const basePrice = Math.random() * 10000 + 5000;
    
    return [
      {
        title: productName,
        price: this.formatPrice(basePrice * (1 - Math.random() * 0.1)),
        originalPrice: this.formatPrice(basePrice * 1.2),
        discount: `${Math.floor(Math.random() * 15 + 10)}%`,
        rating: (Math.random() * 5).toFixed(1),
        productUrl: '#',
        imageUrl: null,
        marketplace: 'DMart',
        inStock: Math.random() > 0.3,
        shipping: 'Store Pickup Only'
      },
      {
        title: productName,
        price: this.formatPrice(basePrice * (1 - Math.random() * 0.15)),
        originalPrice: this.formatPrice(basePrice * 1.25),
        discount: `${Math.floor(Math.random() * 20 + 5)}%`,
        rating: (Math.random() * 5).toFixed(1),
        productUrl: '#',
        imageUrl: null,
        marketplace: 'Reliance Mart',
        inStock: Math.random() > 0.2,
        shipping: 'Free Delivery'
      },
      {
        title: productName,
        price: this.formatPrice(basePrice * (1 - Math.random() * 0.05)),
        originalPrice: this.formatPrice(basePrice * 1.15),
        discount: `${Math.floor(Math.random() * 10 + 5)}%`,
        rating: (Math.random() * 5).toFixed(1),
        productUrl: '#',
        imageUrl: null,
        marketplace: 'Big Bazaar',
        inStock: Math.random() > 0.25,
        shipping: 'Standard Delivery ₹50'
      }
    ];
  }

  /**
   * Search for a product across multiple marketplaces
   * @param {string} productName - The name of the product to search for
   * @returns {Array} - Array of product information from various marketplaces
   */
  async searchProduct(productName) {
    try {
      // Scrape real data from e-commerce websites
      const [amazonResult, flipkartResult] = await Promise.all([
        this.scrapeAmazon(productName),
        this.scrapeFlipkart(productName)
      ]);
      
      // Get mock data for local stores
      const localStoreResults = this.getMockLocalStoreData(productName);
      
      // Combine all results
      const allResults = [amazonResult, flipkartResult, ...localStoreResults];
      
      // Sort results by price (lowest first), skipping items with errors or N/A prices
      return allResults.sort((a, b) => {
        if (a.price === 'N/A' || a.price === 'Error fetching price') return 1;
        if (b.price === 'N/A' || b.price === 'Error fetching price') return -1;
        
        const priceA = parseFloat(a.price.replace(/[^\d.]/g, ''));
        const priceB = parseFloat(b.price.replace(/[^\d.]/g, ''));
        
        if (isNaN(priceA)) return 1;
        if (isNaN(priceB)) return -1;
        
        return priceA - priceB;
      });
    } catch (error) {
      console.error('Error searching product across marketplaces:', error);
      throw error;
    }
  }
}

module.exports = new ScraperService();