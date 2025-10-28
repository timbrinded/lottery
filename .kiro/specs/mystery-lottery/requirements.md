# Requirements Document: Mystery Lottery Tickets

## Introduction

This document specifies the requirements for a time-locked mystery lottery system on the Arc blockchain. The system enables users to create prize pools with multiple tickets where prize values are hidden until a reveal time. The lottery uses a two-step participation flow: (1) ticket holders commit their entry before a deadline, and (2) after the draw, they reveal and claim their prizes. A commit-reveal scheme with block hash randomness ensures that the creator cannot know which tickets are winners when distributing them, creating genuine suspense and fair lottery mechanics. Unclaimed prizes are automatically forfeited and rolled into future lottery prize pools, incentivizing timely participation.

## Glossary

- **LotteryFactory**: The primary smart contract that manages lottery creation, commit-reveal randomness, and time-locked redemptions
- **Commitment**: A cryptographic hash that locks in a value without revealing it until later
- **Commit Deadline**: A Unix timestamp before which ticket holders must commit their entry to participate
- **Reveal Time**: A Unix timestamp after which the lottery can be revealed and prizes assigned
- **Claim Deadline**: A Unix timestamp (24 hours after reveal) by which winners must claim prizes or forfeit them
- **Ticket Secret**: A random value known only to the ticket holder, used to claim prizes
- **Prize Pool**: The total USDC amount distributed across all tickets in a lottery
- **Commit-Reveal**: A two-phase process where values are committed (hashed) first, then revealed later to generate randomness
- **Forfeiture**: The process of redistributing unclaimed prizes to future lottery prize pools
- **Prize Cascade**: The mechanism where prizes assigned to uncommitted tickets automatically cascade to the next committed ticket in the shuffled order
- **Arc Blockchain**: The target blockchain network where the system will be deployed
- **Block Hash**: The cryptographic hash of a blockchain block, used as a source of randomness

## Requirements

### Requirement 1: Lottery Creation with Commitment

**User Story:** As a lottery creator, I want to create a prize pool with hidden values and commit to a secret, so that I cannot know which tickets are winners when distributing them

#### Acceptance Criteria

1. WHEN a user initiates lottery creation, THE Frontend Application SHALL prompt for total prize amount, number of tickets, prize distribution, and reveal time
2. WHEN the user confirms creation, THE Frontend Application SHALL generate a cryptographically secure random secret using crypto.randomBytes
3. WHEN the secret is generated, THE Frontend Application SHALL compute a commitment hash using keccak256
4. WHEN the commitment is computed, THE Frontend Application SHALL generate individual ticket secrets for each ticket
5. WHEN ticket secrets are generated, THE Frontend Application SHALL compute secret hashes for each ticket
6. WHEN all hashes are computed, THE LotteryFactory SHALL accept the total prize amount in USDC along with the creator's commitment hash and ticket secret hashes
7. WHEN the USDC transfer succeeds, THE LotteryFactory SHALL store the lottery with committed values and emit a LotteryCreated event
8. WHEN the transaction confirms, THE Frontend Application SHALL display the creator's secret (must be saved!) and all ticket codes for distribution

### Requirement 2: Ticket Distribution

**User Story:** As a lottery creator, I want to easily share ticket codes with participants, so that they can claim their prizes at reveal time

#### Acceptance Criteria

1. WHEN a lottery is created, THE Frontend Application SHALL generate a redemption code for each ticket containing the ticket secret and ticket index
2. THE Frontend Application SHALL display a prominent warning: "Save your creator secret! You'll need it to reveal the lottery."
3. WHEN displaying ticket codes, THE Frontend Application SHALL provide a "Copy Link" button for each ticket
4. WHEN displaying ticket codes, THE Frontend Application SHALL generate QR codes for each ticket for mobile scanning
5. THE Frontend Application SHALL provide a "Download All" option to export ticket codes and the creator secret
6. WHEN a user visits a ticket redemption URL before reveal time, THE Frontend Application SHALL display "Ticket valid! Reveals on [date/time]" with countdown

### Requirement 3: Two-Phase Entry with Commit Deadline

**User Story:** As a ticket holder, I want to commit my entry before the draw deadline, so that I can participate in the lottery fairly

#### Acceptance Criteria

