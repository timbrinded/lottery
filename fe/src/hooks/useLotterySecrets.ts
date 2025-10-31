import { useLocalStorage } from 'usehooks-ts';
import { hashSecret } from '@/lib/crypto';

/**
 * Storage structure for lottery creator secrets
 * Maps lottery ID to creator secret
 */
type LotterySecretsMap = Record<string, string>;

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
   * Save a creator secret for a lottery
   */
  const saveSecret = (lotteryId: bigint | string, secret: string) => {
    const id = lotteryId.toString();
    setSecrets((prev) => ({
      ...prev,
      [id]: secret,
    }));
  };

  /**
   * Get a creator secret for a lottery
   */
  const getSecret = (lotteryId: bigint | string): string | null => {
    const id = lotteryId.toString();
    return secrets[id] || null;
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
    hasSecret,
    validateSecret,
    removeSecret,
    clearAllSecrets,
    getLotteryIds,
    secrets,
  };
}
