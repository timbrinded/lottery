import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatUnits, parseUnits } from "viem";

interface PrizeField {
  id: string;
  value: string;
}

interface CreateLotteryFormData {
  numberOfTickets: number;
  commitDeadlineMinutes: number;
  revealTime: string;
  prizes: PrizeField[];
}

interface CreateLotteryFormProps {
  onSubmit: (data: {
    prizeValues: bigint[];
    numberOfTickets: number;
    commitDeadline: number;
    revealTime: number;
    totalPrizePool: bigint;
  }) => void;
  isLoading?: boolean;
}

export function CreateLotteryForm({
  onSubmit,
  isLoading = false,
}: CreateLotteryFormProps) {
  const { chain } = useAccount();
  const decimals = chain?.nativeCurrency?.decimals ?? 18;

  const [prizes, setPrizes] = useState<PrizeField[]>([
    { id: "1", value: "" },
    { id: "2", value: "" },
    { id: "3", value: "" },
  ]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateLotteryFormData>({
    defaultValues: {
      numberOfTickets: 10,
      commitDeadlineMinutes: 60,
      revealTime: "",
    },
  });

  const numberOfTickets = watch("numberOfTickets");
  const commitDeadlineMinutes = watch("commitDeadlineMinutes");
  const revealTime = watch("revealTime");

  // Preset time options for reveal time
  const timePresets = [
    { label: "1 hour", hours: 1 },
    { label: "6 hours", hours: 6 },
    { label: "1 day", hours: 24 },
    { label: "2 days", hours: 48 },
    { label: "1 week", hours: 168 },
  ];

  // Preset options for commit deadline
  const commitDeadlinePresets = [
    { label: "15 min", minutes: 15 },
    { label: "30 min", minutes: 30 },
    { label: "1 hour", minutes: 60 },
    { label: "6 hours", minutes: 360 },
    { label: "1 day", minutes: 1440 },
  ];

  const setPresetTime = (hours: number) => {
    const now = new Date();
    now.setHours(now.getHours() + hours);
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const formatted = now.toISOString().slice(0, 16);
    // Update react-hook-form state directly
    setValue("revealTime", formatted, { shouldValidate: true });
  };

  const setCommitDeadlinePreset = (minutes: number) => {
    setValue("commitDeadlineMinutes", minutes);
  };

  const addPrize = () => {
    setPrizes([...prizes, { id: Date.now().toString(), value: "" }]);
  };

  const removePrize = (id: string) => {
    if (prizes.length > 1) {
      setPrizes(prizes.filter((p) => p.id !== id));
    }
  };

  const updatePrize = (id: string, value: string) => {
    setPrizes(prizes.map((p) => (p.id === id ? { ...p, value } : p)));
  };

  const calculateTotalPrizePool = (): bigint => {
    try {
      return prizes.reduce((sum, prize) => {
        const value = prize.value.trim();
        if (!value || isNaN(parseFloat(value))) return sum;
        return sum + parseUnits(value, decimals);
      }, 0n);
    } catch {
      return 0n;
    }
  };

  const validateForm = (): string | null => {
    // Validate prize sum > 0
    const totalPrizePool = calculateTotalPrizePool();
    if (totalPrizePool === 0n) {
      return "Total prize pool must be greater than 0 USDC";
    }

    // Validate all prizes have values
    const hasEmptyPrizes = prizes.some(
      (p) => !p.value.trim() || isNaN(parseFloat(p.value))
    );
    if (hasEmptyPrizes) {
      return "All prize fields must have valid values";
    }

    // Validate tickets > prizes
    if (numberOfTickets < prizes.length) {
      return "Number of tickets must be greater than or equal to number of prizes";
    }

    // Validate deadlines
    if (!revealTime) {
      return "Reveal time is required";
    }

    const revealTimestamp = new Date(revealTime).getTime() / 1000;
    const commitDeadline = revealTimestamp - commitDeadlineMinutes * 60;
    const now = Date.now() / 1000;

    if (commitDeadline <= now) {
      return "Commit deadline must be in the future";
    }

    if (revealTimestamp <= commitDeadline) {
      return "Reveal time must be after commit deadline";
    }

    return null;
  };

  const handleFormSubmit = (data: CreateLotteryFormData) => {
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    const prizeValues = prizes.map((p) => parseUnits(p.value.trim(), decimals));
    const totalPrizePool = calculateTotalPrizePool();
    const revealTimestamp = Math.floor(
      new Date(data.revealTime).getTime() / 1000
    );
    const commitDeadline = revealTimestamp - data.commitDeadlineMinutes * 60;

    onSubmit({
      prizeValues,
      numberOfTickets: data.numberOfTickets,
      commitDeadline,
      revealTime: revealTimestamp,
      totalPrizePool,
    });
  };

  const totalPrizePool = calculateTotalPrizePool();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Mystery Lottery</CardTitle>
        <CardDescription>
          Set up a new lottery with hidden prize values
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Prize Distribution */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Prize Distribution
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPrize}
                disabled={isLoading}
              >
                Add Prize
              </Button>
            </div>

            {prizes.map((prize, index) => (
              <div key={prize.id} className="flex items-center gap-2">
                <Label className="w-20">Prize {index + 1}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={prize.value}
                  onChange={(e) => updatePrize(prize.id, e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">USDC</span>
                {prizes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePrize(prize.id)}
                    disabled={isLoading}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Number of Tickets */}
          <div className="space-y-2">
            <Label htmlFor="numberOfTickets">Number of Tickets</Label>
            <Input
              id="numberOfTickets"
              type="number"
              min="1"
              max="1000"
              {...register("numberOfTickets", {
                required: true,
                min: 1,
                max: 1000,
                valueAsNumber: true,
              })}
              disabled={isLoading}
            />
            {errors.numberOfTickets && (
              <p className="text-sm text-destructive">
                Number of tickets must be between 1 and 1000
              </p>
            )}
          </div>

          {/* Commit Deadline */}
          <div className="space-y-2">
            <Label htmlFor="commitDeadlineMinutes">
              Commit Deadline (minutes before reveal)
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {commitDeadlinePresets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCommitDeadlinePreset(preset.minutes)}
                  disabled={isLoading}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Input
              id="commitDeadlineMinutes"
              type="number"
              min="1"
              max="10080"
              {...register("commitDeadlineMinutes", {
                required: true,
                min: 1,
                max: 10080,
                valueAsNumber: true,
              })}
              disabled={isLoading}
            />
            {errors.commitDeadlineMinutes && (
              <p className="text-sm text-destructive">
                Commit deadline must be between 1 and 10080 minutes (1 week)
              </p>
            )}
          </div>

          {/* Reveal Time */}
          <div className="space-y-2">
            <Label htmlFor="revealTime">Reveal Time</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {timePresets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPresetTime(preset.hours)}
                  disabled={isLoading}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Input
              id="revealTime"
              type="datetime-local"
              {...register("revealTime", { required: true })}
              disabled={isLoading}
            />
            {errors.revealTime && (
              <p className="text-sm text-destructive">
                Reveal time is required
              </p>
            )}
          </div>

          {/* Total Prize Pool Display */}
          {totalPrizePool > 0n && (
            <Alert>
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    Total {chain?.nativeCurrency?.symbol ?? "USDC"} Required:
                  </span>
                  <span className="text-lg font-bold">
                    {formatUnits(totalPrizePool, decimals)}{" "}
                    {chain?.nativeCurrency?.symbol ?? "USDC"}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || totalPrizePool === 0n}
          >
            {isLoading ? "Creating Lottery..." : "Create Lottery"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
