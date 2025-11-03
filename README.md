# Mystery Lottery (Blockery)

A decentralized lottery platform on Arc blockchain that uses a multi-party commit-reveal pattern to ensure fairness and prevent gaming. The system enables creators to distribute mystery prizes through time-locked lotteries with hidden values.

## 🎯 Key Features

- **Multi-Party Commit-Reveal**: Fair randomness using creator secret + participant ticket hashes
- **Two-Step Participation**: Users commit before the draw, then claim prizes after reveal
- **Prize Cascade**: Uncommitted tickets don't lock prizes - they cascade to active participants
- **Flexible Gas Model**: Paymaster for USDC gas + optional sponsored commits + gasless claiming
- **Native USDC**: Built-in Arc blockchain USDC integration for prizes and gas

## 📚 Documentation

- **[Game Flow Documentation](./GAME_FLOW.md)** - Visual guide with sequence diagrams, state machines, and flowcharts
- **[Design Document](./.kiro/specs/mystery-lottery/design.md)** - Detailed technical design
- **[Randomness Migration](./.kiro/specs/randomness-migration/)** - Multi-party commit-reveal implementation details

## 🎲 Randomness Mechanism

The system uses a **multi-party commit-reveal** approach for fair, unpredictable randomness:

1. **Creator Secret**: Generated and committed before ticket distribution
2. **Participant Entropy**: Each committed ticket contributes randomness
3. **Combined Seed**: `keccak256(creatorSecret + hash(all committed ticket hashes))`
4. **No Block Dependencies**: No waiting for future blocks or blockhash availability
5. **Minimum Participants**: Requires at least 1 committed ticket to reveal

**Security Properties:**
- Creator cannot manipulate alone (secret committed before distribution)
- Participants cannot predict (don't know creator secret or other tickets)
- Collusion resistant (requires knowing ALL participants' secrets)
- Deterministic (same inputs = same output, verifiable fairness)

See [GAME_FLOW.md](./GAME_FLOW.md#randomness-generation) for detailed flow diagrams.

## 🚀 Quick Start

### Install Dependencies

```bash
bun install
```

### Smart Contract Development

```bash
cd contract
forge build          # Compile contracts
forge test           # Run tests
forge test -vvv      # Run tests with verbose output
```

### Frontend Development

```bash
cd fe
bun install          # Install frontend dependencies
bun run dev          # Start dev server on port 3000
bun run build        # Build for production
```

### Local Testing

See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for detailed local testing setup.

## 🏗️ Project Structure

```
blockery/
├── contract/          # Foundry smart contracts
│   ├── src/          # Solidity source files
│   ├── test/         # Contract tests
│   └── script/       # Deployment scripts
├── fe/               # React frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom hooks (wagmi)
│   │   ├── lib/         # Utilities (crypto, validation)
│   │   └── routes/      # TanStack Router routes
├── .kiro/            # Kiro AI assistant configuration
│   └── specs/        # Feature specifications
├── GAME_FLOW.md      # Visual game flow documentation
└── README.md         # This file
```

## 🔗 Technology Stack

- **Smart Contracts**: Solidity + Foundry
- **Frontend**: React + TanStack Router + Vite
- **Web3**: wagmi + viem
- **Styling**: Tailwind CSS + shadcn/ui
- **Blockchain**: Arc Network (EVM-compatible L2)
- **Gas Token**: Native USDC

## 📖 Additional Resources

- [Arc Network Documentation](https://docs.arc.network/arc/concepts/welcome-to-arc)
- [Foundry Book](https://book.getfoundry.sh/)
- [wagmi Documentation](https://wagmi.sh/)
- [TanStack Router](https://tanstack.com/router)

## 🤝 Contributing

This project was created using `bun init` in bun v1.2.23. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

For development guidelines, see `.kiro/steering/guidelines.md`.
