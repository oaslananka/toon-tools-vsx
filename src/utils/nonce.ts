import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure nonce for Content-Security-Policy headers.
 */
export function generateNonce(): string {
  return randomBytes(16).toString('base64url');
}
