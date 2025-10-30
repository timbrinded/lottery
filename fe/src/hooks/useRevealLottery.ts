import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useBlockNumber } from 'wagmi'
import { useLotteryFactoryAddress } from '@/contracts/hooks'
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory'
import { toBytes } from 'viem'

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

  // Get current block number
  const { data: currentBlock } = useBlockNumber({ watch: true })

  // Check if lottery can be revealed
  useEffect(() => {
    const checkRevealStatus = () => {
      const now = Math.floor(Date.now() / 1000)
      const timeDiff = revealTime - now
      setTimeRemaining(Math.max(0, timeDiff))

      if (currentBlock !== undefined && randomnessBlock > 0) {
        const blockDiff = Number(randomnessBlock - currentBlock)
        setBlocksRemaining(Math.max(0, blockDiff))

        // Can reveal if:
        // 1. Current block >= randomness block
        // 2. Current block <= randomness block + 256 (blockhash still available)
        // 3. Reveal time has arrived
        const blockReached = currentBlock >= randomnessBlock
        const blockNotExpired = currentBlock <= randomnessBlock + BigInt(256)
        const timeReached = now >= revealTime

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
      // Parse contract errors
      const errorMessage = writeError.message

      if (errorMessage.includes('InvalidCreatorSecret')) {
        setError(new Error('Invalid creator secret - does not match commitment'))
      } else if (errorMessage.includes('RandomnessBlockNotReached')) {
        setError(
          new Error(
            `Randomness block not reached yet. Please wait ${blocksRemaining} more blocks (~${Math.ceil(blocksRemaining * 12 / 60)} minutes)`
          )
        )
      } else if (errorMessage.includes('BlockhashExpired')) {
        setError(
          new Error(
            'Blockhash has expired (>256 blocks old). The lottery can now be refunded to the creator.'
          )
        )
      } else if (errorMessage.includes('UnauthorizedCaller')) {
        setError(new Error('Only the lottery creator can reveal the lottery'))
      } else if (errorMessage.includes('InvalidState')) {
        setError(new Error('Lottery is not in the correct state for reveal'))
      } else if (errorMessage.includes('User rejected')) {
        setError(new Error('Transaction cancelled'))
      } else {
        setError(writeError)
      }
    } else if (confirmError) {
      setError(confirmError)
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
      setError(
        new Error(
          `Randomness block not reached yet. Please wait ${blocksRemaining} more blocks (~${Math.ceil(blocksRemaining * 12 / 60)} minutes)`
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
    if (now < revealTime) {
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
