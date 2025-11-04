import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { useLotteryFactoryAddress } from "@/contracts/hooks";
import { LOTTERY_FACTORY_ABI } from "@/contracts/LotteryFactory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface TicketStatusTableProps {
  lotteryId: bigint;
}

interface TicketData {
  index: number;
  holder: string;
  committed: boolean;
  redeemed: boolean;
  prizeAmount: bigint;
}

export function TicketStatusTable({ lotteryId }: TicketStatusTableProps) {
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

  // Process ticket data
  const tickets: TicketData[] = useMemo(() => {
    if (!ticketDetails) return [];

    return ticketDetails.map((result, index) => {
      if (result.status === "success" && result.result) {
        const data = result.result as any;
        
        // Handle both array and object result formats
        let holder = "0x0000000000000000000000000000000000000000";
        let committed = false;
        let redeemed = false;
        let prizeAmount = BigInt(0);

        if (Array.isArray(data)) {
          holder = data[0];
          committed = data[1];
          redeemed = data[2];
          prizeAmount = data[3];
        } else if (typeof data === "object") {
          holder = data.holder || data[0];
          committed = data.committed !== undefined ? data.committed : data[1];
          redeemed = data.redeemed !== undefined ? data.redeemed : data[2];
          prizeAmount =
            data.prizeAmount !== undefined ? data.prizeAmount : data[3];
        }

        return {
          index,
          holder,
          committed,
          redeemed,
          prizeAmount,
        };
      }

      return {
        index,
        holder: "0x0000000000000000000000000000000000000000",
        committed: false,
        redeemed: false,
        prizeAmount: BigInt(0),
      };
    });
  }, [ticketDetails]);

  const isLoading = isLoadingTickets || isLoadingDetails;

  // Calculate stats
  const committedTickets = tickets.filter((t) => t.committed).length;
  const claimedPrizes = tickets.filter((t) => t.redeemed).length;
  const totalPrizes = tickets.filter((t) => t.prizeAmount > 0n).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No tickets found for this lottery
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Ticket Status</CardTitle>
          <div className="flex gap-2">
            <Badge variant="default">{committedTickets} Committed</Badge>
            {totalPrizes > 0 && (
              <>
                <Badge variant="outline">{totalPrizes} Winners</Badge>
                <Badge variant="outline">{claimedPrizes} Claimed</Badge>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[80px]">#</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Holder</TableHead>
                <TableHead>Prize</TableHead>
                <TableHead>Claimed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.index}>
                  <TableCell className="font-medium">
                    #{ticket.index}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={ticket.committed ? "default" : "secondary"}
                    >
                      {ticket.committed ? "Committed" : "Not Committed"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.committed &&
                    ticket.holder !==
                      "0x0000000000000000000000000000000000000000" ? (
                      <code className="text-xs">
                        {ticket.holder.slice(0, 6)}...{ticket.holder.slice(-4)}
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ticket.prizeAmount > 0n ? (
                      <span className="font-medium">
                        {formatEther(ticket.prizeAmount)} USDC
                      </span>
                    ) : ticket.committed ? (
                      <span className="text-muted-foreground text-sm">
                        No Prize
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ticket.redeemed ? (
                      <Badge variant="outline" className="text-xs">
                        ✓ Claimed
                      </Badge>
                    ) : ticket.prizeAmount > 0n ? (
                      <Badge variant="secondary" className="text-xs">
                        Unclaimed
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
