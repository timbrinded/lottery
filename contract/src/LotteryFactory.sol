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
        Pending, // Initial state, not yet active
        CommitOpen, // Accepting ticket commitments
        CommitClosed, // Commit deadline passed, awaiting reveal
        RevealOpen, // Lottery revealed, prizes claimable
        Finalized // All prizes claimed or forfeited
    }

    // ============ Structs ============

    /**
     * @notice Core lottery data structure
     * @dev Stores all lottery configuration and state
     */
    struct Lottery {
        address creator; // Address that created the lottery
        bytes32 creatorCommitment; // Hash of creator's secret for randomness
        uint256 totalPrizePool; // Total USDC in prize pool (6 decimals)
        uint256[] prizeValues; // Individual prize amounts in USDC (6 decimals)
        bytes32[] ticketSecretHashes; // Hashes of ticket secrets for verification
        uint256 commitDeadline; // Timestamp when commit period ends
        uint256 revealTime; // Timestamp when lottery can be revealed
        uint256 claimDeadline; // Timestamp when claim period ends (24h after reveal)
        uint256 randomSeed; // Generated random seed after reveal
        LotteryState state; // Current state of the lottery
        uint256 createdAt; // Timestamp of lottery creation
        uint256 sponsoredGasPool; // Optional: USDC allocated for sponsored commits
        uint256 sponsoredGasUsed; // Track gas usage from sponsored pool
    }

    /**
     * @notice Ticket commitment and redemption tracking
     * @dev Tracks individual ticket state throughout lottery lifecycle
     */
    struct TicketCommitment {
        address holder; // Address that committed this ticket
        bool committed; // Whether ticket was committed before deadline
        bool redeemed; // Whether prize has been claimed
        uint256 prizeAmount; // Assigned prize amount in USDC (6 decimals)
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

    // ============ Custom Errors ============

    /// @notice Thrown when prize values don't sum to total prize pool
    error InvalidPrizeSum();

    /// @notice Thrown when deadlines are not in correct order (commit < reveal < claim)
    error InvalidDeadlines();

    /// @notice Thrown when array lengths don't match (tickets vs secret hashes)
    error ArrayLengthMismatch();

    /// @notice Thrown when commit deadline has passed
    error CommitDeadlinePassed();

    /// @notice Thrown when commit period is not yet closed
    error CommitPeriodNotClosed();

    /// @notice Thrown when creator secret doesn't match commitment
    error InvalidCreatorSecret();

    /// @notice Thrown when ticket was not committed before deadline
    error TicketNotCommitted();

    /// @notice Thrown when ticket has already been redeemed
    error TicketAlreadyRedeemed();

    /// @notice Thrown when ticket secret doesn't match stored hash
    error InvalidTicketSecret();

    /// @notice Thrown when claim deadline has passed
    error ClaimDeadlinePassed();

    /// @notice Thrown when prize pool is insufficient
    error InsufficientPrizePool();

    /// @notice Thrown when caller is not authorized for the action
    error UnauthorizedCaller();

    /// @notice Thrown when prize values array is empty
    error EmptyPrizeArray();

    /// @notice Thrown when ticket secret hashes array is empty
    error EmptyTicketsArray();

    // ============ Events ============

    /**
     * @notice Emitted when a new lottery is created
     * @param lotteryId Unique identifier for the lottery
     * @param creator Address that created the lottery
     * @param totalPrizePool Total USDC in the prize pool
     * @param numberOfTickets Number of tickets in the lottery
     * @param commitDeadline Timestamp when commit period ends
     * @param revealTime Timestamp when lottery can be revealed
     */
    event LotteryCreated(
        uint256 indexed lotteryId,
        address indexed creator,
        uint256 totalPrizePool,
        uint256 numberOfTickets,
        uint256 commitDeadline,
        uint256 revealTime
    );

    /**
     * @notice Emitted when a ticket is committed
     * @param lotteryId Lottery identifier
     * @param ticketIndex Index of the committed ticket
     * @param holder Address that committed the ticket
     */
    event TicketCommitted(
        uint256 indexed lotteryId,
        uint256 indexed ticketIndex,
        address holder
    );

    /**
     * @notice Emitted when a lottery is revealed
     * @param lotteryId Lottery identifier
     * @param randomSeed Generated random seed for prize assignment
     * @param revealedAt Timestamp of reveal
     */
    event LotteryRevealed(
        uint256 indexed lotteryId,
        uint256 randomSeed,
        uint256 revealedAt
    );

    /**
     * @notice Emitted when a prize is claimed
     * @param lotteryId Lottery identifier
     * @param ticketIndex Index of the ticket
     * @param winner Address that claimed the prize
     * @param grossPrize Prize amount before gas deduction
     * @param netPrize Prize amount after gas deduction
     * @param gasCost Gas cost deducted from prize
     */
    event PrizeClaimed(
        uint256 indexed lotteryId,
        uint256 indexed ticketIndex,
        address winner,
        uint256 grossPrize,
        uint256 netPrize,
        uint256 gasCost
    );

    /**
     * @notice Emitted when prizes are forfeited and rolled over
     * @param lotteryId Lottery identifier
     * @param forfeitedAmount Total amount of forfeited prizes
     * @param processedAt Timestamp of forfeiture processing
     */
    event PrizesForfeited(
        uint256 indexed lotteryId,
        uint256 forfeitedAmount,
        uint256 processedAt
    );

    // ============ Constructor ============

    constructor() {
        // Initialize lottery counter to 1 (0 reserved for invalid/uninitialized)
        lotteryCounter = 1;
    }

    // ============ View Functions ============

    /**
     * @notice Get lottery status and timing information
     * @dev Returns state and all deadline timestamps
     * @param lotteryId The lottery identifier
     * @return state Current state of the lottery
     * @return commitDeadline Timestamp when commit period ends
     * @return revealTime Timestamp when lottery can be revealed
     * @return claimDeadline Timestamp when claim period ends
     * @return createdAt Timestamp when lottery was created
     */
    function getLotteryStatus(
        uint256 lotteryId
    )
        external
        view
        returns (
            LotteryState state,
            uint256 commitDeadline,
            uint256 revealTime,
            uint256 claimDeadline,
            uint256 createdAt
        )
    {
        Lottery storage lottery = lotteries[lotteryId];
        return (
            lottery.state,
            lottery.commitDeadline,
            lottery.revealTime,
            lottery.claimDeadline,
            lottery.createdAt
        );
    }

    /**
     * @notice Get lottery prize information
     * @dev Returns total prize pool and individual prize values
     * @param lotteryId The lottery identifier
     * @return totalPrizePool Total USDC in the prize pool
     * @return prizeValues Array of individual prize amounts
     */
    function getLotteryPrizes(
        uint256 lotteryId
    )
        external
        view
        returns (uint256 totalPrizePool, uint256[] memory prizeValues)
    {
        Lottery storage lottery = lotteries[lotteryId];
        return (lottery.totalPrizePool, lottery.prizeValues);
    }

    /**
     * @notice Get lottery creator information
     * @dev Returns creator address and commitment hash
     * @param lotteryId The lottery identifier
     * @return creator Address that created the lottery
     * @return creatorCommitment Hash of creator's secret
     */
    function getLotteryCreator(
        uint256 lotteryId
    ) external view returns (address creator, bytes32 creatorCommitment) {
        Lottery storage lottery = lotteries[lotteryId];
        return (lottery.creator, lottery.creatorCommitment);
    }

    /**
     * @notice Get lottery ticket information
     * @dev Returns array of ticket secret hashes
     * @param lotteryId The lottery identifier
     * @return ticketSecretHashes Array of hashes for ticket secrets
     */
    function getLotteryTickets(
        uint256 lotteryId
    ) external view returns (bytes32[] memory ticketSecretHashes) {
        return lotteries[lotteryId].ticketSecretHashes;
    }

    /**
     * @notice Get lottery reveal information
     * @dev Returns random seed and current state
     * @param lotteryId The lottery identifier
     * @return randomSeed Generated random seed (0 if not revealed)
     * @return state Current state of the lottery
     */
    function getLotteryReveal(
        uint256 lotteryId
    ) external view returns (uint256 randomSeed, LotteryState state) {
        Lottery storage lottery = lotteries[lotteryId];
        return (lottery.randomSeed, lottery.state);
    }

    /**
     * @notice Check if commit period is currently open
     * @dev Returns true if lottery is in CommitOpen state and before deadline
     * @param lotteryId The lottery identifier
     * @return bool True if commit period is open
     */
    function isCommitPeriodOpen(
        uint256 lotteryId
    ) external view returns (bool) {
        Lottery storage lottery = lotteries[lotteryId];
        return
            lottery.state == LotteryState.CommitOpen &&
            block.timestamp < lottery.commitDeadline;
    }

    /**
     * @notice Check if lottery is ready to be revealed
     * @dev Returns true if commit period closed and reveal time reached
     * @param lotteryId The lottery identifier
     * @return bool True if lottery can be revealed
     */
    function isRevealReady(uint256 lotteryId) external view returns (bool) {
        Lottery storage lottery = lotteries[lotteryId];
        return
            lottery.state == LotteryState.CommitClosed &&
            block.timestamp >= lottery.revealTime;
    }

    /**
     * @notice Check if claim period is currently active
     * @dev Returns true if lottery revealed and before claim deadline
     * @param lotteryId The lottery identifier
     * @return bool True if claim period is active
     */
    function isClaimPeriodActive(
        uint256 lotteryId
    ) external view returns (bool) {
        Lottery storage lottery = lotteries[lotteryId];
        return
            lottery.state == LotteryState.RevealOpen &&
            block.timestamp < lottery.claimDeadline;
    }

    // ============ External Functions ============

    /**
     * @notice Create a new lottery with hidden prize values
     * @dev Creator must deposit total prize pool in USDC
     * @param _creatorCommitment Hash of creator's secret for randomness
     * @param _ticketSecretHashes Array of hashes for ticket secrets
     * @param _prizeValues Array of prize amounts in USDC (6 decimals)
     * @param _commitDeadline Timestamp when commit period ends
     * @param _revealTime Timestamp when lottery can be revealed
     * @return lotteryId Unique identifier for the created lottery
     */
    function createLottery(
        bytes32 _creatorCommitment,
        bytes32[] calldata _ticketSecretHashes,
        uint256[] calldata _prizeValues,
        uint256 _commitDeadline,
        uint256 _revealTime
    ) external payable returns (uint256 lotteryId) {
        // Validate inputs
        if (_prizeValues.length == 0) revert EmptyPrizeArray();
        if (_ticketSecretHashes.length == 0) revert EmptyTicketsArray();
        if (_prizeValues.length != _ticketSecretHashes.length) {
            revert ArrayLengthMismatch();
        }

        // Calculate total prize pool from prize values
        uint256 totalPrizePool = 0;
        for (uint256 i = 0; i < _prizeValues.length; i++) {
            totalPrizePool += _prizeValues[i];
        }

        // Validate prize sum matches deposited amount
        if (msg.value != totalPrizePool) revert InvalidPrizeSum();

        // Validate deadlines are in correct order
        // commit < reveal < claim (claim is reveal + 24 hours)
        if (_commitDeadline >= _revealTime) revert InvalidDeadlines();
        uint256 claimDeadline = _revealTime + 24 hours;

        // Generate unique lottery ID and increment counter
        lotteryId = lotteryCounter;
        lotteryCounter++;

        // Store lottery data
        Lottery storage lottery = lotteries[lotteryId];
        lottery.creator = msg.sender;
        lottery.creatorCommitment = _creatorCommitment;
        lottery.totalPrizePool = totalPrizePool;
        lottery.prizeValues = _prizeValues;
        lottery.ticketSecretHashes = _ticketSecretHashes;
        lottery.commitDeadline = _commitDeadline;
        lottery.revealTime = _revealTime;
        lottery.claimDeadline = claimDeadline;
        lottery.state = LotteryState.CommitOpen;
        lottery.createdAt = block.timestamp;
        lottery.sponsoredGasPool = 0;
        lottery.sponsoredGasUsed = 0;

        // Emit event
        emit LotteryCreated(
            lotteryId,
            msg.sender,
            totalPrizePool,
            _ticketSecretHashes.length,
            _commitDeadline,
            _revealTime
        );
    }
}
