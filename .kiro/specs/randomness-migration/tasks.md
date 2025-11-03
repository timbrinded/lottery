# Implementation Plan: Randomness Mechanism Migration

## Overview

This plan covers updating tests, frontend, and documentation to support the new multi-party commit-reveal randomness mechanism. The smart contract changes are complete.

## Tasks

- [-] 1. Update smart contract tests

  - [x] 1.1 Fix state enum value tests
    - Update enum assertions in test file
    - Change: CommitClosed (2) → removed, RevealOpen (3→2), Finalized (4→3)
    - Verify all state comparisons use correct values
    - _Requirements: 1.1_

  - [x] 1.2 Remove closeCommitPeriod tests
    - Delete `test_CloseCommitPeriod_Success()`
    - Delete `test_CloseCommitPeriod_RevertsIfNotCommitOpen()`
    - Delete `test_CloseCommitPeriod_RevertsIfDeadlineNotPassed()`
    - Remove any helper functions only used by these tests
    - _Requirements: 1.5_

  - [x] 1.3 Update reveal tests to remove closeCommitPeriod calls
    - Find all tests that call `factory.closeCommitPeriod()`
    - Remove these calls and associated `vm.roll()` for randomness block
    - Update state assertions from CommitClosed to CommitOpen
    - Remove blockhash availability checks
    - Verify tests still pass with direct reveal after commit deadline
    - _Requirements: 1.3_

  - [x] 1.4 Add minimum participant tests
    - Create `test_RevealLottery_RevertsWithZeroCommits()` - verify revert with 0 commits
    - Create `test_RevealLottery_SucceedsWithOneCommit()` - verify success with exactly 1 commit
    - Create `test_RevealLottery_SucceedsWithTwoCommits()` - verify success with 2 commits
    - Create `test_RevealLottery_SucceedsWithManyCommits()` - verify success with 10+ commits
    - Verify InsufficientCommittedTickets error is thrown only with 0 commits
    - _Requirements: 1.4_

  - [x] 1.5 Add randomness determinism test
    - Create `test_RevealLottery_DeterministicRandomness()`
    - Create lottery, commit same tickets in same order
    - Reveal and record prize assignments
    - Create identical lottery with same commits
    - Reveal and verify prize assignments match exactly
    - _Requirements: 1.3_

  - [x] 1.6 Update refund tests
    - Change state checks from CommitClosed to CommitOpen
    - Update `test_RefundLottery_RevertsIfNotCommitClosed()` name and logic
    - Verify refund still works if creator doesn't reveal
    - Update test descriptions and comments
    - _Requirements: 1.1, 1.2_

  - [x] 1.7 Run full test suite and fix any remaining issues
    - Execute `forge test` and verify all tests pass
    - Fix any remaining CommitClosed references
    - Update test comments and documentation
    - _Requirements: 1.1_

- [x] 2. Update frontend hooks

  - [x] 2.1 Delete useCloseCommitPeriod hook
    - Delete `fe/src/hooks/useCloseCommitPeriod.ts` file
    - Search codebase for imports of this hook
    - Remove all imports and usages
    - _Requirements: 2.4_

  - [x] 2.2 Update useRevealLottery hook
    - Remove randomnessBlock checks from reveal conditions
    - Remove blocksRemaining from return value
    - Update canReveal logic to check: state === CommitOpen && now >= commitDeadline && now >= revealTime
    - Remove error handling for RandomnessBlockNotReached, BlockhashExpired, BlockhashUnavailable
    - Add check for minimum committed tickets using getCommittedCount() (must be >= 1)
    - Update hook return type to remove block-related fields
    - _Requirements: 2.1, 2.3_

  - [x] 2.3 Update useLotteryState hook (if exists)
    - Update LotteryState type definition to remove CommitClosed
    - Update any state transition logic
    - Update state display helpers
    - _Requirements: 2.2, 2.5_

  - [x] 2.4 Search for and update any other hooks using randomnessBlock
    - Search codebase for "randomnessBlock" references
    - Update or remove each reference
    - Verify no broken imports or undefined references
    - _Requirements: 2.1_

