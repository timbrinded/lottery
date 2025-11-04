import { formatEther } from "viem";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Trophy, ExternalLink } from "lucide-react";

interface WinningAlertProps {
  lotteryId: bigint;
  prizeAmount: bigint;
  className?: string;
}

export function WinningAlert({ lotteryId, prizeAmount, className = "" }: WinningAlertProps) {
  return (
    <Alert className={`bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 ${className}`}>
      <Trophy className="h-5 w-5 text-yellow-600" />
      <AlertTitle className="text-yellow-900 font-bold">
        🎉 Congratulations! You Won!
      </AlertTitle>
      <AlertDescription className="text-yellow-900">
        <div className="mt-2 space-y-3">
          <p>
            You have an unclaimed prize in Lottery #{lotteryId.toString()}
          </p>
          <div className="flex items-center justify-between p-3 bg-white/50 rounded-md">
            <span className="font-medium">Prize Amount:</span>
            <span className="font-mono font-bold text-lg text-yellow-700">
              {formatEther(prizeAmount)} USDC
            </span>
          </div>
          <Link to="/participant/lottery/$id" params={{ id: lotteryId.toString() }}>
            <Button variant="default" size="sm" className="w-full bg-yellow-600 hover:bg-yellow-700">
              <ExternalLink className="mr-2 h-4 w-4" />
              Claim Your Prize
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}
