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
- Fisher-Yates shuffle algorithm (no audited on-chain implementation)
- Time-based state machine (use Solidity primitives: block.timestamp)
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
    - ✅ Define LotteryCreated event with all lottery parameters
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
    - Note: No library needed - implement commit-reveal pattern manually
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.2 Implement randomness generation

    - Combine creator secret with block.prevrandao (or blockhash on older chains)
    - Use keccak256 to generate random seed
    - Store random seed in lottery struct
    - Note: No library needed - standard Solidity primitives
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

- [ ] 7. Implement forfeiture and rollover mechanism

  - [x] 7.1 Partial implementation: Uncommitted ticket prize cascade

    - ✅ Rollover pool storage (lotteryRolloverPool mapping) exists
    - ✅ Prizes for UNCOMMITTED tickets cascade to rollover during reveal
    - ✅ Implemented in _assignPrizes function
    - Note: This only handles uncommitted tickets, not unclaimed prizes after deadline
    - _Requirements: 6.2, 6.3, 6.4_

  - [ ] 7.2 Implement finalizeLottery function for unclaimed prizes
    - Create finalizeLottery function callable after claim deadline
    - Iterate through all assigned prizes and identify unclaimed ones
    - Add unclaimed prize amounts to lotteryRolloverPool
    - Verify claim deadline has passed
    - Transition lottery state to Finalized
    - Emit PrizesForfeited event with total forfeited amount
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ] 7.3 Implement rollover integration with new lotteries
    - Add mechanism for new lottery creators to pull from rollover pool
    - Update createLottery to optionally include rollover funds
    - Add view function to check available rollover pool balance
    - Document how rollover funds are distributed to future lotteries
    - _Requirements: 6.5, 6.7, 6.8_

- [ ] 8. Add security features and access control

  - [ ] 8.1 Implement ReentrancyGuard

    - Use Solady's ReentrancyGuard for gas efficiency (import from solady/utils/ReentrancyGuard.sol)
    - Apply nonReentrant modifier to claimPrize
    - Note: Solady is already installed in contract/lib/solady
    - Note: createLottery doesn't need reentrancy protection (no external calls during state changes)
    - _Requirements: 9.1_

  - [x] 8.2 Native ETH transfer safety (UPDATED)

    - ✅ Contract uses native ETH transfers via payable addresses
    - ✅ Follows checks-effects-interactions pattern in claimPrize
    - ✅ State updated before external calls
    - ✅ Uses require() to verify transfer success
    - Note: Arc blockchain uses native ETH, not ERC20 USDC tokens
    - _Requirements: 9.2, 11.1_

  - [x] 8.3 Implement access control modifiers

    - ✅ Access control implemented inline in functions
    - ✅ revealLottery checks msg.sender == lottery.creator
    - ✅ claimPrize verifies ticket holder committed
    - ✅ Ticket indices validated in commitTicket
    - ✅ Custom errors used for all validation failures
    - _Requirements: 9.4_

- [ ] 9. Implement timeout and refund mechanism

  - [ ] 9.1 Create refund function for failed reveals
    - Check 24 hours have passed since reveal time
    - Verify lottery has not been revealed
    - Refund all prizes to creator
    - Transition to Finalized state
    - _Requirements: 4.11, 9.7_

