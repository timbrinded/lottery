import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount, useReadContracts } from "wagmi";
import { useState, useEffect, useMemo } from "react";
import { formatEther } from "viem";
import { useLotteryFactoryAddress } from "@/contracts/hooks";
import { LOTTERY_FACTORY_ABI } from "@/contracts/LotteryFactory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Countdown } from "@/components/shared/Countdown";
import { formatAbsoluteTime } from "@/hooks/useFriendlyTime";
import { useUserParticipations } from "@/hooks/useUserParticipations";
import { useParticipantTickets } from "@/hooks/useParticipantTickets";
import { encodeTicketCode } from "@/lib/crypto";
import {
  Loader2,
  ArrowLeft,
  Trophy,
  CheckCircle,
  Clock,
  Ticket,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/participant/lottery/$id")({
  component: ParticipantLotteryDetail,
});

type LotteryState = "Pending" | "CommitOpen" | "RevealOpen" | "Finalized";

interface LotteryData {
  id: bigint;
  creator: string;
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

function ParticipantLotteryDetail() {
  const { id } = Route.useParams();
  const { isConnected } = useAccount();
  const contractAddress = useLotteryFactoryAddress();
  const [lottery, setLottery] = useState<LotteryData | null>(null);
  const { participations } = useUserParticipations();
  const { getTicketSecret } = useParticipantTickets();

  const lotteryId = BigInt(id);

  // Find user's participation for this lottery
  const userParticipation = useMemo(() => {
    return participations.find((p) => p.lotteryId === lotteryId);
  }, [participations, lotteryId]);

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
      const tickets =
        ticketsData?.[0]?.status === "success"
          ? (ticketsData[0].result as any[])
          : [];

      setLottery({
        id: lotteryId,
        creator: details[0] as string,
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

  // Find winning ticket
  const winningTicket = useMemo(() => {
    if (!userParticipation) return null;
    return userParticipation.tickets.find((t) => t.prizeAmount > 0n);
  }, [userParticipation]);

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

  if (!userParticipation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You have not participated in this lottery
          </AlertDescription>
        </Alert>
        <Link to="/participant">
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
  const isRevealed = lottery.state === 2 || lottery.state === 3;
  const hasWon = !!winningTicket;
  const isClaimed = winningTicket?.redeemed || false;

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link to="/participant">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Lottery #{lottery.id.toString()}
            </h1>
            <p className="text-muted-foreground mt-1">
              Created {formatAbsoluteTime(lottery.createdAt)}
            </p>
          </div>
          <Badge
            variant={getStateBadgeVariant(state)}
            className="text-lg px-4 py-2"
          >
            {state}
          </Badge>
        </div>
      </div>

      {/* Countdown Banner */}
      {nextDeadline && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Clock className="h-4 w-4 text-blue-600" />
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

      {/* Winning Alert */}
      {hasWon && !isClaimed && isRevealed && (
        <Alert className="mb-6 bg-yellow-50 border-yellow-200">
          <Trophy className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong className="text-lg">🎉 Congratulations! You won!</strong>
            <br />
            <span className="text-2xl font-mono font-bold">
              {formatEther(winningTicket.prizeAmount)} USDC
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Claimed Status */}
      {hasWon && isClaimed && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Prize claimed!</strong> You received{" "}
            <span className="font-mono font-semibold">
              {formatEther(winningTicket.prizeAmount)} USDC
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* No Prize Alert */}
      {!hasWon && isRevealed && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unfortunately, you didn't win a prize in this lottery. Better luck
            next time!
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Prize Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{prizePoolDisplay} USDC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {lottery.numberOfTickets.toString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Your Tickets Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userParticipation.tickets.map((ticket) => (
              <div
                key={ticket.ticketIndex}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Ticket className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Ticket #{ticket.ticketIndex}</p>
                    {isRevealed && ticket.prizeAmount > 0n && (
                      <p className="text-sm text-green-600 font-semibold">
                        Prize: {formatEther(ticket.prizeAmount)} USDC
                      </p>
                    )}
                    {isRevealed && ticket.prizeAmount === 0n && (
                      <p className="text-sm text-muted-foreground">No prize</p>
                    )}
                    {!isRevealed && (
                      <p className="text-sm text-muted-foreground">
                        Awaiting reveal
                      </p>
                    )}
                  </div>
                </div>
                {ticket.redeemed && (
                  <Badge variant="outline" className="bg-green-50">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Claimed
                  </Badge>
                )}
                {!ticket.redeemed && ticket.prizeAmount > 0n && isRevealed && (
                  <Badge variant="default">Winner</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Claim Prize Instructions */}
      {hasWon && !isClaimed && isRevealed && (() => {
        const storedSecret = getTicketSecret(lotteryId, winningTicket.ticketIndex);
        
        return (
          <Card>
            <CardHeader>
              <CardTitle>Claim Your Prize</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert className="bg-yellow-50 border-yellow-200">
                <Trophy className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-900">
                  <strong>
                    You won {formatEther(winningTicket.prizeAmount)} USDC!
                  </strong>
                  <br />
                  {storedSecret 
                    ? "Click below to claim your prize."
                    : "To claim your prize, you need your original ticket code."}
                </AlertDescription>
              </Alert>
              
              {storedSecret ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your ticket code has been saved. Click the button below to proceed to claiming.
                  </p>
                  <Link 
                    to="/participant/ticket" 
                    search={{ 
                      code: encodeTicketCode(
                        lotteryId, 
                        winningTicket.ticketIndex, 
                        storedSecret
                      ) 
                    }}
                  >
                    <Button className="w-full" size="lg">
                      <Trophy className="mr-2 h-5 w-5" />
                      Claim Prize Now
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Use the ticket code you received from the lottery creator to claim
                    your prize. The code contains the secret needed to verify your win.
                  </p>
                  <Link to="/participant/ticket">
                    <Button className="w-full" size="lg">
                      <Ticket className="mr-2 h-5 w-5" />
                      Enter Ticket Code to Claim
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
