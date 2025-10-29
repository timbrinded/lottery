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

- [ ] 2. Implement core lottery data structures and state management

  - [ ] 2.1 Define LotteryState enum and Lottery struct

    - Create enum with states: Pending, CommitOpen, CommitClosed, RevealOpen, Finalized
    - Define Lottery struct with all required fields (creator, commitments, deadlines, prizes)
    - Implement TicketCommitment struct for tracking ticket state
    - _Requirements: 1.1, 3.1, 4.1_

  - [ ] 2.2 Implement storage mappings and state variables
    - Create lotteries mapping (uint256 => Lottery)
    - Create tickets mapping (lotteryId => ticketIndex => TicketCommitment)
    - Create lotteryRolloverPool mapping for forfeited prizes
    - Add lottery counter for ID generation
    - _Requirements: 1.6, 3.5, 6.5_

- [ ] 3. Implement lottery creation functionality

  - [ ] 3.1 Create createLottery function with validation

    - Accept creator commitment, ticket secret hashes, prize values, and deadlines
    - Validate prize values sum equals total pool
    - Validate deadlines are in correct order (commit < reveal < claim)
    - Generate unique lottery ID
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [ ] 3.2 Handle USDC deposit and prize pool setup

    - Accept native USDC deposit from creator
    - Store prize values array in lottery struct
    - Initialize lottery state to CommitOpen
    - Emit LotteryCreated event with lottery details
    - _Requirements: 1.6, 1.7, 11.1_

  - [ ]\* 3.3 Add optional sponsored gas pool feature
    - Accept additional USDC for sponsored commit gas pool
    - Store sponsoredGasPool and sponsoredGasUsed in Lottery struct
    - Validate gas pool amount is sufficient for expected commits
    - _Requirements: 11.9_

- [ ] 4. Implement commit phase functionality

  - [ ] 4.1 Create commitTicket function

    - Verify commit deadline has not passed
    - Verify ticket index is valid
    - Store ticket commitment with holder address
    - Mark ticket as committed
    - Emit TicketCommitted event
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 4.2 Add commit deadline enforcement

    - Check block.timestamp against commitDeadline
    - Revert with "Commit period closed" if deadline passed
    - Transition state to CommitClosed when deadline passes
    - _Requirements: 3.4, 3.7, 3.8_

  - [ ]\* 4.3 Implement sponsored commit function
    - Create commitTicketSponsored function
    - Deduct gas cost from sponsored pool
    - Refund gas to tx.origin (relayer)
    - Track sponsoredGasUsed
    - _Requirements: 11.9_

- [ ] 5. Implement reveal phase and prize assignment

  - [ ] 5.1 Create revealLottery function with secret verification

    - Accept creator secret as input
    - Verify secret matches stored commitment hash using keccak256
    - Check reveal time has arrived using block.timestamp
    - Verify state is CommitClosed
    - Note: No library needed - implement commit-reveal pattern manually
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 5.2 Implement randomness generation

    - Combine creator secret with block.prevrandao (or blockhash on older chains)
    - Use keccak256 to generate random seed
    - Store random seed in lottery struct
    - Note: No library needed - standard Solidity primitives
    - _Requirements: 4.6, 10.1, 10.2_

  - [ ] 5.3 Implement prize-centric assignment (NO Fisher-Yates needed!)

    - Build memory array of committed ticket indices
    - For each prize, generate random index: `keccak256(seed, prizeIndex) % remainingTickets`
    - Assign prize to randomly selected committed ticket
    - Remove winner from pool (swap with last, decrement length)
    - Handle case where pool exhausted (remaining prizes to rollover)
    - Note: O(M) complexity instead of O(N) - 97% gas savings!
    - _Requirements: 4.7, 4.8, 4.9, 4.10, 4.12, 10.3, 10.4_

  - [ ] 5.4 Complete reveal and emit events
    - Transition state to RevealOpen
    - Set claim deadline (24 hours after reveal)
    - Emit LotteryRevealed event with seed and assignments
    - _Requirements: 4.10, 5.2, 6.1_

