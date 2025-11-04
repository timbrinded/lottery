# Design Document

## Overview

This design document outlines the architecture for a role-based user interface redesign of the Mystery Lottery System. The system will provide distinct experiences for Lottery Managers (contract owners) and Lottery Participants (ticket holders), with a splash page that enforces Arc testnet connectivity and provides role-based navigation.

## Existing Codebase Analysis

### What We Already Have (Reusable)

**Routes:**
- `/` - Splash page (needs redesign for role-based navigation)
- `/create` - Create lottery form (can be reused in manager dashboard)
- `/dashboard` - Manager lottery list (needs refactoring for new manager dashboard)
- `/ticket` - Ticket redemption page (can be reused in participant dashboard)
- `/lottery/$id` - Lottery detail page (stub, needs implementation for both roles)

**Hooks (All Reusable):**
- `useCreateLottery` - Create lottery functionality
- `useCommitTicket` - Commit ticket functionality
- `useRevealLottery` - Reveal lottery functionality
- `useRefundLottery` - Refund lottery functionality
- `useClaimPrize` - Claim prize functionality
- `useLotterySecrets` - Local storage for secrets
- `useBlockTime` - Block time utilities

**Components (Reusable):**
- `CreateLotteryForm` - Form for creating lotteries
- `TicketDistribution` - Display ticket codes after creation
- `RevealLotteryModal` - Modal for revealing lottery
- `RestoreSecretModal` - Modal for restoring creator secret
- `ViewTicketsModal` - Modal for viewing ticket status
- `TicketCommit` - Ticket commit interface
- `PrizeAnimation` - Prize reveal animation
- `Countdown` - Countdown timer component
- `ShareButtons` - Social sharing buttons
- `NetworkSwitcher` - Network switching component
- `Header` - Navigation header (needs refactoring)

**Utilities (All Reusable):**
- `crypto.ts` - Secret generation, hashing, QR code encoding
- `lotteryStorage.ts` - Local storage utilities
- `validation.ts` - Input validation
- `errors.ts` - Error formatting

### What Needs Refactoring

**1. Header Component (`Header.tsx`)**
- **Current**: Single navigation menu with all routes
- **Needed**: Remove navigation menu entirely, keep only wallet connection and network switcher
- **Reason**: Navigation will be role-based from splash page, not global

**2. Splash Page (`routes/index.tsx`)**
- **Current**: Static landing page with feature highlights
- **Needed**: Network enforcement + role detection + navigation buttons
- **Reason**: Entry point for role-based routing

**3. Dashboard Page (`routes/dashboard.tsx`)**
- **Current**: Manager lottery list with filters and actions
- **Needed**: Move to `/manager/index.tsx`, enhance with better UX
- **Reason**: Separate manager and participant experiences

**4. Create Page (`routes/create.tsx`)**
- **Current**: Create lottery form at root level
- **Needed**: Move to `/manager/create.tsx`
- **Reason**: Only managers create lotteries

**5. Ticket Page (`routes/ticket.tsx`)**
- **Current**: Ticket redemption at root level
- **Needed**: Move to `/participant/ticket.tsx`
- **Reason**: Only participants redeem tickets

**6. Lottery Detail Page (`routes/lottery.$id.tsx`)**
- **Current**: Stub with minimal content
- **Needed**: Remove entirely, replace with role-specific routes
- **Reason**: Different information and actions for each role

### What Needs to be Created

**New Routes:**
- `/manager` - Manager dashboard (refactor from `/dashboard`)
- `/manager/lottery/$id` - Manager lottery detail view
- `/participant` - Participant dashboard (new)
- `/participant/lottery/$id` - Participant lottery detail view
- `/participant/commit` - Commit ticket from QR scan (refactor from `/ticket`)

**New Hooks:**
- `useNetworkEnforcement` - Check Arc testnet connection
- `useIsLotteryManager` - Check if user owns any lotteries
- `useFriendlyTime` - Convert timestamps to human-readable format
- `useUserParticipations` - Get lotteries where user has committed tickets

