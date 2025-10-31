# Ticket Retrieval Feature

## Overview

Enhanced the lottery secret storage system to include ticket secrets, allowing users to view and retrieve all ticket codes for their created lotteries at any time from the dashboard.

## User Story

**As a lottery creator**, I want to be able to view all the ticket codes I generated for my lottery after creation, so that I can re-share them with participants or reference them later without having to save them manually during creation.

## Implementation

### Enhanced Storage Structure

Updated `useLotterySecrets` hook to store both creator secrets and ticket secrets:

```typescript
interface LotterySecretData {
  creatorSecret: string;
  ticketSecrets: string[];
  createdAt: number;
}
```

### New Components

#### ViewTicketsModal (`fe/src/components/lottery/ViewTicketsModal.tsx`)

A comprehensive modal that displays all ticket codes for a lottery:

- **Ticket List**: Shows all tickets with their codes and QR codes
- **Copy Functionality**: One-click copy for each ticket code
- **QR Codes**: Scannable QR codes for easy mobile sharing
- **Download**: Export all tickets as JSON
- **Graceful Degradation**: Shows helpful message if tickets aren't available

#### Updated RestoreSecretModal

Enhanced to include:
- "View All Ticket Codes" button when tickets are available
- Notification when tickets aren't available (for older lotteries)
- Seamless navigation to ViewTicketsModal

### Auto-Save Enhancement

Updated `useCreateLottery` to automatically save both:
1. Creator secret (for revealing the lottery)
2. All ticket secrets (for re-sharing tickets)

### Dashboard Integration

Added complete workflow:
1. Click "View Secret" on any lottery card
2. See creator secret with copy button
3. Click "View All Ticket Codes" button (if available)
4. View all tickets with QR codes and copy functionality

## User Flows

### Viewing Tickets for New Lottery

1. User creates a lottery
2. Secrets are automatically saved (creator + tickets)
3. User navigates to dashboard
4. Clicks "View Secret" on lottery card
5. Sees creator secret
6. Clicks "View All Ticket Codes (X tickets)"
7. Modal shows all ticket codes with QR codes
8. User can copy individual codes or download all

### Viewing Tickets for Restored Lottery

1. User restores creator secret by pasting it
2. Secret is validated and saved
3. Modal shows "Ticket codes are not available" message
4. User is informed they need the original ticket export

### Backward Compatibility

- **Old Lotteries**: Lotteries created before this feature won't have ticket secrets
- **Graceful Handling**: Clear messaging when tickets aren't available
- **Migration Path**: Users can still use original JSON exports if they saved them

## Technical Details

### Storage Format

```json
{
  "lottery-creator-secrets": {
    "1": {
      "creatorSecret": "0xa8dfd8593ce604563a7967e0566f3524369fdfebf0a87bd89ab6babb366590b7",
      "ticketSecrets": [
        "0x1234567890abcdef...",
        "0xfedcba0987654321...",
        "0x1111222233334444..."
      ],
      "createdAt": 1704067200000
    }
  }
}
```

### Ticket Code Generation

Each ticket code is generated using:
```typescript
const ticketCode = encodeTicketCode(lotteryId, ticketIndex, ticketSecret);
```

This creates a compact base58-encoded string that includes:
- Lottery ID
- Ticket index
- Ticket secret

### Security Considerations

- **Local Storage**: Ticket secrets are stored in browser local storage
- **No Server**: Fully client-side solution
- **User Responsibility**: Users are still encouraged to back up externally
- **Validation**: Only valid secrets (matching commitment) can be saved

## Benefits

1. **Convenience**: No need to save tickets manually during creation
2. **Re-sharing**: Easy to re-share tickets if participants lose them
3. **Reference**: Quick access to all ticket codes at any time
4. **QR Codes**: Generate QR codes on-demand for mobile sharing
5. **Export**: Download all tickets as JSON for external backup

## Limitations

1. **Browser-Specific**: Secrets are stored per browser/device
2. **No Cloud Sync**: Clearing browser data loses secrets
3. **Old Lotteries**: Can't retrieve tickets for lotteries created before this feature
4. **Restore Limitation**: Restoring creator secret alone doesn't restore tickets

## Future Enhancements

1. **Deterministic Derivation**: Derive ticket secrets from creator secret using HKDF
2. **Cloud Backup**: Optional encrypted cloud backup via wallet signature
3. **Multi-Device Sync**: Sync secrets across devices using wallet
4. **Ticket Import**: Allow importing ticket secrets from JSON export
5. **Selective Sharing**: Share specific tickets without revealing all

## Testing Checklist

- [x] Create lottery and verify tickets are saved
- [x] View tickets from dashboard
- [x] Copy individual ticket codes
- [x] Download all tickets as JSON
- [x] Restore creator secret (without tickets)
- [x] Verify graceful handling when tickets unavailable
- [x] Check QR code generation
- [x] Test with multiple lotteries
- [x] Verify backward compatibility

## Files Modified

1. `fe/src/hooks/useLotterySecrets.ts` - Enhanced storage structure
2. `fe/src/components/lottery/ViewTicketsModal.tsx` - New ticket viewing modal
3. `fe/src/components/lottery/RestoreSecretModal.tsx` - Added view tickets button
4. `fe/src/hooks/useCreateLottery.ts` - Save ticket secrets
5. `fe/src/routes/dashboard.tsx` - Integrated ViewTicketsModal
6. `fe/src/hooks/README.md` - Updated documentation
7. `.kiro/specs/mystery-lottery/secret-storage-feature.md` - Updated feature docs
8. `.kiro/specs/mystery-lottery/ticket-retrieval-feature.md` - This document
