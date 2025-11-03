import {
  createFileRoute,
  useSearch,
  useNavigate,
} from "@tanstack/react-router";
import { useReadLotteryFactory } from "@/contracts/hooks";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/shared/Countdown";
import { TicketCommit } from "@/components/ticket/TicketCommit";
import { PrizeAnimation } from "@/components/ticket/PrizeAnimation";
import { ShareButtons } from "@/components/shared/ShareButtons";
import { useClaimPrize } from "@/hooks/useClaimPrize";
import { parseTicketInput, encodeTicketCode } from "@/lib/crypto";
import { formatErrorForDisplay } from "@/lib/errors";
import { AlertCircle, Ticket, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { formatEther } from "viem";

// Define search params type - use opaque code instead of exposing components
type TicketSearchParams = {
  code?: string; // Base58 encoded ticket code (opaque)
};

export const Route = createFileRoute("/ticket")({
  component: TicketPage,
  validateSearch: (search: Record<string, unknown>): TicketSearchParams => {
    return {
      code: search.code as string | undefined,
    };
  },
});

function TicketPage() {
  const { code } = useSearch({ from: "/ticket" });
  const navigate = useNavigate();
  const [ticketInput, setTicketInput] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  // Decode the ticket code if present
  const decodedTicket = code ? parseTicketInput(code) : null;

  // Extract values (or use defaults for when no code is present)
  const lotteryId = decodedTicket ? BigInt(decodedTicket.lottery) : 0n;
  const ticketIndex = decodedTicket ? parseInt(decodedTicket.ticket) : 0;
  const secret = decodedTicket?.secret || "";

  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP
  // Fetch lottery data (disabled when no code)
  const {
    data: lotteryData,
    isLoading,
    isError,
  } = useReadLotteryFactory("getLotteryStatus", [lotteryId], {
    query: {
      enabled: !!decodedTicket,
      refetchInterval: 10000, // Refetch every 10 seconds to keep data fresh
    },
  });

  // Check localStorage for commit status using useLocalStorage hook
  const localStorageKey = `committed_${lotteryId}_${ticketIndex}`;
  const [hasCommittedLocally, setHasCommittedLocally] = useLocalStorage(
    localStorageKey,
    false
  );

  // State for prize checking
  const [isPrizeChecked, setIsPrizeChecked] = useState(false);
  const [showClaimUI, setShowClaimUI] = useState(false);

  // Determine current phase (only when we have lottery data)
  const state = lotteryData
    ? (lotteryData as [number, bigint, bigint, bigint, bigint])[0]
    : 0;
  const commitDeadline = lotteryData
    ? (lotteryData as [number, bigint, bigint, bigint, bigint])[1]
    : 0n;
  const revealTime = lotteryData
    ? (lotteryData as [number, bigint, bigint, bigint, bigint])[2]
    : 0n;
  const claimDeadline = lotteryData
    ? (lotteryData as [number, bigint, bigint, bigint, bigint])[3]
    : 0n;

  const commitDeadlineSeconds = Number(commitDeadline);
  const revealTimeSeconds = Number(revealTime);
  const claimDeadlineSeconds = Number(claimDeadline);
  const now = Math.floor(Date.now() / 1000);

  const isCommitPhase = state === 1 && now < commitDeadlineSeconds;
  const isWaitingForReveal = state === 1 && now >= commitDeadlineSeconds;
  const isRevealed = state === 2;
  const isFinalized = state === 3;

  // Fetch ticket data when revealed (disabled when not revealed or not checked)
  // Also fetch during commit phase to check if already committed on-chain
  const {
    data: ticketData,
    isLoading: isLoadingTicket,
    refetch: refetchTicket,
  } = useReadLotteryFactory("tickets", [lotteryId, BigInt(ticketIndex)], {
    query: {
      enabled: (isRevealed && isPrizeChecked && !!decodedTicket) || (isCommitPhase && !!decodedTicket),
    },
  });

  // Parse ticket data
  const ticketCommitted = ticketData
    ? (ticketData as readonly [string, boolean, boolean, bigint])[1]
    : undefined;
  const ticketRedeemed = ticketData
    ? (ticketData as readonly [string, boolean, boolean, bigint])[2]
    : undefined;
  const prizeAmount = ticketData
    ? (ticketData as readonly [string, boolean, boolean, bigint])[3]
    : undefined;

  // Claim prize hook (always called, but won't be used when no code)
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

  // Event handlers
  const handleSubmit = () => {
    const trimmedInput = ticketInput.trim();

    if (trimmedInput.match(/^0x[a-fA-F0-9]{64}$/)) {
      setParseError(
        '⚠️ This looks like a transaction hash, not a ticket code. You need the ticket code from the lottery creator (a short base58 string like "2Xk9pQr7vB3mN8cF...").'
      );
      return;
    }

    const parsed = parseTicketInput(trimmedInput);
    if (parsed) {
      let opaqueCode = trimmedInput;

      if (trimmedInput.length < 50 || /[?&=:/]/.test(trimmedInput)) {
        opaqueCode = encodeTicketCode(
          BigInt(parsed.lottery),
          parseInt(parsed.ticket),
          parsed.secret
        );
      }

      navigate({ to: "/ticket", search: { code: opaqueCode } });
    } else {
      setParseError(
        "Invalid ticket format. Please paste your ticket code (compact base58 format) or complete URL."
      );
    }
  };

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

  const getStateBadge = () => {
    if (isFinalized) {
      return <Badge variant="secondary">Finalized</Badge>;
    }
    if (isRevealed) {
      return (
        <Badge variant="default" className="bg-green-600">
          Revealed
        </Badge>
      );
    }
    if (isWaitingForReveal) {
      return <Badge variant="secondary">Waiting for Reveal</Badge>;
    }
    if (isCommitPhase) {
      return (
        <Badge variant="default" className="bg-blue-600">
          Commit Open
        </Badge>
      );
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  // CONDITIONAL RENDERING (not early returns)
  // Show manual entry form if no code provided or invalid
  if (!code || !decodedTicket) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Ticket className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Redeem Your Ticket</CardTitle>
                <CardDescription>
                  Paste your ticket link or redemption code
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How to redeem:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>
                    • Paste the ticket code you received from the lottery
                    creator
                  </li>
                  <li>• Or scan the QR code provided</li>
                  <li>• Accepted formats:</li>
                  <li className="ml-4 text-xs">
                    <strong>Compact code (recommended):</strong>
                  </li>
                  <li className="ml-6 text-xs font-mono text-muted-foreground">
                    2Xk9pQr7vB3mN8cF...
                  </li>
                  <li className="ml-4 text-xs">
                    <strong>Full URL:</strong>
                  </li>
                  <li className="ml-6 text-xs font-mono text-muted-foreground">
                    https://app.com/ticket?code=2Xk9pQr7vB3mN8cF...
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Ticket URL or Code
                </label>
                <textarea
                  placeholder="Paste your ticket link here..."
                  value={ticketInput}
                  onChange={(e) => {
                    setTicketInput(e.target.value);
                    setParseError(null);
                  }}
                  className="w-full px-3 py-2 border rounded-md bg-background font-mono text-sm min-h-[100px] resize-y"
                />
                {parseError && (
                  <p className="text-sm text-destructive mt-2">{parseError}</p>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!ticketInput.trim()}
                className="w-full"
                size="lg"
              >
                View Ticket
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Don't have a ticket? Lottery creators will share ticket links
                with participants.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
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

  // Error state
  if (isError || !lotteryData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load lottery data. The lottery may not exist or there was
            a network error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Ticket className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Mystery Lottery Ticket</h1>
        <div className="flex items-center justify-center gap-3">
          <p className="text-muted-foreground">
            Lottery #{lotteryId.toString()} • Ticket #{ticketIndex}
          </p>
          {getStateBadge()}
        </div>
      </div>

      <div className="space-y-6">
        {/* Commit Phase */}
        {isCommitPhase && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Enter Draw</CardTitle>
              <CardDescription>
                Commit your entry before the deadline to participate in the
                lottery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Commit Deadline:</span>
                <Countdown deadline={commitDeadlineSeconds} />
              </div>

              {/* Check on-chain committed status first, then fall back to localStorage */}
              {(ticketCommitted === true || hasCommittedLocally) && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Entry confirmed!</strong> You've already committed this
                    ticket. Come back after the reveal time to check your prize.
                  </AlertDescription>
                </Alert>
              )}

              {ticketCommitted !== true && !hasCommittedLocally && (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You must enter the draw before the deadline. After the
                      deadline passes, the lottery will be revealed and prizes
                      assigned.
                    </AlertDescription>
                  </Alert>

                  <TicketCommit
                    lotteryId={lotteryId}
                    ticketIndex={ticketIndex}
                    ticketSecret={secret}
                    commitDeadline={commitDeadlineSeconds}
                    revealTime={revealTimeSeconds}
                    onCommitSuccess={() => setHasCommittedLocally(true)}
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Waiting for Reveal */}
        {isWaitingForReveal && (
          <Card>
            <CardHeader>
              <CardTitle>Waiting for Reveal</CardTitle>
              <CardDescription>
                The commit period has ended. Waiting for the lottery creator to
                reveal prizes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Reveal Time:</span>
                <Countdown deadline={revealTimeSeconds} />
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
              {/* Claim Deadline Warning */}
              {claimDeadlineSeconds > 0 && (
                <Alert
                  variant={
                    claimDeadlineSeconds - now < 3600
                      ? "destructive"
                      : claimDeadlineSeconds - now < 21600
                        ? "default"
                        : "default"
                  }
                  className={
                    claimDeadlineSeconds - now < 3600
                      ? "animate-pulse"
                      : claimDeadlineSeconds - now < 21600
                        ? "border-yellow-500 bg-yellow-50"
                        : ""
                  }
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>
                      ⚠️ Claim within 24 hours or prize goes to rollover pool!
                    </strong>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm">Claim deadline:</span>
                      <Countdown deadline={claimDeadlineSeconds} />
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              {!isPrizeChecked ? (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Ready to see if you won? Click the button below to check
                    your prize.
                  </p>
                  <Button
                    onClick={handleCheckPrize}
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={
                      ticketCommitted === false || ticketRedeemed === true
                    }
                    title={
                      ticketCommitted === false
                        ? "You did not commit before the deadline"
                        : ticketRedeemed === true
                          ? "Prize already claimed"
                          : "Check your prize"
                    }
                  >
                    Check Prize
                  </Button>
                  {ticketCommitted === false && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Not eligible:</strong> You did not commit before
                        the deadline. This ticket is not eligible for prizes.
                      </AlertDescription>
                    </Alert>
                  )}
                  {ticketRedeemed === true && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Prize already claimed:</strong> This ticket's
                        prize has already been redeemed.
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
                                  Prize claimed successfully! The funds have
                                  been transferred to your wallet.
                                </AlertDescription>
                              </Alert>

                              {/* Social sharing after successful claim */}
                              <ShareButtons
                                prizeAmount={prizeAmount}
                                lotteryId={lotteryId.toString()}
                              />
                            </>
                          ) : (
                            <>
                              <div className="bg-muted p-4 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    Gross Prize:
                                  </span>
                                  <span className="font-mono font-semibold">
                                    {formatEther(prizeAmount)} ETH
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    Gas Cost:
                                  </span>
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
                                  "Claim Prize"
                                )}
                              </Button>

                              {claimError && (
                                <Alert variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    <strong>
                                      {formatErrorForDisplay(claimError).title}:
                                    </strong>{" "}
                                    {
                                      formatErrorForDisplay(claimError)
                                        .description
                                    }
                                  </AlertDescription>
                                </Alert>
                              )}

                              {netPrize <= 0n && (
                                <Alert variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    Prize amount is too small to cover gas
                                    costs. Cannot claim.
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
        {!isCommitPhase &&
          !isWaitingForReveal &&
          !isRevealed &&
          !isFinalized &&
          now >= commitDeadlineSeconds && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Commit period closed:</strong> The deadline has passed.
                You can no longer enter this lottery.
              </AlertDescription>
            </Alert>
          )}

        {/* Finalized State */}
        {isFinalized && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Lottery finalized:</strong> This lottery has been
              completed. All unclaimed prizes have been forfeited to the
              rollover pool.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
