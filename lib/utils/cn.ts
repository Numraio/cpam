import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with clsx and tailwind-merge
 * Used throughout the application for conditional className composition
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
