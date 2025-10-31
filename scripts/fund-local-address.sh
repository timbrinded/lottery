#!/bin/bash

# Fund a specific address on local Anvil
# Usage: ./scripts/fund-local-address.sh

ADDRESS="0xb764428a29EAEbe8e2301F5924746F818b331F5A"
AMOUNT="10000" # 10,000 ETH in decimal
AMOUNT_WEI="0x21E19E0C9BAB2400000" # 10,000 ETH in hex wei

echo "Funding address: $ADDRESS"
echo "Amount: $AMOUNT ETH"

# Method 1: Using cast to set balance directly (fastest)
cast rpc anvil_setBalance $ADDRESS $AMOUNT_WEI --rpc-url http://127.0.0.1:8545

if [ $? -eq 0 ]; then
    echo "✅ Successfully funded $ADDRESS with $AMOUNT ETH"
    
    # Verify the balance
    BALANCE=$(cast balance $ADDRESS --rpc-url http://127.0.0.1:8545)
    echo "Current balance: $BALANCE wei"
else
    echo "❌ Failed to fund address"
    echo ""
    echo "Make sure Anvil is running:"
    echo "  anvil --fork-url https://rpc.testnet.arc.network --chain-id 5042002"
    exit 1
fi
