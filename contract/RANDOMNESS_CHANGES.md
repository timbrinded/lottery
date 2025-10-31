# Randomness Mechanism Changes

## Problem
The original blockhash-based randomness was incompatible with Arc blockchain's sub-second block times:
- Arc has ~0.4s block times
- 256 blocks = only ~102 seconds window
- randomnessBlock set 20 blocks ahead (~8s), leaving only ~94 seconds to reveal
- Practically impossible for human interaction

## Solution: Multi-Party Commit-Reveal

Removed blockhash dependency and implemented multi-party commit-reveal pattern.

### How It Works

**Entropy Sources:**
1. Creator secret (revealed at reveal time)
2. All committed ticket secret hashes (already stored on-chain)
3. No timestamp or blockhash needed

**Randomness Generation:**
```solidity
bytes memory entropy = abi.encodePacked(_creatorSecret);

for (uint256 i = 0; i < totalTickets; i++) {
    if (tickets[_lotteryId][i].committed) {
        entropy = abi.encodePacked(entropy, lottery.ticketSecretHashes[i]);
    }
}

lottery.randomSeed = uint256(keccak256(entropy));
```

### Security Analysis

**✅ Attack Vectors Mitigated:**
- Creator can't predict which tickets will commit before deadline
- Participants can't manipulate (don't know creator secret or other participants' secrets)
- No timing attacks possible (deterministic based on commits)
- Collusion requires ALL participants + creator (impractical)

**⚠️ Minimum Participants Required:**
- Requires at least 2 committed tickets for reveal
- Prevents degenerate cases with insufficient entropy
- Reverts with `InsufficientCommittedTickets()` if < 2 commits

### Changes Made

#### 1. Removed Blockhash Infrastructure

**Deleted:**
- `randomnessBlock` field from Lottery struct
- `closeCommitPeriod()` function
- `CommitClosed` state from LotteryState enum
- `CommitPeriodClosed` event
- Errors: `RandomnessBlockNotReached`, `BlockhashExpired`, `BlockhashUnavailable`

**Added:**
- `InsufficientCommittedTickets` error
- `getCommittedCount()` view function

#### 2. Simplified State Machine

**Before:**
```
Pending → CommitOpen → CommitClosed → RevealOpen → Finalized
```

**After:**
```
Pending → CommitOpen → RevealOpen → Finalized
```

#### 3. Updated revealLottery()

**Changes:**
- No longer requires `CommitClosed` state
- No blockhash or randomness block checks
- Checks for minimum 2 committed tickets
- Generates randomness from creator secret + ticket hashes only
- Can be called anytime after commit deadline + reveal time (no expiration)

#### 4. Updated View Functions

- `isRevealReady()` - Now checks CommitOpen state instead of CommitClosed
- `canRevealNow()` - Checks for minimum committed tickets
- `getCommittedCount()` - New function to count committed tickets

#### 5. Updated refundLottery()

- Now checks for `CommitOpen` state instead of `CommitClosed`
- Still allows refund if creator doesn't reveal within 24 hours of reveal time

### Benefits

1. **Works on any blockchain speed** - No timing constraints
2. **Simpler** - One less state transition, one less transaction
3. **More gas efficient** - Saves ~30-50k gas per lottery (no closeCommitPeriod tx)
4. **Better UX** - Creator can reveal anytime after deadlines, no rush
5. **Deterministic** - Same commits = same outcome (verifiable)

### Trade-offs

- Slightly weaker than VRF (no cryptographic proof)
- Requires minimum 2 participants for security
- Not suitable for high-value lotteries (>$10k) - use VRF instead

### When to Upgrade to VRF

Consider VRF for:
- Prize pools > $10,000
- Regulatory requirements for provable fairness
- High-value NFT distributions
- Casino/gambling applications

### Testing Updates Needed

The following test files need updates:
- `contract/test/LotteryFactory.t.sol` - Remove CommitClosed references
- Update state transition tests
- Remove closeCommitPeriod tests
- Update reveal tests to not require closeCommitPeriod
- Add tests for minimum committed tickets requirement

### Frontend Updates Needed

1. Remove `useCloseCommitPeriod` hook
2. Update dashboard to not show "Close Commit Period" button
3. Update `useRevealLottery` hook to remove randomness block checks
4. Update lottery status displays to remove CommitClosed state
5. Update countdown/timing logic (no more waiting for randomness block)
