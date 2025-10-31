# Lottery Secret Storage Feature

## Overview

Added the ability to store and retrieve lottery creator secrets in browser local storage, with a restore mechanism for users who have backed up their secrets externally.

## Implementation

### 1. Storage Hook (`fe/src/hooks/useLotterySecrets.ts`)

Created a custom hook using `useLocalStorage` from `usehooks-ts` that provides:

- `saveSecret(lotteryId, secret)` - Save a creator secret
- `getSecret(lotteryId)` - Retrieve a saved secret
- `hasSecret(lotteryId)` - Check if a secret exists
- `validateSecret(secret, commitment)` - Validate secret against on-chain commitment
- `removeSecret(lotteryId)` - Remove a secret
- `clearAllSecrets()` - Clear all secrets
- `getLotteryIds()` - Get all lottery IDs with saved secrets

### 2. Restore Secret Modal (`fe/src/components/lottery/RestoreSecretModal.tsx`)

Created a modal component that:

- Shows saved secret if it exists in local storage
- Allows users to paste and restore a secret if not found
- Validates pasted secrets against the on-chain commitment hash
- Provides copy-to-clipboard functionality
- Shows clear error messages for invalid secrets

### 3. Auto-Save on Creation (`fe/src/hooks/useCreateLottery.ts`)

Updated the lottery creation hook to:

- Automatically save creator secrets to local storage after successful creation
- Uses `useEffect` to trigger save when `lotteryId` and `creatorSecret` are available

### 4. Dashboard Integration (`fe/src/routes/dashboard.tsx`)

Enhanced the dashboard to:

- Add "View Secret" / "Restore Secret" button to each lottery card
- Auto-fill reveal modal with stored secret if available
- Show restore modal if secret is not found
- Provide seamless UX for revealing lotteries

### 5. User Notifications (`fe/src/components/lottery/TicketDistribution.tsx`)

Updated the ticket distribution component to:

- Inform users that secrets are automatically saved
- Encourage external backup as a best practice
- Update instructions to mention dashboard access

## User Flow

### Creating a Lottery

1. User creates a lottery
2. Creator secret is generated and displayed
3. **Secret is automatically saved to local storage**
4. User is notified of auto-save and encouraged to back up externally
5. User can access the secret later from the dashboard

### Accessing Saved Secrets and Tickets

1. User navigates to dashboard
2. Each lottery card shows "View Secret" button (if secret exists) or "Restore Secret" (if not)
3. Clicking the button opens a modal showing the saved secret
4. User can copy the secret to clipboard
5. If ticket secrets are available, a "View All Ticket Codes" button is shown
6. Clicking "View All Ticket Codes" opens a modal with all ticket codes, QR codes, and copy buttons
7. User can share individual ticket codes or download all tickets as JSON

### Restoring Lost Secrets

1. User clicks "Restore Secret" on a lottery card
2. Modal shows that no secret is found
3. User pastes their backed-up secret (e.g., `0xa8dfd8593ce604563a7967e0566f3524369fdfebf0a87bd89ab6babb366590b7`)
4. System validates the secret against the on-chain commitment
5. If valid, secret is saved to local storage
6. User can now reveal the lottery

### Revealing a Lottery

1. User clicks "Reveal Lottery" on a lottery card
2. If secret is saved, it's automatically used for reveal
3. If secret is not saved, modal prompts user to enter it
4. Seamless experience for users who have their secrets saved

## Security Considerations

- **Local Storage**: Secrets are stored in browser local storage (not encrypted)
- **User Warning**: Users are warned to back up secrets externally during creation
- **Validation**: All restored secrets are validated against on-chain commitments
- **No Server**: No server-side storage - fully client-side solution
- **Appropriate for Use Case**: Secrets are needed for legitimate lottery operations

## Technical Details

### Storage Format

```json
{
  "lottery-creator-secrets": {
    "1": {
      "creatorSecret": "0xa8dfd8593ce604563a7967e0566f3524369fdfebf0a87bd89ab6babb366590b7",
      "ticketSecrets": [
        "0x1234...",
        "0x5678...",
        "0x9abc..."
      ],
      "createdAt": 1234567890
    },
    "2": {
      "creatorSecret": "0x...",
      "ticketSecrets": ["0x..."],
      "createdAt": 1234567891
    }
  }
}
```

### Secret Format

- 32-byte hex string
- Starts with `0x`
- Example: `0xa8dfd8593ce604563a7967e0566f3524369fdfebf0a87bd89ab6babb366590b7`

### Validation

Secrets are validated by:
1. Checking format (0x + 64 hex characters)
2. Hashing with keccak256
3. Comparing hash with on-chain commitment

## Files Modified

1. `fe/src/hooks/useLotterySecrets.ts` - Storage hook with creator + ticket secrets
2. `fe/src/components/lottery/RestoreSecretModal.tsx` - Modal for viewing/restoring creator secret
3. `fe/src/components/lottery/ViewTicketsModal.tsx` - New modal for viewing all ticket codes
4. `fe/src/hooks/useCreateLottery.ts` - Auto-save creator + ticket secrets
5. `fe/src/routes/dashboard.tsx` - Added restore and view tickets UI
6. `fe/src/components/lottery/TicketDistribution.tsx` - Updated notifications
7. `fe/src/hooks/README.md` - Documentation
8. `.kiro/specs/mystery-lottery/secret-storage-feature.md` - Feature documentation

## Testing

To test the feature:

1. Create a lottery and verify secret is saved
2. Refresh the page and check dashboard shows "View Secret"
3. Click "View Secret" and verify secret is displayed
4. Clear local storage and verify "Restore Secret" appears
5. Paste a valid secret and verify it's saved
6. Try pasting an invalid secret and verify error message
7. Reveal a lottery with saved secret and verify auto-fill works

## Future Enhancements

- Encrypted local storage option
- Cloud backup integration (via wallet)
- Export/import all secrets as JSON
- Secret expiration after lottery finalization
- Multi-device sync via wallet signature