- [x] 3. Update dashboard UI

  - [x] 3.1 Remove Close Commit Period button from dashboard
    - Open `fe/src/routes/dashboard.tsx`
    - Find and remove "Close Commit Period" button
    - Remove associated click handlers and state
    - Remove imports of useCloseCommitPeriod
    - _Requirements: 3.1_

  - [x] 3.2 Update reveal button display logic
    - Change condition from `state === CommitClosed && block >= randomnessBlock`
    - To: `state === CommitOpen && now >= commitDeadline && now >= revealTime`
    - Update button text and tooltips
    - _Requirements: 3.2_

  - [x] 3.3 Remove BlockCountdown component from lottery cards
    - Find BlockCountdown usage in dashboard
    - Remove component and imports
    - Replace with time-based countdown to reveal time only
    - _Requirements: 3.3, 3.4_

  - [x] 3.4 Update state badge display
    - Remove CommitClosed from state badge logic
    - Update state colors and labels
    - Verify only CommitOpen, RevealOpen, Finalized are shown
    - _Requirements: 2.5, 3.5_

  - [x] 3.5 Add participant count display
    - Use getCommittedCount() to fetch committed ticket count
    - Display count on lottery cards: "X / Y tickets committed"
    - Add warning badge if 0 commits and near reveal time
    - Show tooltip: "Need at least 1 committed ticket to reveal"
    - _Requirements: 3.5_

  - [x] 3.6 Update lottery status filters
    - Update filter logic to remove CommitClosed option
    - Verify filtering works with new state values
    - Update filter labels and descriptions
    - _Requirements: 3.5_

- [x] 4. Update error handling

  - [x] 4.1 Update error mapping in errors.ts
    - Open `fe/src/lib/errors.ts`
    - Remove mappings for: RandomnessBlockNotReached, BlockhashExpired, BlockhashUnavailable
    - Add mapping for: InsufficientCommittedTickets → "Need at least 1 committed ticket to reveal"
    - Update error type definitions
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 4.2 Update error display components
    - Search for error message displays
    - Update any hardcoded error messages related to randomness
    - Verify new error messages display correctly
    - _Requirements: 4.1_

  - [x] 4.3 Add reveal button tooltips for disabled state
    - When reveal button is disabled due to insufficient commits
    - Show tooltip: "Need at least 1 committed ticket"
    - Add visual indicator (warning icon)
    - _Requirements: 4.4_

- [x] 5. Regenerate contract types

  - [x] 5.1 Compile updated contract
    - Run `forge build` in contract directory
    - Verify compilation succeeds
    - Check output in `contract/out/LotteryFactory.sol/LotteryFactory.json`
    - _Requirements: 2.1_

  - [x] 5.2 Update contract ABI in frontend
    - Copy ABI from compiled output
    - Update `fe/src/contracts/LotteryFactory.ts`
    - Verify ABI includes new functions and events
    - Remove old event/error definitions
    - _Requirements: 2.1_

  - [x] 5.3 Update TypeScript type definitions
    - Update LotteryState enum type (remove CommitClosed)
    - Update Lottery type (remove randomnessBlock field)
    - Update function parameter types
    - Run TypeScript compiler to verify no type errors
    - _Requirements: 2.2, 2.5_

