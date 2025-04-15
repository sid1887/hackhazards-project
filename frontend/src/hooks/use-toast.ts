import * as React from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (options: ToastState) => void;
  toasts: ToastState[];
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export const toast = {
  success: (message: string, duration = 3000) => {
    const context = React.useContext(ToastContext);
    context?.toast({ message, type: 'success', duration });
  },
  error: (message: string, duration = 3000) => {
    const context = React.useContext(ToastContext);
    context?.toast({ message, type: 'error', duration });
  },
  warning: (message: string, duration = 3000) => {
    const context = React.useContext(ToastContext);
    context?.toast({ message, type: 'warning', duration });
  },
  info: (message: string, duration = 3000) => {
    const context = React.useContext(ToastContext);
    context?.toast({ message, type: 'info', duration });
  },
};