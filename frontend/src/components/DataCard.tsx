import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, ArrowDown, Star, ShoppingBag, CheckCircle, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface ProductData {
  id?: string;
  name: string;
  image?: string;
  imageUrl?: string; // Alternative field name
  price: number | string;
  originalPrice?: number | string;
  discount?: string | number;
  seller?: string;
  vendor?: string; // Alternative field name
  retailer?: string; // Alternative field name
  sellerLogo?: string;
  retailerLogo?: string; // Alternative field name
  rating?: number | string;
  link?: string;
  url?: string; // Alternative field name
  isBestDeal?: boolean;
  isLowestPrice?: boolean;
}

interface DataCardProps {
  product: ProductData;
  index?: number;
  onSelect?: (product: ProductData) => void;
}

const DataCard: React.FC<DataCardProps> = ({ product, index, onSelect }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const animationDelay = `${index ? index * 100 : 0}ms`;
  
  // Generate a unique ID if none exists
  const productId = product.id || `product-${index}-${Date.now()}`;
  
  // Handle different field names with fallbacks
  const productName = product.name || 'Unknown Product';
  const productImage = product.image || product.imageUrl || 'https://via.placeholder.com/300?text=No+Image';
  const productPrice = typeof product.price === 'number' ? product.price : parseFloat(product.price?.toString().replace(/[^\d.]/g, '') || '0');
  const productOriginalPrice = product.originalPrice ? 
    (typeof product.originalPrice === 'number' ? 
      product.originalPrice : 
      parseFloat(product.originalPrice.toString().replace(/[^\d.]/g, '') || '0')
    ) : undefined;
  const productSeller = product.seller || product.vendor || product.retailer || 'Unknown Seller';
  const productSellerLogo = product.sellerLogo || product.retailerLogo || 'https://via.placeholder.com/150x50?text=Retailer';
  const productLink = product.link || product.url || '#';
  
  // Calculate discount if not provided
  const discount = product.discount ? 
    (typeof product.discount === 'number' ? 
      product.discount : 
      parseFloat(product.discount.toString().replace(/[^\d.]/g, '') || '0')
    ) : 
    (productOriginalPrice && productPrice ? 
      ((productOriginalPrice - productPrice) / productOriginalPrice * 100).toFixed(0) : 
      undefined);
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  // Handle card click to navigate to product details
  const handleCardClick = () => {
    const normalizedProduct = {
      id: productId,
      name: productName,
      image: productImage,
      imageUrl: productImage,
      price: productPrice,
      originalPrice: product.originalPrice,
      discount: product.discount,
      seller: productSeller,
      vendor: productSeller,
      retailer: productSeller,
      sellerLogo: productSellerLogo,
      retailerLogo: productSellerLogo,
      vendorLogo: productSellerLogo,
      rating: product.rating,
      link: productLink,
      url: productLink,
      isBestDeal: product.isBestDeal,
      isLowestPrice: product.isLowestPrice
    };
    
    // Save this specific product to localStorage before navigating
    localStorage.setItem(`product-${productId}`, JSON.stringify(normalizedProduct));
    
    // Also maintain a list of recently viewed products
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    
    // Add to recently viewed list without duplicates
    if (!recentlyViewed.some((p: ProductData) => p.id === productId)) {
      // Add to the beginning and limit to 10 items
      const updatedRecent = [normalizedProduct, ...recentlyViewed].slice(0, 10);
      localStorage.setItem('recentlyViewed', JSON.stringify(updatedRecent));
    }
    
    // Use React Router's state to pass the product data
    navigate(`/product/${productId}`, {
      state: { 
        product: normalizedProduct,
        fromDetails: true
      }
    });

    // Trigger onSelect callback if provided
    if (onSelect) {
      onSelect(normalizedProduct);
    }
  };
  
  // Prevent event propagation for buttons
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card 
      className={cn(
        'glassmorphism-panel-intense overflow-hidden transform transition-all duration-500 opacity-100 led-border-glow',
        'hover:translate-y-[-5px] cursor-pointer',
        'animate-fade-in'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      data-product-id={productId}
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
            src={productImage} 
            alt={productName} 
            className="w-full h-full object-contain p-4 transition-all duration-500"
            style={{ transform: isHovered ? 'scale(1.08)' : 'scale(1)' }}
            onError={(e) => {
              // Fallback if image fails to load
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=No+Image';
            }}
          />
          
          {/* Discount badge */}
          {discount && parseInt(discount.toString()) > 0 && (
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
              src={productSellerLogo} 
              alt={productSeller} 
              className="h-6 mr-2" 
              onError={(e) => {
                // Fallback if logo fails to load
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150x50?text=Retailer';
              }}
            />
            <span className="text-sm text-gray-400">{productSeller}</span>
          </div>
          
          {/* Product name */}
          <h3 className="font-medium mb-2 line-clamp-2" title={productName}>
            {productName}
          </h3>
          
          {/* Price section */}
          <div className="mt-auto">
            <div className="flex items-baseline">
              <span className="text-xl font-bold neon-text-blue">
                {formatPrice(productPrice)}
              </span>
              
              {productOriginalPrice && productOriginalPrice > productPrice && (
                <span className="ml-2 text-sm text-gray-400 line-through">
                  {formatPrice(productOriginalPrice)}
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
                      i < Math.floor(typeof product.rating === 'string' ? 
                        parseFloat(product.rating) : product.rating || 0) ? 
                        "text-amber-400 fill-amber-400" : "text-gray-600"
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
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
          >
            <span>{showDetails ? 'Hide' : 'Show'} details</span>
            <ArrowDown 
              className={cn("h-4 w-4 ml-1 transition-transform duration-300", showDetails ? 'rotate-180' : '')} 
            />
          </button>
          
          <a 
            href={productLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm flex items-center text-cyber-blue hover:text-cyber-purple transition-colors dual-tone-glow px-3 py-1 rounded-full"
            onClick={handleButtonClick}
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
            <div className="animate-fade-in py-2" onClick={handleButtonClick}>
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
                <span className="bg-cyber-dark/60 px-2 py-1 rounded-full">ID: {productId}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DataCard;
