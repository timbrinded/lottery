import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAccount } from "wagmi";
import { CreateLotteryForm } from "@/components/lottery/CreateLotteryForm";
import { TicketDistribution } from "@/components/lottery/TicketDistribution";
import { useCreateLottery } from "@/hooks/useCreateLottery";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/manager/create")({
  component: CreateLotteryPage,
});

function CreateLotteryPage() {
  const { isConnected, chain } = useAccount();
  const [showDistribution, setShowDistribution] = useState(false);

  const {
    lotteryId,
    creatorSecret,
    ticketSecrets,
    isLoading,
    isSuccess,
    error,
    createLottery,
    reset,
  } = useCreateLottery(chain?.id || 5042002);

  const handleCreateLottery = async (data: {
    prizeValues: bigint[];
    numberOfTickets: number;
    commitDeadline: number;
    revealTime: number;
    totalPrizePool: bigint;
  }) => {
    await createLottery(data);
  };

  // Show distribution UI after successful creation
  if (
    isSuccess &&
    lotteryId &&
    creatorSecret &&
    ticketSecrets &&
    !showDistribution
  ) {
    setShowDistribution(true);
  }

  const handleCreateAnother = () => {
    setShowDistribution(false);
    reset();
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            Please connect your wallet to create a lottery.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {!showDistribution ? (
        <>
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Create Blottery</h1>
            <p className="text-muted-foreground">
              Set up a new lottery with hidden prize values
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>
                {error.message || "Failed to create lottery. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          <CreateLotteryForm
            onSubmit={handleCreateLottery}
            isLoading={isLoading}
          />
        </>
      ) : (
        <>
          <TicketDistribution
            lotteryId={lotteryId!}
            creatorSecret={creatorSecret!}
            ticketSecrets={ticketSecrets!}
          />

          <div className="mt-8 flex justify-center">
            <Button onClick={handleCreateAnother} variant="outline">
              Create Another Lottery
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
