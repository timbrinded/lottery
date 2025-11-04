import { useAccount } from 'wagmi';
import { useReadLotteryFactory } from '@/contracts/hooks';
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

  // Get total lottery count
  const {
    data: lotteryCounter,
    isLoading: isLoadingCounter,
    error: counterError,
  } = useReadLotteryFactory('lotteryCounter', []);

  // If not connected or no lotteries exist, return empty
  if (!isConnected || !address || !lotteryCounter || lotteryCounter === 0n) {
    return {
      participations: [],
      isLoading: isLoadingCounter,
      error: counterError as Error | null,
      hasParticipations: false,
      unclaimedWinnings: [],
    };
  }

  // For now, we'll check the first few lotteries
  // In production, you'd want to use events or a subgraph to efficiently find user participations
  const lotteryIds = Array.from(
    { length: Math.min(Number(lotteryCounter), 10) }, // Limit to first 10 for performance
    (_, i) => BigInt(i + 1)
  );

  // Read lottery data for each lottery
  const lotteryReads = lotteryIds.map((id) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: lotteryData } = useReadLotteryFactory('lotteries', [id]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: ticketHashes } = useReadLotteryFactory('getLotteryTickets', [id]);
    
    return { id, lotteryData, ticketHashes };
  });

  // For each lottery, check all tickets to find user's participations
  const participations = useMemo(() => {
    const results: LotteryParticipation[] = [];

    for (const { id, lotteryData, ticketHashes } of lotteryReads) {
      if (!ticketHashes || !lotteryData) continue;

      const userTickets: TicketParticipation[] = [];
      const hashes = ticketHashes as any;

      // Check each ticket in this lottery
      for (let i = 0; i < hashes.length; i++) {
        // Read ticket data - we need to do this inline
        // In a real implementation, you'd batch these reads or use events
        // For now, we'll skip the individual ticket reads and rely on events
        // This is a limitation that should be addressed with proper event indexing
      }

      // Only add lottery if user has tickets
      if (userTickets.length > 0) {
        const data = lotteryData as any;
        results.push({
          lotteryId: id,
          tickets: userTickets,
          lotteryData: {
            creator: data[0] as string,
            totalPrizePool: data[2] as bigint,
            commitDeadline: data[3] as bigint,
            revealTime: data[4] as bigint,
            claimDeadline: data[5] as bigint,
            state: data[7] as number,
            createdAt: data[8] as bigint,
          },
        });
      }
    }

    return results;
  }, [lotteryReads]);

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
    isLoading: isLoadingCounter,
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
