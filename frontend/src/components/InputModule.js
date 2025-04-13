import React, { useState, useRef } from 'react';
import { Upload, Search, X, Camera, Scan } from 'lucide-react';

const InputModule = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef(null);
  
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query && !imageFile) return;
    
    setIsLoading(true);
    onSearch(query, imageFile);
    
    // This would be replaced with actual API call response
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };
  
  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="glass-card w-full max-w-3xl mx-auto mb-12 animate-fade-in shadow-xl shadow-black/20">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className={`absolute inset-y-0 left-3 flex items-center transition-all duration-300 ${isFocused ? 'text-cyber-blue' : 'text-gray-400'}`}>
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Enter product name..."
              className={`cyber-input w-full pl-10 transition-all duration-300 ${isFocused ? 'border-cyber-blue/80 shadow-inner shadow-cyber-blue/10' : ''}`}
            />
            
            {/* Scanning animation */}
            {isFocused && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyber-blue/0 via-cyber-blue/80 to-cyber-blue/0 animate-scanlines" style={{width: '100%'}}></div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <label className="cyber-button bg-cyber-purple/80 hover:bg-cyber-purple flex items-center cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_rgba(139,92,246,0.5)]">
              <Upload className="h-5 w-5 mr-2" />
              <span>Upload</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                ref={fileInputRef}
              />
            </label>
            
            <button 
              type="submit" 
              className="cyber-button bg-cyber-green/80 hover:bg-cyber-green transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Scan className="h-5 w-5 mr-2 animate-pulse" /> Scanning...
                </>
              ) : (
                'Compare'
              )}
            </button>
          </div>
        </div>
        
        {imagePreview && (
          <div className="relative rounded-lg overflow-hidden neon-border">
            <div className="absolute top-2 right-2 z-10">
              <button
                type="button"
                onClick={clearImage}
                className="bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors hover:text-cyber-blue"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img 
              src={imagePreview} 
              alt="Product Preview" 
              className="w-full h-48 object-contain bg-black/40"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
              <div className="flex items-center">
                <Camera className="h-4 w-4 text-cyber-blue mr-2" />
                <span className="text-xs text-white/80">Image uploaded successfully</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-400 text-center">
          Compare prices by entering product name or uploading an image
        </div>
      </form>
    </div>
  );
};

export default InputModule;