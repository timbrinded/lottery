# Implementation Plan: Mystery Lottery System

## Overview

This implementation plan breaks down the mystery lottery system into discrete, manageable coding tasks. Each task builds incrementally on previous work, following the commit-reveal pattern with prize cascade and flexible gas model.

## Library Reuse Strategy

To avoid reinventing the wheel and maximize security, we'll use audited libraries wherever possible:

### Smart Contract Libraries

**From Solady (Gas-Optimized):**

- `ReentrancyGuard` - Reentrancy protection (more gas efficient than OpenZeppelin)
- `SafeTransferLib` - Safe ERC20 transfers (handles non-standard tokens)
- `Ownable` - Access control (gas-optimized ownership)

**Custom Implementation Required:**

- Commit-reveal pattern (no standard library available)
- Future block hash randomness (Arc doesn't support RANDAO)
- Time-based state machine (use Solidity primitives: block.timestamp, block.number)
- Prize cascade logic (protocol-specific)

**Why Solady over OpenZeppelin?**

- More gas efficient (important for user experience)
- Audits in progress by Cantina
- Trade-off: Less battle-tested than OpenZeppelin, but acceptable for non-critical utilities
- For maximum security, could use OpenZeppelin instead (slightly higher gas costs)

### Frontend Libraries

**Already Installed:**

- React + TanStack Router + Vite
- shadcn/ui components
- TailwindCSS + lucide-react icons
- Vitest for testing

**To Install:**

- wagmi + viem (Web3 interaction)
- @tanstack/react-query (data fetching)
- RainbowKit or ConnectKit (wallet connection)
- qrcode.react (QR code generation)
- canvas-confetti (winner animations)
- Framer Motion (optional, for animations)

---

## Tasks

- [x] 1. Set up project structure and development environment

  - ✅ Initialize Foundry project for smart contracts (forge init)
  - ✅ Configure foundry.toml for Arc blockchain
  - ✅ Set up Solidity version (0.8.20)
  - ✅ Create directory structure: src/ for contracts, test/ for tests, script/ for deployment
  - ✅ Install OpenZeppelin contracts (forge install OpenZeppelin/openzeppelin-contracts)
  - ✅ Install Solady for gas-optimized utilities (forge install Vectorized/solady)
  - ✅ Frontend structure with React + TanStack Router + Vite already configured
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement core lottery data structures and state management

  - [x] 2.1 Define LotteryState enum and Lottery struct

    - ✅ Create enum with states: Pending, CommitOpen, CommitClosed, RevealOpen, Finalized
    - ✅ Define Lottery struct with all required fields (creator, commitments, deadlines, prizes)
    - ✅ Add randomnessBlock field to store future block number for entropy
    - ✅ Implement TicketCommitment struct for tracking ticket state
    - ✅ Add sponsoredGasPool and sponsoredGasUsed fields for optional gas sponsorship
    - _Requirements: 1.1, 3.1, 4.1_

  - [x] 2.2 Implement storage mappings and state variables
    - ✅ Create lotteries mapping (uint256 => Lottery)
    - ✅ Create tickets mapping (lotteryId => ticketIndex => TicketCommitment)
    - ✅ Create lotteryRolloverPool mapping for forfeited prizes
    - ✅ Add lottery counter for ID generation (initialized to 1)
    - ✅ Write comprehensive tests for data structures and default values
    - _Requirements: 1.6, 3.5, 6.5_

- [x] 3. Implement lottery creation functionality

  - [x] 3.1 Define custom errors and events

    - ✅ Create custom error types for gas efficiency (InvalidPrizeSum, InvalidDeadlines, etc.)
    - ✅ Add randomness-related errors: RandomnessBlockNotReached, BlockhashExpired, BlockhashUnavailable
    - ✅ Define LotteryCreated event with all lottery parameters
    - ✅ Define CommitPeriodClosed event with randomnessBlock
    - ✅ Define TicketCommitted, LotteryRevealed, PrizeClaimed, PrizesForfeited events
    - _Requirements: 1.7, 3.6, 4.10, 5.10, 6.6_

  - [x] 3.2 Create createLottery function with validation

    - ✅ Accept creator commitment, ticket secret hashes, prize values, and deadlines
    - ✅ Validate prize values sum equals total pool
    - ✅ Validate deadlines are in correct order (commit < reveal < claim)
    - ✅ Validate array lengths match (tickets and secret hashes)
    - ✅ Generate unique lottery ID and increment counter
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.3 Handle USDC deposit and prize pool setup

    - ✅ Accept native USDC deposit from creator using Arc's native transfer (using msg.value)
    - ✅ Store prize values array in lottery struct
    - ✅ Initialize lottery state to CommitOpen
    - ✅ Set createdAt timestamp
    - ✅ Emit LotteryCreated event with lottery details
    - ✅ Add view functions for lottery data access (getLotteryStatus, getLotteryPrizes, etc.)
    - _Requirements: 1.6, 1.7, 11.1_

  - [ ]\* 3.4 Add optional sponsored gas pool feature
    - Accept additional USDC for sponsored commit gas pool
    - Store sponsoredGasPool in Lottery struct (already added in 2.1)
    - Validate gas pool amount is sufficient for expected commits
    - _Requirements: 11.9_

- [x] 4. Implement commit phase functionality

  - [x] 4.1 Create commitTicket function

    - ✅ Verify commit deadline has not passed
    - ✅ Verify ticket index is valid
    - ✅ Verify ticket secret hash matches stored hash
    - ✅ Verify ticket hasn't already been committed
    - ✅ Store ticket commitment with holder address
    - ✅ Mark ticket as committed
    - ✅ Emit TicketCommitted event
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.2 Add commit deadline enforcement and state transition

    - ✅ Check block.timestamp against commitDeadline in commitTicket
    - ✅ Revert with CommitDeadlinePassed if deadline passed
    - ✅ Create closeCommitPeriod function (callable by anyone)
    - ✅ Set randomnessBlock = block.number + K (K = 10-50 blocks) when closing commit period
    - ✅ Transition state to CommitClosed when deadline passes
    - ✅ Comprehensive tests for commit phase including edge cases
    - _Requirements: 3.4, 3.7, 3.8_

  - [ ]\* 4.3 Implement sponsored commit function
    - Create commitTicketSponsored function
    - Deduct gas cost from sponsored pool
    - Refund gas to tx.origin (relayer)
    - Track sponsoredGasUsed
    - _Requirements: 11.9_

- [x] 5. Implement reveal phase and prize assignment

  - [x] 5.1 Create revealLottery function with secret verification

    - Accept creator secret as input
    - Verify secret matches stored commitment hash using keccak256
    - Check reveal time has arrived using block.timestamp
    - Verify state is CommitClosed
    - Verify block.number >= lottery.randomnessBlock (future block has arrived)
    - Verify block.number <= lottery.randomnessBlock + 256 (blockhash still available)
    - Note: No library needed - implement commit-reveal pattern manually
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.2 Implement randomness generation using future block hash

    - Retrieve blockhash(lottery.randomnessBlock) for entropy
    - Verify blockhash is not zero (should never happen if within 256 blocks)
    - Combine creator secret with future block hash: keccak256(abi.encodePacked(secret, blockHash))
    - Store random seed in lottery struct
    - Note: Arc blockchain doesn't support RANDAO (always 0), so we use future block hash
    - Note: Future block hash prevents creator grinding attacks (can't predict during commit)
    - Note: randomnessBlock was set K blocks in future during closeCommitPeriod
    - _Requirements: 4.6, 10.1, 10.2_

  - [x] 5.3 Implement prize-centric assignment (NO Fisher-Yates needed!)

    - Build memory array of committed ticket indices
    - For each prize, generate random index: `keccak256(seed, prizeIndex) % remainingTickets`
    - Assign prize to randomly selected committed ticket
    - Remove winner from pool (swap with last, decrement length)
    - Handle case where pool exhausted (remaining prizes to rollover)
    - Note: O(M) complexity instead of O(N) - 97% gas savings!
    - _Requirements: 4.7, 4.8, 4.9, 4.10, 4.12, 10.3, 10.4_

  - [x] 5.4 Complete reveal and emit events
    - Transition state to RevealOpen
    - Set claim deadline (24 hours after reveal)
    - Emit LotteryRevealed event with seed and assignments
    - _Requirements: 4.10, 5.2, 6.1_

- [x] 6. Implement claim phase with gasless claiming

  - [x] 6.1 Create claimPrize function with validation

    - Verify user committed before deadline
    - Verify ticket secret matches stored hash
    - Check ticket has not been redeemed
    - Verify state is RevealOpen
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.11_

  - [x] 6.2 Implement gasless claiming mechanism

    - Estimate gas cost in USDC
    - Calculate net prize (gross - gas)
    - Verify net prize is positive
    - Transfer net prize to winner
    - Refund gas cost to tx.origin
    - _Requirements: 5.9, 11.9, 11.11_

  - [x] 6.3 Update state and emit events
    - Mark ticket as redeemed
    - Emit PrizeClaimed event with gross, net, and gas amounts
    - _Requirements: 5.10, 5.12_

- [x] 7. Implement forfeiture and rollover mechanism

  - [x] 7.1 Uncommitted ticket prize cascade

    - ✅ Rollover pool storage (lotteryRolloverPool mapping) exists
    - ✅ Prizes for UNCOMMITTED tickets cascade to rollover during reveal
    - ✅ Implemented in \_assignPrizes function
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 7.2 Implement finalizeLottery function for unclaimed prizes

    - ✅ Created finalizeLottery function callable after claim deadline
    - ✅ Iterates through all assigned prizes and identifies unclaimed ones
    - ✅ Adds unclaimed prize amounts to lotteryRolloverPool
    - ✅ Verifies claim deadline has passed
    - ✅ Transitions lottery state to Finalized
    - ✅ Emits PrizesForfeited event with total forfeited amount
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 7.3 Implement rollover integration with new lotteries
    - ✅ createLottery accepts optional \_rolloverLotteryId parameter
    - ✅ Pulls rollover funds from specified lottery and adds to prize pool
    - ✅ Clears rollover pool after funds are used
    - ✅ getRolloverPool() view function returns balance for specific lottery
    - ✅ getTotalRolloverPool() view function returns sum across all lotteries
    - _Requirements: 6.5, 6.7, 6.8_

- [x] 8. Add security features and access control

  - [x] 8.1 Implement ReentrancyGuard

    - Import Solady's ReentrancyGuard: `import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol"`
    - Make LotteryFactory inherit from ReentrancyGuard
    - Apply nonReentrant modifier to claimPrize function
    - Write test to verify reentrancy protection (attempt recursive call)
    - Note: Solady is already installed in contract/lib/solady
    - Note: createLottery doesn't need protection (no external calls during state changes)
    - _Requirements: 9.1_

  - [x] 8.2 Native ETH transfer safety

    - ✅ Contract uses native ETH transfers via payable addresses
    - ✅ Follows checks-effects-interactions pattern in claimPrize
    - ✅ State updated before external calls (ticket.redeemed = true)
    - ✅ Uses require() to verify transfer success
    - ✅ Transfers net prize to winner, then refunds gas to tx.origin
    - Note: Arc blockchain uses native ETH for prizes and gas
    - _Requirements: 9.2, 11.1_

  - [x] 8.3 Implement access control modifiers

    - ✅ Access control implemented inline in functions
    - ✅ revealLottery checks msg.sender == lottery.creator
    - ✅ claimPrize verifies ticket holder committed
    - ✅ Ticket indices validated in commitTicket
    - ✅ Custom errors used for all validation failures
    - _Requirements: 9.4_

- [-] 9. Implement timeout and refund mechanism

  - [x] 9.1 Create refundLottery function for failed reveals
    - Create refundLottery(uint256 \_lotteryId) external function
    - Verify lottery is in CommitClosed state (not revealed)
    - Verify 24 hours have passed since revealTime
    - Transfer totalPrizePool back to lottery.creator
    - Transition lottery state to Finalized
    - Emit LotteryRefunded event with lotteryId and amount
    - Write tests for successful refund and edge cases
    - _Requirements: 4.11, 9.7_

- [x] 10. Complete smart contract test coverage

  - [x] 10.1 Unit tests for lottery creation

    - ✅ Valid lottery creation with all validations
    - ✅ Invalid prize distributions (fuzz testing)
    - ✅ Invalid deadline ordering
    - ✅ Native ETH deposit handling
    - ✅ Multiple sequential lotteries
    - ✅ 100+ test cases covering all scenarios
    - _Requirements: 1.1-1.8_

  - [x] 10.2 Unit tests for commit phase

    - ✅ Successful commits with time manipulation
    - ✅ Commits after deadline
    - ✅ Duplicate commits
    - ✅ Multiple tickets and partial commitments
    - ✅ Close commit period state transition
    - _Requirements: 3.1-3.8_

  - [x] 10.3 Unit tests for reveal and prize assignment

    - ✅ Reveal with correct/incorrect secret
    - ✅ Prize cascade for uncommitted tickets
    - ✅ Randomness generation verification
    - ✅ Primary use case: 3 prizes, 100 tickets
    - ✅ Full/partial/no commitment scenarios
    - _Requirements: 4.1-4.12_

  - [x] 10.4 Unit tests for claim phase

    - Test successful claims with gasless mechanism
    - Test gas cost calculation and deduction
    - Test net prize transfer to winner
    - Test gas refund to tx.origin
    - Test claims without commit (should revert)
    - Test double redemption prevention
    - Test claims with invalid secret
    - Use vm.expectEmit for PrizeClaimed event
    - _Requirements: 5.1-5.12_

  - [x] 10.5 Integration tests for full lifecycle
    - Test complete lottery flow: create → commit → reveal → claim → finalize
    - Test multiple participants using vm.startPrank/vm.stopPrank
    - Test partial commitment with forfeiture
    - Test rollover integration (create lottery with rollover funds)
    - Test timeout refund scenario (once implemented)
    - Use Foundry's invariant testing for edge cases
    - _Requirements: All_

- [x] 11. Set up frontend Web3 integration

  - [x] 11.1 Install Web3 dependencies

    - Run: `cd fe && bun add wagmi viem @tanstack/react-query`
    - Run: `bun add @rainbow-me/rainbowkit` (wallet connection UI)
    - Run: `bun add qrcode.react canvas-confetti` (QR codes and animations)
    - Verify installations in fe/package.json
    - _Requirements: 11.2_

  - [x] 11.2 Configure Arc blockchain connection

    - Create fe/src/lib/wagmi.ts with Arc chain configuration
    - Define Arc testnet chain: { id, name, rpcUrls, blockExplorers, nativeCurrency }
    - Create wagmi config with Arc chain and connectors
    - Wrap app in WagmiProvider and QueryClientProvider in main.tsx
    - Add RainbowKitProvider for wallet connection UI
    - Test wallet connection with MetaMask/WalletConnect
    - _Requirements: 11.3, 11.4_

  - [x] 11.3 Generate contract types and ABIs

    - Run: `cd contract && forge build` to compile contracts
    - Copy contract/out/LotteryFactory.sol/LotteryFactory.json to fe/src/contracts/
    - Create fe/src/contracts/LotteryFactory.ts with ABI export
    - Create fe/src/contracts/config.ts with contract address constants
    - Generate TypeScript types from ABI (manually or with wagmi CLI)
    - Export typed contract hooks for use in components
    - _Requirements: 11.2_

  - [x] 11.4 Set up TanStack Router routes
    - Create fe/src/routes/create.tsx (lottery creation page)
    - Create fe/src/routes/ticket.tsx (ticket redemption with query params)
    - Create fe/src/routes/dashboard.tsx (creator dashboard)
    - Create fe/src/routes/lottery.$id.tsx (lottery details page)
    - Update \_\_root.tsx with Header navigation component
    - Test routing with TanStack Router DevTools
    - _Requirements: General navigation_

- [x] 12. Implement lottery creation UI

  - [x] 12.1 Install shadcn/ui components

    - Run: `cd fe && bunx shadcn@latest add button input label card alert`
    - Run: `bunx shadcn@latest add form select textarea badge`
    - Verify components added to fe/src/components/ui/
    - _Requirements: 1.1, 2.1_

  - [x] 12.2 Create crypto utilities in fe/src/lib/crypto.ts

    - Import keccak256 from viem: `import { keccak256, toBytes, toHex } from 'viem'`
    - Create generateSecret(): string - uses crypto.randomBytes(32)
    - Create hashSecret(secret: string): `0x${string}` - uses keccak256
    - Create generateTicketSecrets(count: number): string[] - array of secrets
    - Export all functions for use in components
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 12.3 Create CreateLotteryForm component

    - Create fe/src/components/lottery/CreateLotteryForm.tsx
    - Use shadcn Form with react-hook-form for validation
    - Add dynamic prize inputs (add/remove prize fields)
    - Add number of tickets input (1-1000)
    - Add commit deadline (hours before reveal) and reveal time inputs
    - Validate: prize sum > 0, deadlines in order, tickets > prizes
    - Display total ETH required for prize pool
    - _Requirements: 1.1, 2.1_

  - [x] 12.4 Create useCreateLottery hook

    - Create fe/src/hooks/useCreateLottery.ts
    - Generate creator secret and commitment hash
    - Generate ticket secrets and hashes
    - Use wagmi's useWriteContract to call createLottery
    - Pass: creatorCommitment, ticketSecretHashes, prizeValues, deadlines, rolloverLotteryId
    - Use useWaitForTransactionReceipt to wait for confirmation
    - Return: { lotteryId, creatorSecret, ticketSecrets, isLoading, error }
    - _Requirements: 1.6, 1.7, 11.6_

  - [x] 12.5 Build ticket distribution UI
    - Create fe/src/components/lottery/TicketDistribution.tsx
    - Display creator secret in Alert with "⚠️ SAVE THIS SECRET!" warning
    - Generate redemption URLs: `/ticket?lottery=${id}&ticket=${idx}&secret=${secret}`
    - Render QR codes using qrcode.react for each ticket
    - Add copy button for each ticket URL (use navigator.clipboard)
    - Add "Download All" button to export JSON with all ticket data
    - _Requirements: 1.8, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 13. Implement ticket commit UI

  - [ ] 13.1 Create ticket redemption page

    - Create fe/src/routes/ticket.tsx with TanStack Router
    - Use useSearch() to parse query params: { lottery, ticket, secret }
    - Fetch lottery data using wagmi's useReadContract
    - Display lottery ID, ticket index, and commit deadline
    - Show Countdown component for commit deadline
    - Display "Step 1: Enter Draw" with clear instructions
    - Handle invalid/missing query params gracefully
    - _Requirements: 2.6, 3.2_

  - [ ] 13.2 Create useCommitTicket hook

    - Create fe/src/hooks/useCommitTicket.ts
    - Import hashSecret from crypto utilities
    - Check if commit deadline passed using lottery.commitDeadline
    - Use wagmi's useWriteContract to call commitTicket(lotteryId, ticketIndex, secretHash)
    - Use useWaitForTransactionReceipt for confirmation
    - Return: { commit, isLoading, isSuccess, error }
    - Handle errors: CommitDeadlinePassed, TicketAlreadyCommitted, InvalidTicketSecret
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 11.6_

  - [ ] 13.3 Create TicketCommit component

    - Create fe/src/components/ticket/TicketCommit.tsx
    - Show "Enter Draw" button that calls useCommitTicket
    - Display success animation after commit (tw-animate-css bounce/fade)
    - Show "✅ Entered! Come back after [reveal time]" message
    - Add countdown to reveal time
    - Store commit status in localStorage: `committed_${lotteryId}_${ticketIndex}`
    - Disable button if already committed or deadline passed
    - _Requirements: 3.6_

- [ ] 14. Implement reveal UI for creators

  - [ ] 13.4 Create useCloseCommitPeriod hook

    - Create fe/src/hooks/useCloseCommitPeriod.ts
    - Use wagmi's useWriteContract to call closeCommitPeriod(lotteryId)
    - Check if block.timestamp >= lottery.commitDeadline
    - Use useWaitForTransactionReceipt for confirmation
    - Return: { closeCommit, isLoading, isSuccess, error }
    - This can be called by anyone (not just creator) after commit deadline
    - _Requirements: 3.7, 3.8_

  - [ ] 14.1 Create lottery dashboard

    - Create fe/src/routes/dashboard.tsx
    - Fetch all lotteries where creator === connected wallet address
    - Use event logs or iterate through lotteryCounter to find creator's lotteries
    - Display lotteries in grid using shadcn Card components
    - Show: lottery ID, prize pool, state, commit/reveal/claim deadlines, randomnessBlock
    - Add countdown timers for each deadline
    - Show "Close Commit Period" button when state === CommitOpen && now >= commitDeadline
    - Show "Reveal Lottery" button when state === CommitClosed && block.number >= randomnessBlock
    - Show waiting message when CommitClosed but block.number < randomnessBlock (with block countdown)
    - Filter by state: Active, Pending Reveal, Waiting for Randomness, Revealed, Finalized
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 14.2 Create RevealLotteryModal component

    - Run: `cd fe && bunx shadcn@latest add dialog`
    - Create fe/src/components/lottery/RevealLotteryModal.tsx
    - Accept lotteryId and creatorCommitment as props
    - Input field for creator secret
    - Verify keccak256(secret) === creatorCommitment locally before submit
    - Show error if secret doesn't match: "Invalid secret"
    - Display estimated gas cost
    - Show warning: "This action is irreversible and will assign prizes"
    - _Requirements: 4.2, 4.3_

  - [ ] 14.3 Create useRevealLottery hook
    - Create fe/src/hooks/useRevealLottery.ts
    - Check if block.number >= lottery.randomnessBlock before allowing reveal
    - Use wagmi's useWriteContract to call revealLottery(lotteryId, creatorSecret)
    - Convert secret string to bytes using toBytes from viem
    - Use useWaitForTransactionReceipt for confirmation
    - Return: { reveal, isLoading, isSuccess, error, canReveal, blocksRemaining }
    - Handle errors: InvalidCreatorSecret, RandomnessBlockNotReached, BlockhashExpired
    - Display countdown: "Randomness available in X blocks (~Y minutes)"
    - _Requirements: 4.4, 4.5, 11.6_

- [ ] 15. Implement prize reveal and claim UI

  - [ ] 15.1 Create prize checking UI

    - Update fe/src/routes/ticket.tsx to show "Step 2: Check & Claim!"
    - Display when lottery.state === RevealOpen
    - Add "Check Prize" button
    - Use useReadContract to fetch tickets[lotteryId][ticketIndex].prizeAmount
    - Show loading spinner while fetching
    - Disable if !committed or already redeemed
    - Display prize amount in ETH with formatEther from viem
    - _Requirements: 5.2, 5.3, 7.1_

  - [ ] 15.2 Create PrizeAnimation component

    - Create fe/src/components/ticket/PrizeAnimation.tsx
    - Accept prizeAmount as prop
    - Show suspenseful "Checking..." animation (3 seconds)
    - If prizeAmount > 0: trigger confetti with canvas-confetti
    - If prizeAmount > 0: show "🎉 You won X ETH!" with celebration animation
    - If prizeAmount === 0: show "Better luck next time!" with encouraging message
    - Use tw-animate-css for animations (bounce, fade, pulse)
    - _Requirements: 5.3, 5.4, 5.5, 7.2, 7.3, 7.4_

  - [ ] 15.3 Create useClaimPrize hook

    - Create fe/src/hooks/useClaimPrize.ts
    - Fetch grossPrize from tickets[lotteryId][ticketIndex].prizeAmount
    - Estimate gas cost: 50000 \* gasPrice (in wei)
    - Calculate netPrize = grossPrize - gasCost
    - Display: "Gross: X ETH, Gas: Y ETH, Net: Z ETH"
    - Use useWriteContract to call claimPrize(lotteryId, ticketIndex, ticketSecret)
    - Convert secret to bytes using toBytes from viem
    - Use useWaitForTransactionReceipt for confirmation
    - Return: { claim, netPrize, isLoading, isSuccess, error }
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.12, 11.6_

  - [ ] 15.4 Add social sharing features
    - Create fe/src/components/shared/ShareButtons.tsx
    - Accept prizeAmount and lotteryId as props
    - Generate Twitter share text: "I just won X ETH in a mystery lottery! 🎉"
    - Add Twitter share button with pre-filled text and URL
    - Add "Copy Link" button using navigator.clipboard.writeText()
    - Show toast notification on successful copy
    - _Requirements: 7.7, 7.8, 13.1, 13.2_

- [ ] 16. Implement countdown and deadline UI

  - [ ] 16.1 Create Countdown component

    - Create fe/src/components/shared/Countdown.tsx
    - Accept deadline (Unix timestamp in seconds) as prop
    - Use useState and useEffect with setInterval to update every second
    - Calculate remaining: days, hours, minutes, seconds
    - Display format based on time remaining:
      - > 1 day: "X days Y hours"
      - > 1 hour: "X hours Y minutes"
      - < 1 hour: "X minutes Y seconds"
    - Show "Deadline passed" when deadline < now
    - Add color coding: green (>24h), yellow (6-24h), red (<6h)
    - _Requirements: 2.6, 3.2, 5.2, 6.9_

  - [ ] 16.1b Create BlockCountdown component

    - Create fe/src/components/shared/BlockCountdown.tsx
    - Accept targetBlock (block number) as prop
    - Use wagmi's useBlockNumber to get current block
    - Calculate remaining blocks: targetBlock - currentBlock
    - Estimate time: remainingBlocks \* 12 seconds (Arc block time)
    - Display: "X blocks remaining (~Y minutes)"
    - Show "Block reached!" when currentBlock >= targetBlock
    - Add color coding: green (>10 blocks), yellow (5-10 blocks), red (<5 blocks)
    - _Requirements: 4.6, 10.2_

  - [ ] 16.2 Add deadline warnings

    - Add Alert component to ticket.tsx when lottery.state === RevealOpen
    - Show "⚠️ Claim within 24 hours or prize goes to rollover pool!"
    - Use shadcn Alert with destructive variant (red)
    - Display claim deadline: formatDate(lottery.claimDeadline)
    - Add pulsing animation when < 1 hour remains (tw-animate-pulse)
    - Change Alert color based on urgency: yellow (>6h), red (<6h)
    - _Requirements: 6.9, 6.10_

- [ ] 17. Implement error handling and validation

  - [ ] 17.1 Create validation utilities

    - Create fe/src/lib/validation.ts
    - validatePrizeSum(prizes: bigint[]): boolean - sum > 0
    - validateDeadlines(commit: number, reveal: number): boolean - commit < reveal
    - validateTicketCount(tickets: number, prizes: number): boolean - tickets >= prizes
    - validateEthAmount(amount: bigint): boolean - amount > 0 && amount < MAX_SAFE_ETH
    - Export all validation functions
    - _Requirements: 12.1_

  - [ ] 17.2 Handle transaction errors in hooks

    - Create fe/src/lib/errors.ts with error mapping
    - Map contract errors to user messages:
      - CommitDeadlinePassed → "Commit period has ended"
      - RandomnessBlockNotReached → "Please wait for randomness block (X blocks remaining)"
      - BlockhashExpired → "Reveal window expired, lottery can be refunded"
      - InvalidCreatorSecret → "Invalid creator secret"
      - TicketAlreadyRedeemed → "Prize already claimed"
    - Handle wagmi errors:
      - UserRejectedRequestError → "Transaction cancelled"
      - InsufficientFundsError → "Insufficient ETH for transaction"
    - Use shadcn Toast or Alert to display errors
    - _Requirements: 12.2, 12.5_

  - [ ] 17.3 Add state-based error handling

    - In ticket.tsx, check lottery.state before showing actions
    - If state === CommitOpen && now > commitDeadline: show "Commit period closed"
    - If ticket.committed: show "Already entered" (check localStorage)
    - If ticket.redeemed: show "Prize already claimed"
    - Disable buttons with explanatory tooltips
    - Use shadcn Badge to show lottery state visually
    - _Requirements: 12.5, 12.6_

- [ ]\* 18. Add monitoring and analytics (Optional - Post-MVP)

  - [ ]\* 18.1 Set up error tracking

    - Install Sentry: `cd fe && bun add @sentry/react`
    - Configure Sentry in main.tsx with DSN
    - Track transaction failures and contract errors
    - _Requirements: General quality_

  - [ ]\* 18.2 Add user analytics
    - Install PostHog or Mixpanel
    - Track lottery creation, commit, and claim events
    - Monitor conversion funnels
    - _Requirements: General quality_

- [ ] 19. Deploy and verify contracts

  - [ ] 19.1 Configure Arc network in foundry.toml

    - Add Arc testnet configuration to [rpc_endpoints]
    - Add Arc mainnet configuration
    - Set optimizer_runs = 200 for production
    - Configure via_ir = false for compatibility
    - _Requirements: All_

  - [ ] 19.2 Deploy to Arc testnet

    - Create deployment script: contract/script/DeployLottery.s.sol
    - Use forge create or forge script to deploy
    - Command: `forge script script/DeployLottery.s.sol --rpc-url arc-testnet --broadcast --verify`
    - Save deployment address to .env: LOTTERY_FACTORY_ADDRESS_TESTNET
    - Test with small prize pools (0.01 ETH)
    - _Requirements: All_

  - [ ] 19.3 Deploy to Arc mainnet
    - Review deployment script and contract code
    - Deploy: `forge script script/DeployLottery.s.sol --rpc-url arc-mainnet --broadcast --verify`
    - Save address to .env: LOTTERY_FACTORY_ADDRESS_MAINNET
    - Verify on Arc block explorer
    - Update frontend config with mainnet address
    - Document in README.md
    - _Requirements: All_

- [ ] 20. Deploy frontend application

  - [ ] 20.1 Configure production environment

    - Create fe/.env.production
    - Set VITE_ARC_CHAIN_ID (Arc mainnet chain ID)
    - Set VITE_ARC_RPC_URL (Arc mainnet RPC)
    - Set VITE_LOTTERY_FACTORY_ADDRESS (deployed contract address)
    - Set VITE_BLOCK_EXPLORER_URL (Arc block explorer)
    - _Requirements: 11.2_

  - [ ] 20.2 Build and deploy

    - Run: `cd fe && bun run build` to create production bundle
    - Test locally: `bun run serve` and verify all features work
    - Deploy to Vercel:
      - Connect GitHub repo
      - Set build command: `cd fe && bun run build`
      - Set output directory: `fe/dist`
      - Add environment variables from .env.production
    - Test deployed app with Arc testnet first
    - Switch to mainnet after testing
    - _Requirements: All_

  - [ ]\* 20.3 Set up monitoring (Optional)
    - Install Sentry: `cd fe && bun add @sentry/react`
    - Configure in main.tsx with DSN
    - Monitor transaction success rates
    - Track user flows and errors
    - _Requirements: General quality_

---

## Critical Fix: Randomness Implementation

**Issue Identified:** The current implementation uses `block.prevrandao` for randomness, but the design document explicitly states that Arc blockchain doesn't support RANDAO (always returns 0). The design specifies using future block hash with a `randomnessBlock` mechanism to prevent creator grinding attacks.

- [x] 21. Fix randomness generation to match design specification

  - [x] 21.1 Update closeCommitPeriod function implementation

    - Modify `closeCommitPeriod` to set `randomnessBlock = block.number + K` (where K = 10-50 blocks)
    - Add event emission: `CommitPeriodClosed(lotteryId, randomnessBlock)`
    - Update tests to verify randomnessBlock is set correctly
    - Test that closeCommitPeriod can only be called after commit deadline
    - Test that closeCommitPeriod transitions state from CommitOpen to CommitClosed
    - _Requirements: 4.6, 10.2_

  - [x] 21.2 Update revealLottery to use future block hash

    - Replace `block.prevrandao` with `blockhash(lottery.randomnessBlock)`
    - Add validation: `require(block.number >= lottery.randomnessBlock, "Randomness block not reached")`
    - Add validation: `require(block.number <= lottery.randomnessBlock + 256, "Blockhash expired")`
    - Add validation: `require(blockEntropy != bytes32(0), "Blockhash unavailable")`
    - Update random seed generation: `keccak256(abi.encodePacked(_creatorSecret, blockEntropy))`
    - Add custom errors: `RandomnessBlockNotReached`, `BlockhashExpired`, `BlockhashUnavailable`
    - _Requirements: 4.6, 10.1, 10.2_

  - [x] 21.3 Add randomnessBlock field to Lottery struct

    - Verify `randomnessBlock` field exists in Lottery struct (should already be there from design)
    - If missing, add: `uint256 randomnessBlock; // Block number for entropy source`
    - Initialize to 0 in createLottery function
    - _Requirements: 4.6_

  - [x] 21.4 Update view functions for randomness status

    - Update `isRevealReady` to check: `state == CommitClosed && block.number >= lottery.randomnessBlock`
    - Add getter function: `getRandomnessBlock(uint256 lotteryId) returns (uint256)`
    - Add helper function: `canRevealNow(uint256 lotteryId) returns (bool, string memory reason)`
    - Return reasons: "Commit period not closed", "Randomness block not reached", "Blockhash expired", "Ready to reveal"
    - _Requirements: 4.6_

  - [x] 21.5 Comprehensive testing for randomness mechanism

    - Test closeCommitPeriod sets randomnessBlock correctly (block.number + K)
    - Test revealLottery reverts if block.number < randomnessBlock
    - Test revealLottery reverts if block.number > randomnessBlock + 256
    - Test revealLottery succeeds when randomnessBlock <= block.number <= randomnessBlock + 256
    - Test that different block hashes produce different random seeds
    - Test that same creator secret + same block hash = same seed (deterministic)
    - Use vm.roll() to manipulate block numbers in tests
    - Use vm.prevrandao() to set block hash for testing (if needed)
    - _Requirements: 4.6, 10.1, 10.2_

  - [x] 21.6 Update integration tests for full lifecycle with randomness

    - Test complete flow: create → commit → closeCommitPeriod → wait for randomnessBlock → reveal → claim
    - Test scenario where creator tries to reveal too early (before randomnessBlock)
    - Test scenario where creator waits too long (after 256 blocks)
    - Test multiple lotteries with different randomness blocks
    - Verify prize assignments are different with different block hashes
    - _Requirements: 10.5_

  - [x] 21.7 Update design documentation if needed
    - Review design.md to ensure randomness section is accurate
    - Add note about K value (number of blocks to wait) - recommend 20 blocks (~4 minutes on 12s blocks)
    - Document the 256-block window limitation for blockhash availability
    - Add warning about refund mechanism if creator misses the reveal window
    - _Requirements: Documentation_
