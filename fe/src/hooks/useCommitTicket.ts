import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { hashSecret } from '@/lib/crypto';
import { useLotteryFactoryAddress } from '@/contracts/hooks';
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory';

interface UseCommitTicketParams {
  lotteryId: bigint;
  ticketIndex: number;
  ticketSecret: string;
  commitDeadline: number; // Unix timestamp in seconds
}

interface UseCommitTicketReturn {
  commit: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  transactionHash?: `0x${string}`;
}

/**
 * Hook to commit a ticket to a lottery
 * Handles secret hashing, deadline validation, and transaction submission
 */
export function useCommitTicket({
  lotteryId,
  ticketIndex,
  ticketSecret,
  commitDeadline,
}: UseCommitTicketParams): UseCommitTicketReturn {
  const address = useLotteryFactoryAddress();
  const [error, setError] = useState<Error | null>(null);

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
      
      if (errorMessage.includes('CommitDeadlinePassed')) {
        setError(new Error('Commit period has ended'));
      } else if (errorMessage.includes('TicketAlreadyCommitted')) {
        setError(new Error('This ticket has already been committed'));
      } else if (errorMessage.includes('InvalidTicketSecret')) {
        setError(new Error('Invalid ticket secret'));
      } else if (errorMessage.includes('InvalidTicketIndex')) {
        setError(new Error('Invalid ticket index'));
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

  const commit = () => {
    // Clear previous errors
    setError(null);

    // Check if commit deadline has passed (client-side validation)
    const now = Math.floor(Date.now() / 1000);
    if (now >= commitDeadline) {
      setError(new Error('Commit period has ended'));
      return;
    }

    try {
      // Hash the ticket secret
      const secretHash = hashSecret(ticketSecret);

      // Call commitTicket on the contract
      writeContract({
        address,
        abi: LOTTERY_FACTORY_ABI,
        functionName: 'commitTicket',
        args: [lotteryId, BigInt(ticketIndex), secretHash],
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to commit ticket'));
    }
  };

  return {
    commit,
    isLoading: isPending || isConfirming,
    isSuccess: isConfirmed,
    error,
    isPending,
    isConfirming,
    isConfirmed,
    transactionHash: hash,
  };
}
