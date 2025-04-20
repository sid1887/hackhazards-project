import React, { useState } from 'react';
import { groqApi } from '../../lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
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
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Products to Compare</h3>
          <p className="text-muted-foreground">
            Search for products or add products to your comparison list to see an AI-powered comparison.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">AI Product Comparison</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading || !summary}
          >
            Reset
          </Button>
          <Button
            onClick={handleGenerateSummary}
            disabled={loading || productData.length < 2}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Compare with AI'
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingAnimation />
          <p className="text-center text-muted-foreground mt-4">
            Analyzing product data with AI...
          </p>
        </div>
      ) : summary ? (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="comparison">Comparison Table</TabsTrigger>
            <TabsTrigger value="recommendation">Recommendation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Summary Analysis</h3>
              <div className="prose dark:prose-invert max-w-none">
                {summary.overview && <p>{summary.overview}</p>}
                
                {summary.keyDifferences && (
                  <div className="mt-4">
                    <h4 className="text-lg font-medium mb-2">Key Differences</h4>
                    <ul className="space-y-1 list-disc pl-5">
                      {summary.keyDifferences.map((diff: string, idx: number) => (
                        <li key={idx}>{diff}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.priceAnalysis && (
                  <div className="mt-4">
                    <h4 className="text-lg font-medium mb-2 flex items-center">
                      <BarChart4 className="mr-2 h-5 w-5" />
                      Price Analysis
                    </h4>
                    <p>{summary.priceAnalysis}</p>
                  </div>
                )}

                {summary.valueProposition && (
                  <div className="mt-4">
                    <h4 className="text-lg font-medium mb-2 flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5" />
                      Value Proposition
                    </h4>
                    <p>{summary.valueProposition}</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="comparison">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Feature Comparison</h3>
              
              {summary.featureComparison && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr>
                        <th className="py-3 px-4 text-left bg-muted font-medium">Feature</th>
                        {productData.map((product, idx) => (
                          <th key={idx} className="py-3 px-4 text-left bg-muted font-medium">
                            {product.retailer}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.entries(summary.featureComparison).map(([feature, values]: [string, any], idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-4 font-medium">{feature}</td>
                          {productData.map((product, productIdx) => {
                            const value = values[product.retailer];
                            return (
                              <td key={productIdx} className="py-3 px-4">
                                {typeof value === 'boolean' ? (
                                  value ? (
                                    <Check className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )
                                ) : (
                                  value || <span className="text-muted-foreground">-</span>
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
              
              {!summary.featureComparison && (
                <p className="text-muted-foreground">
                  No detailed feature comparison available.
                </p>
              )}
            </Card>
          </TabsContent>
          
          <TabsContent value="recommendation">
            <Card className="p-6">
              <div className="flex items-start mb-6">
                <div className="bg-primary/10 p-3 rounded-full mr-4">
                  <Info className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">AI Recommendation</h3>
                  <p className="text-muted-foreground">
                    Based on comprehensive analysis of features, price, and value
                  </p>
                </div>
              </div>
              
              {summary.recommendation ? (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-lg">{summary.recommendation}</p>
                  
                  {summary.buyingAdvice && (
                    <Accordion type="single" collapsible className="mt-6">
                      <AccordionItem value="advice">
                        <AccordionTrigger>Additional Buying Advice</AccordionTrigger>
                        <AccordionContent>
                          <p>{summary.buyingAdvice}</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No recommendation available. Try regenerating the comparison.
                </p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productData.map((product, idx) => (
            <Card key={idx} className="p-4 border">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{product.retailer}</h4>
                  <p className="text-lg font-bold mt-1">
                    {typeof product.price === 'string' ? product.price : `₹${product.price}`}
                  </p>
                  {product.name && (
                    <p className="text-sm mt-1 text-muted-foreground">{product.name}</p>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(product.url, '_blank')}
                  >
                    View Details
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductComparison;