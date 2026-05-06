/**
 * Generates a UUID.
 * Uses the native `crypto.randomUUID` API if available (Secure Contexts).
 * Provides a fallback for insecure contexts (HTTP over IP).
 */
export function generateUUID(): string {
  // Check if we are in a secure context with access to randomUUID
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }

  // Fallback for insecure contexts (like accessing via IP over HTTP)
  // This is a standard RFC4122 v4 compliant UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
