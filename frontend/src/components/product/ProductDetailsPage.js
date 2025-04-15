import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CyberLayout from '../CyberLayout.tsx';

/**
 * ProductDetailsPage Component
 * 
 * A cyberpunk-styled detailed view for a specific product with comprehensive
 * price comparison information and interactive elements.
 */
const ProductDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      
      try {
        // Attempt to fetch product details from API
        const response = await fetch(`http://localhost:5000/api/price-comparison/product/${id}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch product details');
        }
        
        setProduct(data.product);
      } catch (error) {
        console.error('Error fetching product details:', error);
        setError(error.message || 'An unexpected error occurred');
        
        // Create a mock product for demo purposes
        const mockProduct = generateMockProduct(id);
        setProduct(mockProduct);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProductDetails();
  }, [id]);
  
  // Mock product generator for development/demo
  const generateMockProduct = (productId) => {
    const retailers = ['Amazon', 'Flipkart', 'DMart', 'Reliance Digital', 'Croma'];
    const basePrice = Math.random() * 50000 + 20000;
    const productName = `Premium Smart Device (ID: ${productId})`;
    
    return {
      id: productId,
      name: productName,
      description: 'This high-end device features the latest technology, stunning display, and powerful performance for all your needs. Perfect for professionals and casual users alike.',
      specifications: [
        { name: 'Processor', value: 'Ultimate Pro Max' },
        { name: 'Memory', value: '16GB' },
        { name: 'Storage', value: '1TB SSD' },
        { name: 'Display', value: '7" Ultra HD' },
        { name: 'Battery', value: '4800mAh' },
        { name: 'Dimensions', value: '158.5 x 73.1 x 8.5mm' },
        { name: 'Weight', value: '195g' }
      ],
      category: 'Electronics',
      imageUrl: `https://via.placeholder.com/600x400?text=${encodeURIComponent(productName)}`,
      additionalImages: [
        `https://via.placeholder.com/600x400?text=Angle+1`,
        `https://via.placeholder.com/600x400?text=Angle+2`,
        `https://via.placeholder.com/600x400?text=Angle+3`,
      ],
      ratings: {
        average: (Math.random() * 2 + 3).toFixed(1),
        count: Math.floor(Math.random() * 1000 + 500)
      },
      prices: retailers.map(retailer => {
        const variance = (Math.random() * 0.2) - 0.1; // -10% to +10%
        const price = basePrice * (1 + variance);
        const originalPrice = price * (1 + (Math.random() * 0.3 + 0.05));
        
        return {
          retailer,
          price,
          originalPrice: Math.random() > 0.3 ? originalPrice : null,
          url: `https://example.com/${retailer.toLowerCase()}/${productId}`,
          inStock: Math.random() > 0.2,
          shipping: Math.random() > 0.5 ? 'Free Shipping' : `₹${Math.floor(Math.random() * 100 + 50)}`,
          deliveryEstimate: `${Math.floor(Math.random() * 5 + 1)}-${Math.floor(Math.random() * 5 + 5)} days`
        };
      }),
      priceHistory: Array.from({ length: 12 }, (_, i) => {
        // Create a price history with some fluctuation
        const monthsAgo = 11 - i;
        const fluctuation = Math.sin(i * 0.5) * 0.15; // -15% to +15% sine wave pattern
        
        return {
          date: new Date(new Date().setMonth(new Date().getMonth() - monthsAgo)).toISOString().split('T')[0],
          price: basePrice * (1 + fluctuation)
        };
      }),
      features: [
        'State-of-the-art processor for lightning-fast performance',
        'Ultra HD display with enhanced color accuracy',
        'Extended battery life lasting up to 48 hours on standard usage',
        'IP68 water and dust resistance',
        'Enhanced low-light camera capabilities',
        'Fingerprint and facial recognition security'
      ],
      relatedProducts: Array.from({ length: 3 }, (_, i) => ({
        id: `related-${i}-${Date.now()}`,
        name: `Related Device Model ${String.fromCharCode(65 + i)}`,
        imageUrl: `https://via.placeholder.com/200x200?text=Related+${i}`,
        price: basePrice * (0.8 + (i * 0.2)) // 80%, 100%, 120% of basePrice
      }))
    };
  };
  
  if (loading) {
    return (
      <CyberLayout title="Loading" background="minimal" noHeader>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-2 border-t-transparent border-neon-blue rounded-full animate-spin mb-4"></div>
          <p className="font-mono text-dark-text-secondary animate-pulse">LOADING PRODUCT DATA...</p>
        </div>
      </CyberLayout>
    );
  }
  
  if (error && !product) {
    return (
      <CyberLayout title="Error" background="minimal">
        <div className="bg-cyber-red/20 border border-cyber-red text-white p-6 rounded-lg max-w-2xl mx-auto">
          <h2 className="font-tech text-xl mb-3">DATA RETRIEVAL ERROR</h2>
          <p className="font-mono text-sm">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 bg-dark-surface border border-neon-blue text-neon-blue px-4 py-2 rounded-md hover:bg-neon-blue/10 transition-all duration-200"
          >
            RETURN TO SEARCH
          </button>
        </div>
      </CyberLayout>
    );
  }

  // Sort prices by lowest first
  const sortedPrices = [...product.prices].sort((a, b) => a.price - b.price);
  const lowestPrice = sortedPrices[0];
  
  return (
    <CyberLayout background="dots">
      <div className="max-w-5xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <button 
            onClick={() => navigate('/')}
            className="font-mono text-sm text-dark-text-secondary hover:text-neon-blue transition-colors duration-200 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            BACK TO SEARCH
          </button>
        </div>
        
        {/* Product Header */}
        <div className="mb-8">
          <h1 className="font-tech text-2xl md:text-3xl text-white mb-2">{product.name}</h1>
          <div className="flex items-center text-dark-text-secondary font-mono text-sm">
            <span className="flex items-center mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neon-yellow mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {product.ratings?.average || '4.5'} ({product.ratings?.count || '500'} ratings)
            </span>
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neon-green mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {product.category}
            </span>
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          {/* Product image and gallery - 2 columns */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-dark-surface rounded-lg overflow-hidden border border-dark-border">
              <div className="relative">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-auto object-contain"
                />
                <div className="absolute inset-0 scanline opacity-30 pointer-events-none"></div>
              </div>
            </div>
            
            {/* Thumbnail gallery */}
            {product.additionalImages && product.additionalImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {product.additionalImages.map((image, idx) => (
                  <div key={idx} className="bg-dark-surface rounded-md overflow-hidden border border-dark-border cursor-pointer hover:border-neon-blue transition-colors duration-200">
                    <img 
                      src={image} 
                      alt={`${product.name} - View ${idx + 1}`}
                      className="w-full h-auto object-cover aspect-square"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Product details and pricing - 3 columns */}
          <div className="md:col-span-3 space-y-6">
            {/* Best price highlight */}
            <div className="bg-dark-surface border border-neon-blue rounded-lg p-5 relative overflow-hidden">
              <div className="absolute -top-1 -left-1 origin-top-left rotate-[-3deg] px-3 py-1 font-mono text-xs font-bold text-black bg-neon-blue">
                BEST PRICE
              </div>
              
              <div className="mt-4">
                <h3 className="font-tech text-white mb-2">{lowestPrice.retailer}</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-neon-blue mr-3">₹{lowestPrice.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  {lowestPrice.originalPrice && (
                    <>
                      <span className="text-dark-text-secondary line-through mr-2">
                        ₹{lowestPrice.originalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-neon-green text-sm">
                        {Math.round((1 - (lowestPrice.price / lowestPrice.originalPrice)) * 100)}% off
                      </span>
                    </>
                  )}
                </div>
                
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm font-mono">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${lowestPrice.inStock ? 'bg-neon-green' : 'bg-cyber-red'}`}></span>
                    <span className="text-dark-text-secondary">{lowestPrice.inStock ? 'In Stock' : 'Out of Stock'}</span>
                  </div>
                  <div className="text-dark-text-secondary">
                    Shipping: {lowestPrice.shipping}
                  </div>
                  {lowestPrice.deliveryEstimate && (
                    <div className="text-dark-text-secondary">
                      Delivery: {lowestPrice.deliveryEstimate}
                    </div>
                  )}
                </div>
                
                <div className="mt-6">
                  <a 
                    href={lowestPrice.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full text-center py-3 bg-neon-blue text-dark-bg font-mono font-bold rounded-md hover:brightness-110 transition-all duration-200"
                  >
                    BUY NOW
                  </a>
                </div>
              </div>
            </div>
            
            {/* Tabbed content navigation */}
            <div className="border-b border-dark-border">
              <nav className="flex font-mono text-sm overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setSelectedTab('overview')}
                  className={`px-4 py-2 border-b-2 transition-colors duration-200 whitespace-nowrap ${
                    selectedTab === 'overview' ? 'border-neon-blue text-neon-blue' : 'border-transparent text-dark-text-secondary hover:text-white'
                  }`}
                >
                  OVERVIEW
                </button>
                <button 
                  onClick={() => setSelectedTab('specs')}
                  className={`px-4 py-2 border-b-2 transition-colors duration-200 whitespace-nowrap ${
                    selectedTab === 'specs' ? 'border-neon-blue text-neon-blue' : 'border-transparent text-dark-text-secondary hover:text-white'
                  }`}
                >
                  SPECIFICATIONS
                </button>
                <button 
                  onClick={() => setSelectedTab('prices')}
                  className={`px-4 py-2 border-b-2 transition-colors duration-200 whitespace-nowrap ${
                    selectedTab === 'prices' ? 'border-neon-blue text-neon-blue' : 'border-transparent text-dark-text-secondary hover:text-white'
                  }`}
                >
                  ALL PRICES
                </button>
                <button 
                  onClick={() => setSelectedTab('history')}
                  className={`px-4 py-2 border-b-2 transition-colors duration-200 whitespace-nowrap ${
                    selectedTab === 'history' ? 'border-neon-blue text-neon-blue' : 'border-transparent text-dark-text-secondary hover:text-white'
                  }`}
                >
                  PRICE HISTORY
                </button>
              </nav>
            </div>
            
            {/* Tabbed content */}
            <div className="min-h-[300px]">
              {selectedTab === 'overview' && (
                <div className="space-y-4">
                  <p className="text-dark-text-secondary">{product.description}</p>
                  
                  {product.features && product.features.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-tech text-white mb-2">Key Features</h3>
                      <ul className="list-none space-y-2">
                        {product.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start text-dark-text-secondary text-sm">
                            <span className="text-neon-green mr-2 mt-1">•</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {selectedTab === 'specs' && product.specifications && (
                <div className="space-y-2">
                  <h3 className="font-tech text-white mb-3">Technical Specifications</h3>
                  <table className="w-full text-sm font-mono">
                    <tbody>
                      {product.specifications.map((spec, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-dark-bg' : 'bg-dark-surface'}>
                          <td className="py-2 px-3 text-dark-text-secondary border-r border-dark-border">{spec.name}</td>
                          <td className="py-2 px-3 text-white">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {selectedTab === 'prices' && (
                <div className="space-y-4">
                  <h3 className="font-tech text-white mb-3">All Available Prices</h3>
                  
                  <div className="space-y-3">
                    {sortedPrices.map((price, idx) => (
                      <div 
                        key={idx}
                        className={`
                          p-3 rounded-lg border transition-colors duration-200
                          ${idx === 0 
                            ? 'border-neon-blue bg-dark-surface' 
                            : 'border-dark-border bg-dark-bg hover:border-dark-hover hover:bg-dark-surface'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-tech text-white">{price.retailer}</span>
                          <div className="flex items-baseline">
                            <span className={`font-bold ${idx === 0 ? 'text-neon-blue' : 'text-white'}`}>
                              ₹{price.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                            {price.originalPrice && (
                              <span className="text-dark-text-secondary line-through ml-2 text-sm">
                                ₹{price.originalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2 text-xs font-mono">
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${price.inStock ? 'bg-neon-green' : 'bg-cyber-red'}`}></span>
                            <span className="text-dark-text-secondary">{price.inStock ? 'In Stock' : 'Out of Stock'}</span>
                          </div>
                          <div className="text-dark-text-secondary">
                            {price.shipping} {price.deliveryEstimate && `• ${price.deliveryEstimate}`}
                          </div>
                        </div>
                        
                        {idx === 0 && (
                          <div className="absolute -top-1 -right-1 origin-top-right rotate-[3deg] px-2 py-0.5 font-mono text-xxxs font-bold text-black bg-neon-green">
                            BEST DEAL
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedTab === 'history' && product.priceHistory && (
                <div className="space-y-4">
                  <h3 className="font-tech text-white mb-3">Price History</h3>
                  
                  <div className="h-60 bg-dark-bg border border-dark-border rounded-lg p-4 relative">
                    {/* Placeholder for a chart */}
                    <div className="absolute inset-0 flex items-center justify-center text-dark-text-secondary font-mono text-sm">
                      Interactive price history chart would display here
                    </div>
                    
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-dark-border"></div>
                    <div className="absolute left-0 top-0 h-full w-[1px] bg-dark-border"></div>
                  </div>
                  
                  <div className="text-sm text-dark-text-secondary font-mono">
                    <div className="flex justify-between mb-2">
                      <span>Lowest price:</span>
                      <span className="text-neon-green">
                        ₹{Math.min(...product.priceHistory.map(p => p.price)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Highest price:</span>
                      <span className="text-cyber-red">
                        ₹{Math.max(...product.priceHistory.map(p => p.price)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current trend:</span>
                      <span className="text-neon-blue">Stable</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Related products */}
        {product.relatedProducts && product.relatedProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="font-tech text-2xl mb-6 text-white">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {product.relatedProducts.map((related, idx) => (
                <div 
                  key={idx}
                  className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden hover:border-neon-blue transition-colors duration-200 cursor-pointer"
                  onClick={() => navigate(`/product/${related.id}`)}
                >
                  <div className="relative">
                    <img 
                      src={related.imageUrl} 
                      alt={related.name}
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 scanline opacity-30 pointer-events-none"></div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-tech text-white text-lg mb-2 truncate">{related.name}</h3>
                    <div className="text-neon-blue font-bold">
                      ₹{related.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CyberLayout>
  );
};

export default ProductDetailsPage;