/**
 * Helper utilities for dealing with CORS issues in browser environments
 */

/**
 * Checks if the application is running in an environment with potential CORS issues
 * and provides guidance for resolving them.
 */
export function detectCorsEnvironment(): { hasCorsIssues: boolean; recommendations: string[] } {
  // Default response
  const result = {
    hasCorsIssues: false,
    recommendations: [] as string[]
  };
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return result; // Not in browser, no CORS issues
  }
  
  // Check if running in localhost (development) environment
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    result.hasCorsIssues = true;
    result.recommendations.push(
      'Install a CORS browser extension like "CORS Unblock" or "Allow CORS"',
      'Run the backend with proper CORS headers configured',
      'Use a CORS proxy service for development'
    );
  }
  
  // Detect if any CORS extensions are already installed (this is an approximation)
  try {
    // @ts-ignore - This is a way to check for CORS extensions that modify XHR
    const originalXhr = window.XMLHttpRequest;
    
    if (originalXhr.toString().includes('native code') === false) {
      // XHR has been modified, possibly by a CORS extension
      result.hasCorsIssues = false;
      result.recommendations.push(
        'A CORS modification extension appears to be active. API calls may work.'
      );
    }
  } catch (e) {
    // Ignore errors in detection
  }
  
  return result;
}

/**
 * Gets the optimal URL to use for API calls, possibly working around CORS issues
 * @param originalUrl The original API endpoint URL
 * @returns A URL that may help avoid CORS issues
 */
export function getCorsProxyUrl(originalUrl: string): string {
  // List of potential CORS proxies (add your preferred one)
  const corsProxies = [
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/raw?url=',
    'https://thingproxy.freeboard.io/fetch/'
  ];
  
  // For now just return the original URL, but this function can be expanded
  // to automatically use a CORS proxy if needed
  return originalUrl;
}
