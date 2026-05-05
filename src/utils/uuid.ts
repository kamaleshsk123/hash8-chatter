/**
 * Generates a standard v4 UUID.
 * 
 * Uses `crypto.randomUUID()` if available (in secure contexts like HTTPS or localhost).
 * Falls back to a Math.random() based generator for insecure contexts (like accessing via IP over HTTP)
 * to prevent `TypeError: crypto.randomUUID is not a function`.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback for insecure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
