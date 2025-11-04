import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useNetworkEnforcement } from '@/hooks/useNetworkEnforcement';
import { useSwitchChain } from 'wagmi';
import { arcTestnet } from '@/lib/wagmi';

export function NetworkEnforcementBanner() {
  const { isCorrectNetwork, needsConnection, needsNetworkSwitch } =
    useNetworkEnforcement();
  const { switchChain } = useSwitchChain();

  // Don't show banner if everything is correct
  if (isCorrectNetwork) {
    return null;
  }

  // Not connected state
  if (needsConnection) {
    return (
      <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        <WifiOff className="text-yellow-600" />
        <AlertTitle className="text-yellow-900 dark:text-yellow-100">
          Connect Your Wallet
        </AlertTitle>
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          Please connect your wallet to get started with Mystery Lottery.
        </AlertDescription>
      </Alert>
    );
  }

  // Wrong network state
  if (needsNetworkSwitch) {
    return (
      <Alert variant="default" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
        <AlertCircle className="text-orange-600" />
        <AlertTitle className="text-orange-900 dark:text-orange-100">
          Switch to Arc Testnet
        </AlertTitle>
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          <p className="mb-3">
            Mystery Lottery runs on Arc Testnet. Please switch your network to continue.
          </p>
          <Button
            onClick={() => switchChain({ chainId: arcTestnet.id })}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Wifi className="mr-2" size={16} />
            Switch to Arc Testnet
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
