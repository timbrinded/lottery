import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePublicClient, useReadContracts } from 'wagmi';
import {
  useLotteryFactoryAddress,
  useReadLotteryFactory,
} from '@/contracts/hooks';
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory';

export type LatestLotteryData = {
  id: bigint;
  creator: string;
  creatorCommitment: `0x${string}`;
  totalPrizePool: bigint;
  commitDeadline: bigint;
  revealTime: bigint;
  claimDeadline: bigint;
  randomSeed: bigint;
  state: number;
  createdAt: bigint;
  ticketCount: number;
  committedTickets: number;
  totalPrizes: number;
  claimedPrizes: number;
  unclaimedPrizes: number;
  allPrizesClaimed: boolean;
  claimPercentage: number;
};

type LatestLotteryResult = {
  lottery: LatestLotteryData | null;
  isLoading: boolean;
  error: Error | null;
  hasLottery: boolean;
  lotteryId: bigint | null;
};

/**
 * Hook to fetch the most recent lottery created on the factory.
 * Polls on an interval so homepage stats stay fresh without manual refresh.
 */
export function useLatestLottery(): LatestLotteryResult {
  const contractAddress = useLotteryFactoryAddress();

  const {
    data: lotteryCounter,
    isLoading: isCounterLoading,
    error: counterError,
  } = useReadLotteryFactory('lotteryCounter', [], {
    query: {
      refetchInterval: 10_000,
    },
  });

  const counterValue = lotteryCounter as bigint | undefined;

  // Lottery IDs start at 1 and lotteryCounter always points to the next ID.
  const latestLotteryId = useMemo(() => {
    if (!counterValue || counterValue <= 1n) {
      return null;
    }
    return counterValue - 1n;
  }, [counterValue]);

  const contracts = useMemo(() => {
    if (!contractAddress || latestLotteryId === null) {
      return [] as any[];
    }

    return [
      {
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: 'lotteries',
        args: [latestLotteryId],
      },
      {
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: 'getLotteryTickets',
        args: [latestLotteryId],
      },
    ] as any[];
  }, [contractAddress, latestLotteryId]);

  const {
    data: latestLotteryData,
    isLoading: isLatestLoading,
    error: latestLotteryError,
  } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      refetchInterval: 10_000,
    },
  });

  const ticketCount = useMemo(() => {
    if (!latestLotteryData) {
      return 0;
    }
    const ticketsResult = latestLotteryData[1] as any;
    if (ticketsResult?.status === 'success' && Array.isArray(ticketsResult.result)) {
      return ticketsResult.result.length;
    }
    return 0;
  }, [latestLotteryData]);

  const publicClient = usePublicClient();
  const {
    data: ticketDetailsData = [],
    isLoading: isTicketDetailsLoading,
    isFetching: isTicketDetailsFetching,
  } = useQuery({
    queryKey: [
      'latestLottery',
      latestLotteryId ? latestLotteryId.toString() : 'none',
      'ticketDetails',
      ticketCount,
    ],
    enabled:
      Boolean(publicClient) &&
      Boolean(contractAddress) &&
      latestLotteryId !== null &&
      ticketCount > 0,
    refetchInterval: 10_000,
    queryFn: async () => {
      if (!publicClient || latestLotteryId === null || ticketCount === 0 || !contractAddress) {
        return [];
      }

      const contractsBatch = Array.from({ length: ticketCount }, (_, index) => ({
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: 'tickets',
        args: [latestLotteryId, BigInt(index)],
      }));

      const results = await publicClient.multicall({
        contracts: contractsBatch,
        allowFailure: true,
      });

      return results;
    },
  });
  const isTicketDetailsPending = isTicketDetailsLoading || isTicketDetailsFetching;

  const prizeContracts = useMemo(() => {
    if (!contractAddress || latestLotteryId === null) {
      return [] as any[];
    }

    return [
      {
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: 'getLotteryPrizes',
        args: [latestLotteryId],
      },
    ] as any[];
  }, [contractAddress, latestLotteryId]);

  const {
    data: prizeData,
    isLoading: isPrizeLoading,
  } = useReadContracts({
    contracts: prizeContracts,
    query: {
      enabled: prizeContracts.length > 0,
      refetchInterval: 10_000,
    },
  });

  const lottery = useMemo<LatestLotteryData | null>(() => {
    if (!latestLotteryData || latestLotteryId === null) {
      return null;
    }

    const [lotteryResult, ticketsResult] = latestLotteryData as any[];
    if (!lotteryResult || lotteryResult.status !== 'success' || !lotteryResult.result) {
      return null;
    }

    const data = lotteryResult.result as any[];
    const ticketArray =
      ticketsResult && ticketsResult.status === 'success' && Array.isArray(ticketsResult.result)
        ? (ticketsResult.result as unknown[])
        : [];

    const ticketsInfo = Array.isArray(ticketDetailsData) ? (ticketDetailsData as any[]) : [];

    let ticketPrizeCount = 0;
    let claimedPrizes = 0;
    let committedTickets = 0;

    if (ticketsInfo.length > 0) {
      ticketsInfo.forEach((ticketResult) => {
        if (ticketResult?.status === 'success' && Array.isArray(ticketResult.result)) {
          const [, committed, redeemed, prizeAmount] = ticketResult.result as [
            string,
            boolean,
            boolean,
            bigint
          ];
          if (committed) {
            committedTickets += 1;
          }
          if (prizeAmount > 0n) {
            ticketPrizeCount += 1;
            if (redeemed) {
              claimedPrizes += 1;
            }
          }
        }
      });
    }

    const prizesResult = Array.isArray(prizeData) ? (prizeData[0] as any) : undefined;
    const prizeValues =
      prizesResult && prizesResult.status === 'success' && Array.isArray(prizesResult.result?.[1])
        ? (prizesResult.result[1] as bigint[])
        : [];

    const declaredPrizeCount = prizeValues.length;
    const totalPrizes = Math.max(declaredPrizeCount, ticketPrizeCount);

    const unclaimedPrizes = Math.max(totalPrizes - claimedPrizes, 0);
    const claimPercentage = totalPrizes > 0 ? Math.round((claimedPrizes / totalPrizes) * 100) : 0;

    return {
      id: latestLotteryId,
      creator: data[0] as string,
      creatorCommitment: data[1] as `0x${string}`,
      totalPrizePool: data[2] as bigint,
      commitDeadline: data[3] as bigint,
      revealTime: data[4] as bigint,
      claimDeadline: data[5] as bigint,
      randomSeed: data[6] as bigint,
      state: Number(data[7]),
      createdAt: data[8] as bigint,
      ticketCount: ticketArray.length,
      committedTickets,
      totalPrizes,
      claimedPrizes,
      unclaimedPrizes,
      allPrizesClaimed: totalPrizes > 0 && unclaimedPrizes === 0,
      claimPercentage,
    };
  }, [latestLotteryData, latestLotteryId, prizeData, ticketDetailsData]);

  return {
    lottery,
    isLoading: isCounterLoading || isLatestLoading || isTicketDetailsPending || isPrizeLoading,
    error: (latestLotteryError as Error | null) ?? (counterError as Error | null),
    hasLottery: lottery !== null,
    lotteryId: latestLotteryId,
  };
}
