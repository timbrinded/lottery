# Technology Stack

## Build System

- **Runtime**: Bun (v1.2.23+)
- **Package Manager**: Bun
- **Monorepo Structure**: Root + `fe/` (frontend) + `contract/` (smart contracts)

## Frontend Stack

### Core Technologies

- **Framework**: React 19.2
- **Build Tool**: Vite 7.1
- **Language**: TypeScript 5.7 (strict mode)
- **Routing**: TanStack Router v1.132 (file-based routing)
- **Styling**: Tailwind CSS v4 + tw-animate-css
- **UI Components**: shadcn/ui (class-variance-authority, lucide-react)
- **Web3**: wagmi + viem (for Arc blockchain interaction)
- **Testing**: Vitest 3.0 + React Testing Library

### Frontend Conventions

- Path alias: `@/*` maps to `src/*`
- File-based routing in `src/routes/`
- Component organization: `components/lottery/`, `components/ticket/`, `components/shared/`
- Custom hooks in `hooks/` for contract interactions
- Crypto utilities in `lib/crypto.ts`, `lib/shuffle.ts`, `lib/validation.ts`

## Smart Contract Stack

### Core Technologies

- **Framework**: Foundry (Forge, Cast, Anvil)
- **Language**: Solidity ^0.8.13
- **Testing**: Forge (unit, integration, fuzz tests)
- **Libraries**: forge-std (testing utilities)

### Contract Conventions

- SPDX license identifier required
- Pragma version: `^0.8.13`
- Source files in `src/`
- Test files in `test/` with `.t.sol` suffix
- Deploy scripts in `script/` with `.s.sol` suffix

## Common Commands

### Root Level

```bash
bun install              # Install dependencies
bun run index.ts         # Run root script
```

### Frontend (`fe/`)

```bash
bun install              # Install frontend dependencies
bun run dev              # Start dev server on port 3000
bun run build            # Build for production (vite build + tsc)
bun run serve            # Preview production build
bun run test             # Run tests with Vitest
```

### Smart Contracts (`contract/`)

```bash
forge build              # Compile contracts
forge test               # Run all tests
forge test -vvv          # Run tests with verbose output
forge fmt                # Format Solidity code
forge snapshot           # Generate gas snapshots
anvil                    # Start local Ethereum node
forge script script/Counter.s.sol --rpc-url <url> --private-key <key>  # Deploy
```

## Development Environment

- **OS**: Linux (bash shell)
- **Node Version**: Compatible with Bun runtime
- **Solidity Compiler**: Managed by Foundry

## Key Dependencies

### Frontend

- `@tanstack/react-router`: File-based routing with type safety
- `@tailwindcss/vite`: Tailwind v4 Vite plugin
- `class-variance-authority`: Component variant management
- `tailwind-merge`: Utility for merging Tailwind classes
- `lucide-react`: Icon library

### Smart Contracts

- `forge-std`: Foundry standard library for testing
- Native USDC on Arc blockchain (no external token contract needed)

## Configuration Files

- `tsconfig.json`: TypeScript config with strict mode, bundler resolution
- `vite.config.ts`: Vite config with TanStack Router plugin, path aliases
- `foundry.toml`: Foundry config (src, out, libs directories)
- `components.json`: shadcn/ui configuration
- `package.json`: Project metadata and scripts