**New Components:**
- `NetworkEnforcementBanner` - Display network connection status
- `FriendlyCountdown` - Human-readable countdown timer
- `QRScanner` - QR code scanner component
- `ManagerLotteryCard` - Lottery card for manager dashboard
- `ParticipantLotteryCard` - Lottery card for participant dashboard
- `WinningAlert` - Alert for unclaimed winnings
- `TimelineVisualization` - Visual timeline for lottery phases
- `EmptyState` - Empty state for no lotteries

### Migration Strategy

**Phase 1: Infrastructure**
- Create new hooks: `useNetworkEnforcement`, `useIsLotteryManager`, `useFriendlyTime`, `useUserParticipations`
- Create new components: `NetworkEnforcementBanner`, `FriendlyCountdown`

**Phase 2: Splash Page Redesign**
- Redesign `/` with network enforcement and role detection
- Update `Header` to remove navigation menu entirely

**Phase 3: Manager Dashboard**
- Move `/dashboard` to `/manager/index.tsx`
- Move `/create` to `/manager/create.tsx`
- Create `/manager/lottery/$id.tsx`
- Enhance with new components and friendly time displays

**Phase 4: Participant Dashboard**
- Create `/participant/index.tsx`
- Move `/ticket` to `/participant/ticket.tsx`
- Create `/participant/lottery/$id.tsx`
- Create participant-specific components

**Phase 5: Cleanup**
- Delete old routes: `/dashboard.tsx`, `/create.tsx`, `/ticket.tsx`, `/lottery.$id.tsx`
- Remove navigation menu code from `Header.tsx`
- Test all flows end-to-end

**Phase 6: QR Code Integration**
- Implement `QRScanner` component
- Add QR scanning to participant ticket page
- Test end-to-end QR flow

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Splash Page (/)                         │
│  - Network Connection Enforcement                            │
│  - Role Detection (Manager vs Participant)                   │
│  - Navigation to Role-Specific Dashboards                    │
└─────────────────────────────────────────────────────────────┘
                    │                    │
        ┌───────────┴──────────┐        │
        │                      │        │
        ▼                      ▼        ▼
┌──────────────────┐  ┌──────────────────┐
│ Manager Dashboard│  │Participant Dash  │
│   (/manager)     │  │  (/participant)  │
├──────────────────┤  ├──────────────────┤
│ - Create Lottery │  │ - My Lotteries   │
│ - My Lotteries   │  │ - Scan QR Code   │
│ - Lottery Detail │  │ - Lottery Detail │
│ - Reveal/Refund  │  │ - Claim Prize    │
│ - Ticket Status  │  │ - Win Status     │
└──────────────────┘  └──────────────────┘
```

### Routing Structure

The application will use TanStack Router with the following route hierarchy:

**New Routes:**
```
/                           # Splash page with network enforcement (REDESIGN)
/manager                    # Manager dashboard (REFACTOR from /dashboard)
/manager/create             # Create lottery (MOVE from /create)
/manager/lottery/$id        # Manager lottery detail view (NEW)
/participant                # Participant dashboard (NEW)
/participant/ticket         # Ticket redemption (MOVE from /ticket)
/participant/lottery/$id    # Participant lottery detail view (NEW)
```

**Routes to Remove:**
```
/create                     # MOVE to /manager/create
/ticket                     # MOVE to /participant/ticket
/dashboard                  # REPLACE with /manager
/lottery/$id                # REMOVE (replaced by role-specific routes)
```

### State Management

- **Wallet Connection**: Managed by wagmi + RainbowKit
- **Network State**: Custom hook `useNetworkEnforcement` to check Arc testnet connection
- **Role Detection**: Custom hook `useIsLotteryManager` to check if user owns any lotteries
- **Lottery Data**: TanStack Query for caching and real-time updates
- **Local Storage**: Ticket secrets and lottery participation tracking

## Components and Interfaces

### 1. Splash Page Component (`/routes/index.tsx`)

**Purpose**: Entry point that enforces network connection and provides role-based navigation

**Key Features**:
- Network connection status display
- Arc testnet enforcement with switch prompt
- Role detection (manager vs participant)
- Large navigation buttons for each role
- Visual hierarchy emphasizing primary actions

**Component Structure**:
```tsx
<SplashPage>
  <NetworkEnforcementBanner />
  <HeroSection>
    <Title>Mystery Lottery</Title>
    <Subtitle>Fair & Transparent Prize Distribution</Subtitle>
  </HeroSection>
  
  {isConnected && isArcTestnet && (
    <NavigationSection>
      {isManager && <ManagerDashboardButton />}
      <ParticipantDashboardButton />
    </NavigationSection>
  )}
  
  <FeatureHighlights />
