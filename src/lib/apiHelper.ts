/**
 * Safely resolves relative API URLs to absolute URLs in browser, iframe, and preview environments.
 */
export function buildApiUrl(path: string): string {
  if (!path) return '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  try {
    if (
      typeof window !== 'undefined' &&
      window.location &&
      window.location.origin &&
      window.location.origin !== 'null' &&
      !window.location.origin.startsWith('blob:') &&
      !window.location.origin.startsWith('about:')
    ) {
      return `${window.location.origin}${cleanPath}`;
    }
  } catch {
    // fallback
  }
  return cleanPath;
}
