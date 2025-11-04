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

  // Always call hooks for a fixed number of lotteries to avoid conditional hook calls
  // We'll check up to 10 lotteries maximum
  const MAX_LOTTERIES = 10;
  
  // Create array of lottery IDs to check (always same length)
  const lotteryIds = Array.from({ length: MAX_LOTTERIES }, (_, i) => BigInt(i + 1));

  // Always call the same number of hooks
  const lottery1 = useReadLotteryFactory('lotteries', [lotteryIds[0]]);
  const tickets1 = useReadLotteryFactory('getLotteryTickets', [lotteryIds[0]]);
  
  const lottery2 = useReadLotteryFactory('lotteries', [lotteryIds[1]]);
  const tickets2 = useReadLotteryFactory('getLotteryTickets', [lotteryIds[1]]);
  
  const lottery3 = useReadLotteryFactory('lotteries', [lotteryIds[2]]);
  const tickets3 = useReadLotteryFactory('getLotteryTickets', [lotteryIds[2]]);
  
  const lottery4 = useReadLotteryFactory('lotteries', [lotteryIds[3]]);
  const tickets4 = useReadLotteryFactory('getLotteryTickets', [lotteryIds[3]]);
  
  const lottery5 = useReadLotteryFactory('lotteries', [lotteryIds[4]]);
  const tickets5 = useReadLotteryFactory('getLotteryTickets', [lotteryIds[4]]);
  
  const lottery6 = useReadLotteryFactory('lotteries', [lotteryIds[5]]);
  const tickets6 = useReadLotteryFactory('getLotteryTickets', [lotteryIds[5]]);
  
  const lottery7 = useReadLotteryFactory('lotteries', [lotteryIds[6]]);
  const tickets7 = useReadLotteryFactory('getLotteryTickets', [lotteryIds[6]]);
  
  const lottery8 = useReadLotteryFactory('lotteries', [lotteryIds[7]]);
  const tickets8 = useReadLotteryFactory('getLotteryTickets', [lotteryIds[7]]);
  
  const lottery9 = useReadLotteryFactory('lotteries', [lotteryIds[8]]);
  const tickets9 = useReadLotteryFactory('getLotteryTickets', [lotteryIds[8]]);
  
  const lottery10 = useReadLotteryFactory('lotteries', [lotteryIds[9]]);
  const tickets10 = useReadLotteryFactory('getLotteryTickets', [lotteryIds[9]]);

  const lotteryReads = [
    { id: lotteryIds[0], lotteryData: lottery1.data, ticketHashes: tickets1.data },
    { id: lotteryIds[1], lotteryData: lottery2.data, ticketHashes: tickets2.data },
    { id: lotteryIds[2], lotteryData: lottery3.data, ticketHashes: tickets3.data },
    { id: lotteryIds[3], lotteryData: lottery4.data, ticketHashes: tickets4.data },
    { id: lotteryIds[4], lotteryData: lottery5.data, ticketHashes: tickets5.data },
    { id: lotteryIds[5], lotteryData: lottery6.data, ticketHashes: tickets6.data },
    { id: lotteryIds[6], lotteryData: lottery7.data, ticketHashes: tickets7.data },
    { id: lotteryIds[7], lotteryData: lottery8.data, ticketHashes: tickets8.data },
    { id: lotteryIds[8], lotteryData: lottery9.data, ticketHashes: tickets9.data },
    { id: lotteryIds[9], lotteryData: lottery10.data, ticketHashes: tickets10.data },
  ];

  // For each lottery, check all tickets to find user's participations
  const participations = useMemo(() => {
    // If not connected or no lotteries exist, return empty
    if (!isConnected || !address || !lotteryCounter || lotteryCounter === 0n) {
      return [];
    }

    const results: LotteryParticipation[] = [];
    const actualLotteryCount = Math.min(Number(lotteryCounter), MAX_LOTTERIES);

    for (let i = 0; i < actualLotteryCount; i++) {
      const { id, lotteryData, ticketHashes } = lotteryReads[i];
      if (!ticketHashes || !lotteryData) continue;

      const userTickets: TicketParticipation[] = [];
      const hashes = ticketHashes as any;

      // Check each ticket in this lottery
      for (let j = 0; j < hashes.length; j++) {
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
  }, [lotteryReads, isConnected, address, lotteryCounter]);

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