- [x] 6. Update documentation

  - [x] 6.1 Update design.md randomness section
    - Open `.kiro/specs/mystery-lottery/design.md`
    - Replace blockhash section with multi-party commit-reveal explanation
    - Update security considerations
    - Document minimum participant requirement
    - Update state machine diagram
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 6.2 Update tasks.md to reflect completed work
    - Open `.kiro/specs/mystery-lottery/tasks.md`
    - Mark randomness-related tasks as complete
    - Update task descriptions that reference closeCommitPeriod
    - Add note about migration completion
    - _Requirements: 5.5_

  - [x] 6.3 Create high-level game flow documentation
    - Create new file: `docs/GAME_FLOW.md` or add section to design.md
    - Document the complete lottery lifecycle from creator and participant perspectives
    - Include Mermaid sequence diagrams showing interactions
    - Include Mermaid state diagrams for lottery states
    - Include Mermaid flowcharts for decision points
    - _Requirements: 5.1_

  - [x] 6.4 Create creator flow diagram
    - Add Mermaid sequence diagram showing creator journey
    - Steps: Generate secrets → Create lottery → Distribute tickets → Wait for commits → Reveal → Monitor claims
    - Show interactions between Creator, Frontend, and Smart Contract
    - Include timing constraints (commit deadline, reveal time, claim deadline)
    - _Requirements: 5.1_

  - [x] 6.5 Create participant flow diagram
    - Add Mermaid sequence diagram showing participant journey
    - Steps: Receive ticket → Commit ticket → Wait for reveal → Check prize → Claim prize
    - Show interactions between Participant, Frontend, and Smart Contract
    - Include decision points (won/lost, claim/forfeit)
    - _Requirements: 5.1_

  - [x] 6.6 Create state machine diagram
    - Add Mermaid state diagram showing lottery lifecycle
    - States: Pending → CommitOpen → RevealOpen → Finalized
    - Show state transitions with conditions
    - Include alternative paths (refund if no reveal)
    - Document who can trigger each transition
    - _Requirements: 5.4_

  - [x] 6.7 Create randomness generation flowchart
    - Add Mermaid flowchart showing how randomness is generated
    - Show: Creator secret + Ticket hashes → Combined entropy → Random seed → Prize assignment
    - Include minimum participant check
    - Show prize cascade for uncommitted tickets
    - Document security properties at each step
    - _Requirements: 5.2_

  - [x] 6.8 Create prize assignment algorithm diagram
    - Add Mermaid flowchart showing prize-centric assignment
    - Show: Build committed tickets array → For each prize → Random selection → Remove winner → Repeat
    - Include edge case: No more committed tickets → Prize to rollover
    - Document O(M) complexity advantage
    - _Requirements: 5.1_

  - [x] 6.9 Create system architecture diagram
    - Add Mermaid diagram showing system components
    - Components: Frontend (React) ↔ Web3 (wagmi/viem) ↔ Smart Contract (Solidity) ↔ Arc Blockchain
    - Show data flow for key operations (create, commit, reveal, claim)
    - Include off-chain components (secret generation, QR codes)
    - _Requirements: 5.1_

  - [x] 6.10 Create timing diagram
    - Add Mermaid timeline or Gantt diagram showing lottery timeline
    - Show: Creation → Commit Period → Waiting Period → Reveal Time → Claim Period (24h) → Finalization
    - Mark key deadlines and windows
    - Show when each action can be performed
    - Include refund window (24h after reveal time if not revealed)
    - _Requirements: 5.1_

  - [x] 6.11 Update README or other docs
    - Search for randomness documentation in README files
    - Update any user-facing documentation
    - Update developer setup guides if needed
    - Add links to new flow documentation
    - _Requirements: 5.1_

