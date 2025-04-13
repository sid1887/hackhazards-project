import React, { useState } from 'react';
import { ExternalLink, Info, Tag } from 'lucide-react';

// ProductData shape for documentation purposes:
// {
//   id: string
//   name: string
//   price: string
//   originalPrice?: string
//   discount?: string
//   vendor: string
//   vendorLogo: string
//   rating?: string
//   inStock: boolean
//   isBestDeal?: boolean
//   isLowestPrice?: boolean
//   imageUrl?: string
//   url: string
// }

const DataCard = ({ product, delay = 0 }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="glass-card neon-border group hover:scale-[1.02] transition-all duration-300"
      style={{ animationDelay: `${delay * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        {/* Best deal badge */}
        {product.isBestDeal && (
          <div className="absolute -top-2 -right-2 bg-cyber-purple px-3 py-1 rounded-full text-xs font-bold z-10 shadow-lg shadow-cyber-purple/20">
            BEST DEAL
          </div>
        )}
        
        {/* Lowest price badge */}
        {product.isLowestPrice && !product.isBestDeal && (
          <div className="absolute -top-2 -right-2 bg-cyber-green px-3 py-1 rounded-full text-xs font-bold z-10 shadow-lg shadow-cyber-green/20">
            LOWEST PRICE
          </div>
        )}
        
        <div className="flex flex-col h-full">
          {/* Vendor header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <img 
                src={product.vendorLogo} 
                alt={product.vendor} 
                className="h-6 w-6 mr-2 rounded-sm"
              />
              <span className="text-sm font-medium text-gray-200">{product.vendor}</span>
            </div>
            {product.rating && (
              <div className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-md flex items-center">
                ★ {product.rating}
              </div>
            )}
          </div>
          
          {/* Product image */}
          <div className={`relative aspect-video mb-4 overflow-hidden rounded-md bg-black/30 transition-all duration-300 ${isHovered ? 'shadow-inner shadow-cyber-blue/30' : ''}`}>
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className={`w-full h-full object-contain p-2 transition-transform duration-500 ${isHovered ? 'scale-105' : ''}`}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Info className="h-12 w-12 text-gray-500 opacity-50" />
              </div>
            )}
          </div>
          
          {/* Product name */}
          <h3 className="font-medium text-white mb-2 line-clamp-2 min-h-[48px] group-hover:text-cyber-blue transition-colors">
            {product.name}
          </h3>
          
          {/* Price */}
          <div className="mt-auto">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-white group-hover:text-cyber-blue transition-colors">{product.price}</span>
              {product.originalPrice && (
                <span className="text-sm text-gray-400 line-through">{product.originalPrice}</span>
              )}
              {product.discount && (
                <span className="text-xs text-cyber-green bg-cyber-green/10 px-2 py-0.5 rounded">
                  {product.discount}
                </span>
              )}
            </div>
            
            {/* Stock status */}
            <div className="text-xs mb-4">
              {product.inStock ? (
                <span className="text-green-400">In Stock</span>
              ) : (
                <span className="text-red-400">Out of Stock</span>
              )}
            </div>
            
            {/* Button */}
            <a 
              href={product.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`cyber-button w-full flex items-center justify-center transition-all duration-300 ${isHovered ? 'shadow-md shadow-cyber-blue/30' : ''}`}
            >
              View Deal <ExternalLink className={`ml-2 h-4 w-4 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataCard;