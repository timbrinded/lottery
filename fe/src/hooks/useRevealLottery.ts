import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useLotteryFactoryAddress } from '@/contracts/hooks'
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory'
import { toBytes } from 'viem'
import { parseContractError } from '@/lib/errors'

interface UseRevealLotteryParams {
  lotteryId: bigint
  state: number // LotteryState enum value
  commitDeadline: number // Unix timestamp in seconds
  revealTime: number // Unix timestamp in seconds
}

interface UseRevealLotteryReturn {
  reveal: (creatorSecret: string) => void
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  transactionHash?: `0x${string}`
  canReveal: boolean
  timeRemaining: number
  committedCount: number
}

/**
 * Hook to reveal a lottery and assign prizes
 * Only callable by lottery creator after commit deadline and reveal time
 * Uses multi-party commit-reveal randomness (no blockhash dependency)
 */
export function useRevealLottery({
  lotteryId,
  state,
  commitDeadline,
  revealTime,
}: UseRevealLotteryParams): UseRevealLotteryReturn {
  const address = useLotteryFactoryAddress()
  const [error, setError] = useState<Error | null>(null)
  const [canReveal, setCanReveal] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Get committed ticket count
  const { data: committedCountData } = useReadContract({
    address: address as `0x${string}`,
    abi: LOTTERY_FACTORY_ABI,
    functionName: 'getCommittedCount',
    args: [lotteryId],
    query: {
      enabled: !!address,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  })

  const committedCount = committedCountData ? Number(committedCountData) : 0

  // Check if lottery can be revealed
  useEffect(() => {
    const checkRevealStatus = () => {
      const now = Math.floor(Date.now() / 1000)
      const timeDiff = revealTime - now
      setTimeRemaining(Math.max(0, timeDiff))

      // Can reveal if:
      // 1. State is Pending (0) or CommitOpen (1) - support both for backward compatibility
      // 2. Commit deadline has passed
      // 3. Reveal time has arrived
      // 4. At least 1 ticket is committed
      const isValidState = state === 0 || state === 1
      const commitDeadlinePassed = now >= commitDeadline
      const revealTimeReached = now >= revealTime
      const hasMinimumCommits = committedCount >= 1

      console.log(`[useRevealLottery] Reveal check for lottery ${lotteryId}:`, {
        isValidState,
        commitDeadlinePassed,
        revealTimeReached,
        hasMinimumCommits,
        committedCount,
        state,
        now,
        commitDeadline,
        revealTime,
      })

      setCanReveal(isValidState && commitDeadlinePassed && revealTimeReached && hasMinimumCommits)
    }

    checkRevealStatus()
    const interval = setInterval(checkRevealStatus, 1000)

    return () => clearInterval(interval)
  }, [state, commitDeadline, revealTime, committedCount, lotteryId])

  // Write contract hook
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract()

  // Wait for transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
  })

  // Combine errors
  useEffect(() => {
    if (writeError) {
      const message = parseContractError(writeError.message)
      setError(new Error(message))
    } else if (confirmError) {
      const message = parseContractError(confirmError.message)
      setError(new Error(message))
    } else {
      setError(null)
    }
  }, [writeError, confirmError])

  const reveal = (creatorSecret: string) => {
    // Clear previous errors
    setError(null)

    // Client-side validation
    const now = Math.floor(Date.now() / 1000)

    if (state !== 0 && state !== 1) {
      setError(new Error('Lottery is not in a valid state for revealing'))
      return
    }

    if (now < commitDeadline) {
      setError(new Error('Commit deadline has not passed yet'))
      return
    }

    if (now < revealTime) {
      const minutesRemaining = Math.ceil(timeRemaining / 60)
      setError(new Error(`Reveal time not reached yet. Please wait ${minutesRemaining} more minutes`))
      return
    }

    if (committedCount < 1) {
      setError(new Error('Need at least 1 committed ticket to reveal'))
      return
    }

    try {
      // Convert secret string to bytes
      const secretBytes = toBytes(creatorSecret)

      // Call revealLottery on the contract
      writeContract({
        address: address as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI,
        functionName: 'revealLottery',
        args: [lotteryId, secretBytes],
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reveal lottery'))
    }
  }

  return {
    reveal,
    isLoading: isPending || isConfirming,
    isSuccess: isConfirmed,
    error,
    isPending,
    isConfirming,
    isConfirmed,
    transactionHash: hash,
    canReveal,
    timeRemaining,
    committedCount,
  }
}
