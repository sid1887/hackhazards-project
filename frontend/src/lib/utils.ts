
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency with the given locale and currency code
export function formatCurrency(amount: number, locale = 'en-IN', currency = 'INR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount);
}

// Calculate discount percentage
export function calculateDiscount(originalPrice: number, currentPrice: number) {
  if (!originalPrice || !currentPrice || originalPrice <= currentPrice) {
    return 0;
  }
  
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Get random item from array
export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
