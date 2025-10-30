import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { parseEther, formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PrizeField {
  id: string;
  value: string;
}

interface CreateLotteryFormData {
  numberOfTickets: number;
  commitDeadlineHours: number;
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

export function CreateLotteryForm({ onSubmit, isLoading = false }: CreateLotteryFormProps) {
  const [prizes, setPrizes] = useState<PrizeField[]>([
    { id: '1', value: '' },
    { id: '2', value: '' },
    { id: '3', value: '' },
  ]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<CreateLotteryFormData>({
    defaultValues: {
      numberOfTickets: 10,
      commitDeadlineHours: 24,
      revealTime: '',
    },
  });

  const numberOfTickets = watch('numberOfTickets');
  const commitDeadlineHours = watch('commitDeadlineHours');
  const revealTime = watch('revealTime');

  const addPrize = () => {
    setPrizes([...prizes, { id: Date.now().toString(), value: '' }]);
  };

  const removePrize = (id: string) => {
    if (prizes.length > 1) {
      setPrizes(prizes.filter(p => p.id !== id));
    }
  };

  const updatePrize = (id: string, value: string) => {
    setPrizes(prizes.map(p => p.id === id ? { ...p, value } : p));
  };

  const calculateTotalPrizePool = (): bigint => {
    try {
      return prizes.reduce((sum, prize) => {
        const value = prize.value.trim();
        if (!value || isNaN(parseFloat(value))) return sum;
        return sum + parseEther(value);
      }, 0n);
    } catch {
      return 0n;
    }
  };

  const validateForm = (): string | null => {
    // Validate prize sum > 0
    const totalPrizePool = calculateTotalPrizePool();
    if (totalPrizePool === 0n) {
      return 'Total prize pool must be greater than 0 ETH';
    }

    // Validate all prizes have values
    const hasEmptyPrizes = prizes.some(p => !p.value.trim() || isNaN(parseFloat(p.value)));
    if (hasEmptyPrizes) {
      return 'All prize fields must have valid values';
    }

    // Validate tickets > prizes
    if (numberOfTickets < prizes.length) {
      return 'Number of tickets must be greater than or equal to number of prizes';
    }

    // Validate deadlines
    if (!revealTime) {
      return 'Reveal time is required';
    }

    const revealTimestamp = new Date(revealTime).getTime() / 1000;
    const commitDeadline = revealTimestamp - (commitDeadlineHours * 3600);
    const now = Date.now() / 1000;

    if (commitDeadline <= now) {
      return 'Commit deadline must be in the future';
    }

    if (revealTimestamp <= commitDeadline) {
      return 'Reveal time must be after commit deadline';
    }

    return null;
  };

  const handleFormSubmit = (data: CreateLotteryFormData) => {
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    const prizeValues = prizes.map(p => parseEther(p.value.trim()));
    const totalPrizePool = calculateTotalPrizePool();
    const revealTimestamp = Math.floor(new Date(data.revealTime).getTime() / 1000);
    const commitDeadline = revealTimestamp - (data.commitDeadlineHours * 3600);

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
              <Label className="text-base font-semibold">Prize Distribution</Label>
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
                <span className="text-sm text-muted-foreground">ETH</span>
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
              {...register('numberOfTickets', {
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
            <Label htmlFor="commitDeadlineHours">
              Commit Deadline (hours before reveal)
            </Label>
            <Input
              id="commitDeadlineHours"
              type="number"
              min="1"
              max="168"
              {...register('commitDeadlineHours', {
                required: true,
                min: 1,
                max: 168,
                valueAsNumber: true,
              })}
              disabled={isLoading}
            />
            {errors.commitDeadlineHours && (
              <p className="text-sm text-destructive">
                Commit deadline must be between 1 and 168 hours
              </p>
            )}
          </div>

          {/* Reveal Time */}
          <div className="space-y-2">
            <Label htmlFor="revealTime">Reveal Time</Label>
            <Input
              id="revealTime"
              type="datetime-local"
              {...register('revealTime', { required: true })}
              disabled={isLoading}
            />
            {errors.revealTime && (
              <p className="text-sm text-destructive">Reveal time is required</p>
            )}
          </div>

          {/* Total Prize Pool Display */}
          {totalPrizePool > 0n && (
            <Alert>
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total ETH Required:</span>
                  <span className="text-lg font-bold">
                    {formatEther(totalPrizePool)} ETH
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
            {isLoading ? 'Creating Lottery...' : 'Create Lottery'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
