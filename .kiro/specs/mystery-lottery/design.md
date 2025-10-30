# Design Document: Mystery Lottery System

## Overview

The Mystery Lottery system is a decentralized lottery platform on Arc blockchain that uses a commit-reveal pattern to ensure fairness and prevent gaming. The system consists of a Solidity smart contract (LotteryFactory) and a React frontend application that work together to create time-locked lotteries with hidden prize values.

### Key Design Principles

1. **Fairness First**: Commit-reveal pattern prevents anyone from knowing winners before distribution
2. **Two-Step Participation**: Users commit before the draw, then claim after reveal
3. **Prize Cascade**: Uncommitted tickets don't lock prizes - they cascade to active participants
4. **Gas Efficiency**: Optimized for Arc's low-cost, fast finality environment
5. **Flexible Gas Model**: Paymaster for USDC gas + optional sponsored commits + gasless claiming
6. **User Experience**: Clear step-by-step flow with prominent deadlines and countdowns

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
│  (React + wagmi + viem + TailwindCSS + Framer Motion)       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Web3 RPC Calls
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    Arc Blockchain                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           LotteryFactory Contract                     │  │
│  │  - Lottery Creation & Storage                        │  │
│  │  - Commit Management                                 │  │
│  │  - Reveal & Prize Assignment                         │  │
│  │  - Redemption & Forfeiture                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Native USDC                              │  │
│  │  (Built-in to Arc - not a separate contract)         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### State Machine

Each lottery progresses through distinct states:

```
Pending → CommitOpen → CommitClosed → RevealReady → RevealOpen → Finalized
```

**State Transitions:**
- `Pending → CommitOpen`: Lottery created, commit period begins
- `CommitOpen → CommitClosed`: Commit deadline passes, randomnessBlock set
- `CommitClosed → RevealReady`: Randomness block arrives (block.number >= randomnessBlock)
- `RevealReady → RevealOpen`: Creator reveals secret, prizes assigned
- `RevealOpen → Finalized`: Claim deadline passes, forfeited prizes processed

**Note:** RevealReady is a computed state (not stored), determined by checking if `block.number >= lottery.randomnessBlock`

## Components and Interfaces

### Smart Contract: LotteryFactory

#### Core Data Structures

```solidity
enum LotteryState {
    Pending,
    CommitOpen,
    CommitClosed,
    RevealOpen,
    Finalized
}

struct Lottery {
    address creator;
    bytes32 creatorCommitment;
    uint256 totalPrizePool; // In native USDC (6 decimals)
    uint256[] prizeValues; // In native USDC (6 decimals)
    bytes32[] ticketSecretHashes;
    uint256 commitDeadline;
    uint256 randomnessBlock; // Block number for entropy source (set when commit closes)
    uint256 revealTime;
    uint256 claimDeadline;
    uint256 randomSeed;
    LotteryState state;
    uint256 createdAt;
}

struct TicketCommitment {
    address holder;
    bool committed;
    bool redeemed;
    uint256 prizeAmount; // In native USDC (6 decimals)
}

// Mappings
mapping(uint256 => Lottery) public lotteries;
mapping(uint256 => mapping(uint256 => TicketCommitment)) public tickets;
mapping(uint256 => uint256) public lotteryRolloverPool; // In native USDC
```

#### Key Functions

**Creation Phase:**
```solidity
function createLottery(
    bytes32 _creatorCommitment,
    bytes32[] calldata _ticketSecretHashes,
    uint256[] calldata _prizeValues,
    uint256 _commitDeadline,
    uint256 _revealTime
) external returns (uint256 lotteryId)
```

**Commit Phase:**
```solidity
// Standard commit (user pays gas via Paymaster in USDC)
function commitTicket(
    uint256 _lotteryId,
    uint256 _ticketIndex,
    bytes32 _ticketSecretHash
) external

// Optional: Sponsored commit (creator pre-funds gas pool)
function commitTicketSponsored(
    uint256 _lotteryId,
    uint256 _ticketIndex,
    bytes32 _ticketSecretHash
) external
```

**Commit Close Phase:**
```solidity
function closeCommitPeriod(
    uint256 _lotteryId
) external
```

**Reveal Phase:**
```solidity
function revealLottery(
    uint256 _lotteryId,
    bytes calldata _creatorSecret
) external
```

**Claim Phase:**
```solidity
function claimPrize(
    uint256 _lotteryId,
    uint256 _ticketIndex,
    bytes calldata _ticketSecret
) external nonReentrant
```

**Forfeiture:**
```solidity
function processForfeitedPrizes(
    uint256 _lotteryId
) external
```

