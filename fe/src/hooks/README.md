# Custom Hooks

## useBlockTime

Calculates actual block time based on observed blocks from the blockchain.

### Features

- **Chain-specific tracking**: Maintains separate block time data for each chain
- **Rolling average**: Uses the last 20 blocks to calculate median block time
- **Outlier filtering**: Removes extreme values (>60s or <0.1s) to handle anomalies
- **Persistent storage**: Stores data in localStorage for accuracy across sessions
- **Confidence indicator**: Provides low/medium/high confidence based on sample size
- **Zero RPC overhead**: Uses existing wagmi `useBlockNumber` hook with watch mode

### Usage

```typescript
import { useBlockTime } from '@/hooks/useBlockTime';

function MyComponent() {
  const { blockTime, confidence, sampleSize } = useBlockTime();
  
  // blockTime is in seconds (e.g., 12.3)
  const estimatedTime = remainingBlocks * blockTime;
  
  return (
    <div>
      Estimated time: {Math.floor(estimatedTime / 60)} minutes
      {confidence === 'low' && '*'}
    </div>
  );
}
```

### Return Values

- `blockTime`: Average block time in seconds (rounded to 1 decimal)
- `confidence`: 'low' (<3 blocks), 'medium' (3-9 blocks), 'high' (10+ blocks)
- `sampleSize`: Number of blocks observed for this chain

### Implementation Details

- Uses **median** instead of mean to handle outliers
- Stores block numbers as strings to avoid BigInt serialization issues
- Automatically clears data when switching chains
- Falls back to 12 seconds when no data is available
- Keeps only the last 20 blocks to adapt to network changes
