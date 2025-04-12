import React, { useState } from 'react';
import { MagnifyingGlassIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import BarcodeScanner from './components/BarcodeScanner';
import './App.css';

function App() {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/price-comparison/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName,
          category,
          specifications,
          expectedPrice
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch price comparison data');
      }

      setResults(data);
    } catch (error) {
      console.error('Error fetching price comparison:', error);
      setError(error.message || 'An unexpected error occurred');
      
      setResults({
        productDetails: {
          name: productName,
          category,
          specifications
        },
        results: [
          {
            marketplace: 'Amazon',
            price: '₹' + (Math.random() * 10000 + 5000).toFixed(2),
            originalPrice: '₹' + (Math.random() * 15000 + 8000).toFixed(2),
            discount: Math.floor(Math.random() * 30 + 5) + '%',
            rating: (Math.random() * 5).toFixed(1),
            inStock: true,
            shipping: 'Free with Prime',
            url: `https://amazon.in/s?k=${encodeURIComponent(productName)}`
          },
          {
            marketplace: 'Flipkart',
            price: '₹' + (Math.random() * 9000 + 4800).toFixed(2),
            originalPrice: '₹' + (Math.random() * 14000 + 7000).toFixed(2),
            discount: Math.floor(Math.random() * 25 + 3) + '%',
            rating: (Math.random() * 5).toFixed(1),
            inStock: true,
            shipping: '₹40',
            url: `https://flipkart.com/search?q=${encodeURIComponent(productName)}`
          },
          {
            marketplace: 'DMart',
            price: '₹' + (Math.random() * 8500 + 4500).toFixed(2),
            originalPrice: '₹' + (Math.random() * 13000 + 6000).toFixed(2),
            discount: Math.floor(Math.random() * 20 + 5) + '%',
            rating: (Math.random() * 5).toFixed(1),
            inStock: Math.random() > 0.3,
            shipping: 'Store pickup only',
            url: '#'
          },
          {
            marketplace: 'Reliance Mart',
            price: '₹' + (Math.random() * 9500 + 5200).toFixed(2),
            originalPrice: '₹' + (Math.random() * 14500 + 7500).toFixed(2),
            discount: Math.floor(Math.random() * 18 + 8) + '%',
            rating: (Math.random() * 5).toFixed(1),
            inStock: Math.random() > 0.2,
            shipping: 'Free Delivery',
            url: '#'
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSearch = () => {
    setShowScanner(true);
  };

  const handleBarcodeDetected = async (barcode) => {
    setShowScanner(false);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/price-comparison/barcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch product details from barcode');
      }

      setProductName(data.productDetails.name);
      if (data.productDetails.category) {
        setCategory(data.productDetails.category);
      }
      if (data.productDetails.specifications) {
        setSpecifications(data.productDetails.specifications);
      }
      
      setResults(data);
    } catch (error) {
      console.error('Error processing barcode:', error);
      setError(error.message || 'An unexpected error occurred while processing the barcode');
      
      setProductName(`Product (Barcode: ${barcode})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <header className="px-6 py-4 border-b border-gray-800">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-blue to-neon-teal bg-clip-text text-transparent">
            Cumpair
          </h1>
          <nav className="flex space-x-4">
            <a href="#" className="hover:text-neon-blue transition-colors">Home</a>
            <a href="#" className="hover:text-neon-blue transition-colors">About</a>
            <a href="#" className="hover:text-neon-blue transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-neon-blue via-neon-teal to-neon-green bg-clip-text text-transparent">
              Compare Prices
            </span> 
            <span> Across Retailers</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Enter a product name or scan a barcode to instantly compare prices across
            local stores and major hypermarkets like DMart, Reliance Mart, Amazon, and Flipkart.
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-16 bg-dark-surface p-6 rounded-xl shadow-lg border border-gray-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
              <div className="flex-1">
                <label htmlFor="productName" className="block text-sm font-medium text-gray-400 mb-1">
                  Product Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="productName"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g., iPhone 14 Pro, Samsung TV, etc."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleBarcodeSearch}
                    className="absolute right-3 top-2 text-gray-400 hover:text-neon-green"
                    title="Scan Barcode"
                  >
                    <QrCodeIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <div className="w-full md:w-1/3">
                <label htmlFor="category" className="block text-sm font-medium text-gray-400 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Appliances">Appliances</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Home & Kitchen">Home & Kitchen</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Toys">Toys</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
              <div className="flex-1">
                <label htmlFor="specifications" className="block text-sm font-medium text-gray-400 mb-1">
                  Specifications (Optional)
                </label>
                <input
                  type="text"
                  id="specifications"
                  value={specifications}
                  onChange={(e) => setSpecifications(e.target.value)}
                  placeholder="e.g., 128GB, Blue, 4K, etc."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                />
              </div>
              <div className="w-full md:w-1/3">
                <label htmlFor="expectedPrice" className="block text-sm font-medium text-gray-400 mb-1">
                  Expected Price (₹) (Optional)
                </label>
                <input
                  type="number"
                  id="expectedPrice"
                  value={expectedPrice}
                  onChange={(e) => setExpectedPrice(e.target.value)}
                  placeholder="e.g., 50000"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                />
              </div>
            </div>

            <div className="text-center">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-8 py-3 rounded-lg bg-gradient-to-r from-neon-blue to-neon-teal text-black font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neon-green focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Comparing Prices...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                    Compare Prices
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-8 bg-red-900/30 border border-red-700 text-red-100 p-4 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {results && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Price Comparison for <span className="text-neon-green">{results.productDetails.name}</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {results.results.map((result, index) => (
                <div key={index} className="bg-dark-surface border border-gray-800 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-neon-blue/10 transition-all duration-300 relative">
                  {index === 0 && (
                    <div className="absolute top-0 right-0 bg-neon-green text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                      BEST DEAL
                    </div>
                  )}
                  
                  <div className="p-5">
                    <div className="text-xl font-bold mb-2">{result.marketplace}</div>
                    
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-neon-teal">{result.price}</div>
                      {result.originalPrice && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 line-through text-sm">{result.originalPrice}</span>
                          <span className="text-neon-green text-sm">{result.discount} off</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>Rating:</span>
                        <span className="text-yellow-500">{result.rating} ★</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Availability:</span>
                        <span className={result.inStock ? 'text-green-500' : 'text-red-500'}>
                          {result.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping:</span>
                        <span>{result.shipping}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full text-center py-2 border border-neon-blue text-neon-blue rounded-lg hover:bg-neon-blue hover:text-black transition-colors duration-200"
                      >
                        View Deal
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-800 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-bold mb-3 text-neon-blue">AI-Powered Recommendation</h3>
              <p className="text-gray-300">
                Based on the current price comparison, we recommend purchasing from <strong>{results.results[0].marketplace}</strong>. 
                This retailer offers the best value considering price, shipping options, and availability.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-dark-surface border-t border-gray-800 py-6">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2025 Cumpair | A HackHazards Project</p>
          <p className="mt-2">Powered by Groq AI</p>
        </div>
      </footer>

      {showScanner && (
        <BarcodeScanner 
          onDetected={handleBarcodeDetected} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  );
}

export default App;
