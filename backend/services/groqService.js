const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

/**
 * Enhanced service for integrating with the Groq API for AI-assisted tasks
 * Implements multimodal capabilities, summarization, recommendations, reviews, and feature explanations
 */
class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1';
    
    // Define available models for different tasks - updated to currently supported models
    this.models = {
      default: 'llama3-8b-8192',
      summarization: 'llama3-8b-8192',
      recommendation: 'llama3-8b-8192',
      review: 'llama3-70b-8192',
      vision: 'llama3-70b-8192' // For multimodal tasks (assuming vision capability)
    };
    
    // Cache for API responses to save on API usage
    this.responseCache = new Map();
    this.cacheExpiryTime = 1000 * 60 * 60; // 1 hour
  }

  /**
   * Validates if the Groq API key is configured
   * @returns {boolean} - Whether the API key is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Get a cached response if available and not expired
   * @param {string} cacheKey - The cache key to look up
   * @returns {Object|null} - The cached response or null if not found/expired
   */
  getCachedResponse(cacheKey) {
    if (this.responseCache.has(cacheKey)) {
      const { timestamp, data } = this.responseCache.get(cacheKey);
      const now = Date.now();
      
      if (now - timestamp < this.cacheExpiryTime) {
        return data;
      }
      
      // Remove expired cache entry
      this.responseCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Store a response in the cache
   * @param {string} cacheKey - The cache key to store under
   * @param {Object} data - The data to cache
   */
  cacheResponse(cacheKey, data) {
    this.responseCache.set(cacheKey, {
      timestamp: Date.now(),
      data
    });
  }

  /**
   * Helper method to make API calls to Groq
   * @param {Object} messages - The messages to send to the API
   * @param {Object} options - Additional options for the API call
   * @returns {Object} - The response from the Groq API
   */
  async callGroqAPI(messages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Groq API key not configured');
    }
    
    // Generate a cache key from the messages and options
    const cacheKey = JSON.stringify({ messages, options });
    
    // Check if we have a cached response
    const cachedResponse = this.getCachedResponse(cacheKey);
    if (cachedResponse && !options.skipCache) {
      console.log('Using cached Groq API response');
      return cachedResponse;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: options.model || this.models.default,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1024
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Cache the response
      this.cacheResponse(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error calling Groq API:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Enhance web scraping results using Groq's AI
   * @param {string} productName - The name of the product
   * @param {string} htmlContent - The HTML content from web scraping
   * @returns {Object} - Enhanced data extracted from the HTML
   */
  async enhanceWebScraping(productName, htmlContent) {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in extracting product information and prices from e-commerce websites. Extract the data accurately and in a structured format.'
      },
      {
        role: 'user',
        content: `Extract the following information from this HTML content for the product "${productName}": 
        1. Current price (including currency)
        2. Original price (if available)
        3. Discount percentage (if available)
        4. Availability/stock status
        5. Shipping information
        6. Seller/vendor name
        7. Product ratings
        8. Technical specifications (if available)
        9. Product description (if available)
        
        Format the information as a JSON object for easy parsing. HTML content: ${htmlContent.substring(0, 8000)}` // Limit to avoid token limits
      }
    ];

    const response = await this.callGroqAPI(messages, {
      model: this.models.summarization,
      temperature: 0.3 // Lower temperature for factual extraction
    });

    return {
      enhancedData: response.choices[0].message.content,
      usage: response.usage
    };
  }

  /**
   * Process an image to extract product information (multimodal AI)
   * @param {string} base64Image - Base64-encoded image
   * @returns {Object} - Information extracted from the image
   */
  async processProductImage(base64Image) {
    // For this implementation, we'll use a text-first approach since direct vision API may not be available
    // In a full implementation, you would use a multimodal endpoint directly

    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in identifying products from images. Describe the product in detail, including its features, brand, and any text visible in the image.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this product image and provide detailed information about what you see. Include brand, model, features, and any text visible in the image.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ];

    // Note: This is a simplified implementation
    // In reality, you might need to use a different API endpoint for multimodal processing
    // or use a two-step process with an image processor + LLM
    
    try {
      const response = await this.callGroqAPI(messages, {
        model: this.models.vision,
        temperature: 0.4,
        skipCache: true // Skip cache for image processing since each image is unique
      });

      return {
        productInfo: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      console.error('Error processing image:', error);
      
      // Fall back to a text-only approach if multimodal fails
      const textOnlyMessages = [
        {
          role: 'system',
          content: 'You are an AI specialized in product identification.'
        },
        {
          role: 'user',
          content: 'I was unable to process the image directly. Please explain how a user can manually input product details for the best results.'
        }
      ];
      
      const fallbackResponse = await this.callGroqAPI(textOnlyMessages, {
        model: this.models.default,
        temperature: 0.7
      });
      
      return {
        productInfo: fallbackResponse.choices[0].message.content,
        usage: fallbackResponse.usage,
        isError: true
      };
    }
  }

  /**
   * Process OCR text extracted from product images
   * @param {string} ocrText - Text extracted from an image using OCR
   * @returns {Promise<Object>} - AI-generated product description and features
   */
  async processOCRText(ocrText) {
    // Skip processing if no text was extracted
    if (!ocrText || ocrText.trim().length === 0) {
      return {
        success: false,
        message: 'No text was detected in the image'
      };
    }
    
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in analyzing product information from OCR text. Your task is to identify and structure product details from text extracted from product images or labels.'
      },
      {
        role: 'user',
        content: `Based on the OCR output from this product image, generate a detailed product description highlighting its key features and quality indicators. Identify the brand name, model, price (if visible), specifications, and any other relevant product details.

OCR Text:
${ocrText}

Format your response as a JSON object with these fields:
- productName: The full name of the product
- brand: The brand of the product
- model: The model number or name
- estimatedPrice: Any price information detected (or "Not available")
- keyFeatures: Array of key features
- specifications: Object containing technical specifications
- description: A well-formatted description paragraph
- qualityIndicators: Any information that indicates quality
`
      }
    ];
    
    try {
      const response = await this.callGroqAPI(messages, {
        model: this.models.default,
        temperature: 0.3
      });
      
      let result;
      try {
        // Try to extract JSON from the response
        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                          content.match(/```\n([\s\S]*?)\n```/) || 
                          content.match(/{[\s\S]*?}/);
                          
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          // Try to parse the entire content as JSON
          result = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('Error parsing OCR analysis response:', parseError);
        
        // Fallback: extract information using regex
        const content = response.choices[0].message.content;
        result = {
          productName: this.extractField(content, 'productName', 'Product Name'),
          brand: this.extractField(content, 'brand', 'Brand'),
          model: this.extractField(content, 'model', 'Model'),
          estimatedPrice: this.extractField(content, 'estimatedPrice', 'Price'),
          keyFeatures: this.extractArray(content, 'keyFeatures'),
          specifications: this.extractObject(content, 'specifications'),
          description: this.extractField(content, 'description', 'Description'),
          qualityIndicators: this.extractArray(content, 'qualityIndicators')
        };
      }
      
      return {
        success: true,
        analysisData: result,
        rawResponse: response.choices[0].message.content
      };
    } catch (error) {
      console.error('Error processing OCR text:', error);
      return {
        success: false,
        message: `Error processing OCR text: ${error.message}`
      };
    }
  }
  
  /**
   * Helper to extract a field from text using both JSON key and natural language patterns
   * @param {string} text - The text to extract from
   * @param {string} jsonKey - The JSON key to look for
   * @param {string} naturalLabel - The natural language label to look for
   * @returns {string} - The extracted value or empty string
   */
  extractField(text, jsonKey, naturalLabel) {
    // Try JSON pattern first: "jsonKey": "value" or "jsonKey":"value"
    const jsonPattern = new RegExp(`"${jsonKey}"\\s*:\\s*"([^"]*)"`, 'i');
    const jsonMatch = text.match(jsonPattern);
    if (jsonMatch) return jsonMatch[1];
    
    // Try natural language pattern: Label: value or Label - value
    const naturalPattern = new RegExp(`${naturalLabel}[:\\-]\\s*([^\\n]*)`, 'i');
    const naturalMatch = text.match(naturalPattern);
    if (naturalMatch) return naturalMatch[1].trim();
    
    return '';
  }
  
  /**
   * Helper to extract an array from text
   * @param {string} text - The text to extract from
   * @param {string} arrayKey - The array key to look for
   * @returns {Array} - The extracted array or empty array
   */
  extractArray(text, arrayKey) {
    // Look for array pattern: either JSON array or bullet points
    const arrayMatch = text.match(new RegExp(`"${arrayKey}"\\s*:\\s*(\\[([^\\]]*)\\])`, 'i'));
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[1]);
      } catch (e) {
        // If JSON parse fails, split by commas
        return arrayMatch[1].replace(/[\[\]"]/g, '').split(',').map(item => item.trim());
      }
    }
    
    // Look for bullet points or numbered list
    const bulletPattern = new RegExp(`${arrayKey}[:\\-]\\s*([\\s\\S]*?)(?=(\\n\\w+[:\\-]|$))`, 'i');
    const bulletMatch = text.match(bulletPattern);
    if (bulletMatch) {
      return bulletMatch[1]
        .split(/\n[-*•]|\n\d+\./)
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }
    
    return [];
  }
  
  /**
   * Helper to extract an object from text
   * @param {string} text - The text to extract from
   * @param {string} objectKey - The object key to look for
   * @returns {Object} - The extracted object or empty object
   */
  extractObject(text, objectKey) {
    // Look for object pattern in JSON
    const objectMatch = text.match(new RegExp(`"${objectKey}"\\s*:\\s*(\\{[^}]*\\})`, 'i'));
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[1]);
      } catch (e) {
        // If JSON parse fails, return empty object
        return {};
      }
    }
    
    // Try to build object from key-value pairs in text
    const result = {};
    const section = text.match(new RegExp(`${objectKey}[:\\-]\\s*([\\s\\S]*?)(?=(\\n\\w+[:\\-]|$))`, 'i'));
    if (section) {
      const pairs = section[1].match(/(\w+)[:\\-]\s*([^\n]*)/g);
      if (pairs) {
        pairs.forEach(pair => {
          const [key, value] = pair.split(/[:\\-]\s*/);
          if (key && value) {
            result[key.trim()] = value.trim();
          }
        });
      }
    }
    
    return result;
  }
  
  /**
   * Use the "code" modality of Groq to enhance and fix code
   * @param {string} codeSnippet - The code snippet to enhance or fix
   * @param {string} instructions - Instructions on what to do with the code
   * @param {string} errorDetails - Error details to provide additional context
   * @returns {Promise<Object>} - Enhanced or fixed code with explanations
   */
  async enhanceCode(codeSnippet, instructions, errorDetails = '') {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in code enhancement, optimization, and bug fixing. Generate clean, efficient, and robust code based on the input code and instructions.'
      },
      {
        role: 'user',
        content: `Enhance, optimize, or fix the following code according to these instructions:
          
${instructions}

Error details (if applicable):
${errorDetails}

\`\`\`
${codeSnippet}
\`\`\`

Respond with ONLY the fixed code wrapped in triple backticks, with no additional explanation or commentary.`
      }
    ];
    
    try {
      const response = await this.callGroqAPI(messages, {
        model: this.models.default,
        temperature: 0.2, // Low temperature for more deterministic code generation
        max_tokens: 2048, // Allow longer responses for complex code
        skipCache: true   // Don't cache code fixes as they're likely to be unique
      });
      
      // Extract code from the response
      const content = response.choices[0].message.content;
      const codeMatch = content.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/) || 
                        content.match(/```([\s\S]*?)```/);
      
      if (codeMatch) {
        return {
          success: true,
          enhancedCode: codeMatch[1].trim(),
          originalCode: codeSnippet,
          usage: response.usage
        };
      } else {
        // If no code block format, return the full content
        return {
          success: true,
          enhancedCode: content.trim(),
          originalCode: codeSnippet,
          usage: response.usage
        };
      }
    } catch (error) {
      console.error('Error enhancing code:', error);
      return {
        success: false,
        message: `Error enhancing code: ${error.message}`,
        originalCode: codeSnippet
      };
    }
  }
  
  /**
   * Generate a code fallback solution when scraping fails
   * @param {string} url - The URL that failed to scrape
   * @param {Error} error - The error that occurred during scraping
   * @param {string} originalCode - The original scraping code that failed
   * @returns {Promise<Object>} - Generated fallback code with explanations
   */
  async generateScraperFallback(url, error, originalCode) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error && error.stack ? error.stack : '';
    
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in generating robust web scraping code that can handle edge cases, anti-scraping measures, and dynamic content. Your code should include proper error handling, retries, and fallback mechanisms.'
      },
      {
        role: 'user',
        content: `The following web scraping code failed when trying to scrape ${url}:

\`\`\`javascript
${originalCode}
\`\`\`

Error details:
${errorMessage}
${errorStack}

Generate a more robust version of this scraping code that addresses the specific error and includes:
1. Better error handling with detailed logging
2. Retry mechanism with exponential backoff
3. Alternative selectors or approaches to extract the same data
4. Handling for dynamic content loading if applicable
5. Bypass for potential anti-scraping measures

Respond with ONLY the fixed code wrapped in triple backticks, with no additional explanation.`
      }
    ];
    
    try {
      const response = await this.callGroqAPI(messages, {
        model: this.models.default,
        temperature: 0.3,
        max_tokens: 2048,
        skipCache: true
      });
      
      // Extract code from the response
      const content = response.choices[0].message.content;
      const codeMatch = content.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/) || 
                        content.match(/```([\s\S]*?)```/);
      
      if (codeMatch) {
        return {
          success: true,
          fallbackCode: codeMatch[1].trim(),
          originalCode: originalCode,
          error: errorMessage,
          usage: response.usage
        };
      } else {
        // If no code block format, return the full content
        return {
          success: true,
          fallbackCode: content.trim(),
          originalCode: originalCode,
          error: errorMessage,
          usage: response.usage
        };
      }
    } catch (error) {
      console.error('Error generating scraper fallback:', error);
      return {
        success: false,
        message: `Error generating fallback: ${error.message}`,
        originalCode: originalCode
      };
    }
  }

  /**
   * Summarize and compare product prices across different retailers
   * @param {Array} productData - Array of product data from different retailers
   * @returns {Object} - Summary and comparison of product data
   */
  async summarizeAndCompare(productData) {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in analyzing price comparison data and providing valuable insights to consumers. Focus on presenting the key price differences, best deals, and important product features. Be concise yet informative.'
      },
      {
        role: 'user',
        content: `Summarize and compare the following product information from different retailers:
        
        ${JSON.stringify(productData, null, 2)}
        
        Please provide:
        1. A brief overview of the product
        2. A clear comparison of prices across retailers
        3. Highlight of the best overall deal with reasoning
        4. Any notable differences in product features or specifications
        5. Shipping and availability considerations
        
        Format your response in a user-friendly way that helps consumers make an informed decision.`
      }
    ];

    const response = await this.callGroqAPI(messages, {
      model: this.models.summarization,
      temperature: 0.5,
      max_tokens: 1024
    });

    return {
      summary: response.choices[0].message.content,
      usage: response.usage
    };
  }

  /**
   * Get personalized product recommendations based on user preferences
   * @param {string} productName - The product name to get recommendations for
   * @param {string} userPreferences - User preferences for recommendations
   * @param {number} budget - User's budget constraint
   * @param {Array} scrapedData - Data from scraped products
   * @returns {Object} - Product recommendations
   */
  async getPersonalizedRecommendations(productName, userPreferences, budget, scrapedData) {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in providing personalized product recommendations based on user preferences, budget constraints, and current market data. Your recommendations should be specific, actionable, and tailored to the user\'s needs.'
      },
      {
        role: 'user',
        content: `Based on the following information, provide 3-5 personalized product recommendations:
        
        Product category: ${productName}
        User preferences: ${userPreferences || 'Not specified'}
        Budget: ${budget ? `₹${budget}` : 'Not specified'}
        
        Current market data:
        ${JSON.stringify(scrapedData, null, 2)}
        
        For each recommendation, include:
        1. Product name and key features
        2. Why it's a good match for this user's preferences
        3. Price point and best retailer to purchase from
        4. Any special deals or considerations
        
        Focus on providing recommendations that genuinely meet the user's needs and budget, rather than just listing the most expensive options.`
      }
    ];

    const response = await this.callGroqAPI(messages, {
      model: this.models.recommendation,
      temperature: 0.7,
      max_tokens: 1536
    });

    return {
      recommendations: response.choices[0].message.content,
      usage: response.usage
    };
  }

  /**
   * Generate creative product reviews or descriptions
   * @param {Object} productDetails - Details of the product
   * @returns {Object} - Generated review or description
   */
  async generateCreativeContent(productDetails) {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in creating engaging, informative, and balanced product descriptions and reviews. Your content should highlight key features while being honest about potential drawbacks. Use a conversational, helpful tone that assists consumers in making informed decisions.'
      },
      {
        role: 'user',
        content: `Create an engaging product description and balanced review for the following product:
        
        ${JSON.stringify(productDetails, null, 2)}
        
        Please include:
        1. A catchy headline for the product
        2. A concise but comprehensive product description highlighting key features
        3. A balanced review mentioning both pros and cons
        4. Key use cases or scenarios where this product excels
        5. Who this product is ideal for
        
        Make the content informative yet engaging, and keep it under 500 words.`
      }
    ];

    const response = await this.callGroqAPI(messages, {
      model: this.models.review,
      temperature: 0.8,
      max_tokens: 1024
    });

    return {
      creativeContent: response.choices[0].message.content,
      usage: response.usage
    };
  }

  /**
   * Explain technical product features in simple terms
   * @param {Object} specifications - Technical specifications of the product
   * @returns {Object} - Simplified explanation of features
   */
  async explainFeatures(specifications) {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in simplifying technical product specifications into clear, understandable language for the average consumer. Avoid jargon when possible, and when technical terms must be used, explain them in simple terms. Focus on what the features mean for the user experience rather than just the technical details.'
      },
      {
        role: 'user',
        content: `Explain the following technical product specifications in simple, consumer-friendly terms:
        
        ${JSON.stringify(specifications, null, 2)}
        
        For each specification:
        1. Explain what it means in everyday language
        2. Why this specification matters to the average user
        3. How it compares to typical values in this product category (if appropriate)
        
        Keep your explanations concise but informative, focusing on helping a non-technical person understand the real-world significance of these specifications.`
      }
    ];

    const response = await this.callGroqAPI(messages, {
      model: this.models.default,
      temperature: 0.6,
      max_tokens: 1024
    });

    return {
      simplifiedExplanation: response.choices[0].message.content,
      usage: response.usage
    };
  }

  /**
   * Analyze price comparison data to provide insights
   * @param {Array} priceData - Array of price data from different sources
   * @returns {Object} - Analysis of price data with insights
   */
  async analyzePriceComparison(priceData) {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in analyzing price comparison data and providing valuable insights to consumers. Be specific, data-driven, and focus on actionable recommendations.'
      },
      {
        role: 'user',
        content: `Analyze this price comparison data and provide insights on:
        1. Which marketplace offers the best overall value (considering price, shipping, ratings)
        2. Price trends or patterns across retailers
        3. Specific recommendations for the buyer (buy now, wait, specific retailer)
        4. Any unusual pricing or special deals worth noting
        5. Price-to-value assessment based on features and price point
        
        Price data: ${JSON.stringify(priceData, null, 2)}`
      }
    ];

    const response = await this.callGroqAPI(messages, {
      model: this.models.summarization,
      temperature: 0.5,
      max_tokens: 1024
    });

    return {
      analysis: response.choices[0].message.content,
      usage: response.usage
    };
  }

  /**
   * Process a barcode to identify a product
   * @param {string} barcodeData - The data extracted from a barcode scan
   * @returns {Object} - Product identification information
   */
  async processBarcodeData(barcodeData) {
    const messages = [
      {
        role: 'system',
        content: 'You are an AI specialized in identifying products from barcode data. Provide detailed and accurate product information when possible.'
      },
      {
        role: 'user',
        content: `Based on this barcode data, provide the most likely product information:
        
        Barcode data: ${barcodeData}
        
        Include product name, category, typical specifications, manufacturer, and any other identifiable information. If the barcode format provides specific information about product origins, manufacturing details, or other metadata, please include that as well.`
      }
    ];

    const response = await this.callGroqAPI(messages, {
      model: this.models.default,
      temperature: 0.4,
      max_tokens: 1024
    });

    return {
      productIdentification: response.choices[0].message.content,
      usage: response.usage
    };
  }

  /**
   * Make a direct prediction using Groq, returning the raw text response
   * @param {string} prompt - The prompt to send to Groq
   * @param {Object} options - Additional options for the API call
   * @returns {Promise<string>} - Raw text response from Groq
   */
  async fetchGroqPrediction(prompt, options = {}) {
    const messages = [
      {
        role: 'system',
        content: options.systemPrompt || 'You are a helpful AI assistant that provides accurate and detailed information.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.callGroqAPI(messages, {
        model: options.model || this.models.default,
        temperature: options.temperature || 0.4,
        max_tokens: options.max_tokens || 1024,
        skipCache: options.skipCache || false
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error fetching Groq prediction:', error);
      throw error;
    }
  }
}

module.exports = new GroqService();