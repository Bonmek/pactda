module pactda::cross_chain_auth;

    use sui::event;
    use wormhole::vaa::{Self, VAA};
    use wormhole::state::{State};
    use wormhole::external_address::{Self, ExternalAddress};
    use wormhole::bytes32::{Self, Bytes32};
    use sui::clock::{Clock};
    use sui::bcs;
    use sui::table::{Self, Table};

    use pactda::pactda::{Self, PactDaContract};

    const EInvalidEmitter: u64 = 1;
    const EInvalidActionType: u64 = 2;
    const EInvalidSigner: u64 = 3;
    const EExpiredVAA: u64 = 4;
    const EInvalidContractID: u64 = 6;
    // const EInvalidPayloadFormat: u64 = 8;
    const EAlreadyProcessed: u64 = 9;
    // const ERegistryPruningFailed: u64 = 10;

    const ACTION_TYPE_SIGN_CONTRACT_PARTY_A: u8 = 1;
    const ACTION_TYPE_SIGN_CONTRACT_PARTY_B: u8 = 2;
    const ACTION_TYPE_APPROVE_MILESTONE: u8 = 3;
    const ACTION_TYPE_RELEASE_PAYMENT: u8 = 4;
    const ACTION_TYPE_REFUND_PAYMENT: u8 = 5;

    const ACTION_SIGN_CONTRACT_PARTY_A_STR: vector<u8> = b"SIGN_CONTRACT_PARTY_A";
    const ACTION_SIGN_CONTRACT_PARTY_B_STR: vector<u8> = b"SIGN_CONTRACT_PARTY_B";
    const ACTION_APPROVE_MILESTONE_STR: vector<u8> = b"APPROVE_MILESTONE";
    const ACTION_RELEASE_PAYMENT_STR: vector<u8> = b"RELEASE_PAYMENT";
    const ACTION_REFUND_PAYMENT_STR: vector<u8> = b"REFUND_PAYMENT";

    const DEFAULT_REGISTRY_PRUNING_THRESHOLD: u64 = 10000;
     const DEFAULT_REGISTRY_MAX_AGE_MS: u64 = 604800000;

    // Define the actual payload structure
    #[allow(unused_field)]
    public struct AuthorizationPayload has store, drop {
        source_address: ExternalAddress,
        action_type: u8,
        contract_id: Bytes32,
        action_params: vector<u8>,
        timestamp: u64,
    }

    public struct CrossChainConfig has key {
        id: UID,
        trusted_emitters: vector<TrustedEmitter>,
        admin: address,
        vaa_validity_period: u64,
        address_mappings: vector<AddressMapping>,
        registry_pruning_threshold: u64,
        registry_max_age_ms: u64,
    }

    public struct TrustedEmitter has store, drop {
        chain_id: u16,
        emitter_address: ExternalAddress,
    }

    public struct AddressMapping has store, drop {
        chain_id: u16,
        external_address: ExternalAddress,
        sui_address: address,
    }

    public struct ProcessedVAARegistry has key {
        id: UID,
        processed_vaas: Table<vector<u8>, VAAProcessingRecord>,
        entry_count: u64,
        last_pruned_timestamp: u64,
    }

    public struct VAAProcessingRecord has store, drop {
        processed: bool,
        timestamp: u64,
    }

    public struct CrossChainActionProcessed has copy, drop {
        source_chain: u16,
        source_address: vector<u8>,
        mapped_sui_address: address,
        contract_id: ID,
        action_type: vector<u8>,
        action_type_id: u8,
        timestamp: u64,
    }

    public struct AddressMappingRegistered has copy, drop {
        chain_id: u16,
        external_address: vector<u8>,
        sui_address: address,
    }
    #[allow(unused_field)]
    public struct RegistryPruned has copy, drop {
        entries_before: u64,
        entries_after: u64,
        timestamp: u64,
    }

    #[allow(unused_variable)]
    public fun AuthorizePayload  (
        source_address: ExternalAddress,
        vaa_validity_period: u64,
        ctx: &mut TxContext
    ) {
        let admin = tx_context::sender(ctx);
        let config = CrossChainConfig {
            id: object::new(ctx),
            trusted_emitters: vector::empty<TrustedEmitter>(),
            admin,
            vaa_validity_period,
            address_mappings: vector::empty<AddressMapping>(),
            registry_max_age_ms: DEFAULT_REGISTRY_MAX_AGE_MS,
            registry_pruning_threshold: DEFAULT_REGISTRY_PRUNING_THRESHOLD,
        };

        let registry = ProcessedVAARegistry {
            id: object::new(ctx),
            processed_vaas: table::new(ctx),
            entry_count: 0,
            last_pruned_timestamp: 0,
        };

        transfer::share_object(config);
        transfer::share_object(registry);
    }

    public entry fun add_trusted_emitter(
        config: &mut CrossChainConfig,
        chain_id: u16,
        emitter_address_vec: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == config.admin, EInvalidSigner);

        let emitter_address = bytes32::new(emitter_address_vec);
        let emitter = TrustedEmitter {
            chain_id,
            emitter_address: external_address::new(emitter_address),
        };

        vector::push_back(&mut config.trusted_emitters, emitter);
    }

    public entry fun remove_trusted_emitter(
        config: &mut CrossChainConfig,
        chain_id: u16,
        emitter_address_vec: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == config.admin, EInvalidSigner);

        let emitter_address_bytes = bytes32::new(emitter_address_vec);
        let emitter_to_remove = external_address::new(emitter_address_bytes);
        let len = vector::length(&config.trusted_emitters);
        let mut i = 0;

        while (i < len) {
            let emitter = vector::borrow(&config.trusted_emitters, i);
            if (emitter.chain_id == chain_id &&
                external_address::to_bytes(emitter.emitter_address) ==
                external_address::to_bytes(emitter_to_remove)) {
                vector::remove(&mut config.trusted_emitters, i);
                break
            };
            i = i + 1;
        };
    }

    public entry fun update_vaa_validity_period(
        config: &mut CrossChainConfig,
        validity_period: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == config.admin, EInvalidSigner);
        config.vaa_validity_period = validity_period;
    }

    public entry fun register_address_mapping(
        config: &mut CrossChainConfig,
        chain_id: u16,
        external_address_vec: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sui_address = tx_context::sender(ctx);
        let external_address_bytes = bytes32::new(external_address_vec);
        let external_addr = external_address::new(external_address_bytes);
        let external_address_bytes_vec = external_address::to_bytes(external_addr);
        let len = vector::length(&config.address_mappings);
        let mut i = 0;
        let mut exists = false;

        while (i < len) {
            let mapping = vector::borrow(&config.address_mappings, i);
            if (mapping.chain_id == chain_id &&
                external_address::to_bytes(mapping.external_address) == external_address_bytes_vec &&
                mapping.sui_address == sui_address) {
                exists = true;
                break
            };
            i = i + 1;
        };

        if (!exists) {
            let mapping = AddressMapping {
                chain_id,
                external_address: external_addr,
                sui_address,
            };

            vector::push_back(&mut config.address_mappings, mapping);

            event::emit(AddressMappingRegistered {
                chain_id,
                external_address: external_address_bytes_vec,
                sui_address,
            });
        };
    }

    fun get_sui_address(
        config: &CrossChainConfig,
        chain_id: u16,
        external_address: &ExternalAddress
    ): Option<address> {
        let len = vector::length(&config.address_mappings);
        let mut i = 0;
        let external_address_bytes = external_address::to_bytes(*external_address);

        while (i < len) {
            let mapping = vector::borrow(&config.address_mappings, i);
            if (mapping.chain_id == chain_id &&
                external_address::to_bytes(mapping.external_address) == external_address_bytes) {
                return option::some(mapping.sui_address)
            };
            i = i + 1;
        };

        option::none()
    }

    public entry fun process_vaa_authorization(
        config: &CrossChainConfig,
        registry: &mut ProcessedVAARegistry,
        wormhole_state: &State,
        vaa_bytes: vector<u8>,
        contract: &mut PactDaContract,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let vaa = vaa::parse_and_verify(wormhole_state, vaa_bytes, clock);

        // --- Verification Steps ---
        verify_emitter(config, &vaa);

        let sequence = vaa::sequence(&vaa);
        // TODO: Implement registry pruning logic to prevent unbounded growth.
        // Consider adding a separate entry function `prune_registry` that checks
        // entry_count against registry_pruning_threshold and removes entries
        // older than registry_max_age_ms based on VAAProcessingRecord.timestamp.
        verify_not_processed(registry, &vaa, sequence, ctx);

        verify_vaa_not_expired(config, &vaa, ctx);

        // --- Payload Parsing & Action Handling ---
        let payload = vaa::payload(&vaa);
        let (
            source_address,
            action_type,
            contract_id_bytes,
            action_params,
            _source_timestamp
        ) = parse_authorization_payload(payload);

        let contract_id = bytes32_to_object_id(contract_id_bytes);
        assert!(contract_id == object::id(contract), EInvalidContractID);

        let emitter_chain = vaa::emitter_chain(&vaa);
        let mut sui_address_opt = get_sui_address(config, emitter_chain, &source_address);

        assert!(option::is_some(&sui_address_opt), EInvalidSigner);
        let sui_address = option::extract(&mut sui_address_opt);

        handle_action(action_type, contract, sui_address, action_params, ctx);

        // --- Event Emission ---
        event::emit(CrossChainActionProcessed {
            source_chain: emitter_chain,
            source_address: external_address::to_bytes(source_address),
            mapped_sui_address: sui_address,
            contract_id: contract_id,
            action_type: action_type_to_string(action_type),
            timestamp: tx_context::epoch_timestamp_ms(ctx),
            action_type_id: action_type,
        });

        // --- Consume VAA --- 
        // Explicitly consume the VAA object as it lacks the 'drop' ability.
        // We've already extracted necessary info, so we discard the payload.
        let _ = vaa::take_payload(vaa);
    }

    fun handle_action(
        action_type: u8,
        contract: &mut PactDaContract,
        sui_address: address,
        action_params: vector<u8>,
        ctx: &mut TxContext
    ) {
        if (action_type == ACTION_TYPE_SIGN_CONTRACT_PARTY_A) {
            handle_sign_contract_party_a(contract, sui_address, ctx);
        } 
        else if (action_type == ACTION_TYPE_SIGN_CONTRACT_PARTY_B) {
            handle_sign_contract_party_b(contract, sui_address, ctx);
        }
        else if (action_type == ACTION_TYPE_APPROVE_MILESTONE) {
            handle_approve_milestone(contract, sui_address, action_params, ctx);
        }
        else if (action_type == ACTION_TYPE_RELEASE_PAYMENT) {
            handle_release_payment(contract, sui_address, action_params, ctx);
        }
        else if (action_type == ACTION_TYPE_REFUND_PAYMENT) {
            handle_refund_payment(contract, sui_address, action_params, ctx);
        }
        else {
            abort EInvalidActionType
        }
    }

    fun handle_sign_contract_party_a(
        contract: &mut PactDaContract, 
        sui_address: address,
        ctx: &mut TxContext
    ) {
        verify_is_party_a(contract, sui_address);
        pactda::sign_contract_party_a(contract, ctx);
    }

    fun handle_sign_contract_party_b(
        contract: &mut PactDaContract, 
        sui_address: address,
        ctx: &mut TxContext
    ) {
        verify_is_party_b(contract, sui_address);
        pactda::sign_contract_party_b(contract, ctx);
    }

    fun handle_approve_milestone(
        contract: &mut PactDaContract, 
        sui_address: address,
        action_params: vector<u8>,
        ctx: &mut TxContext
    ) {
        verify_is_party_a(contract, sui_address);
        let milestone_id = parse_milestone_id(action_params);
        pactda::approve_milestone(contract, milestone_id, ctx);
    }

    #[allow(unused_variable, unused_mut_parameter)]
    fun handle_release_payment(
        contract: &mut PactDaContract, 
        sui_address: address,
        _action_params: vector<u8>,
        _ctx: &mut TxContext
    ) {
        // TODO: Implement release payment logic.
        // Should likely verify signer is party_a or party_b depending on requirements.
        // E.g., verify_is_party_a(contract, sui_address);
        // Should parse relevant info from _action_params if needed.
    }
    #[allow(unused_variable, unused_mut_parameter)]
    fun handle_refund_payment(
        contract: &mut PactDaContract, 
        sui_address: address,
        _action_params: vector<u8>,
        _ctx: &mut TxContext
    ) {
        // TODO: Implement refund payment logic.
        // Should likely verify signer is party_a or party_b depending on requirements.
        // E.g., verify_is_party_b(contract, sui_address);
        // Should parse relevant info from _action_params if needed.
    }

    fun verify_emitter(config: &CrossChainConfig, vaa: &VAA) {
        let emitter_chain = vaa::emitter_chain(vaa);
        let emitter_address = vaa::emitter_address(vaa);
        let emitter_address_bytes = external_address::to_bytes(emitter_address);

        let mut found = false;
        let mut i = 0;
        let len = vector::length(&config.trusted_emitters);

        while (i < len) {
            let trusted_emitter = vector::borrow(&config.trusted_emitters, i);
            if (trusted_emitter.chain_id == emitter_chain &&
                external_address::to_bytes(trusted_emitter.emitter_address) == emitter_address_bytes) {
                found = true;
                break
            };
            i = i + 1;
        };

        assert!(found, EInvalidEmitter);
    }

    fun verify_not_processed(
        registry: &mut ProcessedVAARegistry,
        vaa: &VAA,
        _sequence: u64,
        _ctx: &mut TxContext
    ) {
        let vaa_key = create_vaa_key(vaa);
        assert!(!table::contains(&registry.processed_vaas, vaa_key), EAlreadyProcessed);
        table::add(&mut registry.processed_vaas, vaa_key, VAAProcessingRecord {
            processed: true,
            timestamp: tx_context::epoch_timestamp_ms(_ctx),
        });
        registry.entry_count = registry.entry_count + 1;
    }

    fun create_vaa_key(vaa: &VAA): vector<u8>  {
        let emitter_chain = vaa::emitter_chain(vaa);
        let emitter_address = vaa::emitter_address(vaa);
        let sequence = vaa::sequence(vaa);

        let mut key = vector::empty<u8>();
        vector::append(&mut key, bcs::to_bytes(&emitter_chain));
        vector::append(&mut key, external_address::to_bytes(emitter_address));
        vector::append(&mut key, bcs::to_bytes(&sequence));
        key
    }

    #[allow(unused_field)]
    public struct VAAMarker has key {
        id: UID,
        vaa_key: vector<u8>
    }

    #[allow(unused_mut_parameter)]
    fun verify_vaa_not_expired(config: &CrossChainConfig, vaa: &VAA, ctx: &mut TxContext) {
        let vaa_timestamp_ms = (vaa::timestamp(vaa) as u64) * 1000;
        let current_timestamp_ms = tx_context::epoch_timestamp_ms(ctx);

        assert!(current_timestamp_ms >= vaa_timestamp_ms, EExpiredVAA);
        assert!((current_timestamp_ms - vaa_timestamp_ms) <= config.vaa_validity_period, EExpiredVAA);
    }

    // Helper function to peel exactly 32 bytes for Bytes32
    fun peel_bytes32_bytes(reader: &mut sui::bcs::BCS): vector<u8> {
        let mut bytes = vector::empty<u8>();
        let mut i = 0;
        while (i < 32) {
            vector::push_back(&mut bytes, reader.peel_u8());
            i = i + 1;
        };
        bytes
    }

    fun parse_authorization_payload(payload: vector<u8>): (ExternalAddress, u8, Bytes32, vector<u8>, u64) {
        // Use an alias to avoid conflict if std::bcs is also used
        use sui::bcs::{Self as SuiBCS};

        let mut reader = SuiBCS::new(payload);

        // Peel fields sequentially based on AuthorizationPayload definition
        let source_addr_raw_bytes = peel_bytes32_bytes(&mut reader);
        let source_address = external_address::new(bytes32::new(source_addr_raw_bytes));

        let action_type = reader.peel_u8();

        let contract_id_raw_bytes = peel_bytes32_bytes(&mut reader);
        let contract_id = bytes32::new(contract_id_raw_bytes);

        let action_params = reader.peel_vec_u8(); // Reads length prefix then bytes

        let timestamp = reader.peel_u64();

        // Optional: Check for leftover bytes if strict parsing is required
        // let remainder = SuiBCS::into_remainder_bytes(reader);
        // assert!(vector::is_empty(&remainder), EUnexpectedBytes); // Define EUnexpectedBytes if needed

        assert!(
            action_type == ACTION_TYPE_SIGN_CONTRACT_PARTY_A || 
            action_type == ACTION_TYPE_SIGN_CONTRACT_PARTY_B ||
            action_type == ACTION_TYPE_APPROVE_MILESTONE ||
            action_type == ACTION_TYPE_RELEASE_PAYMENT ||
            action_type == ACTION_TYPE_REFUND_PAYMENT,
            EInvalidActionType
        );
        
        (
            source_address,
            action_type,
            contract_id,
            action_params,
            timestamp
        )
    }

    fun action_type_to_string(action_type: u8): vector<u8> {
        if (action_type == ACTION_TYPE_SIGN_CONTRACT_PARTY_A) {
            ACTION_SIGN_CONTRACT_PARTY_A_STR
        } else if (action_type == ACTION_TYPE_SIGN_CONTRACT_PARTY_B) {
            ACTION_SIGN_CONTRACT_PARTY_B_STR
        } else if (action_type == ACTION_TYPE_APPROVE_MILESTONE) {
            ACTION_APPROVE_MILESTONE_STR
        } else if (action_type == ACTION_TYPE_RELEASE_PAYMENT) {
            ACTION_RELEASE_PAYMENT_STR
        } else if (action_type == ACTION_TYPE_REFUND_PAYMENT) {
            ACTION_REFUND_PAYMENT_STR
        } else {
            abort EInvalidActionType
        }
    }

    fun bytes32_to_object_id(bytes: Bytes32): ID {
        // Convert Bytes32 to vector<u8> before calling id_from_bytes
        object::id_from_bytes(bytes32::to_bytes(bytes))
    }

    fun verify_is_party_a(contract: &PactDaContract, sui_address: address) {
        assert!(pactda::get_party_a(contract) == sui_address, EInvalidSigner);
    }

    fun verify_is_party_b(contract: &PactDaContract, sui_address: address) {
        assert!(pactda::get_party_b(contract) == sui_address, EInvalidSigner);
    }

    fun parse_milestone_id(params: vector<u8>): u64 {
        // Use sui::bcs for manual deserialization
        use sui::bcs::{Self as SuiBCS};
        let mut reader = SuiBCS::new(params);
        let milestone_id = reader.peel_u64();
        // If MilestoneAction had other fields, they would need to be peeled here too.
        // let _remainder = SuiBCS::into_remainder_bytes(reader); // Optional: check for extra bytes
        milestone_id
    }
