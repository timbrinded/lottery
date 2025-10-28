---
inclusion: always
---

# Development Guidelines

## Code Quality Principles

- **Simplicity First**: Write minimal, readable code. Avoid premature optimization and over-engineering.
- **Single Responsibility**: Each function/component should do one thing well.
- **Explicit Over Implicit**: Prefer clear, verbose names over clever abbreviations.

## Framework-First Approach

Before implementing custom solutions:

1. Check framework documentation for existing functionality
2. Use built-in methods over custom implementations
3. Leverage MCP tools to verify API usage and best practices
4. Search official docs when uncertain about framework capabilities

## Technology Stack Adherence

- **Frontend**: Use TanStack Router for routing, not React Router or Next.js patterns
- **Styling**: Tailwind utility classes + shadcn/ui components (no custom CSS modules)
- **State**: React hooks + TanStack Store (avoid Redux, Zustand, or other state libraries)
- **Web3**: wagmi + viem for Arc blockchain (no ethers.js or web3.js)
- **Testing**: Vitest for frontend, Forge for contracts (no Jest or Hardhat)

## Code Verification

- Use MCP tools to validate implementations against official documentation
- Check TypeScript types match framework expectations
- Verify contract patterns align with Solidity best practices
- Test gas efficiency for smart contract operations

## Architecture Patterns

- **Components**: Feature-based organization (`lottery/`, `ticket/`, `shared/`)
- **Hooks**: One hook per contract interaction (e.g., `useCommitTicket`, `useClaimPrize`)
- **Utilities**: Pure functions in `lib/` (crypto, validation, formatting)
- **Contracts**: Single responsibility per contract, minimal inheritance

## Common Pitfalls to Avoid

- Don't mix routing libraries (TanStack Router only)
- Don't add unnecessary dependencies (check if functionality exists first)
- Don't write custom crypto when Web Crypto API suffices
- Don't bypass TypeScript strict mode checks
- Don't ignore gas optimization in smart contracts
