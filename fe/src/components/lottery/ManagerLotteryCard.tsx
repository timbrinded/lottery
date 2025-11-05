import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { formatEther } from "viem";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Countdown } from "@/components/shared/Countdown";
import { useRevealLottery } from "@/hooks/useRevealLottery";
import { useRefundLottery } from "@/hooks/useRefundLottery";
import { RevealLotteryModal } from "@/components/lottery/RevealLotteryModal";
import { RestoreSecretModal } from "@/components/lottery/RestoreSecretModal";
import { ViewTicketsModal } from "@/components/lottery/ViewTicketsModal";
import { useLotterySecrets } from "@/hooks/useLotterySecrets";
import { formatAbsoluteTime } from "@/hooks/useFriendlyTime";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Key, AlertTriangle, ExternalLink } from "lucide-react";

type LotteryState = "Pending" | "CommitOpen" | "RevealOpen" | "Finalized";

interface LotteryData {
  id: bigint;
  creator: string;
  creatorCommitment: `0x${string}`;
  totalPrizePool: bigint;
  numberOfTickets: bigint;
  commitDeadline: bigint;
  revealTime: bigint;
  claimDeadline: bigint;
  state: number;
  createdAt: bigint;
}

interface ManagerLotteryCardProps {
  lottery: LotteryData;
}

function getStateString(state: number): LotteryState {
  const states: LotteryState[] = [
    "Pending",
    "CommitOpen",
    "RevealOpen",
    "Finalized",
  ];
  return states[state] || "Pending";
}

function getStateBadgeVariant(
  state: LotteryState
): "default" | "secondary" | "destructive" | "outline" {
  switch (state) {
    case "CommitOpen":
      return "default";
    case "RevealOpen":
      return "default";
    case "Finalized":
      return "outline";
    default:
      return "secondary";
  }
}

