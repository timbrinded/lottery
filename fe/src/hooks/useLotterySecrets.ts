import { useLocalStorage } from 'usehooks-ts';
import { hashSecret } from '@/lib/crypto';

/**
 * Storage structure for lottery secrets
 * Includes both creator secret and ticket secrets
 */
interface LotterySecretData {
  creatorSecret: string;
  ticketSecrets: string[];
  createdAt: number;
}

type LotterySecretsMap = Record<string, LotterySecretData>;

/**
 * Hook for managing lottery creator secrets in local storage
 * Provides methods to save, retrieve, and validate secrets
 */
export function useLotterySecrets() {
  const [secrets, setSecrets] = useLocalStorage<LotterySecretsMap>(
    'lottery-creator-secrets',
    {}
  );

  /**
   * Save secrets for a lottery (creator secret and ticket secrets)
   */
  const saveSecret = (
    lotteryId: bigint | string,
    creatorSecret: string,
    ticketSecrets?: string[]
  ) => {
    const id = lotteryId.toString();
    setSecrets((prev) => ({
      ...prev,
      [id]: {
        creatorSecret,
        ticketSecrets: ticketSecrets || [],
        createdAt: Date.now(),
      },
    }));
  };

  /**
   * Get the creator secret for a lottery
   */
  const getSecret = (lotteryId: bigint | string): string | null => {
    const id = lotteryId.toString();
    return secrets[id]?.creatorSecret || null;
  };

  /**
   * Get all secret data for a lottery (creator + tickets)
   */
  const getSecretData = (lotteryId: bigint | string): LotterySecretData | null => {
    const id = lotteryId.toString();
    return secrets[id] || null;
  };

  /**
   * Get ticket secrets for a lottery
   */
  const getTicketSecrets = (lotteryId: bigint | string): string[] => {
    const id = lotteryId.toString();
    return secrets[id]?.ticketSecrets || [];
  };

  /**
   * Check if a secret exists for a lottery
   */
  const hasSecret = (lotteryId: bigint | string): boolean => {
    const id = lotteryId.toString();
    return id in secrets;
  };

  /**
   * Validate a secret against a commitment hash
   */
  const validateSecret = (
    secret: string,
    commitment: `0x${string}`
  ): boolean => {
    try {
      const hash = hashSecret(secret);
      return hash.toLowerCase() === commitment.toLowerCase();
    } catch {
      return false;
    }
  };

  /**
   * Remove a secret for a lottery
   */
  const removeSecret = (lotteryId: bigint | string) => {
    const id = lotteryId.toString();
    setSecrets((prev) => {
      const newSecrets = { ...prev };
      delete newSecrets[id];
      return newSecrets;
    });
  };

  /**
   * Clear all secrets
   */
  const clearAllSecrets = () => {
    setSecrets({});
  };

  /**
   * Get all lottery IDs that have secrets
   */
  const getLotteryIds = (): string[] => {
    return Object.keys(secrets);
  };

  return {
    saveSecret,
    getSecret,
    getSecretData,
    getTicketSecrets,
    hasSecret,
    validateSecret,
    removeSecret,
    clearAllSecrets,
    getLotteryIds,
    secrets,
  };
}
