import { useState, useEffect } from 'react';
import { useWriteLotteryFactory } from '@/contracts/hooks';
import { useWaitForTransactionReceipt, useGasPrice } from 'wagmi';
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

    // Normalize secret to hex string with 0x prefix
    const hexSecret = ticketSecret.startsWith('0x') ? ticketSecret : `0x${ticketSecret}`;
    
    // Validate hex format
    if (!/^0x[0-9a-fA-F]{64}$/.test(hexSecret)) {
      console.error('Invalid ticket secret format');
      return;
    }

    // Set explicit gas limit to ensure enough gas for transfers
    // 150k should be more than enough for the claim operation
    writeLotteryFactory('claimPrize', [lotteryId, BigInt(ticketIndex), hexSecret as `0x${string}`], {
      gas: 150000n
    });
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