- [ ] 6. Implement claim phase with gasless claiming

  - [ ] 6.1 Create claimPrize function with validation

    - Verify user committed before deadline
    - Verify ticket secret matches stored hash
    - Check ticket has not been redeemed
    - Verify state is RevealOpen
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.11_

  - [ ] 6.2 Implement gasless claiming mechanism

    - Estimate gas cost in USDC
    - Calculate net prize (gross - gas)
    - Verify net prize is positive
    - Transfer net prize to winner
    - Refund gas cost to tx.origin
    - _Requirements: 5.9, 11.9, 11.11_

  - [ ] 6.3 Update state and emit events
    - Mark ticket as redeemed
    - Emit PrizeClaimed event with gross, net, and gas amounts
    - _Requirements: 5.10, 5.12_

- [ ] 7. Implement forfeiture and rollover mechanism

  - [ ] 7.1 Create processForfeitedPrizes function

    - Verify claim deadline has passed
    - Identify all unclaimed prizes
    - Calculate total forfeited amount
    - _Requirements: 6.2, 6.3, 6.4_

  - [ ] 7.2 Implement rollover to next lottery
    - Add forfeited amount to rollover pool
    - Handle case where no next lottery exists
    - Transition state to Finalized
    - Emit PrizesForfeited event
    - _Requirements: 6.5, 6.6, 6.7, 6.8_

- [ ] 8. Add security features and access control using audited libraries

  - [ ] 8.1 Implement ReentrancyGuard

    - Use Solady's ReentrancyGuard for gas efficiency (import from solady/utils/ReentrancyGuard.sol)
    - Apply nonReentrant modifier to claimPrize
    - Apply nonReentrant modifier to sensitive functions
    - Note: Solady is more gas efficient than OpenZeppelin but less battle-tested
    - _Requirements: 9.1_

  - [ ] 8.2 Add USDC transfer safety

    - Use Solady's SafeTransferLib for gas-efficient ERC20 transfers
    - Import SafeTransferLib from solady/utils/SafeTransferLib.sol
    - Use safeTransfer and safeTransferFrom for all USDC operations
    - Handles non-standard ERC20 implementations safely
    - _Requirements: 9.2, 11.1_

  - [ ] 8.3 Add input validation and error handling

    - Validate prize sum equals total pool
    - Validate deadline ordering
    - Validate ticket indices
    - Create custom error types (more gas efficient than require strings)
    - _Requirements: 9.2, 9.3, 9.8_

  - [ ] 8.4 Implement access control
    - Use Solady's Ownable for gas-efficient access control
    - Import from solady/auth/Ownable.sol
    - Restrict reveal to lottery creator only
    - Restrict claim to committed ticket holders
    - Allow permissionless forfeiture processing
    - _Requirements: 9.4_

- [ ] 9. Implement timeout and refund mechanism

  - [ ] 9.1 Create refund function for failed reveals
    - Check 24 hours have passed since reveal time
    - Verify lottery has not been revealed
    - Refund all prizes to creator
    - Transition to Finalized state
    - _Requirements: 4.11, 9.7_

