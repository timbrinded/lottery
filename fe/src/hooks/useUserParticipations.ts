import { useAccount, useReadContracts } from 'wagmi';
import { useReadLotteryFactory, useLotteryFactoryAddress } from '@/contracts/hooks';
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory';
import { useMemo } from 'react';

interface TicketParticipation {
  lotteryId: bigint;
  ticketIndex: number;
  holder: string;
  committed: boolean;
  redeemed: boolean;
  prizeAmount: bigint;
}

interface LotteryParticipation {
  lotteryId: bigint;
  tickets: TicketParticipation[];
  lotteryData: {
    creator: string;
    totalPrizePool: bigint;
    commitDeadline: bigint;
    revealTime: bigint;
    claimDeadline: bigint;
    state: number;
    createdAt: bigint;
  } | null;
}

interface UseUserParticipationsResult {
  participations: LotteryParticipation[];
  isLoading: boolean;
  error: Error | null;
  hasParticipations: boolean;
  unclaimedWinnings: LotteryParticipation[];
}

/**
 * Hook to fetch lotteries where the user has committed tickets
 * Returns participation data including win status and prize amounts
 */
export function useUserParticipations(): UseUserParticipationsResult {
  const { address, isConnected } = useAccount();
  const contractAddress = useLotteryFactoryAddress();

  // Get total lottery count
  const {
    data: lotteryCounter,
    isLoading: isLoadingCounter,
    error: counterError,
  } = useReadLotteryFactory('lotteryCounter', []);

  // Build multicall contracts array for all lotteries and their tickets
  const contracts = useMemo(() => {
    if (!isConnected || !address || !lotteryCounter || lotteryCounter === 0n || !contractAddress) {
      return [];
    }

    const calls: any[] = [];
    const actualLotteryCount = Math.min(Number(lotteryCounter), 10); // Check up to 10 lotteries

    // For each lottery, get lottery data and ticket hashes
    for (let i = 1; i <= actualLotteryCount; i++) {
      const lotteryId = BigInt(i);
      
      // Get lottery data
      calls.push({
        address: contractAddress,
        abi: LOTTERY_FACTORY_ABI,
        functionName: 'lotteries',
        args: [lotteryId],
      });
      
      // Get ticket hashes to know how many tickets exist
      calls.push({
        address: contractAddress,
        abi: LOTTERY_FACTORY_ABI,
        functionName: 'getLotteryTickets',
        args: [lotteryId],
      });
    }

    return calls;
  }, [isConnected, address, lotteryCounter, contractAddress]);

  // First multicall: get lottery data and ticket counts
  const { data: lotteryData, isLoading: isLoadingLotteries } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
    },
  });

  // Build second multicall for all tickets across all lotteries
  const ticketContracts = useMemo(() => {
    if (!lotteryData || !contractAddress || !address) return [];

    const calls: any[] = [];
    const actualLotteryCount = Math.min(Number(lotteryCounter || 0n), 10);

    for (let i = 0; i < actualLotteryCount; i++) {
      const lotteryId = BigInt(i + 1);
      const ticketHashesIndex = i * 2 + 1; // Every other result is ticket hashes
      const ticketHashesResult = lotteryData[ticketHashesIndex];
      
      if (ticketHashesResult?.status === 'success' && ticketHashesResult.result) {
        const hashes = ticketHashesResult.result as any[];
        
        // Read each ticket's data
        for (let j = 0; j < hashes.length; j++) {
          calls.push({
            address: contractAddress,
            abi: LOTTERY_FACTORY_ABI,
            functionName: 'tickets',
            args: [lotteryId, BigInt(j)],
          });
        }
      }
    }

    return calls;
  }, [lotteryData, contractAddress, address, lotteryCounter]);

  // Second multicall: get all ticket data
  const { data: ticketData, isLoading: isLoadingTickets } = useReadContracts({
    contracts: ticketContracts,
    query: {
      enabled: ticketContracts.length > 0,
    },
  });

  // Process all data to find user's participations
  const participations = useMemo(() => {
    if (!isConnected || !address || !lotteryData || !ticketData) {
      return [];
    }

    const results: LotteryParticipation[] = [];
    const actualLotteryCount = Math.min(Number(lotteryCounter || 0n), 10);
    let ticketDataIndex = 0;

    for (let i = 0; i < actualLotteryCount; i++) {
      const lotteryId = BigInt(i + 1);
      const lotteryDataIndex = i * 2;
      const ticketHashesIndex = i * 2 + 1;

      const lotteryResult = lotteryData[lotteryDataIndex];
      const ticketHashesResult = lotteryData[ticketHashesIndex];

      if (
        lotteryResult?.status !== 'success' ||
        ticketHashesResult?.status !== 'success' ||
        !lotteryResult.result ||
        !ticketHashesResult.result
      ) {
        continue;
      }

      const lottery = lotteryResult.result as any;
      const hashes = ticketHashesResult.result as any[];
      const userTickets: TicketParticipation[] = [];

      // Check each ticket for this lottery
      for (let j = 0; j < hashes.length; j++) {
        const ticketResult = ticketData[ticketDataIndex++];
        
        if (ticketResult?.status === 'success' && ticketResult.result) {
          const ticket = ticketResult.result as any;
          
          // ticket structure: [holder, committed, redeemed, prizeAmount]
          const holder = ticket[0] as string;
          const committed = ticket[1] as boolean;
          const redeemed = ticket[2] as boolean;
          const prizeAmount = ticket[3] as bigint;

          // Check if this ticket belongs to the current user and is committed
          if (holder && holder.toLowerCase() === address.toLowerCase() && committed) {
            userTickets.push({
              lotteryId,
              ticketIndex: j,
              holder,
              committed,
              redeemed,
              prizeAmount,
            });
          }
        }
      }

      // Only add lottery if user has committed tickets
      if (userTickets.length > 0) {
        results.push({
          lotteryId,
          tickets: userTickets,
          lotteryData: {
            creator: lottery[0] as string,
            totalPrizePool: lottery[2] as bigint,
            commitDeadline: lottery[3] as bigint,
            revealTime: lottery[4] as bigint,
            claimDeadline: lottery[5] as bigint,
            state: lottery[7] as number,
            createdAt: lottery[8] as bigint,
          },
        });
      }
    }

    return results;
  }, [lotteryData, ticketData, isConnected, address, lotteryCounter]);

  // Filter for unclaimed winnings
  const unclaimedWinnings = useMemo(() => {
    return participations.filter((participation) => {
      return participation.tickets.some(
        (ticket) => ticket.prizeAmount > 0n && !ticket.redeemed
      );
    });
  }, [participations]);

  return {
    participations,
    isLoading: isLoadingCounter || isLoadingLotteries || isLoadingTickets,
    error: counterError as Error | null,
    hasParticipations: participations.length > 0,
    unclaimedWinnings,
  };
}

/**
 * Hook to check if user has committed a specific ticket
 */
export function useHasCommittedTicket(
  lotteryId: bigint,
  ticketIndex: number
): {
  hasCommitted: boolean;
  isLoading: boolean;
  ticketData: any;
} {
  const { address, isConnected } = useAccount();

  const {
    data: ticketData,
    isLoading,
  } = useReadLotteryFactory('tickets', [lotteryId, BigInt(ticketIndex)], {
    query: { enabled: isConnected && !!address },
  });

  const data = ticketData as any;
  const hasCommitted =
    data &&
    data[0] && // holder address
    data[0].toLowerCase() === address?.toLowerCase() &&
    data[1]; // committed flag

  return {
    hasCommitted: Boolean(hasCommitted),
    isLoading,
    ticketData,
  };
}
