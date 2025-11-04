import { useAccount, useChainId } from 'wagmi';
import { arcTestnet } from '@/lib/wagmi';

interface NetworkEnforcementState {
  isConnected: boolean;
  isCorrectNetwork: boolean;
  currentChainId: number | undefined;
  requiredChainId: number;
  needsConnection: boolean;
  needsNetworkSwitch: boolean;
}

/**
 * Hook to enforce Arc testnet connection
 * Returns connection status and network validation state
 */
export function useNetworkEnforcement(): NetworkEnforcementState {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const requiredChainId = arcTestnet.id;

  const isCorrectNetwork = isConnected && chainId === requiredChainId;
  const needsConnection = !isConnected;
  const needsNetworkSwitch = isConnected && chainId !== requiredChainId;

  return {
    isConnected,
    isCorrectNetwork,
    currentChainId: chainId,
    requiredChainId,
    needsConnection,
    needsNetworkSwitch,
  };
}
