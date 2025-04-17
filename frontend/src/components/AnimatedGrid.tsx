
import React from 'react';
import DataCard, { ProductData } from './DataCard';

interface AnimatedGridProps {
  products: ProductData[];
  isLoading?: boolean;
}

const AnimatedGrid: React.FC<AnimatedGridProps> = ({ products, isLoading }) => {
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
              key={product.id} 
              product={product} 
              index={index}
            />
          ))}
        </div>
        
        {/* Empty state */}
        {products.length === 0 && !isLoading && (
          <div className="min-h-[300px] w-full flex flex-col items-center justify-center text-center py-12">
            <div className="mb-4">
              <svg 
                className="mx-auto h-16 w-16 text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="1" 
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" 
                />
              </svg>
            </div>
            <h3 className="text-xl font-cyber text-cyber-blue mb-1">No products to compare yet</h3>
            <p className="text-gray-400 max-w-md">
              Search for a product by name or upload an image to see price comparisons across multiple stores
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimatedGrid;
