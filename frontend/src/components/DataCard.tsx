
import React, { useState } from 'react';
import { ExternalLink, ArrowDown, Star, ShoppingBag, CheckCircle, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface ProductData {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  seller: string;
  sellerLogo: string;
  rating?: number;
  link: string;
  isBestDeal?: boolean;
  isLowestPrice?: boolean;
}

interface DataCardProps {
  product: ProductData;
  index: number;
}

const DataCard: React.FC<DataCardProps> = ({ product, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const animationDelay = `${index * 100}ms`;
  
  const discount = product.discount || 
    (product.originalPrice ? ((product.originalPrice - product.price) / product.originalPrice * 100).toFixed(0) : undefined);
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  return (
    <Card 
      className={cn(
        'glassmorphism-panel-intense overflow-hidden transform transition-all duration-500 opacity-0 led-border-glow',
        'hover:translate-y-[-5px]',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        animationName: 'fade-in-up', 
        animationDuration: '0.8s',
        animationDelay: animationDelay, 
        animationFillMode: 'forwards' 
      }}
    >
      {/* Highlight labels */}
      {product.isBestDeal && (
        <div className="absolute -right-10 top-6 transform rotate-45 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs px-10 py-1 z-10 shadow-lg font-cyber">
          BEST DEAL
        </div>
      )}
      
      {product.isLowestPrice && (
        <div className="absolute left-2 top-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs px-3 py-1 rounded-full z-10 flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          <span className="font-cyber">LOWEST PRICE</span>
        </div>
      )}
      
      {/* Card content */}
      <CardContent className="p-0 flex flex-col h-full">
        {/* Image section */}
        <div className="relative h-48 bg-gradient-to-br from-white/5 to-black/30 overflow-hidden group">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-contain p-4 transition-all duration-500"
            style={{ transform: isHovered ? 'scale(1.08)' : 'scale(1)' }}
          />
          
          {/* Discount badge */}
          {discount && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-red-500 text-white text-sm font-bold rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
              -{discount}%
            </div>
          )}
          
          {/* Hover overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-cyber-dark/70 via-transparent to-transparent opacity-0 transition-opacity duration-500",
            isHovered ? "opacity-100" : ""
          )}></div>
        </div>
        
        {/* Content section */}
        <div className="p-4 flex-1 flex flex-col bg-gradient-to-b from-transparent to-cyber-dark/20">
          {/* Seller logo */}
          <div className="mb-2 flex items-center">
            <img 
              src={product.sellerLogo} 
              alt={product.seller} 
              className="h-6 mr-2" 
            />
            <span className="text-sm text-gray-400">{product.seller}</span>
          </div>
          
          {/* Product name */}
          <h3 className="font-medium mb-2 line-clamp-2" title={product.name}>
            {product.name}
          </h3>
          
          {/* Price section */}
          <div className="mt-auto">
            <div className="flex items-baseline">
              <span className="text-xl font-bold neon-text-blue">
                {formatPrice(product.price)}
              </span>
              
              {product.originalPrice && (
                <span className="ml-2 text-sm text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            
            {/* Rating */}
            {product.rating && (
              <div className="mt-1 flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "h-3 w-3", 
                      i < Math.floor(product.rating!) ? "text-amber-400 fill-amber-400" : "text-gray-600"
                    )}
                  />
                ))}
                <span className="text-xs ml-1 text-gray-400">({product.rating})</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="border-t border-white/5 p-3 flex justify-between bg-gradient-to-r from-cyber-dark/30 to-cyber-dark/50">
          <button 
            className="text-sm text-gray-300 flex items-center hover:text-cyber-blue transition-colors dual-tone-glow px-3 py-1 rounded-full"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span>{showDetails ? 'Hide' : 'Show'} details</span>
            <ArrowDown 
              className={cn("h-4 w-4 ml-1 transition-transform duration-300", showDetails ? 'rotate-180' : '')} 
            />
          </button>
          
          <a 
            href={product.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm flex items-center text-cyber-blue hover:text-cyber-purple transition-colors dual-tone-glow px-3 py-1 rounded-full"
          >
            <span>View deal</span>
            <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </div>
        
        {/* Expandable details section */}
        <div 
          className={cn(
            "border-t border-white/5 p-4 bg-cyber-dark/80 text-sm overflow-hidden transition-all duration-500 ease-in-out",
            showDetails ? "max-h-96 opacity-100" : "max-h-0 opacity-0 p-0 border-t-0"
          )}
        >
          {showDetails && (
            <div className="animate-fade-in py-2">
              <h4 className="font-cyber text-cyber-pink mb-3 flex items-center">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Product Details
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center text-gray-300">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  <span>Available for immediate shipping</span>
                </div>
                
                <div className="flex items-center text-gray-300">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  <span>Free returns within 30 days</span>
                </div>
                
                <p className="text-gray-400 my-2 border-l-2 border-cyber-blue/30 pl-3">
                  This would display additional product information including specs, 
                  availability, and other useful comparison data.
                </p>
              </div>
              
              <div className="text-xs text-gray-400 mt-4 flex justify-between items-center pt-2 border-t border-white/5">
                <span>Last updated: {new Date().toLocaleDateString()}</span>
                <span className="bg-cyber-dark/60 px-2 py-1 rounded-full">ID: {product.id}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DataCard;