- [-] 7. Create "How It Works" modal and navigation updates

  - [ ] 7.1 Create HowItWorksModal component
    - Create `fe/src/components/shared/HowItWorksModal.tsx`
    - Use shadcn Dialog component for modal
    - Create multi-panel layout with tabs or carousel
    - Use simple, snappy language (avoid technical jargon)
    - Make it visually engaging with icons and illustrations
    - _Requirements: 6.1_

  - [ ] 7.2 Design panel content for "How It Works"
    - **Panel 1: "Create a Mystery Lottery"**
      - Title: "🎁 Create Your Mystery Lottery"
      - Content: "Set your prizes, choose how many tickets, and pick your deadlines. We'll generate unique ticket codes for you to share."
      - Visual: Simple illustration of prize boxes
    - **Panel 2: "Share Tickets"**
      - Title: "📤 Share Your Tickets"
      - Content: "Send ticket codes via QR codes, links, or however you want. Each ticket is a mystery—no one knows what they'll win!"
      - Visual: QR code and link icons
    - **Panel 3: "Commit Phase"**
      - Title: "🔒 Participants Commit"
      - Content: "Ticket holders commit before the deadline. This locks them in without revealing who has which ticket."
      - Visual: Lock icon with countdown
    - **Panel 4: "Reveal & Claim"**
      - Title: "🎉 Reveal & Claim Prizes"
      - Content: "After the deadline, you reveal the lottery. Winners are randomly assigned and can claim their prizes instantly!"
      - Visual: Confetti and prize reveal
    - **Panel 5: "Fair & Transparent"**
      - Title: "✅ Provably Fair"
      - Content: "Our commit-reveal system ensures no one can cheat. Everything happens on the blockchain—fully transparent and verifiable."
      - Visual: Shield or checkmark icon
    - _Requirements: 6.1_

  - [ ] 7.3 Add "How It Works" button to top navigation
    - Open `fe/src/routes/__root.tsx` or main layout component
    - Add "How It Works" button to top nav bar (next to wallet connect)
    - Button should open HowItWorksModal
    - Use question mark icon (?) or info icon (ℹ️)
    - Make it accessible from all pages
    - _Requirements: 6.1_

  - [ ] 7.4 Update side navigation drawer with GitHub link
    - Open side nav drawer component (if exists) or create one
    - Add GitHub logo and link at bottom of drawer
    - Link to: `https://github.com/[your-repo]` (update with actual repo)
    - Use lucide-react Github icon
    - Style: Subtle, secondary color, small text "View on GitHub"
    - _Requirements: 6.1_

  - [-] 7.5 Install shadcn dialog component if needed
    - Run: `cd fe && bunx shadcn@latest add dialog`
    - Run: `bunx shadcn@latest add tabs` (if using tabs for panels)
    - Verify components added to `fe/src/components/ui/`
    - _Requirements: 6.1_

  - [ ] 7.6 Style the modal for mobile responsiveness
    - Ensure modal works on mobile (full screen on small devices)
    - Add swipe gestures for panel navigation on mobile
    - Test on various screen sizes
    - Add smooth transitions between panels
    - _Requirements: 6.1_

- [ ] 8. Testing and verification

  - [ ] 8.1 Run smart contract test suite
    - Execute `forge test -vvv` in contract directory
    - Verify all tests pass
    - Check gas snapshots if using `forge snapshot`
    - _Requirements: 1.1_

  - [ ] 8.2 Run frontend build
    - Execute `bun run build` in fe directory
    - Verify no TypeScript errors
    - Verify no missing imports or undefined references
    - _Requirements: 2.1, 2.2_

  - [ ] 8.3 Manual testing on local network
    - Start local Anvil node
    - Deploy updated contract
    - Test full lottery flow: create → commit (1+ tickets) → reveal → claim
    - Test reveal with 0 commits (should fail)
    - Test refund flow
    - Test "How It Works" modal on all pages
    - _Requirements: All_

  - [ ] 8.4 Deploy to testnet and verify
    - Deploy updated contract to Arc testnet
    - Update frontend contract address
    - Test full flow on testnet
    - Verify gas costs are lower (no closeCommitPeriod tx)
    - Verify "How It Works" modal displays correctly
    - _Requirements: All_

## Notes

- **Priority:** Complete tasks in order (tests → hooks → UI → docs)
- **Testing:** Run tests after each major change
- **Git:** Commit after each completed task for easy rollback
- **Documentation:** Update inline code comments as you go

## Success Criteria

- ✅ All smart contract tests pass
- ✅ Frontend builds without errors
- ✅ No references to CommitClosed state remain
- ✅ No references to closeCommitPeriod function remain
- ✅ Dashboard shows simplified lottery flow
- ✅ Reveal works without timing constraints
- ✅ Minimum 1 participant enforced (0 commits reverts)
- ✅ Documentation updated with comprehensive flow diagrams
- ✅ All Mermaid diagrams render correctly
- ✅ Game flow is clearly documented for developers and users
- ✅ "How It Works" modal accessible from all pages
- ✅ Modal content is clear, simple, and engaging
- ✅ GitHub link visible in side navigation
- ✅ Modal works on mobile and desktop
