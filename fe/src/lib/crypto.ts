import { keccak256, toBytes, toHex } from 'viem';

/**
 * Generate a cryptographically secure random secret (32 bytes)
 * @returns Hex string representation of the secret
 */
export function generateSecret(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return toHex(randomBytes);
}

/**
 * Hash a secret using keccak256
 * @param secret - The secret to hash (hex string)
 * @returns The keccak256 hash of the secret
 */
export function hashSecret(secret: string): `0x${string}` {
  return keccak256(toBytes(secret as `0x${string}`));
}

/**
 * Generate an array of ticket secrets
 * @param count - Number of ticket secrets to generate
 * @returns Array of hex string secrets
 */
export function generateTicketSecrets(count: number): string[] {
  const secrets: string[] = [];
  for (let i = 0; i < count; i++) {
    secrets.push(generateSecret());
  }
  return secrets;
}
