# Ticket Claiming Flow - Before & After

## Before (Bad UX)

```
1. User receives ticket code from creator
   ↓
2. User enters ticket code to commit
   ↓
3. Lottery reveals
   ↓
4. User sees "You won!" on dashboard
   ↓
5. User clicks "Claim Prize"
   ↓
6. ❌ User must find and re-enter original ticket code
   ↓
7. User claims prize
```

**Problem:** Step 6 requires user to dig up the original ticket code again, even though they already provided it in step 2.

## After (Good UX)

```
1. User receives ticket code from creator
   ↓
2. User enters ticket code to commit
   ✅ Secret automatically saved to localStorage
   ↓
3. Lottery reveals
   ↓
4. User sees "You won!" on dashboard
   ↓
5. User clicks "Claim Prize Now"
   ✅ Secret automatically retrieved from localStorage
   ↓
6. User claims prize (no re-entry needed!)
```

**Solution:** Ticket secret is automatically saved when first entered and retrieved when needed for claiming.

## Technical Flow

### First Visit (Commit Phase)
```typescript
// User enters ticket code
parseTicketInput(code) → { lottery, ticket, secret }
                         ↓
// Automatically saved to localStorage
useParticipantTickets().saveTicket(lotteryId, ticketIndex, secret)
                         ↓
// User commits ticket
useCommitTicket({ lotteryId, ticketIndex, ticketSecret })
```

### Return Visit (Claim Phase)
```typescript
// Check if secret is stored
const storedSecret = useParticipantTickets().getTicketSecret(lotteryId, ticketIndex)
                         ↓
// If stored: Direct claim link
if (storedSecret) {
  <Link to="/participant/ticket" search={{ code: encodeTicketCode(...) }}>
    Claim Prize Now
  </Link>
}
                         ↓
// If not stored: Manual entry
else {
  <Link to="/participant/ticket">
    Enter Ticket Code to Claim
  </Link>
}
```

## Storage Details

### localStorage Key
```
'participant-tickets'
```

### Storage Format
```json
{
  "1_0": {
    "lotteryId": "1",
    "ticketIndex": 0,
    "ticketSecret": "0x1234567890abcdef...",
    "savedAt": 1699123456789
  },
  "2_3": {
    "lotteryId": "2",
    "ticketIndex": 3,
    "ticketSecret": "0xfedcba0987654321...",
    "savedAt": 1699123456790
  }
}
```

## User Experience Improvements

### Dashboard View
**Before:**
```
🎉 You won 5 USDC!
[Enter Ticket Code to Claim]
```

**After:**
```
🎉 You won 5 USDC!
Click below to claim your prize.
[Claim Prize Now] ← Direct link with secret
```

### Lottery Detail Page
**Before:**
```
Claim Your Prize
To claim your prize, you need your original ticket code.
[Enter Ticket Code to Claim]
```

**After (with stored secret):**
```
Claim Your Prize
Your ticket code has been saved. Click the button below to proceed to claiming.
[Claim Prize Now] ← One-click claim
```

**After (without stored secret):**
```
Claim Your Prize
Use the ticket code you received from the lottery creator to claim your prize.
[Enter Ticket Code to Claim] ← Fallback
```

## Edge Cases Handled

1. **Secret not stored** (cleared localStorage, different device)
   - Falls back to manual entry flow
   - User can still claim by entering ticket code

2. **Multiple tickets in same lottery**
   - Each ticket stored separately with unique key
   - Format: `{lotteryId}_{ticketIndex}`

3. **Browser session persistence**
   - Uses `useLocalStorage` from usehooks-ts
   - Persists across browser restarts
   - Syncs across tabs

4. **Security**
   - Secrets stored locally (not on server)
   - Same-origin policy protects access
   - User can clear localStorage to remove secrets

## Future Enhancements

- [ ] Add "Manage Saved Tickets" page in participant dashboard
- [ ] Show list of all saved tickets with lottery info
- [ ] Allow manual deletion of saved tickets
- [ ] Export/backup ticket secrets
- [ ] Optional encryption with user password
- [ ] Auto-cleanup of old/claimed tickets
