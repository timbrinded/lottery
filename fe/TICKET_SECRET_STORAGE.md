# Ticket Secret Storage Implementation

## Problem
When participants won prizes, they had to re-enter their ticket code to claim, even though they had already provided it during the commit phase. This created poor UX.

## Solution
Implemented automatic localStorage persistence of ticket secrets, similar to how the manager flow stores lottery secrets.

## Changes Made

### 1. New Hook: `useParticipantTickets`
**File:** `fe/src/hooks/useParticipantTickets.ts`

- Stores ticket secrets in localStorage under key `participant-tickets`
- Provides methods to save, retrieve, and manage ticket secrets
- Automatically saves when user first views a ticket
- Persists across browser sessions

**Key Methods:**
- `saveTicket(lotteryId, ticketIndex, ticketSecret)` - Save a ticket's secret
- `getTicketSecret(lotteryId, ticketIndex)` - Retrieve saved secret
- `hasTicket(lotteryId, ticketIndex)` - Check if ticket is saved
- `removeTicket(lotteryId, ticketIndex)` - Remove after claiming (optional)

### 2. Updated Participant Ticket Route
**File:** `fe/src/routes/participant/ticket.tsx`

**Changes:**
- Automatically saves ticket secret to localStorage when user first views ticket
- Retrieves stored secret if available (user doesn't need to re-enter code)
- Falls back to URL parameter if no stored secret exists
- Uses `useEffect` to save on mount when ticket is decoded

**Flow:**
1. User enters ticket code → saved to localStorage
2. User commits ticket → secret still in localStorage
3. Lottery reveals → user navigates to claim
4. Secret automatically retrieved from localStorage → no re-entry needed

### 3. Updated Participant Lottery Detail
**File:** `fe/src/routes/participant/lottery/$id.tsx`

**Changes:**
- Checks localStorage for stored ticket secret when showing claim button
- If secret exists: Shows "Claim Prize Now" button with direct link
- If secret missing: Shows "Enter Ticket Code to Claim" (fallback)
- Automatically encodes ticket code with stored secret for seamless claiming

**UX Improvements:**
- Winners see "Claim Prize Now" instead of "Enter Ticket Code"
- One-click navigation to claim page with secret pre-filled
- No need to find original ticket code again

## Storage Structure

```typescript
// localStorage key: 'participant-tickets'
{
  "1_0": {
    "lotteryId": "1",
    "ticketIndex": 0,
    "ticketSecret": "0x1234...",
    "savedAt": 1699123456789
  },
  "1_1": {
    "lotteryId": "1", 
    "ticketIndex": 1,
    "ticketSecret": "0x5678...",
    "savedAt": 1699123456790
  }
}
```

## Security Considerations

- Secrets stored in browser localStorage (same as manager secrets)
- Only accessible to same origin (browser security)
- User can clear localStorage to remove secrets
- Secrets are needed for claiming, so storage is necessary
- No server-side storage means no centralized attack vector

## Future Enhancements

- Optional: Clear secret after successful claim (currently kept for reference)
- Optional: Export/backup ticket secrets
- Optional: Encrypt secrets in localStorage with user password
- Optional: Show list of saved tickets in participant dashboard

## Testing Checklist

- [ ] First-time ticket view saves secret to localStorage
- [ ] Returning to ticket page retrieves secret from localStorage
- [ ] Claim button shows "Claim Prize Now" when secret is stored
- [ ] Claim button shows "Enter Ticket Code" when secret is missing
- [ ] Claiming works with stored secret
- [ ] Multiple tickets for same lottery stored separately
- [ ] Secrets persist across browser sessions
- [ ] Clearing localStorage requires re-entering ticket code
