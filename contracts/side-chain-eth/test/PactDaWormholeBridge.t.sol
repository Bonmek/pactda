// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PactDaWormholeBridge.sol";

// Mock Wormhole contract for testing
contract MockWormhole {
    uint64 public messageSequence = 1000;
    
    struct PublishedMessage {
        uint32 nonce;
        bytes payload;
        uint8 consistencyLevel;
    }
    
    PublishedMessage public lastPublishedMessage;
    
    function publishMessage(
        uint32 nonce,
        bytes memory payload,
        uint8 consistencyLevel
    ) external payable returns (uint64) {
        lastPublishedMessage = PublishedMessage(nonce, payload, consistencyLevel);
        return messageSequence++;
    }
    
    function getLastPublishedMessage() external view returns (PublishedMessage memory) {
        return lastPublishedMessage;
    }
}

contract PactDaWormholeBridgeTest is Test {
    PactDaWormholeBridge public bridge;
    MockWormhole public wormhole;
    
    address public owner;
    address public signer;
    uint256 public signerPrivateKey;
    
    bytes32 public constant DOMAIN_SEPARATOR_TYPEHASH = 
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    
    bytes32 public constant AUTHORIZATION_TYPEHASH = 
        keccak256("Authorization(address signer,bytes32 actionType,bytes32 contractId,bytes32 actionParams,uint256 nonce,uint256 deadline)");
    
    // Test data struct to avoid stack too deep errors
    struct TestAuthData {
        bytes32 actionType;
        bytes32 contractId;
        bytes32 actionParams;
        uint256 deadline;
        uint256 nonce;
        bytes signature;
    }
    
    // Payload data struct for verification
    struct PayloadData {
        address signer;
        bytes32 actionType;
        bytes32 contractId;
        bytes32 actionParams;
        uint256 timestamp;
    }

    function setUp() public {
        owner = address(this);
        
        // Create a signer with a known private key for testing
        signerPrivateKey = 0xA11CE;
        signer = vm.addr(signerPrivateKey);
        vm.label(signer, "Signer");
        
        // Deploy mock Wormhole contract
        wormhole = new MockWormhole();
        vm.label(address(wormhole), "MockWormhole");
        
        // Deploy bridge contract
        bridge = new PactDaWormholeBridge(address(wormhole));
        vm.label(address(bridge), "PactDaWormholeBridge");
    }
    
    // Helper function to prepare test data
    function _prepareAuthData(bool expired) internal view returns (TestAuthData memory) {
        TestAuthData memory data;
        data.actionType = keccak256("APPROVE_MILESTONE");
        data.contractId = bytes32(uint256(0x12345));
        data.actionParams = bytes32(uint256(0x1));
        data.deadline = expired ? block.timestamp - 1 : block.timestamp + 3600;
        data.nonce = bridge.nonces(signer);

        bytes32 structHash = keccak256(
            abi.encode(
                AUTHORIZATION_TYPEHASH,
                signer,
                data.actionType,
                data.contractId,
                data.actionParams,
                data.nonce,
                data.deadline
            )
        );

        bytes32 domainSeparator = bridge.DOMAIN_SEPARATOR();
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);
        data.signature = abi.encodePacked(r, s, v);
        
        return data;
    }
    
    // Helper function to verify payload contents
    function _verifyPayload(TestAuthData memory data) internal {
        MockWormhole.PublishedMessage memory lastMessage = wormhole.getLastPublishedMessage();
        assertEq(lastMessage.consistencyLevel, bridge.consistencyLevel(), "Incorrect consistency level");
        
        PayloadData memory payload = abi.decode(lastMessage.payload, (PayloadData));
        
        assertEq(payload.signer, signer, "Incorrect signer in payload");
        assertEq(payload.actionType, data.actionType, "Incorrect action type in payload");
        assertEq(payload.contractId, data.contractId, "Incorrect contract ID in payload");
        assertEq(payload.actionParams, data.actionParams, "Incorrect action params in payload");
        assertEq(payload.timestamp, block.timestamp, "Incorrect timestamp in payload");
    }
    
    function testProcessSignedAuthorization() public {
        // Prepare test data
        TestAuthData memory data = _prepareAuthData(false);
        uint256 nonce = bridge.nonces(signer);
        
        // Value to pay for Wormhole fee
        uint256 wormholeFee = 0.01 ether;
        vm.deal(address(this), wormholeFee);
        
        // Process the signed authorization
        uint64 sequence = bridge.processSignedAuthorization{value: wormholeFee}(
            signer,
            data.actionType,
            data.contractId,
            data.actionParams,
            data.deadline,
            data.signature
        );
        
        // Check results
        assertEq(sequence, 1000, "Incorrect sequence number");
        assertEq(bridge.nonces(signer), nonce + 1, "Nonce was not incremented");
        
        // Extract and verify payload
        _verifyPayload(data);
    }
    
    function testRejectedExpiredDeadline() public {
        // Prepare test data with expired deadline
        TestAuthData memory data = _prepareAuthData(true);
        
        // Should revert with expired deadline
        vm.expectRevert("PactDaWormholeBridge: expired deadline");
        bridge.processSignedAuthorization(
            signer,
            data.actionType,
            data.contractId,
            data.actionParams,
            data.deadline,
            data.signature
        );
    }
    
    function testRejectedInvalidSignature() public {
        // Prepare authorization data
        TestAuthData memory data = _prepareAuthData(false);
        
        // Create invalid signature by using a different signer or data
        address differentSigner = address(0xBEEF);
        
        bytes32 structHash = keccak256(
            abi.encode(
                AUTHORIZATION_TYPEHASH,
                differentSigner, // Different signer than the one we'll provide
                data.actionType,
                data.contractId,
                data.actionParams,
                data.nonce,
                data.deadline
            )
        );
        
        bytes32 domainSeparator = bridge.DOMAIN_SEPARATOR();
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);
        data.signature = abi.encodePacked(r, s, v);
        
        // Should revert with invalid signature
        vm.expectRevert("PactDaWormholeBridge: invalid signature");
        bridge.processSignedAuthorization(
            signer, // Providing original signer here but signed with different data
            data.actionType,
            data.contractId,
            data.actionParams,
            data.deadline,
            data.signature
        );
    }
    
    function testAddRemoveActionType() public {
        string memory newActionType = "NEW_ACTION";
        bytes32 actionTypeHash = keccak256(bytes(newActionType));
        
        assertEq(bridge.isValidActionType(newActionType), false, "Action type should not be valid yet");
        
        // Add the action type
        bridge.addActionType(newActionType);
        
        assertEq(bridge.isValidActionType(newActionType), true, "Action type should be valid after adding");
        
        // Remove the action type
        bridge.removeActionType(newActionType);
        
        assertEq(bridge.isValidActionType(newActionType), false, "Action type should not be valid after removing");
    }
    
    function testUpdateWormholeAddress() public {
        address newWormholeAddress = address(0x789);
        
        bridge.setWormhole(newWormholeAddress);
        
        assertEq(bridge.wormhole(), newWormholeAddress, "Wormhole address not updated");
    }
    
    function testUpdateConsistencyLevel() public {
        uint8 newLevel = 5;
        
        bridge.setConsistencyLevel(newLevel);
        
        assertEq(bridge.consistencyLevel(), newLevel, "Consistency level not updated");
    }
}