1. WHEN a lottery is created, THE LotteryFactory SHALL store a commit deadline timestamp before the reveal time
2. WHEN a user receives a ticket code before the commit deadline, THE Frontend Application SHALL display "Step 1: Enter Draw" with countdown
3. WHEN the user clicks "Enter Draw", THE Frontend Application SHALL submit a commit transaction with their ticket secret hash
4. WHEN the LotteryFactory receives the commit, THE LotteryFactory SHALL verify the commit deadline has not passed
5. WHEN the deadline check passes, THE LotteryFactory SHALL store the commitment mapping the ticket index to the user's address
6. WHEN the commit succeeds, THE Frontend Application SHALL display "Entered! Come back after [reveal time] to check your prize"
7. IF a user attempts to commit after the deadline, THEN THE LotteryFactory SHALL revert with "Commit period closed"
8. WHEN the commit deadline passes, THE LotteryFactory SHALL transition to the CommitClosed state

### Requirement 4: Lottery Reveal and Prize Assignment

**User Story:** As a lottery creator, I want to reveal my secret at the designated time to fairly assign prizes to tickets, so that the lottery can be completed

#### Acceptance Criteria

1. WHEN the reveal time arrives, THE Frontend Application SHALL enable the "Reveal Lottery" button for the creator
2. WHEN the creator clicks "Reveal Lottery", THE Frontend Application SHALL prompt for the creator secret
3. WHEN the creator provides the secret, THE Frontend Application SHALL verify it matches the commitment hash
4. WHEN the secret is verified, THE Frontend Application SHALL submit a reveal transaction to the LotteryFactory
5. WHEN the LotteryFactory receives the reveal, THE LotteryFactory SHALL verify the secret matches the stored commitment hash
6. WHEN the secret is verified, THE LotteryFactory SHALL use the secret combined with the current block hash to generate a random seed
7. WHEN the random seed is generated, THE LotteryFactory SHALL deterministically shuffle the prize pool using the seed
8. WHEN prizes are shuffled, THE LotteryFactory SHALL assign prizes to tickets in shuffled order, skipping any tickets that did not commit before the deadline
9. WHEN a prize would be assigned to an uncommitted ticket, THE LotteryFactory SHALL cascade to the next ticket in the shuffled order until a committed ticket is found
10. WHEN all prizes are assigned to committed tickets, THE LotteryFactory SHALL emit a LotteryRevealed event with the random seed and final prize assignments
11. IF the creator fails to reveal within 24 hours of reveal time, THEN anyone SHALL be able to trigger a refund of all prizes to the creator
12. IF fewer tickets committed than there are prizes, THEN THE LotteryFactory SHALL assign all prizes to the committed tickets, with some tickets potentially winning multiple prizes

### Requirement 5: Ticket Redemption with Claim Window

**User Story:** As a ticket holder, I want to redeem my ticket after the lottery is revealed to claim my prize, so that I can receive my winnings

#### Acceptance Criteria

1. WHEN a user attempts redemption before committing, THE Frontend Application SHALL display "Step 1: Enter Draw first!"
2. WHEN a user attempts redemption before reveal, THE Frontend Application SHALL display "Step 2: Check & Claim! Available after [reveal time]"
3. WHEN prizes are assigned and user clicks "Check Prize", THE Frontend Application SHALL fetch the prize value for their ticket from the contract
4. WHEN the prize value is fetched, THE Frontend Application SHALL display the amount with appropriate animation (celebration for winners, encouragement for losers)
5. WHEN the user confirms redemption, THE Frontend Application SHALL submit a redemption transaction with the ticket secret
6. WHEN the LotteryFactory receives redemption, THE LotteryFactory SHALL verify the user committed before the deadline
7. WHEN the commit is verified, THE LotteryFactory SHALL verify the ticket secret matches the stored secret hash
8. WHEN the secret is verified, THE LotteryFactory SHALL check the ticket has not been redeemed previously
9. WHEN all checks pass, THE LotteryFactory SHALL deduct gas costs from the prize amount and transfer the net prize to the caller's address
10. WHEN the transfer completes, THE LotteryFactory SHALL mark the ticket as redeemed and emit a TicketRedeemed event with gross and net amounts
11. IF a user did not commit before the deadline, THEN THE LotteryFactory SHALL revert with "Must commit before deadline to claim"
12. THE Frontend Application SHALL display estimated gas costs and net prize amount before claiming

