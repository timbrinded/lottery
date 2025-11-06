import { formatEther } from "viem";
import { Link } from "@tanstack/react-router";
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
import { CheckCircle, ExternalLink, Trophy } from "lucide-react";

interface LotteryData {
  id: bigint;
  totalPrizePool: bigint;
  commitDeadline: bigint;
  revealTime: bigint;
  claimDeadline: bigint;
  state: number;
  hasWon?: boolean;
  prizeAmount?: bigint;
  isClaimed?: boolean;
}

interface ParticipantLotteryCardProps {
  lottery: LotteryData;
}

function getPhaseDescription(state: number, now: number, commitDeadline: number): string {
  if (state === 1 && now < commitDeadline) {
    return "Commit Phase";
  }
  if (state === 1 && now >= commitDeadline) {
    return "Awaiting Reveal";
  }
  if (state === 2) {
    return "Claim Period";
  }
  if (state === 3) {
    return "Finalized";
  }
  return "Pending";
}

function getStateBadgeVariant(
  state: number
): "default" | "secondary" | "destructive" | "outline" {
  if (state === 1) return "default";
  if (state === 2) return "default";
  if (state === 3) return "outline";
  return "secondary";
}

export function ParticipantLotteryCard({ lottery }: ParticipantLotteryCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const phase = getPhaseDescription(
    lottery.state,
    now,
    Number(lottery.commitDeadline)
  );

  // Determine next deadline
  const getNextDeadline = () => {
    if (lottery.state === 1 && now < Number(lottery.commitDeadline)) {
      return {
        label: "Commit ends",
        deadline: Number(lottery.commitDeadline),
      };
    }
    if (lottery.state === 1 && now < Number(lottery.revealTime)) {
      return {
        label: "Reveal time",
        deadline: Number(lottery.revealTime),
      };
    }
    if (
      lottery.state === 2 &&
      lottery.claimDeadline > 0n &&
      now < Number(lottery.claimDeadline)
    ) {
      return {
        label: "Claim by",
        deadline: Number(lottery.claimDeadline),
      };
    }
    return null;
  };

  const nextDeadline = getNextDeadline();
  const isRevealed = lottery.state === 2 || lottery.state === 3;
  const hasWon = lottery.hasWon === true;
  const isClaimed = lottery.isClaimed === true;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-2 top-2 opacity-5 pointer-events-none">
        <img src={hasWon ? "/iso/lg/chest.png" : "/iso/lg/ticket.png"} alt="" className="w-24 h-24 object-contain" />
      </div>
      <CardHeader className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Lottery #{lottery.id.toString()}
              {hasWon && !isClaimed && (
                <Trophy className="h-5 w-5 text-yellow-500" />
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-1">
              <img src="/iso/sm/coins.png" alt="" className="w-3.5 h-3.5 object-contain opacity-60" />
              {formatEther(lottery.totalPrizePool)} USDC Prize Pool
            </CardDescription>
          </div>
          <Badge variant={getStateBadgeVariant(lottery.state)}>{phase}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Winning Alert */}
        {hasWon && !isClaimed && isRevealed && (
          <Alert className="bg-yellow-50 border-yellow-200 relative overflow-hidden">
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
              <img src="/iso/sm/chest.png" alt="" className="w-12 h-12 object-contain" />
            </div>
            <Trophy className="h-4 w-4 text-yellow-600 relative z-10" />
            <AlertDescription className="text-yellow-900 relative z-10">
              <strong>You won!</strong> Prize:{" "}
              <span className="font-mono font-semibold">
                {lottery.prizeAmount ? formatEther(lottery.prizeAmount) : "0"} USDC
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Claimed Status */}
        {hasWon && isClaimed && (
          <Alert className="bg-green-50 border-green-200 relative overflow-hidden">
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
              <img src="/iso/sm/bird.png" alt="" className="w-12 h-12 object-contain" />
            </div>
            <CheckCircle className="h-4 w-4 text-green-600 relative z-10" />
            <AlertDescription className="text-green-900 relative z-10">
              <strong>Prize claimed!</strong> You received{" "}
              <span className="font-mono font-semibold">
                {lottery.prizeAmount ? formatEther(lottery.prizeAmount) : "0"} USDC
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Countdown Banner */}
        {nextDeadline && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <img src="/iso/sm/hourglass.png" alt="" className="w-4 h-4 object-contain opacity-70" />
              <span className="text-sm font-medium">{nextDeadline.label}:</span>
            </div>
            <Countdown
              deadline={nextDeadline.deadline}
              mode="friendly"
              prefix=""
            />
          </div>
        )}

        {/* View Details Button */}
        <Link to="/participant/lottery/$id" params={{ id: lottery.id.toString() }}>
          <Button variant="default" size="sm" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
