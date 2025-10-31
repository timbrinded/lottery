# Lottery Hooks

## useLotterySecrets

Hook for managing lottery creator secrets in browser local storage.

### Features

- **Auto-save**: Secrets are automatically saved when a lottery is created
- **Restore**: Users can restore secrets by pasting them (validates against on-chain commitment)
- **View**: Access saved secrets from the dashboard
- **Validation**: Validates secrets against commitment hashes before saving

### Usage

```typescript
import { useLotterySecrets } from '@/hooks/useLotterySecrets';

function MyComponent() {
  const { 
    saveSecret, 
    getSecret, 
    hasSecret, 
    validateSecret 
  } = useLotterySecrets();

  // Save a secret
  saveSecret(lotteryId, '0xa8dfd8593ce604563a7967e0566f3524369fdfebf0a87bd89ab6babb366590b7');

  // Get a secret
  const secret = getSecret(lotteryId);

  // Check if secret exists
  const exists = hasSecret(lotteryId);

  // Validate a secret
  const isValid = validateSecret(secret, commitment);
}
```

### Storage Format

Secrets are stored in local storage under the key `lottery-creator-secrets` as a JSON object:

```json
{
  "1": {
    "creatorSecret": "0xa8dfd8593ce604563a7967e0566f3524369fdfebf0a87bd89ab6babb366590b7",
    "ticketSecrets": [
      "0x...",
      "0x...",
      "0x..."
    ],
    "createdAt": 1234567890
  },
  "2": {
    "creatorSecret": "0x...",
    "ticketSecrets": ["0x..."],
    "createdAt": 1234567891
  }
}
```

### Security Considerations

- Secrets are stored in browser local storage (not encrypted)
- Users are warned to back up secrets externally
- Secrets can be restored from external backup if local storage is cleared
- Validation against on-chain commitment prevents invalid secrets from being saved

### Integration Points

1. **useCreateLottery**: Automatically saves creator secret and ticket secrets after lottery creation
2. **Dashboard**: Provides "View Secret" / "Restore Secret" button for each lottery
3. **RestoreSecretModal**: UI for viewing and restoring creator secrets, with button to view tickets
4. **ViewTicketsModal**: UI for viewing all ticket codes with QR codes and copy functionality
