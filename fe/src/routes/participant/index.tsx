import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ParticipantLotteryCard } from "@/components/lottery/ParticipantLotteryCard";
import { WinningAlert } from "@/components/lottery/WinningAlert";
import { useUserParticipations } from "@/hooks/useUserParticipations";
import { QRScanner } from "@/components/shared/QRScanner";
import { Ticket, Loader2, Camera } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parseTicketInput, encodeTicketCode } from "@/lib/crypto";
import { useState } from "react";

export const Route = createFileRoute("/participant/")({
  component: ParticipantDashboard,
});

function ParticipantDashboard() {
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const { participations, isLoading, error, hasParticipations, unclaimedWinnings } =
    useUserParticipations();

  const handleQRScan = (data: string) => {
    setShowScanner(false);

    // Parse and navigate to ticket page
    const parsed = parseTicketInput(data);
    if (parsed) {
      let opaqueCode = data;

      if (data.length < 50 || /[?&=:/]/.test(data)) {
        opaqueCode = encodeTicketCode(
          BigInt(parsed.lottery),
          parseInt(parsed.ticket),
          parsed.secret
        );
      }

      navigate({ to: "/participant/ticket", search: { code: opaqueCode } });
    }
  };

  // Render content based on state
  let content;

  if (!isConnected) {
    content = (
      <EmptyState
        illustration="/iso/lg/message_bottle.png"
        title="Connect Your Wallet"
        description="Connect your wallet to view your lottery participations and claim prizes."
      />
    );
  } else if (isLoading) {
    content = (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">
          Loading your lotteries...
        </span>
      </div>
    );
  } else if (error) {
    content = (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load lottery data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  } else {
    content = (
      <>
        {/* QR Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <QRScanner
              onScan={handleQRScan}
              onClose={() => setShowScanner(false)}
            />
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">My Lotteries</h1>
              <p className="text-muted-foreground mt-1">
                View your lottery participations and claim prizes
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowScanner(true)}
                variant="outline"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Scan QR
              </Button>
              <Link to="/participant/ticket">
                <Button size="lg">
                  <Ticket className="mr-2 h-5 w-5" />
                  Redeem Ticket
                </Button>
              </Link>
            </div>
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
                      totalPrizePool:
                        participation.lotteryData?.totalPrizePool || 0n,
                      commitDeadline:
                        participation.lotteryData?.commitDeadline || 0n,
                      revealTime: participation.lotteryData?.revealTime || 0n,
                      claimDeadline:
                        participation.lotteryData?.claimDeadline || 0n,
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
            illustration="/iso/lg/ticket.png"
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
      </>
    );
  }

  return <div className="container mx-auto px-4 py-8 max-w-4xl">{content}</div>;
}
