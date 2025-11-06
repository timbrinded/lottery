import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useLotteryFactoryAddress, useReadLotteryFactory } from '@/contracts/hooks';
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory';

const MAX_CREATOR_LOOKUPS = 100;

interface IsLotteryManagerResult {
  /**
   * Whether the connected wallet can access manager tooling.
   * Any connected wallet is treated as a manager so they can create lotteries.
   */
  isManager: boolean;
  /**
   * Whether the connected wallet has previously created at least one lottery.
   */
  hasCreatedLottery: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to determine manager eligibility and ownership state for the connected wallet.
 *
 * - All connected wallets are allowed to act as managers (can create lotteries).
 * - `hasCreatedLottery` indicates whether the wallet is the creator of any existing lotteries.
 */
export function useIsLotteryManager(): IsLotteryManagerResult {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const contractAddress = useLotteryFactoryAddress();

  // Get the next available lottery ID (counter starts at 1 and increments post-creation)
  const {
    data: lotteryCounter,
    isLoading: isLoadingCounter,
    error: counterError,
  } = useReadLotteryFactory('lotteryCounter', []);

  const totalLotteries = lotteryCounter ? Math.max(Number(lotteryCounter) - 1, 0) : 0;

  const shouldCheckCreators = Boolean(
    contractAddress &&
      address &&
      isConnected &&
      totalLotteries > 0 &&
      publicClient,
  );

  const [creatorAddresses, setCreatorAddresses] = useState<string[]>([]);
  const [creatorsError, setCreatorsError] = useState<Error | null>(null);
  const [isLoadingCreators, setIsLoadingCreators] = useState(false);

  useEffect(() => {
    if (!shouldCheckCreators || !contractAddress || !publicClient || !address) {
      setCreatorAddresses([]);
      setCreatorsError(null);
      setIsLoadingCreators(false);
      return;
    }

    let cancelled = false;

    const loadCreators = async () => {
      setIsLoadingCreators(true);

      try {
        const lookups = Math.min(totalLotteries, MAX_CREATOR_LOOKUPS);

        const contracts = Array.from({ length: lookups }, (_, index) => ({
          address: contractAddress,
          abi: LOTTERY_FACTORY_ABI as any,
          functionName: 'getLotteryCreator',
          args: [BigInt(totalLotteries - index)] as const,
        }));

        const results = await publicClient.multicall({
          allowFailure: true,
          contracts,
        });

        if (cancelled) {
          return;
        }

        const creators = results
          .map((result) => {
            if (result.status !== 'success') {
              return null;
            }

            const [creator] = result.result as [string, `0x${string}`];
            return creator;
          })
          .filter((value): value is string => Boolean(value));

        setCreatorAddresses(creators);
        setCreatorsError(null);
      } catch (err) {
        if (!cancelled) {
          setCreatorAddresses([]);
          setCreatorsError(
            err instanceof Error ? err : new Error('Failed to load lottery creators'),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCreators(false);
        }
      }
    };

    loadCreators();

    return () => {
      cancelled = true;
    };
  }, [
    shouldCheckCreators,
    contractAddress,
    publicClient,
    totalLotteries,
    address,
  ]);

  const hasCreatedLottery = useMemo(() => {
    if (!address || creatorAddresses.length === 0) {
      return false;
    }

    const normalized = address.toLowerCase();
    return creatorAddresses.some((creator) => creator.toLowerCase() === normalized);
  }, [address, creatorAddresses]);

  const isLoading = isLoadingCounter || isLoadingCreators;

  return {
    isManager: Boolean(address && isConnected),
    hasCreatedLottery,
    isLoading,
    error: (counterError || creatorsError || null) as Error | null,
  };
}