- [x]\* 10. Write comprehensive smart contract tests with Foundry

  - [x]\* 10.1 Unit tests for lottery creation (test/LotteryFactory.t.sol)

    - ✅ Write test for valid lottery creation using forge test
    - ✅ Test invalid prize distributions (fuzz testing)
    - ✅ Test invalid deadline ordering
    - ✅ Test native ETH deposit handling
    - ✅ Use Foundry's vm.prank for different users
    - ✅ 100+ test cases covering all scenarios
    - _Requirements: 1.1-1.8_

  - [x]\* 10.2 Unit tests for commit phase

    - ✅ Test successful commits with vm.warp for time manipulation
    - ✅ Test commits after deadline
    - ✅ Test duplicate commits
    - ✅ Test multiple tickets and partial commitments
    - ✅ Use Foundry's expectRevert for error testing
    - _Requirements: 3.1-3.8_

  - [x]\* 10.3 Unit tests for reveal and prize assignment

    - ✅ Test reveal with correct secret
    - ✅ Test reveal with incorrect secret using expectRevert
    - ✅ Test prize cascade for uncommitted tickets
    - ✅ Test randomness generation with different block hashes
    - ✅ Test primary use case: 3 prizes, 100 tickets
    - _Requirements: 4.1-4.12_

  - [ ]\* 10.4 Unit tests for claiming

    - Test successful claims
    - Test gasless claiming mechanism
    - Test claims without commit
    - Test double redemption prevention
    - Use vm.expectEmit for event testing
    - _Requirements: 5.1-5.12_

  - [ ]\* 10.5 Integration tests for full lifecycle
    - Test complete lottery flow with multiple users
    - Test multiple participants using vm.startPrank/vm.stopPrank
    - Test partial commitment scenarios
    - Test forfeiture and rollover
    - Use Foundry's invariant testing for edge cases
    - _Requirements: All_

- [ ] 11. Set up frontend integration with existing React app

  - [ ] 11.1 Install Web3 dependencies

    - Install wagmi for Arc blockchain interaction (bun add wagmi)
    - Install viem for Ethereum utilities (bun add viem)
    - Install @tanstack/react-query for data fetching (bun add @tanstack/react-query)
    - Install wallet connection library - RainbowKit (bun add @rainbow-me/rainbowkit) or ConnectKit
    - Install additional UI libraries: qrcode.react, canvas-confetti
    - _Requirements: 11.2_

  - [ ] 11.2 Configure Arc blockchain connection

    - Create wagmi config in fe/src/lib/wagmi.ts
    - Add Arc network configuration (chain ID, RPC URLs, block explorer)
    - Set up RPC endpoints for Arc testnet and mainnet
    - Configure wallet connection provider in main.tsx
    - Add network switching logic
    - _Requirements: 11.3, 11.4_

  - [ ] 11.3 Generate contract types and ABIs

    - Build contracts with forge build to generate ABI
    - Copy ABI from contract/out/LotteryFactory.sol/LotteryFactory.json to fe/src/contracts/
    - Generate TypeScript types with wagmi CLI (wagmi generate) or manually
    - Create contract configuration file (fe/src/contracts/config.ts) with addresses and ABI
    - _Requirements: 11.2_

  - [ ] 11.4 Set up TanStack Router routes
    - Create route for lottery creation (fe/src/routes/create.tsx)
    - Create route for ticket redemption (fe/src/routes/ticket.tsx)
    - Create route for lottery dashboard (fe/src/routes/dashboard.tsx)
    - Create route for lottery details (fe/src/routes/lottery.$id.tsx)
    - Update \_\_root.tsx with navigation if needed
    - _Requirements: General navigation_