</SplashPage>
```

**State**:
- `isConnected`: Boolean from wagmi
- `chainId`: Current network from wagmi
- `isArcTestnet`: Computed from chainId === arcTestnet.id
- `isManager`: Boolean from `useIsLotteryManager` hook

### 2. Network Enforcement Component

**Purpose**: Display network status and prompt user to switch to Arc testnet

**States**:
- Not connected: "Connect your wallet to get started"
- Wrong network: "Please switch to Arc Testnet" with switch button
- Correct network: Hidden or minimal indicator

**Component**:
```tsx
<NetworkEnforcementBanner>
  {!isConnected && <ConnectWalletPrompt />}
  {isConnected && !isArcTestnet && <SwitchNetworkPrompt />}
</NetworkEnforcementBanner>
```

### 3. Manager Dashboard (`/routes/manager/index.tsx`)

**Purpose**: Administrative interface for lottery creators

**Reuse Strategy**: 
- Copy existing `/dashboard` route logic
- Enhance with better UX and human-readable time displays
- Keep existing filter functionality
- Reuse existing `LotteryCard` component with enhancements

**Layout**:
```tsx
<ManagerDashboard>
  <DashboardHeader>
    <Title>Manager Dashboard</Title>
    <Link to="/create">
      <Button>Create New Lottery</Button>
    </Link>
  </DashboardHeader>
  
  <LotteryFilters>
    {/* REUSE existing filter logic from dashboard.tsx */}
    <FilterButton active>All</FilterButton>
    <FilterButton>Active</FilterButton>
    <FilterButton>Pending Reveal</FilterButton>
    <FilterButton>Revealed</FilterButton>
    <FilterButton>Finalized</FilterButton>
  </LotteryFilters>
  
  <LotteryGrid>
    {lotteries.map(lottery => (
      <ManagerLotteryCard lottery={lottery} /> {/* Enhanced version of existing LotteryCard */}
    ))}
  </LotteryGrid>
</ManagerDashboard>
```

**Data Requirements**:
- List of lotteries owned by connected address (EXISTING)
- Lottery status (commit phase, awaiting reveal, claim phase, completed) (EXISTING)
- Commit count and total tickets (EXISTING)
- Deadlines (commit, claim) (EXISTING)
- Available actions (reveal, refund) (EXISTING)

### 4. Manager Lottery Detail (`/routes/manager/lottery/$id.tsx`)

**Purpose**: Detailed view of a single lottery with privileged information

**Reuse Strategy**:
- Reuse `RevealLotteryModal`, `RestoreSecretModal`, `ViewTicketsModal` components
- Reuse `useRevealLottery`, `useRefundLottery` hooks
- Reuse `Countdown` component, enhance with `FriendlyCountdown`
- Build new ticket status table using existing contract read hooks

**Sections**:
1. **Lottery Overview**
   - Status badge (Active, Awaiting Reveal, Claim Period, Completed)
   - Prize pool total
   - Participant count
   - Deadlines with friendly countdown timers (NEW: use `FriendlyCountdown`)

2. **Action Panel**
   - Reveal button (REUSE: `RevealLotteryModal` + `useRevealLottery`)
   - Refund button (REUSE: `useRefundLottery`)
   - View tickets button (REUSE: `ViewTicketsModal`)
   - Restore secret button (REUSE: `RestoreSecretModal`)

3. **Ticket Status Table** (NEW)
   - Ticket index
   - Ticket code (hash)
   - Commitment status (committed/uncommitted)
   - Participant address (if committed)
   - Prize amount
   - Claim status (unclaimed/claimed)

4. **Statistics** (NEW)
   - Total tickets generated
   - Tickets committed
   - Prizes claimed
   - Prizes forfeited

**Component Structure**:
```tsx
<ManagerLotteryDetail>
  <LotteryHeader lottery={lottery}>
    <FriendlyCountdown deadline={nextDeadline} /> {/* NEW */}
  </LotteryHeader>
  
  <ActionPanel>
    {/* REUSE existing modals and hooks */}
    <RevealLotteryModal ... />
    <RestoreSecretModal ... />
    <ViewTicketsModal ... />
    <RefundButton onClick={refund} />
  </ActionPanel>
  
  <TicketStatusTable tickets={tickets} /> {/* NEW */}
  
  <StatisticsPanel stats={stats} /> {/* NEW */}
