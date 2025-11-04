// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

/**
 * @title LotteryFactory
 * @notice A decentralized lottery system using commit-reveal pattern for fairness
 * @dev Implements time-locked mystery lotteries with prize cascade and gasless claiming
 */
contract LotteryFactory is ReentrancyGuard {
    // ============ Constants ============
    
    /// @notice USDC token address on Arc testnet
    address public constant USDC = 0xb764428a29EAEbe8e2301F5924746F818b331F5A;
    
    // ============ Enums ============

    /**
     * @notice Lottery lifecycle states
     * @dev State transitions: Pending → CommitOpen → RevealOpen → Finalized
     */
    enum LotteryState {
        Pending, // Initial state, not yet active
        CommitOpen, // Accepting ticket commitments
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

    /// @notice Thrown when ticket index is out of bounds
    error InvalidTicketIndex();

    /// @notice Thrown when ticket has already been committed
    error TicketAlreadyCommitted();

    /// @notice Thrown when lottery is not in the expected state for the operation
    error InvalidLotteryState();

    /// @notice Thrown when not enough tickets have been committed for fair randomness
    error InsufficientCommittedTickets();

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
    event TicketCommitted(uint256 indexed lotteryId, uint256 indexed ticketIndex, address holder);

    /**
     * @notice Emitted when a lottery is revealed
     * @param lotteryId Lottery identifier
     * @param randomSeed Generated random seed for prize assignment
     * @param revealedAt Timestamp of reveal
     */
    event LotteryRevealed(uint256 indexed lotteryId, uint256 randomSeed, uint256 revealedAt);

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
    event PrizesForfeited(uint256 indexed lotteryId, uint256 forfeitedAmount, uint256 processedAt);

    /**
     * @notice Emitted when a lottery is refunded due to failed reveal
     * @param lotteryId Lottery identifier
     * @param creator Address receiving the refund
     * @param amount Total amount refunded
     */
    event LotteryRefunded(uint256 indexed lotteryId, address indexed creator, uint256 amount);

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
    function getLotteryStatus(uint256 lotteryId)
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
        return (lottery.state, lottery.commitDeadline, lottery.revealTime, lottery.claimDeadline, lottery.createdAt);
    }

    /**
     * @notice Get lottery prize information
     * @dev Returns total prize pool and individual prize values
     * @param lotteryId The lottery identifier
     * @return totalPrizePool Total USDC in the prize pool
     * @return prizeValues Array of individual prize amounts
     */
    function getLotteryPrizes(uint256 lotteryId)
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
    function getLotteryCreator(uint256 lotteryId) external view returns (address creator, bytes32 creatorCommitment) {
        Lottery storage lottery = lotteries[lotteryId];
        return (lottery.creator, lottery.creatorCommitment);
    }

    /**
     * @notice Get lottery ticket information
     * @dev Returns array of ticket secret hashes
     * @param lotteryId The lottery identifier
     * @return ticketSecretHashes Array of hashes for ticket secrets
     */
    function getLotteryTickets(uint256 lotteryId) external view returns (bytes32[] memory ticketSecretHashes) {
        return lotteries[lotteryId].ticketSecretHashes;
    }

    /**
     * @notice Get lottery reveal information
     * @dev Returns random seed and current state
     * @param lotteryId The lottery identifier
     * @return randomSeed Generated random seed (0 if not revealed)
     * @return state Current state of the lottery
     */
    function getLotteryReveal(uint256 lotteryId) external view returns (uint256 randomSeed, LotteryState state) {
        Lottery storage lottery = lotteries[lotteryId];
        return (lottery.randomSeed, lottery.state);
    }

    /**
     * @notice Check if commit period is currently open
     * @dev Returns true if lottery is in CommitOpen state and before deadline
     * @param lotteryId The lottery identifier
     * @return bool True if commit period is open
     */
    function isCommitPeriodOpen(uint256 lotteryId) external view returns (bool) {
        Lottery storage lottery = lotteries[lotteryId];
        return lottery.state == LotteryState.CommitOpen && block.timestamp < lottery.commitDeadline;
    }

    /**
     * @notice Check if lottery is ready to be revealed
     * @dev Returns true if commit deadline passed and reveal time reached
     * @param lotteryId The lottery identifier
     * @return bool True if lottery can be revealed
     */
    function isRevealReady(uint256 lotteryId) external view returns (bool) {
        Lottery storage lottery = lotteries[lotteryId];
        return lottery.state == LotteryState.CommitOpen && block.timestamp >= lottery.commitDeadline
            && block.timestamp >= lottery.revealTime;
    }

    /**
     * @notice Check if claim period is currently active
     * @dev Returns true if lottery revealed and before claim deadline
     * @param lotteryId The lottery identifier
     * @return bool True if claim period is active
     */
    function isClaimPeriodActive(uint256 lotteryId) external view returns (bool) {
        Lottery storage lottery = lotteries[lotteryId];
        return lottery.state == LotteryState.RevealOpen && block.timestamp < lottery.claimDeadline;
    }

    /**
     * @notice Get available rollover pool balance from a finalized lottery
     * @dev Returns the amount of forfeited prizes available for future lotteries
     * @param lotteryId The lottery identifier
     * @return rolloverAmount Amount of ETH available in the rollover pool
     */
    function getRolloverPool(uint256 lotteryId) external view returns (uint256 rolloverAmount) {
        return lotteryRolloverPool[lotteryId];
    }

    /**
     * @notice Get total available rollover funds across all finalized lotteries
     * @dev Sums up all rollover pools to show total available for new lotteries
     * @return totalRollover Total amount of ETH available from all rollover pools
     */
    function getTotalRolloverPool() external view returns (uint256 totalRollover) {
        totalRollover = 0;
        for (uint256 i = 1; i < lotteryCounter; i++) {
            totalRollover += lotteryRolloverPool[i];
        }
        return totalRollover;
    }

    /**
     * @notice Get the number of committed tickets for a lottery
     * @dev Returns count of tickets that have been committed
     * @param lotteryId The lottery identifier
     * @return committedCount Number of committed tickets
     */
    function getCommittedCount(uint256 lotteryId) external view returns (uint256 committedCount) {
        Lottery storage lottery = lotteries[lotteryId];
        uint256 totalTickets = lottery.ticketSecretHashes.length;

        committedCount = 0;
        for (uint256 i = 0; i < totalTickets; i++) {
            if (tickets[lotteryId][i].committed) {
                committedCount++;
            }
        }
        return committedCount;
    }

    /**
     * @notice Check if lottery can be revealed now and get reason if not
     * @dev Provides detailed status for reveal readiness
     * @param lotteryId The lottery identifier
     * @return canReveal True if lottery can be revealed now
     * @return reason Human-readable reason if cannot reveal, empty string if can reveal
     */
    function canRevealNow(uint256 lotteryId) external view returns (bool canReveal, string memory reason) {
        Lottery storage lottery = lotteries[lotteryId];

        // Check state
        if (lottery.state != LotteryState.CommitOpen) {
            return (false, "Lottery not in commit phase");
        }

        // Check if commit deadline has passed
        if (block.timestamp < lottery.commitDeadline) {
            return (false, "Commit period not ended");
        }

        // Check if reveal time has arrived
        if (block.timestamp < lottery.revealTime) {
            return (false, "Reveal time not reached");
        }

        // Check minimum committed tickets
        uint256 committedCount = 0;
        uint256 totalTickets = lottery.ticketSecretHashes.length;
        for (uint256 i = 0; i < totalTickets; i++) {
            if (tickets[lotteryId][i].committed) {
                committedCount++;
            }
        }

        if (committedCount < 1) {
            return (false, "Need at least 1 committed ticket");
        }

        // All checks passed
        return (true, "Ready to reveal");
    }

    // ============ External Functions ============

    /**
     * @notice Create a new lottery with hidden prize values
     * @dev Creator must deposit total prize pool in ETH, optionally including rollover funds
     * @param _creatorCommitment Hash of creator's secret for randomness
     * @param _ticketSecretHashes Array of hashes for ticket secrets
     * @param _prizeValues Array of prize amounts in wei
     * @param _commitDeadline Timestamp when commit period ends
     * @param _revealTime Timestamp when lottery can be revealed
     * @param _rolloverLotteryId Optional: lottery ID to pull rollover funds from (0 for none)
     * @return lotteryId Unique identifier for the created lottery
     */
    function createLottery(
        bytes32 _creatorCommitment,
        bytes32[] calldata _ticketSecretHashes,
        uint256[] calldata _prizeValues,
        uint256 _commitDeadline,
        uint256 _revealTime,
        uint256 _rolloverLotteryId
    ) external payable returns (uint256 lotteryId) {
        // Validate inputs
        if (_prizeValues.length == 0) revert EmptyPrizeArray();
        if (_ticketSecretHashes.length == 0) revert EmptyTicketsArray();

        // Calculate total prize pool from prize values
        uint256 totalPrizePool = 0;
        for (uint256 i = 0; i < _prizeValues.length; i++) {
            totalPrizePool += _prizeValues[i];
        }

        // Handle rollover funds if specified
        uint256 rolloverAmount = 0;
        if (_rolloverLotteryId > 0) {
            rolloverAmount = lotteryRolloverPool[_rolloverLotteryId];
            if (rolloverAmount > 0) {
                // Add rollover to total prize pool
                totalPrizePool += rolloverAmount;
                // Clear the rollover pool
                lotteryRolloverPool[_rolloverLotteryId] = 0;
            }
        }

        // Validate prize sum matches deposited amount (excluding rollover)
        if (msg.value + rolloverAmount != totalPrizePool) {
            revert InvalidPrizeSum();
        }

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
            lotteryId, msg.sender, totalPrizePool, _ticketSecretHashes.length, _commitDeadline, _revealTime
        );
    }

    /**
     * @notice Commit a ticket to participate in the lottery
     * @dev User must commit before the deadline to be eligible for prizes
     * @param _lotteryId The lottery identifier
     * @param _ticketIndex Index of the ticket to commit
     * @param _ticketSecretHash Hash of the ticket secret for later verification
     */
    function commitTicket(uint256 _lotteryId, uint256 _ticketIndex, bytes32 _ticketSecretHash) external {
        Lottery storage lottery = lotteries[_lotteryId];

        // Verify commit deadline has not passed
        if (block.timestamp >= lottery.commitDeadline) {
            revert CommitDeadlinePassed();
        }

        // Verify ticket index is valid
        if (_ticketIndex >= lottery.ticketSecretHashes.length) {
            revert InvalidTicketIndex();
        }

        // Verify ticket secret hash matches the one stored during creation
        if (lottery.ticketSecretHashes[_ticketIndex] != _ticketSecretHash) {
            revert InvalidTicketSecret();
        }

        // Verify ticket hasn't already been committed
        if (tickets[_lotteryId][_ticketIndex].committed) {
            revert TicketAlreadyCommitted();
        }

        // Store ticket commitment with holder address
        tickets[_lotteryId][_ticketIndex] =
            TicketCommitment({holder: msg.sender, committed: true, redeemed: false, prizeAmount: 0});

        // Emit event
        emit TicketCommitted(_lotteryId, _ticketIndex, msg.sender);
    }

    /**
     * @notice Reveal the lottery and assign prizes to committed tickets
     * @dev Only callable by lottery creator after reveal time with correct secret
     * @dev Uses multi-party commit-reveal: combines creator secret with all committed ticket hashes
     * @param _lotteryId The lottery identifier
     * @param _creatorSecret The creator's secret that matches the commitment
     */
    function revealLottery(uint256 _lotteryId, bytes calldata _creatorSecret) external {
        Lottery storage lottery = lotteries[_lotteryId];

        // Verify caller is the lottery creator
        if (msg.sender != lottery.creator) {
            revert UnauthorizedCaller();
        }

        // Verify lottery is in CommitOpen state
        if (lottery.state != LotteryState.CommitOpen) {
            revert InvalidLotteryState();
        }

        // Verify commit deadline has passed
        if (block.timestamp < lottery.commitDeadline) {
            revert CommitPeriodNotClosed();
        }

        // Verify reveal time has arrived
        if (block.timestamp < lottery.revealTime) {
            revert CommitPeriodNotClosed();
        }

        // Verify creator secret matches stored commitment hash
        bytes32 secretHash = keccak256(_creatorSecret);
        if (secretHash != lottery.creatorCommitment) {
            revert InvalidCreatorSecret();
        }

        // Count committed tickets and require minimum for security
        uint256 committedCount = 0;
        uint256 totalTickets = lottery.ticketSecretHashes.length;
        for (uint256 i = 0; i < totalTickets; i++) {
            if (tickets[_lotteryId][i].committed) {
                committedCount++;
            }
        }

        // Require at least 1 committed ticket
        if (committedCount < 1) {
            revert InsufficientCommittedTickets();
        }

        // Generate random seed using multi-party commit-reveal
        // Combine creator secret with all committed ticket hashes
        bytes memory entropy = abi.encodePacked(_creatorSecret);

        for (uint256 i = 0; i < totalTickets; i++) {
            if (tickets[_lotteryId][i].committed) {
                entropy = abi.encodePacked(entropy, lottery.ticketSecretHashes[i]);
            }
        }

        lottery.randomSeed = uint256(keccak256(entropy));

        // Assign prizes to committed tickets using prize-centric algorithm
        _assignPrizes(_lotteryId);

        // Transition state to RevealOpen
        lottery.state = LotteryState.RevealOpen;

        // Set claim deadline
        lottery.claimDeadline = block.timestamp + 24 hours;

        // Emit event
        emit LotteryRevealed(_lotteryId, lottery.randomSeed, block.timestamp);
    }

    /**
     * @notice Claim a prize for a winning ticket with gasless claiming
     * @dev Gas cost is automatically deducted from prize amount
     * @param _lotteryId The lottery identifier
     * @param _ticketIndex Index of the ticket to claim
     * @param _ticketSecret The ticket secret that matches the stored hash
     */
    function claimPrize(uint256 _lotteryId, uint256 _ticketIndex, bytes calldata _ticketSecret) external nonReentrant {
        Lottery storage lottery = lotteries[_lotteryId];
        TicketCommitment storage ticket = tickets[_lotteryId][_ticketIndex];

        // Verify lottery is in RevealOpen state
        if (lottery.state != LotteryState.RevealOpen) {
            revert InvalidLotteryState();
        }

        // Verify user committed before deadline
        if (!ticket.committed) {
            revert TicketNotCommitted();
        }

        // Verify ticket secret matches stored hash
        bytes32 secretHash = keccak256(_ticketSecret);
        if (lottery.ticketSecretHashes[_ticketIndex] != secretHash) {
            revert InvalidTicketSecret();
        }

        // Verify ticket has not been redeemed
        if (ticket.redeemed) {
            revert TicketAlreadyRedeemed();
        }

        // Get gross prize amount
        uint256 grossPrize = ticket.prizeAmount;

        // Estimate gas cost in wei (native ETH on Arc)
        // Using a fixed estimate for simplicity: 50,000 gas * current gas price
        uint256 gasCost = 50000 * tx.gasprice;

        // Calculate net prize and gas refund
        uint256 netPrize;
        uint256 actualGasRefund;

        if (grossPrize > gasCost) {
            // Normal case: prize covers gas cost
            netPrize = grossPrize - gasCost;
            actualGasRefund = gasCost;
        } else {
            // Edge case: prize is less than gas cost
            // Winner gets nothing, relayer gets the full prize as partial gas refund
            netPrize = 0;
            actualGasRefund = grossPrize;
        }

        // Mark ticket as redeemed (state update before external calls)
        ticket.redeemed = true;

        // Transfer net prize to winner (if any)
        if (netPrize > 0) {
            (bool successWinner,) = payable(msg.sender).call{value: netPrize}("");
            require(successWinner, "Transfer to winner failed");
        }

        // Refund gas cost to tx.origin (relayer/caller)
        if (actualGasRefund > 0) {
            (bool successRelayer,) = payable(tx.origin).call{value: actualGasRefund}("");
            require(successRelayer, "Gas refund failed");
        }

        // Emit event with gross, net, and gas amounts
        emit PrizeClaimed(_lotteryId, _ticketIndex, msg.sender, grossPrize, netPrize, actualGasRefund);
    }

    /**
     * @notice Finalize lottery and process unclaimed prizes after claim deadline
     * @dev Can be called by anyone after claim deadline to forfeit unclaimed prizes
     * @param _lotteryId The lottery identifier
     */
    function finalizeLottery(uint256 _lotteryId) external {
        Lottery storage lottery = lotteries[_lotteryId];

        // Verify lottery is in RevealOpen state
        if (lottery.state != LotteryState.RevealOpen) {
            revert InvalidLotteryState();
        }

        // Verify claim deadline has passed
        if (block.timestamp < lottery.claimDeadline) {
            revert CommitPeriodNotClosed();
        }

        // Iterate through all tickets and identify unclaimed prizes
        uint256 totalForfeited = 0;
        uint256 totalTickets = lottery.ticketSecretHashes.length;

        for (uint256 i = 0; i < totalTickets; i++) {
            TicketCommitment storage ticket = tickets[_lotteryId][i];

            // If ticket was committed, has a prize, but wasn't redeemed
            if (ticket.committed && ticket.prizeAmount > 0 && !ticket.redeemed) {
                totalForfeited += ticket.prizeAmount;
            }
        }

        // Add forfeited prizes to rollover pool
        if (totalForfeited > 0) {
            lotteryRolloverPool[_lotteryId] += totalForfeited;
        }

        // Transition lottery state to Finalized
        lottery.state = LotteryState.Finalized;

        // Emit event with total forfeited amount
        emit PrizesForfeited(_lotteryId, totalForfeited, block.timestamp);
    }

    /**
     * @notice Refund lottery prize pool to creator if reveal fails
     * @dev Can be called by anyone if creator fails to reveal within 24 hours of reveal time
     * @param _lotteryId The lottery identifier
     */
    function refundLottery(uint256 _lotteryId) external {
        Lottery storage lottery = lotteries[_lotteryId];

        // Verify lottery is in CommitOpen state (not revealed)
        if (lottery.state != LotteryState.CommitOpen) {
            revert InvalidLotteryState();
        }

        // Verify commit deadline has passed (lottery should have been revealed)
        if (block.timestamp <= lottery.commitDeadline) {
            revert CommitPeriodNotClosed();
        }

        // Verify 24 hours have passed since reveal time (strictly greater than)
        if (block.timestamp <= lottery.revealTime + 24 hours) {
            revert CommitPeriodNotClosed();
        }

        // Get total prize pool to refund
        uint256 refundAmount = lottery.totalPrizePool;
        address creator = lottery.creator;

        // Transition lottery state to Finalized
        lottery.state = LotteryState.Finalized;

        // Transfer total prize pool back to creator
        (bool success,) = payable(creator).call{value: refundAmount}("");
        require(success, "Refund transfer failed");

        // Emit event
        emit LotteryRefunded(_lotteryId, creator, refundAmount);
    }

    // ============ Internal Functions ============

    /**
     * @notice Assign prizes to committed tickets using prize-centric algorithm
     * @param _lotteryId The lottery identifier
     */
    function _assignPrizes(uint256 _lotteryId) internal {
        Lottery storage lottery = lotteries[_lotteryId];

        // Build memory array of committed ticket indices
        uint256[] memory committedTickets = _getCommittedTickets(_lotteryId);
        uint256 remainingTickets = committedTickets.length;

        // For each prize, randomly select from remaining committed tickets
        for (uint256 prizeIdx = 0; prizeIdx < lottery.prizeValues.length; prizeIdx++) {
            // If no more committed tickets, remaining prizes go to rollover pool
            if (remainingTickets == 0) {
                lotteryRolloverPool[_lotteryId] += lottery.prizeValues[prizeIdx];
                continue;
            }

            // Generate random index for this prize using seed and prize index
            uint256 randomValue = uint256(keccak256(abi.encodePacked(lottery.randomSeed, prizeIdx)));
            uint256 winnerIndex = randomValue % remainingTickets;
            uint256 winningTicket = committedTickets[winnerIndex];

            // Assign prize to the winning ticket
            tickets[_lotteryId][winningTicket].prizeAmount = lottery.prizeValues[prizeIdx];

            // Remove winner from pool (swap with last element, reduce length)
            committedTickets[winnerIndex] = committedTickets[remainingTickets - 1];
            remainingTickets--;
        }
    }

    /**
     * @notice Get array of committed ticket indices
     * @dev Helper function to build list of tickets that committed before deadline
     * @param _lotteryId The lottery identifier
     * @return committedTickets Array of ticket indices that were committed
     */
    function _getCommittedTickets(uint256 _lotteryId) internal view returns (uint256[] memory committedTickets) {
        Lottery storage lottery = lotteries[_lotteryId];
        uint256 totalTickets = lottery.ticketSecretHashes.length;

        // First pass: count committed tickets
        uint256 committedCount = 0;
        for (uint256 i = 0; i < totalTickets; i++) {
            if (tickets[_lotteryId][i].committed) {
                committedCount++;
            }
        }

        // Allocate array with exact size
        committedTickets = new uint256[](committedCount);

        // Second pass: populate array with committed ticket indices
        uint256 index = 0;
        for (uint256 i = 0; i < totalTickets; i++) {
            if (tickets[_lotteryId][i].committed) {
                committedTickets[index] = i;
                index++;
            }
        }

        return committedTickets;
    }
}
