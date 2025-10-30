import { createFileRoute, useSearch } from '@tanstack/react-router';
import { useReadLotteryFactory } from '@/contracts/hooks';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Countdown } from '@/components/shared/Countdown';
import { TicketCommit } from '@/components/ticket/TicketCommit';
import { AlertCircle, Ticket } from 'lucide-react';

// Define search params type
type TicketSearchParams = {
  lottery?: string;
  ticket?: string;
  secret?: string;
};

export const Route = createFileRoute('/ticket')({
  component: TicketPage,
  validateSearch: (search: Record<string, unknown>): TicketSearchParams => {
    return {
      lottery: search.lottery as string | undefined,
      ticket: search.ticket as string | undefined,
      secret: search.secret as string | undefined,
    };
  },
});

function TicketPage() {
  const { lottery, ticket, secret } = useSearch({ from: '/ticket' });

  // Validate query params
  if (!lottery || !ticket || !secret) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid ticket link. Please check your URL and try again.
            {!lottery && <div className="mt-2">Missing lottery ID</div>}
            {!ticket && <div className="mt-2">Missing ticket index</div>}
            {!secret && <div className="mt-2">Missing ticket secret</div>}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const lotteryId = BigInt(lottery);
  const ticketIndex = parseInt(ticket);

  // Fetch lottery data
  const { data: lotteryData, isLoading, isError } = useReadLotteryFactory(
    'getLotteryStatus',
    [lotteryId]
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Loading lottery data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !lotteryData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load lottery data. The lottery may not exist or there was a network error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Parse lottery data - getLotteryStatus returns [state, commitDeadline, revealTime, claimDeadline, createdAt]
  const [state, commitDeadline, revealTime] = lotteryData as [
    number,
    bigint,
    bigint,
    bigint,
    bigint
  ];

  const commitDeadlineSeconds = Number(commitDeadline);
  const revealTimeSeconds = Number(revealTime);
  const now = Math.floor(Date.now() / 1000);

  // Determine current phase
  // LotteryState enum: 0=Pending, 1=CommitOpen, 2=CommitClosed, 3=RevealOpen, 4=Finalized
  const isCommitPhase = state === 1 && now < commitDeadlineSeconds; // CommitOpen
  const isCommitClosed = state === 2; // CommitClosed
  const isRevealed = state === 3; // RevealOpen

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Ticket className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Mystery Lottery Ticket</h1>
        <p className="text-muted-foreground">
          Lottery #{lottery} • Ticket #{ticket}
        </p>
      </div>

      <div className="space-y-6">
        {/* Commit Phase */}
        {isCommitPhase && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Enter Draw</CardTitle>
              <CardDescription>
                Commit your entry before the deadline to participate in the lottery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Commit Deadline:</span>
                <Countdown deadline={commitDeadlineSeconds} />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You must enter the draw before the deadline. After the deadline passes,
                  the lottery will be revealed and prizes assigned.
                </AlertDescription>
              </Alert>

              <TicketCommit
                lotteryId={lotteryId}
                ticketIndex={ticketIndex}
                ticketSecret={secret}
                commitDeadline={commitDeadlineSeconds}
                revealTime={revealTimeSeconds}
              />
            </CardContent>
          </Card>
        )}

        {/* Commit Closed - Waiting for Reveal */}
        {isCommitClosed && (
          <Card>
            <CardHeader>
              <CardTitle>Waiting for Reveal</CardTitle>
              <CardDescription>
                The commit period has ended. Waiting for the lottery creator to reveal prizes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Reveal Time:</span>
                <span className="font-mono font-semibold">
                  {new Date(revealTimeSeconds * 1000).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Come back after the reveal time to check your prize!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Revealed - Check Prize */}
        {isRevealed && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Check & Claim!</CardTitle>
              <CardDescription>
                The lottery has been revealed. Check if you won a prize!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                Prize checking functionality coming in task 15...
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deadline Passed Before Commit */}
        {!isCommitPhase && !isCommitClosed && !isRevealed && now >= commitDeadlineSeconds && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The commit period has ended. You can no longer enter this lottery.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
