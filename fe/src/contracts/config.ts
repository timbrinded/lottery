import type { Address } from 'viem'

// Contract addresses for different networks
export const LOTTERY_FACTORY_ADDRESSES: Record<number, Address> = {
  // Arc Testnet
  1234: '0x0000000000000000000000000000000000000000', // Replace with deployed testnet address
  
  // Arc Mainnet
  5678: '0x0000000000000000000000000000000000000000', // Replace with deployed mainnet address
}

// Get contract address for current chain
export function getLotteryFactoryAddress(chainId: number): Address {
  const address = LOTTERY_FACTORY_ADDRESSES[chainId]
  if (!address) {
    throw new Error(`LotteryFactory contract not deployed on chain ${chainId}`)
  }
  return address
}

// Environment-based contract address
export const LOTTERY_FACTORY_ADDRESS = import.meta.env.VITE_LOTTERY_FACTORY_ADDRESS as Address | undefined
