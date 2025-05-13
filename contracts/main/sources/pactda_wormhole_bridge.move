// Copyright (c) Bonchain Team

/// This module implements the PactDa Wormhole bridge, facilitating cross-chain
/// interactions for PactDa contracts using Wormhole's generic message passing.
/// It allows sending contract updates (like milestone approvals or status changes)
/// to other chains and processing similar messages received from registered
/// foreign contracts via Wormhole VAAs.
module pactda::pactda_wormhole_bridge;
    // Sui Framework Imports
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::coin::{Self, Coin}; // Removed unused Coin/SUI imports
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::sui::SUI;

    // Standard Library Imports
    use std::vector;
    // use std::string::{Self, String}; // String not currently used

    // Wormhole Core Imports
    use wormhole::emitter::{Self, EmitterCap};
    use wormhole::vaa::{Self as VAA}; // Alias for clarity
    use wormhole::bytes32::{Self};
    use wormhole::external_address::{Self, ExternalAddress};
    use wormhole::publish_message::{Self as WormholePublish, MessageTicket}; // Alias for clarity
    use wormhole::state::{State as WormholeState};

    // PactDa Core Import
    use pactda::pactda::{Self as PactDa, PactDaContract}; // Alias for clarity

    // === Constants ===

    /// Error code for operations restricted to the bridge owner.
    const E_NOT_OWNER: u64 = 0;
    /// Error code for operations involving an unregistered or invalid chain ID.
    const E_INVALID_CHAIN_ID: u64 = 1;
    /// Error code for operations involving an invalid contract address (currently unused but reserved).
    const E_INVALID_CONTRACT_ADDRESS: u64 = 2;
    /// Error code for processing a message with an unrecognized action type.
    const E_INVALID_ACTION: u64 = 3;
    /// Error code for attempting to process a VAA that has already been processed.
    const E_MESSAGE_ALREADY_PROCESSED: u64 = 4;
    /// Error code for receiving a VAA from an emitter not registered for the source chain.
    const E_UNAUTHORIZED_MESSENGER: u64 = 5;

    // Wormhole Chain IDs (Reference)
    // const CHAIN_ID_ETH: u16 = 2;
    // const CHAIN_ID_BSC: u16 = 4;
    // const CHAIN_ID_POLYGON: u16 = 5;
    // const CHAIN_ID_AVAX: u16 = 6;
    // const CHAIN_ID_SUI: u16 = 21;

    /// Action type identifier for approving a milestone via cross-chain message.
    const ACTION_APPROVE_MILESTONE: u8 = 0;
    /// Action type identifier for initiating a dispute via cross-chain message.
    const ACTION_DISPUTE: u8 = 1;
    /// Action type identifier for verifying a VCNFT via cross-chain message.
    const ACTION_VERIFY_VCNFT: u8 = 2;
    /// Action type identifier for updating contract status via cross-chain message.
    const ACTION_CONTRACT_STATUS_UPDATE: u8 = 3;
    /// Action type identifier for updating escrow status via cross-chain message.
    const ACTION_ESCROW_STATUS_UPDATE: u8 = 4;

    // === Structs ===

    /// The main state object for the PactDa Wormhole Bridge.
    /// Contains configuration, Wormhole interaction capabilities, and state tracking.
    public struct PactDaBridge has key {
        id: UID,
        /// Address authorized to configure the bridge (e.g., register foreign contracts).
        owner: address,
        /// The Object ID of the core Wormhole State object on Sui.
        wormhole_state: ID,
        /// The capability object required to emit messages via Wormhole.
        emitter_cap: EmitterCap,
        /// Maps Wormhole chain IDs to the registered PactDa contract addresses on those chains.
        /// Addresses are stored as `vector<u8>` (typically 32 bytes).
        registered_contracts: Table<u16, vector<u8>>,
        /// Tracks processed VAA digests (as `vector<u8>`) and associated metadata to prevent replays and provide logs.
        processed_vaas: Table<vector<u8>, ProcessedVaaInfo>,
    }

    /// Stores key metadata about a processed VAA for logging and replay protection.
    public struct ProcessedVaaInfo has copy, drop, store {
        /// The sequence number of the VAA.
        sequence: u64,
        /// The timestamp from the VAA header.
        timestamp: u32, // Corrected type based on VAA::timestamp return type
        /// The source chain ID from the VAA header.
        source_chain: u16,
        // Consider adding source_address (vector<u8>) if needed for off-chain queries.
    }

    // === Events ===

    /// Emitted when a cross-chain message (VAA) is successfully processed.
    public struct CrossChainMessageReceived has copy, drop {
        /// Wormhole chain ID of the source chain.
        source_chain: u16,
        /// Address of the registered contract on the source chain that emitted the message.
        source_address: vector<u8>,
        /// The action type parsed from the message payload.
        action_type: u8,
        /// Placeholder hash representing the processed message (currently the full VAA bytes).
        message_hash: vector<u8> // Consider using VAA digest for consistency
    }

    /// Emitted when a milestone is approved based on a cross-chain message.
    public struct MilestoneApprovedCrossChain has copy, drop {
        /// Sui address of the target PactDa contract.
        contract_address: address,
        /// ID of the approved milestone.
        milestone_id: u64,
        /// Wormhole chain ID of the source chain that initiated the approval.
        source_chain: u16
    }

    /// Emitted when a contract's status is updated based on a cross-chain message.
    public struct ContractStatusUpdatedCrossChain has copy, drop {
        /// Sui address of the target PactDa contract.
        contract_address: address,
        /// The new status set for the contract.
        new_status: u8,
        /// Wormhole chain ID of the source chain that initiated the update.
        source_chain: u16
    }

    /// Emitted when a foreign contract address is registered or updated for a specific chain ID.
    public struct ForeignContractRegistered has copy, drop {
        /// Wormhole chain ID for which the contract is registered.
        chain_id: u16,
        /// Address of the foreign contract (typically 32 bytes).
        contract_address: vector<u8>
    }

    // === Initialization ===

    /// Initializes the PactDa Wormhole Bridge.
    /// Creates the `PactDaBridge` shared object, obtains an `EmitterCap` from Wormhole,
    /// and sets the initial owner.
    /// @param wormhole_state_id: The object ID of the deployed Wormhole `State` object.
    public entry fun initialize(
        wormhole_state: &WormholeState,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Create an emitter capability for sending messages via Wormhole.
        let emitter_cap = emitter::new(wormhole_state, ctx);

        let bridge = PactDaBridge {
            id: object::new(ctx),
            owner: sender,
            wormhole_state: object::id(wormhole_state), // Store the ID of the Wormhole state
            emitter_cap,
            registered_contracts: table::new(ctx),
            processed_vaas: table::new(ctx),
        };

        // Make the bridge object accessible network-wide.
        transfer::share_object(bridge);
    }

    // === Bridge Configuration ===

    /// Registers or updates the address of a corresponding PactDa contract on a foreign chain.
    /// Only the bridge `owner` can call this function.
    /// The `contract_address` should be the Wormhole-standard 32-byte representation.
    public entry fun register_foreign_contract(
        bridge: &mut PactDaBridge,
        chain_id: u16,
        contract_address: vector<u8>, // Expecting 32 bytes
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == bridge.owner, E_NOT_OWNER);

        // Use remove/add to simulate an upsert operation.
        if (table::contains(&bridge.registered_contracts, chain_id)) {
            let _old_address = table::remove(&mut bridge.registered_contracts, chain_id);
            // TODO: Consider logging or handling the removal of the old address if necessary.
        };
        table::add(&mut bridge.registered_contracts, chain_id, contract_address);

        event::emit(ForeignContractRegistered {
            chain_id,
            contract_address // Emitting the newly registered address
        });
    }

    /// Gets the fee required to publish a Wormhole message
    public fun fee(state: &WormholeState): u64 {
        wormhole::state::message_fee(state)
    }

    // === Outgoing Cross-Chain Messages ===

    /// Prepares a message to approve a milestone on a foreign chain contract.
    /// This function serializes the necessary data and creates a `MessageTicket`.
    /// The returned `MessageTicket` must be passed to `Wormhole::publish_message::publish_message`
    /// in the same transaction block, along with the required fee, to actually send the message.
    ///
    /// Arguments:
    /// - `bridge`: Mutable reference to the `PactDaBridge` state.
    /// - `target_chain`: The Wormhole chain ID of the destination chain.
    /// - `target_contract_id`: The identifier (e.g., 32-byte address) of the PactDa contract on the target chain.
    /// - `milestone_id`: The ID of the milestone being approved.
    /// - `_ctx`: Transaction context (currently unused but kept for potential future needs).
    public fun approve_milestone_cross_chain(
        bridge: &mut PactDaBridge,
        target_chain: u16,
        target_contract_id: vector<u8>, // Identifier for the contract on the target chain
        milestone_id: u64,
        _ctx: &mut TxContext // Mark unused
    ): MessageTicket {
        // Pre-flight check: Ensure the target chain has a registered contract.
        assert!(table::contains(&bridge.registered_contracts, target_chain), E_INVALID_CHAIN_ID);

        // Serialize the action-specific data.
        let payload = serialize_milestone_approval(target_contract_id, milestone_id);

        // Use the internal helper to prepare the Wormhole message ticket.
        prepare_wormhole_message(
            bridge,
            ACTION_APPROVE_MILESTONE,
            payload
        )
        // The MessageTicket is returned directly.
    }

    /// Prepares a message to update the status of a contract on a foreign chain.
    /// Similar to `approve_milestone_cross_chain`, this returns a `MessageTicket`
    /// that needs to be published via `Wormhole::publish_message::publish_message`.
    ///
    /// Arguments:
    /// - `bridge`: Mutable reference to the `PactDaBridge` state.
    /// - `target_chain`: The Wormhole chain ID of the destination chain.
    /// - `target_contract_id`: The identifier (e.g., 32-byte address) of the PactDa contract on the target chain.
    /// - `new_status`: The new status code to set for the contract.
    /// - `_ctx`: Transaction context (currently unused).
    public fun update_contract_status_cross_chain(
        bridge: &mut PactDaBridge,
        target_chain: u16,
        target_contract_id: vector<u8>, // Identifier for the contract on the target chain
        new_status: u8,
        _ctx: &mut TxContext // Mark unused
    ): MessageTicket {
        // Pre-flight check: Ensure the target chain has a registered contract.
        assert!(table::contains(&bridge.registered_contracts, target_chain), E_INVALID_CHAIN_ID);

        // Serialize the action-specific data.
        let payload = serialize_contract_status_update(target_contract_id, new_status);

        // Use the internal helper to prepare the Wormhole message ticket.
        prepare_wormhole_message(
            bridge,
            ACTION_CONTRACT_STATUS_UPDATE,
            payload
        )
        // The MessageTicket is returned directly.
     }

     // === Incoming Cross-Chain Messages ===

     /// Processes a verified Wormhole message (VAA) received from a registered foreign contract.
     /// This function verifies the VAA, checks for replays, validates the sender,
     /// parses the payload, and dispatches the action to the appropriate handler function.
     ///
     /// NOTE: This function requires the caller (e.g., relayer) to provide the specific
     /// `PactDaContract` object instance that the message targets. Determining this target
     /// usually requires an off-chain lookup or a mechanism within the payload itself
     /// (like a unique cross-chain ID) which is not implemented in this basic version.
     ///
     /// Arguments:
     /// - `bridge`: Mutable reference to the `PactDaBridge` state.
     /// - `wormhole_state`: Immutable reference to the core Wormhole `State` object (needed for VAA verification).
     /// - `clock`: Reference to the Sui `Clock` object (needed for VAA verification).
     /// - `vaa_bytes`: The raw byte representation of the Signed VAA.
     /// - `target_contract`: Mutable reference to the specific `PactDaContract` object this message applies to.
     /// - `ctx`: Transaction context.
     public entry fun process_message(
         bridge: &mut PactDaBridge,
         wormhole_state: &WormholeState, // Use alias WormholeState if preferred
         clock: &Clock,
         vaa_bytes: vector<u8>,
         target_contract: &mut PactDaContract,
         ctx: &mut TxContext
     ) {
        // 1. Parse and Verify the VAA using the core Wormhole contract.
        //    This checks signatures against the guardian set and VAA structure.
        let vaa = VAA::parse_and_verify(wormhole_state, vaa_bytes, clock);

        // 2. Replay Protection: Check if this VAA's digest has already been processed.
        let vaa_digest = VAA::digest(&vaa); // Get the unique digest (double keccak256 hash of body)
        let vaa_digest_vec = bytes32::to_bytes(vaa_digest); // Convert Bytes32 to vector<u8> for table key
        assert!(!table::contains(&bridge.processed_vaas, vaa_digest_vec), E_MESSAGE_ALREADY_PROCESSED);

        // 3. Extract relevant information from the verified VAA header.
        let emitter_chain = VAA::emitter_chain(&vaa);
        let emitter_address_external = VAA::emitter_address(&vaa); // Wormhole ExternalAddress type
        let sequence = VAA::sequence(&vaa); // Extract sequence
        let timestamp = VAA::timestamp(&vaa); // Extract timestamp
        let payload = VAA::payload(&vaa); // The actual message content

        // Mark this VAA digest as processed by storing its metadata.
        let processed_info = ProcessedVaaInfo {
            sequence,
            timestamp, // Use extracted timestamp
            source_chain: emitter_chain, // Use extracted emitter_chain
        };
        table::add(&mut bridge.processed_vaas, vaa_digest_vec, processed_info);


        // 4. Authorization: Verify the message came from a registered contract on the source chain.
        assert!(table::contains(&bridge.registered_contracts, emitter_chain), E_INVALID_CHAIN_ID);
        let registered_address_vec = table::borrow(&bridge.registered_contracts, emitter_chain);
        // Compare the VAA's emitter address (converted to bytes) with the registered address bytes.
        assert!(
            external_address::to_bytes(emitter_address_external) == *registered_address_vec,
            E_UNAUTHORIZED_MESSENGER
        );

        // 5. Parse the custom payload structure (Action Type + Action Data).
        let (action_type, action_payload) = parse_payload(payload);

        // 6. Dispatch to the appropriate handler based on the action type.
        //    Pass the target contract object and context to the handlers.
         if (action_type == ACTION_APPROVE_MILESTONE) {
             handle_milestone_approval(target_contract, action_payload, emitter_chain, emitter_address_external, ctx);
         } else if (action_type == ACTION_DISPUTE) {
             handle_dispute(target_contract, action_payload, emitter_chain, emitter_address_external, ctx);
         } else if (action_type == ACTION_VERIFY_VCNFT) {
             handle_vcnft_verification(target_contract, action_payload, emitter_chain, emitter_address_external, ctx);
         } else if (action_type == ACTION_CONTRACT_STATUS_UPDATE) {
             handle_contract_status_update(target_contract, action_payload, emitter_chain, emitter_address_external, ctx);
         } else if (action_type == ACTION_ESCROW_STATUS_UPDATE) {
             handle_escrow_status_update(target_contract, action_payload, emitter_chain, emitter_address_external, ctx);
         } else {
            // Abort if the action type is not recognized.
            abort E_INVALID_ACTION
         };
 
         // 8. Emit an event confirming the message was received and processed.
         event::emit(CrossChainMessageReceived {
            source_chain: emitter_chain,
            source_address: *registered_address_vec, // Use the verified registered address
            action_type,
            message_hash: vaa_digest_vec // Use the VAA digest as the unique message hash
        });

        destroy(vaa);

    }

    // === Internal Helper Functions ===

    /// Internal helper to prepare a Wormhole message payload and create a `MessageTicket`.
    /// This function encapsulates the common logic for preparing messages to be sent via Wormhole.
    /// It prepends the `action_type` to the provided `payload`.
    /// The nonce management strategy needs careful consideration (currently hardcoded to 0).
    fun prepare_wormhole_message(
        bridge: &mut PactDaBridge,
        action_type: u8,
        action_specific_payload: vector<u8> // Renamed for clarity
    ): MessageTicket {
        // Construct the full payload: [action_type (1 byte)] [action_specific_payload]
        let mut full_payload = vector::empty<u8>();
        vector::push_back(&mut full_payload, action_type);
        vector::append(&mut full_payload, action_specific_payload);

        // Define nonce for the Wormhole message.
        // TODO: Implement a robust nonce strategy (e.g., incrementing counter per emitter,
        // or deriving from context). Using 0 is suitable only for simple cases.
        let nonce: u32 = 0;

        // Use the Wormhole core function to prepare the message ticket using the bridge's emitter capability.
        WormholePublish::prepare_message(
            &mut bridge.emitter_cap,
            nonce,
            full_payload
        )
         // The MessageTicket is returned.
     }
 
     // === Serialization Helpers ===

    /// Serializes the data required for a cross-chain milestone approval message.
    /// Payload format: `[target_contract_id (bytes)] [milestone_id (u64 big-endian)]`
    fun serialize_milestone_approval(target_contract_id: vector<u8>, milestone_id: u64): vector<u8> {
        let mut payload = vector::empty<u8>();

        // Append target contract identifier (e.g., 32-byte address).
        vector::append(&mut payload, target_contract_id);

        // Append milestone ID as 8-byte big-endian.
        let mut milestone_bytes = vector::empty<u8>();
        let mut i = 0;
        while (i < 8) {
            // Shift and mask to get the i-th byte (big-endian order).
            let byte = ((milestone_id >> (8 * (7 - i))) & 0xFF) as u8;
            vector::push_back(&mut milestone_bytes, byte);
            i = i + 1;
        };
        vector::append(&mut payload, milestone_bytes);

        payload
    }

    /// Serializes the data required for a cross-chain contract status update message.
    /// Payload format: `[target_contract_id (bytes)] [new_status (u8)]`
    fun serialize_contract_status_update(target_contract_id: vector<u8>, new_status: u8): vector<u8> {
        let mut payload = vector::empty<u8>();

        // Append target contract identifier.
        vector::append(&mut payload, target_contract_id);

        // Append the new status byte.
        vector::push_back(&mut payload, new_status);

        payload
    }

    // === Deserialization & Action Handlers ===

    /// Parses the common payload structure: extracts the action type (first byte)
    /// and the remaining action-specific payload.
    fun parse_payload(payload: vector<u8>): (u8, vector<u8>) {
        assert!(vector::length(&payload) > 0, E_INVALID_ACTION); // Ensure payload is not empty

        // First byte is the action type.
        let action_type = *vector::borrow(&payload, 0);

        // The rest of the vector is the action-specific payload.
        // Manually copy elements from index 1 onwards into a new vector.
        let mut action_payload = vector::empty<u8>();
        let mut i = 1;
        let len = vector::length(&payload);
        while (i < len) {
            vector::push_back(&mut action_payload, *vector::borrow(&payload, i));
            i = i + 1;
        };

         (action_type, action_payload)
     }

     /// Handles the `ACTION_APPROVE_MILESTONE` message.
     /// Deserializes the milestone ID and calls the core PactDa contract function.
     fun handle_milestone_approval(
         contract: &mut PactDaContract,
         payload: vector<u8>,
         source_chain: u16,
         _source_address: ExternalAddress, // Mark unused
         ctx: &mut TxContext
     ) {
         // --- Deserialization ---
         // Assumes payload format: [target_contract_id (bytes)] [milestone_id (u64 big-endian bytes)]
         // We only need the milestone_id here, assuming target_contract_id was used for routing.
         let payload_len = vector::length(&payload);
         assert!(payload_len >= 8, E_INVALID_ACTION); // Ensure payload is long enough for milestone_id

         // Extract milestone ID (last 8 bytes, big-endian).
         let mut milestone_id = 0u64;
         let mut i = payload_len - 8; // Start index of milestone_id
         while (i < payload_len) {
             milestone_id = (milestone_id << 8) | (*vector::borrow(&payload, i) as u64);
             i = i + 1;
         };

         // --- Authorization Check ---
         // TODO: Implement robust authorization. Should the source_address or source_chain
         //       be checked against roles defined in the PactDaContract?
         // For now, we assume the message is authorized if it passed VAA verification.

         // --- Execute Action ---
         // Call the designated function in the core PactDa module.
         PactDa::approve_milestone_from_bridge(contract, milestone_id, ctx);

         // --- Emit Event ---
         let contract_sui_address = object::id_address(contract);
         event::emit(MilestoneApprovedCrossChain {
             contract_address: contract_sui_address,
             milestone_id,
             source_chain
         });
     }

     /// Placeholder handler for the `ACTION_DISPUTE` message.
     fun handle_dispute(
         _contract: &mut PactDaContract, // Mark unused
         _payload: vector<u8>, // Mark unused
         _source_chain: u16, // Mark unused
         _source_address: ExternalAddress, // Mark unused
         _ctx: &mut TxContext // Mark unused
     ) {
         // TODO: Implement dispute handling logic.
         // - Deserialize payload specific to dispute actions.
         // - Perform authorization checks.
         // - Call the appropriate function in the PactDa core module.
         // - Emit relevant events.
         abort(99); // Abort with a placeholder code until implemented
     }

     /// Placeholder handler for the `ACTION_VERIFY_VCNFT` message.
     fun handle_vcnft_verification(
         _contract: &mut PactDaContract, // Mark unused
         _payload: vector<u8>, // Mark unused
         _source_chain: u16, // Mark unused
         _source_address: ExternalAddress, // Mark unused
         _ctx: &mut TxContext // Mark unused
     ) {
         // TODO: Implement VCNFT verification logic.
         // - Deserialize payload specific to VCNFT verification.
         // - Perform authorization checks.
         // - Call the appropriate function in the PactDa core module.
         // - Emit relevant events.
         abort(99); // Abort with a placeholder code until implemented
     }

     /// Handles the `ACTION_CONTRACT_STATUS_UPDATE` message.
     /// Deserializes the new status and calls the core PactDa contract function.
     fun handle_contract_status_update(
         contract: &mut PactDaContract,
         payload: vector<u8>,
         source_chain: u16,
         _source_address: ExternalAddress, // Mark unused
         ctx: &mut TxContext
     ) {
         // --- Deserialization ---
         // Assumes payload format: [target_contract_id (bytes)] [new_status (u8)]
         // We only need the new_status here.
         let payload_len = vector::length(&payload);
         assert!(payload_len >= 1, E_INVALID_ACTION); // Ensure payload has at least the status byte

         // Extract new status (last byte).
         let new_status = *vector::borrow(&payload, payload_len - 1);

         // --- Authorization Check ---
         // TODO: Implement robust authorization.

         // --- Execute Action ---
         PactDa::update_status_from_bridge(contract, new_status, ctx);

         // --- Emit Event ---
         let contract_sui_address = object::id_address(contract);
         event::emit(ContractStatusUpdatedCrossChain {
             contract_address: contract_sui_address,
             new_status,
             source_chain
         });
     }

     /// Placeholder handler for the `ACTION_ESCROW_STATUS_UPDATE` message.
     fun handle_escrow_status_update(
         _contract: &mut PactDaContract, // Mark unused
         _payload: vector<u8>, // Mark unused
         _source_chain: u16, // Mark unused
         _source_address: ExternalAddress, // Mark unused
         _ctx: &mut TxContext // Mark unused
     ) {
         // TODO: Implement escrow status update logic.
         // - Deserialize payload specific to escrow updates.
         // - Perform authorization checks.
         // - Call the appropriate function in the PactDa core module or escrow module.
         // - Emit relevant events.
         abort(99); // Abort with a placeholder code until implemented
     }

    fun destroy(vaa: VAA::VAA) {
        VAA::take_payload(vaa);
    }



