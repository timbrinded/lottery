// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {LotteryFactory} from "../src/LotteryFactory.sol";

/**
 * @title LotteryFactoryTest
 * @notice Tests for LotteryFactory data structures and state management
 */
contract LotteryFactoryTest is Test {
    LotteryFactory public factory;

    // Events for testing
    event LotteryRevealed(uint256 indexed lotteryId, uint256 randomSeed, uint256 revealedAt);

    event PrizeClaimed(
        uint256 indexed lotteryId,
        uint256 indexed ticketIndex,
        address winner,
        uint256 grossPrize,
        uint256 netPrize,
        uint256 gasCost
    );

    function setUp() public {
        factory = new LotteryFactory();
    }

    // ============ Constructor Tests ============

    function test_Constructor_InitializesLotteryCounter() public view {
        assertEq(factory.lotteryCounter(), 1, "Lottery counter should start at 1");
    }

    // ============ State Variable Tests ============

    function test_LotteryCounter_StartsAtOne() public view {
        uint256 counter = factory.lotteryCounter();
        assertEq(counter, 1, "Counter should be initialized to 1");
    }

    function test_LotteryRolloverPool_InitiallyZero() public view {
        uint256 rollover = factory.lotteryRolloverPool(1);
        assertEq(rollover, 0, "Rollover pool should be 0 for non-existent lottery");
    }

    // ============ Struct and Enum Tests ============

    function test_LotteryState_EnumValues() public pure {
        // Verify enum values are correctly ordered
        assertEq(uint8(LotteryFactory.LotteryState.Pending), 0);
        assertEq(uint8(LotteryFactory.LotteryState.CommitOpen), 1);
        assertEq(uint8(LotteryFactory.LotteryState.RevealOpen), 2);
        assertEq(uint8(LotteryFactory.LotteryState.Finalized), 3);
    }

    // ============ Storage Mapping Tests ============

    function test_Lotteries_Mapping_DefaultValues() public view {
        // Access non-existent lottery - public mapping returns individual fields, not arrays
        (
            address creator,
            bytes32 creatorCommitment,
            uint256 totalPrizePool,
            uint256 commitDeadline,
            uint256 revealTime,
            uint256 claimDeadline,
            uint256 randomSeed,
            LotteryFactory.LotteryState state,
            uint256 createdAt,
            uint256 sponsoredGasPool,
            uint256 sponsoredGasUsed
        ) = factory.lotteries(999);

        // Verify default values
        assertEq(creator, address(0), "Default creator should be zero address");
        assertEq(creatorCommitment, bytes32(0), "Default commitment should be zero");
        assertEq(totalPrizePool, 0, "Default prize pool should be 0");
        assertEq(commitDeadline, 0, "Default commit deadline should be 0");
        assertEq(revealTime, 0, "Default reveal time should be 0");
        assertEq(claimDeadline, 0, "Default claim deadline should be 0");
        assertEq(randomSeed, 0, "Default random seed should be 0");
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.Pending), "Default state should be Pending");
        assertEq(createdAt, 0, "Default created at should be 0");
        assertEq(sponsoredGasPool, 0, "Default sponsored gas pool should be 0");
        assertEq(sponsoredGasUsed, 0, "Default sponsored gas used should be 0");
    }

    function test_Tickets_Mapping_DefaultValues() public view {
        // Access non-existent ticket
        (address holder, bool committed, bool redeemed, uint256 prizeAmount) = factory.tickets(999, 0);

        // Verify default values
        assertEq(holder, address(0), "Default holder should be zero address");
        assertFalse(committed, "Default committed should be false");
        assertFalse(redeemed, "Default redeemed should be false");
        assertEq(prizeAmount, 0, "Default prize amount should be 0");
    }

    // ============ Fuzz Tests ============

    function testFuzz_LotteryRolloverPool_ReturnsZeroForAnyId(uint256 lotteryId) public view {
        uint256 rollover = factory.lotteryRolloverPool(lotteryId);
        assertEq(rollover, 0, "Rollover pool should be 0 for any uninitialized lottery");
    }

    function testFuzz_Tickets_DefaultValuesForAnyIndex(uint256 lotteryId, uint256 ticketIndex) public view {
        (address holder, bool committed, bool redeemed, uint256 prizeAmount) = factory.tickets(lotteryId, ticketIndex);

        assertEq(holder, address(0), "Holder should be zero address");
        assertFalse(committed, "Committed should be false");
        assertFalse(redeemed, "Redeemed should be false");
        assertEq(prizeAmount, 0, "Prize amount should be 0");
    }

    // ============ CreateLottery Tests ============

    function test_CreateLottery_Success() public {
        // Setup test data
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 100e6; // 100 USDC
        prizeValues[1] = 50e6; // 50 USDC
        prizeValues[2] = 25e6; // 25 USDC

        uint256 totalPrize = 175e6; // 175 USDC total
        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        // Create lottery
        uint256 lotteryId = factory.createLottery{value: totalPrize}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Verify lottery ID and counter
        assertEq(lotteryId, 1, "First lottery should have ID 1");
        assertEq(factory.lotteryCounter(), 2, "Counter should increment to 2");

        // Verify lottery data in separate calls to avoid stack too deep
        (address creator, bytes32 storedCommitment, uint256 storedPrizePool,,,,,,,,) = factory.lotteries(lotteryId);

        assertEq(creator, address(this), "Creator should be test contract");
        assertEq(storedCommitment, creatorCommitment, "Commitment should match");
        assertEq(storedPrizePool, totalPrize, "Prize pool should match");
    }

    function test_CreateLottery_VerifiesDeadlines() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");

        uint256[] memory prizeValues = new uint256[](2);
        prizeValues[0] = 60e6;
        prizeValues[1] = 40e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 100e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        (
            ,
            ,
            ,
            uint256 storedCommitDeadline,
            uint256 storedRevealTime,
            uint256 storedClaimDeadline,
            ,
            LotteryFactory.LotteryState state,
            uint256 createdAt,
            ,
        ) = factory.lotteries(lotteryId);

        assertEq(storedCommitDeadline, commitDeadline, "Commit deadline should match");
        assertEq(storedRevealTime, revealTime, "Reveal time should match");
        assertEq(storedClaimDeadline, revealTime + 24 hours, "Claim deadline should be reveal + 24h");
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.CommitOpen), "State should be CommitOpen");
        assertEq(createdAt, block.timestamp, "Created at should be current timestamp");
    }

    function test_CreateLottery_EmitsEvent() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");

        uint256[] memory prizeValues = new uint256[](2);
        prizeValues[0] = 60e6;
        prizeValues[1] = 40e6;

        uint256 totalPrize = 100e6;
        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        // Expect event emission
        vm.expectEmit(true, true, false, true);
        emit LotteryCreated(1, address(this), totalPrize, 2, commitDeadline, revealTime);

        factory.createLottery{value: totalPrize}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );
    }

    // Event declaration for testing
    event LotteryCreated(
        uint256 indexed lotteryId,
        address indexed creator,
        uint256 totalPrizePool,
        uint256 numberOfTickets,
        uint256 commitDeadline,
        uint256 revealTime
    );

    function test_CreateLottery_RevertsOnEmptyPrizeArray() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](0); // Empty array

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        vm.expectRevert(LotteryFactory.EmptyPrizeArray.selector);
        factory.createLottery{value: 0}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );
    }

    function test_CreateLottery_RevertsOnEmptyTicketsArray() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](0); // Empty array

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 100e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        vm.expectRevert(LotteryFactory.EmptyTicketsArray.selector);
        factory.createLottery{value: 100e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );
    }

    function test_CreateLottery_RevertsOnInvalidPrizeSum() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");

        uint256[] memory prizeValues = new uint256[](2);
        prizeValues[0] = 60e6;
        prizeValues[1] = 40e6;
        // Total is 100 USDC but sending 90 USDC

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        vm.expectRevert(LotteryFactory.InvalidPrizeSum.selector);
        factory.createLottery{value: 90e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );
    }

    function test_CreateLottery_RevertsOnInvalidDeadlines() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");

        uint256[] memory prizeValues = new uint256[](2);
        prizeValues[0] = 60e6;
        prizeValues[1] = 40e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours; // Reveal before commit!

        vm.expectRevert(LotteryFactory.InvalidDeadlines.selector);
        factory.createLottery{value: 100e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );
    }

    function test_CreateLottery_RevertsOnEqualDeadlines() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");

        uint256[] memory prizeValues = new uint256[](2);
        prizeValues[0] = 60e6;
        prizeValues[1] = 40e6;

        uint256 deadline = block.timestamp + 1 hours;

        vm.expectRevert(LotteryFactory.InvalidDeadlines.selector);
        factory.createLottery{value: 100e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            deadline,
            deadline, // Same as commit deadline
            0
        );
    }

    function test_CreateLottery_MultipleSequential() public {
        bytes32 commitment1 = keccak256("secret1");
        bytes32[] memory tickets1 = new bytes32[](1);
        tickets1[0] = keccak256("ticket1");
        uint256[] memory prizes1 = new uint256[](1);
        prizes1[0] = 50e6;

        bytes32 commitment2 = keccak256("secret2");
        bytes32[] memory tickets2 = new bytes32[](2);
        tickets2[0] = keccak256("ticket2_0");
        tickets2[1] = keccak256("ticket2_1");
        uint256[] memory prizes2 = new uint256[](2);
        prizes2[0] = 30e6;
        prizes2[1] = 20e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        // Create first lottery
        uint256 id1 = factory.createLottery{value: 50e6}(commitment1, tickets1, prizes1, commitDeadline, revealTime, 0);

        // Create second lottery
        uint256 id2 = factory.createLottery{value: 50e6}(commitment2, tickets2, prizes2, commitDeadline, revealTime, 0);

        assertEq(id1, 1, "First lottery ID should be 1");
        assertEq(id2, 2, "Second lottery ID should be 2");
        assertEq(factory.lotteryCounter(), 3, "Counter should be 3");
    }

    function testFuzz_CreateLottery_ValidInputs(uint8 numTickets, uint256 totalPrize, uint256 timeOffset) public {
        // Bound inputs to reasonable ranges
        numTickets = uint8(bound(numTickets, 1, 100));
        totalPrize = bound(totalPrize, uint256(numTickets) * 1e6, 1_000_000e6); // Min 1 USDC per ticket, max 1M USDC
        timeOffset = bound(timeOffset, 10 minutes, 35 minutes); // Must be within blockhash window (40 min limit)

        // Setup arrays
        bytes32[] memory ticketSecretHashes = new bytes32[](numTickets);
        uint256[] memory prizeValues = new uint256[](numTickets);

        // Distribute prizes evenly
        uint256 prizePerTicket = totalPrize / numTickets;
        uint256 remainder = totalPrize % numTickets;

        for (uint256 i = 0; i < numTickets; i++) {
            ticketSecretHashes[i] = keccak256(abi.encodePacked("ticket", i));
            prizeValues[i] = prizePerTicket;
        }
        // Add remainder to first prize
        prizeValues[0] += remainder;

        bytes32 creatorCommitment = keccak256("fuzz_secret");
        uint256 commitDeadline = block.timestamp + (timeOffset / 2);
        uint256 revealTime = block.timestamp + timeOffset;

        // Should succeed
        uint256 lotteryId = factory.createLottery{value: totalPrize}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        assertEq(lotteryId, 1, "Lottery ID should be 1");

        // Verify stored data
        (address creator,, uint256 storedPrizePool,,,,, LotteryFactory.LotteryState state,,,) =
            factory.lotteries(lotteryId);

        assertEq(creator, address(this), "Creator should match");
        assertEq(storedPrizePool, totalPrize, "Prize pool should match");
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.CommitOpen), "State should be CommitOpen");
    }

    // ============ Accessor Function Tests ============

    function test_GetLotteryStatus() public {
        // Create lottery
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");

        uint256[] memory prizeValues = new uint256[](2);
        prizeValues[0] = 60e6;
        prizeValues[1] = 40e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 100e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Test accessor
        (
            LotteryFactory.LotteryState state,
            uint256 returnedCommitDeadline,
            uint256 returnedRevealTime,
            uint256 returnedClaimDeadline,
            uint256 returnedCreatedAt
        ) = factory.getLotteryStatus(lotteryId);

        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.CommitOpen), "State should be CommitOpen");
        assertEq(returnedCommitDeadline, commitDeadline, "Commit deadline should match");
        assertEq(returnedRevealTime, revealTime, "Reveal time should match");
        assertEq(returnedClaimDeadline, revealTime + 24 hours, "Claim deadline should be reveal + 24h");
        assertEq(returnedCreatedAt, block.timestamp, "Created at should match");
    }

    function test_GetLotteryPrizes() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 100e6;
        prizeValues[1] = 50e6;
        prizeValues[2] = 25e6;

        uint256 totalPrize = 175e6;

        uint256 lotteryId = factory.createLottery{value: totalPrize}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        // Test accessor
        (uint256 returnedTotal, uint256[] memory returnedPrizes) = factory.getLotteryPrizes(lotteryId);

        assertEq(returnedTotal, totalPrize, "Total prize should match");
        assertEq(returnedPrizes.length, 3, "Should have 3 prizes");
        assertEq(returnedPrizes[0], 100e6, "Prize 0 should match");
        assertEq(returnedPrizes[1], 50e6, "Prize 1 should match");
        assertEq(returnedPrizes[2], 25e6, "Prize 2 should match");
    }

    function test_GetLotteryCreator() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 50e6;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        // Test accessor
        (address returnedCreator, bytes32 returnedCommitment) = factory.getLotteryCreator(lotteryId);

        assertEq(returnedCreator, address(this), "Creator should match");
        assertEq(returnedCommitment, creatorCommitment, "Commitment should match");
    }

    function test_GetLotteryTickets() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 50e6;
        prizeValues[1] = 30e6;
        prizeValues[2] = 20e6;

        uint256 lotteryId = factory.createLottery{value: 100e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        // Test accessor
        bytes32[] memory returnedTickets = factory.getLotteryTickets(lotteryId);

        assertEq(returnedTickets.length, 3, "Should have 3 tickets");
        assertEq(returnedTickets[0], ticketSecretHashes[0], "Ticket 0 should match");
        assertEq(returnedTickets[1], ticketSecretHashes[1], "Ticket 1 should match");
        assertEq(returnedTickets[2], ticketSecretHashes[2], "Ticket 2 should match");
    }

    function test_GetLotteryReveal() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 50e6;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        // Test accessor (before reveal)
        (uint256 randomSeed, LotteryFactory.LotteryState state) = factory.getLotteryReveal(lotteryId);

        assertEq(randomSeed, 0, "Random seed should be 0 before reveal");
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.CommitOpen), "State should be CommitOpen");
    }

    function test_IsCommitPeriodOpen() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 50e6;

        uint256 commitDeadline = block.timestamp + 1 hours;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            commitDeadline,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        // Should be open initially
        assertTrue(factory.isCommitPeriodOpen(lotteryId), "Commit period should be open");

        // Warp past deadline
        vm.warp(commitDeadline + 1);
        assertFalse(factory.isCommitPeriodOpen(lotteryId), "Commit period should be closed after deadline");
    }

    function test_IsRevealReady() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 50e6;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        // Should not be ready initially (still in CommitOpen state)
        assertFalse(factory.isRevealReady(lotteryId), "Should not be ready in CommitOpen state");
    }

    function test_IsClaimPeriodActive() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 50e6;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        // Should not be active initially (not revealed yet)
        assertFalse(factory.isClaimPeriodActive(lotteryId), "Should not be active before reveal");
    }

    // ============ CommitTicket Tests ============

    event TicketCommitted(uint256 indexed lotteryId, uint256 indexed ticketIndex, address holder);

    function test_CommitTicket_Success() public {
        // Create lottery
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32 ticketSecret = bytes32("ticket_secret_0");
        bytes32 ticketSecretHash = keccak256(abi.encodePacked(ticketSecret));

        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = ticketSecretHash;
        ticketSecretHashes[1] = keccak256("ticket_1");

        uint256[] memory prizeValues = new uint256[](2);
        prizeValues[0] = 60e6;
        prizeValues[1] = 40e6;

        uint256 commitDeadline = block.timestamp + 1 hours;

        uint256 lotteryId = factory.createLottery{value: 100e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            commitDeadline,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        // Commit ticket as different user
        address user = address(0x123);
        vm.prank(user);
        factory.commitTicket(lotteryId, 0, ticketSecretHash);

        // Verify ticket commitment
        (address holder, bool committed, bool redeemed, uint256 prizeAmount) = factory.tickets(lotteryId, 0);

        assertEq(holder, user, "Holder should be user");
        assertTrue(committed, "Ticket should be committed");
        assertFalse(redeemed, "Ticket should not be redeemed");
        assertEq(prizeAmount, 0, "Prize amount should be 0 before reveal");
    }

    function test_CommitTicket_EmitsEvent() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32 ticketSecretHash = keccak256("ticket_0");

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = ticketSecretHash;

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 50e6;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        address user = address(0x456);

        // Expect event emission
        vm.expectEmit(true, true, false, true);
        emit TicketCommitted(lotteryId, 0, user);

        vm.prank(user);
        factory.commitTicket(lotteryId, 0, ticketSecretHash);
    }

    function test_CommitTicket_RevertsAfterDeadline() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32 ticketSecretHash = keccak256("ticket_0");

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = ticketSecretHash;

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 50e6;

        uint256 commitDeadline = block.timestamp + 1 hours;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            commitDeadline,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        // Warp past deadline
        vm.warp(commitDeadline + 1);

        // Should revert
        vm.expectRevert(LotteryFactory.CommitDeadlinePassed.selector);
        factory.commitTicket(lotteryId, 0, ticketSecretHash);
    }

    function test_CommitTicket_RevertsOnInvalidTicketIndex() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32 ticketSecretHash = keccak256("ticket_0");

        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = ticketSecretHash;
        ticketSecretHashes[1] = keccak256("ticket_1");

        uint256[] memory prizeValues = new uint256[](2);
        prizeValues[0] = 60e6;
        prizeValues[1] = 40e6;

        uint256 lotteryId = factory.createLottery{value: 100e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        // Try to commit with invalid index (out of bounds)
        vm.expectRevert(LotteryFactory.InvalidTicketIndex.selector);
        factory.commitTicket(lotteryId, 5, ticketSecretHash);
    }

    function test_CommitTicket_RevertsOnInvalidSecret() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32 ticketSecretHash = keccak256("ticket_0");
        bytes32 wrongSecretHash = keccak256("wrong_secret");

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = ticketSecretHash;

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 50e6;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        // Try to commit with wrong secret hash
        vm.expectRevert(LotteryFactory.InvalidTicketSecret.selector);
        factory.commitTicket(lotteryId, 0, wrongSecretHash);
    }

    function test_CommitTicket_RevertsOnDoubleCommit() public {
        bytes32 creatorCommitment = keccak256("creator_secret");
        bytes32 ticketSecretHash = keccak256("ticket_0");

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = ticketSecretHash;

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 50e6;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        address user = address(0x789);

        // First commit should succeed
        vm.prank(user);
        factory.commitTicket(lotteryId, 0, ticketSecretHash);

        // Second commit should revert
        vm.prank(user);
        vm.expectRevert(LotteryFactory.TicketAlreadyCommitted.selector);
        factory.commitTicket(lotteryId, 0, ticketSecretHash);
    }

    function test_CommitTicket_MultipleTickets() public {
        bytes32 creatorCommitment = keccak256("creator_secret");

        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 50e6;
        prizeValues[1] = 30e6;
        prizeValues[2] = 20e6;

        uint256 lotteryId = factory.createLottery{value: 100e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        address user1 = address(0x111);
        address user2 = address(0x222);
        address user3 = address(0x333);

        // Commit all tickets
        vm.prank(user1);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        vm.prank(user2);
        factory.commitTicket(lotteryId, 1, ticketSecretHashes[1]);

        vm.prank(user3);
        factory.commitTicket(lotteryId, 2, ticketSecretHashes[2]);

        // Verify all commitments
        (address holder0, bool committed0,,) = factory.tickets(lotteryId, 0);
        (address holder1, bool committed1,,) = factory.tickets(lotteryId, 1);
        (address holder2, bool committed2,,) = factory.tickets(lotteryId, 2);

        assertEq(holder0, user1, "Ticket 0 holder should be user1");
        assertEq(holder1, user2, "Ticket 1 holder should be user2");
        assertEq(holder2, user3, "Ticket 2 holder should be user3");
        assertTrue(committed0, "Ticket 0 should be committed");
        assertTrue(committed1, "Ticket 1 should be committed");
        assertTrue(committed2, "Ticket 2 should be committed");
    }

    function test_CommitTicket_PartialCommitment() public {
        bytes32 creatorCommitment = keccak256("creator_secret");

        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 50e6;
        prizeValues[1] = 30e6;
        prizeValues[2] = 20e6;

        uint256 lotteryId = factory.createLottery{value: 100e6}(
            creatorCommitment,
            ticketSecretHashes,
            prizeValues,
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + 30 minutes,
            0
        );

        address user1 = address(0x111);

        // Only commit one ticket
        vm.prank(user1);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Verify only ticket 0 is committed
        (address holder0, bool committed0,,) = factory.tickets(lotteryId, 0);
        (address holder1, bool committed1,,) = factory.tickets(lotteryId, 1);
        (address holder2, bool committed2,,) = factory.tickets(lotteryId, 2);

        assertEq(holder0, user1, "Ticket 0 holder should be user1");
        assertEq(holder1, address(0), "Ticket 1 holder should be zero");
        assertEq(holder2, address(0), "Ticket 2 holder should be zero");
        assertTrue(committed0, "Ticket 0 should be committed");
        assertFalse(committed1, "Ticket 1 should not be committed");
        assertFalse(committed2, "Ticket 2 should not be committed");
    }

    // ============ Reveal Phase Tests ============

    function test_RevealLottery_Success() public {
        // Setup lottery
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 30e6; // 30 USDC
        prizeValues[1] = 15e6; // 15 USDC
        prizeValues[2] = 5e6; // 5 USDC

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit all tickets
        vm.prank(address(0x1));
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        vm.prank(address(0x2));
        factory.commitTicket(lotteryId, 1, ticketSecretHashes[1]);

        vm.prank(address(0x3));
        factory.commitTicket(lotteryId, 2, ticketSecretHashes[2]);

        // Warp past commit deadline
        vm.warp(commitDeadline + 1);

        // Warp to reveal time
        vm.warp(revealTime);

        // Reveal lottery
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify state changed to RevealOpen
        (,,,,,,, LotteryFactory.LotteryState state,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.RevealOpen), "Should be RevealOpen");

        // Verify random seed was generated
        (uint256 randomSeed,) = factory.getLotteryReveal(lotteryId);
        assertTrue(randomSeed != 0, "Random seed should be non-zero");

        // Verify prizes were assigned
        (,, bool redeemed0, uint256 prize0) = factory.tickets(lotteryId, 0);
        (,, bool redeemed1, uint256 prize1) = factory.tickets(lotteryId, 1);
        (,, bool redeemed2, uint256 prize2) = factory.tickets(lotteryId, 2);

        assertFalse(redeemed0, "Ticket 0 should not be redeemed yet");
        assertFalse(redeemed1, "Ticket 1 should not be redeemed yet");
        assertFalse(redeemed2, "Ticket 2 should not be redeemed yet");

        // Verify all prizes were assigned (sum should equal total)
        uint256 totalAssigned = prize0 + prize1 + prize2;
        assertEq(totalAssigned, 50e6, "All prizes should be assigned");
    }

    function test_RevealLottery_EmitsEvent() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        vm.prank(address(0x1));
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline to reveal time
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);

        // Expect event (we can't predict exact randomSeed, so just check lotteryId)
        vm.expectEmit(true, false, false, false);
        emit LotteryRevealed(lotteryId, 0, block.timestamp);

        factory.revealLottery(lotteryId, creatorSecret);
    }

    function test_RevealLottery_RevertsOnInvalidSecret() public {
        bytes memory creatorSecret = "correct_secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Warp past commit deadline to reveal time
        vm.warp(commitDeadline + 1);

        // Warp to reveal time
        vm.warp(revealTime);

        // Try to reveal with wrong secret
        vm.expectRevert(LotteryFactory.InvalidCreatorSecret.selector);
        factory.revealLottery(lotteryId, "wrong_secret");
    }

    function test_RevealLottery_RevertsBeforeRevealTime() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Warp past commit deadline but don't warp to reveal time
        vm.warp(commitDeadline + 1);

        // Try to reveal before reveal time
        vm.expectRevert(LotteryFactory.CommitPeriodNotClosed.selector);
        factory.revealLottery(lotteryId, creatorSecret);
    }

    function test_RevealLottery_RevertsIfCommitDeadlineNotPassed() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Warp to BEFORE commit deadline
        vm.warp(commitDeadline - 1);

        // Try to reveal while commit deadline hasn't passed - should fail
        vm.expectRevert(LotteryFactory.CommitPeriodNotClosed.selector);
        factory.revealLottery(lotteryId, creatorSecret);
    }

    function test_RevealLottery_RevertsIfNotCreator() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Warp past commit deadline to reveal time
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);

        // Try to reveal from different address
        address notCreator = address(0x999);
        vm.prank(notCreator);
        vm.expectRevert(LotteryFactory.UnauthorizedCaller.selector);
        factory.revealLottery(lotteryId, creatorSecret);
    }

    function test_RevealLottery_PartialCommitment_PrizeCascade() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        for (uint256 i = 0; i < 3; i++) {
            ticketSecretHashes[i] = keccak256(abi.encodePacked("ticket_", i));
        }

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 30e6;
        prizeValues[1] = 15e6;
        prizeValues[2] = 5e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Only commit 2 out of 3 tickets
        vm.prank(address(0x1));
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        vm.prank(address(0x2));
        factory.commitTicket(lotteryId, 2, ticketSecretHashes[2]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify only committed tickets got prizes
        (,,, uint256 prize0) = factory.tickets(lotteryId, 0);
        (,,, uint256 prize1) = factory.tickets(lotteryId, 1);
        (,,, uint256 prize2) = factory.tickets(lotteryId, 2);

        // Uncommitted ticket should have 0 prize
        assertEq(prize1, 0, "Uncommitted ticket 1 should have 0 prize");

        // Committed tickets should have prizes
        assertTrue(prize0 > 0 || prize2 > 0, "At least one committed ticket should have prize");

        // With 3 prizes and 2 committed tickets, each ticket can only win once
        // So one prize (5M) should go to rollover
        uint256 totalAssigned = prize0 + prize2;
        uint256 rollover = factory.lotteryRolloverPool(lotteryId);

        // Each committed ticket should win exactly one prize
        assertTrue(prize0 > 0 && prize2 > 0, "Both committed tickets should win");
        assertEq(totalAssigned + rollover, 50e6, "Total assigned + rollover should equal prize pool");
        assertEq(rollover, 5e6, "One prize should go to rollover");
    }

    // This test is no longer valid - the new randomness mechanism requires at least 1 committed ticket
    // The test_RevealLottery_RevertsWithZeroCommits test covers this scenario

    function test_RevealLottery_RandomnessGeneration() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        vm.prank(address(0x1));
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify random seed was generated
        (uint256 randomSeed,) = factory.getLotteryReveal(lotteryId);
        assertTrue(randomSeed != 0, "Random seed should be non-zero");
    }

    // ============ Minimum Participant Tests ============

    function test_RevealLottery_RevertsWithZeroCommits() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 30e6;
        prizeValues[1] = 15e6;
        prizeValues[2] = 5e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Don't commit any tickets
        // Warp past commit deadline and try to reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);

        // Should revert with InsufficientCommittedTickets
        vm.expectRevert(LotteryFactory.InsufficientCommittedTickets.selector);
        factory.revealLottery(lotteryId, creatorSecret);
    }

    function test_RevealLottery_SucceedsWithOneCommit() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 30e6;
        prizeValues[1] = 15e6;
        prizeValues[2] = 5e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit exactly 1 ticket
        vm.prank(address(0x1));
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);

        // Should succeed with 1 commit
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify state changed to RevealOpen
        (,,,,,,, LotteryFactory.LotteryState state,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.RevealOpen), "Should be RevealOpen");
    }

    function test_RevealLottery_SucceedsWithTwoCommits() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 30e6;
        prizeValues[1] = 15e6;
        prizeValues[2] = 5e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit exactly 2 tickets
        vm.prank(address(0x1));
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        vm.prank(address(0x2));
        factory.commitTicket(lotteryId, 1, ticketSecretHashes[1]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);

        // Should succeed with 2 commits
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify state changed to RevealOpen
        (,,,,,,, LotteryFactory.LotteryState state,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.RevealOpen), "Should be RevealOpen");
    }

    function test_RevealLottery_SucceedsWithManyCommits() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        // Create 15 tickets
        bytes32[] memory ticketSecretHashes = new bytes32[](15);
        for (uint256 i = 0; i < 15; i++) {
            ticketSecretHashes[i] = keccak256(abi.encodePacked("ticket_", i));
        }

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 30e6;
        prizeValues[1] = 15e6;
        prizeValues[2] = 5e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 50e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit 10 tickets
        for (uint256 i = 0; i < 10; i++) {
            vm.prank(address(uint160(i + 1)));
            factory.commitTicket(lotteryId, i, ticketSecretHashes[i]);
        }

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);

        // Should succeed with 10 commits
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify state changed to RevealOpen
        (,,,,,,, LotteryFactory.LotteryState state,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.RevealOpen), "Should be RevealOpen");

        // Verify exactly 3 winners (one per prize)
        uint256 winnersCount = 0;
        for (uint256 i = 0; i < 10; i++) {
            (,,, uint256 prize) = factory.tickets(lotteryId, i);
            if (prize > 0) {
                winnersCount++;
            }
        }
        assertEq(winnersCount, 3, "Should have exactly 3 winners");
    }

    function test_RevealLottery_DeterministicRandomness() public {
        bytes memory creatorSecret = "deterministic_secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        // Create identical ticket setup
        bytes32[] memory ticketSecretHashes = new bytes32[](5);
        for (uint256 i = 0; i < 5; i++) {
            ticketSecretHashes[i] = keccak256(abi.encodePacked("ticket_", i));
        }

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 30e6;
        prizeValues[1] = 15e6;
        prizeValues[2] = 5e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        // Create first lottery
        uint256 lottery1 = factory.createLottery{value: 50e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit same tickets in same order
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(address(uint160(i + 1)));
            factory.commitTicket(lottery1, i, ticketSecretHashes[i]);
        }

        // Reveal first lottery
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lottery1, creatorSecret);

        // Record prize assignments from first lottery
        uint256[] memory prizes1 = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            (,,, uint256 prize) = factory.tickets(lottery1, i);
            prizes1[i] = prize;
        }

        // Create second identical lottery
        uint256 lottery2 = factory.createLottery{value: 50e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline + 2 hours, revealTime + 2 hours, 0
        );

        // Commit same tickets in same order
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(address(uint160(i + 1)));
            factory.commitTicket(lottery2, i, ticketSecretHashes[i]);
        }

        // Reveal second lottery
        vm.warp(commitDeadline + 2 hours + 1);
        vm.warp(revealTime + 2 hours);
        factory.revealLottery(lottery2, creatorSecret);

        // Record prize assignments from second lottery
        uint256[] memory prizes2 = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            (,,, uint256 prize) = factory.tickets(lottery2, i);
            prizes2[i] = prize;
        }

        // Verify prize assignments match exactly
        for (uint256 i = 0; i < 5; i++) {
            assertEq(prizes1[i], prizes2[i], "Prize assignments should be deterministic");
        }
    }

    // ============ Primary Use Case Test: Few Prizes, Many Tickets ============

    function test_CreateLottery_ThreePrizesHundredTickets() public {
        bytes32 creatorCommitment = keccak256("creator_secret");

        // Create 100 tickets
        bytes32[] memory ticketSecretHashes = new bytes32[](100);
        for (uint256 i = 0; i < 100; i++) {
            ticketSecretHashes[i] = keccak256(abi.encodePacked("ticket_", i));
        }

        // Create 3 prizes: 80%, 15%, 5% of 100 USDC
        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 80e6; // 80 USDC
        prizeValues[1] = 15e6; // 15 USDC
        prizeValues[2] = 5e6; // 5 USDC

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        // Should succeed with 3 prizes and 100 tickets
        uint256 lotteryId = factory.createLottery{value: 100e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Verify lottery was created correctly
        (uint256 totalPrizePool, uint256[] memory prizes) = factory.getLotteryPrizes(lotteryId);
        assertEq(totalPrizePool, 100e6, "Total prize pool should be 100 USDC");
        assertEq(prizes.length, 3, "Should have 3 prizes");
        assertEq(prizes[0], 80e6, "First prize should be 80 USDC");
        assertEq(prizes[1], 15e6, "Second prize should be 15 USDC");
        assertEq(prizes[2], 5e6, "Third prize should be 5 USDC");

        // Verify tickets were stored
        bytes32[] memory storedTickets = factory.getLotteryTickets(lotteryId);
        assertEq(storedTickets.length, 100, "Should have 100 tickets");
    }

    function test_RevealLottery_ThreePrizesHundredTickets_FullCommitment() public {
        bytes memory creatorSecret = "creator_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        // Create 100 tickets
        bytes32[] memory ticketSecretHashes = new bytes32[](100);
        for (uint256 i = 0; i < 100; i++) {
            ticketSecretHashes[i] = keccak256(abi.encodePacked("ticket_", i));
        }

        // Create 3 prizes
        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 80e6;
        prizeValues[1] = 15e6;
        prizeValues[2] = 5e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 100e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit all 100 tickets
        for (uint256 i = 0; i < 100; i++) {
            vm.prank(address(uint160(i + 1)));
            factory.commitTicket(lotteryId, i, ticketSecretHashes[i]);
        }

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify exactly 3 tickets won prizes
        uint256 winnersCount = 0;
        uint256 totalPrizesAssigned = 0;

        for (uint256 i = 0; i < 100; i++) {
            (,,, uint256 prize) = factory.tickets(lotteryId, i);
            if (prize > 0) {
                winnersCount++;
                totalPrizesAssigned += prize;
            }
        }

        assertEq(winnersCount, 3, "Exactly 3 tickets should win");
        assertEq(totalPrizesAssigned, 100e6, "All prizes should be assigned");

        // Verify no rollover (all prizes assigned)
        uint256 rollover = factory.lotteryRolloverPool(lotteryId);
        assertEq(rollover, 0, "No prizes should go to rollover");
    }

    function test_RevealLottery_ThreePrizesHundredTickets_PartialCommitment() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        // Create 100 tickets
        bytes32[] memory ticketSecretHashes = new bytes32[](100);
        for (uint256 i = 0; i < 100; i++) {
            ticketSecretHashes[i] = keccak256(abi.encodePacked("ticket_", i));
        }

        // Create 3 prizes
        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 80e6;
        prizeValues[1] = 15e6;
        prizeValues[2] = 5e6;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 100e6}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Only commit 10 out of 100 tickets
        for (uint256 i = 0; i < 10; i++) {
            vm.prank(address(uint160(i + 1)));
            factory.commitTicket(lotteryId, i, ticketSecretHashes[i]);
        }

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify exactly 3 of the 10 committed tickets won
        uint256 winnersCount = 0;
        uint256 totalPrizesAssigned = 0;

        for (uint256 i = 0; i < 10; i++) {
            (,,, uint256 prize) = factory.tickets(lotteryId, i);
            if (prize > 0) {
                winnersCount++;
                totalPrizesAssigned += prize;
            }
        }

        // Verify uncommitted tickets have no prizes
        for (uint256 i = 10; i < 100; i++) {
            (,,, uint256 prize) = factory.tickets(lotteryId, i);
            assertEq(prize, 0, "Uncommitted tickets should have no prize");
        }

        assertEq(winnersCount, 3, "Exactly 3 tickets should win");
        assertEq(totalPrizesAssigned, 100e6, "All prizes should be assigned to committed tickets");

        // Verify no rollover (all prizes went to committed tickets)
        uint256 rollover = factory.lotteryRolloverPool(lotteryId);
        assertEq(rollover, 0, "No prizes should go to rollover with enough committed tickets");
    }

    // ============ Claim Prize Tests ============

    function test_ClaimPrize_Success() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 10e18; // 10 ETH
        prizeValues[1] = 5e18; // 5 ETH
        prizeValues[2] = 2e18; // 2 ETH

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 17e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit all tickets
        address user1 = address(0x1);
        vm.prank(user1);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        address user2 = address(0x2);
        vm.prank(user2);
        factory.commitTicket(lotteryId, 1, ticketSecretHashes[1]);

        address user3 = address(0x3);
        vm.prank(user3);
        factory.commitTicket(lotteryId, 2, ticketSecretHashes[2]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Find a winning ticket
        uint256 winningTicket = 999;
        uint256 winningPrize = 0;
        for (uint256 i = 0; i < 3; i++) {
            (,,, uint256 prize) = factory.tickets(lotteryId, i);
            if (prize > 0) {
                winningTicket = i;
                winningPrize = prize;
                break;
            }
        }

        // Set gas price for claim
        vm.txGasPrice(10 gwei);

        // Claim the prize
        address winner = address(uint160(winningTicket + 1));
        uint256 balanceBefore = winner.balance;

        vm.prank(winner);
        factory.claimPrize(lotteryId, winningTicket, abi.encodePacked("ticket_", vm.toString(winningTicket)));

        // Verify prize was transferred (minus gas)
        uint256 balanceAfter = winner.balance;
        assertGt(balanceAfter, balanceBefore, "Winner should receive prize");

        // Verify ticket is marked as redeemed
        (,, bool redeemed,) = factory.tickets(lotteryId, winningTicket);
        assertTrue(redeemed, "Ticket should be marked as redeemed");
    }

    function test_ClaimPrize_GaslessWithGasCostCalculation() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e18; // 10 ETH

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        address user = address(0x1);
        vm.prank(user);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Set gas price
        uint256 gasPrice = 10 gwei;
        vm.txGasPrice(gasPrice);

        // Calculate expected gas cost
        uint256 expectedGasCost = 50000 * gasPrice;
        uint256 expectedNetPrize = 10e18 - expectedGasCost;

        // Record balances before claim
        uint256 userBalanceBefore = user.balance;
        uint256 relayerBalanceBefore = tx.origin.balance;

        // Claim prize
        vm.prank(user);
        factory.claimPrize(lotteryId, 0, "ticket_0");

        // Verify net prize transferred to winner
        uint256 userBalanceAfter = user.balance;
        assertEq(userBalanceAfter - userBalanceBefore, expectedNetPrize, "Winner should receive net prize");

        // Verify gas refund to tx.origin
        uint256 relayerBalanceAfter = tx.origin.balance;
        assertEq(relayerBalanceAfter - relayerBalanceBefore, expectedGasCost, "Relayer should receive gas refund");
    }

    function test_ClaimPrize_NetPrizeTransferToWinner() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 5e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 5e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        address winner = address(0x123);
        vm.prank(winner);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Set gas price
        vm.txGasPrice(15 gwei);
        uint256 gasCost = 50000 * 15 gwei;
        uint256 expectedNetPrize = 5e18 - gasCost;

        // Claim and verify
        uint256 balanceBefore = winner.balance;
        vm.prank(winner);
        factory.claimPrize(lotteryId, 0, "ticket_0");

        assertEq(winner.balance - balanceBefore, expectedNetPrize, "Net prize should be transferred");
    }

    function test_ClaimPrize_GasRefundToTxOrigin() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 8e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 8e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        address winner = address(0x456);
        vm.prank(winner);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Set gas price
        vm.txGasPrice(20 gwei);
        uint256 expectedGasRefund = 50000 * 20 gwei;

        // Record tx.origin balance
        uint256 originBalanceBefore = tx.origin.balance;

        // Claim prize
        vm.prank(winner);
        factory.claimPrize(lotteryId, 0, "ticket_0");

        // Verify gas refund to tx.origin
        assertEq(tx.origin.balance - originBalanceBefore, expectedGasRefund, "Gas should be refunded to tx.origin");
    }

    function test_ClaimPrize_RevertsWithoutCommit() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");

        uint256[] memory prizeValues = new uint256[](2);
        prizeValues[0] = 5e18;
        prizeValues[1] = 3e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 8e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Only commit ticket 0, not ticket 1
        address user1 = address(0x1);
        vm.prank(user1);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Try to claim uncommitted ticket 1
        address user2 = address(0x2);
        vm.txGasPrice(10 gwei);
        vm.prank(user2);
        vm.expectRevert(LotteryFactory.TicketNotCommitted.selector);
        factory.claimPrize(lotteryId, 1, "ticket_1");
    }

    function test_ClaimPrize_RevertsOnDoubleRedemption() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        address winner = address(0x1);
        vm.prank(winner);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // First claim should succeed
        vm.txGasPrice(10 gwei);
        vm.prank(winner);
        factory.claimPrize(lotteryId, 0, "ticket_0");

        // Second claim should revert
        vm.prank(winner);
        vm.expectRevert(LotteryFactory.TicketAlreadyRedeemed.selector);
        factory.claimPrize(lotteryId, 0, "ticket_0");
    }

    function test_ClaimPrize_RevertsWithInvalidSecret() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        address winner = address(0x1);
        vm.prank(winner);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Try to claim with wrong secret
        vm.txGasPrice(10 gwei);
        vm.prank(winner);
        vm.expectRevert(LotteryFactory.InvalidTicketSecret.selector);
        factory.claimPrize(lotteryId, 0, "wrong_secret");
    }

    function test_ClaimPrize_EmitsEvent() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        address user = address(0x1);
        vm.prank(user);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Expect PrizeClaimed event
        vm.expectEmit(true, true, false, false);
        emit PrizeClaimed(lotteryId, 0, user, 0, 0, 0); // We only check indexed params

        vm.prank(user);
        factory.claimPrize(lotteryId, 0, "ticket_0");
    }

    function test_ClaimPrize_RevertsIfNotCommitted() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Only commit ticket 0, not ticket 1
        vm.prank(address(0x1));
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Try to claim uncommitted ticket
        vm.prank(address(0x2));
        vm.expectRevert(LotteryFactory.TicketNotCommitted.selector);
        factory.claimPrize(lotteryId, 1, "ticket_1");
    }

    function test_ClaimPrize_RevertsOnInvalidSecret() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        address user = address(0x1);
        vm.prank(user);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Try to claim with wrong secret
        vm.prank(user);
        vm.expectRevert(LotteryFactory.InvalidTicketSecret.selector);
        factory.claimPrize(lotteryId, 0, "wrong_secret");
    }

    function test_ClaimPrize_RevertsOnDoubleRedeem() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        address user = address(0x1);
        vm.prank(user);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Claim once
        vm.prank(user);
        factory.claimPrize(lotteryId, 0, "ticket_0");

        // Try to claim again
        vm.prank(user);
        vm.expectRevert(LotteryFactory.TicketAlreadyRedeemed.selector);
        factory.claimPrize(lotteryId, 0, "ticket_0");
    }

    function test_ClaimPrize_RevertsBeforeReveal() public {
        // Setup lottery
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        address user = address(0x1);
        vm.prank(user);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Try to claim before reveal
        vm.prank(user);
        vm.expectRevert(LotteryFactory.InvalidLotteryState.selector);
        factory.claimPrize(lotteryId, 0, "ticket_0");
    }

    function test_ClaimPrize_GaslessClaimingMechanism() public {
        // Setup lottery with larger prize to cover gas
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256("ticket_0");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 1e18; // 1 ETH prize

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 1e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        address user = address(0x1);
        vm.deal(user, 0); // User has no ETH for gas
        vm.prank(user);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Set gas price for realistic gas cost calculation
        vm.txGasPrice(10 gwei);

        // Claim prize (gas will be deducted from prize)
        uint256 balanceBefore = user.balance;
        assertEq(balanceBefore, 0, "User should start with 0 balance");

        vm.prank(user);
        factory.claimPrize(lotteryId, 0, "ticket_0");

        // Verify user received net prize (gross - gas)
        uint256 balanceAfter = user.balance;
        assertGt(balanceAfter, 0, "User should receive net prize");
        assertLt(balanceAfter, 1e18, "Net prize should be less than gross prize");

        // Verify gas was deducted (approximately 50,000 gas * 10 gwei = 0.0005 ETH)
        uint256 expectedGasCost = 50000 * 10 gwei;
        uint256 expectedNetPrize = 1e18 - expectedGasCost;
        assertEq(balanceAfter, expectedNetPrize, "Net prize should equal gross minus gas cost");
    }

    function test_ClaimPrize_RevertsOnLosingTicket() public {
        // Setup lottery with more tickets than prizes
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        // Create 3 tickets but only 1 prize
        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 10e18; // Only 1 prize

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit all 3 tickets
        address user1 = address(0x1);
        vm.prank(user1);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        address user2 = address(0x2);
        vm.prank(user2);
        factory.commitTicket(lotteryId, 1, ticketSecretHashes[1]);

        address user3 = address(0x3);
        vm.prank(user3);
        factory.commitTicket(lotteryId, 2, ticketSecretHashes[2]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Find a losing ticket (one with 0 prize)
        uint256 losingTicket = 999;
        for (uint256 i = 0; i < 3; i++) {
            (,,, uint256 prize) = factory.tickets(lotteryId, i);
            if (prize == 0) {
                losingTicket = i;
                break;
            }
        }

        // Verify we found a losing ticket
        assertLt(losingTicket, 3, "Should have found at least one losing ticket");

        // Try to claim the losing ticket - should revert with arithmetic underflow
        // because netPrize = 0 - gasCost will underflow
        address loser = address(uint160(losingTicket + 1));
        vm.txGasPrice(10 gwei); // Set gas price so gasCost > 0
        vm.prank(loser);
        vm.expectRevert(); // Expect arithmetic underflow/panic
        factory.claimPrize(lotteryId, losingTicket, abi.encodePacked("ticket_", vm.toString(losingTicket)));
    }

    // ============ Security Tests ============

    /**
     * @notice Test that claimPrize is protected against reentrancy attacks
     * @dev Creates a malicious contract that attempts to recursively call claimPrize
     */
    function test_ClaimPrize_ReentrancyProtection() public {
        // Setup lottery
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = keccak256(abi.encodePacked("ticket_0"));
        ticketSecretHashes[1] = keccak256(abi.encodePacked("ticket_1"));

        uint256[] memory prizeValues = new uint256[](2);
        prizeValues[0] = 5e18;
        prizeValues[1] = 5e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Deploy malicious contract
        MaliciousReentrancy attacker = new MaliciousReentrancy(factory);

        // Commit ticket from malicious contract
        vm.prank(address(attacker));
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Commit second ticket from normal user
        address user2 = address(0x2);
        vm.prank(user2);
        factory.commitTicket(lotteryId, 1, ticketSecretHashes[1]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Set gas price for claim
        vm.txGasPrice(10 gwei);

        // Attempt reentrancy attack
        // The reentrancy guard will block the nested call, causing the receive() to revert
        // This causes the outer transfer to fail with "Transfer to winner failed"
        vm.expectRevert("Transfer to winner failed");
        attacker.attack(lotteryId, 0, abi.encodePacked("ticket_0"));
    }
}

/**
 * @title MaliciousReentrancy
 * @notice Malicious contract that attempts reentrancy attack on claimPrize
 */
contract MaliciousReentrancy {
    LotteryFactory public factory;
    uint256 public lotteryId;
    uint256 public ticketIndex;
    bytes public ticketSecret;
    bool public attacking;

    constructor(LotteryFactory _factory) {
        factory = _factory;
    }

    /**
     * @notice Initiate the reentrancy attack
     */
    function attack(uint256 _lotteryId, uint256 _ticketIndex, bytes memory _ticketSecret) external {
        lotteryId = _lotteryId;
        ticketIndex = _ticketIndex;
        ticketSecret = _ticketSecret;
        attacking = true;

        // First call to claimPrize
        factory.claimPrize(_lotteryId, _ticketIndex, _ticketSecret);
    }

    /**
     * @notice Fallback function that attempts reentrancy
     */
    receive() external payable {
        // If we're in attack mode and have received funds, try to reenter
        if (attacking && msg.value > 0) {
            attacking = false; // Prevent infinite loop in case reentrancy guard fails
            // Attempt to claim again (should be blocked by reentrancy guard)
            factory.claimPrize(lotteryId, ticketIndex, ticketSecret);
        }
    }
}

// ============ RefundLottery Tests Contract Extension ============

contract LotteryFactoryRefundTest is Test {
    LotteryFactory public factory;

    event LotteryRefunded(uint256 indexed lotteryId, address indexed creator, uint256 amount);

    function setUp() public {
        factory = new LotteryFactory();
    }

    // Receive function to accept ETH refunds
    receive() external payable {}

    /**
     * @notice Test successful refund when creator fails to reveal
     */
    function test_RefundLottery_Success() public {
        // Setup lottery
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](2);
        ticketSecretHashes[0] = keccak256(abi.encodePacked("ticket_0"));
        ticketSecretHashes[1] = keccak256(abi.encodePacked("ticket_1"));

        uint256[] memory prizeValues = new uint256[](2);
        prizeValues[0] = 6e18;
        prizeValues[1] = 4e18;

        uint256 totalPrize = 10e18;
        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        address creator = address(this);
        uint256 creatorBalanceBefore = creator.balance;

        uint256 lotteryId = factory.createLottery{value: totalPrize}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit tickets
        address user1 = address(0x1);
        vm.prank(user1);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline
        vm.warp(commitDeadline + 1);

        // Verify state is still CommitOpen (no intermediate state)
        (,,,,,,, LotteryFactory.LotteryState state,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.CommitOpen), "State should be CommitOpen");

        // Warp past reveal time + 24 hours (refund window)
        vm.warp(revealTime + 24 hours + 1);

        // Call refund (can be called by anyone)
        address refunder = address(0x999);
        vm.prank(refunder);
        factory.refundLottery(lotteryId);

        // Verify state is Finalized
        (,,,,,,, LotteryFactory.LotteryState finalState,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(finalState), uint8(LotteryFactory.LotteryState.Finalized), "State should be Finalized");

        // Verify creator received refund
        uint256 creatorBalanceAfter = creator.balance;
        assertEq(creatorBalanceAfter, creatorBalanceBefore, "Creator should receive full refund");
    }

    /**
     * @notice Test refund emits correct event
     */
    function test_RefundLottery_EmitsEvent() public {
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256(abi.encodePacked("ticket_0"));

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 5e18;

        uint256 totalPrize = 5e18;
        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        address creator = address(this);

        uint256 lotteryId = factory.createLottery{value: totalPrize}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Warp past commit deadline
        vm.warp(commitDeadline + 1);

        // Warp past refund window
        vm.warp(revealTime + 24 hours + 1);

        // Expect event emission
        vm.expectEmit(true, true, false, true);
        emit LotteryRefunded(lotteryId, creator, totalPrize);

        factory.refundLottery(lotteryId);
    }

    /**
     * @notice Test refund reverts if commit deadline hasn't passed
     */
    function test_RefundLottery_RevertsIfCommitDeadlineNotPassed() public {
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256(abi.encodePacked("ticket_0"));

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 5e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 5e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Try to refund before commit deadline passes
        vm.expectRevert(LotteryFactory.CommitPeriodNotClosed.selector);
        factory.refundLottery(lotteryId);
    }

    /**
     * @notice Test refund reverts if called before 24 hours after reveal time
     */
    function test_RefundLottery_RevertsIfTooEarly() public {
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256(abi.encodePacked("ticket_0"));

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 5e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 5e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Warp past commit deadline
        vm.warp(commitDeadline + 1);

        // Try to refund immediately after reveal time (before 24 hours)
        vm.warp(revealTime);
        vm.expectRevert(LotteryFactory.CommitPeriodNotClosed.selector);
        factory.refundLottery(lotteryId);

        // Try to refund 23 hours after reveal time (still too early)
        vm.warp(revealTime + 23 hours);
        vm.expectRevert(LotteryFactory.CommitPeriodNotClosed.selector);
        factory.refundLottery(lotteryId);
    }

    /**
     * @notice Test refund reverts if lottery was already revealed
     */
    function test_RefundLottery_RevertsIfAlreadyRevealed() public {
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256(abi.encodePacked("ticket_0"));

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 5e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 5e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit ticket
        address user1 = address(0x1);
        vm.prank(user1);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify state is RevealOpen
        (,,,,,,, LotteryFactory.LotteryState state,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.RevealOpen), "State should be RevealOpen");

        // Try to refund after reveal - should revert
        vm.warp(revealTime + 24 hours + 1);
        vm.expectRevert(LotteryFactory.InvalidLotteryState.selector);
        factory.refundLottery(lotteryId);
    }

    /**
     * @notice Test refund can be called by anyone (not just creator)
     */
    function test_RefundLottery_CanBeCalledByAnyone() public {
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256(abi.encodePacked("ticket_0"));

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 5e18;

        uint256 totalPrize = 5e18;
        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        address creator = address(this);
        uint256 creatorBalanceBefore = creator.balance;

        uint256 lotteryId = factory.createLottery{value: totalPrize}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Warp past commit deadline
        vm.warp(commitDeadline + 1);

        // Warp past refund window
        vm.warp(revealTime + 24 hours + 1);

        // Call refund from random address (not creator)
        address randomCaller = address(0x888);
        vm.prank(randomCaller);
        factory.refundLottery(lotteryId);

        // Verify creator still received refund
        uint256 creatorBalanceAfter = creator.balance;
        assertEq(creatorBalanceAfter, creatorBalanceBefore, "Creator should receive refund even when called by others");
    }

    /**
     * @notice Test refund with multiple committed tickets
     */
    function test_RefundLottery_WithMultipleCommittedTickets() public {
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256(abi.encodePacked("ticket_0"));
        ticketSecretHashes[1] = keccak256(abi.encodePacked("ticket_1"));
        ticketSecretHashes[2] = keccak256(abi.encodePacked("ticket_2"));

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 5e18;
        prizeValues[1] = 3e18;
        prizeValues[2] = 2e18;

        uint256 totalPrize = 10e18;
        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        address creator = address(this);
        uint256 creatorBalanceBefore = creator.balance;

        uint256 lotteryId = factory.createLottery{value: totalPrize}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit all tickets
        address user1 = address(0x1);
        vm.prank(user1);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        address user2 = address(0x2);
        vm.prank(user2);
        factory.commitTicket(lotteryId, 1, ticketSecretHashes[1]);

        address user3 = address(0x3);
        vm.prank(user3);
        factory.commitTicket(lotteryId, 2, ticketSecretHashes[2]);

        // Warp past commit deadline
        vm.warp(commitDeadline + 1);

        // Warp past refund window
        vm.warp(revealTime + 24 hours + 1);

        // Refund lottery
        factory.refundLottery(lotteryId);

        // Verify creator received full refund
        uint256 creatorBalanceAfter = creator.balance;
        assertEq(creatorBalanceAfter, creatorBalanceBefore, "Creator should receive full refund");

        // Verify state is Finalized
        (,,,,,,, LotteryFactory.LotteryState state,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.Finalized), "State should be Finalized");
    }

    /**
     * @notice Test refund at exact 24 hour boundary
     */
    function test_RefundLottery_AtExact24HourBoundary() public {
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256(abi.encodePacked("ticket_0"));

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 5e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 5e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Warp past commit deadline
        vm.warp(commitDeadline + 1);

        // Warp to exactly 24 hours after reveal time (should still revert - needs to be AFTER)
        vm.warp(revealTime + 24 hours);
        vm.expectRevert(LotteryFactory.CommitPeriodNotClosed.selector);
        factory.refundLottery(lotteryId);

        // Warp to 1 second after 24 hours (should succeed)
        vm.warp(revealTime + 24 hours + 1);
        factory.refundLottery(lotteryId);

        // Verify state is Finalized
        (,,,,,,, LotteryFactory.LotteryState state,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.Finalized), "State should be Finalized");
    }

    /**
     * @notice Test refund reverts if lottery is already finalized
     */
    function test_RefundLottery_RevertsIfAlreadyFinalized() public {
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256(abi.encodePacked("ticket_0"));

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 5e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 5e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Warp past commit deadline
        vm.warp(commitDeadline + 1);

        // Warp past refund window and refund
        vm.warp(revealTime + 24 hours + 1);
        factory.refundLottery(lotteryId);

        // Try to refund again - should revert
        vm.expectRevert(LotteryFactory.InvalidLotteryState.selector);
        factory.refundLottery(lotteryId);
    }

    /**
     * @notice Fuzz test refund with various time delays
     */
    function testFuzz_RefundLottery_VariousTimeDelays(uint256 timeDelay) public {
        // Bound time delay to reasonable range (24 hours + 1 second to 365 days)
        timeDelay = bound(timeDelay, 24 hours + 1, 365 days);

        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](1);
        ticketSecretHashes[0] = keccak256(abi.encodePacked("ticket_0"));

        uint256[] memory prizeValues = new uint256[](1);
        prizeValues[0] = 5e18;

        uint256 totalPrize = 5e18;
        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        address creator = address(this);
        uint256 creatorBalanceBefore = creator.balance;

        uint256 lotteryId = factory.createLottery{value: totalPrize}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Warp past commit deadline
        vm.warp(commitDeadline + 1);

        // Warp by fuzzed time delay
        vm.warp(revealTime + timeDelay);

        // Refund should succeed
        factory.refundLottery(lotteryId);

        // Verify creator received refund
        uint256 creatorBalanceAfter = creator.balance;
        assertEq(creatorBalanceAfter, creatorBalanceBefore, "Creator should receive full refund");

        // Verify state is Finalized
        (,,,,,,, LotteryFactory.LotteryState state,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.Finalized), "State should be Finalized");
    }
}

