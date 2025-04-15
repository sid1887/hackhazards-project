import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Button } from './components/glitch-ui/button';
import { Input } from './components/glitch-ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './components/glitch-ui/card';
import { Skeleton } from './components/glitch-ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './components/glitch-ui/alert';
import { useToast } from './components/glitch-ui/use-toast';
import { Toaster } from './components/glitch-ui/toaster';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList, NavigationMenuLink } from './components/glitch-ui/navigation-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/glitch-ui/tabs';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './components/glitch-ui/hover-card';
import { Progress } from './components/glitch-ui/progress';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './components/glitch-ui/drawer';
import { Badge } from './components/glitch-ui/badge';
import CyberLayout from './components/CyberLayout';
import DataCard from './components/DataCard';
import InputModule from './components/InputModule';
import FeatureSection from './components/FeatureSection';
import FloatingStats from './components/FloatingStats';
import Footer from './components/Footer';
import HeroParticles from './components/HeroParticles';
import LoadingAnimation from './components/LoadingAnimation';
import AnimatedGrid from './components/AnimatedGrid';
import { Search, Zap, ShoppingCart, TrendingUp } from 'lucide-react';
import './App.css';

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

interface ApiResponse {
  success: boolean;
  message?: string;
  results?: any[];
  data?: any[];
}