- [ ] 12. Implement lottery creation UI

  - [ ] 12.1 Install shadcn/ui components

    - Install required shadcn components: Button, Input, Label, Card, Alert, Checkbox
    - Use: bunx shadcn@latest add button input label card alert checkbox
    - Components will be added to fe/src/components/ui/
    - _Requirements: 1.1, 2.1_

  - [ ] 12.2 Create crypto utilities in fe/src/lib/crypto.ts

    - Generate cryptographically secure random secrets using Web Crypto API
    - Implement keccak256 hashing using viem's keccak256 function
    - Create functions: generateSecret(), hashSecret(), generateTicketSecrets()
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ] 12.3 Create CreateLotteryForm component in fe/src/components/lottery/

    - Build form with prize distribution inputs (dynamic array)
    - Add number of tickets input
    - Add commit deadline and reveal time inputs (datetime-local or date picker)
    - Add optional sponsored gas checkbox
    - Implement form validation (prize sum, deadline ordering)
    - Use TailwindCSS for styling
    - _Requirements: 1.1, 2.1_

  - [ ] 12.4 Create useCreateLottery hook in fe/src/hooks/

    - Use wagmi's useWriteContract for contract interaction
    - Handle USDC approval if needed (useWriteContract for approve)
    - Call createLottery contract function with generated secrets
    - Wait for transaction confirmation using useWaitForTransactionReceipt
    - Return lottery ID and ticket codes
    - _Requirements: 1.6, 1.7, 11.6_

  - [ ] 12.5 Build ticket distribution UI component
    - Create TicketDistribution component in fe/src/components/lottery/
    - Display creator secret with prominent save warning (use shadcn Alert)
    - Generate redemption URLs for each ticket
    - Create QR codes for tickets using qrcode.react
    - Add copy link buttons (use shadcn Button with lucide-react Copy icon)
    - Add download all option (CSV or JSON export)
    - _Requirements: 1.8, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 13. Implement ticket commit UI

  - [ ] 13.1 Create ticket redemption page (fe/src/routes/ticket.tsx)

    - Parse ticket parameters from URL query string (lottery, ticket, secret)
    - Use TanStack Router's useSearch hook to get query params
    - Display ticket information (lottery ID, ticket index)
    - Show commit deadline countdown using Countdown component
    - Display "Step 1: Enter Draw" UI with clear instructions
    - _Requirements: 2.6, 3.2_

  - [ ] 13.2 Create useCommitTicket hook in fe/src/hooks/

    - Validate commit deadline hasn't passed (check against block.timestamp)
    - Hash ticket secret using keccak256 from crypto utilities
    - Use wagmi's useWriteContract to call commitTicket function
    - Handle sponsored vs standard commits (detect if sponsoredGasPool > 0)
    - Wait for transaction confirmation
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 11.6_

  - [ ] 13.3 Create TicketCommit component in fe/src/components/ticket/

    - Show success animation after commit (use tw-animate-css or Framer Motion)
    - Display "Come back after [reveal time]" message with countdown
    - Add calendar reminder option (generate .ics file or calendar link)
    - Store commit status in local storage to persist across page reloads
    - _Requirements: 3.6_

- [ ] 14. Implement reveal UI for creators

  - [ ] 14.1 Create lottery dashboard (fe/src/routes/dashboard.tsx)

    - Use wagmi's useReadContract to fetch lotteries created by connected wallet
    - Display all lotteries in a grid/list using shadcn Card components
    - Show lottery status (state enum) and countdown to next deadline
    - Add "Reveal Lottery" button when state is CommitClosed and reveal time reached
    - Filter and sort lotteries by status
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 14.2 Create RevealLotteryModal component in fe/src/components/lottery/

    - Install shadcn Dialog component (bunx shadcn@latest add dialog)
    - Prompt for creator secret input
    - Verify secret matches commitment locally before submitting
    - Display estimated gas cost using wagmi's useEstimateGas
    - Show warning about transaction finality
    - _Requirements: 4.2, 4.3_

  - [ ] 14.3 Create useRevealLottery hook in fe/src/hooks/
    - Use wagmi's useWriteContract to call revealLottery function
    - Pass creator secret as bytes parameter
    - Wait for transaction confirmation using useWaitForTransactionReceipt
    - Display success message with lottery state transition
    - Handle errors (invalid secret, wrong state, etc.)
    - _Requirements: 4.4, 4.5, 11.6_

