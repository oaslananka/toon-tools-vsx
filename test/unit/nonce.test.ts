import { generateNonce } from '../../src/utils/nonce';

describe('generateNonce', () => {
  it('returns a non-empty string', () => {
    expect(generateNonce()).toEqual(expect.any(String));
    expect(generateNonce().length).toBeGreaterThan(0);
  });

  it('returns different values across calls', () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });

  it('uses base64url safe characters only', () => {
    expect(generateNonce()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
