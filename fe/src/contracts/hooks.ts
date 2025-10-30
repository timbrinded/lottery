import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi'
import { LOTTERY_FACTORY_ABI } from './LotteryFactory'
import { getLotteryFactoryAddress, LOTTERY_FACTORY_ADDRESS } from './config'
import { useChainId } from 'wagmi'

/**
 * Hook to get the LotteryFactory contract address for the current chain
 */
export function useLotteryFactoryAddress() {
  const chainId = useChainId()
  
  // Use environment variable if available, otherwise use chain-specific address
  if (LOTTERY_FACTORY_ADDRESS) {
    return LOTTERY_FACTORY_ADDRESS
  }
  
  return getLotteryFactoryAddress(chainId)
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
    address,
    abi: LOTTERY_FACTORY_ABI,
    functionName,
    args,
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
    options?: { value?: bigint }
  ) => {
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
  
  return useWatchContractEvent({
    address,
    abi: LOTTERY_FACTORY_ABI,
    eventName,
    onLogs,
    ...options,
  })
}
