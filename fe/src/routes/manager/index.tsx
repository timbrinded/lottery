import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount, useReadContracts } from "wagmi";
import { useState, useEffect, useMemo } from "react";
import {
  useReadLotteryFactory,
  useWatchLotteryFactoryEvent,
  useLotteryFactoryAddress,
} from "@/contracts/hooks";
import { Button } from "@/components/ui/button";
import { ManagerLotteryCard } from "@/components/lottery/ManagerLotteryCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ContractNotDeployed } from "@/components/ContractNotDeployed";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { LOTTERY_FACTORY_ABI } from "@/contracts/LotteryFactory";

export const Route = createFileRoute("/manager/")({
  component: ManagerDashboard,
});

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

function ManagerDashboard() {
  const { address, isConnected } = useAccount();
  const contractAddress = useLotteryFactoryAddress();
  const [lotteries, setLotteries] = useState<LotteryData[]>([]);
  const [filter, setFilter] = useState<
    "all" | "active" | "pending-reveal" | "revealed" | "finalized"
  >("all");

  // Get lottery counter to know how many lotteries exist
  const { data: lotteryCounter, isLoading: isCounterLoading } =
    useReadLotteryFactory("lotteryCounter", []);

  // Build contract calls for all lotteries
  const lotteryIds = useMemo(() => {
    if (!lotteryCounter) return [];
    const count = Number(lotteryCounter);
    const ids = [];
    for (let i = 1; i < count; i++) {
      ids.push(BigInt(i));
    }
    return ids;
  }, [lotteryCounter]);

  // Fetch all lottery data in parallel using getLotteryStatus
  const { data: lotteriesData, isLoading: isLotteriesLoading } =
    useReadContracts({
      contracts: lotteryIds.map((id) => ({
        address: contractAddress as `0x${string}`,
        abi: LOTTERY_FACTORY_ABI as any,
        functionName: "getLotteryStatus",
        args: [id],
      })),
      query: {
        enabled: !!contractAddress && lotteryIds.length > 0,
        refetchInterval: 10000,
      },
    });

  // Fetch creator and prize pool info separately
  const { data: lotteryDetailsData } = useReadContracts({
    contracts: lotteryIds.map((id) => ({
      address: contractAddress as `0x${string}`,
      abi: LOTTERY_FACTORY_ABI as any,
      functionName: "lotteries",
      args: [id],
    })),
    query: {
      enabled: !!contractAddress && lotteryIds.length > 0,
      refetchInterval: 10000,
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
      refetchInterval: 10000,
    },
  });

  // Process lottery data and filter by creator
  useEffect(() => {
    if (!lotteriesData || !address) {
      setLotteries([]);
      return;
    }

    const userLotteries: LotteryData[] = [];

    lotteriesData.forEach((result, index) => {
      const detailsResult = lotteryDetailsData?.[index];

      if (
        result.status === "success" &&
        result.result &&
        detailsResult?.status === "success" &&
        detailsResult.result
      ) {
        const statusData = result.result as any[];
        const detailsData = detailsResult.result as any[];
        const creator = detailsData[0] as string;

        // Only include lotteries created by the connected user
        if (creator && creator.toLowerCase() === address.toLowerCase()) {
          const ticketCountData = ticketCountsData?.[index];
          const ticketCount =
            ticketCountData?.status === "success"
              ? (ticketCountData.result as any[]).length
              : 0;

          userLotteries.push({
            id: lotteryIds[index],
            creator: creator,
            creatorCommitment: detailsData[1] as `0x${string}`,
            totalPrizePool: detailsData[2] as bigint,
            numberOfTickets: BigInt(ticketCount),
            commitDeadline: statusData[1] as bigint,
            revealTime: statusData[2] as bigint,
            claimDeadline: statusData[3] as bigint,
            state: Number(statusData[0]),
            createdAt: statusData[4] as bigint,
          });
        }
      }
    });

    setLotteries(userLotteries);
  }, [lotteriesData, lotteryDetailsData, ticketCountsData, address, lotteryIds]);

  const isLoading = isCounterLoading || isLotteriesLoading;

  // Watch for new lottery creation events
  useWatchLotteryFactoryEvent("LotteryCreated", (logs) => {
    if (!address) return;

    logs.forEach((log: any) => {
      if (log.args.creator?.toLowerCase() === address.toLowerCase()) {
        const newLottery: LotteryData = {
          id: log.args.lotteryId,
          creator: log.args.creator,
          creatorCommitment:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          totalPrizePool: log.args.totalPrizePool,
          numberOfTickets: log.args.numberOfTickets,
          commitDeadline: log.args.commitDeadline,
          revealTime: log.args.revealTime,
          claimDeadline: BigInt(0),
          state: 1,
          createdAt: BigInt(Math.floor(Date.now() / 1000)),
        };
        setLotteries((prev) => [newLottery, ...prev]);
      }
    });
  });

  const filteredLotteries = useMemo(() => {
    if (filter === "all") {
      return lotteries;
    }

    const now = Math.floor(Date.now() / 1000);

    return lotteries.filter((lottery) => {
      const state = lottery.state;

      switch (filter) {
        case "active":
          return state === 1; // CommitOpen
        case "pending-reveal":
          return (
            state === 1 &&
            now >= Number(lottery.commitDeadline) &&
            now < Number(lottery.revealTime)
          );
        case "revealed":
          return state === 2; // RevealOpen
        case "finalized":
          return state === 3; // Finalized
        default:
          return true;
      }
    });
  }, [lotteries, filter]);

  // Check if contract is deployed
  if (!contractAddress) {
    return <ContractNotDeployed />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        <Link to="/manager/create">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create New Lottery
          </Button>
        </Link>
      </div>

      {!isConnected ? (
        <Alert>
          <AlertDescription>
            Connect your wallet to view your lotteries
          </AlertDescription>
        </Alert>
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
            lotteries.length === 0 ? (
              <EmptyState
                illustration="/iso/lg/skeleton.png"
                title="No lotteries yet"
                description="Create your first lottery to start distributing mystery prizes to participants."
                action={
                  <Link to="/manager/create">
                    <Button size="lg" className="gap-2">
                      <Plus className="h-5 w-5" />
                      Create Your First Lottery
                    </Button>
                  </Link>
                }
              />
            ) : (
              <Alert>
                <AlertDescription>
                  No lotteries found with filter: {filter}
                </AlertDescription>
              </Alert>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLotteries.map((lottery) => (
                <ManagerLotteryCard
                  key={lottery.id.toString()}
                  lottery={lottery}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