</ManagerLotteryDetail>
```

### 5. Participant Dashboard (`/routes/participant/index.tsx`)

**Purpose**: User-facing interface for viewing and claiming lottery prizes

**Reuse Strategy**:
- Create new `useUserParticipations` hook to fetch user's lottery participations
- Reuse contract read hooks for lottery data
- Reuse `FriendlyCountdown` for time displays
- Create new `ParticipantLotteryCard` component (simpler than manager version)

**Layout**:
```tsx
<ParticipantDashboard>
  <DashboardHeader>
    <Title>My Lotteries</Title>
    <Link to="/ticket">
      <Button>Redeem Ticket</Button> {/* REUSE existing /ticket route */}
    </Link>
  </DashboardHeader>
  
  <WinningNotifications> {/* NEW */}
    {unclaimedWinnings.map(lottery => (
      <WinningAlert lottery={lottery} />
    ))}
  </WinningNotifications>
  
  <LotteryList>
    {participations.map(lottery => (
      <ParticipantLotteryCard lottery={lottery} /> {/* NEW */}
    ))}
  </LotteryList>
  
  {participations.length === 0 && (
    <EmptyState> {/* NEW */}
      <Message>No active lotteries</Message>
      <Link to="/ticket">
        <Button>Redeem Your First Ticket</Button>
      </Link>
    </EmptyState>
  )}
</ParticipantDashboard>
```

**Data Requirements**:
- Lotteries where user has committed tickets (NEW: `useUserParticipations`)
- Win status for each lottery (NEW: fetch from contract)
- Prize amounts (if winner) (NEW: fetch from contract)
- Claim status (NEW: fetch from contract)
- Lottery phase and deadlines (REUSE: existing contract reads)

### 6. Participant Lottery Detail (`/routes/participant/lottery/$id.tsx`)

**Purpose**: User-friendly view of lottery details with claim functionality

**Reuse Strategy**:
- Reuse `PrizeAnimation` component for prize reveal
- Reuse `useClaimPrize` hook for claiming
- Reuse `ShareButtons` component after successful claim
- Reuse `FriendlyCountdown` for time displays
- Reuse contract read hooks for lottery and ticket data

**Sections**:
1. **Lottery Status**
   - Human-readable phase description (NEW: friendly wording)
   - Countdown timer with friendly text (NEW: `FriendlyCountdown`)
   - Prize pool and participant count (REUSE: contract reads)

2. **Your Participation**
   - Commitment status (REUSE: contract reads)
   - Win status (if revealed) (REUSE: contract reads)
   - Prize amount (if winner) (REUSE: `PrizeAnimation`)
   - Claim button (if winner and unclaimed) (REUSE: `useClaimPrize`)

3. **Timeline** (NEW)
   - Visual timeline showing commit deadline, reveal, claim deadline
   - Current phase indicator

**Component Structure**:
```tsx
<ParticipantLotteryDetail>
  <LotteryStatusCard>
    <PhaseIndicator phase={lottery.phase} /> {/* NEW */}
    <FriendlyCountdown deadline={nextDeadline} /> {/* NEW */}
    <PrizePoolDisplay amount={lottery.prizePool} />
  </LotteryStatusCard>
  
  <ParticipationCard>
    {isWinner && (
      <WinnerBanner>
        <PrizeAnimation prizeAmount={prize} /> {/* REUSE */}
        <ClaimButton onClick={claim} /> {/* REUSE: useClaimPrize */}
        {isClaimSuccess && <ShareButtons ... />} {/* REUSE */}
      </WinnerBanner>
    )}
    
    {!isWinner && isRevealed && (
      <NoWinMessage>Better luck next time!</NoWinMessage>
    )}
  </ParticipationCard>
  
  <TimelineVisualization lottery={lottery} /> {/* NEW */}
