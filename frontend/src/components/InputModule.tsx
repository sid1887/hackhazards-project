import React, { useState } from 'react';
import { Search, Upload, X, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import CyberButton from '@/components/CyberButton';
import { toast } from 'sonner';

interface InputModuleProps {
  onSearch?: (query: string) => void;
  onImageSearch?: (imageData: string, extractedKeywords?: string) => void;
  isSearching?: boolean;
}

const InputModule: React.FC<InputModuleProps> = ({ 
  onSearch, 
  onImageSearch,
  isSearching = false 
}) => {
  const [query, setQuery] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [extractedKeywords, setExtractedKeywords] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size exceeds 5MB limit. Please choose a smaller image.');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file.');
        return;
      }
      
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      toast.success('Image uploaded successfully');
    }
  };

  const removeImage = () => {
    setImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setExtractedKeywords('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If there's an image, process image search
    if (image && previewUrl && onImageSearch) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        onImageSearch(base64data, extractedKeywords || undefined);
      };
      reader.readAsDataURL(image);
      return;
    }
    
    // Otherwise, process text search
    if (query.trim().length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }
    
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-12 px-4">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Text search input with enhanced neon effect */}
        <div className="relative">
          <div 
            className={cn(
              'absolute inset-0 rounded-lg transition-all duration-500',
              'bg-gradient-to-r from-cyber-purple/20 via-cyber-blue/20 to-cyber-pink/20 bg-[length:200%_200%]',
              'animate-rotate-gradient blur opacity-30',
              isInputFocused ? 'opacity-50' : 'opacity-20'
            )}
          ></div>
          <div className="relative flex gap-3">
            <div className="relative flex-1">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a product..."
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className={cn(
                  'h-14 pl-12 pr-4 bg-cyber-dark/70 text-white',
                  'border border-white/10 focus:border-cyber-blue/50',
                  'backdrop-blur-md shadow-lg focus:ring-2 focus:ring-cyber-blue led-border-glow',
                  'transition-all duration-300 z-10 text-lg',
                  'hover:shadow-[0_0_15px_rgba(236,72,153,0.15),_0_0_30px_rgba(59,130,246,0.1)]'
                )}
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyber-blue/70 h-5 w-5" />
              
              {/* Sample search suggestion */}
              {!query && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-cyber-muted text-sm flex items-center">
                  <Sparkles className="h-3 w-3 mr-1 opacity-60" />
                  <span>Try: "iPhone 13 Pro"</span>
                </div>
              )}
            </div>
            <CyberButton 
              type="submit"
              glowColor="blue"
              disabled={isSearching}
              className={cn(
                'h-14 px-8 bg-cyber-blue/90 hover:bg-cyber-blue text-white',
                'backdrop-blur-md transition-all duration-300 border border-white/10',
                isSearching ? 'opacity-70 cursor-not-allowed' : ''
              )}
            >
              {isSearching ? (
                <>
                  <span className="animate-pulse mr-2">Searching</span>
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                </>
              ) : (
                image ? 'Search by Image' : 'Compare'
              )}
            </CyberButton>
          </div>
        </div>
        
        {/* Image upload section with enhanced effects */}
        <div className="relative">
          <div className={cn(
            "glassmorphism-panel-intense h-48 rounded-xl overflow-hidden",
            "border-2 border-dashed transition-all duration-300 bg-cyber-dark/30",
            "hover:border-pink-500/40 hover:shadow-[0_0_25px_rgba(236,72,153,0.2),_0_0_40px_rgba(59,130,246,0.15)]",
            isDragActive ? "border-pink-500/60 shadow-[0_0_30px_rgba(236,72,153,0.3),_0_0_50px_rgba(59,130,246,0.2)]" : ""
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          >
            {!previewUrl ? (
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-cyber-dark/60 p-3 rounded-full dual-tone-glow mb-3">
                    <Upload className="h-6 w-6 text-cyber-blue" />
                  </div>
                  <span className="text-sm text-cyber-blue font-medium mb-1">Upload product image</span>
                  <span className="text-xs text-gray-400">or drag and drop</span>
                </div>
                
                {/* Background animation */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyber-blue/5 to-cyber-pink/5 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 shimmer-effect pointer-events-none"></div>
                
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            ) : (
              <div className="relative w-full h-full overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Product preview"
                  className="w-full h-full object-contain p-2 transition-all duration-300 hover:scale-105"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-3 right-3 bg-black/60 rounded-full p-2 hover:bg-black/80 transition-colors border border-white/10"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
                
                {/* Overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Info label */}
                <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-full text-xs text-white/80 backdrop-blur-md border border-white/10">
                  {image?.name.length && image.name.length > 20 
                    ? image.name.substring(0, 20) + '...' 
                    : image?.name}
                </div>
              </div>
            )}
          </div>
          
          {/* Subtle pulsing effect indicators */}
          <div className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-cyber-pink/40 animate-ping-slow"></div>
          <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-cyber-blue/40 animate-ping-slow" style={{ animationDelay: "1.5s" }}></div>
        </div>
      </form>
    </div>
  );
};

export default InputModule;
