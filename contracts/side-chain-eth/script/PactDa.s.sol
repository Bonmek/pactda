// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PactDa.sol";

/**
 * @title PactDaScript
 * @dev Deployment script for PactDa contract using Foundry
 */
contract PactDaScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        PactDa pactda = new PactDa();

        vm.stopBroadcast();
    }
}