- [ ] 15. Implement prize reveal and claim UI

  - [ ] 15.1 Create prize checking UI in TicketReveal component

    - Display "Step 2: Check & Claim!" when lottery state is RevealOpen
    - Add "Check Prize" button using shadcn Button
    - Use wagmi's useReadContract to fetch ticket prize amount
    - Show loading animation while fetching (use tw-animate-css or skeleton)
    - Disable button if not committed or already redeemed
    - _Requirements: 5.2, 5.3, 7.1_

  - [ ] 15.2 Create PrizeAnimation component in fe/src/components/ticket/

    - Build suspenseful reveal animation (use CSS animations or tw-animate-css)
    - Add confetti for winners using canvas-confetti library
    - Show encouraging message for losers (use shadcn Alert with info variant)
    - Display prize amount prominently with USDC formatting (6 decimals)
    - Add different animations based on prize tier (big winner vs small prize)
    - _Requirements: 5.3, 5.4, 5.5, 7.2, 7.3, 7.4_

  - [ ] 15.3 Create useClaimPrize hook in fe/src/hooks/

    - Fetch gross prize amount from contract
    - Estimate gas cost in USDC using wagmi's useEstimateGas
    - Calculate and display net prize (gross - gas)
    - Use wagmi's useWriteContract to call claimPrize function
    - Pass ticket secret as bytes parameter
    - Wait for transaction confirmation
    - Show success confirmation with actual amounts claimed
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.12, 11.6_

  - [ ] 15.4 Add social sharing features
    - Create ShareButtons component in fe/src/components/shared/
    - Generate shareable result text (won X USDC in mystery lottery)
    - Add Twitter share button with pre-filled text and URL
    - Add copy link button using navigator.clipboard API
    - Optional: Generate shareable image using canvas API
    - _Requirements: 7.7, 7.8, 13.1, 13.2_

- [ ] 16. Implement countdown and deadline UI

  - [ ] 16.1 Create Countdown component in fe/src/components/shared/

    - Accept deadline timestamp as prop
    - Calculate time remaining using Date.now() and deadline
    - Update every second using setInterval or useInterval hook
    - Display different formats: "X days Y hours" or "X hours Y minutes" or "X minutes Y seconds"
    - Handle expired state with "Deadline passed" message
    - Use TailwindCSS for styling with color changes as deadline approaches
    - _Requirements: 2.6, 3.2, 5.2, 6.9_

  - [ ] 16.2 Add deadline warnings in ticket and claim UIs
    - Show "⚠️ Claim within 24 hours!" banner using shadcn Alert (destructive variant)
    - Display "Claim by [deadline] or prize goes to next lottery" message
    - Add urgent styling (red/orange colors) when less than 6 hours remain
    - Add pulsing animation for final hour
    - _Requirements: 6.9, 6.10_

- [ ] 17. Implement error handling and validation

  - [ ] 17.1 Create validation utilities in fe/src/lib/validation.ts

    - Validate prize sum equals total pool
    - Validate deadline ordering (commit < reveal < claim)
    - Validate USDC amounts (positive, within reasonable bounds)
    - Validate ticket indices and array lengths
    - Export validation functions for use in forms
    - _Requirements: 12.1_

  - [ ] 17.2 Handle transaction errors in hooks

    - Parse contract revert reasons from wagmi error objects
    - Map custom errors to user-friendly messages
    - Handle user rejection (UserRejectedRequestError)
    - Handle insufficient gas/balance errors
    - Display errors using toast notifications or shadcn Alert
    - _Requirements: 12.2, 12.5_

  - [ ] 17.3 Add state-based error handling in components
    - Check lottery state before showing actions
    - Show "Commit period closed" when deadline passed
    - Show "Already committed" if user already entered
    - Show "Already redeemed" if prize already claimed
    - Disable buttons and show explanatory messages
    - _Requirements: 12.5, 12.6_

- [ ] 18. Add monitoring and analytics

  - [ ] 18.1 Set up error tracking

    - Integrate Sentry for error monitoring
    - Track transaction failures
    - Monitor contract interaction errors
    - _Requirements: General quality_

  - [ ]\* 18.2 Add user analytics
    - Track lottery creation events
    - Track commit and claim rates
    - Monitor conversion funnels
    - _Requirements: General quality_

