/**
 * Direct API Integration Service
 * Bypasses browser rendering by directly hitting internal JSON/GraphQL endpoints
 */

const { gotScraping } = require('got-scraping');
const UserAgent = require('user-agents');
const randomstring = require('randomstring');
const querystring = require('querystring');
const crypto = require('crypto');

// API endpoints configuration for major retailers
const retailerApis = {
  amazon: {
    searchEndpoint: 'https://www.amazon.in/s/query',
    headers: {
      'x-amz-acp-params': '', // Will be generated dynamically
      'user-agent': '', // Will be set dynamically
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.5',
      'accept-encoding': 'gzip, deflate, br',
      'device-memory': '8',
      'downlink': '10',
      'dpr': '2',
      'ect': '4g',
      'sec-ch-device-memory': '8',
      'sec-ch-dpr': '2',
      'sec-ch-ua': '"Chromium";v="116", "Not)A;Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-ch-viewport-width': '1920',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'viewport-width': '1920'
    },
    getSearchParams: (query) => {
      return {
        'k': query,
        'ref': 'nb_sb_noss',
        'url': 'search-alias%3Daps'
      };
    },
    parseResponse: (body) => {
      try {
        // Amazon returns HTML that needs parsing
        // Look for JSON embedded in script tags
        const searchResultsPattern = /var\s+initialData\s*=\s*({.+?});/;
        const match = body.match(searchResultsPattern);
        if (match && match[1]) {
          const data = JSON.parse(match[1]);
          return extractAmazonProductData(data);
        }
        
        // Alternative search - look for search results widget data
        const widgetPattern = /"centerBelowPlus.+":.+?"results":\s*(\[.+?\])/;
        const widgetMatch = body.match(widgetPattern);
        if (widgetMatch && widgetMatch[1]) {
          const results = JSON.parse(widgetMatch[1]);
          return parseAmazonWidgetResults(results);
        }
        
        return { success: false, message: 'Could not find Amazon search results data' };
      } catch (error) {
        console.error('Error parsing Amazon API response:', error);
        return { success: false, message: 'Error parsing response', error };
      }
    }
  },
  flipkart: {
    searchEndpoint: 'https://www.flipkart.com/search-suggestions/v1',
    headers: {
      'user-agent': '', // Will be set dynamically
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      'x-user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 FKUA/website/42/website/Desktop',
      'content-type': 'application/json'
    },
    getSearchParams: (query) => {
      return {
        'q': query,
        'requestContext': {
          'productLayout': 'grid',
          'paginationContext': null
        }
      };
    },
    parseResponse: (body) => {
      try {
        const data = JSON.parse(body);
        if (data.products && Array.isArray(data.products)) {
          return {
            success: true,
            products: data.products.map(product => ({
              name: product.name || product.title,
              price: product.price?.value || product.price,
              originalPrice: product.original_price?.value || product.original_price,
              imageUrl: product.image || product.productImage,
              url: 'https://www.flipkart.com' + (product.url || product.productUrl || ''),
              seller: 'Flipkart',
              rating: product.rating?.average || product.rating
            }))
          };
        }
        return { success: false, message: 'No products found in response' };
      } catch (error) {
        console.error('Error parsing Flipkart API response:', error);
        return { success: false, message: 'Error parsing response', error };
      }
    }
  },
  meesho: {
    searchEndpoint: 'https://meesho.com/api/v1/products/search',
    headers: {
      'user-agent': '', // Will be set dynamically
      'accept': 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'x-meesho-uuid': '' // Will be generated dynamically
    },
    getSearchParams: (query) => {
      return {
        'query': query,
        'page': 1,
        'limit': 20
      };
    },
    parseResponse: (body) => {
      try {
        const data = JSON.parse(body);
        if (data.products && Array.isArray(data.products)) {
          return {
            success: true,
            products: data.products.map(product => ({
              name: product.name,
              price: product.price,
              originalPrice: product.original_price,
              imageUrl: product.images && product.images.length > 0 ? product.images[0].image_url : null,
              url: `https://meesho.com/${product.slug}/p/${product.product_id}`,
              seller: 'Meesho',
              rating: product.rating
            }))
          };
        }
        return { success: false, message: 'No products found in response' };
      } catch (error) {
        console.error('Error parsing Meesho API response:', error);
        return { success: false, message: 'Error parsing response', error };
      }
    }
  },
  relianceDigital: {
    searchEndpoint: 'https://www.reliancedigital.in/rildigitalws/v1/rrldigital/search-product',
    headers: {
      'user-agent': '', // Will be set dynamically
      'accept': 'application/json',
      'content-type': 'application/json',
      'webreferer': 'https://www.reliancedigital.in/'
    },
    getSearchParams: (query) => {
      return {
        'searchText': query,
        'page': 0,
        'size': 24
      };
    },
    parseResponse: (body) => {
      try {
        const data = JSON.parse(body);
        if (data.products && Array.isArray(data.products)) {
          return {
            success: true,
            products: data.products.map(product => ({
              name: product.productName || product.name,
              price: product.price?.sellingPrice || product.price,
              originalPrice: product.price?.mrpPrice || product.mrp,
              imageUrl: product.image || product.productImage,
              url: `https://www.reliancedigital.in${product.seoUrl || product.url}`,
              seller: 'Reliance Digital',
              rating: product.averageRating
            }))
          };
        }
        return { success: false, message: 'No products found in response' };
      } catch (error) {
        console.error('Error parsing Reliance Digital API response:', error);
        return { success: false, message: 'Error parsing response', error };
      }
    }
  },
  croma: {
    searchEndpoint: 'https://api.croma.com/product/allcategories/v1/search',
    headers: {
      'user-agent': '', // Will be set dynamically
      'accept': 'application/json',
      'content-type': 'application/json',
      'origin': 'https://www.croma.com',
      'client-type': 'WebClient'
    },
    getSearchParams: (query) => {
      return {
        'query': query,
        'currentPage': 0,
        'pageSize': 24
      };
    },
    parseResponse: (body) => {
      try {
        const data = JSON.parse(body);
        if (data.products && Array.isArray(data.products.results)) {
          return {
            success: true,
            products: data.products.results.map(product => ({
              name: product.name,
              price: product.price.value,
              originalPrice: product.mrpPrice?.value,
              imageUrl: product.plpImage,
              url: `https://www.croma.com${product.url}`,
              seller: 'Croma',
              rating: product.averageRating
            }))
          };
        }
        return { success: false, message: 'No products found in response' };
      } catch (error) {
        console.error('Error parsing Croma API response:', error);
        return { success: false, message: 'Error parsing response', error };
      }
    }
  }
};

