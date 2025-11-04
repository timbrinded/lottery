import { useAccount } from 'wagmi';
import { useReadLotteryFactory } from '@/contracts/hooks';

interface IsLotteryManagerResult {
  isManager: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to detect if the connected user owns any lotteries
 * Checks if the user's address matches any lottery creator
 */
export function useIsLotteryManager(): IsLotteryManagerResult {
  const { address, isConnected } = useAccount();

  // Get total lottery count
  const {
    data: lotteryCounter,
    isLoading: isLoadingCounter,
    error: counterError,
  } = useReadLotteryFactory('lotteryCounter', []);

  // Calculate counter value for enabling queries
  const counter = lotteryCounter ? Number(lotteryCounter) : 0;
  const hasLotteries = counter > 0;
  const canCheck = isConnected && address && hasLotteries;

  // Use multiple reads to check if user created any lottery
  // Always call hooks unconditionally, but use enabled flag to control execution
  const {
    data: firstLotteryCreator,
    isLoading: isLoadingFirst,
  } = useReadLotteryFactory('getLotteryCreator', [1n], {
    query: { enabled: canCheck && counter >= 1 },
  });

  const {
    data: secondLotteryCreator,
    isLoading: isLoadingSecond,
  } = useReadLotteryFactory('getLotteryCreator', [2n], {
    query: { enabled: canCheck && counter >= 2 },
  });

  const {
    data: thirdLotteryCreator,
    isLoading: isLoadingThird,
  } = useReadLotteryFactory('getLotteryCreator', [3n], {
    query: { enabled: canCheck && counter >= 3 },
  });

  const isLoading = isLoadingCounter || isLoadingFirst || isLoadingSecond || isLoadingThird;

  // If not connected or no lotteries exist, user is not a manager
  if (!canCheck) {
    return {
      isManager: false,
      isLoading: isLoadingCounter,
      error: counterError as Error | null,
    };
  }

  // Check if user is creator of any checked lottery
  const first = firstLotteryCreator as any;
  const second = secondLotteryCreator as any;
  const third = thirdLotteryCreator as any;
  
  const isManager =
    (first && first[0]?.toLowerCase() === address.toLowerCase()) ||
    (second && second[0]?.toLowerCase() === address.toLowerCase()) ||
    (third && third[0]?.toLowerCase() === address.toLowerCase());

  return {
    isManager: Boolean(isManager),
    isLoading,
    error: counterError as Error | null,
  };
}