- [ ] 19. Deploy and verify contracts with Foundry

  - [ ] 19.1 Configure Arc network in foundry.toml

    - Add Arc testnet RPC URL and chain ID
    - Add Arc mainnet RPC URL and chain ID
    - Configure etherscan API key for verification (if Arc has block explorer API)
    - Set optimizer settings for production deployment
    - _Requirements: All_

  - [ ] 19.2 Deploy to Arc testnet

    - Update script/LotteryFactory.s.sol with proper deployment logic
    - Use forge script to deploy: forge script script/LotteryFactory.s.sol --rpc-url arc-testnet --broadcast
    - Verify contract with forge verify-contract (if supported)
    - Save deployment address to deployments.json or .env
    - Test with small prize pools and real USDC
    - _Requirements: All_

  - [ ] 19.3 Deploy to Arc mainnet
    - Review and audit deployment script
    - Use forge script with --broadcast for mainnet: forge script script/LotteryFactory.s.sol --rpc-url arc-mainnet --broadcast --verify
    - Verify contract on Arc block explorer
    - Transfer ownership if needed using cast send (if Ownable is implemented)
    - Document deployment addresses in README and frontend config
    - _Requirements: All_

- [ ] 20. Deploy frontend application

  - [ ] 20.1 Configure production environment

    - Create .env.production file in fe/ directory
    - Set VITE_ARC_RPC_URL for mainnet RPC endpoint
    - Set VITE_LOTTERY_FACTORY_ADDRESS for deployed contract
    - Set VITE_USDC_ADDRESS for Arc's native USDC contract
    - Configure any analytics or monitoring keys
    - _Requirements: 11.2_

  - [ ] 20.2 Build and deploy with Vite

    - Run bun run build in fe/ directory to create production bundle
    - Test production build locally with bun run serve
    - Deploy to Vercel/Netlify/Cloudflare Pages (connect GitHub repo)
    - Configure build command: cd fe && bun run build
    - Configure output directory: fe/dist
    - Set environment variables in deployment platform
    - Configure custom domain if needed
    - _Requirements: All_

  - [ ] 20.3 Set up monitoring and analytics (optional)
    - Install Sentry for error tracking (bun add @sentry/react)
    - Configure Sentry in main.tsx with DSN
    - Add analytics (PostHog, Mixpanel, or Google Analytics)
    - Monitor transaction success rates and user flows
    - _Requirements: General quality_

---

## Implementation Status Summary

### ✅ Completed (Tasks 1-6)

**Smart Contract - Core Functionality:**
- ✅ Project structure and development environment set up
- ✅ Core data structures implemented (LotteryState enum, Lottery struct, TicketCommitment struct)
- ✅ Storage mappings and state variables defined (including rollover pool and sponsored gas fields)
- ✅ Custom errors and events defined for all operations
- ✅ Lottery creation function with full validation implemented
- ✅ View functions for lottery data access added (status, prizes, creator, tickets, reveal info)
- ✅ Helper view functions (isCommitPeriodOpen, isRevealReady, isClaimPeriodActive)
- ✅ Commit phase fully implemented with commitTicket function
- ✅ Commit deadline enforcement and state transition (closeCommitPeriod)
- ✅ **Reveal phase fully implemented with prize assignment**
- ✅ **Prize-centric assignment algorithm (O(M) complexity)**
- ✅ **Prize cascade for UNCOMMITTED tickets to rollover pool**
- ✅ **Randomness generation using creator secret + block.prevrandao**
- ✅ **Claim phase with gasless claiming implemented**
- ✅ Comprehensive tests written (100+ test cases covering creation, commit, reveal phases)

**Partial Implementation:**
- 🟡 **Task 7.1: Uncommitted ticket prize cascade** - Works during reveal phase
- ❌ **Task 7.2-7.3: Unclaimed prize forfeiture** - NOT implemented (critical gap)

**Test Coverage:**
- ✅ Constructor and state variable initialization
- ✅ Lottery creation with validation (prize sum, deadlines, array lengths)
- ✅ Fuzz testing for lottery creation
- ✅ All view/accessor functions tested
- ✅ Commit ticket functionality (success, errors, multiple tickets, partial commitment)
- ✅ Close commit period state transition
- ✅ Reveal lottery with secret verification
- ✅ Prize assignment with full/partial/no commitments
- ✅ Randomness generation verification
- ✅ Prize cascade to rollover pool
- ✅ Primary use case: 3 prizes, 100 tickets