/**
 * Helper function to extract Amazon product data
 */
function extractAmazonProductData(data) {
  try {
    // The structure will depend on Amazon's current API response format
    // This is a simplified example
    if (data.search && data.search.results) {
      return {
        success: true,
        products: data.search.results.map(product => ({
          name: product.title,
          price: product.price?.value || product.price,
          originalPrice: product.price?.original || product.originalPrice,
          imageUrl: product.image,
          url: `https://www.amazon.in${product.url}`,
          seller: 'Amazon',
          rating: product.rating?.value
        }))
      };
    }
    return { success: false, message: 'Could not find Amazon search results' };
  } catch (error) {
    console.error('Error extracting Amazon data:', error);
    return { success: false, message: 'Error extracting Amazon data' };
  }
}

/**
 * Helper function to parse Amazon widget results
 */
function parseAmazonWidgetResults(results) {
  try {
    return {
      success: true,
      products: results.map(item => ({
        name: item.title || item.name,
        price: item.price?.displayAmount || item.price,
        originalPrice: item.price?.savings?.amount ? 
          (parseFloat(item.price.displayAmount.replace(/[^0-9.]/g, '')) + 
           parseFloat(item.price.savings.amount.replace(/[^0-9.]/g, ''))) : undefined,
        imageUrl: item.image?.url || item.imageUrl,
        url: `https://www.amazon.in${item.detailPageUrl || item.url}`,
        seller: 'Amazon',
        rating: item.reviews?.rating || item.rating
      }))
    };
  } catch (error) {
    console.error('Error parsing Amazon widget results:', error);
    return { success: false, message: 'Error parsing Amazon widget results' };
  }
}

class DirectApiService {
  /**
   * Search for products using direct API calls instead of browser rendering
   * @param {string} query - Search query
   * @returns {Promise<{success: boolean, products: Array, retailer: string}>}
   */
  async searchProducts(query) {
    const results = [];
    const failedRetailers = [];
    const scrapedRetailers = [];
    
    // Create an array of promises, one for each retailer
    const searchPromises = Object.entries(retailerApis).map(async ([retailerKey, retailerConfig]) => {
      try {
        console.log(`Searching for "${query}" on ${retailerKey} using direct API...`);
        
        // Set dynamic headers
        const userAgent = new UserAgent().toString();
        retailerConfig.headers['user-agent'] = userAgent;
        
        // Set any other dynamic headers
        if (retailerKey === 'amazon') {
          retailerConfig.headers['x-amz-acp-params'] = Buffer.from(JSON.stringify({
            'lop': 'en_IN',
            'csm-hit': `tb:${randomstring.generate(20)}+s-${randomstring.generate(40)}|${Date.now()}`,
            't': Date.now()
          })).toString('base64');
        } else if (retailerKey === 'meesho') {
          retailerConfig.headers['x-meesho-uuid'] = crypto.randomUUID();
        }
        
        // Get search params
        const searchParams = retailerConfig.getSearchParams(query);
        
        // Make the API request
        const response = await gotScraping({
          url: retailerConfig.searchEndpoint,
          headers: retailerConfig.headers,
          method: retailerKey === 'amazon' ? 'GET' : 'POST',
          ...(retailerKey === 'amazon' 
            ? { searchParams } 
            : { json: searchParams }
          ),
          timeout: { request: 20000 }, // 20 second timeout
          retry: {
            limit: 3,
            methods: ['GET', 'POST'],
            statusCodes: [408, 413, 429, 500, 502, 503, 504]
          }
        });
        
        // Parse the response
        const parsedData = retailerConfig.parseResponse(response.body);
        
        if (parsedData.success && parsedData.products && parsedData.products.length > 0) {
          // Add retailer info to each product
          const productsWithRetailer = parsedData.products.map(product => ({
            ...product,
            retailer: retailerKey.charAt(0).toUpperCase() + retailerKey.slice(1) // Capitalize retailer name
          }));
          
          results.push(...productsWithRetailer);
          scrapedRetailers.push(retailerKey);
          console.log(`Successfully found ${productsWithRetailer.length} products from ${retailerKey} API`);
        } else {
          console.log(`No products found on ${retailerKey} API`);
          failedRetailers.push(retailerKey);
        }
      } catch (error) {
        console.error(`Error searching ${retailerKey} API:`, error);
        failedRetailers.push(retailerKey);
      }
    });
    
    // Wait for all API requests to complete
    await Promise.allSettled(searchPromises);
    
    return {
      success: results.length > 0,
      products: results,
      failedRetailers,
      scrapedRetailers,
      count: results.length,
      query
    };
  }
}

module.exports = new DirectApiService();