### Requirement 6: Prize Forfeiture and Redistribution

**User Story:** As a lottery participant, I want unclaimed prizes to be redistributed fairly, so that active participants are rewarded

#### Acceptance Criteria

1. WHEN a lottery is revealed, THE LotteryFactory SHALL store a claim deadline timestamp (24 hours after reveal)
2. WHEN the claim deadline passes, THE LotteryFactory SHALL allow anyone to call a processForfeitedPrizes function
3. WHEN processForfeitedPrizes is called, THE LotteryFactory SHALL verify the claim deadline has passed
4. WHEN the deadline is verified, THE LotteryFactory SHALL identify all unclaimed prizes
5. WHEN unclaimed prizes are identified, THE LotteryFactory SHALL add the total forfeited amount to the next lottery's prize pool
6. WHEN the forfeiture is processed, THE LotteryFactory SHALL emit a PrizesForfeited event with the amount
7. WHEN the forfeiture completes, THE LotteryFactory SHALL transition to the Finalized state
8. IF there is no next lottery, THEN THE LotteryFactory SHALL hold the forfeited funds in a rollover pool for future lotteries
9. THE Frontend Application SHALL display a countdown showing "Claim by [deadline] or prize goes to next lottery"
10. THE Frontend Application SHALL show a banner on unclaimed winning tickets: "⚠️ Claim within 24 hours!"

### Requirement 7: Prize Reveal Experience

**User Story:** As a ticket holder, I want an exciting reveal experience when I check my prize, so that the lottery feels fun and engaging

#### Acceptance Criteria

1. WHEN a user checks their prize, THE Frontend Application SHALL display an animated "Checking prize..." screen
2. WHEN the prize value is retrieved, THE Frontend Application SHALL show a suspenseful animation before revealing
3. IF the prize value is greater than zero, THEN THE Frontend Application SHALL display a celebration animation with confetti
4. IF the prize value is zero, THEN THE Frontend Application SHALL display an encouraging "Better luck next time!" message
5. WHEN the reveal completes, THE Frontend Application SHALL display the prize amount prominently
6. WHEN the reveal completes, THE Frontend Application SHALL provide a "Claim Prize" button if not yet redeemed
7. THE Frontend Application SHALL generate a shareable image showing the result
8. THE Frontend Application SHALL provide social sharing buttons for Twitter and copy link

### Requirement 8: Lottery Management Dashboard

**User Story:** As a lottery creator, I want to view the status of my lotteries and track redemptions, so that I can monitor participation

#### Acceptance Criteria

1. THE Frontend Application SHALL provide a "My Lotteries" dashboard showing all lotteries created by the connected wallet
2. WHEN viewing a lottery, THE Frontend Application SHALL display total prize, number of tickets, reveal time, and reveal status
3. WHEN viewing an unrevealed lottery, THE Frontend Application SHALL display a countdown timer and "Reveal Lottery" button
4. WHEN viewing a revealed lottery, THE Frontend Application SHALL show how many tickets have been redeemed and total amount claimed
5. THE Frontend Application SHALL allow creators to download a CSV of all ticket codes
6. THE Frontend Application SHALL display a warning if the creator hasn't saved their secret

### Requirement 9: Smart Contract Security

**User Story:** As a user, I want the lottery system to be secure and tamper-proof, so that I can trust the fairness of the lottery

#### Acceptance Criteria

1. THE LotteryFactory SHALL use OpenZeppelin's ReentrancyGuard to prevent reentrancy attacks
2. THE LotteryFactory SHALL validate that the sum of prize values equals the deposited amount
3. THE LotteryFactory SHALL ensure commitments cannot be changed after lottery creation
4. THE LotteryFactory SHALL verify that the creator secret matches the commitment hash before revealing
5. THE LotteryFactory SHALL use a combination of creator secret and block hash for randomness to prevent manipulation
6. THE LotteryFactory SHALL permanently mark tickets as redeemed to prevent double-redemption
7. THE LotteryFactory SHALL implement a timeout mechanism allowing refunds if creator fails to reveal
8. IF any critical operation fails, THEN THE LotteryFactory SHALL revert the entire transaction to maintain consistency

### Requirement 10: Randomness Generation and Prize Assignment

**User Story:** As a user, I want the prize assignment to be fair and unpredictable, so that no one has an unfair advantage

