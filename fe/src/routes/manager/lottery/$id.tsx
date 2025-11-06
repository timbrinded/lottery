import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount, useReadContracts } from "wagmi";
import { useState, useEffect, useMemo } from "react";
import { formatEther } from "viem";
import {
  useLotteryFactoryAddress,
} from "@/contracts/hooks";
import { LOTTERY_FACTORY_ABI } from "@/contracts/LotteryFactory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Countdown } from "@/components/shared/Countdown";
import { formatAbsoluteTime } from "@/hooks/useFriendlyTime";
import { useRevealLottery } from "@/hooks/useRevealLottery";
import { useRefundLottery } from "@/hooks/useRefundLottery";
import { RevealLotteryModal } from "@/components/lottery/RevealLotteryModal";
import { RestoreSecretModal } from "@/components/lottery/RestoreSecretModal";
import { ViewTicketsModal } from "@/components/lottery/ViewTicketsModal";
import { useLotterySecrets } from "@/hooks/useLotterySecrets";
import { TicketStatusTable } from "@/components/lottery/TicketStatusTable";
import { StatisticsPanel } from "@/components/lottery/StatisticsPanel";
import {
  Loader2,
  ArrowLeft,
  Key,
  Eye,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/manager/lottery/$id")({
  component: ManagerLotteryDetail,
});

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

function ManagerLotteryDetail() {
  const { id } = Route.useParams();
  const { address, isConnected } = useAccount();
  const contractAddress = useLotteryFactoryAddress();
  const [lottery, setLottery] = useState<LotteryData | null>(null);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const { hasSecret, getSecret } = useLotterySecrets();

  const lotteryId = BigInt(id);

  // Fetch lottery status
  const { data: statusData, isLoading: isLoadingStatus } = useReadContracts({
    contracts: [
      {
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: "getLotteryStatus",
        args: [lotteryId],
      },
    ],
    query: {
      enabled: !!contractAddress,
      refetchInterval: 5000,
    },
  });

  // Fetch lottery details
  const { data: detailsData } = useReadContracts({
    contracts: [
      {
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: "lotteries",
        args: [lotteryId],
      },
    ],
    query: {
      enabled: !!contractAddress,
      refetchInterval: 5000,
    },
  });

  // Fetch ticket count
  const { data: ticketsData } = useReadContracts({
    contracts: [
      {
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: "getLotteryTickets",
        args: [lotteryId],
      },
    ],
    query: {
      enabled: !!contractAddress,
      refetchInterval: 5000,
    },
  });

  // Process lottery data
  useEffect(() => {
    if (
      statusData?.[0]?.status === "success" &&
      detailsData?.[0]?.status === "success"
    ) {
      const status = statusData[0].result as any[];
      const details = detailsData[0].result as any[];
      const tickets = ticketsData?.[0]?.status === "success"
        ? (ticketsData[0].result as any[])
        : [];

      setLottery({
        id: lotteryId,
        creator: details[0] as string,
        creatorCommitment: details[1] as `0x${string}`,
        totalPrizePool: details[2] as bigint,
        numberOfTickets: BigInt(tickets.length),
        commitDeadline: status[1] as bigint,
        revealTime: status[2] as bigint,
        claimDeadline: status[3] as bigint,
        state: Number(status[0]),
        createdAt: status[4] as bigint,
      });
    }
  }, [statusData, detailsData, ticketsData, lotteryId]);

  // Reveal lottery hook
  const {
    reveal,
    isLoading: isRevealing,
    isSuccess: revealSuccess,
    error: revealError,
    canReveal,
    timeRemaining,
    committedCount,
  } = useRevealLottery({
    lotteryId,
    state: lottery?.state || 0,
    commitDeadline: Number(lottery?.commitDeadline || 0),
    revealTime: Number(lottery?.revealTime || 0),
  });

  // Refund lottery hook
  const {
    refund,
    isLoading: isRefunding,
    isSuccess: refundSuccess,
    error: refundError,
    canRefund,
  } = useRefundLottery({
    lotteryId,
    revealTime: Number(lottery?.revealTime || 0),
  });

  const handleRevealClick = () => {
    if (!lottery) return;
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

  // Check if user is the creator
  const isCreator = useMemo(() => {
    if (!lottery || !address) return false;
    return lottery.creator.toLowerCase() === address.toLowerCase();
  }, [lottery, address]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            Connect your wallet to view lottery details
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoadingStatus || !lottery) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You are not the creator of this lottery
          </AlertDescription>
        </Alert>
        <Link to="/manager">
          <Button className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const state = getStateString(lottery.state);
  const prizePoolDisplay = formatEther(lottery.totalPrizePool || 0n);

  // Determine next deadline
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/manager">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lottery #{lottery.id.toString()}</h1>
            <p className="text-muted-foreground mt-1">
              Created {formatAbsoluteTime(lottery.createdAt)}
            </p>
          </div>
          <Badge variant={getStateBadgeVariant(state)} className="text-lg px-4 py-2">
            {state}
          </Badge>
        </div>
      </div>

      {/* Countdown Banner */}
      {nextDeadline && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
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

      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prize Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{prizePoolDisplay} USDC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {committedCount} / {lottery.numberOfTickets.toString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              tickets committed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lottery.numberOfTickets.toString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* View Tickets Button */}
            {hasSecret(lottery.id) && (
              <Button
                onClick={() => setShowTicketsModal(true)}
                variant="outline"
                className="w-full"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Ticket Status
              </Button>
            )}

            {/* Secret Management Button */}
            <Button
              onClick={() => setShowRestoreModal(true)}
              variant="outline"
              className="w-full"
            >
              <Key className="mr-2 h-4 w-4" />
              {hasSecret(lottery.id) ? "View Secret" : "Restore Secret"}
            </Button>
          </div>

          {/* Reveal Button */}
          {(state === "Pending" || state === "CommitOpen") && canReveal && (
            <Button
              onClick={handleRevealClick}
              className="w-full"
              disabled={isRevealing}
              size="lg"
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

          {/* Waiting for reveal time */}
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

          {/* No committed tickets warning */}
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
                      <Button disabled className="w-full" size="lg">
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

          {/* Refund Button */}
          {(state === "Pending" || state === "CommitOpen") && canRefund && (
            <Button
              onClick={refund}
              disabled={isRefunding}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {isRefunding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refunding...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refund Lottery (Not Revealed)
                </>
              )}
            </Button>
          )}

          {/* Success/Error Messages */}
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
        </CardContent>
      </Card>

      {/* Statistics Panel */}
      <StatisticsPanel lotteryId={lotteryId} />

      {/* Ticket Status Table */}
      <TicketStatusTable lotteryId={lotteryId} />

      {/* Modals */}
      <RevealLotteryModal
        open={showRevealModal}
        onOpenChange={setShowRevealModal}
        lotteryId={lottery.id}
        creatorCommitment={lottery.creatorCommitment}
        onReveal={handleReveal}
        isRevealing={isRevealing}
        error={revealError}
      />

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

      <ViewTicketsModal
        open={showTicketsModal}
        onOpenChange={setShowTicketsModal}
        lotteryId={lottery.id}
      />
    </div>
  );
}
