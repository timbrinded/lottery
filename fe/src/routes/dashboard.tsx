import { createFileRoute } from "@tanstack/react-router";
import { useAccount, useReadContracts } from "wagmi";
import { useState, useEffect, useMemo } from "react";
import {
  useReadLotteryFactory,
  useWatchLotteryFactoryEvent,
  useLotteryFactoryAddress,
} from "@/contracts/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/shared/Countdown";
import { useRevealLottery } from "@/hooks/useRevealLottery";
import { useRefundLottery } from "@/hooks/useRefundLottery";
import { RevealLotteryModal } from "@/components/lottery/RevealLotteryModal";
import { RestoreSecretModal } from "@/components/lottery/RestoreSecretModal";
import { ViewTicketsModal } from "@/components/lottery/ViewTicketsModal";
import { ContractNotDeployed } from "@/components/ContractNotDeployed";
import { formatEther } from "viem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Key, AlertTriangle } from "lucide-react";
import { LOTTERY_FACTORY_ABI } from "@/contracts/LotteryFactory";
import { useLotterySecrets } from "@/hooks/useLotterySecrets";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type LotteryState =
  | "Pending"
  | "CommitOpen"
  | "RevealOpen"
  | "Finalized";

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

function DashboardPage() {
  const { address, isConnected } = useAccount();
  const contractAddress = useLotteryFactoryAddress();
  const [lotteries, setLotteries] = useState<LotteryData[]>([]);
  const [filter, setFilter] = useState<
    | "all"
    | "active"
    | "pending-reveal"
    | "revealed"
    | "finalized"
  >("all");

  // Get lottery counter to know how many lotteries exist
  const { data: lotteryCounter, isLoading: isCounterLoading } =
    useReadLotteryFactory("lotteryCounter", []);

  // Build contract calls for all lotteries
  const lotteryIds = useMemo(() => {
    if (!lotteryCounter) return [];
    const count = Number(lotteryCounter);
    const ids = [];
    // lotteryCounter is the next ID to be used, so we fetch from 1 to count-1
    // But if count is 11, we want lotteries 1-10, so we need i < count
    for (let i = 1; i < count; i++) {
      ids.push(BigInt(i));
    }
    console.log(
      "Fetching lottery IDs:",
      ids.map((id) => id.toString())
    );
    return ids;
  }, [lotteryCounter]);

  // Fetch all lottery data in parallel
  const { data: lotteriesData, isLoading: isLotteriesLoading } =
    useReadContracts({
      contracts: lotteryIds.map((id) => ({
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: "lotteries",
        args: [id],
      })),
      query: {
        enabled: !!contractAddress && lotteryIds.length > 0,
        refetchInterval: 10000, // Refetch every 10 seconds to keep data fresh
      },
    });

  // Fetch ticket counts for each lottery
  const { data: ticketCountsData } = useReadContracts({
    contracts: lotteryIds.map((id) => ({
      address: contractAddress as `0x${string}`,
      abi: LOTTERY_FACTORY_ABI as any,
      functionName: "getLotteryTickets",
      args: [id],
    })),
    query: {
      enabled: !!contractAddress && lotteryIds.length > 0,
      refetchInterval: 10000, // Refetch every 10 seconds to keep data fresh
    },
  });

  // Process lottery data and filter by creator
  useEffect(() => {
    if (!lotteriesData || !address) {
      setLotteries([]);
      return;
    }

    console.log(
      "Processing lottery data. Total results:",
      lotteriesData.length
    );
    console.log("Connected address:", address);

    const userLotteries: LotteryData[] = [];

    lotteriesData.forEach((result, index) => {
      const lotteryId = lotteryIds[index];
      console.log(`Processing lottery ${lotteryId}:`, {
        status: result.status,
        hasResult: !!result.result,
      });

      if (result.status === "success" && result.result) {
        // Contract returns tuple as array: [creator, creatorCommitment, totalPrizePool, commitDeadline, revealTime, claimDeadline, randomSeed, state, createdAt, sponsoredGasPool, sponsoredGasUsed]
        // Note: randomnessBlock field removed in new contract version
        const lotteryData = result.result as any[];

        // Check if we have valid data
        if (!lotteryData || lotteryData.length < 10) {
          console.warn(`Invalid lottery data for ID ${lotteryId}`);
          return;
        }

        const creator = lotteryData[0] as string;
        console.log(`Lottery ${lotteryId} creator:`, creator, "vs", address);

        // Only include lotteries created by the connected user
        if (creator && creator.toLowerCase() === address.toLowerCase()) {
          const ticketCountData = ticketCountsData?.[index];
          console.log(`Lottery ${lotteryIds[index]} ticket data:`, {
            status: ticketCountData?.status,
            result: ticketCountData?.result,
            error: ticketCountData?.error,
          });

          const ticketCount =
            ticketCountData?.status === "success"
              ? (ticketCountData.result as any[]).length
              : 0;

          userLotteries.push({
            id: lotteryIds[index],
            creator: creator,
            creatorCommitment: lotteryData[1] as `0x${string}`,
            totalPrizePool: lotteryData[2] as bigint,
            numberOfTickets: BigInt(ticketCount),
            commitDeadline: lotteryData[3] as bigint,
            revealTime: lotteryData[5] as bigint,
            claimDeadline: lotteryData[6] as bigint,
            state: Number(lotteryData[8]),
            createdAt: lotteryData[9] as bigint,
          });
          console.log(`Added lottery ${lotteryIds[index]} to user lotteries`);
        } else {
          console.log(
            `Skipping lottery ${lotteryIds[index]} - creator mismatch`
          );
        }
      }
    });

    console.log("Total user lotteries:", userLotteries.length);
    setLotteries(userLotteries);
  }, [lotteriesData, ticketCountsData, address, lotteryIds]);

  const isLoading = isCounterLoading || isLotteriesLoading;

  // Watch for new lottery creation events
  useWatchLotteryFactoryEvent("LotteryCreated", (logs) => {
    if (!address) return;

    logs.forEach((log: any) => {
      if (log.args.creator?.toLowerCase() === address.toLowerCase()) {
        // Add new lottery to the list
        // Note: creatorCommitment needs to be fetched from contract
        const newLottery: LotteryData = {
          id: log.args.lotteryId,
          creator: log.args.creator,
          creatorCommitment:
            "0x0000000000000000000000000000000000000000000000000000000000000000", // Fetch from contract
          totalPrizePool: log.args.totalPrizePool,
          numberOfTickets: log.args.numberOfTickets,
          commitDeadline: log.args.commitDeadline,
          revealTime: log.args.revealTime,
          claimDeadline: BigInt(0), // Will be set after reveal
          state: 1, // CommitOpen
          createdAt: BigInt(Math.floor(Date.now() / 1000)),
        };
        setLotteries((prev) => [newLottery, ...prev]);
      }
    });
  });

  const filteredLotteries = useMemo(() => {
    console.log(
      "Filtering lotteries. Filter:",
      filter,
      "Total lotteries:",
      lotteries.length
    );

    if (filter === "all") {
      console.log(
        "Showing all lotteries:",
        lotteries.map((l) => l.id.toString())
      );
      return lotteries;
    }

    const now = Math.floor(Date.now() / 1000);

    const filtered = lotteries.filter((lottery) => {
      const state = getStateString(lottery.state);

      let shouldInclude = false;
      switch (filter) {
        case "active":
          shouldInclude = state === "CommitOpen";
          break;
        case "pending-reveal":
          shouldInclude =
            state === "CommitOpen" && now >= Number(lottery.commitDeadline) && now < Number(lottery.revealTime);
          break;
        case "revealed":
          shouldInclude = state === "RevealOpen";
          break;
        case "finalized":
          shouldInclude = state === "Finalized";
          break;
        default:
          shouldInclude = true;
      }

      console.log(
        `Lottery ${lottery.id}: state=${state}, shouldInclude=${shouldInclude}, revealTime=${lottery.revealTime}, now=${now}`
      );
      return shouldInclude;
    });

    console.log(
      "Filtered lotteries:",
      filtered.map((l) => l.id.toString())
    );
    return filtered;
  }, [lotteries, filter]);

  // Check if contract is deployed (after all hooks)
  if (!contractAddress) {
    return <ContractNotDeployed />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Lotteries</h1>

      {!isConnected ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 mb-4">
            Connect your wallet to view your lotteries
          </p>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "active" ? "default" : "outline"}
              onClick={() => setFilter("active")}
            >
              Active
            </Button>
            <Button
              variant={filter === "pending-reveal" ? "default" : "outline"}
              onClick={() => setFilter("pending-reveal")}
            >
              Pending Reveal
            </Button>
            <Button
              variant={filter === "revealed" ? "default" : "outline"}
              onClick={() => setFilter("revealed")}
            >
              Revealed
            </Button>
            <Button
              variant={filter === "finalized" ? "default" : "outline"}
              onClick={() => setFilter("finalized")}
            >
              Finalized
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredLotteries.length === 0 ? (
            <Alert>
              <AlertDescription>
                {filter === "all"
                  ? "You haven't created any lotteries yet. Create your first lottery to get started!"
                  : `No lotteries found with filter: ${filter}`}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLotteries.map((lottery) => (
                <LotteryCard key={lottery.id.toString()} lottery={lottery} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
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

interface LotteryCardProps {
  lottery: LotteryData;
}

function LotteryCard({ lottery }: LotteryCardProps) {
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
      console.error('Error formatting prize pool:', error, lottery.totalPrizePool);
      return '0';
    }
  })();

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

  // Debug logging
  useEffect(() => {
    if (state === "CommitOpen") {
      console.log(`Lottery ${lottery.id} reveal status:`, {
        canReveal,
        timeRemaining,
        committedCount,
        revealTime: lottery.revealTime,
        commitDeadline: lottery.commitDeadline,
        state: lottery.state,
        now: Math.floor(Date.now() / 1000),
      });
    }
  }, [
    canReveal,
    timeRemaining,
    committedCount,
    state,
    lottery.id,
    lottery.revealTime,
    lottery.commitDeadline,
    lottery.state,
  ]);

  const handleReveal = (secret: string) => {
    reveal(secret);
  };

  const handleRevealClick = () => {
    const storedSecret = getSecret(lottery.id);
    if (storedSecret) {
      // Auto-fill with stored secret
      reveal(storedSecret);
    } else {
      // Show modal to enter secret
      setShowRevealModal(true);
    }
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
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Tickets:</span>
            <span className="font-medium">
              {lottery.numberOfTickets.toString()}
            </span>
          </div>

          {state === "CommitOpen" && (
            <div className="flex justify-between">
              <span className="text-gray-600">Commit Deadline:</span>
              <Countdown deadline={Number(lottery.commitDeadline)} />
            </div>
          )}

          {state === "CommitOpen" && (
            <div className="flex justify-between">
              <span className="text-gray-600">Committed Tickets:</span>
              <span className="font-medium">
                {committedCount} / {lottery.numberOfTickets.toString()}
              </span>
            </div>
          )}

          {state === "CommitOpen" && timeRemaining > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Reveal Time:</span>
              <Countdown deadline={Number(lottery.revealTime)} />
            </div>
          )}

          {state === "RevealOpen" && (
            <div className="flex justify-between">
              <span className="text-gray-600">Revealed:</span>
              <span className="font-medium text-green-600">✓ Complete</span>
            </div>
          )}

          {state === "RevealOpen" && lottery.claimDeadline > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Claim Deadline:</span>
              <Countdown deadline={Number(lottery.claimDeadline)} />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {/* View Tickets Button */}
          {hasSecret(lottery.id) && (
            <Button
              onClick={() => setShowTicketsModal(true)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              View Ticket Status
            </Button>
          )}

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

          {state === "CommitOpen" && !canReveal && (
            <Alert variant={committedCount === 0 ? "destructive" : "default"}>
              <AlertDescription className="text-sm">
                {committedCount === 0 ? (
                  <>
                    <strong>No Committed Tickets!</strong>
                    <br />
                    Need at least 1 committed ticket to reveal the lottery.
                    <br />
                    <br />
                    {timeRemaining > 0 ? (
                      <>
                        <strong>Time until reveal:</strong>
                        <br />
                        <span className="font-mono text-yellow-600">
                          {Math.ceil(timeRemaining / 60)} minutes remaining
                        </span>
                      </>
                    ) : (
                      <>
                        <strong>Refund available in:</strong>
                        <br />
                        <Countdown
                          deadline={Number(lottery.revealTime) + 24 * 60 * 60}
                        />
                        <br />
                        <span className="text-xs text-muted-foreground">
                          After 24 hours from reveal time, anyone can trigger a
                          refund to return prizes to the creator.
                        </span>
                      </>
                    )}
                  </>
                ) : timeRemaining > 0 ? (
                  <>
                    Waiting for reveal time...
                    <br />
                    <span className="font-mono text-yellow-600">
                      {Math.ceil(timeRemaining / 60)} minutes remaining
                    </span>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {committedCount} ticket{committedCount !== 1 ? 's' : ''} committed
                    </span>
                  </>
                ) : null}
              </AlertDescription>
            </Alert>
          )}

          {state === "CommitOpen" && canReveal && (
            <Button onClick={handleRevealClick} className="w-full">
              Reveal Lottery
            </Button>
          )}

          {state === "CommitOpen" && !canReveal && timeRemaining <= 0 && committedCount === 0 && (
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
          )}

          {state === "CommitOpen" && canRefund && (
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
