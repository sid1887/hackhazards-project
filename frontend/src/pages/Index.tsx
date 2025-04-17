
import React, { useState, useEffect } from 'react';
import { ArrowRight, Zap, BarChart3, Search, ShieldCheck, ExternalLink, Code, ChevronsRight } from 'lucide-react';
import GlitchHeader from '@/components/GlitchHeader';
import InputModule from '@/components/InputModule';
import AnimatedGrid from '@/components/AnimatedGrid';
import LoadingAnimation from '@/components/LoadingAnimation';
import Footer from '@/components/Footer';
import FeatureSection from '@/components/FeatureSection';
import { ProductData } from '@/components/DataCard';
import CyberBackground from '@/components/CyberBackground';
import HeroParticles from '@/components/HeroParticles';
import CyberButton from '@/components/CyberButton';
import FloatingStats from '@/components/FloatingStats';
import { cn } from '@/lib/utils';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [visibleSections, setVisibleSections] = useState({
    hero: false,
    features: false,
    stats: false,
    code: false,
    api: false,
    cta: false,
  });

  // Fade-in effect for sections using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id as keyof typeof visibleSections;
            if (sectionId) {
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

  // Sample data for demonstration
  const sampleProducts: ProductData[] = [
    {
      id: '1',
      name: 'iPhone 13 Pro Max (256GB) - Graphite',
      image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400',
      price: 109900,
      originalPrice: 129900,
      seller: 'Amazon',
      sellerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      rating: 4.5,
      link: 'https://amazon.in',
      isBestDeal: true
    },
    {
      id: '2',
      name: 'iPhone 13 Pro Max (256GB) - Graphite',
      price: 112000,
      originalPrice: 129900,
      image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400',
      seller: 'Flipkart',
      sellerLogo: 'https://logo.clearbit.com/flipkart.com',
      rating: 4.3,
      link: 'https://flipkart.com'
    },
    {
      id: '3',
      name: 'iPhone 13 Pro Max (256GB) - Graphite',
      price: 107990,
      originalPrice: 129900,
      image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400',
      seller: 'Reliance Digital',
      sellerLogo: 'https://logo.clearbit.com/reliancedigital.in',
      rating: 4.2,
      link: 'https://reliancedigital.in',
      isLowestPrice: true
    },
    {
      id: '4',
      name: 'Samsung Galaxy S21 Ultra 5G (256GB) - Phantom Black',
      price: 105999,
      originalPrice: 115999,
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
      seller: 'Amazon',
      sellerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      rating: 4.4,
      link: 'https://amazon.in',
      isBestDeal: true
    },
    {
      id: '5',
      name: 'Samsung Galaxy S21 Ultra 5G (256GB) - Phantom Black',
      price: 104990,
      originalPrice: 115999,
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
      seller: 'Croma',
      sellerLogo: 'https://logo.clearbit.com/croma.com',
      rating: 4.1,
      link: 'https://croma.com',
      isLowestPrice: true
    },
    {
      id: '6',
      name: 'Samsung Galaxy S21 Ultra 5G (256GB) - Phantom Black',
      price: 107999,
      originalPrice: 115999,
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
      seller: 'Flipkart',
      sellerLogo: 'https://logo.clearbit.com/flipkart.com',
      rating: 4.3,
      link: 'https://flipkart.com'
    }
  ];

  // Simulate loading and fetching products
  const simulateSearch = (query?: string) => {
    setIsLoading(true);
    setShowIntro(false);
    setProducts([]);
    setSearchPerformed(true);

    // Simulate API delay
    setTimeout(() => {
      setProducts(sampleProducts);
      setIsLoading(false);
    }, 2000);
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

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Background effects */}
      <CyberBackground />
      <div className="scanlines"></div>
      
      <section id="hero" className="relative">
        <HeroParticles />

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
                onClick={() => document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' })}
                glowColor="purple"
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Start Comparing
              </CyberButton>
              
              <CyberButton 
                variant="outline"
                glowColor="blue"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
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
            <InputModule onSearch={simulateSearch} />
          </div>
        </div>
      </section>

      {isLoading ? (
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
                      onClick={() => document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' })}
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
            <AnimatedGrid products={products} />
          )}
        </>
      )}

      <Footer />
    </div>
  );
};

export default Index;
