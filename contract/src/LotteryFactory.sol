// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title LotteryFactory
 * @notice A decentralized lottery system using commit-reveal pattern for fairness
 * @dev Implements time-locked mystery lotteries with prize cascade and gasless claiming
 */
contract LotteryFactory {
    // ============ Enums ============

    /**
     * @notice Lottery lifecycle states
     * @dev State transitions: Pending → CommitOpen → CommitClosed → RevealOpen → Finalized
     */
    enum LotteryState {
        Pending,        // Initial state, not yet active
        CommitOpen,     // Accepting ticket commitments
        CommitClosed,   // Commit deadline passed, awaiting reveal
        RevealOpen,     // Lottery revealed, prizes claimable
        Finalized       // All prizes claimed or forfeited
    }

    // ============ Structs ============

    /**
     * @notice Core lottery data structure
     * @dev Stores all lottery configuration and state
     */
    struct Lottery {
        address creator;                    // Address that created the lottery
        bytes32 creatorCommitment;          // Hash of creator's secret for randomness
        uint256 totalPrizePool;             // Total USDC in prize pool (6 decimals)
        uint256[] prizeValues;              // Individual prize amounts in USDC (6 decimals)
        bytes32[] ticketSecretHashes;       // Hashes of ticket secrets for verification
        uint256 commitDeadline;             // Timestamp when commit period ends
        uint256 revealTime;                 // Timestamp when lottery can be revealed
        uint256 claimDeadline;              // Timestamp when claim period ends (24h after reveal)
        uint256 randomSeed;                 // Generated random seed after reveal
        LotteryState state;                 // Current state of the lottery
        uint256 createdAt;                  // Timestamp of lottery creation
        uint256 sponsoredGasPool;           // Optional: USDC allocated for sponsored commits
        uint256 sponsoredGasUsed;           // Track gas usage from sponsored pool
    }

    /**
     * @notice Ticket commitment and redemption tracking
     * @dev Tracks individual ticket state throughout lottery lifecycle
     */
    struct TicketCommitment {
        address holder;                     // Address that committed this ticket
        bool committed;                     // Whether ticket was committed before deadline
        bool redeemed;                      // Whether prize has been claimed
        uint256 prizeAmount;                // Assigned prize amount in USDC (6 decimals)
    }

    // ============ State Variables ============

    /// @notice Counter for generating unique lottery IDs
    uint256 public lotteryCounter;

    /// @notice Mapping from lottery ID to lottery data
    mapping(uint256 => Lottery) public lotteries;

    /// @notice Mapping from lottery ID to ticket index to ticket commitment
    /// @dev lotteryId => ticketIndex => TicketCommitment
    mapping(uint256 => mapping(uint256 => TicketCommitment)) public tickets;

    /// @notice Mapping from lottery ID to rollover pool for forfeited prizes
    /// @dev Stores unclaimed prizes to be added to future lotteries
    mapping(uint256 => uint256) public lotteryRolloverPool;

    // ============ Constructor ============

    constructor() {
        // Initialize lottery counter to 1 (0 reserved for invalid/uninitialized)
        lotteryCounter = 1;
    }
}
