import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Zap, BarChart3, Search, ShieldCheck, ExternalLink, Code, ChevronsRight, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { debounce } from 'lodash';
import { useLocation, useNavigate } from 'react-router-dom';

import GlitchHeader from '@/components/GlitchHeader';
import InputModule from '@/components/InputModule';
import AnimatedGrid from '@/components/AnimatedGrid';
import LoadingAnimation from '@/components/LoadingAnimation';
import Footer from '@/components/Footer';
import FeatureSection from '@/components/FeatureSection';
import { ProductData } from '@/components/DataCard';
import CyberButton from '@/components/CyberButton';
import FloatingStats from '@/components/FloatingStats';
import { cn } from '@/lib/utils';

// Define TypeScript interfaces for API responses
interface ApiProduct {
  id?: string;
  name?: string;
  title?: string;
  imageUrl?: string;
  image?: string;
  price?: string;
  originalPrice?: string;
  vendor?: string;
  retailer?: string;
  vendorLogo?: string;
  rating?: string | number;
  url?: string;
  link?: string;
  [key: string]: any; // Allow for additional properties
}

interface ApiResponse {
  success: boolean;
  data?: ApiProduct[];
  results?: ApiProduct[];
  products?: ApiProduct[];
  message?: string;
  scrapedRetailers?: string[];
  failedRetailers?: string[];
  count?: number;
  query?: string;
}

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [failedRetailers, setFailedRetailers] = useState<string[]>([]);
  const [scrapedRetailers, setScrapedRetailers] = useState<string[]>([]);
  const [query, setQuery] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState(false);
  
  const [visibleSections, setVisibleSections] = useState({
    hero: false,
    features: false,
    stats: false,
    code: false,
    api: false,
    cta: false,
  });

  // Reset state on fresh load - only if not coming back from product details
  useEffect(() => {
    // Don't reset if coming from product details page
    if (!(location.state && (location.state.fromDetails || location.state.preserveSearch))) {
      setSearchPerformed(false);
      setShowIntro(true);
      setProducts([]);
      setError(null);
      // Clear previous search results from localStorage
      localStorage.removeItem('searchResults');
      localStorage.removeItem('lastQuery');
    }
  }, [location.pathname]); // Only run when the path changes, not on every render

  // Effect to handle restoring search results when navigating back from product details
  useEffect(() => {
    // Check if user is returning from product details with the restoreResults flag
    if (location.state?.fromDetails && (location.state?.preserveSearch || location.state?.restoreResults)) {
      setIsRestoring(true);
      
      // First check localStorage (more persistent)
      const localResults = localStorage.getItem('searchResults');
      const localQuery = localStorage.getItem('searchQuery') || localStorage.getItem('lastSearchQuery');
      
      // Then check sessionStorage (more recent)
      const sessionResults = sessionStorage.getItem('searchResults') || sessionStorage.getItem('lastSearchResults');
      const sessionQuery = sessionStorage.getItem('searchQuery') || sessionStorage.getItem('lastSearchQuery');
      
      // Use the most recent data available
      const storedResults = sessionResults || localResults;
      const storedQuery = sessionQuery || localQuery;
      
      if (storedResults && storedQuery) {
        try {
          const parsedResults = JSON.parse(storedResults);
          setProducts(parsedResults);
          setQuery(storedQuery);
          setLastQuery(storedQuery);
          setSearchPerformed(true);
          setShowIntro(false);
          
          // Show toast with more informative message
          toast({
            title: "Search Results Restored",
            description: `Continuing where you left off with "${storedQuery}"`,
            variant: "success",
            duration: 3000,
            className: "cyber-toast",
          });
          
          // If there's a product ID in the state, scroll to that product after a small delay
          if (location.state.productId) {
            setTimeout(() => {
              const productCard = document.querySelector(`[data-product-id="${location.state.productId}"]`);
              if (productCard) {
                productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                productCard.classList.add('highlight-product');
                setTimeout(() => productCard.classList.remove('highlight-product'), 2000);
              }
            }, 300);
          }
        } catch (error) {
          console.error("Error restoring search results:", error);
          toast({
            title: "Restoration Error",
            description: "Couldn't restore your previous search results",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "No Previous Search",
          description: "No previous search results to restore",
          variant: "default",
        });
      }
      
      // Turn off restoring state after a brief delay to show the animation
      setTimeout(() => {
        setIsRestoring(false);
      }, 1000);
    }
  }, [location.state, toast]);

  // Effect to restore state from sessionStorage
  useEffect(() => {
    const storedQuery = sessionStorage.getItem('lastSearchQuery');
    const storedProducts = sessionStorage.getItem('lastSearchResults');
    const storedSearchPerformed = sessionStorage.getItem('searchPerformed');
    
    if (storedQuery && storedProducts && storedSearchPerformed === 'true') {
      setIsRestoring(true);
      setQuery(storedQuery);
      setLastQuery(storedQuery);
      setProducts(JSON.parse(storedProducts));
      setSearchPerformed(true);
      
      // Small delay to show loading indicator briefly for better UX
      setTimeout(() => {
        setIsRestoring(false);
      }, 600);
    }
  }, []);

  // Clear localStorage on page unload
  useEffect(() => {
    const clear = () => localStorage.removeItem('searchResults');
    window.addEventListener('beforeunload', clear);
    return () => window.removeEventListener('beforeunload', clear);
  }, []);

  // Fade-in effect for sections using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id as keyof typeof visibleSections;
            if (sectionId && visibleSections.hasOwnProperty(sectionId)) {
              setVisibleSections((prev) => ({ ...prev, [sectionId]: true }));
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => observer.observe(section));

    // Set hero section visible immediately
    setVisibleSections(prev => ({ ...prev, hero: true }));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  // Helper function to normalize and format product data
  const formatProducts = (rawProducts: ApiProduct[] | any): ProductData[] => {
    // Make sure rawProducts is an array
    if (!rawProducts) return [];
    if (!Array.isArray(rawProducts)) {
      console.error('Expected rawProducts to be an array, but got:', typeof rawProducts, rawProducts);
      return [];
    }
    if (rawProducts.length === 0) return [];
    
    const formattedProducts = rawProducts.map((item: ApiProduct) => {
      // Normalize price by removing currency symbols and commas
      const normalizedPrice = item.price?.replace(/[₹$€£,]/g, '') || '0';
      const normalizedOriginalPrice = item.originalPrice?.replace(/[₹$€£,]/g, '') || undefined;
      
      // Ensure we have a valid URL for the seller logo
      const vendorName = (item.vendor || item.retailer || 'unknown').toLowerCase().replace(/\s/g, '');
      const sellerLogo = item.vendorLogo || 
        (vendorName !== 'unknown' ? `https://logo.clearbit.com/${vendorName}.com` : 'https://via.placeholder.com/50x20?text=Logo');
      
      // Create a more consistent ID based on product name and seller if no ID exists
      const productId = item.id || 
        (item.name && (item.vendor || item.retailer)) ? 
          `${(item.name || item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)}-${vendorName}` :
          Math.random().toString(36).substring(2, 15);
      
      return {
        id: productId,
        name: item.name || item.title || 'Unknown Product',
        image: item.imageUrl || item.image || 'https://via.placeholder.com/300?text=No+Image',
        price: parseFloat(normalizedPrice) || 0,
        originalPrice: normalizedOriginalPrice ? parseFloat(normalizedOriginalPrice) : undefined,
        seller: item.vendor || item.retailer || 'Unknown',
        sellerLogo,
        rating: typeof item.rating === 'string' ? parseFloat(item.rating) : (item.rating || undefined),
        link: item.url || item.link || '#',
        isBestDeal: false,
        isLowestPrice: false
      };
    });

    // Calculate lowest price and best deal flags
    if (formattedProducts.length > 0) {
      // Find lowest price
      const lowestPrice = Math.min(...formattedProducts.map(p => p.price));
      const lowestPriceProducts = formattedProducts.filter(p => p.price === lowestPrice);
      
      // Mark lowest price product
      if (lowestPriceProducts.length === 1) {
        lowestPriceProducts[0].isLowestPrice = true;
      } else if (lowestPriceProducts.length > 1) {
        // If multiple, use rating as tiebreaker
        const withRatings = lowestPriceProducts.filter(p => p.rating);
        if (withRatings.length > 0) {
          const highestRated = withRatings.reduce((prev, current) => 
            (prev.rating || 0) > (current.rating || 0) ? prev : current
          );
          highestRated.isLowestPrice = true;
        } else {
          // If no ratings, just mark the first one
          lowestPriceProducts[0].isLowestPrice = true;
        }
      }
      
      // Find best deal (balancing price and rating)
      const withRatings = formattedProducts.filter(p => p.rating !== undefined);
      if (withRatings.length > 0) {
        const highestPrice = Math.max(...formattedProducts.map(p => p.price));
        const priceDiff = highestPrice - lowestPrice;
        
        // Calculate a score for each product (70% price, 30% rating)
        const productsWithScores = withRatings.map(p => {
          const priceScore = priceDiff > 0 ? ((highestPrice - p.price) / priceDiff) * 0.7 : 0.5;
          const ratingScore = ((p.rating || 0) / 5) * 0.3;
          return { ...p, score: priceScore + ratingScore };
        });
        
        // Find product with highest score
        const bestDeal = productsWithScores.reduce((prev, current) => 
          (prev.score || 0) > (current.score || 0) ? prev : current
        );
        
        // Mark the best deal
        const bestProductIndex = formattedProducts.findIndex(p => p.id === bestDeal.id);
        if (bestProductIndex !== -1) {
          formattedProducts[bestProductIndex].isBestDeal = true;
        }
      } else {
        // If no ratings, use lowest price as best deal
        const lowestPriceProductIndex = formattedProducts.findIndex(p => p.isLowestPrice);
        if (lowestPriceProductIndex !== -1) {
          formattedProducts[lowestPriceProductIndex].isBestDeal = true;
        }
      }
    }
    
    return formattedProducts;
  };

  // Helper function to restore search results from storage
  const restoreFromStorage = () => {
    const storedQuery = localStorage.getItem('lastSearchQuery');
    const storedProducts = localStorage.getItem('searchResults');

    if (storedQuery && storedProducts) {
      try {
        const parsedResults = JSON.parse(storedProducts);
        setProducts(parsedResults);
        setQuery(storedQuery);
        setLastQuery(storedQuery);
        setSearchPerformed(true);
        setShowIntro(false);
        toast.success(`Restored previous search for "${storedQuery}"`);
      } catch (error) {
        console.error('Error restoring search:', error);
        toast.error('Could not restore previous search');
      }
    } else {
      // If no stored search, just reset to intro state
      resetSearch();
    }
  };

  // Search mutation with React Query
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      setLastQuery(query);
      localStorage.setItem('lastSearchQuery', query);
      
      try {
        const response = await api.post<ApiResponse>('/api/price-comparison/search', { query });
        console.log('RAW API RESPONSE:', response.data);
        return response.data;
      } catch (error: any) {
        console.error('Search error:', error);
        throw new Error(error?.response?.data?.message || error?.message || 'Unknown error occurred');
      }
    },
    onMutate: () => {
      setIsLoading(true);
      setShowIntro(false);
      setProducts([]);
      setSearchPerformed(true);
      setError(null);
    },
    onSuccess: (data) => {
      if (data.success) {
        // Determine where the products array is located in the response
        const rawProducts = data.data || data.results || data.products || [];
        
        if (rawProducts.length === 0) {
          toast.error("No products found matching your search");
          return;
        }
        
        // Format the products using our helper function
        const formattedProducts = formatProducts(rawProducts);
        
        // Save results and metadata to both localStorage and sessionStorage
        try {
          // Save to localStorage for persistence across sessions
          localStorage.setItem('searchResults', JSON.stringify(formattedProducts));
          localStorage.setItem('lastSearchQuery', lastQuery);
          localStorage.setItem('lastSearchTimestamp', Date.now().toString());
          localStorage.setItem('failedRetailers', JSON.stringify(data.failedRetailers || []));
          localStorage.setItem('scrapedRetailers', JSON.stringify(data.scrapedRetailers || []));
          
          // Save to sessionStorage for current session
          sessionStorage.setItem('lastSearchResults', JSON.stringify(formattedProducts));
          sessionStorage.setItem('lastSearchQuery', lastQuery);
          sessionStorage.setItem('searchPerformed', 'true');
          
          console.log('Saved search results to storage:', formattedProducts.length);
        } catch (storageError) {
          console.error('Error saving to storage:', storageError);
        }
        
        // Update state
        setProducts(formattedProducts);
        setFailedRetailers(data.failedRetailers || []);
        setScrapedRetailers(data.scrapedRetailers || []);
        
        toast.success(`Found ${formattedProducts.length} products for "${lastQuery}"`);
      } else {
        setError(data.message || 'Failed to search for products');
        toast.error(data.message || 'Failed to search for products');
      }
    },
    onError: (error) => {
      console.error('Error searching for products:', error);
      setError(error.message || 'Error connecting to the search service. Please try again.');
      toast.error('Error connecting to the search service');
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  // Image search mutation with React Query
  const imageSearchMutation = useMutation({
    mutationFn: async (payload: { imageData: string, extractedKeywords?: string }) => {
      try {
        // Convert base64 image data to a Blob
        const imageBlob = await fetch(payload.imageData).then(r => r.blob());
        
        // Create FormData and append image and keywords
        const formData = new FormData();
        formData.append('image', imageBlob, 'image.jpg');
        
        if (payload.extractedKeywords) {
          formData.append('extractedKeywords', payload.extractedKeywords);
        }
        
        const response = await api.post<ApiResponse>(
          '/api/price-comparison/image-search', 
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        console.log('RAW IMAGE SEARCH RESPONSE:', response.data);
        return response.data;
      } catch (error: any) {
        console.error('Image search error:', error);
        throw new Error(error?.response?.data?.message || error?.message || 'Unknown error occurred');
      }
    },
    onMutate: () => {
      setIsLoading(true);
      setShowIntro(false);
      setProducts([]);
      setSearchPerformed(true);
      setError(null);
    },
    onSuccess: (data) => {
      if (data.success) {
        // Get products from the correct field in the response
        const rawProducts = data.products || data.data || data.results || [];
        
        if (rawProducts.length === 0) {
          toast.error("No products found matching your image");
          return;
        }
        
        // Format the products using our helper function
        const formattedProducts = formatProducts(rawProducts);
        
        // Save to both localStorage and sessionStorage
        try {
          // Save to localStorage for persistence across sessions
          localStorage.setItem('searchResults', JSON.stringify(formattedProducts));
          localStorage.setItem('lastSearchQuery', 'Image search');
          localStorage.setItem('lastSearchTimestamp', Date.now().toString());
          localStorage.setItem('searchType', 'image');
          localStorage.setItem('failedRetailers', JSON.stringify(data.failedRetailers || []));
          localStorage.setItem('scrapedRetailers', JSON.stringify(data.scrapedRetailers || []));
          
          // Save to sessionStorage for current session
          sessionStorage.setItem('lastSearchResults', JSON.stringify(formattedProducts));
          sessionStorage.setItem('lastSearchQuery', 'Image search');
          sessionStorage.setItem('searchPerformed', 'true');
          sessionStorage.setItem('searchType', 'image');
          
          console.log('Saved image search results to storage:', formattedProducts.length);
        } catch (storageError) {
          console.error('Error saving image search to storage:', storageError);
        }
        
        // Update state
        setProducts(formattedProducts);
        setFailedRetailers(data.failedRetailers || []);
        setScrapedRetailers(data.scrapedRetailers || []);
        
        toast.success(`Found ${formattedProducts.length} products matching your image`);
      } else {
        setError(data.message || 'Failed to process image search');
        toast.error(data.message || 'Failed to process image search');
      }
    },
    onError: (error) => {
      console.error('Error in image search:', error);
      setError('Error processing image. Please try again or use text search instead.');
      toast.error('Error processing image search');
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      searchMutation.mutate(query);
    }, 800),
    // Added searchMutation to the dependency array to avoid issues with stale closures
    [searchMutation]
  );

  // Load saved results on initial render
  useEffect(() => {
    // Check URL parameters for search query
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    
    // Check if there are saved results in localStorage
    const savedResults = localStorage.getItem('searchResults');
    const lastQuery = localStorage.getItem('lastSearchQuery');
    
    if (queryParam) {
      // If URL has a query parameter, perform that search
      console.log('Found query parameter in URL:', queryParam);
      setLastQuery(queryParam);
      debouncedSearch(queryParam);
    } else if (savedResults && lastQuery) {
      // Otherwise load from localStorage if available
      try {
        const parsedResults = JSON.parse(savedResults);
        setProducts(parsedResults);
        setLastQuery(lastQuery);
        setShowIntro(false);
        setSearchPerformed(true);
        console.log('Loaded saved results:', parsedResults.length);
        
        // Update URL to reflect the loaded search
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('q', lastQuery);
        window.history.replaceState({}, '', newUrl.toString());
      } catch (error) {
        console.error('Error parsing saved results:', error);
      }
    }
  }, []);

  // Handler for text search
  const performSearch = (query: string) => {
    if (query.trim().length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }
    
    // Update URL with search query
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('q', query);
    window.history.pushState({}, '', newUrl.toString());
    
    debouncedSearch(query);
  };

  // Handler for image search
  const handleImageSearch = (imageData: string, extractedKeywords?: string) => {
    // Update URL to indicate image search
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('mode', 'image');
    if (extractedKeywords) {
      newUrl.searchParams.set('keywords', extractedKeywords);
    }
    window.history.pushState({}, '', newUrl.toString());
    
    imageSearchMutation.mutate({ imageData, extractedKeywords });
  };

  // Handler for product selection
  const handleProductSelect = (product: ProductData) => {
    // Save current search state
    sessionStorage.setItem("lastSearchQuery", lastQuery);
    sessionStorage.setItem("lastSearchResults", JSON.stringify(products));
    sessionStorage.setItem("searchPerformed", "true");
    
    // Navigate to product details
    navigate(`/product/${product.id}`, {
      state: { 
        product,
        fromSearch: true,
        query: lastQuery
      }
    });
  };

  // Handler to reset search and go back to initial state
  const resetSearch = () => {
    // Clear URL parameters
    const newUrl = new URL(window.location.href);
    newUrl.search = '';
    window.history.pushState({}, '', newUrl.toString());
    
    // Reset state
    setShowIntro(true);
    setSearchPerformed(false);
    setProducts([]);
    setLastQuery('');
    setQuery(''); // Also reset query input
    setError(null);
    
    // Don't clear localStorage to allow returning to previous search
    toast.info('Search reset.');
  };
  
  // Button handler to scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Features data
  const features = [
    {
      icon: <Search className="h-8 w-8 text-cyber-blue" />,
      title: "Multimodal Search",
      description: "Find products using text or upload an image. Our AI recognizes products and fetches the best deals across markets."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-cyber-purple" />,
      title: "Real-time Pricing",
      description: "Get live price comparisons from major retailers and local markets. Always find the best deal available right now."
    },
    {
      icon: <Zap className="h-8 w-8 text-cyber-pink" />,
      title: "AI-Powered Analysis",
      description: "Our system doesn't just compare prices. It analyzes deals, discounts, and value to recommend the smartest purchase."
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-cyber-green" />,
      title: "Reliable Results",
      description: "Advanced scraping technology ensures accurate data, with AI fallback systems to guarantee reliable information."
    }
  ];

  // Handle search form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLastQuery(query);
    setSearchPerformed(true);
    setShowIntro(false);
    setError(null);

    try {
      const response = await fetch('/api/price-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      setProducts(data);
      
      // Save search results and query to sessionStorage for state restoration
      sessionStorage.setItem("lastQuery", query);
      sessionStorage.setItem("searchResults", JSON.stringify(data));
      
      console.log('Search results saved to sessionStorage', data.length);
    } catch (err) {
      console.error('Error during search:', err);
      setError('Failed to perform search. Please try again.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Background elements removed as they're now in the global layout */}
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-8 relative z-10 flex-grow">
        
        {/* Hero particles removed as they are now part of the global layout */}
        
        {/* Restoration loading indicator - enhanced with animation and message */}
        {isRestoring && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900/90 border border-cyber-blue p-6 rounded-lg shadow-lg text-center max-w-md">
              <LoadingAnimation size="lg" />
              <h3 className="text-cyber-blue mt-4 text-xl font-bold">Restoring Your Search Results</h3>
              <p className="text-gray-300 mt-2">Continuing where you left off...</p>
            </div>
          </div>
        )}
        
        {/* Hero section */}
        <section 
          id="hero" 
          className={cn(
            "relative z-10 transition-opacity duration-1000 bg-transparent",
            visibleSections.hero ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex-grow container mx-auto px-4 pb-8 relative z-10">
            <GlitchHeader
              title="CUMPAIR"
              subtitle="The future of price comparison is here"
            />

            <div className={cn(
              "max-w-4xl mx-auto mb-8 text-center transition-all duration-1000",
              "transform opacity-0 translate-y-8",
              { "opacity-100 translate-y-0": visibleSections.hero }
            )}>
              <h2 className="text-xl md:text-2xl text-cyber-blue mb-6">
                Compare prices across multiple markets with cyberpunk style
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto mb-8">
                Upload a product image or enter text to instantly compare prices from local stores and online hypermarkets. 
                Powered by advanced AI to ensure you always get the best deal possible.
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <CyberButton 
                  onClick={() => scrollToSection('search-section')}
                  glowColor="purple"
                  icon={<ArrowRight className="h-4 w-4" />}
                >
                  Start Comparing
                </CyberButton>
                
                <CyberButton 
                  variant="outline"
                  glowColor="blue"
                  onClick={() => scrollToSection('features')}
                >
                  Learn More
                </CyberButton>
              </div>
            </div>

            {/* Floating stats section */}
            <section 
              id="stats" 
              className={cn(
                "transition-all duration-1000 transform opacity-0 translate-y-8",
                { "opacity-100 translate-y-0 delay-300": visibleSections.hero }
              )}
            >
              <FloatingStats />
            </section>

            <div id="search-section" className="pt-8">
              <InputModule 
                onSearch={performSearch}
                onImageSearch={handleImageSearch} 
              />
            </div>
          </div>
        </section>

        {isLoading || isRestoring ? (
          <LoadingAnimation />
        ) : (
          <>
            {!searchPerformed ? (
              <section id="features" className="py-16 relative">
                <div className="circuit-pattern absolute inset-0 opacity-20"></div>
                
                <div className="container mx-auto px-4 relative z-10">
                  <h2 className={cn(
                    "text-2xl md:text-3xl font-cyber text-center neon-text-blue mb-12",
                    "transition-all duration-1000 delay-300",
                    "opacity-0 translate-y-8",
                    { "opacity-100 translate-y-0": visibleSections.features }
                  )}>
                    Why Choose CUMPAIR?
                  </h2>
                  
                  <div className={cn(
                    "grid grid-cols-1 md:grid-cols-2 gap-8",
                    "transition-all duration-1000",
                    "opacity-0 transform translate-y-8",
                    { "opacity-100 translate-y-0": visibleSections.features }
                  )}>
                    {features.map((feature, index) => (
                      <FeatureSection
                        key={index}
                        icon={feature.icon}
                        title={feature.title}
                        description={feature.description}
                        className={`animation-delay-${(index + 1) * 100}`}
                      />
                    ))}
                  </div>

                  {/* Code preview section */}
                  <section 
                    id="code" 
                    className={cn(
                      "mt-24 max-w-4xl mx-auto glass-panel p-1 rounded-lg overflow-hidden",
                      "transition-all duration-1000 transform",
                      "opacity-0 translate-y-8",
                      { "opacity-100 translate-y-0": visibleSections.code }
                    )}
                  >
                    <div className="bg-cyber-dark/90 p-4 rounded-lg overflow-hidden w-full">
                      <div className="flex items-center mb-2 border-b border-white/10 pb-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="ml-3 text-sm text-gray-400">Live Price Comparison</span>
                      </div>
                      <pre className="text-xs md:text-sm text-left overflow-auto p-2 font-mono text-gray-300 cyber-lines">
                        <code>{`// CUMPAIR price analysis
import { compareAllPrices } from "@cumpair/core";

const result = await compareAllPrices({
  productName: "iPhone 13 Pro",
  sources: ["amazon", "flipkart", "reliance", "local"],
  region: "IN",
  includeDelivery: true
});

console.log(\`Best deal: \${result.bestDeal.seller} - \${result.bestDeal.price}\`);
console.log(\`Lowest price: \${result.lowestPrice.seller} - \${result.lowestPrice.price}\`);`}</code>
                      </pre>
                    </div>
                  </section>

                  {/* API Integration Section */}
                  <section
                    id="api"
                    className={cn(
                      "mt-24 max-w-4xl mx-auto",
                      "transition-all duration-1000 transform",
                      "opacity-0 translate-y-8",
                      { "opacity-100 translate-y-0": visibleSections.api }
                    )}
                  >
                    <h2 className="text-2xl md:text-3xl font-cyber text-center neon-text-blue mb-8">
                      Powered by Advanced Tech
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="glassmorphism-panel p-6 rounded-lg relative overflow-hidden group">
                        <div className="data-flow absolute left-0 top-0 h-full"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-cyber-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10">
                          <div className="flex items-center mb-4">
                            <Code className="h-8 w-8 text-cyber-purple mr-3" />
                            <h3 className="text-lg md:text-xl font-cyber text-cyber-purple">
                              AI-Powered Scraping
                            </h3>
                          </div>
                          <p className="text-gray-400 text-sm md:text-base mb-4">
                            Our system uses advanced AI models to extract accurate pricing data from any website, even those with complex anti-scraping measures.
                          </p>
                          <div className="flex items-center text-cyber-blue text-sm">
                            <span>Technical details</span>
                            <ChevronsRight className="h-4 w-4 ml-1" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="glassmorphism-panel p-6 rounded-lg relative overflow-hidden group">
                        <div className="data-flow absolute left-0 top-0 h-full"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-cyber-pink/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10">
                          <div className="flex items-center mb-4">
                            <ExternalLink className="h-8 w-8 text-cyber-green mr-3" />
                            <h3 className="text-lg md:text-xl font-cyber text-cyber-green">
                              Multimodal API
                            </h3>
                          </div>
                          <p className="text-gray-400 text-sm md:text-base mb-4">
                            Our API connects to over 50 sources including local stores, hypermarkets, and exclusive deals not available to the public.
                          </p>
                          <div className="flex items-center text-cyber-blue text-sm">
                            <span>API documentation</span>
                            <ChevronsRight className="h-4 w-4 ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Final CTA */}
                  <section
                    id="cta"
                    className={cn(
                      "mt-24 max-w-3xl mx-auto text-center mb-20",
                      "transition-all duration-1000 transform",
                      "opacity-0 translate-y-8",
                      { "opacity-100 translate-y-0": visibleSections.cta }
                    )}
                  >
                    <div className="neon-border-glow p-8 rounded-lg bg-cyber-dark/30">
                      <h2 className="text-3xl md:text-4xl font-cyber mb-4 animate-neon-pulse">
                        Ready to find the best deals?
                      </h2>
                      <p className="text-gray-300 mb-8 max-w-xl mx-auto">
                        Start searching now and discover prices from across the web in seconds. Upload a photo or type what you're looking for.
                      </p>
                      <CyberButton 
                        onClick={() => scrollToSection('search-section')}
                        glowColor="pink"
                        className="px-8 py-4"
                      >
                        Compare Prices Now
                      </CyberButton>
                    </div>
                  </section>
                </div>
              </section>
            ) : (
              <div className="container mx-auto px-4 mt-6">
                {isRestoring && (
                  <div className="w-full flex flex-col items-center justify-center p-8 mb-6 bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-lg border border-cyan-500/50 shadow-lg shadow-cyan-500/20">
                    <LoadingAnimation size="medium" />
                    <p className="mt-4 text-lg text-cyber-blue animate-pulse">Restoring your previous search results...</p>
                    <p className="text-sm text-gray-400 mt-2">Picking up right where you left off</p>
                  </div>
                )}

                {isRestoring ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <LoadingAnimation size="md" />
                    <p className="text-cyan-400 mt-4 text-center animate-pulse">
                      Restoring your previous search results...
                    </p>
                  </div>
                ) : isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <LoadingAnimation />
                    <p className="text-cyan-400 mt-4">Searching across multiple retailers...</p>
                    {/* Rest of loading content */}
                  </div>
                ) : error ? (
                  <div className="max-w-xl mx-auto bg-red-900/20 border border-red-500 p-4 rounded-lg text-center">
                    <h3 className="text-xl font-bold text-red-400 mb-2">Error</h3>
                    <p className="text-red-200">{error}</p>
                    <CyberButton
                      variant="outline"
                      size="sm"
                      glowColor="red"
                      className="mt-4"
                      onClick={() => {
                        resetSearch();
                        // Force remount so our initial-useEffect re-fires
                        navigate('/', { replace: true });
                      }}
                    >
                      Back to Search
                    </CyberButton>
                  </div>
                ) : products.length > 0 ? (
                  <div className="pt-4 pb-10">
                    <h2 className="text-2xl font-bold mb-4 text-cyan-100">
                      {products.length} Results for "{lastQuery}"
                    </h2>
                    
                    <AnimatedGrid 
                      products={products}
                      onSelectProduct={handleProductSelect}
                    />
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
                    <p className="mt-4 text-xl text-gray-300">No products found. Try a different search term.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <Footer />
      </main>
    </div>
  );
};

export default Index;