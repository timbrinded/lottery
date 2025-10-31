import { useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { useCommitTicket } from '@/hooks/useCommitTicket';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Countdown } from '@/components/shared/Countdown';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface TicketCommitProps {
  lotteryId: bigint;
  ticketIndex: number;
  ticketSecret: string;
  commitDeadline: number; // Unix timestamp in seconds
  revealTime: number; // Unix timestamp in seconds
  onCommitSuccess?: () => void; // Optional callback when commit succeeds
}

export function TicketCommit({
  lotteryId,
  ticketIndex,
  ticketSecret,
  commitDeadline,
  revealTime,
  onCommitSuccess,
}: TicketCommitProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  // Use useLocalStorage hook for commit status
  const storageKey = `committed_${lotteryId}_${ticketIndex}`;
  const [isAlreadyCommitted, setIsAlreadyCommitted] = useLocalStorage(
    storageKey,
    false
  );

  const {
    commit,
    isLoading,
    isSuccess,
    error,
    isPending,
    isConfirming,
  } = useCommitTicket({
    lotteryId,
    ticketIndex,
    ticketSecret,
    commitDeadline,
  });

  // Store commit status on success
  useEffect(() => {
    if (isSuccess) {
      setIsAlreadyCommitted(true);
      setShowSuccess(true);
      onCommitSuccess?.();
    }
  }, [isSuccess, setIsAlreadyCommitted, onCommitSuccess]);

  const now = Math.floor(Date.now() / 1000);
  const deadlinePassed = now >= commitDeadline;
  const isDisabled = isAlreadyCommitted || deadlinePassed || isLoading;

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {(isAlreadyCommitted || showSuccess) && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <div className="font-semibold mb-1">✅ Entered!</div>
            <div className="text-sm">
              Come back after{' '}
              <span className="font-mono">
                {new Date(revealTime * 1000).toLocaleString()}
              </span>{' '}
              to check your prize!
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Countdown to Reveal (shown after commit) */}
      {(isAlreadyCommitted || showSuccess) && now < revealTime && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">Time until reveal:</span>
          <Countdown deadline={revealTime} />
        </div>
      )}

      {/* Commit Button */}
      {!isAlreadyCommitted && !showSuccess && (
        <Button
          onClick={commit}
          disabled={isDisabled}
          className="w-full"
          size="lg"
        >
          {isPending && (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming in wallet...
            </>
          )}
          {isConfirming && (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Waiting for confirmation...
            </>
          )}
          {!isLoading && !deadlinePassed && 'Enter Draw'}
          {!isLoading && deadlinePassed && 'Deadline Passed'}
        </Button>
      )}

      {/* Helper Text */}
      {!isAlreadyCommitted && !showSuccess && !deadlinePassed && (
        <p className="text-sm text-muted-foreground text-center">
          By entering, you commit to participate in this lottery. You'll be able to
          check your prize after the reveal time.
        </p>
      )}
    </div>
  );
}
