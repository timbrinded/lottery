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
      <Alert variant="default" className="border border-mint-warning bg-mint-warning">
        <WifiOff className="text-mint-warning" />
        <AlertTitle className="text-foreground">Connect Your Wallet</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Please connect your wallet to get started with Blottery.
        </AlertDescription>
      </Alert>
    );
  }

  // Wrong network state
  if (needsNetworkSwitch) {
    return (
      <Alert variant="default" className="border border-mint-accent bg-mint-accent">
        <AlertCircle className="text-mint-accent" />
        <AlertTitle className="text-foreground">Switch to Arc Testnet</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <p className="mb-3">
            Blottery runs on Arc Testnet. Please switch your network to continue.
          </p>
          <Button
            onClick={() => switchChain({ chainId: arcTestnet.id })}
            size="sm"
            className="bg-primary text-primary-foreground shadow-[var(--shadow-mint-soft)] hover:bg-primary/90"
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
