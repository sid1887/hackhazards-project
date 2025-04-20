import axios from 'axios';

// Get the base URL from environment variables or use a default
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create an axios instance with the base URL
const api = axios.create({
  baseURL,
  timeout: 120000, // 120 seconds (2 minutes) timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      console.error('API Response Error:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.response?.data?.message || error.message,
      });
    } else {
      console.error('API Unknown Error:', error);
    }
    return Promise.reject(error);
  }
);

// Groq API Services
export const groqApi = {
  // Generate product summary from consolidated data
  generateProductSummary: async (consolidatedData) => {
    const response = await api.post('/api/groq/product-summary', { consolidatedData });
    return response.data;
  },

  // Enhance web scraping results using Groq AI
  enhanceWebScraping: async (productName, htmlContent) => {
    const response = await api.post('/api/groq/enhance-scraping', { productName, htmlContent });
    return response.data;
  },

  // Identify product from uploaded image
  identifyProductFromImage: async (imageFile) => {
    const formData = new FormData();
    formData.append('productImage', imageFile);

    const response = await api.post('/api/groq/identify-product', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Summarize and compare product data from different retailers
  summarizeAndCompare: async (productData) => {
    const response = await api.post('/api/groq/summarize', { productData });
    return response.data;
  },

  // Get personalized product recommendations
  getRecommendations: async (productName, userPreferences, budget, scrapedData) => {
    const response = await api.post('/api/groq/recommendations', {
      productName,
      userPreferences,
      budget,
      scrapedData
    });
    return response.data;
  },

  // Generate creative content for products
  generateCreativeContent: async (productDetails) => {
    const response = await api.post('/api/groq/creative-content', { productDetails });
    return response.data;
  },

  // Explain technical product features in simple terms
  explainFeatures: async (specifications) => {
    const response = await api.post('/api/groq/explain-features', { specifications });
    return response.data;
  },

  // Analyze price comparison data
  analyzePrices: async (priceData) => {
    const response = await api.post('/api/groq/analyze-prices', { priceData });
    return response.data;
  }
};

export default api;