import React, { useState, useEffect } from 'react';
import DataCard, { ProductData } from './DataCard';
import { toast } from 'sonner';

interface AnimatedGridProps {
  products: ProductData[];
  isLoading?: boolean;
  noResults?: boolean;
  onSelectProduct?: (product: ProductData) => void;
  error?: string | null;
}

const AnimatedGrid: React.FC<AnimatedGridProps> = ({ 
  products, 
  isLoading = false,
  noResults = false,
  onSelectProduct,
  error = null
}) => {
  const [normalizedProducts, setNormalizedProducts] = useState<ProductData[]>([]);
  const [hasRenderError, setHasRenderError] = useState(false);
  
  // Debug logging
  useEffect(() => {
    console.log('AnimatedGrid received products:', products);
    console.log('Products array type:', Array.isArray(products) ? 'Array' : typeof products);
    console.log('Products length:', Array.isArray(products) ? products.length : 'N/A');
    
    if (Array.isArray(products) && products.length > 0) {
      console.log('First product sample:', products[0]);
    }
  }, [products]);
  
  // Normalize products data
  useEffect(() => {
    if (!Array.isArray(products)) {
      console.error('Products is not an array:', products);
      setHasRenderError(true);
      return;
    }
    
    try {
      // Normalize and validate each product
      const normalized = products.map((product, index) => {
        // Generate ID if missing
        const id = product.id || `product-${index}-${Date.now()}`;
        
        // Ensure required fields exist
        const name = product.name || 'Unknown Product';
        const price = product.price || 0;
        
        // Handle different field names
        const imageUrl = product.image || product.imageUrl || 'https://via.placeholder.com/300?text=No+Image';
        const seller = product.seller || product.vendor || product.retailer || 'Unknown Seller';
        const sellerLogo = product.sellerLogo || product.retailerLogo || 'https://via.placeholder.com/150x50?text=Retailer';
        const productLink = product.link || product.url || '#';
        
        return {
          id,
          name,
          price,
          image: imageUrl,
          seller,
          sellerLogo,
          link: productLink,
          originalPrice: product.originalPrice,
          discount: product.discount,
          rating: product.rating,
          isBestDeal: product.isBestDeal,
          isLowestPrice: product.isLowestPrice
        };
      });
      
      setNormalizedProducts(normalized);
      setHasRenderError(false);
      
      // Log success
      console.log('Successfully normalized products:', normalized.length);
    } catch (err) {
      console.error('Error normalizing products:', err);
      setHasRenderError(true);
      toast.error('Error displaying products. Please try again.');
    }
  }, [products]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyber-blue"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">Error: {error}</p>
        <div className="inline-block p-5 bg-red-900/20 rounded-lg border border-red-700/50">
          <svg 
            className="w-12 h-12 mx-auto text-red-500 mb-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <p className="text-sm text-red-300">Something went wrong while fetching products</p>
        </div>
      </div>
    );
  }

  if (hasRenderError) {
    return (
      <div className="text-center py-16">
        <p className="text-amber-400 mb-4">Display Error</p>
        <div className="inline-block p-5 bg-amber-900/20 rounded-lg border border-amber-700/50">
          <svg 
            className="w-12 h-12 mx-auto text-amber-500 mb-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <p className="text-sm text-amber-300">There was a problem displaying the products</p>
          <p className="text-xs text-amber-400 mt-2">Products data received but couldn't be rendered properly</p>
        </div>
      </div>
    );
  }

  if (normalizedProducts.length === 0 || noResults) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">No results found</p>
        <div className="inline-block p-5 bg-gray-800/50 rounded-lg border border-gray-700">
          <svg 
            className="w-12 h-12 mx-auto text-gray-500 mb-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
          <p className="text-sm text-gray-500">Try adjusting your search or filter parameters</p>
          <p className="text-xs text-gray-600 mt-2">
            {Array.isArray(products) && products.length > 0 
              ? 'Products were found but could not be displayed properly' 
              : 'No products were found matching your search'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <div className="relative">
        {/* Background effects */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-cyber-blue/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-cyber-purple/5 rounded-full blur-3xl"></div>
        
        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-2 bg-gray-800/50 rounded text-xs text-gray-400">
            <p>Displaying {normalizedProducts.length} products</p>
          </div>
        )}
        
        {/* Products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {normalizedProducts.map((product, index) => (
            <DataCard 
              key={product.id || index} 
              product={product} 
              index={index}
              onSelect={onSelectProduct ? (p) => onSelectProduct(p) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnimatedGrid;
