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

/**
 * Parse ticket input from various formats
 * Supports: full URLs, query strings, and composite codes (lottery-ticket-secret)
 * @param input - The ticket input string
 * @returns Parsed ticket data or null if invalid
 */
export function parseTicketInput(input: string): { lottery: string; ticket: string; secret: string } | null {
  // Try parsing as full URL
  try {
    const url = new URL(input);
    const params = new URLSearchParams(url.search);
    if (params.has('lottery') && params.has('ticket') && params.has('secret')) {
      return {
        lottery: params.get('lottery')!,
        ticket: params.get('ticket')!,
        secret: params.get('secret')!,
      };
    }
  } catch {
    // Not a valid URL, try other formats
  }

  // Try parsing as query string
  try {
    const params = new URLSearchParams(input);
    if (params.has('lottery') && params.has('ticket') && params.has('secret')) {
      return {
        lottery: params.get('lottery')!,
        ticket: params.get('ticket')!,
        secret: params.get('secret')!,
      };
    }
  } catch {
    // Not a valid query string
  }

  // Try parsing as composite code (lottery-ticket-secret)
  const parts = input.split('-');
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return {
      lottery: parts[0],
      ticket: parts[1],
      secret: parts[2],
    };
  }

  return null;
}

/**
 * Generate a composite ticket code (lottery-ticket-secret format)
 * @param lotteryId - The lottery ID
 * @param ticketIndex - The ticket index
 * @param ticketSecret - The ticket secret
 * @returns Composite code string
 */
export function generateCompositeTicketCode(
  lotteryId: string | bigint,
  ticketIndex: number,
  ticketSecret: string
): string {
  return `${lotteryId}-${ticketIndex}-${ticketSecret}`;
}
