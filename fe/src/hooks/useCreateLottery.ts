import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEventLogs } from 'viem';
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory';
import { getLotteryFactoryAddress } from '@/contracts/config';
import { generateSecret, hashSecret, generateTicketSecrets } from '@/lib/crypto';
import { useLotterySecrets } from './useLotterySecrets';

interface CreateLotteryParams {
  prizeValues: bigint[];
  numberOfTickets: number;
  commitDeadline: number;
  revealTime: number;
  totalPrizePool: bigint;
  rolloverLotteryId?: bigint;
}

interface CreateLotteryResult {
  lotteryId: bigint | null;
  creatorSecret: string | null;
  ticketSecrets: string[] | null;
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  createLottery: (params: CreateLotteryParams) => Promise<void>;
  reset: () => void;
}

export function useCreateLottery(chainId: number): CreateLotteryResult {
  const [lotteryId, setLotteryId] = useState<bigint | null>(null);
  const [creatorSecret, setCreatorSecret] = useState<string | null>(null);
  const [ticketSecrets, setTicketSecrets] = useState<string[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { saveSecret } = useLotterySecrets();

  const {
    data: hash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Parse lottery ID from transaction receipt
  const parseLotteryId = useCallback((txReceipt: typeof receipt) => {
    if (!txReceipt) return null;

    try {
      const logs = parseEventLogs({
        abi: LOTTERY_FACTORY_ABI,
        logs: txReceipt.logs,
        eventName: 'LotteryCreated',
      });

      if (logs.length > 0 && logs[0].args.lotteryId) {
        return logs[0].args.lotteryId as bigint;
      }
    } catch (err) {
      console.error('Failed to parse lottery ID from logs:', err);
    }

    return null;
  }, []);

  // Update lottery ID when receipt is available
  if (receipt && !lotteryId) {
    const parsedId = parseLotteryId(receipt);
    if (parsedId) {
      setLotteryId(parsedId);
    }
  }

  // Auto-save creator secret to local storage when lottery is created
  useEffect(() => {
    if (lotteryId && creatorSecret) {
      saveSecret(lotteryId, creatorSecret);
    }
  }, [lotteryId, creatorSecret, saveSecret]);

  const createLottery = useCallback(
    async (params: CreateLotteryParams) => {
      try {
        setError(null);
        setLotteryId(null);

        // Generate creator secret and commitment
        const secret = generateSecret();
        const commitment = hashSecret(secret);
        setCreatorSecret(secret);

        // Generate ticket secrets and hashes
        const secrets = generateTicketSecrets(params.numberOfTickets);
        const secretHashes = secrets.map(s => hashSecret(s));
        setTicketSecrets(secrets);

        // Get contract address
        const contractAddress = getLotteryFactoryAddress(chainId);

        // Call createLottery contract function
        writeContract({
          address: contractAddress,
          abi: LOTTERY_FACTORY_ABI,
          functionName: 'createLottery',
          args: [
            commitment,
            secretHashes,
            params.prizeValues,
            BigInt(params.commitDeadline),
            BigInt(params.revealTime),
            params.rolloverLotteryId || 0n,
          ],
          value: params.totalPrizePool,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create lottery');
        setError(error);
        throw error;
      }
    },
    [chainId, writeContract]
  );

  const reset = useCallback(() => {
    setLotteryId(null);
    setCreatorSecret(null);
    setTicketSecrets(null);
    setError(null);
    resetWrite();
  }, [resetWrite]);

  return {
    lotteryId,
    creatorSecret,
    ticketSecrets,
    isLoading: isWritePending || isConfirming,
    isSuccess,
    error: error || writeError,
    createLottery,
    reset,
  };
}
