import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { useLotteryFactoryAddress } from "@/contracts/hooks";
import { LOTTERY_FACTORY_ABI } from "@/contracts/LotteryFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Trophy, CheckCircle, XCircle } from "lucide-react";

interface StatisticsPanelProps {
  lotteryId: bigint;
}

interface Statistics {
  totalGenerated: number;
  committed: number;
  uncommitted: number;
  winners: number;
  claimed: number;
  unclaimed: number;
  totalPrizesClaimed: bigint;
  totalPrizesUnclaimed: bigint;
}

export function StatisticsPanel({ lotteryId }: StatisticsPanelProps) {
  const contractAddress = useLotteryFactoryAddress();

  // Fetch all tickets for the lottery
  const { data: ticketsData, isLoading: isLoadingTickets } = useReadContracts({
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

  const ticketHashes =
    ticketsData?.[0]?.status === "success"
      ? (ticketsData[0].result as any[])
      : [];

  // Fetch ticket details for each ticket
  const { data: ticketDetails, isLoading: isLoadingDetails } =
    useReadContracts({
      contracts: ticketHashes.map((_, index) => ({
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: "tickets",
        args: [lotteryId, BigInt(index)],
      })),
      query: {
        enabled: !!contractAddress && ticketHashes.length > 0,
        refetchInterval: 5000,
      },
    });

  // Calculate statistics
  const statistics: Statistics = useMemo(() => {
    if (!ticketDetails) {
      return {
        totalGenerated: 0,
        committed: 0,
        uncommitted: 0,
        winners: 0,
        claimed: 0,
        unclaimed: 0,
        totalPrizesClaimed: BigInt(0),
        totalPrizesUnclaimed: BigInt(0),
      };
    }

    let committed = 0;
    let winners = 0;
    let claimed = 0;
    let totalPrizesClaimed = BigInt(0);
    let totalPrizesUnclaimed = BigInt(0);

    ticketDetails.forEach((result) => {
      if (result.status === "success" && result.result) {
        const data = result.result as any;

        // Handle both array and object result formats
        let isCommitted = false;
        let isRedeemed = false;
        let prizeAmount = BigInt(0);

        if (Array.isArray(data)) {
          isCommitted = data[1];
          isRedeemed = data[2];
          prizeAmount = data[3];
        } else if (typeof data === "object") {
          isCommitted =
            data.committed !== undefined ? data.committed : data[1];
          isRedeemed = data.redeemed !== undefined ? data.redeemed : data[2];
          prizeAmount =
            data.prizeAmount !== undefined ? data.prizeAmount : data[3];
        }

        if (isCommitted) {
          committed++;
        }

        if (prizeAmount > 0n) {
          winners++;
          if (isRedeemed) {
            claimed++;
            totalPrizesClaimed += prizeAmount;
          } else {
            totalPrizesUnclaimed += prizeAmount;
          }
        }
      }
    });

    return {
      totalGenerated: ticketDetails.length,
      committed,
      uncommitted: ticketDetails.length - committed,
      winners,
      claimed,
      unclaimed: winners - claimed,
      totalPrizesClaimed,
      totalPrizesUnclaimed,
    };
  }, [ticketDetails]);

  const isLoading = isLoadingTickets || isLoadingDetails;

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const commitRate =
    statistics.totalGenerated > 0
      ? ((statistics.committed / statistics.totalGenerated) * 100).toFixed(1)
      : "0";

  const claimRate =
    statistics.winners > 0
      ? ((statistics.claimed / statistics.winners) * 100).toFixed(1)
      : "0";

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Ticket Participation */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Participation</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {statistics.committed}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {statistics.totalGenerated} tickets
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {commitRate}% commit rate
              </p>
            </div>
          </div>

          {/* Winners */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">Winners</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{statistics.winners}</span>
                <span className="text-sm text-muted-foreground">
                  {statistics.winners === 1 ? "winner" : "winners"}
                </span>
              </div>
              {statistics.winners > 0 && (
                <p className="text-xs text-muted-foreground">
                  {((statistics.winners / statistics.committed) * 100).toFixed(
                    1
                  )}
                  % of participants
                </p>
              )}
            </div>
          </div>

          {/* Prizes Claimed */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Claimed</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{statistics.claimed}</span>
                <span className="text-sm text-muted-foreground">prizes</span>
              </div>
              {statistics.totalPrizesClaimed > 0n && (
                <p className="text-xs text-muted-foreground">
                  {formatEther(statistics.totalPrizesClaimed)} USDC
                </p>
              )}
              {statistics.winners > 0 && (
                <p className="text-xs text-muted-foreground">
                  {claimRate}% claim rate
                </p>
              )}
            </div>
          </div>

          {/* Prizes Unclaimed */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Unclaimed</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {statistics.unclaimed}
                </span>
                <span className="text-sm text-muted-foreground">prizes</span>
              </div>
              {statistics.totalPrizesUnclaimed > 0n && (
                <p className="text-xs text-muted-foreground">
                  {formatEther(statistics.totalPrizesUnclaimed)} USDC
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