### Frontend Application

#### Component Structure

```
src/
├── components/
│   ├── lottery/
│   │   ├── CreateLotteryForm.tsx
│   │   ├── LotteryCard.tsx
│   │   ├── TicketDistribution.tsx
│   │   └── RevealLotteryModal.tsx
│   ├── ticket/
│   │   ├── TicketCommit.tsx
│   │   ├── TicketReveal.tsx
│   │   └── PrizeAnimation.tsx
│   ├── dashboard/
│   │   ├── MyLotteries.tsx
│   │   └── LotteryStats.tsx
│   └── shared/
│       ├── Countdown.tsx
│       ├── QRCode.tsx
│       └── ShareButtons.tsx
├── hooks/
│   ├── useCreateLottery.ts
│   ├── useCommitTicket.ts
│   ├── useRevealLottery.ts
│   ├── useClaimPrize.ts
│   └── useLotteryState.ts
├── lib/
│   ├── crypto.ts (secret generation, hashing)
│   ├── shuffle.ts (Fisher-Yates implementation)
│   └── validation.ts
└── contracts/
    └── LotteryFactory.ts (generated types)
```

#### Key Hooks

**useCreateLottery:**
- Generates creator secret and commitment
- Generates ticket secrets and hashes
- Calls contract's createLottery function
- Returns ticket codes for distribution

**useCommitTicket:**
- Validates commit deadline hasn't passed
- Submits commitment transaction
- Updates local state

**useRevealLottery:**
- Validates creator secret
- Calls contract's revealLottery function
- Triggers prize assignment

**useClaimPrize:**
- Validates ticket secret
- Checks if user committed
- Claims prize with animation

## Data Models

### Lottery Creation Flow

```typescript
interface LotteryCreationInput {
  totalPrizeAmount: bigint;
  prizeDistribution: bigint[]; // e.g., [60, 30, 10] USDC
  numberOfTickets: number;
  commitDeadlineHours: number; // Hours before reveal
  revealTime: number; // Unix timestamp
}

interface LotteryCreationOutput {
  lotteryId: bigint;
  creatorSecret: string; // MUST BE SAVED
  ticketCodes: TicketCode[];
  transactionHash: string;
}

interface TicketCode {
  ticketIndex: number;
  ticketSecret: string;
  redemptionUrl: string;
  qrCodeData: string;
}
```

### Ticket Commitment

```typescript
interface TicketCommitmentData {
  lotteryId: bigint;
  ticketIndex: number;
  ticketSecretHash: string;
  holderAddress: string;
  committedAt: number;
}
```

### Prize Assignment

```typescript
interface PrizeAssignment {
  ticketIndex: number;
  prizeAmount: bigint;
  holderAddress: string;
  claimed: boolean;
}
```

## Error Handling

### Smart Contract Errors

```solidity
error CommitDeadlinePassed();
error CommitPeriodNotClosed();
error RandomnessBlockNotReached();
error BlockhashExpired();
error BlockhashUnavailable();
error InvalidCreatorSecret();
error TicketNotCommitted();
error TicketAlreadyRedeemed();
error InvalidTicketSecret();
error ClaimDeadlinePassed();
error InsufficientPrizePool();
error UnauthorizedCaller();
```

### Frontend Error Handling

**Transaction Errors:**
- User rejection: "Transaction cancelled"
- Insufficient gas: "Insufficient funds for gas"
- Network errors: "Network connection failed. Please try again"

**Validation Errors:**
- Invalid inputs: Clear field-level validation messages
- Deadline passed: "Commit period has ended"
- Already committed: "You've already entered this lottery"

**State Errors:**
- Wrong state: "Lottery not ready for this action"
- Not found: "Lottery not found"

## Testing Strategy

### Smart Contract Tests

**Unit Tests (Foundry):**
1. Lottery creation with valid inputs
2. Commit before and after deadline
3. Reveal with correct and incorrect secrets
4. Prize cascade for uncommitted tickets
5. Claim with valid and invalid secrets
6. Forfeiture after claim deadline
7. Reentrancy protection
8. Access control

**Integration Tests:**
1. Full lottery lifecycle (create → commit → reveal → claim)
2. Multiple participants committing
3. Partial commitment scenarios
4. Forfeiture and rollover
5. Edge cases (0 commits, all commits, etc.)

**Fuzz Tests:**
1. Random prize distributions
2. Random commit patterns
3. Random reveal timings

### Frontend Tests

**Component Tests (Vitest + React Testing Library):**
1. CreateLotteryForm validation
2. Countdown timer accuracy
3. Prize reveal animations
4. Error message display