</ParticipantLotteryDetail>
```

### 7. QR Code Scanner Component

**Purpose**: Allow participants to scan QR codes to commit tickets

**Reuse Strategy**:
- QR code format already exists in `crypto.ts` (`encodeTicketCode`)
- QR code display already exists in `TicketDistribution` component
- Just need to add scanner component for reading QR codes
- Navigate to existing `/ticket` route with code parameter

**Flow**:
1. User clicks "Scan QR Code" or "Redeem Ticket" button
2. Navigate to `/ticket` route (EXISTING)
3. User can manually paste code OR scan QR code (NEW: add scanner option)
4. Existing ticket commit flow handles the rest

**Component** (NEW):
```tsx
<QRScanner>
  <CameraView onScan={handleScan} />
  <ManualEntryLink to="/ticket" />
</QRScanner>
```

**QR Code Data Format** (EXISTING in crypto.ts):
- Base58 encoded ticket code containing lottery ID, ticket index, and secret
- Already generated by `encodeTicketCode` function
- Already displayed as QR code in `TicketDistribution` component
- Just need to add scanner to read it

### 8. Friendly Time Display Component

**Purpose**: Convert technical timestamps to human-readable formats

**Reuse Strategy**:
- Existing `Countdown` component shows precise countdown
- Create new `FriendlyCountdown` component that wraps or enhances it
- Add human-readable prefix/suffix options
- Keep existing `Countdown` for manager dashboard (precise)
- Use `FriendlyCountdown` for participant dashboard (friendly)

**Examples**:
- "Finishes in 10 minutes!"
- "Ends in 2 hours"
- "Claim by Jan 15, 2025 at 3:00 PM"
- "Ended 5 minutes ago"

**Component** (NEW):
```tsx
<FriendlyCountdown 
  deadline={timestamp}
  prefix="Finishes in"
  suffix="!"
  mode="friendly" // vs "precise" for existing Countdown
