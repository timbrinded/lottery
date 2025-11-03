import { keccak256, toBytes, toHex } from 'viem';
import bs58 from 'bs58';

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
 * @param secret - The secret to hash (hex string with or without 0x prefix)
 * @returns The keccak256 hash of the secret
 */
export function hashSecret(secret: string): `0x${string}` {
  const hexSecret = secret.startsWith('0x') ? secret : `0x${secret}`;
  return keccak256(hexSecret as `0x${string}`);
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
 * Supports: base58 codes, full URLs, query strings, and composite codes (lottery-ticket-secret)
 * @param input - The ticket input string
 * @returns Parsed ticket data or null if invalid
 */
export function parseTicketInput(input: string): { lottery: string; ticket: string; secret: string } | null {
  const trimmed = input.trim();
  
  // Try parsing as base58 encoded ticket code (most compact format)
  // Base58 codes are typically 50-65 characters and don't contain special URL characters
  if (trimmed.length >= 50 && trimmed.length <= 70 && !/[?&=:/]/.test(trimmed)) {
    const decoded = decodeTicketCode(trimmed);
    if (decoded) {
      return {
        lottery: decoded.lotteryId.toString(),
        ticket: decoded.ticketIndex.toString(),
        secret: decoded.ticketSecret,
      };
    }
  }
  
  // Try parsing as full URL
  try {
    const url = new URL(trimmed);
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
    const params = new URLSearchParams(trimmed);
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
  const parts = trimmed.split('-');
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

/**
 * Encode ticket data into a compact base58 string
 * Format: [version(1)] [lotteryId(8)] [ticketIndex(4)] [secret(32)]
 * Total: 45 bytes -> ~61 base58 characters
 * 
 * @param lotteryId - The lottery ID
 * @param ticketIndex - The ticket index (0-4294967295)
 * @param ticketSecret - The ticket secret (hex string with 0x prefix)
 * @returns Base58 encoded ticket code
 */
export function encodeTicketCode(
  lotteryId: bigint,
  ticketIndex: number,
  ticketSecret: string
): string {
  // Version byte (for future compatibility)
  const version = 1;
  
  // Create buffer: 1 byte version + 8 bytes lotteryId + 4 bytes ticketIndex + 32 bytes secret
  const buffer = new Uint8Array(45);
  
  // Version (1 byte)
  buffer[0] = version;
  
  // Lottery ID (8 bytes, big-endian)
  const lotteryIdBigInt = BigInt(lotteryId);
  for (let i = 0; i < 8; i++) {
    buffer[1 + i] = Number((lotteryIdBigInt >> BigInt(8 * (7 - i))) & 0xFFn);
  }
  
  // Ticket Index (4 bytes, big-endian)
  buffer[9] = (ticketIndex >> 24) & 0xFF;
  buffer[10] = (ticketIndex >> 16) & 0xFF;
  buffer[11] = (ticketIndex >> 8) & 0xFF;
  buffer[12] = ticketIndex & 0xFF;
  
  // Secret (32 bytes)
  const secretBytes = toBytes(ticketSecret as `0x${string}`);
  buffer.set(secretBytes, 13);
  
  // Encode to base58
  return bs58.encode(buffer);
}

/**
 * Decode a base58 ticket code back to its components
 * 
 * @param code - Base58 encoded ticket code
 * @returns Decoded ticket data or null if invalid
 */
export function decodeTicketCode(code: string): {
  lotteryId: bigint;
  ticketIndex: number;
  ticketSecret: string;
} | null {
  try {
    // Decode from base58
    const buffer = bs58.decode(code);
    
    // Verify length
    if (buffer.length !== 45) {
      return null;
    }
    
    // Check version
    const version = buffer[0];
    if (version !== 1) {
      return null;
    }
    
    // Extract lottery ID (8 bytes, big-endian)
    let lotteryId = 0n;
    for (let i = 0; i < 8; i++) {
      lotteryId = (lotteryId << 8n) | BigInt(buffer[1 + i]);
    }
    
    // Extract ticket index (4 bytes, big-endian)
    const ticketIndex = 
      (buffer[9] << 24) |
      (buffer[10] << 16) |
      (buffer[11] << 8) |
      buffer[12];
    
    // Extract secret (32 bytes)
    const secretBytes = buffer.slice(13, 45);
    const ticketSecret = toHex(secretBytes);
    
    return {
      lotteryId,
      ticketIndex,
      ticketSecret,
    };
  } catch (error) {
    console.error('Failed to decode ticket code:', error);
    return null;
  }
}
