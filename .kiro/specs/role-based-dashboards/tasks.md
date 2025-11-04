# Implementation Plan

- [x] 1. Create infrastructure hooks and utilities
  - Create `useNetworkEnforcement` hook to check Arc testnet connection status
  - Create `useIsLotteryManager` hook to detect if user owns any lotteries
  - Create `useFriendlyTime` hook to convert timestamps to human-readable format
  - Create `useUserParticipations` hook to fetch lotteries where user has committed tickets
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 8.1, 8.2, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 2. Create shared UI components
  - Create `NetworkEnforcementBanner` component to display network connection status and prompts
  - Enhance existing `Countdown` component with friendly mode prop for human-readable time displays
  - Create `EmptyState` component for no lotteries scenarios
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 3. Redesign splash page and update header
  - Update `/` route to enforce Arc testnet connection
  - Add role detection logic using `useIsLotteryManager` hook
  - Display manager dashboard button when user is a lottery owner
  - Display participant dashboard button for all connected users
  - Show network enforcement banner when not connected or on wrong network
  - Update `Header` component to remove navigation menu entirely
  - Keep only wallet connection button and network switcher in header
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 4. Create manager dashboard routes
  - Move `/dashboard.tsx` to `/manager/index.tsx` with enhanced UX
  - Move `/create.tsx` to `/manager/create.tsx` (no changes to functionality)
  - Implement lottery list view with filters (all, active, pending reveal, revealed, finalized)
  - Create `ManagerLotteryCard` component with enhanced UX and friendly time displays
  - Update "Create New Lottery" button to link to `/manager/create` route
  - Display empty state when no lotteries exist
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Create manager lottery detail route
  - Create `/manager/lottery/$id` route for detailed lottery view
  - Display lottery overview with status, prize pool, participant count, and friendly countdown
  - Implement action panel with reveal, refund, view tickets, and restore secret buttons
  - Create `TicketStatusTable` component showing all tickets with commitment and claim status
  - Create `StatisticsPanel` component showing lottery performance metrics
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 6. Create participant dashboard routes
  - Create `/participant/index.tsx` route for participant lottery list
  - Move `/ticket.tsx` to `/participant/ticket.tsx` (no changes to functionality)
  - Implement `useUserParticipations` hook to fetch user's lottery participations
  - Create `ParticipantLotteryCard` component with simplified view and friendly time displays
  - Create `WinningAlert` component to highlight unclaimed winnings
  - Display empty state with "Redeem Your First Ticket" button when no participations
  - Update "Redeem Ticket" button to link to `/participant/ticket` route
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 7. Create participant lottery detail route
  - Create `/participant/lottery/$id` route for user-friendly lottery view
  - Display lottery status with human-readable phase description and friendly countdown
  - Show participation card with commitment status, win status, and prize amount
  - Implement claim functionality using existing `useClaimPrize` hook and `PrizeAnimation` component
  - Create `TimelineVisualization` component showing lottery phases
  - Display winning notification when user has won and prize is unclaimed
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 8. Clean up old routes
  - Delete `/dashboard.tsx` file (replaced by `/manager/index.tsx`)
  - Delete `/create.tsx` file (moved to `/manager/create.tsx`)
  - Delete `/ticket.tsx` file (moved to `/participant/ticket.tsx`)
  - Delete `/lottery.$id.tsx` file (replaced by role-specific routes)
  - Verify no broken imports or references to deleted files
  - _Requirements: All_

- [ ] 9. Add QR code scanner functionality
  - Create `QRScanner` component for scanning QR codes
  - Add QR scanner option to `/participant/ticket` route
  - Add "Scan QR Code" button to participant dashboard
  - Test QR code scanning flow end-to-end
  - _Requirements: 8.5, 8.6_

- [ ] 10. Polish and testing
  - Add loading states to all new components
  - Add error handling for all new hooks
  - Test network enforcement flow on splash page
  - Test role detection and navigation buttons
  - Test manager dashboard with create, reveal, and refund flows
  - Test participant dashboard with ticket redemption and claim flows
  - Verify all routes work correctly with new structure
  - Verify responsive design on mobile devices
  - Test QR code scanning end-to-end
  - _Requirements: All_
