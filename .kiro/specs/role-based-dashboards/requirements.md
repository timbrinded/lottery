# Requirements Document

## Introduction

This specification defines a role-based user interface redesign for the Mystery Lottery System. The system will provide distinct experiences for two user types: Lottery Managers (contract owners) and Lottery Participants (ticket holders). The redesign introduces a splash page with network enforcement, role detection, and separate dashboards optimized for each user type's needs.

## Glossary

- **Lottery Manager**: A user who is listed as the owner of a lottery smart contract and has administrative privileges
- **Lottery Participant**: A user who holds or has redeemed lottery tickets and can claim prizes
- **Splash Page**: The initial landing page that enforces Arc testnet connection and provides role-based navigation
- **Manager Dashboard**: The administrative interface for creating and managing lotteries
- **Participant Dashboard**: The user-facing interface for viewing and claiming lottery prizes
- **Arc Testnet**: The blockchain network where the lottery system operates
- **Commit Deadline**: The time by which participants must commit their tickets
- **Claim Deadline**: The time by which winners must claim their prizes
- **Lottery System**: The smart contract and frontend application

## Requirements

### Requirement 1

**User Story:** As a new visitor, I want to be guided to connect to Arc testnet, so that I can access the lottery system on the correct network

#### Acceptance Criteria

1. WHEN a user visits the application, THE Lottery System SHALL display a splash page
2. WHILE the user is not connected to Arc testnet, THE Lottery System SHALL display a network connection prompt
3. WHEN the user connects to a non-Arc testnet network, THE Lottery System SHALL display a network switch request
4. WHEN the user successfully connects to Arc testnet, THE Lottery System SHALL display role-based navigation options
5. THE Lottery System SHALL prevent access to dashboards until Arc testnet connection is established

### Requirement 2

**User Story:** As a lottery manager, I want to see a prominent button to access my manager dashboard, so that I can quickly manage my lotteries

#### Acceptance Criteria

1. WHEN a connected user is identified as a lottery owner, THE Lottery System SHALL display a manager dashboard button on the splash page
2. THE Lottery System SHALL verify ownership by checking if the user's address matches any lottery contract owner
3. WHEN the manager clicks the dashboard button, THE Lottery System SHALL navigate to the manager dashboard
4. THE Lottery System SHALL display the manager button with visual prominence indicating administrative access

### Requirement 3

**User Story:** As any connected user, I want to access the participant dashboard, so that I can view and claim lottery prizes

#### Acceptance Criteria

1. WHEN a user is connected to Arc testnet, THE Lottery System SHALL display a participant dashboard button on the splash page
2. THE Lottery System SHALL make the participant button accessible to all connected users regardless of ownership status
3. WHEN the user clicks the participant button, THE Lottery System SHALL navigate to the participant dashboard
4. THE Lottery System SHALL display both manager and participant buttons when the user is a lottery owner

### Requirement 4

**User Story:** As a lottery manager, I want to create new lotteries from my dashboard, so that I can distribute prizes to participants

#### Acceptance Criteria

1. WHEN a manager accesses the manager dashboard, THE Lottery System SHALL display a create lottery interface
2. THE Lottery System SHALL provide form fields for lottery configuration including prize amounts and deadlines
3. WHEN the manager submits a valid lottery configuration, THE Lottery System SHALL execute the contract creation transaction
4. WHEN the lottery is created successfully, THE Lottery System SHALL display the new lottery in the manager's lottery list

### Requirement 5

**User Story:** As a lottery manager, I want to view the progress of in-flight lotteries, so that I can monitor their status and take necessary actions

#### Acceptance Criteria

1. WHEN a manager accesses the manager dashboard, THE Lottery System SHALL display a list of all lotteries owned by the manager
2. THE Lottery System SHALL display lottery status including current phase, commit count, and deadline information
3. THE Lottery System SHALL group lotteries by status such as active, awaiting reveal, completed, and refunded
4. THE Lottery System SHALL update lottery status in real-time as blockchain state changes
5. WHEN a manager selects a lottery, THE Lottery System SHALL display detailed lottery information

### Requirement 6

**User Story:** As a lottery manager, I want to perform on-chain actions like reveal and refund, so that I can progress lotteries through their lifecycle

#### Acceptance Criteria

