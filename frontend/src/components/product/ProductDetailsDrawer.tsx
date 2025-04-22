import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ProductSpec {
  name: string;
  value: string;
}

interface ProductDetailsDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  specifications?: ProductSpec[] | Record<string, string>;
}

const ProductDetailsDrawer: React.FC<ProductDetailsDrawerProps> = ({
  isOpen,
  onToggle,
  specifications
}) => {
  // Convert specifications to array format if it's an object
  const specs = React.useMemo(() => {
    if (!specifications) return [];
    if (Array.isArray(specifications)) return specifications;
    return Object.entries(specifications).map(([name, value]) => ({ name, value }));
  }, [specifications]);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-full flex items-center justify-between py-2 px-4 border border-white/10 rounded-md bg-gradient-to-r from-cyber-dark/80 to-cyber-dark/40 hover:from-cyber-blue/20 hover:to-cyber-dark/60 transition-all duration-300"
      >
        <span>{isOpen ? 'Hide Details' : 'Show Details'}</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[500px]' : 'max-h-0'
        }`}
      >
        <div className="p-4 space-y-4 bg-cyber-dark/80 border border-white/10 border-t-0 rounded-b-lg">
          {specs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {specs.map((spec, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-gray-400">{spec.name}</span>
                  <span className="text-sm text-white">{spec.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400">No specifications available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsDrawer;