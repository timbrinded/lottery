# Custom Hooks

This directory contains custom React hooks for the Mystery Lottery application.

## Infrastructure Hooks (Task 1)

### `useNetworkEnforcement`
Enforces Arc testnet connection and provides network validation state.

**Returns:**
- `isConnected`: Whether wallet is connected
- `isCorrectNetwork`: Whether connected to Arc testnet
- `currentChainId`: Current network chain ID
- `requiredChainId`: Required Arc testnet chain ID
- `needsConnection`: Whether user needs to connect wallet
- `needsNetworkSwitch`: Whether user needs to switch networks

**Usage:**
```tsx
const { isCorrectNetwork, needsNetworkSwitch } = useNetworkEnforcement();
```

### `useIsLotteryManager`
Determines manager access and creator ownership state for the connected wallet.

**Returns:**
- `isManager`: Whether the connected wallet can access manager tooling (true for any connected wallet)
- `hasCreatedLottery`: Whether the wallet has created at least one lottery
- `isLoading`: Loading state
- `error`: Error if any

**Usage:**
```tsx
const { isManager, hasCreatedLottery, isLoading } = useIsLotteryManager();
```

**Note:** Performs batched creator lookups across the most recent 100 lotteries. For production scale, prefer indexed data sources (events, subgraph) or pagination to reduce RPC load.

### `useFriendlyTime`
Converts timestamps to human-readable format with real-time updates.

**Parameters:**
- `timestamp`: Unix timestamp in seconds (number or bigint)
- `options`: Formatting options
  - `prefix`: Text before time (e.g., "Ends in")
  - `suffix`: Text after time (e.g., "!")
  - `showSeconds`: Whether to show seconds for < 1 minute

**Returns:**
- `friendlyText`: Human-readable time string
- `isPast`: Whether timestamp is in the past
- `timeRemaining`: Seconds remaining

**Usage:**
```tsx
const { friendlyText, isPast } = useFriendlyTime(deadline, {
  prefix: 'Ends in',
  suffix: '!',
});
```

**Time Formats:**
- < 1 minute: "X seconds"
- < 1 hour: "X minutes"
- < 24 hours: "X hours Y minutes"
- < 7 days: "X days Y hours"
- > 7 days: Absolute date (e.g., "Jan 15, 2025 at 3:00 PM")
- Past: "Ended"

**Helper Functions:**
- `formatAbsoluteTime(timestamp)`: Format as absolute date/time
- `getRelativeTime(timestamp)`: Get relative description (e.g., "in 2 hours", "5 minutes ago")

### `useUserParticipations`
Fetches lotteries where the user has committed tickets.

**Returns:**
- `participations`: Array of lottery participations
- `isLoading`: Loading state
- `error`: Error if any
- `hasParticipations`: Whether user has any participations
- `unclaimedWinnings`: Participations with unclaimed prizes

**Usage:**
```tsx
const { participations, unclaimedWinnings } = useUserParticipations();
```

**Note:** Currently checks first 10 lotteries for performance. In production, use events or subgraph for efficient lookup.

### `useHasCommittedTicket`
Checks if user has committed a specific ticket.

**Parameters:**
- `lotteryId`: Lottery ID
- `ticketIndex`: Ticket index

**Returns:**
- `hasCommitted`: Whether user committed this ticket
- `isLoading`: Loading state
- `ticketData`: Raw ticket data from contract

**Usage:**
```tsx
const { hasCommitted } = useHasCommittedTicket(lotteryId, ticketIndex);
```

## Contract Interaction Hooks

### `useCreateLottery`
Creates a new lottery with prize distribution.

### `useCommitTicket`
Commits a ticket to a lottery.

### `useRevealLottery`
Reveals a lottery after commit deadline.

### `useRefundLottery`
Refunds a lottery if minimum participants not met.

### `useClaimPrize`
Claims a prize for a winning ticket.

### `useLotterySecrets`
Manages local storage of lottery secrets.

### `useBlockTime`
Provides block time utilities for Arc blockchain.

## Development

### Testing Hooks
Use the `HookVerification` component to test infrastructure hooks in development:

```tsx
import { HookVerification } from '@/components/shared/HookVerification';

// Add to any route temporarily
<HookVerification />
```

### Performance Considerations

**Current Limitations:**
- `useIsLotteryManager`: Scans up to the most recent 100 lotteries (consider indexing for larger histories)
- `useUserParticipations`: Only checks first 10 lotteries

**Production Recommendations:**
1. Use contract events (TicketCommitted, LotteryCreated) for efficient lookups
2. Implement a subgraph for indexed queries
3. Add pagination for large datasets
4. Cache results with TanStack Query

### Future Improvements

1. **Event-based lookups**: Use wagmi's `useContractEvent` to listen for user-specific events
2. **Subgraph integration**: Index all lotteries and participations for efficient queries
3. **Batch reads**: Use multicall to batch contract reads
4. **Optimistic updates**: Update UI before transaction confirmation
5. **Error recovery**: Add retry logic for failed reads