export function ManagerLotteryCard({ lottery }: ManagerLotteryCardProps) {
  const state = getStateString(lottery.state);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const { hasSecret, getSecret } = useLotterySecrets();

  // Safely format prize pool
  const prizePoolDisplay = (() => {
    try {
      return formatEther(lottery.totalPrizePool || 0n);
    } catch (error) {
      console.error("Error formatting prize pool:", error, lottery.totalPrizePool);
      return "0";
    }
  })();

  // Determine next deadline for countdown banner
  const now = Math.floor(Date.now() / 1000);
  const getNextDeadline = () => {
    if (state === "CommitOpen" && now < Number(lottery.commitDeadline)) {
      return {
        label: "Commit Deadline",
        deadline: Number(lottery.commitDeadline),
      };
    }
    if (state === "CommitOpen" && now < Number(lottery.revealTime)) {
      return { label: "Reveal Time", deadline: Number(lottery.revealTime) };
    }
    if (
      state === "RevealOpen" &&
      lottery.claimDeadline > 0n &&
      now < Number(lottery.claimDeadline)
    ) {
      return {
        label: "Claim Deadline",
        deadline: Number(lottery.claimDeadline),
      };
    }
    return null;
  };

  const nextDeadline = getNextDeadline();

  const {
    reveal,
    isLoading: isRevealing,
    isSuccess: revealSuccess,
    error: revealError,
    canReveal,
    timeRemaining,
    committedCount,
  } = useRevealLottery({
    lotteryId: lottery.id,
    state: lottery.state,
    commitDeadline: Number(lottery.commitDeadline),
    revealTime: Number(lottery.revealTime),
  });

  const {
    refund,
    isLoading: isRefunding,
    isSuccess: refundSuccess,
    error: refundError,
    canRefund,
  } = useRefundLottery({
    lotteryId: lottery.id,
    revealTime: Number(lottery.revealTime),
  });

  const handleRevealClick = () => {
    const storedSecret = getSecret(lottery.id);
    if (storedSecret) {
      reveal(storedSecret);
    } else {
      setShowRevealModal(true);
    }
  };

  const handleReveal = (secret: string) => {
    reveal(secret);
  };

  // Close modal on success
  useEffect(() => {
    if (revealSuccess) {
      setShowRevealModal(false);
    }
  }, [revealSuccess]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Lottery #{lottery.id.toString()}</CardTitle>
            <CardDescription>
              {prizePoolDisplay} USDC Prize Pool
            </CardDescription>
          </div>
          <Badge variant={getStateBadgeVariant(state)}>{state}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Countdown Banner with Friendly Time */}
        {nextDeadline && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-900">
                  {nextDeadline.label}:
                </span>
                <Countdown
                  deadline={nextDeadline.deadline}
                  mode="friendly"
                  prefix=""
                />
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Created:</span>
            <span className="text-xs">
              {formatAbsoluteTime(lottery.createdAt)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Tickets:</span>
            <span className="font-medium">
              {lottery.numberOfTickets.toString()}
            </span>
          </div>

          {(state === "Pending" || state === "CommitOpen") && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Commit Deadline:</span>
                <span className="text-xs">
                  {formatAbsoluteTime(lottery.commitDeadline)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Committed Tickets:</span>
                <span className="font-medium">
                  {committedCount} / {lottery.numberOfTickets.toString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Reveal Time:</span>
                {canReveal ? (
                  <span className="font-semibold text-green-600">
                    Ready to reveal!
                  </span>
                ) : lottery.revealTime > 0n && timeRemaining > 0 ? (
                  <span className="text-xs">
                    {formatAbsoluteTime(lottery.revealTime)}
                  </span>
                ) : lottery.revealTime > 0n ? (
                  <span className="font-semibold text-red-600">Passed</span>
                ) : (
                  <span className="text-gray-500">Not set</span>
                )}
              </div>
            </>
          )}

          {state === "RevealOpen" && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Revealed:</span>
                <span className="font-medium text-green-600">✓ Complete</span>
              </div>

              {lottery.claimDeadline > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Claim Deadline:</span>
                  <span className="text-xs">
                    {formatAbsoluteTime(lottery.claimDeadline)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {/* View Details Button */}
          <Link to="/manager/lottery/$id" params={{ id: lottery.id.toString() }}>
            <Button variant="default" size="sm" className="w-full">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </Link>

          {/* Secret Management Button */}
          <Button
            onClick={() => setShowRestoreModal(true)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Key className="mr-2 h-4 w-4" />
            {hasSecret(lottery.id) ? "View Secret" : "Restore Secret"}
          </Button>

          {(state === "Pending" || state === "CommitOpen") && canReveal && (
            <Button
              onClick={handleRevealClick}
              className="w-full"
              disabled={isRevealing}
            >
              {isRevealing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revealing...
                </>
              ) : (
                "Reveal Lottery"
              )}
            </Button>
          )}

          {(state === "Pending" || state === "CommitOpen") &&
            !canReveal &&
            timeRemaining <= 0 &&
            committedCount === 0 && (
              <>
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">
                    <strong>No Committed Tickets!</strong>
                    <br />
                    Need at least 1 committed ticket to reveal the lottery.
                    <br />
                    <br />
                    {lottery.revealTime > 0n ? (
                      <>
                        <strong>Refund available in:</strong>
                        <br />
                        <Countdown
                          deadline={Number(lottery.revealTime) + 24 * 60 * 60}
                          mode="friendly"
                        />
                        <br />
                        <span className="text-xs text-muted-foreground">
                          After 24 hours from reveal time, anyone can trigger a
                          refund to return prizes to the creator.
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Refund will be available 24 hours after reveal time.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Button disabled className="w-full">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Reveal Lottery
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Need at least 1 committed ticket</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}

          {(state === "Pending" || state === "CommitOpen") &&
            !canReveal &&
            timeRemaining > 0 && (
              <Alert>
                <AlertDescription className="text-sm">
                  Waiting for reveal time...
                  <br />
                  <Countdown
                    deadline={Number(lottery.revealTime)}
                    mode="friendly"
                    prefix="Ready in"
                  />
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {committedCount} ticket{committedCount !== 1 ? "s" : ""}{" "}
                    committed
                  </span>
                </AlertDescription>
              </Alert>
            )}

          {(state === "Pending" || state === "CommitOpen") && canRefund && (
            <Button
              onClick={refund}
              disabled={isRefunding}
              variant="destructive"
              className="w-full"
            >
              {isRefunding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refunding...
                </>
              ) : (
                "Refund Lottery (Not Revealed)"
              )}
            </Button>
          )}

          {revealSuccess && (
            <Alert>
              <AlertDescription className="text-sm text-green-600">
                Lottery revealed successfully! Prizes have been assigned.
              </AlertDescription>
            </Alert>
          )}

          {revealError && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                {revealError.message}
              </AlertDescription>
            </Alert>
          )}

          {refundSuccess && (
            <Alert>
              <AlertDescription className="text-sm text-green-600">
                Lottery refunded successfully! Prizes returned to creator.
              </AlertDescription>
            </Alert>
          )}

          {refundError && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                {refundError.message}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>

      {/* Reveal Modal */}
      <RevealLotteryModal
        open={showRevealModal}
        onOpenChange={setShowRevealModal}
        lotteryId={lottery.id}
        creatorCommitment={lottery.creatorCommitment}
        onReveal={handleReveal}
        isRevealing={isRevealing}
        error={revealError}
      />

      {/* Restore Secret Modal */}
      <RestoreSecretModal
        open={showRestoreModal}
        onOpenChange={setShowRestoreModal}
        lotteryId={lottery.id}
        creatorCommitment={lottery.creatorCommitment}
        onViewTickets={() => {
          setShowRestoreModal(false);
          setShowTicketsModal(true);
        }}
      />

      {/* View Tickets Modal */}
      <ViewTicketsModal
        open={showTicketsModal}
        onOpenChange={setShowTicketsModal}
        lotteryId={lottery.id}
      />
    </Card>
  );
}
