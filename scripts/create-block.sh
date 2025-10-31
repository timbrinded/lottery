#!/bin/bash

# Create a new block on local Anvil node
# Usage: ./scripts/create-block.sh [number_of_blocks]

# Default to 1 block if no argument provided
BLOCKS=${1:-1}

# Anvil RPC URL (default local)
RPC_URL=${RPC_URL:-"http://127.0.0.1:8545"}

echo "Creating $BLOCKS block(s) on $RPC_URL..."

for ((i=1; i<=BLOCKS; i++)); do
  cast rpc evm_mine --rpc-url "$RPC_URL" > /dev/null
  if [ $? -eq 0 ]; then
    echo "✓ Block $i mined"
  else
    echo "✗ Failed to mine block $i"
    exit 1
  fi
done

# Get current block number
BLOCK_NUMBER=$(cast block-number --rpc-url "$RPC_URL")
echo "Current block number: $BLOCK_NUMBER"