- [ ]\* 10. Write comprehensive smart contract tests with Foundry

  - [ ]\* 10.1 Unit tests for lottery creation (test/LotteryFactory.t.sol)

    - Write test for valid lottery creation using forge test
    - Test invalid prize distributions (fuzz testing)
    - Test invalid deadline ordering
    - Test USDC deposit handling with mock USDC
    - Use Foundry's vm.prank for different users
    - _Requirements: 1.1-1.8_

  - [ ]\* 10.2 Unit tests for commit phase

    - Test successful commits with vm.warp for time manipulation
    - Test commits after deadline
    - Test duplicate commits
    - Test sponsored commits
    - Use Foundry's expectRevert for error testing
    - _Requirements: 3.1-3.8_

  - [ ]\* 10.3 Unit tests for reveal and prize assignment

    - Test reveal with correct secret
    - Test reveal with incorrect secret using expectRevert
    - Test prize cascade for uncommitted tickets
    - Test randomness generation with different block hashes
    - Use vm.roll to manipulate block numbers
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

    - Install wagmi for Arc blockchain interaction
    - Install viem for Ethereum utilities
    - Install @tanstack/react-query for data fetching
    - Install wallet connection library (RainbowKit or ConnectKit)
    - _Requirements: 11.2_

  - [ ] 11.2 Configure Arc blockchain connection

    - Add Arc network configuration to wagmi
    - Set up RPC endpoints for Arc testnet and mainnet
    - Configure wallet connection provider
    - Add network switching logic
    - _Requirements: 11.3, 11.4_

  - [ ] 11.3 Generate contract types and ABIs

    - Export contract ABI from Foundry (forge build generates JSON in out/)
    - Copy ABI from out/LotteryFactory.sol/LotteryFactory.json to frontend
    - Generate TypeScript types with wagmi CLI or abitype
    - Create contract configuration file with addresses and ABI
    - _Requirements: 11.2_

  - [ ] 11.4 Set up TanStack Router routes
    - Create route for lottery creation (/create)
    - Create route for ticket redemption (/ticket)
    - Create route for lottery dashboard (/dashboard)
    - Create route for lottery details (/lottery/:id)
    - _Requirements: General navigation_

- [ ] 12. Implement lottery creation UI

  - [ ] 12.1 Create CreateLotteryForm component in src/components

    - Use shadcn/ui components (Button, Input, Label, Card) for form UI
    - Build form with prize distribution inputs
    - Add number of tickets input
    - Add commit deadline and reveal time pickers (use shadcn Calendar/DatePicker)
    - Add optional sponsored gas checkbox (use shadcn Checkbox)
    - Implement form validation with Zod (already installed)
    - Use TailwindCSS for styling (already configured)
    - _Requirements: 1.1, 2.1_

  - [ ] 12.2 Implement secret generation logic

    - Generate cryptographically secure creator secret
    - Compute commitment hash using keccak256
    - Generate individual ticket secrets
    - Compute ticket secret hashes
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ] 12.3 Create useCreateLottery hook

    - Handle USDC approval if needed
    - Call createLottery contract function
    - Wait for transaction confirmation
    - Return lottery ID and ticket codes
    - _Requirements: 1.6, 1.7, 11.6_

  - [ ] 12.4 Build ticket distribution UI
    - Display creator secret with save warning (use shadcn Alert)
    - Generate redemption URLs for each ticket
    - Create QR codes for tickets (install qrcode.react)
    - Add copy link buttons (use shadcn Button with lucide-react icons)
    - Add download all option (use shadcn DropdownMenu)
    - _Requirements: 1.8, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 13. Implement ticket commit UI

  - [ ] 13.1 Create ticket redemption page

    - Parse ticket parameters from URL
    - Display ticket information
    - Show commit deadline countdown
    - Display "Step 1: Enter Draw" UI
    - _Requirements: 2.6, 3.2_

  - [ ] 13.2 Create useCommitTicket hook

    - Validate commit deadline hasn't passed
    - Hash ticket secret for commitment
    - Call commitTicket contract function
    - Handle sponsored vs standard commits
    - Display success message
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 11.6_

  - [ ] 13.3 Add commit confirmation UI
    - Show success animation
    - Display "Come back after [reveal time]" message
    - Add calendar reminder option
    - _Requirements: 3.6_

- [ ] 14. Implement reveal UI for creators

  - [ ] 14.1 Create lottery dashboard

    - Display all lotteries created by user
    - Show lottery status and countdown
    - Add "Reveal Lottery" button when ready
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 14.2 Create RevealLotteryModal component

    - Prompt for creator secret
    - Verify secret matches commitment
    - Display estimated gas cost
    - _Requirements: 4.2, 4.3_

  - [ ] 14.3 Create useRevealLottery hook
    - Call revealLottery contract function
    - Wait for transaction confirmation
    - Display success message
    - _Requirements: 4.4, 4.5, 11.6_