const App: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const { toast } = useToast();

  // Handle search submission
  const handleSearch = async (searchQuery: string): Promise<void> => {
    if (!searchQuery.trim()) return;
    
    setQuery(searchQuery);
    setLoading(true);
    setHasSearched(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/price-comparison/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
        }),
      });

      const data: ApiResponse = await response.json();
      console.log('API Response:', data);
      
      if (!data.success) {
        toast({
          title: 'Error',
          description: data.message || 'Failed to fetch price comparison data',
          variant: 'destructive'
        });
        throw new Error(data.message || 'Failed to fetch price comparison data');
      }

      // Transform API results
      const formattedResults = transformApiResults(data, searchQuery);
      console.log('Formatted Results:', formattedResults);
      setResults(formattedResults);
    } catch (error) {
      console.error('Error fetching price comparison:', error);
      // Fallback to mock data
      const mockResults = generateMockResults(searchQuery);
      setResults(mockResults);
    } finally {
      setLoading(false);
    }
  };

  // Transform API results to expected format
  const transformApiResults = (data: ApiResponse, query: string): Product[] => {
    const resultsArray = data.results || data.data;
    
    if (!resultsArray || !Array.isArray(resultsArray)) {
      console.error('No valid results array found in API response:', data);
      return [];
    }
    
    return resultsArray.map((result: any, index: number) => {
      return {
        id: result.id || `id-${Math.random().toString(36).substr(2, 9)}`,
        name: result.title || result.name || query,
        price: typeof result.price === 'string' ? result.price : `₹${result.price || 0}`,
        originalPrice: result.originalPrice,
        discount: result.discount,
        vendor: result.retailer || result.marketplace || 'Unknown Retailer',
        vendorLogo: result.vendorLogo || `https://via.placeholder.com/32x32?text=${encodeURIComponent((result.retailer || 'R')[0])}`,
        rating: result.rating,
        inStock: result.inStock !== undefined ? result.inStock : true,
        isLowestPrice: index === 0,
        isBestDeal: index === 0,
        imageUrl: result.image || result.imageUrl || `https://via.placeholder.com/300x300?text=${encodeURIComponent(result.retailer || 'Product')}`,
        url: result.link || result.url || `#${result.id || index}`
      };
    });
  };

  // Generate mock results for development/demo
  const generateMockResults = (query: string): Product[] => {
    return [
      {
        id: '1',
        name: `${query} - Premium Model`,
        price: '₹8,999',
        originalPrice: '₹10,999',
        discount: '18% OFF',
        vendor: 'Amazon',
        vendorLogo: 'https://logo.clearbit.com/amazon.com',
        inStock: true,
        isBestDeal: true,
        imageUrl: 'https://via.placeholder.com/300x300?text=Amazon',
        url: '#'
      },
      {
        id: '2',
        name: `${query} - Standard Version`,
        price: '₹7,499',
        originalPrice: '₹8,499',
        discount: '12% OFF',
        vendor: 'Flipkart',
        vendorLogo: 'https://logo.clearbit.com/flipkart.com',
        inStock: true,
        isLowestPrice: true,
        imageUrl: 'https://via.placeholder.com/300x300?text=Flipkart',
        url: '#'
      },
      {
        id: '3',
        name: `${query} - Basic Model`,
        price: '₹9,999',
        vendor: 'Croma',
        vendorLogo: 'https://logo.clearbit.com/croma.com',
        inStock: false,
        imageUrl: 'https://via.placeholder.com/300x300?text=Croma',
        url: '#'
      }
    ];
  };

  return (
    <CyberLayout
      title="CUMPAIR"
      subtitle="AI-POWERED PRICE COMPARISON ACROSS MULTIPLE RETAILERS"
      background="grid"
    >
      <NavigationMenu className="relative bg-gray-800/80 backdrop-blur-sm border-b border-cyan-400/20 p-4 mb-8">
        <NavigationMenuList className="flex justify-center gap-8">
          <NavigationMenuItem>
            <NavigationMenuLink className="text-cyan-300 hover:text-cyan-400 transition-colors" href="/">
              Home
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink className="text-cyan-300 hover:text-cyan-400 transition-colors" href="/trending">
              Trending
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink className="text-cyan-300 hover:text-cyan-400 transition-colors" href="/deals">
              Best Deals
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      
      <HeroParticles />
      <main className="container mx-auto p-4">
        <InputModule onSearch={handleSearch} isLoading={loading} />
        <FloatingStats />
        
        {loading ? (
          <LoadingAnimation />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <FeatureSection
              icon={<Search className="w-8 h-8 text-cyber-blue" />}
              title="Smart Search"
              description="Advanced AI-powered search across multiple retailers"
            />
            <FeatureSection
              icon={<Zap className="w-8 h-8 text-cyber-purple" />}
              title="Real-time Prices"
              description="Live price tracking and comparison"
            />
            <FeatureSection
              icon={<ShoppingCart className="w-8 h-8 text-cyber-pink" />}
              title="Best Deals"
              description="Find the lowest prices and best offers"
            />
            <FeatureSection
              icon={<TrendingUp className="w-8 h-8 text-cyber-orange" />}
              title="Price History"
              description="Track price trends and fluctuations"
            />
          </div>
        )}

        {/* Results */}
        {hasSearched && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Price Comparison Results</h2>
            
            <Tabs defaultValue="all" className="w-full max-w-2xl mx-auto mb-8">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 border border-cyber-blue/20">
                <TabsTrigger value="all" className="data-[state=active]:bg-cyber-purple/20">All Results</TabsTrigger>
                <TabsTrigger value="instock" className="data-[state=active]:bg-cyber-purple/20">In Stock</TabsTrigger>
                <TabsTrigger value="deals" className="data-[state=active]:bg-cyber-purple/20">Best Deals</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="hover:border-cyan-400/40 transition-all">
                        <CardHeader className="flex-row items-center space-y-0 p-4">
                          <Skeleton className="h-6 w-24" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.map((product, index) => (
                      <DataCard key={product.id} product={product} index={index} />
                    ))}
                  </div>
                ) : null}
              </TabsContent>
              <TabsContent value="instock">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.filter(product => product.inStock).map(product => (
                    <HoverCard key={product.id}>
                      <HoverCardTrigger asChild>
                        <Card className="hover:border-cyan-400/40 transition-all cursor-pointer">
                          <CardHeader className="flex-row items-center space-y-0 p-4">
                            <img src={product.vendorLogo} alt={product.vendor} className="h-6 mr-2" />
                            <span className="text-muted-foreground">{product.vendor}</span>
                            {product.isLowestPrice && (
                              <Badge variant="secondary" className="ml-auto bg-cyber-purple text-white">
                                Best Price
                              </Badge>
                            )}
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <CardTitle>{product.name}</CardTitle>
                            <div className="flex items-baseline">
                              <span className="text-xl font-bold text-primary">{product.price}</span>
                              {product.originalPrice && (
                                <span className="ml-2 text-sm text-muted-foreground line-through">
                                  {product.originalPrice}
                                </span>
                              )}
                            </div>
                            {product.discount && (
                              <div className="mt-1 text-green-400 text-sm">{product.discount}</div>
                            )}
                          </CardContent>
                          <CardFooter className="p-4 pt-0">
                            <a 
                              href={product.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View Details
                            </a>
                          </CardFooter>
                        </Card>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 bg-gray-800/95 border-cyber-blue/30">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-cyber-blue">{product.vendor} Details</h4>
                          <div className="text-xs space-y-1">
                            <p>Stock Status: {product.inStock ? 'In Stock' : 'Out of Stock'}</p>
                            {product.rating && <p>Rating: {product.rating}/5</p>}
                            <p className="text-cyber-purple">Click card to view on retailer's site</p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="deals">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.filter(product => product.discount).map(product => (
                    <HoverCard key={product.id}>
                      <HoverCardTrigger asChild>
                        <Card className="hover:border-cyan-400/40 transition-all cursor-pointer">
                          <CardHeader className="flex-row items-center space-y-0 p-4">
                            <img src={product.vendorLogo} alt={product.vendor} className="h-6 mr-2" />
                            <span className="text-muted-foreground">{product.vendor}</span>
                            {product.isLowestPrice && (
                              <Badge variant="secondary" className="ml-auto bg-cyber-purple text-white">
                                Best Price
                              </Badge>
                            )}
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <CardTitle>{product.name}</CardTitle>
                            <div className="flex items-baseline">
                              <span className="text-xl font-bold text-primary">{product.price}</span>
                              {product.originalPrice && (
                                <span className="ml-2 text-sm text-muted-foreground line-through">
                                  {product.originalPrice}
                                </span>
                              )}
                            </div>
                            {product.discount && (
                              <div className="mt-1 text-green-400 text-sm">{product.discount}</div>
                            )}
                          </CardContent>
                          <CardFooter className="p-4 pt-0">
                            <a 
                              href={product.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View Details
                            </a>
                          </CardFooter>
                        </Card>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 bg-gray-800/95 border-cyber-blue/30">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-cyber-blue">{product.vendor} Details</h4>
                          <div className="text-xs space-y-1">
                            <p>Stock Status: {product.inStock ? 'In Stock' : 'Out of Stock'}</p>
                            {product.rating && <p>Rating: {product.rating}/5</p>}
                            <p className="text-cyber-purple">Click card to view on retailer's site</p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
            <AnimatedGrid products={results} isLoading={loading} />
          </div>
        )}
      </main>
      <Toaster />
      <Footer />
    </CyberLayout>
  );
};

export default App;