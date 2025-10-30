import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useLotteryFactoryAddress } from '@/contracts/hooks';
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory';

interface UseCloseCommitPeriodParams {
  lotteryId: bigint;
  commitDeadline: number; // Unix timestamp in seconds
}

interface UseCloseCommitPeriodReturn {
  closeCommit: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  transactionHash?: `0x${string}`;
  canClose: boolean;
}

/**
 * Hook to close the commit period for a lottery
 * Can be called by anyone after the commit deadline has passed
 * Sets the randomnessBlock for future entropy
 */
export function useCloseCommitPeriod({
  lotteryId,
  commitDeadline,
}: UseCloseCommitPeriodParams): UseCloseCommitPeriodReturn {
  const address = useLotteryFactoryAddress();
  const [error, setError] = useState<Error | null>(null);
  const [canClose, setCanClose] = useState(false);

  // Check if commit period can be closed
  useEffect(() => {
    const checkDeadline = () => {
      const now = Math.floor(Date.now() / 1000);
      setCanClose(now >= commitDeadline);
    };

    checkDeadline();
    const interval = setInterval(checkDeadline, 1000);

    return () => clearInterval(interval);
  }, [commitDeadline]);

  // Write contract hook
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  // Wait for transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Combine errors
  useEffect(() => {
    if (writeError) {
      // Parse contract errors
      const errorMessage = writeError.message;
      
      if (errorMessage.includes('CommitPeriodNotClosed')) {
        setError(new Error('Commit deadline has not passed yet'));
      } else if (errorMessage.includes('InvalidState')) {
        setError(new Error('Lottery is not in the correct state'));
      } else if (errorMessage.includes('User rejected')) {
        setError(new Error('Transaction cancelled'));
      } else {
        setError(writeError);
      }
    } else if (confirmError) {
      setError(confirmError);
    } else {
      setError(null);
    }
  }, [writeError, confirmError]);

  const closeCommit = () => {
    // Clear previous errors
    setError(null);

    // Check if commit deadline has passed (client-side validation)
    const now = Math.floor(Date.now() / 1000);
    if (now < commitDeadline) {
      setError(new Error('Commit deadline has not passed yet'));
      return;
    }

    try {
      // Call closeCommitPeriod on the contract
      writeContract({
        address: address as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI,
        functionName: 'closeCommitPeriod',
        args: [lotteryId],
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to close commit period'));
    }
  };

  return {
    closeCommit,
    isLoading: isPending || isConfirming,
    isSuccess: isConfirmed,
    error,
    isPending,
    isConfirming,
    isConfirmed,
    transactionHash: hash,
    canClose,
  };
}
