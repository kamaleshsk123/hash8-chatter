import { describe, it, expect, vi } from 'vitest';
import { generateUUID } from '@/utils/uuid';

describe('UUID generation', () => {
  it('should return a string UUID', () => {
    // Mock crypto.randomUUID if not present
    const originalCrypto = globalThis.crypto;
    // @ts-ignore
    globalThis.crypto = { randomUUID: () => '123e4567-e89b-12d3-a456-426614174000' } as any;
    const uuid = generateUUID();
    expect(typeof uuid).toBe('string');
    expect(uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
    // Restore
    globalThis.crypto = originalCrypto as any;
  });
});
