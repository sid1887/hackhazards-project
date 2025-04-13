import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import CyberLayout from './components/CyberLayout';
import InputModule from './components/InputModule';
import AnimatedGrid from './components/AnimatedGrid';
import ProductDetailsPage from './components/product/ProductDetailsPage';
import GlitchHeader from './components/GlitchHeader';
import './App.css';

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Add scroll animation effect
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.fade-in-on-scroll, .slide-in-left, .slide-in-right, .scale-in').forEach(el => {
      observer.observe(el);
    });
    
    return () => observer.disconnect();
  }, [results]);

  // Handle search submission (text or image)
  const handleSearch = async (query, imageFile) => {
    setLoading(true);
    setError(null);
    
    try {
      if (imageFile) {
        await handleImageUpload(imageFile);
      } else {
        await handleTextSearch(query);
      }
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle text search submission
  const handleTextSearch = async (query) => {
    try {
      const response = await fetch('http://localhost:5000/api/price-comparison/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: query,
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch price comparison data');
      }

      // Transform API results to ProductData format
      const formattedResults = transformApiResults(data, query);
      setResults(formattedResults);
    } catch (error) {
      console.error('Error fetching price comparison:', error);
      
      // Fallback mock data for development/demo
      const mockResults = generateMockResults(query);
      setResults(mockResults);
      throw error;
    }
  };

  // Handle image upload for visual search
  const handleImageUpload = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch('http://localhost:5000/api/price-comparison/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to process image');
      }

      // Transform API results to ProductData format
      const formattedResults = transformApiResults(data, 'Image Search');
      setResults(formattedResults);
    } catch (error) {
      console.error('Error processing image:', error);
      
      // Fallback mock data
      const mockResults = generateMockResults('Image Search');
      setResults(mockResults);
      throw error;
    }
  };

  // Transform API results to ProductData format
  const transformApiResults = (data, query) => {
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }
    
    // Find the lowest price to mark it
    const prices = data.results.map((r) => 
      typeof r.price === 'string' ? parseFloat(r.price.replace(/[^\d.]/g, '')) : (r.price || 0)
    );
    const lowestPriceIndex = prices.indexOf(Math.min(...prices));
    
    return data.results.map((result, index) => {
      const price = typeof result.price === 'string' 
        ? result.price 
        : `₹${result.price?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      
      const originalPrice = result.originalPrice 
        ? (typeof result.originalPrice === 'string' 
          ? result.originalPrice 
          : `₹${result.originalPrice?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`)
        : undefined;
      
      return {
        id: result.id || `id-${Math.random().toString(36).substr(2, 9)}`,
        name: result.name || data.productDetails?.name || query,
        price,
        originalPrice,
        discount: result.discount,
        vendor: result.retailer || result.marketplace || 'Unknown Retailer',
        vendorLogo: result.vendorLogo || `https://via.placeholder.com/32x32?text=${encodeURIComponent(result.retailer?.[0] || 'R')}`,
        rating: result.rating,
        inStock: result.inStock !== undefined ? result.inStock : true,
        isLowestPrice: index === lowestPriceIndex,
        isBestDeal: index === 0, // First result usually has best overall value
        imageUrl: result.imageUrl || `https://via.placeholder.com/300x300?text=${encodeURIComponent(result.retailer || 'Product')}`,
        url: result.url || `#${result.id || index}`
      };
    });
  };

  // Generate mock results for development/demo
  const generateMockResults = (query) => {
    const retailers = [
      { name: 'Amazon', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg' },
      { name: 'Flipkart', logo: 'https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/flipkart-plus_8d85f4.png' },
      { name: 'DMart', logo: 'https://d-mart.net/wp-content/uploads/2015/11/dm-icon.jpg' },
      { name: 'Reliance Digital', logo: 'https://i.pinimg.com/originals/43/00/9b/43009b67a83dca016c3a5b5c74b9f0e9.jpg' }
    ];
    const basePrice = Math.random() * 10000 + 5000;
    
    return retailers.map((retailer, index) => {
      // Create some price variance between retailers
      const variance = (Math.random() * 0.2) - 0.1; // -10% to +10%
      const price = basePrice * (1 + variance);
      const originalPrice = price * (1 + (Math.random() * 0.3 + 0.05)); // 5-35% higher
      const showDiscount = Math.random() > 0.3;
      const discount = showDiscount ? `${Math.round((1 - (price / originalPrice)) * 100)}% OFF` : undefined;

      return {
        id: `${index}-${Date.now()}`,
        name: `${query} - Premium Model ${index + 1}`,
        price: `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        originalPrice: showDiscount ? `₹${originalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : undefined,
        discount,
        vendor: retailer.name,
        vendorLogo: retailer.logo,
        rating: (Math.random() * 2 + 3).toFixed(1), // 3-5 stars
        inStock: Math.random() > 0.2,
        isLowestPrice: index === 1, // 2nd result has lowest price
        isBestDeal: index === 0, // 1st result has best deal
        imageUrl: `https://via.placeholder.com/300x300?text=${encodeURIComponent(retailer.name)}`,
        url: `https://example.com/${retailer.name.toLowerCase()}/${encodeURIComponent(query)}`
      };
    });
  };

  return (
    <Routes>
      <Route path="/" element={
        <div className="min-h-screen w-full bg-cyber-background relative">
          {/* Background Image Elements */}
          <div className="bg-image-corner-1"></div>
          <div className="bg-image-corner-2"></div>
          
          <div className="container mx-auto px-4 py-8 md:py-12">
            {/* Header */}
            <GlitchHeader 
              title="CUMPAIR" 
              subtitle="AI-powered price comparison across multiple retailers" 
            />
            
            {/* Hero Section */}
            <div className="max-w-4xl mx-auto mb-16 text-center fade-in-on-scroll">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white">
                Find the best deals with AI-powered price comparison
              </h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto transition-all duration-300 hover:text-gray-300">
                Cumpair uses advanced AI to compare prices across multiple retailers, helping you save money on your purchases. Search by text or upload an image of the product you're looking for.
              </p>
              
              {/* Input Section */}
              <InputModule onSearch={handleSearch} />
            </div>
            
            {/* Features Section */}
            {!hasSearched && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                <div className="glass-card p-6 flex flex-col items-center text-center slide-in-left">
                  <div className="w-12 h-12 rounded-full bg-cyber-blue/20 flex items-center justify-center mb-4 transform transition-all duration-300 hover:scale-110 hover:bg-cyber-blue/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-cyber-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">Multimodal Search</h3>
                  <p className="text-gray-400 transition-all duration-300 hover:text-gray-300">Search for products using text or image uploads for precise results.</p>
                </div>
                
                <div className="glass-card p-6 flex flex-col items-center text-center fade-in-on-scroll" style={{ transitionDelay: "150ms" }}>
                  <div className="w-12 h-12 rounded-full bg-cyber-purple/20 flex items-center justify-center mb-4 transform transition-all duration-300 hover:scale-110 hover:bg-cyber-purple/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-cyber-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">Real-time Comparison</h3>
                  <p className="text-gray-400 transition-all duration-300 hover:text-gray-300">Get the latest prices from multiple retailers in one place.</p>
                </div>
                
                <div className="glass-card p-6 flex flex-col items-center text-center slide-in-right" style={{ transitionDelay: "300ms" }}>
                  <div className="w-12 h-12 rounded-full bg-cyber-green/20 flex items-center justify-center mb-4 transform transition-all duration-300 hover:scale-110 hover:bg-cyber-green/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-cyber-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">AI-Powered Insights</h3>
                  <p className="text-gray-400 transition-all duration-300 hover:text-gray-300">Get smart recommendations and find the absolute best deals.</p>
                </div>
              </div>
            )}
            
            {/* Results Section */}
            {hasSearched && (
              <div className="mt-8 fade-in-on-scroll">
                <h2 className="text-2xl font-bold mb-6 text-white text-center">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyber-blue to-cyber-purple">
                    Price Comparison Results
                  </span>
                </h2>
                <AnimatedGrid products={results || []} isLoading={loading} />
              </div>
            )}
            
            {/* How It Works Section */}
            {!hasSearched && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold mb-8 text-white text-center fade-in-on-scroll">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyber-blue to-cyber-purple">
                    How It Works
                  </span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center text-center p-4 scale-in" style={{ transitionDelay: "150ms" }}>
                    <div className="w-10 h-10 rounded-full bg-cyber-background border border-cyber-blue flex items-center justify-center mb-4 transition-all duration-300 hover:scale-110 hover:bg-cyber-blue/10">
                      <span className="text-cyber-blue font-bold">1</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Search Your Product</h3>
                    <p className="text-gray-400 transition-all duration-300 hover:text-gray-300">Enter a product name or upload an image.</p>
                  </div>
                  
                  <div className="flex flex-col items-center text-center p-4 scale-in" style={{ transitionDelay: "300ms" }}>
                    <div className="w-10 h-10 rounded-full bg-cyber-background border border-cyber-purple flex items-center justify-center mb-4 transition-all duration-300 hover:scale-110 hover:bg-cyber-purple/10">
                      <span className="text-cyber-purple font-bold">2</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">AI Finds Best Matches</h3>
                    <p className="text-gray-400 transition-all duration-300 hover:text-gray-300">Our AI analyzes your query and searches across multiple retailers.</p>
                  </div>
                  
                  <div className="flex flex-col items-center text-center p-4 scale-in" style={{ transitionDelay: "450ms" }}>
                    <div className="w-10 h-10 rounded-full bg-cyber-background border border-cyber-green flex items-center justify-center mb-4 transition-all duration-300 hover:scale-110 hover:bg-cyber-green/10">
                      <span className="text-cyber-green font-bold">3</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Compare & Save</h3>
                    <p className="text-gray-400 transition-all duration-300 hover:text-gray-300">View all options in one place and choose the best deal for you.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Powered By Section */}
            {!hasSearched && (
              <div className="glass-card p-6 mb-16 text-center fade-in-on-scroll">
                <h3 className="text-xl font-semibold mb-2 text-white flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-cyber-blue transform transition-all duration-300 hover:scale-110 hover:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  Powered by Groq API
                </h3>
                <p className="text-gray-400 max-w-2xl mx-auto transition-all duration-300 hover:text-gray-300">
                  CUMPAIR leverages Groq's powerful API for lightning-fast AI responses, providing you with accurate and intelligent price comparisons in seconds.
                </p>
              </div>
            )}
            
            {/* Footer */}
            <footer className="mt-20 text-center text-gray-400 text-sm fade-in-on-scroll">
              <div className="h-px w-full max-w-md mx-auto bg-gradient-to-r from-transparent via-cyber-blue/30 to-transparent mb-6"></div>
              <div className="flex items-center justify-center space-x-4">
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-cyber-blue transition-colors flex items-center transform transition-all duration-300 hover:scale-105"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                  </svg>
                  GitHub
                </a>
                <span>|</span>
                <span>© 2025 Cumpair</span>
              </div>
              <p className="mt-2">
                <span className="text-cyber-blue">Powered by</span> Groq API
              </p>
            </footer>
          </div>
        </div>
      } />
      
      <Route path="/product/:id" element={<ProductDetailsPage />} />
    </Routes>
  );
}

export default App;
