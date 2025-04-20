import React from 'react';
import DataCard, { ProductData } from './DataCard';

interface AnimatedGridProps {
  products: ProductData[];
  isLoading?: boolean;
  noResults?: boolean;
  onSelectProduct?: (product: ProductData) => void;
}

const AnimatedGrid: React.FC<AnimatedGridProps> = ({ 
  products, 
  isLoading = false,
  noResults = false,
  onSelectProduct
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyber-blue"></div>
      </div>
    );
  }

  if (products.length === 0 || noResults) {
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
        
        {/* Products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {products.map((product, index) => (
            <DataCard 
              key={product.id || index} 
              product={product} 
              index={index}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnimatedGrid;