// ============ Integration Tests for Full Lifecycle ============

contract LotteryFactoryIntegrationTest is Test {
    LotteryFactory public factory;

    event LotteryCreated(
        uint256 indexed lotteryId,
        address indexed creator,
        uint256 totalPrizePool,
        uint256 numberOfTickets,
        uint256 commitDeadline,
        uint256 revealTime
    );

    event TicketCommitted(uint256 indexed lotteryId, uint256 indexed ticketIndex, address holder);

    event LotteryRevealed(uint256 indexed lotteryId, uint256 randomSeed, uint256 revealedAt);

    event PrizeClaimed(
        uint256 indexed lotteryId,
        uint256 indexed ticketIndex,
        address winner,
        uint256 grossPrize,
        uint256 netPrize,
        uint256 gasCost
    );

    event PrizesForfeited(uint256 indexed lotteryId, uint256 forfeitedAmount, uint256 processedAt);

    function setUp() public {
        factory = new LotteryFactory();
    }

    // Receive function to accept ETH
    receive() external payable {}

    /**
     * @notice Test complete lottery flow: create → commit → reveal → claim → finalize
     */
    function test_Integration_FullLotteryLifecycle() public {
        // Setup lottery
        bytes memory creatorSecret = "my_secret_123";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 10e18;
        prizeValues[1] = 5e18;
        prizeValues[2] = 2e18;

        uint256 totalPrize = 17e18;
        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        // Step 1: Create lottery
        uint256 lotteryId = factory.createLottery{value: totalPrize}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        assertEq(lotteryId, 1, "Lottery ID should be 1");

        // Step 2: Commit all tickets
        address user1 = address(0x1);
        address user2 = address(0x2);
        address user3 = address(0x3);

        vm.prank(user1);
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        vm.prank(user2);
        factory.commitTicket(lotteryId, 1, ticketSecretHashes[1]);

        vm.prank(user3);
        factory.commitTicket(lotteryId, 2, ticketSecretHashes[2]);

        // Step 3: Close commit period
        vm.warp(commitDeadline + 1);

        // Step 4: Reveal lottery
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify state is RevealOpen
        (,,,,,,, LotteryFactory.LotteryState state,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.RevealOpen), "State should be RevealOpen");

        // Step 5: Claim all prizes
        vm.txGasPrice(10 gwei);

        for (uint256 i = 0; i < 3; i++) {
            (address holder,, bool redeemed, uint256 prize) = factory.tickets(lotteryId, i);
            if (prize > 0) {
                vm.prank(holder);
                factory.claimPrize(lotteryId, i, abi.encodePacked("ticket_", vm.toString(i)));

                // Verify ticket is redeemed
                (,, bool redeemedAfter,) = factory.tickets(lotteryId, i);
                assertTrue(redeemedAfter, "Ticket should be redeemed");
            }
        }

        // Step 6: Finalize lottery
        vm.warp(revealTime + 24 hours + 1);
        factory.finalizeLottery(lotteryId);

        // Verify state is Finalized
        (,,,,,,, LotteryFactory.LotteryState finalState,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(finalState), uint8(LotteryFactory.LotteryState.Finalized), "State should be Finalized");
    }

    /**
     * @notice Test multiple participants with different addresses
     */
    function test_Integration_MultipleParticipants() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](5);
        for (uint256 i = 0; i < 5; i++) {
            ticketSecretHashes[i] = keccak256(abi.encodePacked("ticket_", i));
        }

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 5e18;
        prizeValues[1] = 3e18;
        prizeValues[2] = 2e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit tickets from different users
        address[] memory users = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            users[i] = address(uint160(i + 100));
            vm.prank(users[i]);
            factory.commitTicket(lotteryId, i, ticketSecretHashes[i]);
        }

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify exactly 3 winners
        uint256 winnerCount = 0;
        for (uint256 i = 0; i < 5; i++) {
            (,,, uint256 prize) = factory.tickets(lotteryId, i);
            if (prize > 0) {
                winnerCount++;
            }
        }

        assertEq(winnerCount, 3, "Should have exactly 3 winners");
    }

    /**
     * @notice Test partial commitment with forfeiture
     */
    function test_Integration_PartialCommitmentWithForfeiture() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](5);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");
        ticketSecretHashes[3] = keccak256("ticket_3");
        ticketSecretHashes[4] = keccak256("ticket_4");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 5e18;
        prizeValues[1] = 3e18;
        prizeValues[2] = 2e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 10e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Only commit 2 out of 5 tickets
        vm.prank(address(0x1));
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        vm.prank(address(0x2));
        factory.commitTicket(lotteryId, 2, ticketSecretHashes[2]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Verify only committed tickets have prizes
        (,,, uint256 prize0) = factory.tickets(lotteryId, 0);
        (,,, uint256 prize1) = factory.tickets(lotteryId, 1);
        (,,, uint256 prize2) = factory.tickets(lotteryId, 2);
        (,,, uint256 prize3) = factory.tickets(lotteryId, 3);
        (,,, uint256 prize4) = factory.tickets(lotteryId, 4);

        // Uncommitted tickets should have 0 prize
        assertEq(prize1, 0, "Uncommitted ticket 1 should have 0 prize");
        assertEq(prize3, 0, "Uncommitted ticket 3 should have 0 prize");
        assertEq(prize4, 0, "Uncommitted ticket 4 should have 0 prize");

        // With 3 prizes and 2 committed tickets, one prize goes to rollover
        uint256 totalAssigned = prize0 + prize2;
        uint256 rollover = factory.lotteryRolloverPool(lotteryId);

        assertEq(totalAssigned + rollover, 10e18, "Total assigned + rollover should equal prize pool");
        assertEq(rollover, 2e18, "One prize should go to rollover");

        // Claim the winning tickets
        vm.txGasPrice(10 gwei);

        if (prize0 > 0) {
            vm.prank(address(0x1));
            factory.claimPrize(lotteryId, 0, "ticket_0");
        }

        if (prize2 > 0) {
            vm.prank(address(0x2));
            factory.claimPrize(lotteryId, 2, "ticket_2");
        }

        // Finalize and verify rollover
        vm.warp(revealTime + 24 hours + 1);
        factory.finalizeLottery(lotteryId);

        uint256 finalRollover = factory.lotteryRolloverPool(lotteryId);
        assertEq(finalRollover, 2e18, "Rollover should remain 2 ETH");
    }

    /**
     * @notice Test rollover integration with new lottery
     */
    function test_Integration_RolloverIntegration() public {
        // Create first lottery with partial commitment
        bytes32 commitment1 = keccak256("secret1");

        bytes32[] memory tickets1 = new bytes32[](3);
        tickets1[0] = keccak256("ticket1_0");
        tickets1[1] = keccak256("ticket1_1");
        tickets1[2] = keccak256("ticket1_2");

        uint256[] memory prizes1 = new uint256[](2);
        prizes1[0] = 5e18;
        prizes1[1] = 3e18;

        uint256 lottery1 = factory.createLottery{value: 8e18}(
            commitment1, tickets1, prizes1, block.timestamp + 1 hours, block.timestamp + 1 hours + 30 minutes, 0
        );

        // Only commit 1 ticket
        vm.prank(address(0x1));
        factory.commitTicket(lottery1, 0, tickets1[0]);

        // Warp past commit deadline and reveal
        vm.warp(block.timestamp + 1 hours + 1);
        vm.warp(block.timestamp + 1 hours);
        factory.revealLottery(lottery1, "secret1");

        // Verify rollover exists
        uint256 rollover1 = factory.lotteryRolloverPool(lottery1);
        assertGt(rollover1, 0, "Should have rollover from first lottery");

        // Create second lottery using rollover
        bytes32 commitment2 = keccak256("secret2");

        bytes32[] memory tickets2 = new bytes32[](2);
        tickets2[0] = keccak256("ticket2_0");
        tickets2[1] = keccak256("ticket2_1");

        uint256[] memory prizes2 = new uint256[](2);
        prizes2[0] = 4e18;
        prizes2[1] = 2e18;

        uint256 expectedTotal = 6e18 + rollover1;

        uint256 lottery2 = factory.createLottery{value: 6e18}(
            commitment2, tickets2, prizes2, block.timestamp + 1 hours, block.timestamp + 1 hours + 30 minutes, lottery1
        );

        // Verify rollover was added to prize pool
        (uint256 totalPrize,) = factory.getLotteryPrizes(lottery2);
        assertEq(totalPrize, expectedTotal, "Total prize should include rollover");

        // Verify rollover pool was cleared
        assertEq(factory.lotteryRolloverPool(lottery1), 0, "Rollover pool should be cleared");
    }

    /**
     * @notice Test unclaimed prizes going to rollover after claim deadline
     */
    function test_Integration_UnclaimedPrizesRollover() public {
        bytes memory creatorSecret = "secret";
        bytes32 creatorCommitment = keccak256(creatorSecret);

        bytes32[] memory ticketSecretHashes = new bytes32[](3);
        ticketSecretHashes[0] = keccak256("ticket_0");
        ticketSecretHashes[1] = keccak256("ticket_1");
        ticketSecretHashes[2] = keccak256("ticket_2");

        uint256[] memory prizeValues = new uint256[](3);
        prizeValues[0] = 10e18;
        prizeValues[1] = 5e18;
        prizeValues[2] = 2e18;

        uint256 commitDeadline = block.timestamp + 1 hours;
        uint256 revealTime = block.timestamp + 1 hours + 30 minutes;

        uint256 lotteryId = factory.createLottery{value: 17e18}(
            creatorCommitment, ticketSecretHashes, prizeValues, commitDeadline, revealTime, 0
        );

        // Commit all tickets
        vm.prank(address(0x1));
        factory.commitTicket(lotteryId, 0, ticketSecretHashes[0]);

        vm.prank(address(0x2));
        factory.commitTicket(lotteryId, 1, ticketSecretHashes[1]);

        vm.prank(address(0x3));
        factory.commitTicket(lotteryId, 2, ticketSecretHashes[2]);

        // Warp past commit deadline and reveal
        vm.warp(commitDeadline + 1);
        vm.warp(revealTime);
        factory.revealLottery(lotteryId, creatorSecret);

        // Only claim one prize
        vm.txGasPrice(10 gwei);
        for (uint256 i = 0; i < 3; i++) {
            (address holder,, bool redeemed, uint256 prize) = factory.tickets(lotteryId, i);
            if (prize > 0 && i == 0) {
                // Only claim first winning ticket
                vm.prank(holder);
                factory.claimPrize(lotteryId, i, abi.encodePacked("ticket_", vm.toString(i)));
                break;
            }
        }

        // Warp past claim deadline
        vm.warp(revealTime + 24 hours + 1);

        // Finalize lottery
        factory.finalizeLottery(lotteryId);

        // Verify unclaimed prizes went to rollover
        uint256 rollover = factory.lotteryRolloverPool(lotteryId);
        assertGt(rollover, 0, "Unclaimed prizes should go to rollover");

        // Verify state is Finalized
        (,,,,,,, LotteryFactory.LotteryState state,,,) = factory.lotteries(lotteryId);
        assertEq(uint8(state), uint8(LotteryFactory.LotteryState.Finalized), "State should be Finalized");
    }
}
