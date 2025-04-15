
import React from 'react';
import { Github } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="py-8 mt-8 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Cumpair. 
              <span className="block md:inline md:ml-1">A cyberpunk price comparison tool.</span>
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-cyber-blue transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
            
            <span className="text-gray-600">|</span>
            
            <a 
              href="#" 
              className="text-gray-400 hover:text-cyber-blue transition-colors text-sm"
            >
              Terms
            </a>
            
            <a 
              href="#" 
              className="text-gray-400 hover:text-cyber-blue transition-colors text-sm"
            >
              Privacy
            </a>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Powered by AI & web scraping technology. For demonstration purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