**Integration Tests:**
1. Wallet connection flow
2. Transaction submission and confirmation
3. State updates after blockchain events

**E2E Tests (Playwright):**
1. Complete lottery creation flow
2. Ticket commitment flow
3. Prize claim flow
4. Dashboard interactions

## Gas Model and Accessibility

### Three-Tier Gas Approach

The system uses a flexible gas model to balance simplicity, accessibility, and viral growth potential:

#### **Tier 1: Standard Commits (MVP)**
- Users pay gas in USDC via Arc's Paymaster
- Requires minimum USDC balance (~$1 for gas)
- Simple, secure, no infrastructure needed
- Natural spam prevention

**Implementation:**
```solidity
function commitTicket(uint256 lotteryId, uint256 ticketIndex, bytes32 ticketSecretHash) external {
    require(block.timestamp < lotteries[lotteryId].commitDeadline, "Commit period closed");
    // User pays gas in USDC via Paymaster
    tickets[lotteryId][ticketIndex] = TicketCommitment({
        holder: msg.sender,
        committed: true,
        redeemed: false,
        prizeAmount: 0
    });
}
```

#### **Tier 2: Sponsored Commits (Optional Enhancement)**
- Lottery creators can pre-fund a gas pool
- Participants commit for free, gas paid from pool
- Checkbox during creation: "☑️ Cover gas costs for participants"
- Enables viral sharing without requiring recipients to have USDC

**Implementation:**
```solidity
struct Lottery {
    // ... existing fields
    uint256 sponsoredGasPool; // USDC allocated for sponsored commits
    uint256 sponsoredGasUsed; // Track usage
}

function commitTicketSponsored(uint256 lotteryId, uint256 ticketIndex, bytes32 ticketSecretHash) external {
    Lottery storage lottery = lotteries[lotteryId];
    require(lottery.sponsoredGasPool > lottery.sponsoredGasUsed, "Gas pool depleted");
    
    uint256 gasCost = estimateGasCost();
    lottery.sponsoredGasUsed += gasCost;
    
    tickets[lotteryId][ticketIndex] = TicketCommitment({
        holder: msg.sender,
        committed: true,
        redeemed: false,
        prizeAmount: 0
    });
    
    // Refund gas to relayer/tx.origin
    transferNativeUSDC(tx.origin, gasCost);
}
```

#### **Tier 3: Gasless Claims (Always Enabled)**
- Winners always claim gasless
- Gas automatically deducted from prize
- Enables $0 balance users to receive winnings

**Benefits of This Approach:**
- ✅ MVP ships fast with simple Paymaster integration
- ✅ Creators can choose to sponsor gas for viral campaigns
- ✅ Winners never need upfront funds
- ✅ No complex relayer infrastructure for MVP
- ✅ Upgrade path to meta-transactions in Phase 2 if needed

### Gas Cost Estimates

**On Arc Blockchain:**
- Commit transaction: ~$0.05-0.10 USDC
- Reveal transaction: ~$0.10-0.20 USDC
- Claim transaction: ~$0.05-0.10 USDC (deducted from prize)

**Sponsored Pool Sizing:**
- 10 tickets × $0.10 = $1 USDC
- 100 tickets × $0.10 = $10 USDC
- Creators can choose to sponsor or not

## Security Considerations

### Randomness

**Approach:** Combine creator secret + future block hash
- Creator provides unpredictable secret (committed before distribution)
- Future block hash (determined at commit deadline) adds blockchain-level randomness
- Combined via keccak256 for final seed

**Implementation Strategy:**
1. When commit period closes, store `randomnessBlock = block.number + K` (K = 10-50 blocks)
2. Creator must wait for `randomnessBlock` to arrive before revealing
3. Use `blockhash(randomnessBlock)` which was unpredictable during commit phase
4. This prevents creator from grinding/timing attacks

**Detailed Flow:**

