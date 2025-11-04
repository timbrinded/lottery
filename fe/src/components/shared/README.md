# Shared UI Components

This directory contains reusable UI components used across the Mystery Lottery application.

## Components

### NetworkEnforcementBanner

Displays network connection status and prompts users to connect or switch to Arc Testnet.

**Features:**
- Shows "Connect Your Wallet" message when not connected
- Shows "Switch to Arc Testnet" with action button when on wrong network
- Automatically hides when on correct network
- Uses Alert component with appropriate styling for each state

**Usage:**
```tsx
import { NetworkEnforcementBanner } from '@/components/shared';

function MyPage() {
  return (
    <div>
      <NetworkEnforcementBanner />
      {/* Rest of your content */}
    </div>
  );
}
```

### Countdown (Enhanced)

Displays a countdown timer with support for both precise and friendly modes.

**Props:**
- `deadline` (number): Unix timestamp in seconds
- `className` (string, optional): Additional CSS classes
- `mode` ('precise' | 'friendly', optional): Display mode (default: 'precise')
- `prefix` (string, optional): Text to show before the countdown
- `suffix` (string, optional): Text to show after the countdown

**Modes:**
- **Precise**: Shows exact time remaining (e.g., "2d 5h", "3h 45m", "12m 30s")
- **Friendly**: Shows human-readable time (e.g., "2 days", "3 hours", "45 minutes")
  - For > 7 days: Shows absolute date (e.g., "Jan 15, 2025 at 3:00 PM")
  - For < 7 days: Shows relative time

**Color Coding:**
- Green: > 24 hours remaining
- Yellow: 6-24 hours remaining
- Red: < 6 hours remaining or deadline passed

**Usage:**
```tsx
import { Countdown } from '@/components/shared';

// Precise mode (default)
<Countdown deadline={1234567890} />

// Friendly mode with prefix
<Countdown 
  deadline={1234567890} 
  mode="friendly" 
  prefix="Finishes in"
  suffix="!"
/>
```

### EmptyState

Displays an empty state message with optional icon and action button.

**Props:**
- `icon` (LucideIcon, optional): Icon to display
- `title` (string): Main heading text
- `description` (string, optional): Descriptive text
- `action` (ReactNode, optional): Action button or element
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
import { EmptyState } from '@/components/shared';
import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';

function MyDashboard() {
  return (
    <EmptyState
      icon={Ticket}
      title="No Active Lotteries"
      description="You haven't participated in any lotteries yet. Redeem your first ticket to get started!"
      action={
        <Link to="/ticket">
          <Button>Redeem Ticket</Button>
        </Link>
      }
    />
  );
}
```

## Requirements Addressed

These components address the following requirements from the role-based dashboards spec:

- **Requirement 1.1-1.4**: Network enforcement and connection status display
- **Requirement 12.1-12.5**: User-friendly time displays with human-readable formats

## Design Decisions

1. **NetworkEnforcementBanner**: Uses Alert component for consistency with existing UI patterns
2. **Countdown Enhancement**: Extended existing component rather than creating new one to avoid duplication
3. **EmptyState**: Flexible component that can be used across different contexts (manager/participant dashboards)

## Testing

To test these components:

1. **NetworkEnforcementBanner**: 
   - Disconnect wallet to see "Connect Your Wallet" message
   - Connect to wrong network to see "Switch to Arc Testnet" button
   - Connect to Arc Testnet to verify banner hides

2. **Countdown**:
   - Test with various deadlines (past, near future, far future)
   - Verify color changes based on urgency
   - Test both precise and friendly modes

3. **EmptyState**:
   - Test with and without icon
   - Test with and without description
   - Test with and without action button
