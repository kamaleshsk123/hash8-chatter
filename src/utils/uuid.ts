/**
 * Generates a UUID using the native `crypto.randomUUID` API.
 * This function assumes a secure context (HTTPS or localhost).
 */
export function generateUUID(): string {
  return (crypto as any).randomUUID();
}

