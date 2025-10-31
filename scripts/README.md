# Development Scripts

## Create Block

Creates new blocks on your local Anvil node for testing time-dependent features.

```bash
# Mine 1 block
./scripts/create-block.sh

# Mine multiple blocks
./scripts/create-block.sh 10

# Use custom RPC URL
RPC_URL=http://localhost:8545 ./scripts/create-block.sh 5
```

**Prerequisites:** Anvil must be running on `http://127.0.0.1:8545`

## Fund Local Address

Funds `0xb764428a29EAEbe8e2301F5924746F818b331F5A` with 10,000 ETH on local Anvil.

```bash
./scripts/fund-local-address.sh
```

**Prerequisites:** Anvil must be running on `http://127.0.0.1:8545`

## Manual Funding Commands

### Set Balance Directly (Fastest)

```bash
# Fund with 10,000 ETH
cast rpc anvil_setBalance 0xYOUR_ADDRESS 0x21E19E0C9BAB2400000 --rpc-url http://127.0.0.1:8545

# Fund with 1,000 ETH
cast rpc anvil_setBalance 0xYOUR_ADDRESS 0x3635C9ADC5DEA00000 --rpc-url http://127.0.0.1:8545

# Fund with 100 ETH
cast rpc anvil_setBalance 0xYOUR_ADDRESS 0x56BC75E2D63100000 --rpc-url http://127.0.0.1:8545
```

### Send from Pre-funded Account

```bash
# Send 10 ETH from Anvil's first account
cast send 0xYOUR_ADDRESS --value 10ether --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545
```

### Check Balance

```bash
cast balance 0xYOUR_ADDRESS --rpc-url http://127.0.0.1:8545
```

## Common Wei Conversions

| Amount | Wei (Hex) | Wei (Decimal) |
|--------|-----------|---------------|
| 1 ETH | 0xDE0B6B3A7640000 | 1000000000000000000 |
| 10 ETH | 0x8AC7230489E80000 | 10000000000000000000 |
| 100 ETH | 0x56BC75E2D63100000 | 100000000000000000000 |
| 1,000 ETH | 0x3635C9ADC5DEA00000 | 1000000000000000000000 |
| 10,000 ETH | 0x21E19E0C9BAB2400000 | 10000000000000000000000 |

## Anvil Default Accounts

When Anvil starts, it creates 10 accounts with 10,000 ETH each:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

... (8 more accounts)
```

Use these accounts for testing without needing to fund them.
