
import React, { useState } from 'react';
import { Search, Upload, X } from 'lucide-react';
import { Button } from './glitch-ui/button';
import { Input } from './glitch-ui/input';
import { cn } from '../lib/utils';

interface InputModuleProps {
  onSearch?: (query: string, imageFile?: File | null) => void;
  isLoading?: boolean;
}

const InputModule: React.FC<InputModuleProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search query:', query);
    console.log('Image:', image);
    // Call the onSearch callback if provided
    if (onSearch) {
      onSearch(query, image);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-12 px-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Text search input with neon effect */}
        <div className="relative">
          <div 
            className={cn(
              'absolute inset-0 rounded-lg transition-all duration-500',
              'bg-gradient-to-r from-cyber-purple via-cyber-blue to-cyber-pink bg-[length:200%_200%]',
              'animate-rotate-gradient blur opacity-70',
              isInputFocused ? 'opacity-100' : 'opacity-50'
            )}
          ></div>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a product..."
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className={cn(
                  'h-12 pl-10 pr-4 bg-cyber-dark bg-opacity-90 text-white',
                  'border border-white/10 focus:border-cyber-blue/50',
                  'backdrop-blur-sm shadow-lg focus:ring-2 focus:ring-cyber-blue',
                  'transition-all duration-300 z-10'
                )}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-blue/70 h-5 w-5" />
            </div>
            <Button 
              type="submit"
              className={cn(
                'bg-cyber-purple hover:bg-cyber-purple/90 text-white h-12',
                'backdrop-blur-sm transition-all duration-300 neon-border purple',
                'hover:animate-pulse-glow'
              )}
            >
              Compare
            </Button>
          </div>
        </div>
        
        {/* Image upload section */}
        <div className="relative">
          <div className={cn(
            "glassmorphism-panel h-40 rounded-lg overflow-hidden flex items-center justify-center",
            "border-2 border-dashed transition-all duration-300 bg-cyber-dark/50",
            "hover:border-cyber-blue hover:shadow-[0_0_15px_rgba(14,165,233,0.3)]",
          )}>
            {!previewUrl ? (
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4">
                <Upload className="h-8 w-8 text-cyber-blue mb-2" />
                <span className="text-sm text-cyber-blue font-medium">Upload product image</span>
                <span className="text-xs text-gray-400 mt-1">or drag and drop</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            ) : (
              <div className="relative w-full h-full">
                <img
                  src={previewUrl}
                  alt="Product preview"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/40 rounded-full p-1 hover:bg-black/60 transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default InputModule;