- [ ] 15. Implement prize reveal and claim UI

  - [ ] 15.1 Create prize checking UI

    - Display "Step 2: Check & Claim!" when ready (use shadcn Card)
    - Add "Check Prize" button (use shadcn Button)
    - Show loading animation while fetching (use shadcn Skeleton or Spinner)
    - _Requirements: 5.2, 5.3, 7.1_

  - [ ] 15.2 Create prize reveal animations

    - Build suspenseful reveal animation (use Framer Motion or CSS animations)
    - Add confetti for winners (install canvas-confetti)
    - Show encouraging message for losers (use shadcn Alert)
    - Display prize amount prominently (use shadcn Badge or custom styled text)
    - _Requirements: 5.3, 5.4, 5.5, 7.2, 7.3, 7.4_

  - [ ] 15.3 Create useClaimPrize hook

    - Display gross prize, gas cost, and net prize
    - Call claimPrize contract function
    - Handle gasless claiming
    - Show success confirmation
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.12, 11.6_

  - [ ] 15.4 Add social sharing features
    - Generate shareable result image
    - Add Twitter share button
    - Add copy link button
    - _Requirements: 7.7, 7.8, 13.1, 13.2_

- [ ] 16. Implement countdown and deadline UI

  - [ ] 16.1 Create Countdown component

    - Display time remaining to deadline
    - Update every second
    - Show different states (days, hours, minutes)
    - Handle expired state
    - _Requirements: 2.6, 3.2, 5.2, 6.9_

  - [ ] 16.2 Add deadline warnings
    - Show "⚠️ Claim within 24 hours!" banner
    - Display "Claim by [deadline] or prize goes to next lottery"
    - Add urgent styling as deadline approaches
    - _Requirements: 6.9, 6.10_

- [ ] 17. Implement error handling and validation

  - [ ] 17.1 Add form validation

    - Validate all inputs before submission
    - Show field-level error messages
    - Prevent invalid submissions
    - _Requirements: 12.1_

  - [ ] 17.2 Handle transaction errors

    - Parse contract revert reasons
    - Display user-friendly error messages
    - Handle user rejection
    - Handle insufficient gas
    - _Requirements: 12.2, 12.5_

  - [ ] 17.3 Add state-based error handling
    - Show appropriate messages for wrong state
    - Handle deadline passed errors
    - Handle already committed/redeemed errors
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

  - [ ] 19.1 Deploy to Arc testnet

    - Write deployment script in script/Deploy.s.sol
    - Use forge script to deploy LotteryFactory contract
    - Verify contract with forge verify-contract
    - Save deployment addresses to deployments.json
    - Test with small prize pools
    - _Requirements: All_

  - [ ] 19.2 Deploy to Arc mainnet
    - Review and audit deployment script
    - Use forge script with --broadcast for mainnet deployment
    - Verify contract on Arc block explorer
    - Transfer ownership if needed using cast send
    - Document deployment addresses
    - _Requirements: All_

- [ ] 20. Deploy frontend application

  - [ ] 20.1 Configure production environment

    - Set up environment variables (.env.production)
    - Configure Arc RPC endpoints
    - Set contract addresses for mainnet
    - _Requirements: 11.2_

  - [ ] 20.2 Build and deploy with Vite
    - Run vite build to create production bundle
    - Deploy to Vercel/Netlify/Cloudflare Pages
    - Configure custom domain if needed
    - Set up monitoring (Sentry already configured if needed)
    - _Requirements: All_

---

## Notes

- All tasks reference specific requirements from requirements.md
- Tasks marked with \* are optional or can be deferred to post-MVP
- Each task should be completed and tested before moving to the next
- Smart contract tasks should be completed before frontend tasks
- Integration testing should happen after both contract and frontend are functional
