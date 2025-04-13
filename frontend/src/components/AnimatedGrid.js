import React from 'react';
import DataCard from './DataCard';
import { LayoutGrid, AlertTriangle, Loader2, ScanSearch } from 'lucide-react';

const AnimatedGrid = ({ products, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in glass-card">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-cyber-blue animate-spin mb-4" />
          <div className="absolute inset-0 blur-xl bg-cyber-blue opacity-20 animate-pulse"></div>
        </div>
        <div className="space-y-2 text-center">
          <p className="text-cyber-blue animate-pulse text-lg font-bold">Scanning markets...</p>
          <p className="text-gray-400 text-sm">Comparing prices across multiple retailers</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="glass-card w-full max-w-xl mx-auto text-center py-10 animate-fade-in">
        <div className="relative mb-6">
          <AlertTriangle className="mx-auto h-16 w-16 text-cyber-orange opacity-70" />
          <div className="absolute inset-0 blur-xl bg-cyber-orange opacity-10"></div>
        </div>
        <h3 className="text-xl font-medium text-white mb-2">No results found</h3>
        <p className="text-gray-400 mb-4">
          Try searching for another product or uploading a different image
        </p>
        <div className="h-px w-full max-w-md mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent my-4"></div>
        <div className="text-sm text-gray-500">
          Tip: For better results, try using specific product names or clear images
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product, index) => (
          <DataCard 
            key={product.id} 
            product={product} 
            delay={index} 
          />
        ))}
      </div>
    </div>
  );
};

export default AnimatedGrid;