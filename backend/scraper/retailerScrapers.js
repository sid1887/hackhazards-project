/**
 * Retailer-specific configurations and scraper strategies
 * Contains selectors, endpoints, and parsing logic for each retailer
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
];

const getRandomUserAgent = () => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

// Store rotating cookies to avoid detection
const cookieStore = {
  amazon: [],
  flipkart: [],
  croma: [],
  relianceDigital: [],
  meesho: []
};

// Add some cookies to rotate
for (let retailer in cookieStore) {
  cookieStore[retailer] = [
    { name: 'session-id', value: `${Date.now()}-${Math.floor(Math.random() * 1000000)}` },
    { name: 'visitor-id', value: `${Date.now()}-${Math.floor(Math.random() * 1000000)}` }
  ];
}

// Get a random set of cookies for a retailer
const getRandomCookies = (retailer) => {
  return cookieStore[retailer] || [];
};

module.exports = {
  amazon: {
    name: 'Amazon',
    baseUrl: 'https://www.amazon.in',
    searchEndpoint: '/s?k=',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'DNT': '1',
      'User-Agent': getRandomUserAgent(),
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
    // API search approach
    directApiEndpoint: 'https://completion.amazon.in/api/2017/suggestions',
    apiParams: (query) => ({
      limit: 10,
      prefix: query,
      'suggestion-type': 'WIDGET',
      'page-type': 'Search',
      alias: 'aps',
      'site-variant': 'desktop',
      version: 3,
      event: 'onkeypress',
      wc: '',
      lop: 'en_IN'
    }),
    selectors: {
      productGrid: 'div[data-component-type="s-search-result"]',
      productName: 'h2 a.a-link-normal span',
      productPrice: 'span.a-price-whole',
      productImage: 'img.s-image',
      productLink: 'h2 a.a-link-normal',
      rating: 'span.a-icon-alt',
      reviews: 'span.a-size-base.s-underline-text',
      extraDetailsSelector: 'div.a-section.a-spacing-small.a-spacing-top-small'
    },
    // Browser-based selectors if API fails
    browserSelectors: {
      searchInput: '#twotabsearchtextbox',
      searchButton: '#nav-search-submit-button',
      resultsContainer: '.s-main-slot',
      productCard: 'div[data-component-type="s-search-result"]',
      productTitle: 'h2 .a-link-normal',
      productPrice: '.a-price-whole',
      productImage: '.s-image',
    },
    // Custom code for Amazon to handle special cases
    customExtractorLogic: async (page) => {
      return await page.$$eval('div[data-component-type="s-search-result"]', (results) => {
        return results.map(result => {
          const titleElement = result.querySelector('h2 .a-link-normal');
          const priceElement = result.querySelector('.a-price-whole');
          const imageElement = result.querySelector('.s-image');
          const linkElement = result.querySelector('h2 .a-link-normal');
          const ratingElement = result.querySelector('.a-icon-alt');
          const reviewsElement = result.querySelector('span.a-size-base.s-underline-text');
          
          // Getting the extra details like discounts, sponsored etc.
          const extraDetails = result.querySelector('div.a-section.a-spacing-small.a-spacing-top-small');
          
          return {
            title: titleElement ? titleElement.innerText.trim() : '',
            price: priceElement ? parseFloat(priceElement.innerText.replace(/[^0-9.]/g, '')) : null,
            image: imageElement ? imageElement.src : '',
            link: linkElement ? linkElement.href : '',
            rating: ratingElement ? ratingElement.innerText : null,
            reviews: reviewsElement ? reviewsElement.innerText : null,
            extraDetails: extraDetails ? extraDetails.innerText : '',
            source: 'amazon',
            timestamp: new Date().toISOString()
          };
        }).filter(item => item.title && item.price);
      });
    },
    // Handle anti-bot measures
    robotCheck: {
      indicators: ['Robot Check', 'CAPTCHA', 'Unusual Activity', 'Sorry', 'Verify'],
      actions: [
        { selector: 'input[name="amzn-captcha-submit"]', action: 'click' },
        { selector: '#captchacharacters', action: 'fill', value: '' } // Value will be filled programmatically
      ]
    },
    parseFunction: (html) => {
      // Custom parsing logic for HTML response
      // Implement specific parsing for Amazon's HTML structure
      // Will be implemented if needed
    }
  },
  
  flipkart: {
    name: 'Flipkart',
    baseUrl: 'https://www.flipkart.com',
    searchEndpoint: '/search?q=',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'DNT': '1',
      'User-Agent': getRandomUserAgent(),
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
    // GraphQL API endpoint for direct API access
    directApiEndpoint: 'https://2.rome.api.flipkart.com/api/4/page/fetch',
    apiHeaders: {
      'Content-Type': 'application/json',
      'X-User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop',
      'Referer': 'https://www.flipkart.com/'
    },
    // GraphQL query template
    apiPayload: (query) => ({
      "requestContext": {
        "productPlacement": "SEARCH_PAGE"
      },
      "pageContext": {
        "fetchId": "BROWSE_SEARCH",
        "page": 1,
        "type": "BROWSE_PAGE",
        "pageUri": `/search?q=${encodeURIComponent(query)}&otracker=search&otracker1=search&marketplace=FLIPKART`
      }
    }),
    selectors: {
      productGrid: '._1YokD2._3Mn1Gg > div > div',
      productName: '._4rR01T, .s1Q9rs',
      productPrice: '._30jeq3',
      productImage: '._396cs4',
      productLink: 'a._1fQZEK, a.s1Q9rs',
      rating: '._3LWZlK',
      reviews: '._2_R_DZ span, ._13vcmD'
    },
    // Browser-based selectors if API fails
    browserSelectors: {
      searchInput: '.Pke_EE',
      searchButton: 'button[type="submit"]',
      resultsContainer: '._1YokD2._3Mn1Gg',
      productCard: '._1AtVbE',
      productTitle: '._4rR01T, .s1Q9rs',
      productPrice: '._30jeq3',
      productImage: '._396cs4',
      productLink: 'a._1fQZEK, a.s1Q9rs',
      nextPageButton: '._1LKTO3'
    },
    // Custom code for Flipkart to handle special cases
    customExtractorLogic: async (page) => {
      // Wait for search results to load completely
      await page.waitForSelector('._1AtVbE', { timeout: 10000 });
      
      // Scroll down to load lazy images
      await page.evaluate(() => {
        window.scrollBy(0, 1000);
        return new Promise(resolve => setTimeout(resolve, 1000));
      });
      
      return await page.$$eval('._1AtVbE', (cards) => {
        const results = [];
        
        for (const card of cards) {
          // Skip cards that don't contain product info (ads, categories, etc.)
          const titleElement = card.querySelector('._4rR01T, .s1Q9rs');
          if (!titleElement) continue;
          
          const priceElement = card.querySelector('._30jeq3');
          const imageElement = card.querySelector('._396cs4');
          const linkElement = card.querySelector('a._1fQZEK, a.s1Q9rs');
          const ratingElement = card.querySelector('._3LWZlK');
          const reviewsElement = card.querySelector('._2_R_DZ span, ._13vcmD');
          
          // Get any discount information
          const discountElement = card.querySelector('._3Ay6Sb');
          
          results.push({
            title: titleElement ? titleElement.innerText.trim() : '',
            price: priceElement ? parseFloat(priceElement.innerText.replace(/[^0-9.]/g, '')) : null,
            image: imageElement ? imageElement.src : '',
            link: linkElement ? linkElement.href : '',
            rating: ratingElement ? parseFloat(ratingElement.innerText) : null,
            reviews: reviewsElement ? reviewsElement.innerText : null,
            discount: discountElement ? discountElement.innerText : null,
            source: 'flipkart',
            timestamp: new Date().toISOString()
          });
        }
        
        return results.filter(item => item.title && item.price);
      });
    },
    parseFunction: (html) => {
      // Custom parsing logic for HTML response
      // Implement specific parsing for Flipkart's HTML structure
      // Will be implemented if needed
    }
  },
  
  croma: {
    name: 'Croma',
    baseUrl: 'https://www.croma.com',
    searchEndpoint: '/search/?text=',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'DNT': '1',
      'User-Agent': getRandomUserAgent(),
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
    // API search approach
    directApiEndpoint: 'https://api.croma.com/searchservices/v1/search',
    apiParams: (query) => ({
      fields: 'products',
      query: query,
      currentPage: 0,
      pageSize: 20,
    }),
    selectors: {
      productGrid: '.product-grid > div',
      productName: '.product-title h3',
      productPrice: '.amount',
      productImage: '.product-img img',
      productLink: '.product-img > a'
    },
    browserSelectors: {
      searchInput: '#searchV2',
      searchButton: '.searchV2-submit',
      resultsContainer: '.product-grid',
      productCard: '.product-item',
      productTitle: '.product-title h3',
      productPrice: '.pdpPrice',
      productImage: '.product-img img'
    },
    // Custom code for Croma to handle special cases
    customExtractorLogic: async (page) => {
      await page.waitForSelector('.product-item', { timeout: 10000 });
      
      // Wait a bit for any lazy-loaded content
      await page.waitForTimeout(2000);
      
      return await page.$$eval('.product-item', (cards) => {
        const results = [];
        
        for (const card of cards) {
          const titleElement = card.querySelector('.product-title h3');
          const priceElement = card.querySelector('.pdpPrice');
          const imageElement = card.querySelector('.product-img img');
          const linkElement = card.querySelector('.product-img > a');
          
          // Check if there's any out of stock indication
          const availability = !card.querySelector('.out-of-stock');
          
          results.push({
            title: titleElement ? titleElement.innerText.trim() : '',
            price: priceElement ? parseFloat(priceElement.innerText.replace(/[^0-9.]/g, '')) : null,
            image: imageElement ? imageElement.src : '',
            link: linkElement ? linkElement.href : '',
            inStock: availability,
            source: 'croma',
            timestamp: new Date().toISOString()
          });
        }
        
        return results.filter(item => item.title && item.price);
      });
    },
    parseFunction: (html) => {
      // Custom parsing logic for HTML response
      // Implement specific parsing for Croma's HTML structure
      // Will be implemented if needed
    }
  },
  
  relianceDigital: {
    name: 'Reliance Digital',
    baseUrl: 'https://www.reliancedigital.in',
    searchEndpoint: '/search?q=',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'DNT': '1',
      'User-Agent': getRandomUserAgent(),
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
    directApiEndpoint: 'https://www.reliancedigital.in/rildigitalws/v2/rrldigital/searchProduct',
    apiParams: (query) => ({
      searchQuery: query,
      page: 0,
      size: 20
    }),
    selectors: {
      productGrid: '.pl__container',
      productName: '.sp__name',
      productPrice: '.sp__price',
      productImage: '.product-img img',
      productLink: 'a.js-gtm-product-link'
    },
    browserSelectors: {
      searchInput: '#suggestionBoxEle',
      searchButton: '.search__button',
      resultsContainer: '.pl__container',
      productCard: '.product-item',
      productTitle: '.sp__name',
      productPrice: '.sp__price',
      productImage: '.product-img img',
      productLink: 'a.js-gtm-product-link'
    },
    // Custom code for Reliance Digital to handle special cases
    customExtractorLogic: async (page) => {
      // Wait for the lazy loaded content to appear
      await page.waitForSelector('.pl__container', { timeout: 10000 });
      
      // Scroll down to load lazy images
      await page.evaluate(() => {
        window.scrollBy(0, 1000);
        return new Promise(resolve => setTimeout(resolve, 1500));
      });
      
      return await page.$$eval('.product-item', (cards) => {
        const results = [];
        
        for (const card of cards) {
          const titleElement = card.querySelector('.sp__name');
          const priceElement = card.querySelector('.sp__price');
          const imageElement = card.querySelector('.product-img img');
          const linkElement = card.querySelector('a.js-gtm-product-link');
          
          // Check if there's an offer badge
          const offerElement = card.querySelector('.offer-badge');
          
          results.push({
            title: titleElement ? titleElement.innerText.trim() : '',
            price: priceElement ? parseFloat(priceElement.innerText.replace(/[^0-9.]/g, '')) : null,
            image: imageElement ? (imageElement.dataset.src || imageElement.src) : '',
            link: linkElement ? linkElement.href : '',
            offer: offerElement ? offerElement.innerText : null,
            source: 'relianceDigital',
            timestamp: new Date().toISOString()
          });
        }
        
        return results.filter(item => item.title && item.price);
      });
    },
    // Special function to handle cookies consent
    cookieConsent: {
      selector: '#cookie-popup-close',
      action: 'click'
    },
    parseFunction: (html) => {
      // Custom parsing logic for HTML response
      // Implement specific parsing for Reliance Digital's HTML structure
      // Will be implemented if needed
    }
  },
  
  meesho: {
    name: 'Meesho',
    baseUrl: 'https://www.meesho.com',
    searchEndpoint: '/search?q=',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'DNT': '1',
      'User-Agent': getRandomUserAgent(),
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
    // API search approach
    directApiEndpoint: 'https://meesho.com/api/v1/products/search',
    apiParams: (query) => ({
      q: query,
      page: 1,
      size: 20
    }),
    selectors: {
      productGrid: '.search-results-container',
      productName: '.product-title',
      productPrice: '.product-price',
      productImage: 'img.product-image',
      productLink: 'a.product-link'
    },
    browserSelectors: {
      searchInput: 'input[type="search"]',
      searchButton: 'button[type="submit"]',
      resultsContainer: '[data-testid="search-product-grid"]',
      productCard: '[data-testid="product-card"]',
      productTitle: '[data-testid="product-name"]',
      productPrice: '[data-testid="product-price"]',
      productImage: 'img'
    },
    // Custom code for Meesho to handle special cases
    customExtractorLogic: async (page) => {
      // Wait for product grid to appear
      await page.waitForSelector('[data-testid="search-product-grid"]', { timeout: 10000 });
      
      // Scroll down to load lazy images
      await page.evaluate(() => {
        window.scrollBy(0, 1000);
        return new Promise(resolve => setTimeout(resolve, 1000));
      });
      
      return await page.$$eval('[data-testid="product-card"]', (cards) => {
        const results = [];
        
        for (const card of cards) {
          const titleElement = card.querySelector('[data-testid="product-name"]');
          const priceElement = card.querySelector('[data-testid="product-price"]');
          const imageElement = card.querySelector('img');
          const linkElement = card.querySelector('a');
          
          // Get product rating if available
          const ratingElement = card.querySelector('[data-testid="product-rating"]');
          
          results.push({
            title: titleElement ? titleElement.innerText.trim() : '',
            price: priceElement ? parseFloat(priceElement.innerText.replace(/[^0-9.]/g, '')) : null,
            image: imageElement ? imageElement.src : '',
            link: linkElement ? linkElement.href : '',
            rating: ratingElement ? ratingElement.innerText : null,
            source: 'meesho',
            timestamp: new Date().toISOString()
          });
        }
        
        return results.filter(item => item.title && item.price);
      });
    },
    parseFunction: (html) => {
      // Custom parsing logic for HTML response
      // Implement specific parsing for Meesho's HTML structure
      // Will be implemented if needed
    }
  }
};