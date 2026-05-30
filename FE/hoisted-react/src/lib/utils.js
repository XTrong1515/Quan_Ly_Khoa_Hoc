import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combine class names — clsx for logic, tailwind-merge dedupes conflicts. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
