# Requirements Document: Randomness Mechanism Migration

## Introduction

This spec covers the migration from blockhash-based randomness to multi-party commit-reveal randomness in the Mystery Lottery system. The smart contract changes have been completed, and this spec focuses on updating tests and frontend to support the new mechanism.

## Glossary

- **System**: The Mystery Lottery application (smart contract + frontend)
- **Multi-Party Commit-Reveal**: Randomness generation using creator secret combined with participant ticket hashes
- **CommitClosed State**: The removed intermediate state between CommitOpen and RevealOpen
- **Minimum Participants**: The requirement for at least 2 committed tickets before reveal

## Requirements

### Requirement 1: Update Smart Contract Tests

**User Story:** As a developer, I want all smart contract tests to pass with the new randomness mechanism, so that I can verify the system works correctly.

#### Acceptance Criteria

1. WHEN the test suite runs, THE System SHALL compile without errors related to CommitClosed state
2. WHEN state transition tests execute, THE System SHALL verify the simplified state machine (Pending → CommitOpen → RevealOpen → Finalized)
3. WHEN reveal tests execute, THE System SHALL verify that revealLottery works without closeCommitPeriod
4. WHEN minimum participant tests execute, THE System SHALL verify that reveal reverts with fewer than 2 committed tickets
5. WHERE closeCommitPeriod tests exist, THE System SHALL remove or update them to reflect the new flow

### Requirement 2: Update Frontend Hooks

**User Story:** As a lottery creator, I want the frontend to work with the new randomness mechanism, so that I can create and reveal lotteries without timing constraints.

#### Acceptance Criteria

1. WHEN useRevealLottery hook is called, THE System SHALL not check for randomness block availability
2. WHEN dashboard displays lottery status, THE System SHALL not show CommitClosed state
3. WHEN reveal conditions are checked, THE System SHALL verify commit deadline passed and reveal time reached
4. WHERE useCloseCommitPeriod hook exists, THE System SHALL remove it from the codebase
5. WHEN lottery status is displayed, THE System SHALL show correct state transitions without CommitClosed

### Requirement 3: Update Dashboard UI

**User Story:** As a lottery creator, I want the dashboard to reflect the simplified lottery flow, so that I understand when I can reveal my lottery.

#### Acceptance Criteria

1. WHEN dashboard displays lottery cards, THE System SHALL not show "Close Commit Period" button
2. WHEN commit deadline passes, THE System SHALL show "Reveal Lottery" button immediately after reveal time
3. WHEN lottery is awaiting reveal, THE System SHALL display countdown to reveal time only
4. WHERE BlockCountdown component is used, THE System SHALL remove it from lottery status displays
5. WHEN lottery state is displayed, THE System SHALL show only: CommitOpen, RevealOpen, or Finalized

### Requirement 4: Update Error Handling

**User Story:** As a user, I want clear error messages when reveal fails, so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN reveal fails due to insufficient participants, THE System SHALL display "Need at least 1 committed ticket"
2. WHEN error mapping is checked, THE System SHALL not include RandomnessBlockNotReached, BlockhashExpired, or BlockhashUnavailable
3. WHERE InsufficientCommittedTickets error occurs, THE System SHALL map it to user-friendly message
4. WHEN reveal button is disabled, THE System SHALL show tooltip explaining minimum participant requirement
5. WHEN lottery has 0 commits, THE System SHALL display warning before reveal time

### Requirement 5: Update Documentation

**User Story:** As a developer, I want updated documentation explaining the new randomness mechanism, so that I can understand how the system works.

#### Acceptance Criteria

1. WHEN design.md is read, THE System SHALL document the multi-party commit-reveal approach
2. WHEN security considerations are reviewed, THE System SHALL explain the minimum participant requirement
3. WHERE blockhash references exist, THE System SHALL update them to reflect the new mechanism
4. WHEN state machine diagrams are viewed, THE System SHALL show the simplified 4-state flow
5. WHEN tasks.md is read, THE System SHALL reflect completed randomness migration tasks

### Requirement 6: Create Comprehensive Game Flow Documentation

**User Story:** As a developer or stakeholder, I want visual diagrams showing the complete lottery flow, so that I can understand the system at a high level.

#### Acceptance Criteria

1. WHEN game flow documentation is viewed, THE System SHALL provide Mermaid sequence diagrams for creator and participant journeys
2. WHEN state transitions are reviewed, THE System SHALL provide Mermaid state diagram showing lottery lifecycle
3. WHEN randomness generation is examined, THE System SHALL provide Mermaid flowchart showing entropy combination process
4. WHEN prize assignment is studied, THE System SHALL provide Mermaid flowchart showing prize-centric algorithm
5. WHEN system architecture is reviewed, THE System SHALL provide Mermaid diagram showing component interactions
6. WHEN lottery timeline is examined, THE System SHALL provide Mermaid timeline showing key deadlines and windows
7. WHERE diagrams are rendered, THE System SHALL ensure all Mermaid syntax is valid and displays correctly

### Requirement 7: Create User-Facing "How It Works" Modal

**User Story:** As a user, I want a simple explanation of how the lottery works, so that I can understand the process without technical knowledge.

#### Acceptance Criteria

1. WHEN "How It Works" button is clicked, THE System SHALL display a modal with multi-panel explanation
2. WHEN modal content is read, THE System SHALL use simple, non-technical language
3. WHEN panels are viewed, THE System SHALL include visual icons and illustrations for each step
4. WHEN modal is accessed, THE System SHALL be available from all pages via top navigation
5. WHERE modal is displayed on mobile, THE System SHALL adapt to small screens with full-screen layout
6. WHEN side navigation is opened, THE System SHALL display GitHub link with logo at bottom
7. WHEN GitHub link is clicked, THE System SHALL open repository in new tab