```solidity
// Step 1: Close commit period (anyone can call after deadline)
function closeCommitPeriod(uint256 _lotteryId) external {
    require(block.timestamp >= lottery.commitDeadline, "Commit period not ended");
    require(lottery.state == LotteryState.CommitOpen, "Invalid state");
    
    // Set future block for randomness (10-50 blocks ahead)
    lottery.randomnessBlock = block.number + 20; // ~4 minutes on 12s blocks
    lottery.state = LotteryState.CommitClosed;
    
    emit CommitPeriodClosed(_lotteryId, lottery.randomnessBlock);
}

// Step 2: Reveal lottery (creator calls after randomnessBlock arrives)
function revealLottery(uint256 _lotteryId, bytes calldata _creatorSecret) external {
    require(msg.sender == lottery.creator, "Only creator");
    require(lottery.state == LotteryState.CommitClosed, "Invalid state");
    require(block.number >= lottery.randomnessBlock, "Randomness block not reached");
    require(block.number <= lottery.randomnessBlock + 256, "Blockhash expired");
    
    // Verify creator secret
    require(keccak256(_creatorSecret) == lottery.creatorCommitment, "Invalid secret");
    
    // Get future block hash (was unpredictable during commit phase)
    bytes32 blockEntropy = blockhash(lottery.randomnessBlock);
    require(blockEntropy != bytes32(0), "Blockhash unavailable");
    
    // Combine for final random seed
    lottery.randomSeed = uint256(keccak256(abi.encodePacked(_creatorSecret, blockEntropy)));
    
    // Assign prizes
    _assignPrizes(_lotteryId);
    
    lottery.state = LotteryState.RevealOpen;
    lottery.claimDeadline = block.timestamp + 24 hours;
    
    emit LotteryRevealed(_lotteryId, lottery.randomSeed);
}
```

**Why Future Block Hash?**
- **Arc Limitation**: RANDAO always returns 0 on Arc blockchain
- **Security**: Creator cannot predict future block hash during commit phase
- **No Grinding**: Using `blockhash(block.number - 1)` would allow creator to:
  1. Query current block hash before submitting reveal
  2. Simulate prize outcomes off-chain
  3. Only submit when outcomes are favorable
  4. This is a "grinding attack" that breaks fairness
- **Trade-off**: Adds 2-10 minute delay between commit close and reveal (acceptable, builds suspense)

**Why not VRF?**
- Cost: VRF costs $5-10 per request
- Complexity: Requires oracle integration
- Sufficient: Future block hash + commit-reveal provides adequate randomness for small-to-medium lotteries

**Attack Vectors Mitigated:**
- Creator manipulation: Can't know future block hash at commit time ✅
- Creator grinding: Can't simulate outcomes before reveal (block hash not yet available) ✅
- Miner/validator manipulation: Creator secret prevents single-party control ✅
- Participant gaming: Must commit before reveal ✅

**Limitations:**
- Requires waiting period (K blocks) after commit deadline before reveal
- Blockhash only available for 256 blocks (must reveal within this window)
- Not suitable for high-value lotteries (>$10k) - use VRF instead
- Theoretically vulnerable to validator manipulation (but economically irrational)

### USDC Handling on Arc

**Native USDC Integration:**
- Arc blockchain has USDC built-in at the protocol level
- No separate ERC20 contract needed
- USDC can be used for gas fees (via Paymaster)
- Transfers are native operations, not external calls

**Prize Distribution with Gasless Claiming:**
```solidity
function claimPrize(...) external nonReentrant {
    // Checks
    require(tickets[lotteryId][ticketIndex].committed, "Not committed");
    require(!tickets[lotteryId][ticketIndex].redeemed, "Already redeemed");
    
    uint256 grossPrize = tickets[lotteryId][ticketIndex].prizeAmount;
    uint256 gasCost = estimateGasCost(); // Estimate gas in USDC
    uint256 netPrize = grossPrize - gasCost;
    
    require(netPrize > 0, "Prize too small to cover gas");
    
    // Effects (update state BEFORE transfer)
    tickets[lotteryId][ticketIndex].redeemed = true;
    
    // Interactions (native USDC transfer)
    // Transfer net prize to winner
    transferNativeUSDC(msg.sender, netPrize);
    
    // Refund gas cost to tx.origin (Paymaster pattern)
    transferNativeUSDC(tx.origin, gasCost);
    
    emit PrizeClaimed(lotteryId, ticketIndex, grossPrize, netPrize, gasCost);
}
```

