import React, { useRef, useEffect, useState } from 'react';
import Quagga from 'quagga';

const BarcodeScanner = ({ onDetected, onClose }) => {
  const scannerRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize Quagga when the component mounts
    if (scannerRef.current && !isInitialized) {
      initQuagga();
    }

    // Clean up when the component unmounts
    return () => {
      if (isInitialized) {
        Quagga.stop();
      }
    };
  }, [isInitialized]);

  const initQuagga = () => {
    // Clear any previous errors
    setError(null);

    Quagga.init(
      {
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: scannerRef.current,
          constraints: {
            width: 480,
            height: 320,
            facingMode: 'environment', // Use rear camera on mobile devices
          },
        },
        locator: {
          patchSize: 'medium',
          halfSample: true,
        },
        numOfWorkers: navigator.hardwareConcurrency || 4,
        decoder: {
          readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader'],
        },
        locate: true,
      },
      (err) => {
        if (err) {
          setError(`Error initializing barcode scanner: ${err}`);
          console.error('Error initializing Quagga:', err);
          return;
        }
        setIsInitialized(true);
        
        // Start barcode detection
        Quagga.start();

        // Add detector for barcode reading
        Quagga.onDetected((result) => {
          if (result && result.codeResult) {
            // Get the barcode value
            const code = result.codeResult.code;
            console.log('Barcode detected:', code);
            
            // Stop scanning and call the callback
            Quagga.stop();
            if (onDetected) {
              onDetected(code);
            }
          }
        });
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="relative bg-dark-surface p-4 rounded-lg shadow-lg w-full max-w-lg">
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
        >
          &times;
        </button>
        
        <h3 className="text-xl font-bold mb-4 text-center text-neon-blue">Scan Barcode</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-100 rounded">
            {error}
            <p className="mt-2 text-sm">
              Please make sure you've granted camera permissions and are using a device with a camera.
            </p>
          </div>
        )}
        
        <div 
          ref={scannerRef} 
          className="overflow-hidden rounded-lg relative"
          style={{ minHeight: '320px' }}
        >
          {/* Scanning animation line */}
          <div className="barcode-scanner-line"></div>
          
          {/* Overlay for scanning area */}
          <div className="absolute inset-0 border-2 border-neon-green rounded-lg pointer-events-none"></div>
        </div>
        
        <p className="mt-4 text-sm text-gray-400 text-center">
          Position the barcode within the scanning area.
        </p>
      </div>
    </div>
  );
};

export default BarcodeScanner;