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
import { CheckCircle, ExternalLink, Trophy, Clock } from "lucide-react";

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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Lottery #{lottery.id.toString()}
              {hasWon && !isClaimed && (
                <Trophy className="h-5 w-5 text-yellow-500" />
              )}
            </CardTitle>
            <CardDescription>
              {formatEther(lottery.totalPrizePool)} USDC Prize Pool
            </CardDescription>
          </div>
          <Badge variant={getStateBadgeVariant(lottery.state)}>{phase}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Winning Alert */}
        {hasWon && !isClaimed && isRevealed && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>You won!</strong> Prize:{" "}
              <span className="font-mono font-semibold">
                {lottery.prizeAmount ? formatEther(lottery.prizeAmount) : "0"} USDC
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Claimed Status */}
        {hasWon && isClaimed && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
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
              <Clock className="h-4 w-4 text-muted-foreground" />
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
