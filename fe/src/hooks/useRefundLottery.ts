import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useLotteryFactoryAddress } from '@/contracts/hooks'
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory'
import { parseContractError } from '@/lib/errors'

interface UseRefundLotteryParams {
  lotteryId: bigint
  revealTime: number // Unix timestamp in seconds
}

interface UseRefundLotteryReturn {
  refund: () => void
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  transactionHash?: `0x${string}`
  canRefund: boolean
  refundAvailableIn: number // seconds until refund is available
}

/**
 * Hook to refund a lottery after blockhash expiration
 * Can be called by anyone after 24 hours from reveal time
 */
export function useRefundLottery({
  lotteryId,
  revealTime,
}: UseRefundLotteryParams): UseRefundLotteryReturn {
  const address = useLotteryFactoryAddress()
  const [error, setError] = useState<Error | null>(null)
  const [canRefund, setCanRefund] = useState(false)
  const [refundAvailableIn, setRefundAvailableIn] = useState(0)

  // Check if lottery can be refunded
  useEffect(() => {
    const checkRefundStatus = () => {
      const now = Math.floor(Date.now() / 1000)
      const refundTime = revealTime + 24 * 60 * 60 // 24 hours after reveal time
      const timeDiff = refundTime - now

      setRefundAvailableIn(Math.max(0, timeDiff))
      setCanRefund(now >= refundTime)
    }

    checkRefundStatus()
    const interval = setInterval(checkRefundStatus, 1000)

    return () => clearInterval(interval)
  }, [revealTime])

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

  const refund = () => {
    // Clear previous errors
    setError(null)

    // Client-side validation
    const now = Math.floor(Date.now() / 1000)
    const refundTime = revealTime + 24 * 60 * 60

    if (now < refundTime) {
      setError(
        new Error(
          `Refund not available yet. Please wait ${Math.ceil(refundAvailableIn / 60)} more minutes.`
        )
      )
      return
    }

    try {
      // Call refundLottery on the contract
      writeContract({
        address: address as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI,
        functionName: 'refundLottery',
        args: [lotteryId],
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refund lottery'))
    }
  }

  return {
    refund,
    isLoading: isPending || isConfirming,
    isSuccess: isConfirmed,
    error,
    isPending,
    isConfirming,
    isConfirmed,
    transactionHash: hash,
    canRefund,
    refundAvailableIn,
  }
}
