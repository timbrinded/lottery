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
        assertEq(uint8(LotteryFactory.LotteryState.CommitClosed), 2);
        assertEq(uint8(LotteryFactory.LotteryState.RevealOpen), 3);
        assertEq(uint8(LotteryFactory.LotteryState.Finalized), 4);
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
        (
            address holder,
            bool committed,
            bool redeemed,
            uint256 prizeAmount
        ) = factory.tickets(999, 0);

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
        (
            address holder,
            bool committed,
            bool redeemed,
            uint256 prizeAmount
        ) = factory.tickets(lotteryId, ticketIndex);

        assertEq(holder, address(0), "Holder should be zero address");
        assertFalse(committed, "Committed should be false");
        assertFalse(redeemed, "Redeemed should be false");
        assertEq(prizeAmount, 0, "Prize amount should be 0");
    }
}
