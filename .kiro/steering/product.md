# Product Overview

## Mystery Lottery System

A decentralized lottery platform on Arc blockchain that uses a commit-reveal pattern to ensure fairness and prevent gaming. The system enables creators to distribute mystery prizes through time-locked lotteries with hidden values.

### Core Features

- **Commit-Reveal Pattern**: Ensures fairness by preventing anyone from knowing winners before distribution
- **Two-Step Participation**: Users commit before the draw, then claim prizes after reveal
- **Prize Cascade**: Uncommitted tickets don't lock prizes - they cascade to active participants
- **Flexible Gas Model**: Paymaster for USDC gas + optional sponsored commits + gasless claiming
- **Native USDC**: Built-in Arc blockchain USDC integration for prizes and gas

### Key User Flows

1. **Creator Flow**: Create lottery → distribute ticket codes → reveal after commit deadline → process forfeitures
2. **Participant Flow**: Receive ticket code → commit before deadline → claim prize after reveal
3. **Winner Flow**: Gasless prize claiming with automatic gas deduction from winnings

### Design Principles

- Fairness first through cryptographic commitments
- Gas efficiency optimized for Arc's low-cost environment
- Clear UX with prominent deadlines and countdowns
- Viral sharing enabled through QR codes and URLs
