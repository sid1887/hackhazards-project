import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import LoadingAnimation from '@/components/LoadingAnimation';
import { ArrowLeft, ExternalLink, Heart, ChevronDown, ChevronUp, ShoppingCart, AlertCircle } from 'lucide-react';
import CyberButton from '@/components/CyberButton';
import { toast } from 'sonner';

interface ProductSpec {
  name: string;
  value: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  title?: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  vendor?: string;
  retailer?: string;
  vendorLogo?: string;
  rating?: string;
  inStock?: boolean;
  imageUrl?: string;
  image?: string;
  url?: string;
  link?: string;
  features?: string[];
  specifications?: ProductSpec[] | Record<string, string>;
  description?: string;
}

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const productFromRoute = location.state?.product || null;

  const [product, setProduct] = useState<ProductDetail | null>(productFromRoute);
  const [loading, setLoading] = useState<boolean>(!productFromRoute);
  const [error, setError] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductDetail[]>([]);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showAllSpecs, setShowAllSpecs] = useState(false);

  useEffect(() => {
    if (!productFromRoute) {
      const fetchProductDetails = async () => {
        try {
          setLoading(true);

          const productFromStorage = localStorage.getItem(`product-${id}`);
          let foundProduct = productFromStorage ? JSON.parse(productFromStorage) : null;

          if (!foundProduct) {
            const cachedProducts = JSON.parse(localStorage.getItem('searchResults') || '[]');
            foundProduct = cachedProducts.find((p: ProductDetail) => p.id === id);
          }

          if (foundProduct) {
            setProduct(foundProduct);

            try {
              const response = await axios.post('/api/price-comparison/details', {
                product: foundProduct,
              });

              if (response.data.success) {
                setProduct(response.data.data);

                try {
                  const relatedResponse = await axios.post('/api/price-comparison/search', {
                    query: response.data.data.name.split(' ').slice(0, 3).join(' '),
                  });

                  if (relatedResponse.data.success) {
                    setRelatedProducts(
                      relatedResponse.data.data.filter((p: ProductDetail) => p.id !== id).slice(0, 4)
                    );
                  }
                } catch (err) {
                  console.error('Error fetching related products:', err);
                }
              }
            } catch (err) {
              console.error('Error fetching detailed product info:', err);
            }
          } else {
            const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
            const fromRecentlyViewed = recentlyViewed.find((p: ProductDetail) => p.id === id);

            if (fromRecentlyViewed) {
              setProduct(fromRecentlyViewed);
            } else {
              navigate('/');
              setError('Product not found');
            }
          }
        } catch (err) {
          console.error('Error fetching product details:', err);
          setError('Failed to load product details. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      fetchProductDetails();
    } else {
      const fetchRelatedProducts = async () => {
        try {
          const relatedResponse = await axios.post('/api/price-comparison/search', {
            query: productFromRoute.name.split(' ').slice(0, 3).join(' '),
          });

          if (relatedResponse.data.success) {
            setRelatedProducts(
              relatedResponse.data.data.filter((p: ProductDetail) => p.id !== id).slice(0, 4)
            );
          }
        } catch (err) {
          console.error('Error fetching related products:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchRelatedProducts();
    }
  }, [id, navigate, productFromRoute]);

  // Improve product caching for better navigation experience
  useEffect(() => {
    // Cache the current product details for smoother navigation
    if (product) {
      // Save to localStorage for faster retrieval when navigating back to this product
      localStorage.setItem(`product-${product.id}`, JSON.stringify(product));
      
      // Update recently viewed products list
      const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      
      // Remove this product if it's already in the list to avoid duplicates
      const filteredRecent = recentlyViewed.filter((p: ProductDetail) => p.id !== product.id);
      
      // Add the current product to the front of the list
      filteredRecent.unshift(product);
      
      // Keep only the last 10 products
      const updatedRecent = filteredRecent.slice(0, 10);
      
      localStorage.setItem('recentlyViewed', JSON.stringify(updatedRecent));
    }
  }, [product]);

  const handleBuyNow = () => {
    if (!product) return;

    const productUrl = product.url || product.link;

    if (productUrl && productUrl !== '#') {
      try {
        axios.post('/api/analytics/track-outbound', {
          productId: product.id,
          vendor: product.vendor || product.retailer,
          url: productUrl,
        });
      } catch (err) {
        console.error('Failed to log outbound click:', err);
      }

      window.open(productUrl, '_blank');
    } else {
      toast.error('Product link unavailable');
    }
  };

  // Enhanced back button function to better handle state preservation
  const handleBackToResults = () => {
    // Navigate back to search results with proper state flags
    navigate('/', { 
      state: { 
        fromDetails: true, 
        preserveSearch: true,
        productId: product?.productId || product?.id, // Pass product ID for scroll position restoration
        timestamp: Date.now() // Add timestamp to ensure state change is detected
      } 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingAnimation />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-6 bg-red-900/20 border-red-500">
          <h2 className="text-xl font-bold text-red-300">Error</h2>
          <p className="text-red-200">{error || 'Product not found'}</p>
          <Button className="mt-4 bg-primary hover:bg-primary/80" onClick={() => navigate('/')}>
            Back to Search
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-4">
        <CyberButton
          variant="outline"
          size="sm"
          onClick={handleBackToResults}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Results
        </CyberButton>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex justify-center items-center">
            <img
              src={product.imageUrl || product.image}
              alt={product.name}
              className="max-h-[400px] object-contain rounded-lg border border-cyan-500/30 bg-black/40 p-4"
            />
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-cyan-100">{product.name}</h1>

            <div className="flex flex-col space-y-2">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-cyan-400">{product.price}</span>
                {product.originalPrice && (
                  <span className="ml-2 text-lg text-gray-400 line-through">{product.originalPrice}</span>
                )}
                {product.discount && (
                  <span className="ml-3 px-2 py-1 text-sm bg-green-500 text-black rounded">
                    {product.discount}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-gray-300">Sold by:</span>
                <span className="flex items-center">
                  {product.vendorLogo ? (
                    <img
                      src={product.vendorLogo}
                      alt={product.vendor || product.retailer || 'Retailer'}
                      className="h-6 mr-2"
                    />
                  ) : null}
                  <span className="font-medium text-white">{product.vendor || product.retailer}</span>
                </span>
              </div>

              {product.rating && product.rating !== 'N/A' && (
                <div className="flex items-center">
                  <span className="text-yellow-400">★</span>
                  <span className="ml-1 text-white">{product.rating}</span>
                </div>
              )}

              <Button
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-lg py-6"
                onClick={handleBuyNow}
              >
                BUY NOW
              </Button>
            </div>

            {product.features && product.features.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xl font-bold text-cyan-200 mb-2">Key Features</h2>
                <ul className="list-disc pl-5 space-y-1 text-gray-200">
                  {product.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {product.specifications &&
          (Object.keys(product.specifications).length > 0 ||
            (Array.isArray(product.specifications) && product.specifications.length > 0)) && (
            <Card className="mt-8 p-6 bg-black/40 border-cyan-600/30">
              <h2 className="text-xl font-bold text-cyan-200 mb-4">Specifications</h2>

              {Array.isArray(product.specifications) ? (
                <ul className="list-disc pl-5 space-y-1 text-gray-200">
                  {product.specifications.map((spec, index) => (
                    <li key={index}>
                      {typeof spec === 'object' && spec.name ? `${spec.name}: ${spec.value}` : String(spec)}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="font-medium text-cyan-300 w-1/3">{key}:</span>
                      <span className="text-gray-200 w-2/3">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-cyan-200 mb-4">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((relatedProduct) => (
                <Card
                  key={relatedProduct.id}
                  className="bg-black/40 border-cyan-600/20 hover:border-cyan-400 transition-all cursor-pointer"
                  onClick={() => navigate(`/product/${relatedProduct.id}`)}
                >
                  <div className="p-4 flex flex-col h-full">
                    <div className="h-40 flex items-center justify-center mb-4">
                      <img
                        src={relatedProduct.imageUrl || relatedProduct.image}
                        alt={relatedProduct.name}
                        className="max-h-full object-contain"
                      />
                    </div>
                    <h3 className="text-sm text-white font-medium line-clamp-2">{relatedProduct.name}</h3>
                    <div className="mt-auto pt-4">
                      <span className="text-lg font-bold text-cyan-400">{relatedProduct.price}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;