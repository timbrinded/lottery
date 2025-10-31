# Local Development Setup

## Running Anvil with Arc Testnet Fork

To develop locally with Arc testnet state and contracts, start Anvil with forking:

```bash
anvil --fork-url https://rpc.testnet.arc.network --chain-id 5042002
```

This command:
- Forks Arc testnet at the latest block
- Preserves chain ID 5042002 for compatibility
- Provides 10 test accounts with 10,000 ETH each
- Allows testing with real Arc testnet contracts and state

## Frontend Configuration

The frontend is already configured for local mode in `fe/.env.local`:

```env
VITE_LOCAL_MODE=1
```

When `VITE_LOCAL_MODE=1`, the frontend will:
- Connect to `http://127.0.0.1:8545` (Anvil)
- Use chain ID 5042002 (Arc Testnet Fork)
- Display "🔧 Local mode active" in console

## Workflow

1. Start Anvil with forking:
   ```bash
   anvil --fork-url https://rpc.testnet.arc.network --chain-id 5042002
   ```

2. (Optional) Fund a specific address on Anvil:
   ```bash
   # Using the provided script
   ./scripts/fund-local-address.sh
   
   # Or manually with cast
   cast rpc anvil_setBalance 0xb764428a29EAEbe8e2301F5924746F818b331F5A 0x21E19E0C9BAB2400000 --rpc-url http://127.0.0.1:8545
   ```

3. Deploy contracts to local Anvil (from `contract/` directory):
   ```bash
   forge script script/YourScript.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
   ```
   
   After deployment, copy the contract address from the output.

4. Set the contract address in `fe/.env.local`:
   ```env
   VITE_LOTTERY_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   ```
   Replace with your actual deployed address.

5. Start frontend dev server (from `fe/` directory):
   ```bash
   bun run dev
   ```

6. Connect your wallet to the local network:
   - Network: Localhost (Arc Testnet Fork)
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 5042002

## Switching Between Modes

### Local Mode (Anvil Fork)
Set in `fe/.env.local`:
```env
VITE_LOCAL_MODE=1
```

### Arc Testnet Mode
Set in `fe/.env.local`:
```env
VITE_LOCAL_MODE=0
```
Or remove the variable entirely.

## Contract Address Configuration

The LotteryFactory contract address can be set in two ways:

### 1. Environment Variable (Recommended for Local Development)

Set `VITE_LOTTERY_FACTORY_ADDRESS` in `fe/.env.local`:
```env
VITE_LOTTERY_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

This takes priority over chain-specific addresses and is perfect for local development.

### 2. Chain-Specific Configuration

Edit `fe/src/contracts/config.ts` to set addresses per chain:
```typescript
export const LOTTERY_FACTORY_ADDRESSES: Record<number, Address> = {
  5042002: '0x...', // Arc Testnet / Local Fork
  5678: '0x...',    // Arc Mainnet
}
```

Use this for production deployments where the address is stable.

## Funding Addresses on Anvil

### Pre-funded Test Accounts

Anvil automatically creates 10 test accounts with 10,000 ETH each:
- Account 0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Account 1: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- ... (8 more accounts)

Private keys are displayed when Anvil starts.

### Fund Custom Address

To fund a specific address (like `0xb764428a29EAEbe8e2301F5924746F818b331F5A`):

```bash
# Using the script
./scripts/fund-local-address.sh

# Or manually with cast
cast rpc anvil_setBalance 0xb764428a29EAEbe8e2301F5924746F818b331F5A 0x21E19E0C9BAB2400000 --rpc-url http://127.0.0.1:8545

# Check balance
cast balance 0xb764428a29EAEbe8e2301F5924746F818b331F5A --rpc-url http://127.0.0.1:8545
```

The hex value `0x21E19E0C9BAB2400000` equals 10,000 ETH in wei.

## Benefits of Forking

- Test with real Arc testnet contracts without deploying
- Access existing testnet state and balances
- Fast local execution with instant block times
- No testnet gas costs for testing
- Easy reset by restarting Anvil
