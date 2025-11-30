// Contains utility functions for the frontend, specifically for merging Tailwind CSS classes.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts the hostname/domain from a URL string.
 * Returns the original string if URL parsing fails.
 *
 * @param url - The URL string to parse
 * @returns The hostname from the URL, or the original string if parsing fails
 */
export function getDomainFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    console.error("Invalid URL:", url, e);
    return url;
  }
}