/>
```

**Logic**:
- < 1 hour: "X minutes"
- < 24 hours: "X hours"
- < 7 days: "X days"
- > 7 days: Absolute date/time
- Past deadline: "Ended" or "Expired"

**Alternative**: Enhance existing `Countdown` component with a `friendly` prop instead of creating new component

## Data Models

### Lottery State (Extended)

```typescript
interface LotteryState {
  address: Address
  owner: Address
  phase: 'commit' | 'awaitingReveal' | 'claim' | 'completed' | 'refunded'
  commitDeadline: bigint
  claimDeadline: bigint
  totalTickets: number
  committedTickets: number
  prizePool: bigint
  minimumParticipants: number
  isRevealed: boolean
  canReveal: boolean
  canRefund: boolean
  canProcessForfeitures: boolean
}
```

### Ticket State (Extended)

```typescript
interface TicketState {
  index: number
  ticketHash: string
  isCommitted: boolean
  participant?: Address
  prizeAmount: bigint
  isClaimed: boolean
  isWinner: boolean
}
```

### User Participation

```typescript
interface UserParticipation {
  lotteryAddress: Address
  ticketIndex: number
  isWinner: boolean
  prizeAmount: bigint
  isClaimed: boolean
  lottery: LotteryState
}
```

### Manager Lottery View

```typescript
interface ManagerLotteryView extends LotteryState {
  tickets: TicketState[]
  statistics: {
    totalGenerated: number
    committed: number
    claimed: number
    forfeited: number
    totalPrizesClaimed: bigint
    totalPrizesForfeited: bigint
  }
}
```

## Error Handling

### Network Errors

1. **Not Connected**: Display prominent "Connect Wallet" button
2. **Wrong Network**: Display "Switch to Arc Testnet" with automatic switch button
3. **Network Switch Failed**: Show error message with manual instructions

### Transaction Errors

1. **Insufficient Balance**: "Insufficient USDC for gas fees"
2. **Transaction Rejected**: "Transaction cancelled by user"
3. **Transaction Failed**: Display error reason from contract
4. **Timeout**: "Transaction taking longer than expected. Check block explorer."

### Data Loading Errors

1. **Contract Not Found**: "Lottery not found or not deployed"
2. **RPC Error**: "Unable to connect to blockchain. Please try again."
3. **Invalid Data**: "Invalid lottery data. Please refresh."

## Testing Strategy

### Unit Tests

1. **Hooks**:
   - `useNetworkEnforcement`: Test network detection logic
   - `useIsLotteryManager`: Test ownership detection
   - `useFriendlyTime`: Test time formatting logic

2. **Components**:
   - `NetworkEnforcementBanner`: Test all connection states
   - `FriendlyCountdown`: Test time display formats
   - `QRScanner`: Test QR code parsing

### Integration Tests

1. **Splash Page Flow**:
   - Test navigation when not connected
   - Test navigation when connected to wrong network
   - Test navigation when connected as manager
   - Test navigation when connected as participant

2. **Manager Dashboard Flow**:
   - Test lottery list filtering
   - Test lottery detail view
   - Test reveal action
   - Test refund action

3. **Participant Dashboard Flow**:
   - Test lottery list display
   - Test win notification display
   - Test claim action
   - Test QR code scanning

### E2E Tests

1. **Complete Manager Flow**:
   - Connect wallet → Navigate to manager dashboard → Create lottery → View details → Reveal → Process forfeitures

2. **Complete Participant Flow**:
   - Connect wallet → Scan QR code → Commit ticket → View lottery → Claim prize

## UI/UX Considerations

### Visual Hierarchy

1. **Splash Page**:
   - Large, prominent navigation buttons
   - Manager button styled as "primary" (if user is manager)
   - Participant button styled as "secondary" but still prominent

2. **Dashboards**:
   - Clear section headers
   - Card-based layout for lotteries
   - Status badges with color coding (green=active, yellow=awaiting, blue=claim, gray=completed)

3. **Detail Views**:
   - Action buttons prominently placed
   - Critical information (deadlines, prize amounts) highlighted
   - Disabled states clearly indicated with tooltips

### Responsive Design

- Mobile-first approach
- Stacked layout on mobile
- Grid layout on desktop
- Touch-friendly button sizes
- Readable font sizes on all devices

### Accessibility

- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly
- Color contrast compliance (WCAG AA)

### Loading States

- Skeleton loaders for lottery lists
- Spinner for transaction processing
- Progress indicators for multi-step actions
- Optimistic UI updates where appropriate

### Empty States

- Friendly messages when no data
- Clear call-to-action buttons
- Helpful illustrations or icons
- Guidance on next steps

## Performance Considerations

### Data Fetching

- Use TanStack Query for caching
- Implement pagination for large lottery lists
- Lazy load lottery details
- Debounce real-time updates

### Code Splitting

- Route-based code splitting
- Lazy load QR scanner component
- Lazy load chart/visualization libraries

### Optimization

- Memoize expensive computations
- Use React.memo for pure components
- Implement virtual scrolling for large lists
- Optimize re-renders with proper dependency arrays

## Security Considerations

### Wallet Connection

- Verify wallet signature for sensitive actions
- Display transaction details before signing
- Warn users about phishing attempts

### Data Validation

- Validate QR code data format
- Sanitize user inputs
- Verify contract addresses before interactions

### Privacy

- Store ticket secrets locally only
- Clear sensitive data on logout
- Warn users about sharing ticket codes

## Migration Path

### Phase 1: Core Infrastructure
- Implement new routing structure
- Create network enforcement logic
- Build role detection hooks

### Phase 2: Manager Dashboard
- Build manager dashboard layout
- Implement lottery list view
- Create lottery detail view
- Add reveal/refund actions

### Phase 3: Participant Dashboard
- Build participant dashboard layout
- Implement lottery list view
- Create lottery detail view
- Add claim functionality

### Phase 4: QR Code Integration
- Implement QR scanner
- Add QR code generation for managers
- Test end-to-end QR flow

### Phase 5: Polish & Testing
- Add friendly time displays
- Implement loading states
- Add empty states
- Comprehensive testing
- Performance optimization

## Component Reuse Summary

### Fully Reusable (No Changes Needed)
- All hooks: `useCreateLottery`, `useCommitTicket`, `useRevealLottery`, `useRefundLottery`, `useClaimPrize`, `useLotterySecrets`
- All modals: `RevealLotteryModal`, `RestoreSecretModal`, `ViewTicketsModal`
- Ticket components: `TicketCommit`, `PrizeAnimation`, `ShareButtons`
- Form components: `CreateLotteryForm`, `TicketDistribution`
- Utility components: `Countdown`, `NetworkSwitcher`
- All utilities: `crypto.ts`, `lotteryStorage.ts`, `validation.ts`, `errors.ts`

### Needs Enhancement (Keep + Extend)
- `Countdown` → Add friendly mode or create `FriendlyCountdown` wrapper
- `Header` → Remove navigation menu, keep wallet + network switcher
- Existing `/dashboard` route → Copy to `/manager`, enhance UX

### New Components Needed
- `NetworkEnforcementBanner` - Network connection status
- `FriendlyCountdown` - Human-readable time display
- `QRScanner` - QR code scanner (optional, can use manual entry)
- `ManagerLotteryCard` - Enhanced lottery card for managers
- `ParticipantLotteryCard` - Simplified lottery card for participants
- `WinningAlert` - Alert for unclaimed winnings
- `TimelineVisualization` - Visual timeline for lottery phases
- `EmptyState` - Empty state for no lotteries
- `TicketStatusTable` - Table showing all tickets in a lottery
- `StatisticsPanel` - Statistics for lottery performance

### New Hooks Needed
- `useNetworkEnforcement` - Check Arc testnet connection
- `useIsLotteryManager` - Check if user owns any lotteries
- `useFriendlyTime` - Convert timestamps to human-readable format
- `useUserParticipations` - Get lotteries where user has committed tickets

### Routes to Create
- `/manager` - Manager dashboard (refactor from `/dashboard`)
- `/manager/lottery/$id` - Manager lottery detail
- `/participant` - Participant dashboard
- `/participant/lottery/$id` - Participant lottery detail

### Routes to Delete (No Backward Compatibility Needed)
- `/dashboard.tsx` - Replaced by `/manager/index.tsx`
- `/create.tsx` - Moved to `/manager/create.tsx`
- `/ticket.tsx` - Moved to `/participant/ticket.tsx`
- `/lottery.$id.tsx` - Replaced by role-specific routes

## Open Questions

1. Should managers also have access to participant view for their own tickets?
   - **Recommendation**: Yes, show both buttons on splash page if user is a manager
2. Should we show a preview of lottery details before committing from QR scan?
   - **Recommendation**: No, existing `/ticket` flow already shows lottery details before commit
3. How should we handle multiple lotteries from the same manager?
   - **Recommendation**: Existing filter system works well, keep it
4. Should we implement notifications for deadline reminders?
   - **Recommendation**: Out of scope for this redesign, can be added later
5. Should we add analytics/tracking for lottery performance?
   - **Recommendation**: Out of scope for this redesign, can be added later
6. Should we create `FriendlyCountdown` as a new component or enhance existing `Countdown`?
   - **Recommendation**: Enhance existing `Countdown` with a `friendly` prop to avoid duplication
