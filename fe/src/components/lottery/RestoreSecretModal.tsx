import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLotterySecrets } from '@/hooks/useLotterySecrets';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { useCopyToClipboard } from 'usehooks-ts';

interface RestoreSecretModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotteryId: bigint;
  creatorCommitment: `0x${string}`;
  onViewTickets?: () => void;
}

export function RestoreSecretModal({
  open,
  onOpenChange,
  lotteryId,
  creatorCommitment,
  onViewTickets,
}: RestoreSecretModalProps) {
  const { getSecret, saveSecret, validateSecret, hasSecret, getTicketSecrets } = useLotterySecrets();
  const [pastedSecret, setPastedSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const storedSecret = getSecret(lotteryId);
  const hasStoredSecret = hasSecret(lotteryId);
  const ticketSecrets = getTicketSecrets(lotteryId);
  const hasTickets = ticketSecrets.length > 0;

  const handlePasteSecret = () => {
    setError(null);

    if (!pastedSecret.trim()) {
      setError('Please enter a secret');
      return;
    }

    // Validate format (should be 0x followed by 64 hex characters)
    if (!/^0x[0-9a-fA-F]{64}$/.test(pastedSecret.trim())) {
      setError('Invalid secret format. Expected 32-byte hex string (0x...)');
      return;
    }

    // Validate against commitment
    if (!validateSecret(pastedSecret.trim(), creatorCommitment)) {
      setError('Secret does not match the lottery commitment. Please check and try again.');
      return;
    }

    // Save the secret (without ticket secrets - those need to be imported separately)
    saveSecret(lotteryId, pastedSecret.trim(), []);
    setPastedSecret('');
    setError(null);
  };

  const handleCopy = async (text: string) => {
    await copy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lottery Creator Secret</DialogTitle>
          <DialogDescription>
            Lottery ID: {lotteryId.toString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasStoredSecret && storedSecret ? (
            <>
              <Alert>
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Your saved secret:</p>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
                      <code className="flex-1 text-xs font-mono break-all">
                        {storedSecret}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(storedSecret)}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This secret is stored in your browser's local storage.
                      Make sure to back it up externally.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              {hasTickets && onViewTickets && (
                <Button onClick={onViewTickets} className="w-full" variant="default">
                  View All Ticket Codes ({ticketSecrets.length} tickets)
                </Button>
              )}

              {!hasTickets && (
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Note:</strong> Ticket codes are not available for this lottery.
                    They may not have been saved, or this lottery was created before the
                    ticket storage feature was added.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No secret found in local storage. If you have your secret backed up,
                  you can restore it below.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="secret">Paste Your Creator Secret</Label>
                <Input
                  id="secret"
                  placeholder="0xa8dfd8593ce604563a7967e0566f3524369fdfebf0a87bd89ab6babb366590b7"
                  value={pastedSecret}
                  onChange={(e) => {
                    setPastedSecret(e.target.value);
                    setError(null);
                  }}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 32-byte hex secret (starting with 0x) that was shown when you created this lottery.
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handlePasteSecret} className="w-full">
                Restore Secret
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
