import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Download, ChevronDown, Loader2 } from 'lucide-react';
import { useCopyToClipboard } from 'usehooks-ts';
import { encodeTicketCode } from '@/lib/crypto';
import { useLotterySecrets } from '@/hooks/useLotterySecrets';
import { useReadContracts } from 'wagmi';
import { useLotteryFactoryAddress } from '@/contracts/hooks';
import { LOTTERY_FACTORY_ABI } from '@/contracts/LotteryFactory';
import { formatEther } from 'viem';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

interface ViewTicketsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotteryId: bigint;
}

interface TicketData {
  ticketIndex: number;
  ticketSecret: string;
  ticketCode: string;
  redemptionUrl: string;
  committed: boolean;
  holder: string;
  redeemed: boolean;
  prizeAmount: bigint;
}

export function ViewTicketsModal({
  open,
  onOpenChange,
  lotteryId,
}: ViewTicketsModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [, copy] = useCopyToClipboard();
  const { getSecretData } = useLotterySecrets();
  const contractAddress = useLotteryFactoryAddress();

  const [sorting, setSorting] = useState<any>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [columnVisibility, setColumnVisibility] = useState<any>({});
  const [rowSelection, setRowSelection] = useState({});

  const secretData = getSecretData(lotteryId);
  const ticketSecrets = secretData?.ticketSecrets || [];
  const creatorSecret = secretData?.creatorSecret || '';

  // Fetch lottery state to determine if prizes are revealed
  const { data: lotteryStatus } = useReadContracts({
    contracts: [{
      address: contractAddress as `0x${string}`,
      abi: LOTTERY_FACTORY_ABI as any,
      functionName: 'getLotteryStatus',
      args: [lotteryId],
    }],
    query: {
      enabled: !!contractAddress && open,
      refetchInterval: open ? 5000 : false,
    },
  });

  const lotteryState = lotteryStatus?.[0]?.status === 'success' 
    ? Number((lotteryStatus[0].result as any[])[0]) 
    : 0;
  
  // State: 0=Pending, 1=CommitOpen, 2=RevealOpen, 3=Finalized
  const isRevealed = lotteryState >= 2;

  const generateRedemptionUrl = (ticketCode: string): string => {
    const params = new URLSearchParams({ code: ticketCode });
    return `${window.location.origin}/ticket?${params.toString()}`;
  };

  // Fetch ticket commitment data from contract
  const ticketIndices = useMemo(() => {
    return ticketSecrets.map((_, index) => index);
  }, [ticketSecrets]);

  const { data: ticketCommitments, isLoading: isLoadingCommitments } = useReadContracts({
    contracts: ticketIndices.map((index) => ({
      address: contractAddress as `0x${string}`,
      abi: LOTTERY_FACTORY_ABI as any,
      functionName: 'tickets',
      args: [lotteryId, BigInt(index)],
    })),
    query: {
      enabled: !!contractAddress && ticketSecrets.length > 0 && open,
      refetchInterval: open ? 5000 : false, // Only refetch when modal is open
      refetchOnMount: true,
    },
  });

  // Generate ticket data with commitment status
  const tickets: TicketData[] = useMemo(() => {
    console.log('ViewTicketsModal: Processing ticket commitments', {
      lotteryId: lotteryId.toString(),
      ticketCount: ticketSecrets.length,
      commitmentsData: ticketCommitments,
    });

    return ticketSecrets.map((secret, index) => {
      const ticketCode = encodeTicketCode(lotteryId, index, secret);
      const commitment = ticketCommitments?.[index];
      
      // Handle both array and object result formats
      let committed = false;
      let holder = '0x0000000000000000000000000000000000000000';
      let redeemed = false;
      let prizeAmount = BigInt(0);

      if (commitment?.status === 'success' && commitment.result) {
        const result = commitment.result as any;
        
        // Check if result is an array or object with named properties
        if (Array.isArray(result)) {
          // Array format: [holder, committed, redeemed, prizeAmount]
          holder = result[0];
          committed = result[1];
          redeemed = result[2];
          prizeAmount = result[3];
        } else if (typeof result === 'object') {
          // Object format with named properties
          holder = result.holder || result[0];
          committed = result.committed !== undefined ? result.committed : result[1];
          redeemed = result.redeemed !== undefined ? result.redeemed : result[2];
          prizeAmount = result.prizeAmount !== undefined ? result.prizeAmount : result[3];
        }
      }

      console.log(`ViewTicketsModal: Ticket ${index}`, {
        status: commitment?.status,
        resultType: typeof commitment?.result,
        resultIsArray: Array.isArray(commitment?.result),
        result: commitment?.result,
        parsed: { 
          holder, 
          committed, 
          redeemed, 
          prizeAmount: prizeAmount.toString() 
        },
      });

      return {
        ticketIndex: index,
        ticketSecret: secret,
        ticketCode,
        redemptionUrl: generateRedemptionUrl(ticketCode),
        committed,
        holder,
        redeemed,
        prizeAmount,
      };
    });
  }, [ticketSecrets, ticketCommitments, lotteryId]);

  const copyToClipboard = async (text: string, index?: number) => {
    await copy(text);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Define table columns
  const columns: ColumnDef<TicketData>[] = useMemo(
    () => [
      {
        accessorKey: 'ticketIndex',
        header: '#',
        cell: ({ row }) => <div className="font-medium">#{row.getValue('ticketIndex')}</div>,
      },
      {
        accessorKey: 'committed',
        header: 'Status',
        cell: ({ row }) => {
          const committed = row.getValue('committed') as boolean;
          return (
            <Badge variant={committed ? 'default' : 'secondary'}>
              {committed ? 'Committed' : 'Not Committed'}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          if (value === 'all') return true;
          if (value === 'committed') return row.getValue(id) === true;
          if (value === 'not-committed') return row.getValue(id) === false;
          return true;
        },
      },
      {
        accessorKey: 'holder',
        header: 'Holder',
        cell: ({ row }) => {
          const holder = row.getValue('holder') as string;
          const committed = row.original.committed;
          if (!committed || holder === '0x0000000000000000000000000000000000000000') {
            return <span className="text-muted-foreground text-sm">-</span>;
          }
          return (
            <code className="text-xs">
              {holder.slice(0, 6)}...{holder.slice(-4)}
            </code>
          );
        },
      },
      {
        accessorKey: 'prizeAmount',
        header: 'Prize',
        cell: ({ row }) => {
          const prizeAmount = row.getValue('prizeAmount') as bigint;
          const committed = row.original.committed;
          const redeemed = row.original.redeemed;
          
          if (!committed) {
            return <span className="text-muted-foreground text-sm">-</span>;
          }
          
          if (prizeAmount === BigInt(0)) {
            // If lottery is revealed and prize is 0, show "No Prize"
            // Otherwise show "Pending" (lottery not revealed yet)
            return (
              <span className="text-muted-foreground text-sm">
                {isRevealed ? 'No Prize' : 'Pending'}
              </span>
            );
          }
          
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatEther(prizeAmount)} USDC</span>
              {redeemed && (
                <Badge variant="outline" className="text-xs">
                  Claimed
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'ticketCode',
        header: 'Ticket Code',
        cell: ({ row }) => {
          const code = row.getValue('ticketCode') as string;
          const index = row.original.ticketIndex;
          return (
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono truncate max-w-[200px]">{code}</code>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => copyToClipboard(code, index)}
              >
                {copiedIndex === index ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          );
        },
      },
    ],
    [copiedIndex]
  );

  const table = useReactTable({
    data: tickets,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const downloadAllTickets = () => {
    const data = {
      lotteryId: lotteryId.toString(),
      creatorSecret,
      tickets: tickets.map((t) => ({
        ticketIndex: t.ticketIndex,
        ticketCode: t.ticketCode,
        ticketSecret: t.ticketSecret,
        redemptionUrl: t.redemptionUrl,
        committed: t.committed,
        holder: t.holder,
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lottery-${lotteryId}-tickets.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const committedCount = tickets.filter((t) => t.committed).length;
  const notCommittedCount = tickets.length - committedCount;
  const winnersCount = tickets.filter((t) => t.prizeAmount > BigInt(0)).length;
  const claimedCount = tickets.filter((t) => t.redeemed).length;
  const hasResults = tickets.some((t) => t.prizeAmount > BigInt(0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] !max-w-[90vw] h-[85vh] !max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Ticket Submission Status</DialogTitle>
              <DialogDescription>
                Lottery ID: {lotteryId.toString()} • {tickets.length} total tickets
              </DialogDescription>
            </div>
            {tickets.length > 0 && (
              <Button onClick={downloadAllTickets} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </DialogHeader>

        {tickets.length === 0 ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">⚠️ Ticket Secrets Not Available</p>
                  <p className="text-sm">
                    Ticket secrets were not saved when this lottery was created, or they were
                    cleared from local storage.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Stats */}
            <div className="flex gap-4 flex-wrap">
              <Badge variant="default">{committedCount} Committed</Badge>
              <Badge variant="secondary">{notCommittedCount} Not Committed</Badge>
              {hasResults && (
                <>
                  <Badge variant="outline">{winnersCount} Winners</Badge>
                  <Badge variant="outline">{claimedCount} Claimed</Badge>
                </>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filter by ticket number..."
                value={(table.getColumn('ticketIndex')?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                  table.getColumn('ticketIndex')?.setFilterValue(event.target.value)
                }
                className="max-w-xs"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Status Filter <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuCheckboxItem
                    checked={
                      (table.getColumn('committed')?.getFilterValue() as string) === undefined
                    }
                    onCheckedChange={() => table.getColumn('committed')?.setFilterValue(undefined)}
                  >
                    All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={
                      (table.getColumn('committed')?.getFilterValue() as string) === 'committed'
                    }
                    onCheckedChange={() =>
                      table.getColumn('committed')?.setFilterValue('committed')
                    }
                  >
                    Committed Only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={
                      (table.getColumn('committed')?.getFilterValue() as string) ===
                      'not-committed'
                    }
                    onCheckedChange={() =>
                      table.getColumn('committed')?.setFilterValue('not-committed')
                    }
                  >
                    Not Committed Only
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Table */}
            {isLoadingCommitments ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          No tickets found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} tickets
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <div className="text-sm">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