#### Acceptance Criteria

1. THE LotteryFactory SHALL combine the creator's revealed secret with the block hash to generate a random seed
2. THE LotteryFactory SHALL use keccak256 hash function to combine the secret and block hash
3. THE LotteryFactory SHALL implement a prize-centric assignment algorithm that iterates through prizes
4. WHEN assigning each prize, THE LotteryFactory SHALL generate a random index using keccak256(seed, prizeIndex)
5. THE LotteryFactory SHALL select a winner from remaining committed tickets using the random index
6. THE LotteryFactory SHALL remove each winner from the pool to prevent duplicate wins
7. THE Frontend Application SHALL display the random seed and assignment algorithm for transparency
8. THE Frontend Application SHALL provide a verification tool allowing anyone to verify the assignment was performed correctly

### Requirement 11: Arc Blockchain Integration

**User Story:** As a user, I want the lottery system to leverage Arc's features for optimal performance and user experience

#### Acceptance Criteria

1. THE LotteryFactory SHALL use Arc's native USDC (6 decimals) for all prize operations
2. THE Frontend Application SHALL use wagmi hooks for all wallet connection and transaction operations
3. WHEN a user connects their wallet, THE Frontend Application SHALL verify the connected network matches Arc blockchain
4. IF the connected network does not match, THEN THE Frontend Application SHALL prompt the user to switch networks
5. WHEN displaying USDC balances, THE Frontend Application SHALL use Arc's native USDC balance queries
6. WHEN submitting transactions, THE Frontend Application SHALL use wagmi useWriteContract hook with error handling
7. WHEN waiting for confirmations, THE Frontend Application SHALL leverage Arc's deterministic finality (<1 second)
8. THE Frontend Application SHALL support USDC-denominated gas fees via Arc's Paymaster feature for all transactions
9. THE LotteryFactory SHALL support gasless claiming by deducting gas costs from prize amounts
10. THE Frontend Application SHALL display all amounts in USDC with proper 6-decimal formatting
11. WHEN a user has no USDC for gas, THE Frontend Application SHALL explain that gas will be deducted from their prize

### Requirement 12: Error Handling and User Experience

**User Story:** As a user, I want clear error messages and smooth interactions, so that I can use the lottery system confidently

#### Acceptance Criteria

1. THE Frontend Application SHALL validate all user inputs before submitting transactions
2. WHEN a transaction fails, THE Frontend Application SHALL parse the error and display user-friendly messages
3. THE Frontend Application SHALL display warnings about saving the creator secret prominently
4. IF a creator loses their secret, THEN THE Frontend Application SHALL explain the timeout refund mechanism
5. IF a user attempts to redeem an already-redeemed ticket, THEN THE Frontend Application SHALL display "This ticket has already been claimed"
6. IF a user attempts to redeem before reveal, THEN THE Frontend Application SHALL show countdown with clear messaging
7. THE Frontend Application SHALL provide a "Help" section explaining how the commit-reveal lottery works

### Requirement 13: Social and Viral Features

**User Story:** As a lottery creator, I want participants to share their experiences, so that the lottery gains visibility

#### Acceptance Criteria

1. WHEN a ticket prize is revealed, THE Frontend Application SHALL generate a shareable image with lottery name and prize amount
2. THE Frontend Application SHALL provide one-click sharing to Twitter with pre-filled text
3. THE Frontend Application SHALL allow lottery creators to customize lottery names and descriptions
4. WHEN viewing an unrevealed lottery, THE Frontend Application SHALL display a shareable countdown widget
5. THE Frontend Application SHALL provide embeddable widgets for lottery countdowns
6. THE Frontend Application SHALL display a public leaderboard of largest prize pools (opt-in for creators)

### Requirement 14: Cost Transparency

**User Story:** As a lottery creator, I want to understand the costs involved, so that I can make informed decisions

#### Acceptance Criteria

1. THE Frontend Application SHALL display estimated gas costs before lottery creation
2. THE Frontend Application SHALL show a cost breakdown: creation gas + USDC deposit
3. THE Frontend Application SHALL display "No oracle fees - uses free commit-reveal randomness"
4. THE Frontend Application SHALL explain that total cost is just gas fees (no additional charges)
5. THE Frontend Application SHALL compare costs to alternative randomness methods (e.g., "Saves $5-10 vs VRF")