### 🚧 In Progress (Tasks 7-20)

**Smart Contract - Remaining Functionality:**
- **CRITICAL: Complete forfeiture mechanism (task 7.2-7.3)** - Handle unclaimed prizes after claim deadline
- Add ReentrancyGuard to claimPrize (task 8.1) - Production security hardening
- Implement timeout refund mechanism (task 9) - Safety for failed reveals
- Complete test suite for claim phase (task 10.4-10.5) - Test claiming and full lifecycle

**Frontend - Full Implementation:**
- Web3 integration setup (task 11) - **NEXT PRIORITY**
- Lottery creation UI (task 12)
- Ticket commit UI (task 13)
- Reveal UI for creators (task 14)
- Prize reveal and claim UI (task 15)
- Countdown and deadline UI (task 16)
- Error handling and validation (task 17)
- Monitoring and analytics (task 18)

**Deployment:**
- Contract deployment to Arc testnet/mainnet (task 19)
- Frontend deployment (task 20)

### 📋 Next Steps (Priority Order)

**🚨 CRITICAL GAP IDENTIFIED:**
The forfeiture mechanism is incomplete. While uncommitted ticket prizes cascade during reveal, there's NO mechanism to handle prizes that are assigned to committed tickets but never claimed after the deadline. This is a critical missing piece for a production lottery system.

1. **🔴 CRITICAL: Implement finalizeLottery function (task 7.2)** - Complete forfeiture mechanism
   - Create finalizeLottery function to process unclaimed prizes after claim deadline
   - Iterate through assigned prizes and identify unclaimed ones
   - Add unclaimed amounts to lotteryRolloverPool
   - Transition lottery state to Finalized
   - Emit PrizesForfeited event with total forfeited amount
   - **Impact:** Without this, unclaimed prizes are locked forever, breaking the lottery economics

2. **Implement rollover integration (task 7.3)** - Enable prize pool growth
   - Add mechanism for new lotteries to pull from rollover pool
   - Update createLottery to optionally include rollover funds
   - Add view function to check available rollover balance
   - **Impact:** Enables progressive jackpots and incentivizes participation

3. **Add ReentrancyGuard (task 8.1)** - Production security
   - Import Solady's ReentrancyGuard
   - Apply nonReentrant modifier to claimPrize
   - Test reentrancy protection

4. **Implement timeout refund (task 9)** - Safety mechanism
   - Allow refund if creator fails to reveal within 24h
   - Refund all prizes to creator
   - Transition to Finalized state

5. **Complete claim phase tests (task 10.4-10.5)** - Test coverage
   - Test successful claims with gasless mechanism
   - Test double redemption prevention
   - Integration tests for full lifecycle including forfeiture

6. **Begin frontend integration (task 11)** - Start UI development
   - Install Web3 dependencies (wagmi, viem, RainbowKit)
   - Configure Arc blockchain connection
   - Generate contract types and ABIs

---

## Notes

- All tasks reference specific requirements from requirements.md
- Tasks marked with \* are optional or can be deferred to post-MVP
- Each task should be completed and tested before moving to the next
- Smart contract tasks (3-10) should be completed before frontend tasks (11-17)
- Integration testing should happen after both contract and frontend are functional
- Solady library is already installed in contract/lib/solady for gas-optimized utilities
- Frontend already has React, TanStack Router, Tailwind, and shadcn/ui configured

### ⚠️ Implementation Notes

#### Arc Blockchain Native Currency

**Arc blockchain uses native ETH as its base currency.** The current contract implementation correctly uses native ETH (msg.value) for prize pools. While the requirements and design documents mention "USDC", the implementation uses native ETH which is simpler and more gas-efficient.

**Current Implementation:**
- ✅ Uses native ETH transfers via msg.value
- ✅ All prize amounts are in wei (18 decimals for ETH)
- ✅ Simpler and more gas-efficient than ERC20 tokens
- ✅ No external token contract dependencies
- ✅ Gasless claiming implemented with gas refund to tx.origin