**Paymaster Integration:**
- Users can pay gas in USDC for commit/reveal transactions
- For claiming, gas is automatically deducted from prize
- Enables truly gasless experience for winners with $0 balance
```

### Access Control

- Only creator can reveal lottery
- Only committed ticket holders can claim
- Anyone can trigger forfeiture after deadline (permissionless)

### Input Validation

- Prize values sum equals total pool
- Deadlines are in correct order (commit < reveal < claim)
- Ticket indices are within bounds
- Secrets match committed hashes

## Performance Optimizations

### Gas Optimization

**Storage Patterns:**
- Pack struct fields to minimize storage slots
- Use mappings instead of arrays where possible
- Batch operations when feasible

**Computation:**
- Off-chain secret generation (frontend)
- Off-chain shuffle verification (optional)
- Minimal on-chain loops

### Frontend Optimization

**Caching:**
- Cache lottery data with React Query
- Local storage for ticket codes
- Optimistic UI updates

**Code Splitting:**
- Lazy load lottery creation form
- Lazy load prize animations
- Route-based code splitting

## Deployment Strategy

### Smart Contract Deployment

1. Deploy to Arc testnet
2. Verify contract on block explorer
3. Test with small prize pools
4. Deploy to Arc mainnet
5. Transfer ownership to multisig (if applicable)

### Frontend Deployment

1. Build production bundle
2. Deploy to Vercel/Netlify
3. Configure environment variables (RPC URLs, contract addresses)
4. Set up monitoring (Sentry for errors)
5. Enable analytics (PostHog/Mixpanel)

## Monitoring and Maintenance

### Contract Monitoring

- Track lottery creation rate
- Monitor gas costs
- Alert on failed transactions
- Track total value locked

### Frontend Monitoring

- Error tracking (Sentry)
- Performance monitoring (Web Vitals)
- User analytics (conversion funnels)
- Transaction success rates

## Future Enhancements

### Phase 1.5: Optional Sponsored Commits

1. **Sponsored Gas Pool**: Creators can pre-fund gas for participants
2. **UI Toggle**: Checkbox during lottery creation to enable sponsorship
3. **Gas Pool Management**: Track usage and display remaining balance
4. **Refund Mechanism**: Return unused gas to creator after lottery ends

### Phase 2: Enhanced Features

1. **Meta-Transaction Support**: Full gasless experience via relayer infrastructure
2. **Configurable Claim Windows**: Let creators choose 24h, 48h, 72h, or 1 week
3. **Auto-Claim Option**: Users pay extra gas upfront for automatic claiming
4. **Batch Lottery Creation**: Create multiple lotteries at once
5. **NFT Tickets**: Tradeable ticket NFTs instead of secret codes
6. **Social Features**: Lottery groups, recurring lotteries, leaderboards

### Phase 3: Platform Expansion

1. **Multi-Token Support**: Support ETH, other ERC20s beyond USDC
2. **Lottery Templates**: Pre-configured prize distributions
3. **Referral System**: Reward users for bringing participants
4. **Mobile App**: Native iOS/Android apps
5. **Analytics Dashboard**: Detailed stats for creators
6. **Cross-Chain**: Expand to other blockchains via CCTP

## Appendix

### Prize-Centric Assignment Algorithm (No Fisher-Yates Needed!)

Instead of shuffling all N tickets and taking the first M winners, we iterate through M prizes and randomly select from remaining committed tickets. This is O(M) instead of O(N), providing 97% gas savings for typical lotteries.

```solidity
function assignPrizes(uint256 lotteryId) internal {
    Lottery storage lottery = lotteries[lotteryId];
    
    // Build array of committed ticket indices
    uint256[] memory committedTickets = getCommittedTickets(lotteryId);
    uint256 remainingTickets = committedTickets.length;
    
    // For each prize
    for (uint256 prizeIdx = 0; prizeIdx < lottery.prizeValues.length; prizeIdx++) {
        // If no more committed tickets, remaining prizes go to rollover
        if (remainingTickets == 0) {
            lotteryRolloverPool[lotteryId] += lottery.prizeValues[prizeIdx];
            continue;
        }
        
        // Generate random index for this prize
        uint256 randomValue = uint256(keccak256(abi.encodePacked(lottery.randomSeed, prizeIdx)));
        uint256 winnerIndex = randomValue % remainingTickets;
        uint256 winningTicket = committedTickets[winnerIndex];
        
        // Assign prize
        tickets[lotteryId][winningTicket].prizeAmount = lottery.prizeValues[prizeIdx];
        
        // Remove winner from pool (swap with last, reduce length)
        committedTickets[winnerIndex] = committedTickets[remainingTickets - 1];
        remainingTickets--;
    }
}
```

**Why This Approach is Superior:**
- ✅ 97% gas savings (60k vs 2M gas for 3 prizes / 100 tickets)
- ✅ Equally random and fair (each ticket has equal probability)
- ✅ Simpler code (no custom shuffle implementation)
- ✅ Naturally handles edge cases (pool exhaustion)
- ✅ Deterministic (same seed = same results)
- ✅ No library needed

### URL Encoding for Ticket Codes

```typescript
function generateTicketUrl(lotteryId: bigint, ticketIndex: number, ticketSecret: string): string {
  const params = new URLSearchParams({
    lottery: lotteryId.toString(),
    ticket: ticketIndex.toString(),
    secret: ticketSecret,
  });
  return `${window.location.origin}/ticket?${params.toString()}`;
}
```
