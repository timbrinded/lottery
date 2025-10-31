import { createFileRoute, useSearch } from '@tanstack/react-router';
import { useReadLotteryFactory } from '@/contracts/hooks';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Countdown } from '@/components/shared/Countdown';
import { TicketCommit } from '@/components/ticket/TicketCommit';
import { PrizeAnimation } from '@/components/ticket/PrizeAnimation';
import { ShareButtons } from '@/components/shared/ShareButtons';
import { useClaimPrize } from '@/hooks/useClaimPrize';
import { AlertCircle, Ticket, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { formatEther } from 'viem';

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

  // State for prize checking
  const [isPrizeChecked, setIsPrizeChecked] = useState(false);
  const [showClaimUI, setShowClaimUI] = useState(false);

  // Fetch ticket data when revealed
  const { data: ticketData, isLoading: isLoadingTicket, refetch: refetchTicket } = useReadLotteryFactory(
    'tickets',
    [lotteryId, BigInt(ticketIndex)],
    {
      query: {
        enabled: isRevealed && isPrizeChecked,
      }
    }
  );

  // Parse ticket data - tickets returns [holder, committed, redeemed, prizeAmount]
  const ticketHolder = ticketData?.[0] as `0x${string}` | undefined;
  const ticketCommitted = ticketData?.[1] as boolean | undefined;
  const ticketRedeemed = ticketData?.[2] as boolean | undefined;
  const prizeAmount = ticketData?.[3] as bigint | undefined;

  // Claim prize hook
  const {
    claim,
    netPrize,
    gasCost,
    isLoading: isClaimLoading,
    isSuccess: isClaimSuccess,
    error: claimError,
  } = useClaimPrize({
    lotteryId,
    ticketIndex,
    ticketSecret: secret,
    grossPrize: prizeAmount || 0n,
  });

  const handleCheckPrize = () => {
    setIsPrizeChecked(true);
    refetchTicket();
  };

  const handleAnimationComplete = () => {
    setShowClaimUI(true);
  };

  const handleClaim = () => {
    claim();
  };

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
            <CardContent className="space-y-4">
              {!isPrizeChecked ? (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Ready to see if you won? Click the button below to check your prize.
                  </p>
                  <Button
                    onClick={handleCheckPrize}
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={ticketCommitted === false || ticketRedeemed === true}
                  >
                    Check Prize
                  </Button>
                  {ticketCommitted === false && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You did not commit before the deadline. This ticket is not eligible for prizes.
                      </AlertDescription>
                    </Alert>
                  )}
                  {ticketRedeemed === true && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This prize has already been claimed.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {isLoadingTicket || prizeAmount === undefined ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-3">Loading prize data...</span>
                    </div>
                  ) : (
                    <>
                      <PrizeAnimation 
                        prizeAmount={prizeAmount} 
                        onAnimationComplete={handleAnimationComplete}
                      />
                      
                      {/* Claim UI - shown after animation completes */}
                      {showClaimUI && prizeAmount > 0n && !ticketRedeemed && (
                        <div className="space-y-4 pt-4 border-t">
                          {isClaimSuccess ? (
                            <>
                              <Alert className="bg-green-50 border-green-200">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                  Prize claimed successfully! The funds have been transferred to your wallet.
                                </AlertDescription>
                              </Alert>
                              
                              {/* Social sharing after successful claim */}
                              <ShareButtons prizeAmount={prizeAmount} lotteryId={lottery} />
                            </>
                          ) : (
                            <>
                              <div className="bg-muted p-4 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Gross Prize:</span>
                                  <span className="font-mono font-semibold">
                                    {formatEther(prizeAmount)} ETH
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Gas Cost:</span>
                                  <span className="font-mono text-red-600">
                                    -{formatEther(gasCost)} ETH
                                  </span>
                                </div>
                                <div className="flex justify-between text-base font-semibold pt-2 border-t">
                                  <span>Net Prize:</span>
                                  <span className="font-mono text-green-600">
                                    {formatEther(netPrize)} ETH
                                  </span>
                                </div>
                              </div>

                              <Button
                                onClick={handleClaim}
                                size="lg"
                                className="w-full"
                                disabled={isClaimLoading || netPrize <= 0n}
                              >
                                {isClaimLoading ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Claiming Prize...
                                  </>
                                ) : (
                                  'Claim Prize'
                                )}
                              </Button>

                              {claimError && (
                                <Alert variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    {claimError.message || 'Failed to claim prize. Please try again.'}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {netPrize <= 0n && (
                                <Alert variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    Prize amount is too small to cover gas costs. Cannot claim.
                                  </AlertDescription>
                                </Alert>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {showClaimUI && ticketRedeemed && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            This prize has already been claimed.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </div>
              )}
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
