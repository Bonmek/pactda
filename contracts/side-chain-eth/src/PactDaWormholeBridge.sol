// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PactDaWormholeBridge
 * @dev Bridge contract for cross-chain communication between Ethereum and Sui using Wormhole
 * Handles EIP-712 signature verification and Wormhole message publishing
 */
contract PactDaWormholeBridge is Ownable {
    // Wormhole Core contract address
    address public wormhole;

    // Default consistency level for Wormhole messages
    uint8 public consistencyLevel = 1;

    // Track nonces per user address to prevent replay attacks
    mapping(address => uint256) public nonces;

    // EIP-712 Domain Separator
    bytes32 public DOMAIN_SEPARATOR;

    // EIP-712 type hash for the Authorization struct
    bytes32 public constant AUTHORIZATION_TYPEHASH =
        keccak256(
            "Authorization(address signer,bytes32 actionType,bytes32 contractId,bytes32 actionParams,uint256 nonce,uint256 deadline)"
        );

    // Valid action types
    mapping(bytes32 => bool) public validActionTypes;

    // Authorization parameters struct to avoid stack too deep errors
    struct AuthParams {
        address signer;
        bytes32 actionType;
        bytes32 contractId;
        bytes32 actionParams;
        uint256 deadline;
    }

    // Events
    event AuthorizationSubmitted(
        address indexed signer,
        bytes32 indexed actionType,
        bytes32 indexed contractId,
        bytes32 actionParams,
        uint256 sequence
    );

    event ActionTypeAdded(bytes32 actionType);
    event ActionTypeRemoved(bytes32 actionType);
    event WormholeAddressUpdated(address newAddress);
    event ConsistencyLevelUpdated(uint8 newLevel);

    /**
     * @dev Constructor for PactDaWormholeBridge
     * @param _wormhole Address of the Wormhole Core contract
     */
    constructor(address _wormhole) Ownable(msg.sender) {
        require(_wormhole != address(0), "PactDaWormholeBridge: zero address");
        wormhole = _wormhole;

        // Initialize domain separator for EIP-712 signatures
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256("PactDaWormholeBridge"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );

        // Initialize default action types
        _addActionType("APPROVE_MILESTONE");
        _addActionType("REJECT_MILESTONE");
        _addActionType("RELEASE_FUNDS");
        _addActionType("REFUND_FUNDS");
        _addActionType("CANCEL_CONTRACT");
    }

    /**
     * @dev Verify a signature's validity
     * @param params The authorization parameters
     * @param nonce The current nonce for the signer
     * @param signature EIP-712 signature (v, r, s) from user's wallet
     */
    function _verifySignature(
        AuthParams memory params,
        uint256 nonce,
        bytes calldata signature
    ) internal view {
        bytes32 structHash = keccak256(
            abi.encode(
                AUTHORIZATION_TYPEHASH,
                params.signer,
                params.actionType,
                params.contractId,
                params.actionParams,
                nonce,
                params.deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = _splitSignature(signature);
        address recoveredSigner = ecrecover(digest, v, r, s);
        require(
            recoveredSigner == params.signer,
            "PactDaWormholeBridge: invalid signature"
        );
    }

    /**
     * @dev Create the Wormhole payload and publish message
     * @param params The authorization parameters
     * @return sequence The Wormhole message sequence number
     */
    function _publishToWormhole(
        AuthParams memory params
    ) internal returns (uint64 sequence) {
        // Prepare the payload for Wormhole
        bytes memory payload = abi.encode(
            params.signer, // Ethereum address of the signer
            params.actionType, // Action type identifier
            params.contractId, // Target Sui contract ID
            params.actionParams, // Action-specific parameters
            block.timestamp // Timestamp for Sui-side validation
        );

        // Publish the message to Wormhole
        return
            IWormhole(wormhole).publishMessage{value: msg.value}(
                0, // nonce (Wormhole handles this internally)
                payload, // the payload containing our authorization data
                consistencyLevel // the consistency level (finality) required
            );
    }

    /**
     * @dev Process a signed authorization and send it to Wormhole
     * @param signer Address of the user authorizing the action
     * @param actionType Identifier for the type of action
     * @param contractId Sui Object ID of the target PactDaContract
     * @param actionParams Additional parameters for the action
     * @param deadline Timestamp after which the signature is invalid
     * @param signature EIP-712 signature (v, r, s) from user's wallet
     * @return sequence The Wormhole message sequence number
     */
    function processSignedAuthorization(
        address signer,
        bytes32 actionType,
        bytes32 contractId,
        bytes32 actionParams,
        uint256 deadline,
        bytes calldata signature
    ) external payable returns (uint64 sequence) {
        // Basic validations
        require(
            block.timestamp <= deadline,
            "PactDaWormholeBridge: expired deadline"
        );
        require(
            validActionTypes[actionType],
            "PactDaWormholeBridge: invalid action type"
        );

        // Package parameters to avoid stack too deep
        AuthParams memory params = AuthParams({
            signer: signer,
            actionType: actionType,
            contractId: contractId,
            actionParams: actionParams,
            deadline: deadline
        });

        // Get and increment nonce
        uint256 nonce = nonces[signer];
        _verifySignature(params, nonce, signature);
        nonces[signer]++;

        // Publish to Wormhole in a separate function call
        sequence = _publishToWormhole(params);

        // Emit event for off-chain tracking
        emit AuthorizationSubmitted(
            signer,
            actionType,
            contractId,
            actionParams,
            sequence
        );

        return sequence;
    }

    /**
     * @dev Add a valid action type
     * @param actionTypeString The action type string to add
     */
    function addActionType(
        string calldata actionTypeString
    ) external onlyOwner {
        bytes32 actionType = keccak256(bytes(actionTypeString));
        _addActionType(actionTypeString);
    }

    /**
     * @dev Internal function to add a valid action type
     * @param actionTypeString The action type string to add
     */
    function _addActionType(string memory actionTypeString) internal {
        bytes32 actionType = keccak256(bytes(actionTypeString));
        require(
            !validActionTypes[actionType],
            "PactDaWormholeBridge: action type already exists"
        );

        validActionTypes[actionType] = true;
        emit ActionTypeAdded(actionType);
    }

    /**
     * @dev Remove a valid action type
     * @param actionTypeString The action type string to remove
     */
    function removeActionType(
        string calldata actionTypeString
    ) external onlyOwner {
        bytes32 actionType = keccak256(bytes(actionTypeString));
        require(
            validActionTypes[actionType],
            "PactDaWormholeBridge: action type does not exist"
        );

        validActionTypes[actionType] = false;
        emit ActionTypeRemoved(actionType);
    }

    /**
     * @dev Set the Wormhole contract address
     * @param newWormhole The new Wormhole contract address
     */
    function setWormhole(address newWormhole) external onlyOwner {
        require(
            newWormhole != address(0),
            "PactDaWormholeBridge: zero address"
        );
        wormhole = newWormhole;
        emit WormholeAddressUpdated(newWormhole);
    }

    /**
     * @dev Set the consistency level for Wormhole messages
     * @param newLevel The new consistency level
     */
    function setConsistencyLevel(uint8 newLevel) external onlyOwner {
        consistencyLevel = newLevel;
        emit ConsistencyLevelUpdated(newLevel);
    }

    /**
     * @dev Check if an action type is valid
     * @param actionTypeString The string representation of the action type
     * @return True if the action type is valid
     */
    function isValidActionType(
        string calldata actionTypeString
    ) external view returns (bool) {
        bytes32 actionType = keccak256(bytes(actionTypeString));
        return validActionTypes[actionType];
    }

    /**
     * @dev Split a signature into its v, r, s components
     * @param signature The signature to split
     * @return v The v component of the signature
     * @return r The r component of the signature
     * @return s The s component of the signature
     */
    function _splitSignature(
        bytes memory signature
    ) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        require(
            signature.length == 65,
            "PactDaWormholeBridge: invalid signature length"
        );

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        // Support both 27/28 and 0/1 as v values
        if (v < 27) {
            v += 27;
        }

        require(
            v == 27 || v == 28,
            "PactDaWormholeBridge: invalid signature v value"
        );

        return (v, r, s);
    }
}

/**
 * @dev Simplified interface for the Wormhole Core contract
 */
interface IWormhole {
    function publishMessage(
        uint32 nonce,
        bytes memory payload,
        uint8 consistencyLevel
    ) external payable returns (uint64 sequence);
}
