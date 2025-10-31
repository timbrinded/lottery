import { useState, useEffect } from 'react';
import { useWriteLotteryFactory } from '@/contracts/hooks';
import { useWaitForTransactionReceipt, useGasPrice } from 'wagmi';
import { toBytes } from 'viem';
import { parseContractError } from '@/lib/errors';

interface UseClaimPrizeParams {
  lotteryId: bigint;
  ticketIndex: number;
  ticketSecret: string;
  grossPrize: bigint;
}

interface UseClaimPrizeReturn {
  claim: () => void;
  netPrize: bigint;
  gasCost: bigint;
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash?: `0x${string}`;
}

export function useClaimPrize({
  lotteryId,
  ticketIndex,
  ticketSecret,
  grossPrize,
}: UseClaimPrizeParams): UseClaimPrizeReturn {
  const [gasCost, setGasCost] = useState<bigint>(0n);
  const [netPrize, setNetPrize] = useState<bigint>(0n);
  const [parsedError, setParsedError] = useState<Error | null>(null);

  const { writeLotteryFactory, data: txHash, error, isPending } = useWriteLotteryFactory();
  
  const { data: gasPrice } = useGasPrice();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Parse errors
  useEffect(() => {
    if (error) {
      const message = parseContractError(error.message);
      setParsedError(new Error(message));
    } else {
      setParsedError(null);
    }
  }, [error]);

  // Calculate gas cost and net prize
  useEffect(() => {
    if (gasPrice) {
      // Estimate: 50,000 gas units for claimPrize transaction
      const estimatedGas = 50000n;
      const estimatedGasCost = estimatedGas * gasPrice;
      setGasCost(estimatedGasCost);
      
      // Calculate net prize (gross - gas)
      const calculatedNetPrize = grossPrize > estimatedGasCost 
        ? grossPrize - estimatedGasCost 
        : 0n;
      setNetPrize(calculatedNetPrize);
    }
  }, [gasPrice, grossPrize]);

  const claim = () => {
    if (!ticketSecret) {
      console.error('Ticket secret is required');
      return;
    }

    // Convert secret string to bytes
    const secretBytes = toBytes(ticketSecret);

    writeLotteryFactory('claimPrize', [lotteryId, BigInt(ticketIndex), secretBytes]);
  };

  return {
    claim,
    netPrize,
    gasCost,
    isLoading: isPending || isConfirming,
    isSuccess,
    error: parsedError,
    txHash,
  };
}
