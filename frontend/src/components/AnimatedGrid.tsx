import React from 'react';
import DataCard from './DataCard';

interface Product {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  vendor: string;
  vendorLogo: string;
  rating?: number;
  inStock: boolean;
  isLowestPrice?: boolean;
  isBestDeal?: boolean;
  imageUrl: string;
  url: string;
}

interface AnimatedGridProps {
  products: Product[];
  isLoading: boolean;
  noResults?: boolean;
}

const AnimatedGrid: React.FC<AnimatedGridProps> = ({ 
  products, 
  isLoading,
  noResults = false
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="cyber-spinner" aria-label="Loading..."></div>
      </div>
    );
  }

  if (products.length === 0 || noResults) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">No results found</p>
        <div className="inline-block cyber-box p-5 bg-gray-800/50">
          <svg className="w-12 h-12 mx-auto text-gray-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm text-gray-500">Try adjusting your search or filter parameters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product, index) => {
        // Convert any numeric ratings to strings for the DataCard component
        const adaptedProduct = {
          ...product,
          rating: product.rating !== undefined ? product.rating.toString() : undefined
        };
        
        return (
          <DataCard 
            key={product.id} 
            product={adaptedProduct} 
            index={index} 
          />
        );
      })}
    </div>
  );
};

export default AnimatedGrid;
