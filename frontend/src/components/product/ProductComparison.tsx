import React, { useState } from 'react';
import { groqApi } from '../../lib/api';
import { Loader2, Info, Check, AlertCircle, TrendingUp, BarChart4 } from 'lucide-react';
import LoadingAnimation from '../LoadingAnimation';

type ProductData = {
  name: string;
  price: string | number;
  retailer: string;
  url?: string;
  imageUrl?: string;
  description?: string;
  specs?: Record<string, string>;
  features?: string[];
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
};

const ProductComparison: React.FC<{
  productData?: ProductData[];
  onComparisonComplete?: (summaryData: any) => void;
}> = ({ productData = [], onComparisonComplete }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("summary");
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

  // Generate comparison summary using Groq API
  const handleGenerateSummary = async () => {
    if (!productData || productData.length < 2) {
      setError('Need at least 2 products to compare');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await groqApi.summarizeAndCompare(productData);
      
      if (response?.success && response?.data) {
        setSummary(response.data);
        
        if (onComparisonComplete) {
          onComparisonComplete(response.data);
        }
      } else {
        throw new Error('Invalid response from comparison service');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate product comparison');
      console.error('Error generating comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset the data
  const handleReset = () => {
    setSummary(null);
    setError(null);
  };

  if (!productData || productData.length === 0) {
    return (
      <div className="bg-cyber-dark/50 border border-white/10 rounded-lg p-6">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-white">No Products to Compare</h3>
          <p className="text-gray-400">
            Search for products or add products to your comparison list to see an AI-powered comparison.
          </p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "summary":
        return (
          <div className="bg-cyber-dark/50 border border-white/10 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">Summary Analysis</h3>
            <div className="prose max-w-none text-white">
              {summary?.overview && <p>{summary.overview}</p>}
              
              {summary?.keyDifferences && (
                <div className="mt-4">
                  <h4 className="text-lg font-medium mb-2 text-white">Key Differences</h4>
                  <ul className="space-y-1 list-disc pl-5">
                    {summary.keyDifferences.map((diff: string, idx: number) => (
                      <li key={idx}>{diff}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary?.priceAnalysis && (
                <div className="mt-4">
                  <h4 className="text-lg font-medium mb-2 flex items-center text-white">
                    <BarChart4 className="mr-2 h-5 w-5" />
                    Price Analysis
                  </h4>
                  <p>{summary.priceAnalysis}</p>
                </div>
              )}

              {summary?.valueProposition && (
                <div className="mt-4">
                  <h4 className="text-lg font-medium mb-2 flex items-center text-white">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Value Proposition
                  </h4>
                  <p>{summary.valueProposition}</p>
                </div>
              )}
            </div>
          </div>
        );

      case "comparison":
        return (
          <div className="bg-cyber-dark/50 border border-white/10 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">Feature Comparison</h3>
            
            {summary?.featureComparison && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/20">
                  <thead>
                    <tr>
                      <th className="py-3 px-4 text-left bg-cyber-blue/20 font-medium text-white">Feature</th>
                      {productData.map((product, idx) => (
                        <th key={idx} className="py-3 px-4 text-left bg-cyber-blue/20 font-medium text-white">
                          {product.retailer}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {Object.entries(summary.featureComparison).map(([feature, values]: [string, any], idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-4 font-medium text-white">{feature}</td>
                        {productData.map((product, productIdx) => {
                          const value = values[product.retailer];
                          return (
                            <td key={productIdx} className="py-3 px-4 text-white">
                              {typeof value === 'boolean' ? (
                                value ? (
                                  <Check className="h-5 w-5 text-green-500" />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )
                              ) : (
                                value || <span className="text-gray-400">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!summary?.featureComparison && (
              <p className="text-gray-400">
                No detailed feature comparison available.
              </p>
            )}
          </div>
        );

      case "recommendation":
        return (
          <div className="bg-cyber-dark/50 border border-white/10 rounded-lg p-6">
            <div className="flex items-start mb-6">
              <div className="bg-blue-500/10 p-3 rounded-full mr-4">
                <Info className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">AI Recommendation</h3>
                <p className="text-gray-400">
                  Based on comprehensive analysis of features, price, and value
                </p>
              </div>
            </div>
            
            {summary?.recommendation ? (
              <div className="prose max-w-none text-white">
                <p className="text-lg">{summary.recommendation}</p>
                
                {summary.buyingAdvice && (
                  <div className="mt-6 border border-white/10 rounded-lg overflow-hidden">
                    <button
                      className="w-full bg-cyber-dark/80 hover:bg-cyber-dark/50 py-3 px-4 text-left flex justify-between items-center text-white"
                      onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                    >
                      Additional Buying Advice
                      {isAccordionOpen ? (
                        <span className="ml-2">▲</span>
                      ) : (
                        <span className="ml-2">▼</span>
                      )}
                    </button>
                    {isAccordionOpen && (
                      <div className="p-4 bg-cyber-dark/30">
                        <p>{summary.buyingAdvice}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400">
                No recommendation available. Try regenerating the comparison.
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">AI Product Comparison</h2>
        <div className="flex space-x-2">
          <button
            className="py-2 px-4 bg-cyber-dark hover:bg-cyber-dark/70 text-white rounded-lg border border-white/10 transition-colors"
            onClick={handleReset}
            disabled={loading || !summary}
          >
            Reset
          </button>
          <button
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            onClick={handleGenerateSummary}
            disabled={loading || productData.length < 2}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                Analyzing...
              </>
            ) : (
              'Compare with AI'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingAnimation />
          <p className="text-center text-gray-400 mt-4">
            Analyzing product data with AI...
          </p>
        </div>
      ) : summary ? (
        <div className="w-full">
          <div className="grid w-full grid-cols-3 bg-cyber-dark/30 rounded-lg mb-4">
            <button
              className={`py-2 px-4 rounded-lg text-center transition-colors ${
                activeTab === "summary" ? "bg-blue-500 text-white" : "text-white/70 hover:text-white"
              }`}
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </button>
            <button
              className={`py-2 px-4 rounded-lg text-center transition-colors ${
                activeTab === "comparison" ? "bg-blue-500 text-white" : "text-white/70 hover:text-white"
              }`}
              onClick={() => setActiveTab("comparison")}
            >
              Comparison Table
            </button>
            <button
              className={`py-2 px-4 rounded-lg text-center transition-colors ${
                activeTab === "recommendation" ? "bg-blue-500 text-white" : "text-white/70 hover:text-white"
              }`}
              onClick={() => setActiveTab("recommendation")}
            >
              Recommendation
            </button>
          </div>
          
          {renderTabContent()}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productData.map((product, idx) => (
            <div key={idx} className="p-4 border border-white/10 bg-cyber-dark/50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">{product.retailer}</h4>
                  <p className="text-lg font-bold mt-1 text-white">
                    {typeof product.price === 'string' ? product.price : `₹${product.price}`}
                  </p>
                  {product.name && (
                    <p className="text-sm mt-1 text-gray-400">{product.name}</p>
                  )}
                </div>
                {product.imageUrl && (
                  <div className="h-16 w-16 relative">
                    <img
                      src={product.imageUrl}
                      alt={product.name || 'Product'}
                      className="object-contain h-full w-full"
                    />
                  </div>
                )}
              </div>
              {product.url && (
                <div className="mt-3">
                  <button
                    className="w-full py-1 px-3 bg-cyber-dark hover:bg-cyber-dark/70 text-white border border-white/10 rounded-md text-sm"
                    onClick={() => window.open(product.url, '_blank')}
                  >
                    View Details
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductComparison;