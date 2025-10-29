// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {LotteryFactory} from "../src/LotteryFactory.sol";

/**
 * @title LotteryFactoryScript
 * @notice Deployment script for LotteryFactory contract
 * @dev Run with: forge script script/LotteryFactory.s.sol --rpc-url <url> --private-key <key> --broadcast
 */
contract LotteryFactoryScript is Script {
    LotteryFactory public lotteryFactory;

    function run() public {
        vm.startBroadcast();

        // Deploy LotteryFactory
        lotteryFactory = new LotteryFactory();

        vm.stopBroadcast();

        // Log deployment address
        console.log("LotteryFactory deployed at:", address(lotteryFactory));
    }
}
