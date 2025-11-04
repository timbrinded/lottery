import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ParticipantLotteryCard } from "@/components/lottery/ParticipantLotteryCard";
import { WinningAlert } from "@/components/lottery/WinningAlert";
import { useUserParticipations } from "@/hooks/useUserParticipations";
import { Ticket, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/participant/")({
  component: ParticipantDashboard,
});

function ParticipantDashboard() {
  const { isConnected } = useAccount();
  const { participations, isLoading, error, hasParticipations, unclaimedWinnings } =
    useUserParticipations();

  // Not connected state
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <EmptyState
          icon={Ticket}
          title="Connect Your Wallet"
          description="Connect your wallet to view your lottery participations and claim prizes."
        />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">
            Loading your lotteries...
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load lottery data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">My Lotteries</h1>
            <p className="text-muted-foreground mt-1">
              View your lottery participations and claim prizes
            </p>
          </div>
          <Link to="/participant/ticket">
            <Button size="lg">
              <Ticket className="mr-2 h-5 w-5" />
              Redeem Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Unclaimed Winnings Section */}
      {unclaimedWinnings.length > 0 && (
        <div className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold">🎉 Unclaimed Prizes</h2>
          {unclaimedWinnings.map((participation) => {
            const winningTicket = participation.tickets.find(
              (t) => t.prizeAmount > 0n && !t.redeemed
            );
            if (!winningTicket) return null;

            return (
              <WinningAlert
                key={participation.lotteryId.toString()}
                lotteryId={participation.lotteryId}
                prizeAmount={winningTicket.prizeAmount}
              />
            );
          })}
        </div>
      )}

      {/* Lottery List */}
      {hasParticipations ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">All Participations</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {participations.map((participation) => {
              // Find if user has won
              const winningTicket = participation.tickets.find(
                (t) => t.prizeAmount > 0n
              );

              return (
                <ParticipantLotteryCard
                  key={participation.lotteryId.toString()}
                  lottery={{
                    id: participation.lotteryId,
                    totalPrizePool: participation.lotteryData?.totalPrizePool || 0n,
                    commitDeadline: participation.lotteryData?.commitDeadline || 0n,
                    revealTime: participation.lotteryData?.revealTime || 0n,
                    claimDeadline: participation.lotteryData?.claimDeadline || 0n,
                    state: participation.lotteryData?.state || 0,
                    hasWon: !!winningTicket,
                    prizeAmount: winningTicket?.prizeAmount,
                    isClaimed: winningTicket?.redeemed,
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Ticket}
          title="No Active Lotteries"
          description="You haven't participated in any lotteries yet. Redeem a ticket to get started!"
          action={
            <Link to="/participant/ticket">
              <Button size="lg">
                <Ticket className="mr-2 h-5 w-5" />
                Redeem Your First Ticket
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
