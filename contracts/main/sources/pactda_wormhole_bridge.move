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
    use sui::event;
    use sui::clock::{Self, Clock};
    // Removed unused sui::coin and sui::sui imports

    // Standard Library Imports
    use std::vector;
    use std::string::{Self, String};
    use std::option::{Self, Option}; // Added import for Option

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

    /// Expected length of a foreign contract identifier (e.g., 32-byte address).
    const FOREIGN_CONTRACT_ID_LENGTH: u64 = 32;

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
    /// Action type identifier for a cross-chain party B signing the contract.
    const ACTION_SIGN_CONTRACT_PARTY_B: u8 = 5;
    /// Action type identifier for updating contract details (e.g., title, terms) via cross-chain message.
    const ACTION_UPDATE_CONTRACT_DETAILS: u8 = 6;
    /// Action type identifier for submitting proof for a milestone via cross-chain message.
    const ACTION_SUBMIT_PROOF_PARTY_B: u8 = 7;
    /// Action type identifier for creating a contract stub on a side chain (outgoing message).
    const ACTION_CREATE_SIDE_CHAIN_STUB: u8 = 8; // For outgoing message to create stub

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

    /// Represents the data that can be updated for a contract via a cross-chain message.
    /// Used as an argument when preparing an outgoing message to update contract details.
    public struct ContractUpdateData has drop {
        title: Option<String>,
        terms_reference: Option<String>,
        contract_start_date: Option<u64>,
        contract_deadline_date: Option<u64>,
        metadata: Option<vector<u8>>, // Metadata is typically raw bytes
        contract_type: Option<u8>
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

    /// Emitted when Party B signs the contract based on a cross-chain message.
    public struct ContractSignedPartyBCrossChain has copy, drop {
        /// Sui address of the target PactDa contract.
        contract_address: address,
        /// Wormhole chain ID of the source chain that initiated the signing.
        source_chain: u16
    }

    /// Emitted when contract details are updated based on a cross-chain message.
    public struct ContractDetailsUpdatedCrossChain has copy, drop {
        /// Sui address of the target PactDa contract.
        contract_address: address,
        /// Wormhole chain ID of the source chain that initiated the update.
        source_chain: u16
        // Consider adding fields for what was updated if needed for off-chain indexing.
    }

    /// Emitted when proof for a milestone is submitted by Party B based on a cross-chain message.
    public struct ProofSubmittedPartyBCrossChain has copy, drop {
        /// Sui address of the target PactDa contract.
        contract_address: address,
        /// ID of the milestone for which proof was submitted.
        milestone_id: u64,
        /// Wormhole chain ID of the source chain that initiated the proof submission.
        source_chain: u16
        // proof_reference could be included if it's small enough and useful for events.
    }

    /// Emitted when a request to create a side-chain contract stub is sent.
    public struct SideChainStubCreationRequested has copy, drop {
        /// Sui ID of the PactDa contract for which the stub is requested.
        sui_contract_id: ID,
        /// Target Wormhole chain ID for the stub creation.
        target_chain: u16,
        /// Title of the contract.
        title: vector<u8>, // Using vector<u8> for string to be generic
        /// Terms reference of the contract.
        terms_reference: vector<u8>
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

    /// Prepares a message to request the creation of a contract stub on a foreign chain.
    /// This is typically called when a contract is created or submitted for review on Sui,
    /// to notify the other chain.
    /// Returns a `MessageTicket` to be published via Wormhole.
    ///
    /// Arguments:
    /// - `bridge`: Mutable reference to the `PactDaBridge` state.
    /// - `target_chain`: The Wormhole chain ID of the destination chain.
    /// - `sui_contract_id`: The Sui Object ID of the `PactDaContract`.
    /// - `title`: The title of the contract.
    /// - `terms_reference`: The terms reference (e.g., IPFS hash) for the contract.
    /// - `_ctx`: Transaction context (currently unused).
    public fun send_create_stub_message(
        bridge: &mut PactDaBridge,
        target_chain: u16,
        sui_contract_id: ID,
        title: String,
        terms_reference: String,
        _ctx: &mut TxContext // Mark unused
    ): MessageTicket {
        // Pre-flight check: Ensure the target chain has a registered contract (optional,
        // as stub creation might not require a full contract on the other side yet,
        // but good practice if messages are directed to a specific bridge/handler).
        // For now, let's assume it's good to check.
        assert!(table::contains(&bridge.registered_contracts, target_chain), E_INVALID_CHAIN_ID);

        // Serialize the action-specific data.
        let sui_contract_id_bytes = object::id_to_bytes(&sui_contract_id);
        let title_bytes = string::bytes(&title);
        let terms_bytes = string::bytes(&terms_reference);

        let payload = serialize_create_side_chain_stub(
            sui_contract_id_bytes,
            *title_bytes,
            *terms_bytes
        );

        // Emit event
        event::emit(SideChainStubCreationRequested {
            sui_contract_id,
            target_chain,
            title: *title_bytes, // Event stores bytes
            terms_reference: *terms_bytes // Event stores bytes
        });

        // Use the internal helper to prepare the Wormhole message ticket.
        prepare_wormhole_message(
            bridge,
            ACTION_CREATE_SIDE_CHAIN_STUB,
            payload
        )
        // The MessageTicket is returned directly.
    }

    /// Prepares a message to indicate Party B has signed the contract on a foreign chain.
    /// Returns a `MessageTicket` to be published via Wormhole.
    public fun sign_contract_party_b_cross_chain(
        bridge: &mut PactDaBridge,
        target_chain: u16,
        target_contract_id: vector<u8>, // Identifier for the contract on the target chain
        _ctx: &mut TxContext
    ): MessageTicket {
        assert!(table::contains(&bridge.registered_contracts, target_chain), E_INVALID_CHAIN_ID);
        let payload = serialize_sign_contract_party_b(target_contract_id);
        prepare_wormhole_message(
            bridge,
            ACTION_SIGN_CONTRACT_PARTY_B,
            payload
        )
    }

    /// Prepares a message to update contract details (title, terms) on a foreign chain.
    /// Returns a `MessageTicket` to be published via Wormhole.
    public fun update_contract_details_cross_chain(
        bridge: &mut PactDaBridge,
        target_chain: u16,
        target_contract_id: vector<u8>,
        update_data: ContractUpdateData, // Changed to use ContractUpdateData
        _ctx: &mut TxContext
    ): MessageTicket {
        assert!(table::contains(&bridge.registered_contracts, target_chain), E_INVALID_CHAIN_ID);
        // Call the new serialization function that handles optional fields
        let payload = serialize_optional_contract_details(target_contract_id, &update_data);
        prepare_wormhole_message(
            bridge,
            ACTION_UPDATE_CONTRACT_DETAILS,
            payload
        )
    }

    /// Prepares a message for Party B to submit proof for a milestone on a foreign chain.
    /// Returns a `MessageTicket` to be published via Wormhole.
    public fun submit_proof_party_b_cross_chain(
        bridge: &mut PactDaBridge,
        target_chain: u16,
        target_contract_id: vector<u8>,
        milestone_id: u64,
        proof_reference: String, // Use String for user-friendliness
        _ctx: &mut TxContext
    ): MessageTicket {
        assert!(table::contains(&bridge.registered_contracts, target_chain), E_INVALID_CHAIN_ID);
        let proof_bytes = string::bytes(&proof_reference);
        let payload = serialize_submit_proof_party_b(target_contract_id, milestone_id, *proof_bytes);
        prepare_wormhole_message(
            bridge,
            ACTION_SUBMIT_PROOF_PARTY_B,
            payload
        )
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
         } else if (action_type == ACTION_SIGN_CONTRACT_PARTY_B) {
            handle_sign_contract_party_b(target_contract, action_payload, emitter_chain, emitter_address_external, ctx);
         } else if (action_type == ACTION_UPDATE_CONTRACT_DETAILS) {
            handle_update_contract_details(target_contract, action_payload, emitter_chain, emitter_address_external, ctx);
         } else if (action_type == ACTION_SUBMIT_PROOF_PARTY_B) {
            handle_submit_proof_party_b(target_contract, action_payload, emitter_chain, emitter_address_external, ctx);
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

    // Presence mask bits for optional fields in contract details update
    const PRESENCE_TITLE: u8 = 1; // 00000001
    const PRESENCE_TERMS_REFERENCE: u8 = 2; // 00000010
    const PRESENCE_CONTRACT_START_DATE: u8 = 4; // 00000100
    const PRESENCE_CONTRACT_DEADLINE_DATE: u8 = 8; // 00001000
    const PRESENCE_METADATA: u8 = 16; // 00010000
    const PRESENCE_CONTRACT_TYPE: u8 = 32; // 00100000

    /// Appends a u64 value to a byte vector in big-endian format.
    fun append_u64_big_endian(payload: &mut vector<u8>, value: u64) {
        let mut i = 0;
        while (i < 8) {
            let byte = ((value >> (8 * (7 - i))) & 0xFF) as u8;
            vector::push_back(payload, byte);
            i = i + 1;
        };
    }

    /// Appends a vector<u8> (like a string's bytes) to the payload, prefixed with its length as u8.
    fun append_vec_u8_with_u8_len(payload: &mut vector<u8>, data: &vector<u8>) {
        let len = vector::length(data);
        assert!(len <= 255, E_INVALID_ACTION); // Max u8
        vector::push_back(payload, len as u8);
        vector::append(payload, *data);
    }

    /// Appends a vector<u8> (like a string's bytes or metadata) to the payload, prefixed with its length as u16 (big-endian).
    fun append_vec_u8_with_u16_len(payload: &mut vector<u8>, data: &vector<u8>) {
        let len = vector::length(data);
        assert!(len <= 65535, E_INVALID_ACTION); // Max u16
        vector::push_back(payload, (len >> 8) as u8); // High byte
        vector::push_back(payload, (len & 0xFF) as u8); // Low byte
        vector::append(payload, *data);
    }

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

    /// Serializes the data required for creating a side-chain contract stub.
    /// Payload format: `[sui_contract_id (32 bytes)] [title_len (u8)] [title (bytes)] [terms_len (u16)] [terms_reference (bytes)]`
    /// Note: sui_contract_id is the ID of the contract on Sui, not the target_contract_id on the foreign chain.
    fun serialize_create_side_chain_stub(
        sui_contract_id_bytes: vector<u8>, // Should be 32 bytes from ID::to_bytes
        title: vector<u8>,
        terms_reference: vector<u8>
    ): vector<u8> {
        let mut payload = vector::empty<u8>();

        // Append Sui Contract ID (32 bytes)
        assert!(vector::length(&sui_contract_id_bytes) == 32, E_INVALID_CONTRACT_ADDRESS); // Assuming ID::to_bytes gives 32 bytes
        vector::append(&mut payload, sui_contract_id_bytes);

        // Append title length (u8) and title
        let title_len = vector::length(&title);
        assert!(title_len <= 255, E_INVALID_ACTION); // Max u8
        vector::push_back(&mut payload, title_len as u8);
        vector::append(&mut payload, title);

        // Append terms_reference length (u16 big-endian) and terms_reference
        let terms_len = vector::length(&terms_reference);
        assert!(terms_len <= 65535, E_INVALID_ACTION); // Max u16
        vector::push_back(&mut payload, (terms_len >> 8) as u8); // High byte
        vector::push_back(&mut payload, (terms_len & 0xFF) as u8); // Low byte
        vector::append(&mut payload, terms_reference);

        payload
    }

    /// Serializes the data for a Party B signing action.
    /// Payload format: `[target_contract_id (bytes)]`
    /// (Optionally, could include party B's signature or identifier if needed for the target chain)
    fun serialize_sign_contract_party_b(target_contract_id: vector<u8>): vector<u8> {
        let mut payload = vector::empty<u8>();
        // Append target contract identifier.
        vector::append(&mut payload, target_contract_id);
        payload
    }

    /// Serializes the data for updating contract details, handling optional fields.
    /// Payload format: `[target_contract_id (32b)] [presence_mask (u8)] [optional_fields_data...]`
    /// Optional fields data (if present, in order of presence_mask bits):
    /// 1. title: `[len (u8)] [bytes]`
    /// 2. terms_reference: `[len (u16)] [bytes]`
    /// 3. contract_start_date: `[u64]`
    /// 4. contract_deadline_date: `[u64]`
    /// 5. metadata: `[len (u16)] [bytes]`
    /// 6. contract_type: `[u8]`
    fun serialize_optional_contract_details(
        target_contract_id: vector<u8>,
        update_data: &ContractUpdateData
    ): vector<u8> {
        let mut presence_mask = 0u8;
        let mut optional_payload_part = vector::empty<u8>();

        // Title (Optional<String>)
        if (option::is_some(&update_data.title)) {
            presence_mask = presence_mask | PRESENCE_TITLE;
            let title_str_ref = option::borrow(&update_data.title);
            let title_bytes = string::bytes(title_str_ref);
            append_vec_u8_with_u8_len(&mut optional_payload_part, title_bytes);
        };

        // Terms Reference (Optional<String>)
        if (option::is_some(&update_data.terms_reference)) {
            presence_mask = presence_mask | PRESENCE_TERMS_REFERENCE;
            let terms_str_ref = option::borrow(&update_data.terms_reference);
            let terms_bytes = string::bytes(terms_str_ref);
            append_vec_u8_with_u16_len(&mut optional_payload_part, terms_bytes);
        };

        // Contract Start Date (Optional<u64>)
        if (option::is_some(&update_data.contract_start_date)) {
            presence_mask = presence_mask | PRESENCE_CONTRACT_START_DATE;
            let start_date_ref = option::borrow(&update_data.contract_start_date);
            append_u64_big_endian(&mut optional_payload_part, *start_date_ref);
        };

        // Contract Deadline Date (Optional<u64>)
        if (option::is_some(&update_data.contract_deadline_date)) {
            presence_mask = presence_mask | PRESENCE_CONTRACT_DEADLINE_DATE;
            let deadline_date_ref = option::borrow(&update_data.contract_deadline_date);
            append_u64_big_endian(&mut optional_payload_part, *deadline_date_ref);
        };

        // Metadata (Optional<vector<u8>>)
        if (option::is_some(&update_data.metadata)) {
            presence_mask = presence_mask | PRESENCE_METADATA;
            let metadata_ref = option::borrow(&update_data.metadata);
            append_vec_u8_with_u16_len(&mut optional_payload_part, metadata_ref);
        };

        // Contract Type (Optional<u8>)
        if (option::is_some(&update_data.contract_type)) {
            presence_mask = presence_mask | PRESENCE_CONTRACT_TYPE;
            let contract_type_ref = option::borrow(&update_data.contract_type);
            vector::push_back(&mut optional_payload_part, *contract_type_ref);
        };

        // Now, construct the final payload
        let mut final_payload = vector::empty<u8>();
        assert!(vector::length(&target_contract_id) == FOREIGN_CONTRACT_ID_LENGTH, E_INVALID_CONTRACT_ADDRESS);
        vector::append(&mut final_payload, target_contract_id); // target_contract_id first
        vector::push_back(&mut final_payload, presence_mask);    // then presence_mask
        vector::append(&mut final_payload, optional_payload_part); // then the actual optional data

        final_payload
    }

    /// Serializes the data for submitting proof by Party B.
    /// Payload format: `[target_contract_id (bytes)] [milestone_id (u64 big-endian)] [proof_ref_len (u16 big-endian)] [proof_reference (bytes)]`
    fun serialize_submit_proof_party_b(
        target_contract_id: vector<u8>,
        milestone_id: u64,
        proof_reference: vector<u8>
    ): vector<u8> {
        let mut payload = vector::empty<u8>();

        // Append target contract identifier.
        vector::append(&mut payload, target_contract_id);

        // Append milestone ID as 8-byte big-endian.
        let mut i = 0;
        while (i < 8) {
            let byte = ((milestone_id >> (8 * (7 - i))) & 0xFF) as u8;
            vector::push_back(&mut payload, byte);
            i = i + 1;
        };

        // Append proof_reference length (u16 big-endian) and proof_reference
        let proof_ref_len = vector::length(&proof_reference);
        assert!(proof_ref_len <= 65535, E_INVALID_ACTION); // Max u16
        vector::push_back(&mut payload, (proof_ref_len >> 8) as u8); // High byte
        vector::push_back(&mut payload, (proof_ref_len & 0xFF) as u8); // Low byte
        vector::append(&mut payload, proof_reference);

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
         // Action_payload format: `[foreign_contract_id (32 bytes)] [milestone_id (u64 big-endian bytes)]`
         // The foreign_contract_id is skipped as routing to the Sui contract is already done.
         let payload_len = vector::length(&payload);
         assert!(payload_len == FOREIGN_CONTRACT_ID_LENGTH + 8, E_INVALID_ACTION); // foreign_id + milestone_id

         // Extract milestone ID (last 8 bytes, big-endian).
         let mut milestone_id = 0u64;
         // Start index of milestone_id is after the foreign_contract_id.
         let mut i = FOREIGN_CONTRACT_ID_LENGTH; 
         let end_i = FOREIGN_CONTRACT_ID_LENGTH + 8;
         while (i < end_i) {
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
         payload: vector<u8>, // Action_payload format: `[foreign_contract_id (32 bytes)] [new_status (u8)]`
         source_chain: u16,
         _source_address: ExternalAddress, // Mark unused
         ctx: &mut TxContext
     ) {
         // --- Deserialization ---
         // The foreign_contract_id is skipped.
         let payload_len = vector::length(&payload);
         assert!(payload_len == FOREIGN_CONTRACT_ID_LENGTH + 1, E_INVALID_ACTION); // foreign_id + status_byte

         // Extract new status (byte after foreign_contract_id).
         let new_status = *vector::borrow(&payload, FOREIGN_CONTRACT_ID_LENGTH);

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

    /// Handles the `ACTION_SIGN_CONTRACT_PARTY_B` message.
    fun handle_sign_contract_party_b(
        contract: &mut PactDaContract,
        payload: vector<u8>, // Action_payload format: `[foreign_contract_id (32 bytes)]`
        source_chain: u16,
        _source_address: ExternalAddress,
        ctx: &mut TxContext
    ) {
        // --- Deserialization & Validation ---
        // The foreign_contract_id is present but not used directly in this handler,
        // as routing to the Sui contract is already done and VAA emitter is verified.
        // The action_payload for this action only contains the foreign_contract_id.
        assert!(vector::length(&payload) == FOREIGN_CONTRACT_ID_LENGTH, E_INVALID_ACTION);

        // --- Authorization Check ---
        // Authorization is primarily handled by VAA verification (emitter chain and address).

        // --- Execute Action ---
        PactDa::confirm_party_b_signed_from_bridge(contract, ctx);

        // --- Emit Event ---
        let contract_sui_address = object::id_address(contract);
        event::emit(ContractSignedPartyBCrossChain {
            contract_address: contract_sui_address,
            source_chain
        });
    }

    /// Handles the `ACTION_UPDATE_CONTRACT_DETAILS` message.
    /// Deserializes optional contract details based on a presence mask and calls the core PactDa contract function.
    /// Payload format: `[foreign_contract_id (32 bytes)] [presence_mask (u8)] [optional_fields_data...]`
    fun handle_update_contract_details(
        contract: &mut PactDaContract,
        payload: vector<u8>,
        source_chain: u16,
        _source_address: ExternalAddress,
        ctx: &mut TxContext
    ) {
        // --- Deserialization ---
        // Action_payload starts with foreign_contract_id (32 bytes), then presence_mask, then action-specific fields.
        // We skip the foreign_contract_id here as routing is already done.
        let mut current_idx = FOREIGN_CONTRACT_ID_LENGTH;
        let payload_len = vector::length(&payload);

        // Presence Mask (u8)
        assert!(payload_len > current_idx, E_INVALID_ACTION);
        let presence_mask = *vector::borrow(&payload, current_idx);
        current_idx = current_idx + 1;

        // Initialize Option variables for each field
        let mut title_option: Option<vector<u8>> = option::none();
        let mut terms_reference_option: Option<vector<u8>> = option::none();
        let mut contract_start_date_option: Option<u64> = option::none();
        let mut contract_deadline_date_option: Option<u64> = option::none();
        let mut metadata_option: Option<vector<u8>> = option::none();
        let mut contract_type_option: Option<u8> = option::none();

        // Title (Optional<vector<u8>>)
        if ((presence_mask & PRESENCE_TITLE) != 0) {
            assert!(payload_len > current_idx, E_INVALID_ACTION);
            let title_len = (*vector::borrow(&payload, current_idx)) as u64;
            current_idx = current_idx + 1;

            assert!(payload_len >= current_idx + title_len, E_INVALID_ACTION);
            let mut title_bytes = vector::empty<u8>();
            let mut i = 0;
            while (i < title_len) {
                vector::push_back(&mut title_bytes, *vector::borrow(&payload, current_idx + i));
                i = i + 1;
            };
            current_idx = current_idx + title_len;
            title_option = option::some(title_bytes);
        };

        // Terms Reference (Optional<vector<u8>>)
        if ((presence_mask & PRESENCE_TERMS_REFERENCE) != 0) {
            assert!(payload_len > current_idx + 1, E_INVALID_ACTION); // Need 2 bytes for length
            let terms_len_high = (*vector::borrow(&payload, current_idx)) as u64;
            let terms_len_low = (*vector::borrow(&payload, current_idx + 1)) as u64;
            let terms_len = (terms_len_high << 8) | terms_len_low;
            current_idx = current_idx + 2;

            assert!(payload_len >= current_idx + terms_len, E_INVALID_ACTION);
            let mut terms_bytes = vector::empty<u8>();
            let mut i = 0;
            while (i < terms_len) {
                vector::push_back(&mut terms_bytes, *vector::borrow(&payload, current_idx + i));
                i = i + 1;
            };
            current_idx = current_idx + terms_len;
            terms_reference_option = option::some(terms_bytes);
        };

        // Contract Start Date (Optional<u64>)
        if ((presence_mask & PRESENCE_CONTRACT_START_DATE) != 0) {
            assert!(payload_len >= current_idx + 8, E_INVALID_ACTION);
            let mut start_date = 0u64;
            let mut i = 0;
            while (i < 8) {
                start_date = (start_date << 8) | (*vector::borrow(&payload, current_idx + i) as u64);
                i = i + 1;
            };
            current_idx = current_idx + 8;
            contract_start_date_option = option::some(start_date);
        };

        // Contract Deadline Date (Optional<u64>)
        if ((presence_mask & PRESENCE_CONTRACT_DEADLINE_DATE) != 0) {
            assert!(payload_len >= current_idx + 8, E_INVALID_ACTION);
            let mut deadline_date = 0u64;
            let mut i = 0;
            while (i < 8) {
                deadline_date = (deadline_date << 8) | (*vector::borrow(&payload, current_idx + i) as u64);
                i = i + 1;
            };
            current_idx = current_idx + 8;
            contract_deadline_date_option = option::some(deadline_date);
        };

        // Metadata (Optional<vector<u8>>)
        if ((presence_mask & PRESENCE_METADATA) != 0) {
            assert!(payload_len > current_idx + 1, E_INVALID_ACTION); // Need 2 bytes for length
            let metadata_len_high = (*vector::borrow(&payload, current_idx)) as u64;
            let metadata_len_low = (*vector::borrow(&payload, current_idx + 1)) as u64;
            let metadata_len = (metadata_len_high << 8) | metadata_len_low;
            current_idx = current_idx + 2;

            assert!(payload_len >= current_idx + metadata_len, E_INVALID_ACTION);
            let mut metadata_bytes = vector::empty<u8>();
            let mut i = 0;
            while (i < metadata_len) {
                vector::push_back(&mut metadata_bytes, *vector::borrow(&payload, current_idx + i));
                i = i + 1;
            };
            current_idx = current_idx + metadata_len;
            metadata_option = option::some(metadata_bytes);
        };

        // Contract Type (Optional<u8>)
        if ((presence_mask & PRESENCE_CONTRACT_TYPE) != 0) {
            assert!(payload_len > current_idx, E_INVALID_ACTION);
            let contract_type_byte = *vector::borrow(&payload, current_idx);
            // current_idx = current_idx + 1; // Not strictly needed if it's the last field and no more fields follow
            contract_type_option = option::some(contract_type_byte);
        };

        // --- Execute Action ---
        PactDa::update_details_from_bridge(
            contract,
            title_option,
            terms_reference_option,
            contract_start_date_option,
            contract_deadline_date_option,
            metadata_option,
            contract_type_option,
            ctx
        );

        // --- Emit Event ---
        let contract_sui_address = object::id_address(contract);
        event::emit(ContractDetailsUpdatedCrossChain {
            contract_address: contract_sui_address,
            source_chain
        });
    }

    /// Handles the `ACTION_SUBMIT_PROOF_PARTY_B` message.
    /// Deserializes milestone ID and proof reference, then calls the core PactDa contract function.
    /// Action_payload format: `[foreign_contract_id (32 bytes)] [milestone_id (u64 big-endian)] [proof_ref_len (u16 big-endian)] [proof_reference (bytes)]`
    fun handle_submit_proof_party_b(
        contract: &mut PactDaContract,
        payload: vector<u8>, // Action_payload format: `[foreign_contract_id (32 bytes)] [milestone_id (u64)] [proof_ref_len (u16)] [proof_ref (bytes)]`
        source_chain: u16,
        _source_address: ExternalAddress,
        ctx: &mut TxContext
    ) {
        // --- Deserialization ---
        // Action_payload starts with foreign_contract_id (32 bytes), then action-specific fields.
        // We skip the foreign_contract_id here as routing is already done.
        let mut current_idx = FOREIGN_CONTRACT_ID_LENGTH;
        let payload_len = vector::length(&payload);

        // Milestone ID (u64 big-endian)
        assert!(payload_len >= current_idx + 8, E_INVALID_ACTION); // Check for milestone_id bytes
        let mut milestone_id = 0u64;
        let mut i = 0;
        while (i < 8) {
            milestone_id = (milestone_id << 8) | (*vector::borrow(&payload, current_idx + i) as u64);
            i = i + 1;
        };
        current_idx = current_idx + 8;

        // Proof Reference Length (u16 big-endian)
        assert!(payload_len >= current_idx + 2, E_INVALID_ACTION); // Check for proof_ref_len bytes
        let proof_ref_len_high = (*vector::borrow(&payload, current_idx)) as u64;
        let proof_ref_len_low = (*vector::borrow(&payload, current_idx + 1)) as u64;
        let proof_ref_len = (proof_ref_len_high << 8) | proof_ref_len_low;
        current_idx = current_idx + 2;

        // Proof Reference
        assert!(payload_len >= current_idx + proof_ref_len, E_INVALID_ACTION); // Check for proof_reference bytes
        let mut proof_reference_bytes = vector::empty<u8>();
        i = 0;
        while (i < proof_ref_len) {
            vector::push_back(&mut proof_reference_bytes, *vector::borrow(&payload, current_idx + i));
            i = i + 1;
        };

        // --- Execute Action ---
        // This requires a new function in pactda.move, let's call it `submit_proof_from_bridge`
        PactDa::submit_proof_from_bridge(contract, milestone_id, proof_reference_bytes, ctx);

        // --- Emit Event ---
        let contract_sui_address = object::id_address(contract);
        event::emit(ProofSubmittedPartyBCrossChain {
            contract_address: contract_sui_address,
            milestone_id,
            source_chain
        });
    }

    fun destroy(vaa: VAA::VAA) {
        VAA::take_payload(vaa);
    }