**Claim Phase Implementation:**
- ✅ Uses native ETH transfers with `payable` addresses
- ✅ Calculates gas costs in wei (50,000 gas * tx.gasprice)
- ✅ Transfers net prize using `address.call{value: amount}("")`
- ✅ Refunds gas to tx.origin using same pattern
- ✅ Follows checks-effects-interactions pattern for security

**If USDC token support is needed later:**
- Add ERC20 USDC handling using SafeTransferLib from Solady
- Support both native ETH and USDC token prizes
- Update UI to handle both 18 decimals (ETH) and 6 decimals (USDC)

**For now, all references to "USDC" in tasks should be interpreted as native ETH on Arc blockchain.**

#### Contract Implementation Progress

**Smart Contract Status: 75% Complete (Critical Gap Identified)**

The smart contract has excellent coverage of core functionality, but a critical forfeiture mechanism is missing:

✅ **Fully Implemented:**
- Lottery creation with comprehensive validation
- Commit phase with deadline enforcement
- Reveal phase with prize-centric assignment algorithm
- Claim phase with gasless claiming mechanism
- Prize cascade to rollover pool for UNCOMMITTED tickets (during reveal)
- Access control and input validation
- Custom errors and events for all operations
- Extensive view functions for data access

� **CRmITICAL GAP - Forfeiture Mechanism:**
- ❌ No finalizeLottery function to process UNCLAIMED prizes after claim deadline
- ❌ No mechanism to add unclaimed prizes to rollover pool
- ❌ No PrizesForfeited event emission
- ❌ No integration to add rollover funds to future lotteries
- **Impact:** Unclaimed prizes are locked forever, breaking lottery economics and user trust

**What Works vs What's Missing:**
- ✅ Uncommitted tickets → prizes cascade during reveal (works)
- ❌ Committed but unclaimed tickets → prizes locked forever (broken)

🔧 **Remaining Work:**
- **PRIORITY 1:** Implement finalizeLottery function for unclaimed prize forfeiture
- **PRIORITY 2:** Add rollover integration with new lotteries
- Add ReentrancyGuard to claimPrize for production security
- Implement timeout refund mechanism for failed reveals
- Complete test coverage for claim phase and full lifecycle

**Frontend Status: 0% Complete**

The frontend has basic React + TanStack Router structure but no lottery-specific implementation:

📦 **Available:**
- React 19.2 + TanStack Router v1.132
- TailwindCSS v4 + shadcn/ui components
- Vite build system
- Basic routing structure

❌ **Not Yet Installed:**
- wagmi + viem (Web3 integration)
- RainbowKit (wallet connection)
- Contract types and ABIs
- Any lottery-specific components or hooks

**Next Priority: Frontend Development**

With the smart contract core functionality complete, the next major milestone is frontend development. This requires:
1. Installing Web3 dependencies (wagmi, viem, RainbowKit)
2. Configuring Arc blockchain connection
3. Generating contract types from ABIs
4. Building lottery creation, commit, and claim UIstion:

**✅ Completed:**
- All data structures and state management
- Lottery creation with comprehensive validation
- Full commit phase implementation
- State transition management (CommitOpen → CommitClosed)
- Extensive view functions for data access
- 100+ test cases with fuzz testing

**🎯 Next Critical Path:**
1. Reveal phase (task 5) - Enables lottery completion
2. Claim phase (task 6) - Enables prize distribution
3. Forfeiture (task 7) - Handles unclaimed prizes
4. Security hardening (task 8) - Production readiness

**Frontend Status:**
- Basic React + TanStack Router structure in place
- shadcn/ui components available (class-variance-authority, lucide-react)
- TailwindCSS v4 configured with tw-animate-css
- No Web3 integration yet (wagmi/viem not installed)
- No lottery-specific components yet
- Ready to begin implementation once claim phase is complete
