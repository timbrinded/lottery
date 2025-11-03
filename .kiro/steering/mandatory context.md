---
inclusion: always
---

# Arc Blockchain Context

## Network Characteristics

- **Blockchain**: Arc Network (EVM-compatible Layer 2)
- **Environment**: Testnet only (no mainnet deployment yet)
- **Gas Token**: Native USDC (not ETH) - all gas fees paid in USDC
- **Compatibility**: Limited EVM compatibility - verify features before assuming Ethereum parity
- **Documentation**: https://docs.arc.network/arc/concepts/welcome-to-arc

## Critical Constraints

### Gas Payment Model

- All transactions require USDC for gas, not ETH
- Users must hold USDC balance for transaction fees
- Paymaster patterns can sponsor gas for users
- Account abstraction features available for gasless UX

### Network Limitations

- Not all Ethereum opcodes/precompiles may be supported
- Test Arc-specific behavior before assuming standard EVM functionality
- Block times and finality may differ from Ethereum mainnet
- RPC endpoints and chain IDs are Arc-specific

## Development Implications

### Smart Contracts

- Assume USDC as native gas token in all contract logic
- Test gas estimation with USDC pricing, not ETH
- Verify opcode compatibility for advanced Solidity features
- Use Arc testnet for all deployments and testing

### Frontend Integration

- Configure wagmi/viem for Arc network (custom chain config)
- Display gas costs in USDC, not ETH
- Handle USDC balance checks before transaction attempts
- Use Arc-specific RPC endpoints and block explorers

### Testing Strategy

- All integration tests must run against Arc testnet
- Mock Arc-specific behavior in unit tests
- Test paymaster flows if implementing sponsored transactions

## When in Doubt

- Consult Arc documentation for network-specific behavior
- Test on Arc testnet before assuming Ethereum compatibility
- Verify gas token is USDC in all transaction flows
- Check Arc Discord/support for compatibility questions