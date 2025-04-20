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

export default api;