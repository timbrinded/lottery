import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePublicClient, useReadContracts } from 'wagmi';
import {
  useLotteryFactoryAddress,
  useReadLotteryFactory,
} from '@/contracts/hooks';
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory';
import { parseAbiItem } from 'viem';

const LOTTERY_CREATED_EVENT = parseAbiItem(
  'event LotteryCreated(uint256 indexed lotteryId, address indexed creator, uint256 totalPrizePool, uint256 numberOfTickets, uint256 commitDeadline, uint256 revealTime)',
);

export type LatestLotteryData = {
  id: bigint;
  creator: string;
  creatorCommitment: `0x${string}`;
  creationTxHash?: `0x${string}`;
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
  isFetching: boolean;
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
      refetchInterval: 60_000,
    },
  });

  const counterValue = lotteryCounter as bigint | undefined;
  const [stableLotteryId, setStableLotteryId] = useState<bigint | null>(null);

  // Lottery IDs start at 1 and lotteryCounter always points to the next ID.
  useEffect(() => {
    if (counterValue === undefined) {
      return;
    }
    if (counterValue <= 1n) {
      setStableLotteryId(null);
      return;
    }
    const nextId = counterValue - 1n;
    setStableLotteryId((prev) => (prev === nextId ? prev : nextId));
  }, [counterValue]);

  const contracts = useMemo(() => {
    if (!contractAddress || stableLotteryId === null) {
      return [] as any[];
    }

    return [
      {
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: 'lotteries',
        args: [stableLotteryId],
      },
      {
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: 'getLotteryTickets',
        args: [stableLotteryId],
      },
    ] as any[];
  }, [contractAddress, stableLotteryId]);

  const {
    data: latestLotteryData,
    isLoading: isLatestLoading,
    error: latestLotteryError,
  } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      refetchInterval: 60_000,
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
      stableLotteryId ? stableLotteryId.toString() : 'none',
      'ticketDetails',
      ticketCount,
    ],
    enabled:
      Boolean(publicClient) &&
      Boolean(contractAddress) &&
      stableLotteryId !== null &&
      ticketCount > 0,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (
        !publicClient ||
        stableLotteryId === null ||
        ticketCount === 0 ||
        !contractAddress
      ) {
        return [];
      }

      const contractsBatch = Array.from({ length: ticketCount }, (_, index) => ({
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: 'tickets',
        args: [stableLotteryId, BigInt(index)],
      }));

      const results = await publicClient.multicall({
        contracts: contractsBatch,
        allowFailure: true,
      });

      return results;
    },
  });
  const isTicketDetailsPending = isTicketDetailsLoading || isTicketDetailsFetching;

  const {
    data: creationTxHash,
    isLoading: isCreationTxLoading,
  } = useQuery({
    queryKey: [
      'latestLottery',
      stableLotteryId ? stableLotteryId.toString() : 'none',
      'creationTx',
    ],
    enabled:
      Boolean(publicClient) && Boolean(contractAddress) && stableLotteryId !== null,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!publicClient || stableLotteryId === null || !contractAddress) {
        return null;
      }

      const logs = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: LOTTERY_CREATED_EVENT,
        args: {
          lotteryId: stableLotteryId,
        },
        fromBlock: 0n,
        toBlock: 'latest',
      });

      const latestLog = logs.at(-1);
      return latestLog?.transactionHash ?? null;
    },
  });

  const prizeContracts = useMemo(() => {
    if (!contractAddress || stableLotteryId === null) {
      return [] as any[];
    }

    return [
      {
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: 'getLotteryPrizes',
        args: [stableLotteryId],
      },
    ] as any[];
  }, [contractAddress, stableLotteryId]);

  const {
    data: prizeData,
    isLoading: isPrizeLoading,
  } = useReadContracts({
    contracts: prizeContracts,
    query: {
      enabled: prizeContracts.length > 0,
      refetchInterval: 60_000,
    },
  });

  const [stableLottery, setStableLottery] = useState<LatestLotteryData | null>(null);

  const lottery = useMemo<LatestLotteryData | null>(() => {
    if (!latestLotteryData || stableLotteryId === null) {
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
      id: stableLotteryId,
      creator: data[0] as string,
      creatorCommitment: data[1] as `0x${string}`,
      creationTxHash: creationTxHash ?? undefined,
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
  }, [latestLotteryData, stableLotteryId, prizeData, ticketDetailsData, creationTxHash]);

  useEffect(() => {
    if (lottery) {
      setStableLottery(lottery);
      return;
    }
    if (stableLotteryId === null) {
      setStableLottery(null);
    }
  }, [lottery, stableLotteryId]);

  const resolvedLottery = lottery ?? stableLottery;
  const isFetchingInBackground =
    resolvedLottery !== null &&
    (isCounterLoading ||
      isLatestLoading ||
      isTicketDetailsPending ||
      isPrizeLoading ||
      isCreationTxLoading);
  const isInitialLoad =
    resolvedLottery === null &&
    (isCounterLoading ||
      isLatestLoading ||
      isTicketDetailsPending ||
      isPrizeLoading ||
      isCreationTxLoading);

  return {
    lottery: resolvedLottery,
    isLoading: isInitialLoad,
    isFetching: isFetchingInBackground,
    error: (latestLotteryError as Error | null) ?? (counterError as Error | null),
    hasLottery: resolvedLottery !== null,
    lotteryId: stableLotteryId,
  };
}
