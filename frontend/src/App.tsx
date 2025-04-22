import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CyberLayout from "./components/CyberLayout";
import LoadingAnimation from "./components/LoadingAnimation";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load page components for better initial load performance
const Index = lazy(() => import("./pages/Index"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <CyberLayout>
          <Suspense fallback={<LoadingAnimation />}>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </Suspense>
        </CyberLayout>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
