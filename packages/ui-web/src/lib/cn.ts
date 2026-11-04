import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Gộp class Tailwind, class sau thắng class trước (cách shadcn/ui dùng). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
