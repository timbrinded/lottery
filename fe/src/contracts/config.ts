import type { Address } from 'viem'

/**
 * LotteryFactory contract addresses for different networks
 * 
 * Priority order:
 * 1. VITE_LOTTERY_FACTORY_ADDRESS environment variable (highest priority)
 * 2. Chain-specific address from LOTTERY_FACTORY_ADDRESSES
 * 
 * To set the address:
 * - For local development: Set VITE_LOTTERY_FACTORY_ADDRESS in fe/.env.local
 * - For production: Update the chain-specific address below
 */
export const LOTTERY_FACTORY_ADDRESSES: Record<number, Address> = {
  // Localhost (Anvil forking Arc Testnet)
  5042002: '0x0000000000000000000000000000000000000000', // Set after deploying to local Anvil
  
  // Arc Mainnet
  // 5678: '0x0000000000000000000000000000000000000000', // Replace with deployed mainnet address
}

// Get contract address for current chain
export function getLotteryFactoryAddress(chainId: number): Address {
  // Check environment variable first (highest priority)
  if (LOTTERY_FACTORY_ADDRESS) {
    return LOTTERY_FACTORY_ADDRESS
  }
  
  // Fall back to chain-specific address
  const address = LOTTERY_FACTORY_ADDRESSES[chainId]
  if (!address) {
    throw new Error(`LotteryFactory contract not deployed on chain ${chainId}`)
  }
  return address
}

// Environment-based contract address (takes priority over chain-specific addresses)
export const LOTTERY_FACTORY_ADDRESS = import.meta.env.VITE_LOTTERY_FACTORY_ADDRESS as Address | undefined
