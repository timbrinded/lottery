# Block Time Refactoring

## Problem

The UI previously assumed a fixed 12-second block time across all networks, leading to:
- Inaccurate time estimates on different chains (testnet vs mainnet)
- No adaptation to network conditions
- Misleading countdown timers for users

## Solution

Implemented dynamic block time calculation that:
1. Observes actual block times from the blockchain
2. Calculates rolling averages using median (handles outliers)
3. Persists data per chain in localStorage
4. Provides confidence indicators based on sample size
5. Requires zero additional RPC calls

## Changes Made

### New Files

1. **`fe/src/hooks/useBlockTime.ts`**
   - Custom hook that tracks block history per chain
   - Calculates median block time from last 20 blocks
   - Stores data in localStorage using `usehooks-ts`
   - Returns `{ blockTime, confidence, sampleSize }`

2. **`fe/src/hooks/README.md`**
   - Documentation for the new hook
   - Usage examples and implementation details

3. **`BLOCK_TIME_REFACTOR.md`** (this file)
   - Summary of changes and rationale

### Modified Files

1. **`fe/src/components/shared/BlockCountdown.tsx`**
   - Now uses `useBlockTime()` instead of hardcoded 12 seconds
   - Shows asterisk (*) when confidence is low
   - Dynamically adapts to actual network block times

2. **`fe/src/hooks/useRevealLottery.ts`**
   - Imports and uses `useBlockTime()` for error messages
   - Provides accurate time estimates in error messages

3. **`contract/src/LotteryFactory.sol`**
   - Updated comments to remove specific "12s" references
   - Made comments more generic and network-agnostic

## Technical Details

### Algorithm

- **Median vs Mean**: Uses median to handle outliers (e.g., network hiccups)
- **Sample Size**: Collects up to 20 blocks, provides estimates after 3
- **Outlier Filtering**: Removes values >60s or <0.1s
- **Chain-Specific**: Maintains separate data for each chain ID
- **Fallback**: Uses 12 seconds default when no data available

### Confidence Levels

- **Low** (<3 blocks): Shows asterisk, less reliable
- **Medium** (3-9 blocks): Reasonable accuracy
- **High** (10+ blocks): High confidence in estimates

### Storage Format

```typescript
{
  [chainId: number]: {
    blocks: Array<{ number: string, timestamp: number }>,
    lastUpdated: number
  }
}
```

## Benefits

1. **Accuracy**: Adapts to actual network conditions
2. **Performance**: No additional RPC calls needed
3. **Persistence**: Data survives page refreshes
4. **Chain-Aware**: Handles network switches automatically
5. **User Trust**: More accurate estimates build confidence

## Testing Recommendations

1. Test on localhost (Anvil) - should detect actual block time
2. Test chain switching - should maintain separate data
3. Test with no history - should show 12s default with low confidence
4. Test localStorage persistence - should survive refresh
5. Monitor accuracy over time as sample size grows

## Future Enhancements

- Add UI tooltip explaining confidence levels
- Display actual block time in developer tools
- Add manual reset option for stale data
- Consider showing block time in network status indicator
