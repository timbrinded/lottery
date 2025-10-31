import { useBlockNumber } from 'wagmi';
import { useBlockTime } from '@/hooks/useBlockTime';

interface BlockCountdownProps {
  targetBlock: bigint;
  className?: string;
}

export function BlockCountdown({ targetBlock, className = '' }: BlockCountdownProps) {
  const { data: currentBlock } = useBlockNumber({
    watch: true,
  });
  const { blockTime, confidence } = useBlockTime();

  if (!currentBlock) {
    return (
      <span className={`font-mono font-semibold text-muted-foreground ${className}`}>
        Loading...
      </span>
    );
  }

  const remainingBlocks = Number(targetBlock - currentBlock);

  if (remainingBlocks <= 0) {
    return (
      <span className={`font-mono font-semibold text-green-600 ${className}`}>
        Block reached!
      </span>
    );
  }

  // Estimate time using actual observed block time
  const estimatedSeconds = remainingBlocks * blockTime;
  const estimatedMinutes = Math.floor(estimatedSeconds / 60);

  // Set urgency color
  let urgency: 'green' | 'yellow' | 'red' = 'green';
  if (remainingBlocks <= 5) {
    urgency = 'red';
  } else if (remainingBlocks <= 10) {
    urgency = 'yellow';
  }

  const colorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  return (
    <span className={`font-mono font-semibold ${colorClasses[urgency]} ${className}`}>
      {remainingBlocks} blocks remaining (~{estimatedMinutes} min{confidence === 'low' ? '*' : ''})
    </span>
  );
}
