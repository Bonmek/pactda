// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PactDaWormholeBridge.sol";

/**
 * @title PactDaWormholeBridgeScript
 * @dev Deployment script for PactDaWormholeBridge contract using Foundry
 */
contract PactDaWormholeBridgeScript is Script {
    function setUp() public {}

    function run() public {
        // Get private key and wormhole address from environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address wormholeAddress = vm.envAddress("WORMHOLE_ADDRESS");
        
        // Validate wormhole address
        require(wormholeAddress != address(0), "Wormhole address not configured");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the bridge contract
        PactDaWormholeBridge bridge = new PactDaWormholeBridge(wormholeAddress);
        
        // Log the deployed address
        console.log("PactDaWormholeBridge deployed at:", address(bridge));
        
        vm.stopBroadcast();
    }
}