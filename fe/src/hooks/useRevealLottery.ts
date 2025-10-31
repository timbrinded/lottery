import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useBlockNumber } from 'wagmi'
import { useLotteryFactoryAddress } from '@/contracts/hooks'
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory'
import { toBytes } from 'viem'
import { parseContractError, getErrorMessage } from '@/lib/errors'
import { useBlockTime } from '@/hooks/useBlockTime'

interface UseRevealLotteryParams {
  lotteryId: bigint
  randomnessBlock: bigint
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
  blocksRemaining: number
  timeRemaining: number
}

/**
 * Hook to reveal a lottery and assign prizes
 * Only callable by lottery creator after randomness block is reached
 * Fixed: Properly convert bigint revealTime to number for comparisons
 */
export function useRevealLottery({
  lotteryId,
  randomnessBlock,
  revealTime,
}: UseRevealLotteryParams): UseRevealLotteryReturn {
  const address = useLotteryFactoryAddress()
  const [error, setError] = useState<Error | null>(null)
  const [canReveal, setCanReveal] = useState(false)
  const [blocksRemaining, setBlocksRemaining] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Get current block number and block time
  const { data: currentBlock } = useBlockNumber({ watch: true })
  const { blockTime } = useBlockTime()

  // Check if lottery can be revealed
  useEffect(() => {
    const checkRevealStatus = () => {
      const now = Math.floor(Date.now() / 1000)
      const revealTimeNum = Number(revealTime)
      const timeDiff = revealTimeNum - now
      setTimeRemaining(Math.max(0, timeDiff))

      console.log(`[useRevealLottery] Checking reveal status for lottery ${lotteryId}:`, {
        currentBlock,
        randomnessBlock,
        hasCurrentBlock: currentBlock !== undefined,
        randomnessBlockPositive: randomnessBlock > 0,
      });

      if (currentBlock !== undefined && randomnessBlock > 0) {
        console.log('[useRevealLottery] Inside if block, calculating reveal status...');
        const blockDiff = Number(randomnessBlock - currentBlock)
        setBlocksRemaining(Math.max(0, blockDiff))

        // Can reveal if:
        // 1. Current block >= randomness block
        // 2. Current block <= randomness block + 256 (blockhash still available)
        // 3. Reveal time has arrived
        const blockReached = currentBlock >= randomnessBlock
        const blockNotExpired = currentBlock <= randomnessBlock + BigInt(256)
        const timeReached = now >= revealTimeNum

        console.log(`[useRevealLottery] Reveal check for lottery ${lotteryId}:`, {
          blockReached,
          blockNotExpired,
          timeReached,
          now,
          revealTimeNum,
          currentBlock: currentBlock.toString(),
          randomnessBlock: randomnessBlock.toString(),
        })
        setCanReveal(blockReached && blockNotExpired && timeReached)
      } else {
        setCanReveal(false)
      }
    }

    checkRevealStatus()
    const interval = setInterval(checkRevealStatus, 1000)

    return () => clearInterval(interval)
  }, [currentBlock, randomnessBlock, revealTime])

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
      const message = getErrorMessage(writeError, { blocksRemaining })
      setError(new Error(message))
    } else if (confirmError) {
      const message = parseContractError(confirmError.message)
      setError(new Error(message))
    } else {
      setError(null)
    }
  }, [writeError, confirmError, blocksRemaining])

  const reveal = (creatorSecret: string) => {
    // Clear previous errors
    setError(null)

    // Client-side validation
    if (currentBlock === undefined) {
      setError(new Error('Unable to get current block number'))
      return
    }

    if (currentBlock < randomnessBlock) {
      const estimatedMinutes = Math.ceil(blocksRemaining * blockTime / 60);
      setError(
        new Error(
          `Randomness block not reached yet. Please wait ${blocksRemaining} more blocks (~${estimatedMinutes} minutes)`
        )
      )
      return
    }

    if (currentBlock > randomnessBlock + BigInt(256)) {
      setError(
        new Error(
          'Blockhash has expired (>256 blocks old). The lottery can now be refunded to the creator.'
        )
      )
      return
    }

    const now = Math.floor(Date.now() / 1000)
    const revealTimeNum = Number(revealTime)
    if (now < revealTimeNum) {
      setError(new Error(`Reveal time not reached yet. Please wait ${timeRemaining} more seconds`))
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
    blocksRemaining,
    timeRemaining,
  }
}
