import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi'
import { LOTTERY_FACTORY_ABI } from './LotteryFactory'
import { LOTTERY_FACTORY_ADDRESS, LOTTERY_FACTORY_ADDRESSES } from './config'
import { useChainId } from 'wagmi'

/**
 * Hook to get the LotteryFactory contract address for the current chain
 * Returns null if contract is not deployed on the current chain
 */
export function useLotteryFactoryAddress(): `0x${string}` | null {
  const chainId = useChainId()
  
  // Use environment variable if available
  if (LOTTERY_FACTORY_ADDRESS) {
    return LOTTERY_FACTORY_ADDRESS
  }
  
  // Check if contract is deployed on this chain
  const address = LOTTERY_FACTORY_ADDRESSES[chainId]
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return null
  }
  
  return address
}

/**
 * Hook to read from LotteryFactory contract
 */
export function useReadLotteryFactory<
  TFunctionName extends string,
  TArgs extends readonly unknown[] = readonly unknown[]
>(
  functionName: TFunctionName,
  args?: TArgs,
  options?: Parameters<typeof useReadContract>[0]
) {
  const address = useLotteryFactoryAddress()
  
  return useReadContract({
    address: (address || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    abi: LOTTERY_FACTORY_ABI,
    functionName,
    args,
    query: {
      enabled: address !== null,
      ...options?.query,
    },
    ...options,
  })
}

/**
 * Hook to write to LotteryFactory contract
 */
export function useWriteLotteryFactory() {
  const address = useLotteryFactoryAddress()
  const { writeContract, ...rest } = useWriteContract()
  
  const writeLotteryFactory = <
    TFunctionName extends string,
    TArgs extends readonly unknown[] = readonly unknown[]
  >(
    functionName: TFunctionName,
    args: TArgs,
    options?: { value?: bigint; gas?: bigint }
  ) => {
    if (!address) {
      throw new Error('LotteryFactory contract not deployed on this chain')
    }
    return writeContract({
      address,
      abi: LOTTERY_FACTORY_ABI,
      functionName,
      args,
      ...options,
    })
  }
  
  return {
    writeLotteryFactory,
    ...rest,
  }
}

/**
 * Hook to watch LotteryFactory contract events
 */
export function useWatchLotteryFactoryEvent<TEventName extends string>(
  eventName: TEventName,
  onLogs: (logs: any[]) => void,
  options?: Parameters<typeof useWatchContractEvent>[0]
) {
  const address = useLotteryFactoryAddress()
  
  // Only watch events if contract is deployed
  if (!address) {
    return
  }
  
  return useWatchContractEvent({
    address,
    abi: LOTTERY_FACTORY_ABI,
    eventName,
    onLogs,
    ...options,
  })
}
