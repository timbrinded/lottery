# Project Structure

## Monorepo Organization

```
blockery/
├── contract/          # Foundry smart contracts
├── fe/                # React frontend application
├── .kiro/             # Kiro AI assistant configuration
├── index.ts           # Root entry point
└── package.json       # Root package configuration
```

## Smart Contract Structure (`contract/`)

```
contract/
├── src/               # Solidity source files
│   └── Counter.sol    # Example contract (replace with LotteryFactory.sol)
├── test/              # Test files (*.t.sol)
│   └── Counter.t.sol
├── script/            # Deployment scripts (*.s.sol)
│   └── Counter.s.sol
├── lib/               # External dependencies (git submodules)
│   └── forge-std/     # Foundry standard library
├── out/               # Compiled artifacts (gitignored)
├── cache/             # Build cache
├── foundry.toml       # Foundry configuration
└── README.md
```

### Contract Conventions

- Main contracts in `src/` (e.g., `LotteryFactory.sol`)
- Test files mirror source structure with `.t.sol` suffix
- Deploy scripts in `script/` with `.s.sol` suffix
- Libraries installed as git submodules in `lib/`

## Frontend Structure (`fe/`)

```
fe/
├── src/
│   ├── components/    # React components
│   │   ├── lottery/   # Lottery-specific components
│   │   ├── ticket/    # Ticket-specific components
│   │   ├── dashboard/ # Dashboard components
│   │   └── shared/    # Reusable components
│   ├── hooks/         # Custom React hooks
│   │   ├── useCreateLottery.ts
│   │   ├── useCommitTicket.ts
│   │   └── useLotteryState.ts
│   ├── lib/           # Utility libraries
│   │   ├── crypto.ts  # Secret generation, hashing
│   │   ├── shuffle.ts # Randomization utilities
│   │   ├── validation.ts
│   │   └── utils.ts   # General utilities (cn helper)
│   ├── routes/        # TanStack Router file-based routes
│   │   └── __root.tsx # Root layout
│   ├── contracts/     # Generated contract types
│   ├── main.tsx       # Application entry point
│   └── styles.css     # Global styles
├── public/            # Static assets
├── node_modules/      # Dependencies (gitignored)
├── index.html         # HTML entry point
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript configuration
├── components.json    # shadcn/ui configuration
└── package.json
```

### Frontend Conventions

- **Components**: Organized by feature domain (lottery, ticket, dashboard, shared)
- **Hooks**: Contract interaction hooks prefixed with `use` (e.g., `useCreateLottery`)
- **Routes**: File-based routing in `src/routes/` (managed by TanStack Router)
- **Imports**: Use `@/*` alias for `src/*` imports
- **Styling**: Tailwind utility classes + shadcn/ui components
- **State**: TanStack Store for global state (if needed)

## Configuration Directory (`.kiro/`)

```
.kiro/
├── steering/          # AI assistant guidance documents
│   ├── product.md     # Product overview
│   ├── tech.md        # Technology stack
│   └── structure.md   # Project structure (this file)
├── specs/             # Feature specifications
│   └── mystery-lottery/
│       ├── design.md  # Design document
│       └── tasks.md   # Implementation tasks
└── settings/          # Kiro settings
    └── mcp.json       # Model Context Protocol config
```

## Key Files

- **Root `package.json`**: Monorepo dependencies (shadcn, TypeScript types)
- **Root `tsconfig.json`**: Shared TypeScript configuration
- **`bun.lock`**: Lockfile for reproducible builds
- **`.gitignore`**: Excludes `node_modules/`, `out/`, build artifacts
- **`README.md`**: Project documentation

## Naming Conventions

- **Solidity**: PascalCase for contracts, camelCase for functions/variables
- **TypeScript**: PascalCase for components, camelCase for functions/variables
- **Files**: PascalCase for components (`.tsx`), camelCase for utilities (`.ts`)
- **Routes**: Lowercase with hyphens for URLs, PascalCase for route files
- **Tests**: Mirror source file names with `.t.sol` (Solidity) or `.test.ts` (TypeScript)

## Build Artifacts (Gitignored)

- `contract/out/` - Compiled Solidity artifacts
- `contract/cache/` - Foundry build cache
- `fe/node_modules/` - Frontend dependencies
- `fe/dist/` - Production build output
- `node_modules/` - Root dependencies
