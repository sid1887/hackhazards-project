import React, { useState } from 'react';
import { groqApi } from '../../lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import LoadingAnimation from '../LoadingAnimation';

/**
 * Component for identifying products from uploaded images using Groq AI
 */
const ProductImageIdentifier: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Only accept image files
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  // Process the image using Groq API
  const handleIdentifyProduct = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await groqApi.identifyProductFromImage(selectedFile);
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to identify product');
      console.error('Error identifying product:', err);
    } finally {
      setLoading(false);
    }
  };

  // Clear everything and start fresh
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold text-center mb-6">AI Product Identifier</h2>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="product-image" className="block text-sm font-medium">
            Upload Product Image
          </label>
          <Input
            id="product-image"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="cursor-pointer"
            disabled={loading}
          />
        </div>
        
        {previewUrl && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Preview:</p>
            <div className="relative h-64 border rounded-md overflow-hidden">
              <img 
                src={previewUrl} 
                alt="Product preview" 
                className="object-contain w-full h-full" 
              />
            </div>
          </div>
        )}
        
        <div className="flex space-x-3 mt-4">
          <Button 
            onClick={handleIdentifyProduct} 
            disabled={!selectedFile || loading}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Identify Product
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={loading}
          >
            Reset
          </Button>
        </div>
      </Card>
      
      {loading && (
        <div className="flex justify-center p-6">
          <LoadingAnimation />
          <p className="text-center text-muted-foreground">Analyzing image with AI...</p>
        </div>
      )}
      
      {result && (
        <div className="mt-8 space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Identification Results</h3>
            {result.identificationResult?.productData && (
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Product Name:</span> 
                  <span className="ml-2">{result.identificationResult.productData.product || result.identificationResult.productData.name}</span>
                </div>
                {result.identificationResult.productData.brand && (
                  <div>
                    <span className="font-medium">Brand:</span>
                    <span className="ml-2">{result.identificationResult.productData.brand}</span>
                  </div>
                )}
                {result.identificationResult.productData.category && (
                  <div>
                    <span className="font-medium">Category:</span>
                    <span className="ml-2">{result.identificationResult.productData.category}</span>
                  </div>
                )}
                {result.identificationResult.productData.features && (
                  <div>
                    <span className="font-medium">Features:</span>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      {result.identificationResult.productData.features.map((feature: string, index: number) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.identificationResult.productData.keywords && (
                  <div>
                    <span className="font-medium">Keywords:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {result.identificationResult.productData.keywords.map((keyword: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-primary/10 text-sm rounded-md">{keyword}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
          
          {result.scrapingResults && result.scrapingResults.length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Price Comparison</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {result.scrapingResults.map((item: any, index: number) => (
                  <Card key={index} className="p-4 border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{item.retailer || 'Retailer'}</h4>
                        <p className="text-lg font-bold mt-1">
                          {item.price ? `₹${item.price}` : 'Price unavailable'}
                        </p>
                        {item.name && <p className="text-sm mt-1 text-muted-foreground">{item.name}</p>}
                      </div>
                      {item.imageUrl && (
                        <div className="h-16 w-16 relative">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name || 'Product'} 
                            className="object-contain h-full w-full"
                          />
                        </div>
                      )}
                    </div>
                    {item.url && (
                      <div className="mt-3">
                        <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(item.url, '_blank')}>
                          View Deal
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductImageIdentifier;