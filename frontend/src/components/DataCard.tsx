
import React, { useState } from 'react';
import { ExternalLink, ArrowDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ProductData {
  id: string;
  name: string;
  imageUrl?: string;
  image?: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  vendor?: string;
  seller?: string;
  vendorLogo?: string;
  sellerLogo?: string;
  rating?: string;
  url?: string;
  link?: string;
  isBestDeal?: boolean;
  isLowestPrice?: boolean;
  inStock?: boolean;
}

interface DataCardProps {
  product: ProductData;
  index: number;
}

const DataCard: React.FC<DataCardProps> = ({ product, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const animationDelay = `${index * 100}ms`;
  
  // Use the discount directly if provided, otherwise don't calculate it
  const discount = product.discount;
  
  // No need to format price as it's already formatted

  return (
    <div 
      className={cn(
        'cyber-container rounded-lg overflow-hidden transform transition-all duration-500 opacity-0',
        'hover:translate-y-[-5px] hover:shadow-[0_0_30px_rgba(14,165,233,0.3)]',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        animationName: 'fade-in-up', 
        animationDuration: '0.6s',
        animationDelay: animationDelay, 
        animationFillMode: 'forwards' 
      }}
    >
      {/* Highlight labels */}
      {product.isBestDeal && (
        <div className="absolute -right-8 top-6 transform rotate-45 bg-cyber-green text-white text-xs px-8 py-1 z-10 shadow-lg">
          BEST DEAL
        </div>
      )}
      
      {product.isLowestPrice && (
        <div className="absolute left-2 top-2 bg-cyber-orange text-white text-xs px-2 py-1 rounded-md z-10">
          LOWEST PRICE
        </div>
      )}
      
      {/* Card content */}
      <div className="flex flex-col h-full">
        {/* Image section */}
        <div className="relative h-48 bg-white/5 overflow-hidden">
          <img 
            src={product.imageUrl || product.image} 
            alt={product.name} 
            className="w-full h-full object-contain p-4 transition-transform duration-300"
            style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
          />
          
          {/* Discount badge */}
          {discount && (
            <div className="absolute top-2 right-2 bg-cyber-pink text-white text-sm font-bold rounded-full w-12 h-12 flex items-center justify-center">
              {discount}
            </div>
          )}
        </div>
        
        {/* Content section */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Seller logo */}
          <div className="mb-2 flex items-center">
            <img 
              src={product.vendorLogo || product.sellerLogo} 
              alt={product.vendor || product.seller || 'Retailer'} 
              className="h-6 mr-2" 
            />
            <span className="text-sm text-gray-400">{product.vendor || product.seller || 'Retailer'}</span>
          </div>
          
          {/* Product name */}
          <h3 className="font-medium mb-2 line-clamp-2" title={product.name}>
            {product.name}
          </h3>
          
          {/* Price section */}
          <div className="mt-auto">
            <div className="flex items-baseline">
              <span className="text-xl font-bold neon-text-blue">
                {product.price}
              </span>
              
              {product.originalPrice && (
                <span className="ml-2 text-sm text-gray-400 line-through">
                  {product.originalPrice}
                </span>
              )}
            </div>
            
            {/* Rating */}
            {product.rating && (
              <div className="mt-1 flex">
                <span className="text-cyber-orange mr-1">★</span>
                <span className="text-xs text-gray-400">{product.rating}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="border-t border-white/5 p-3 flex justify-between">
          <button 
            className="text-sm text-gray-300 flex items-center hover:text-cyber-blue transition-colors"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span>{showDetails ? 'Hide' : 'Show'} details</span>
            <ArrowDown 
              className={`h-4 w-4 ml-1 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
            />
          </button>
          
          <a 
            href={product.url || product.link || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm flex items-center text-cyber-blue hover:text-cyber-purple transition-colors"
          >
            <span>Open site</span>
            <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </div>
        
        {/* Expandable details section */}
        {showDetails && (
          <div className="border-t border-white/5 p-4 bg-cyber-dark/60 text-sm animate-fade-in">
            <h4 className="font-cyber text-cyber-pink mb-2">Product Details</h4>
            <p className="text-gray-300 mb-2">
              This would display additional product information fetched from the scraper,
              including specs, availability, and other useful comparison data.
            </p>
            <div className="text-xs text-gray-400 mt-3">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataCard;
