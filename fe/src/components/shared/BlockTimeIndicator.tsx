import { useBlockTime } from '@/hooks/useBlockTime';
import { Badge } from '@/components/ui/badge';

/**
 * Visual indicator showing current block time and confidence
 * Useful for debugging and user transparency
 */
export function BlockTimeIndicator() {
  const { blockTime, confidence, sampleSize } = useBlockTime();

  const confidenceColors = {
    low: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-green-100 text-green-800',
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Block time:</span>
      <span className="font-mono font-semibold">{blockTime}s</span>
      <Badge className={confidenceColors[confidence]} variant="outline">
        {confidence} ({sampleSize} blocks)
      </Badge>
    </div>
  );
}