1. WHEN a lottery reaches its commit deadline, THE Lottery System SHALL display a reveal action button to the manager
2. WHEN a lottery meets refund conditions, THE Lottery System SHALL display a refund action button to the manager
3. WHEN the manager clicks an action button, THE Lottery System SHALL execute the corresponding smart contract transaction
4. THE Lottery System SHALL disable action buttons when conditions are not met with explanatory tooltips
5. WHEN a transaction completes, THE Lottery System SHALL update the lottery status and display confirmation

### Requirement 7

**User Story:** As a lottery manager, I want to view privileged information about my lotteries, so that I can track ticket distribution and commitment status

#### Acceptance Criteria

1. WHEN a manager views lottery details, THE Lottery System SHALL display all ticket codes generated for that lottery
2. THE Lottery System SHALL indicate which tickets have been committed with visual status indicators
3. THE Lottery System SHALL display commit and claim deadlines with precise timestamps
4. THE Lottery System SHALL show ticket distribution statistics including total tickets, committed tickets, and unclaimed prizes
5. THE Lottery System SHALL display participant addresses for committed tickets

### Requirement 8

**User Story:** As a participant, I want to see which lotteries I am part of, so that I can track my participation and potential winnings

#### Acceptance Criteria

1. WHEN a participant accesses the participant dashboard, THE Lottery System SHALL display lotteries where the user has committed tickets
2. THE Lottery System SHALL filter lotteries to show only those relevant to the connected user's address
3. THE Lottery System SHALL display lottery status for each participation including whether prizes are claimable
4. WHEN the participant has no active participations, THE Lottery System SHALL display a message indicating no current lotteries
5. WHEN a participant scans a QR code containing a lottery ticket, THE Lottery System SHALL navigate to the ticket commit interface
6. THE Lottery System SHALL decode QR code data to extract lottery address and ticket secret information

### Requirement 9

**User Story:** As a participant, I want to see details of lotteries currently in progress, so that I can understand the status and timeline

#### Acceptance Criteria

1. WHEN a participant views a lottery, THE Lottery System SHALL display the current phase such as commit period, awaiting reveal, or claim period
2. THE Lottery System SHALL show the number of participants and total prize pool
3. THE Lottery System SHALL display whether the participant has committed a ticket for that lottery
4. THE Lottery System SHALL indicate if the lottery has been revealed and prizes are available
5. THE Lottery System SHALL show the participant's prize amount if they are a winner

### Requirement 10

**User Story:** As a participant, I want to claim my ticket to get paid, so that I can receive my winnings

#### Acceptance Criteria

1. WHEN a participant is a winner and the lottery is revealed, THE Lottery System SHALL display a claim prize button
2. WHEN the participant clicks the claim button, THE Lottery System SHALL execute the claim transaction
3. THE Lottery System SHALL display the prize amount being claimed before transaction confirmation
4. WHEN the claim succeeds, THE Lottery System SHALL update the ticket status to claimed
5. THE Lottery System SHALL disable the claim button after successful claiming

### Requirement 11

**User Story:** As a participant, I want to be informed if I have won a lottery, so that I know to claim my prize

#### Acceptance Criteria

1. WHEN a lottery is revealed and the participant is a winner, THE Lottery System SHALL display a prominent winning notification
2. THE Lottery System SHALL show the prize amount won with visual emphasis
3. THE Lottery System SHALL display winning status on the participant dashboard lottery list
4. WHEN the participant has unclaimed winnings, THE Lottery System SHALL display a notification badge or indicator
5. THE Lottery System SHALL distinguish between won-unclaimed and won-claimed states

### Requirement 12

**User Story:** As a participant, I want to see user-friendly time displays, so that I can easily understand deadlines without technical jargon

#### Acceptance Criteria

1. WHEN displaying time remaining, THE Lottery System SHALL use human-readable formats such as "Finishes in 10 minutes" instead of technical timestamps
2. THE Lottery System SHALL display relative time for deadlines within 24 hours such as "2 hours remaining"
3. THE Lottery System SHALL display absolute dates for deadlines beyond 24 hours such as "Ends on Jan 15, 2025 at 3:00 PM"
4. THE Lottery System SHALL update countdown timers in real-time without requiring page refresh
5. WHEN a deadline has passed, THE Lottery System SHALL display "Ended" or "Expired" instead of negative time values
