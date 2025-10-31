# Design Document: Randomness Mechanism Migration

## Overview

This document describes the migration from blockhash-based randomness to multi-party commit-reveal randomness. The smart contract has been updated, and this design covers the necessary changes to tests, frontend, and documentation.

## Architecture Changes

### Smart Contract Changes (Completed)

**Removed:**
- `randomnessBlock` field from Lottery struct
- `closeCommitPeriod()` function
- `CommitClosed` state from LotteryState enum
- `CommitPeriodClosed` event
- Errors: `RandomnessBlockNotReached`, `BlockhashExpired`, `BlockhashUnavailable`

**Added:**
- `InsufficientCommittedTickets` error
- `getCommittedCount()` view function
- Minimum 2 participants check in `revealLottery()`

**Modified:**
- `revealLottery()` - Uses multi-party commit-reveal
- `isRevealReady()` - Checks CommitOpen state
- `canRevealNow()` - Includes minimum participant check
- `refundLottery()` - Checks CommitOpen state

### State Machine

**Before:**
```
Pending → CommitOpen → CommitClosed → RevealOpen → Finalized
```

**After:**
```
Pending → CommitOpen → RevealOpen → Finalized
```

## Components to Update

### 1. Smart Contract Tests

**File:** `contract/test/LotteryFactory.t.sol`

**Changes Needed:**

1. **State Enum Tests:**
   - Update enum value assertions (CommitClosed removed)
   - RevealOpen is now index 2, Finalized is index 3

2. **Remove closeCommitPeriod Tests:**
   - `test_CloseCommitPeriod_Success()`
   - `test_CloseCommitPeriod_RevertsIfNotCommitOpen()`
   - `test_CloseCommitPeriod_RevertsIfDeadlineNotPassed()`

3. **Update Reveal Tests:**
   - Remove calls to `closeCommitPeriod()` before reveal
   - Remove `vm.roll()` calls for randomness block
   - Update state checks from CommitClosed to CommitOpen
   - Remove blockhash availability checks

4. **Add New Tests:**
   - `test_RevealLottery_RevertsWithInsufficientCommits()` - Test < 2 commits
   - `test_RevealLottery_SucceedsWithMinimumCommits()` - Test exactly 2 commits
   - `test_RevealLottery_DeterministicRandomness()` - Verify same commits = same outcome

5. **Update Refund Tests:**
   - Change state checks from CommitClosed to CommitOpen
   - Update test names and descriptions

### 2. Frontend Hooks

**Files to Update:**

#### `fe/src/hooks/useCloseCommitPeriod.ts`
- **Action:** Delete this file entirely

#### `fe/src/hooks/useRevealLottery.ts`
- Remove `randomnessBlock` checks
- Remove `blocksRemaining` from return value
- Remove `canReveal` logic related to block numbers
- Update error handling to remove blockhash-related errors
- Add check for minimum committed tickets

**Before:**
```typescript
const canReveal = 
  lottery.state === LotteryState.CommitClosed &&
  currentBlock >= lottery.randomnessBlock &&
  currentBlock <= lottery.randomnessBlock + 256;
```

**After:**
```typescript
const canReveal = 
  lottery.state === LotteryState.CommitOpen &&
  Date.now() / 1000 >= lottery.commitDeadline &&
  Date.now() / 1000 >= lottery.revealTime;
```

#### `fe/src/hooks/useLotteryState.ts` (if exists)
- Update state type definitions
- Remove CommitClosed state

### 3. Dashboard Components

**File:** `fe/src/routes/dashboard.tsx`

**Changes:**

1. **Remove Close Commit Period Button:**
   - Delete button and associated logic
   - Remove imports of `useCloseCommitPeriod`

2. **Update State Display:**
   - Remove CommitClosed from state badges
   - Update state filtering logic

3. **Update Reveal Button Logic:**
   ```typescript
   // Before
   const showReveal = 
     lottery.state === LotteryState.CommitClosed &&
     currentBlock >= lottery.randomnessBlock;
   
   // After
   const showReveal = 
     lottery.state === LotteryState.CommitOpen &&
     now >= lottery.commitDeadline &&
     now >= lottery.revealTime;
   ```

4. **Remove Block Countdown:**
   - Delete `<BlockCountdown targetBlock={lottery.randomnessBlock} />`
   - Show only time-based countdown to reveal time

5. **Add Participant Count Display:**
   - Show number of committed tickets
   - Display warning if < 2 commits near reveal time

**File:** `fe/src/components/shared/BlockCountdown.tsx`
- **Action:** Can be deleted if only used for randomness block

### 4. Error Handling

**File:** `fe/src/lib/errors.ts`

**Update Error Mapping:**

```typescript
// Remove these:
- RandomnessBlockNotReached → "Please wait for randomness block"
- BlockhashExpired → "Reveal window expired"
- BlockhashUnavailable → "Blockhash unavailable"

// Add this:
+ InsufficientCommittedTickets → "Need at least 2 committed tickets to reveal"
```

### 5. Contract Type Definitions

**File:** `fe/src/contracts/LotteryFactory.ts`

**Update Types:**
- Regenerate ABI from compiled contract
- Update LotteryState enum type
- Remove randomnessBlock from Lottery type

**Steps:**
1. Run `forge build` in contract directory
2. Copy new ABI from `contract/out/LotteryFactory.sol/LotteryFactory.json`
3. Update type definitions

### 6. Documentation Updates

**File:** `.kiro/specs/mystery-lottery/design.md`

**Updates:**
1. Update randomness section to describe multi-party commit-reveal
2. Remove blockhash references
3. Update state machine diagram
4. Add security analysis of new approach
5. Document minimum participant requirement

**File:** `.kiro/specs/mystery-lottery/tasks.md`

**Updates:**
1. Mark randomness-related tasks as complete
2. Update task descriptions that reference closeCommitPeriod
3. Add note about completed migration

## Testing Strategy

### Smart Contract Tests

1. **Unit Tests:**
   - State transitions without CommitClosed
   - Reveal with various participant counts (0, 1, 2, 10, 100)
   - Randomness determinism
   - Minimum participant enforcement

2. **Integration Tests:**
   - Full lottery flow without closeCommitPeriod
   - Refund flow with new state checks
   - Multiple lotteries with different participant counts

### Frontend Tests

1. **Hook Tests:**
   - useRevealLottery with new conditions
   - Error handling for InsufficientCommittedTickets

2. **Component Tests:**
   - Dashboard displays correct states
   - Reveal button shows at correct time
   - Participant count warnings

3. **E2E Tests:**
   - Create lottery → commit → reveal flow
   - Verify no closeCommitPeriod step

## Migration Checklist

- [x] Update smart contract (completed)
- [ ] Update smart contract tests
- [ ] Delete useCloseCommitPeriod hook
- [ ] Update useRevealLottery hook
- [ ] Update dashboard component
- [ ] Remove BlockCountdown from lottery displays
- [ ] Update error handling
- [ ] Regenerate contract types
- [ ] Update design.md documentation
- [ ] Update tasks.md
- [ ] Run full test suite
- [ ] Deploy to testnet and verify

## Rollback Plan

If issues are discovered:
1. Revert contract changes from git history
2. Restore original hooks and components
3. Redeploy previous contract version
4. The contract changes are in a single commit for easy revert

## Performance Impact

**Gas Savings:**
- Remove closeCommitPeriod transaction: ~30-50k gas saved per lottery
- Simpler reveal logic: ~5-10k gas saved

**User Experience:**
- One less transaction required
- No timing constraints for reveal
- Simpler flow (3 states instead of 4)
