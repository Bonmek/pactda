/*
/// Module: pactda
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions
module pactda::pactda {

    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;
    use std::string::{Self, String};
    use sui::tx_context::{Self, TxContext}; 
    use sui::object::{Self, UID, ID}; 
    use sui::transfer; 
    use std::option::{Self, Option}; 
    use std::vector;
    
    // Wormhole related
    use wormhole::state::{State as WormholeState};
    use wormhole::publish_message::{Self};

    // Error codes
    // const EInvalidParty: u64 = 1;
    const EInvalidStatus: u64 = 2;
    // const EInsufficientFunds: u64 = 3;
    const EUnauthorized: u64 = 4;
    const EInvalidMilestone: u64 = 5;
    // const ENotSigned: u64 = 6;    
    const EInvalidInput: u64 = 7;
    
    // Status codes
    const CONTRACT_STATUS_DRAFT: u8 = 0;
    const CONTRACT_STATUS_PENDING: u8 = 1;
    const CONTRACT_STATUS_ACTIVE: u8 = 2;
    const CONTRACT_STATUS_DISPUTED: u8 = 3;
    const CONTRACT_STATUS_COMPLETED: u8 = 4;
    const CONTRACT_STATUS_CANCELLED: u8 = 5;

    const ESCROW_STATUS_FUNDED: u8 = 0;
    const ESCROW_STATUS_RELEASED: u8 = 1;
    const ESCROW_STATUS_REFUNDED: u8 = 2;
    // const ESCROW_STATUS_LOCKED: u8 = 3;

    const MILESTONE_STATUS_PENDING: u8 = 0;
    const MILESTONE_STATUS_SUBMITTED: u8 = 1;
    const MILESTONE_STATUS_APPROVED: u8 = 2;
    // const MILESTONE_STATUS_DISPUTED: u8 = 3;
    const MILESTONE_STATUS_CANCELLED: u8 = 4;

    const PARTY_ROLE_B: u8 = 1;

    public struct PactDaContract has key, store {
        id: UID,
        title: String,
        contract_type: u8,
        status: u8,
        party_a: address,
        party_b: address,
        terms_reference: vector<u8>,
        contract_start_date: Option<u64>,
        contract_deadline_date: Option<u64>,
        escrow_id: Option<ID>,
        milestones: Option<vector<Milestone>>,
        dispute_info: Option<DisputeInfo>,
        cross_chain_parties: Option<vector<CrossChainPartyInfo>>,
        metadata: Option<vector<u8>>,
        creation_epoch: u64,
        is_party_a_signed: bool,
        is_party_b_signed: bool,
    }

    public struct Escrow has key {
        id: UID,
        contract_address: address,
        balance: Balance<SUI>,
        payer: address,
        payee: address,
        status: u8,
    }

    public struct VcnftType1 has key, store {
        id: UID
    }

    public struct VcnftType2 has key, store {
        id: UID,
        owner: address,
        is_active: bool,
        specialization_tags: Option<vector<String>>,
        staked_sui_object_id: Option<ID>
    }

    public struct Milestone has store, drop {
        id: u64,
        description_hash: vector<u8>, 
        value: u64,
        status: u8,
        proof_reference: Option<vector<u8>>
    }

    public struct DisputeInfo has store, drop {
        disputed_milestone_id: Option<u64>,
        initiator: address,
        reason_hash: Option<vector<u8>>,
        assigned_verifiers: Option<VerifierSet>, 
        outcome: Option<bool>,
    }

    public struct VerifierSet has store, drop {
        nominated_1: address,
        nominated_2: address,
        system_1: address,
        system_2: address,
        system_3: address
    }

    public struct CrossChainPartyInfo has store, drop {
        chain_id: u16,
        party_address: vector<u8>,
        role: u8,  // Maps to party_a (0) or party_b (1)
    }

    public struct TrustedEmitter has store, drop {
        chain_id: u16,
        emitter_address: vector<u8>,
    }

    public struct AddressMapping has store, drop {
        chain_id: u16,
        external_address: vector<u8>,
        sui_address: address,
    }

    public struct CrossChainConfig has key, store {
        id: UID,
        admin: address,
        vaa_validity_period: u64,
        trusted_emitters: vector<TrustedEmitter>,
        address_mappings: vector<AddressMapping>,
    }

    public struct ProcessedVAA has key, store {
        id: UID,
        emitter_chain: u16,
        emitter_address: vector<u8>,
        sequence: u64,
        timestamp: u64,
    }

    // === Events ===
    public struct ContractCreatedEvent has copy, drop {
        contract_id: ID,
        party_a: address,
        party_b: address,
    }

    public struct ContractSignedEvent has copy, drop {
        contract_id: ID,
        signer: address,
    }

    public struct EscrowFundedEvent has copy, drop {
        escrow_id: ID,
        amount: u64,
        payer: address
    }

    public struct ContractActionEvent has copy, drop {
        contract_id: ID,
        action_type: String,
        actor: address,
        timestamp: u64,
    }

    // === Contract Creation and Management ===
    public entry fun create_contract(
        party_b: Option<address>,
        title: String,
        contract_type: Option<u8>,
        terms_reference: Option<vector<u8>>,
        contract_start_date: Option<u64>,
        contract_deadline_date: Option<u64>,
        metadata: Option<vector<u8>>,
        ctx: &mut TxContext,
    ) {
        let party_a = tx_context::sender(ctx);
        let final_contract_type: u8 = option::get_with_default(&contract_type, 0u8); 
        let final_party_b: address = option::get_with_default(&party_b, @0x0);
        
        let final_terms_reference: vector<u8> = option::get_with_default(&terms_reference, vector::empty<u8>()); // Default if None

        let contract = PactDaContract {            id: object::new(ctx),
            title,
            contract_type: final_contract_type,
            status: CONTRACT_STATUS_DRAFT,
            party_a,
            party_b: final_party_b, 
            terms_reference: final_terms_reference, 
            contract_start_date,
            contract_deadline_date,
            escrow_id: option::none(),
            milestones: option::none(),
            dispute_info: option::none(),
            cross_chain_parties: option::none(),
            metadata,
            creation_epoch: tx_context::epoch(ctx),
            is_party_a_signed: false,
            is_party_b_signed: false,
        };
        let contract_id = object::id(&contract);
        event::emit(ContractCreatedEvent {
            contract_id,
            party_a,
            party_b: final_party_b 
        });
        transfer::share_object(contract);
        create_receipt(object::id_to_address(&contract_id), string::utf8(b"contract_created"), ctx);
    }

    public entry fun create_contract_cross_chain(
        chain_id: u16,
        party_b_address: vector<u8>,
        title: String,
        contract_type: Option<u8>,
        terms_reference: Option<vector<u8>>,
        contract_start_date: Option<u64>,
        contract_deadline_date: Option<u64>,
        metadata: Option<vector<u8>>,
        ctx: &mut TxContext,
    ) {
        let party_a = tx_context::sender(ctx);

        let final_contract_type: u8 = option::get_with_default(&contract_type, 0u8);
        let final_terms_reference: vector<u8> = option::get_with_default(&terms_reference, vector::empty<u8>()); // Default if None

        let contract = PactDaContract {            
            id: object::new(ctx),
            title,
            contract_type: final_contract_type,
            status: CONTRACT_STATUS_DRAFT,
            party_a,
            party_b: @0x0,
            terms_reference: final_terms_reference,
            contract_start_date,
            contract_deadline_date,
            escrow_id: option::none(),
            milestones: option::none(),
            dispute_info: option::none(),
            metadata,
            creation_epoch: tx_context::epoch(ctx),
            cross_chain_parties: option::some(vector[CrossChainPartyInfo {
                chain_id,
                party_address: party_b_address,
                role: PARTY_ROLE_B, 
            }]),
            is_party_a_signed: false,
            is_party_b_signed: false,
        };
        let contract_id = object::id(&contract);
        event::emit(ContractCreatedEvent {
            contract_id,
            party_a,
            party_b: @0x0, // Use zero address as placeholder for cross-chain party
        });
        transfer::share_object(contract);
        create_receipt(object::id_to_address(&contract_id), string::utf8(b"cross_chain_contract_created"), ctx);
    }

    public entry fun update_contract(
        contract: &mut PactDaContract,
        mut chain_id: Option<u16>,
        mut party_b_cross_chain: Option<vector<u8>>,
        mut party_b: Option<address>,
        mut title: Option<String>,
        mut terms_reference: Option<vector<u8>>,
        contract_start_date: Option<u64>,
        contract_deadline_date: Option<u64>,
        metadata: Option<vector<u8>>,
        mut contract_type: Option<u8>, // Added contract_type
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == contract.party_a, EUnauthorized);
        assert!(contract.status == CONTRACT_STATUS_PENDING || contract.status == CONTRACT_STATUS_DRAFT, EInvalidStatus);

        // Declare all local variables at the top
        let mut existing_chain_id_b = 0u16;
        let mut existing_party_address_b = vector::empty<u8>();
        let mut i = 0u64;
        let mut found_idx = option::none<u64>();

        if (option::is_some(&title)) {
            contract.title = option::extract(&mut title);
        };
        if (option::is_some(&terms_reference)) {
            contract.terms_reference = option::extract(&mut terms_reference);
        };
        if (option::is_some(&contract_start_date)) {
            contract.contract_start_date = contract_start_date;
        };
        if (option::is_some(&contract_deadline_date)) {
            contract.contract_deadline_date = contract_deadline_date;
        };
        if (option::is_some(&metadata)) {
            contract.metadata = metadata;
        };
        if (option::is_some(&contract_type)) { // Added logic for contract_type
            contract.contract_type = option::extract(&mut contract_type);
        };

        if (option::is_some(&party_b)) {
            let new_party_b = option::extract(&mut party_b);
            assert!(new_party_b != @0x0, EUnauthorized);
            contract.party_b = new_party_b;
        };

        if (option::is_some(&contract.cross_chain_parties)) {
            let parties_ref = option::borrow(&contract.cross_chain_parties);
            let len = vector::length(parties_ref);
            while (i < len) {
                let party_info = vector::borrow(parties_ref, i);
                if (party_info.role == PARTY_ROLE_B) {
                    existing_chain_id_b = party_info.chain_id;
                    existing_party_address_b = party_info.party_address; 
                    break; 
                };
                i = i + 1;
            };
        };
        
        let final_chain_id_b = if (option::is_some(&chain_id)) {
            let new_cid = option::extract(&mut chain_id);
            assert!(new_cid != 0, EUnauthorized);
            new_cid
        } else {
            existing_chain_id_b
        };

        let final_party_address_b = if (option::is_some(&party_b_cross_chain)) {
            option::extract(&mut party_b_cross_chain)
        } else {
            existing_party_address_b
        };

        if (final_chain_id_b == 0 && vector::is_empty(&final_party_address_b)) {
            if (option::is_some(&contract.cross_chain_parties)) {
                let parties_mut = option::borrow_mut(&mut contract.cross_chain_parties);
                let mut found_idx = option::none<u64>();
                let mut i = 0;
                while (i < vector::length(parties_mut)) {
                    if (vector::borrow(parties_mut, i).role == PARTY_ROLE_B) {
                        found_idx = option::some(i);
                        break;
                    };
                    i = i + 1;
                };

                if (option::is_some(&found_idx)) {
                    vector::remove(parties_mut, option::extract(&mut found_idx));
                    if (vector::is_empty(parties_mut)) {
                        contract.cross_chain_parties = option::none();
                    };
                };
            };
        } else {
            let new_party_b_info = CrossChainPartyInfo {
                chain_id: final_chain_id_b,
                party_address: final_party_address_b,
                role: PARTY_ROLE_B,
            };

            if (option::is_none(&contract.cross_chain_parties)) {
                contract.cross_chain_parties = option::some(vector::empty<CrossChainPartyInfo>());
            };
            
            let parties_mut = option::borrow_mut(&mut contract.cross_chain_parties);
            let mut found_idx = option::none<u64>();
            let mut i = 0;
            while (i < vector::length(parties_mut)) {
                if (vector::borrow(parties_mut, i).role == PARTY_ROLE_B) {
                    found_idx = option::some(i);
                    break;
                };
                i = i + 1;
            };

            if (option::is_some(&found_idx)) {
                *vector::borrow_mut(parties_mut, option::extract(&mut found_idx)) = new_party_b_info;
            } else {
                vector::push_back(parties_mut, new_party_b_info);
            };
        };

        create_receipt(object::id_address(contract), string::utf8(b"contract_updated"), ctx);
    }

    public entry fun deny_contract(
        contract: &mut PactDaContract,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == contract.party_a || sender == contract.party_b , EUnauthorized);
        assert!(contract.status == CONTRACT_STATUS_PENDING || contract.status == CONTRACT_STATUS_DRAFT, EInvalidStatus);
        contract.status = CONTRACT_STATUS_CANCELLED;
        create_receipt(object::id_address(contract), string::utf8(b"contract_denied"), ctx);
    }

    public entry fun add_milestones(
        contract: &mut PactDaContract,
        milestone_description_hashes: vector<vector<u8>>, 
        milestone_values: vector<u64>,
        ctx: &mut TxContext,
    ) {
        assert!(vector::length(&milestone_description_hashes) == vector::length(&milestone_values), EInvalidMilestone);
        assert!(vector::length(&milestone_description_hashes) > 0, EInvalidMilestone);
        let sender = tx_context::sender(ctx);

        assert!(
            sender == contract.party_a || (sender == contract.party_b && contract.party_b != @0x0),
            EUnauthorized
        );
        assert!(contract.status == CONTRACT_STATUS_PENDING || contract.status == CONTRACT_STATUS_DRAFT, EInvalidStatus);
        if (option::is_some(&contract.milestones)) {
            let milestones = option::borrow_mut(&mut contract.milestones);
            let starting_id = vector::length(milestones);
            let mut i = 0;
            let len = vector::length(&milestone_description_hashes);
            while (i < len) {
                let milestone = Milestone {
                    id: starting_id + i,
                    description_hash: *vector::borrow(&milestone_description_hashes, i),
                    value: *vector::borrow(&milestone_values, i),
                    status: MILESTONE_STATUS_PENDING,
                    proof_reference: option::none(),
                };
                vector::push_back(milestones, milestone);
                i = i + 1;
            };
        } else {
            let mut milestones_vec = vector::empty<Milestone>();
            let mut i = 0;
            let len = vector::length(&milestone_description_hashes);
            while (i < len) {
                let milestone = Milestone {
                    id: i,
                    description_hash: *vector::borrow(&milestone_description_hashes, i),
                    value: *vector::borrow(&milestone_values, i),
                    status: MILESTONE_STATUS_PENDING,
                    proof_reference: option::none(),
                };
                vector::push_back(&mut milestones_vec, milestone);
                i = i + 1;
            };
            contract.milestones = option::some(milestones_vec);
        };
        create_receipt(object::id_address(contract), string::utf8(b"milestones_added"), ctx);
    }

    public entry fun update_milestone(
        contract: &mut PactDaContract,
        milestone_id: u64,
        new_description_hash: vector<u8>,
        new_value: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);
        let milestones = option::borrow_mut(&mut contract.milestones);
        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
        let milestone = vector::borrow_mut(milestones, milestone_id);
        assert!(milestone.status == MILESTONE_STATUS_PENDING, EInvalidStatus);
        milestone.description_hash = new_description_hash;
        milestone.value = new_value;
        create_receipt(object::id_address(contract), string::utf8(b"milestone_updated"), ctx);
    }

    public entry fun cancel_milestone(
        contract: &mut PactDaContract,
        milestone_id: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);
        let milestones = option::borrow_mut(&mut contract.milestones);
        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
        let milestone = vector::borrow_mut(milestones, milestone_id);
        assert!(milestone.status == MILESTONE_STATUS_PENDING, EInvalidStatus);
        milestone.status = MILESTONE_STATUS_CANCELLED;
        create_receipt(object::id_address(contract), string::utf8(b"milestone_cancelled"), ctx);
    }

    public entry fun remove_milestone(
        contract: &mut PactDaContract,
        milestone_id: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);
        let milestones = option::borrow_mut(&mut contract.milestones);
        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
        let milestone = vector::borrow_mut(milestones, milestone_id);
        assert!(milestone.status == MILESTONE_STATUS_PENDING, EInvalidStatus);
        let removed_milestone = vector::remove(milestones, milestone_id);

        let remaining_count = vector::length(milestones);
        let mut i = milestone_id;
        while (i < remaining_count) {
            let current_milestone = vector::borrow_mut(milestones, i);
            current_milestone.id = i;
            i = i + 1;
        };

        create_receipt(object::id_address(contract), string::utf8(b"milestone_removed"), ctx);
    }

    public entry fun batch_update_milestones(
        contract: &mut PactDaContract,
        milestone_ids: vector<u64>,
        new_description_hashes: vector<vector<u8>>,
        new_values: vector<u64>,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let len = vector::length(&milestone_ids);
        assert!(len == vector::length(&new_description_hashes), EInvalidInput);
        assert!(len == vector::length(&new_values), EInvalidInput);
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);
        let milestones = option::borrow_mut(&mut contract.milestones);
        let milestones_len = vector::length(milestones);
        let mut i = 0;
        while (i < len) {
            let milestone_id = *vector::borrow(&milestone_ids, i);
            assert!(milestone_id < milestones_len, EInvalidMilestone);
            let milestone = vector::borrow_mut(milestones, milestone_id);
            assert!(milestone.status == MILESTONE_STATUS_PENDING, EInvalidStatus);
            milestone.description_hash = *vector::borrow(&new_description_hashes, i);
            milestone.value = *vector::borrow(&new_values, i);
            i = i + 1;
        };
        create_receipt(object::id_address(contract), string::utf8(b"milestones_batch_updated"), ctx);
    }


    public entry fun batch_upsert_milestones(
        contract: &mut PactDaContract,
        milestone_ids: vector<u64>,
        description_hashes: vector<vector<u8>>,
        values: vector<u64>,
        ctx: &mut TxContext,
    ) {
        let len = vector::length(&milestone_ids);
        assert!(len == vector::length(&description_hashes), EInvalidInput);
        assert!(len == vector::length(&values), EInvalidInput);
        assert!(len > 0, EInvalidInput);
        // Check for duplicate IDs in milestone_ids
        let mut j = 0;
        while (j < len) {
            let id_j = *vector::borrow(&milestone_ids, j);
            let mut k = j + 1;
            while (k < len) {
                let id_k = *vector::borrow(&milestone_ids, k);
                assert!(id_j != id_k, EInvalidInput); // Duplicate found
                k = k + 1;
            };
            j = j + 1;
        };
        if (option::is_none(&contract.milestones)) {
            contract.milestones = option::some(vector::empty<Milestone>());
        };
        let mut i = 0;
        while (i < len) {
            let milestone_id = *vector::borrow(&milestone_ids, i);
            let milestones_len = vector::length(option::borrow_mut(&mut contract.milestones));
            if (milestone_id < milestones_len) {
                let milestone = vector::borrow_mut(option::borrow_mut(&mut contract.milestones), milestone_id);
                if (milestone.status == MILESTONE_STATUS_PENDING) {
                    milestone.description_hash = *vector::borrow(&description_hashes, i);
                    milestone.value = *vector::borrow(&values, i);
                }
            } else {
                let milestone = Milestone {
                    id: milestone_id,
                    description_hash: *vector::borrow(&description_hashes, i),
                    value: *vector::borrow(&values, i),
                    status: MILESTONE_STATUS_PENDING,
                    proof_reference: option::none(),
                };
                vector::push_back(option::borrow_mut(&mut contract.milestones), milestone);
            };
            i = i + 1;
        };
        create_receipt(object::id_address(contract), string::utf8(b"milestones_batch_upserted"), ctx);
    }


    public entry fun sign_contract_party_a(
        contract: &mut PactDaContract,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == contract.party_a, EUnauthorized);
        assert!(contract.party_a != @0x0, EUnauthorized);
        assert!(contract.status == CONTRACT_STATUS_PENDING || contract.status == CONTRACT_STATUS_DRAFT, EInvalidStatus);
        assert!(!contract.is_party_a_signed, EInvalidStatus);

        contract.is_party_a_signed = true;

        if (contract.is_party_a_signed && contract.is_party_b_signed) {
            contract.status = CONTRACT_STATUS_ACTIVE;
        };

        event::emit(ContractSignedEvent {
            contract_id: object::id(contract),
            signer: sender,
        });
        create_receipt(object::id_address(contract), string::utf8(b"contract_signed_by_a"), ctx);
    }

    public entry fun sign_contract_party_b(
        contract: &mut PactDaContract,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(contract.party_b == sender, EUnauthorized);
        assert!(contract.party_b != @0x0, EUnauthorized);
        assert!(contract.status == CONTRACT_STATUS_PENDING, EInvalidStatus);
        contract.is_party_b_signed = true;


        if (contract.is_party_a_signed && contract.is_party_b_signed) {
            contract.status = CONTRACT_STATUS_ACTIVE;
        };

        event::emit(ContractSignedEvent {
            contract_id: object::id(contract),
            signer: sender,
        });
        create_receipt(object::id_address(contract), string::utf8(b"contract_signed_by_b"), ctx);
    }

    // === Escrow Management ===
    public entry fun fund_escrow(
        contract: &mut PactDaContract,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(contract.status == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        assert!(sender == contract.party_a || (sender == contract.party_b && contract.party_b != @0x0), EUnauthorized);

        let payment_balance = coin::into_balance(payment);
        let amount = balance::value(&payment_balance);
        let payer = sender;
        let payee = if (sender == contract.party_a) {
            assert!(contract.party_b != @0x0, EInvalidStatus);
            contract.party_b
        } else { 
            contract.party_a
        };
        let escrow = Escrow {
            id: object::new(ctx),
            contract_address: object::id_address(contract),
            balance: payment_balance,
            payer,
            payee,
            status: ESCROW_STATUS_FUNDED,
        };
        let escrow_id = object::id(&escrow);
        contract.escrow_id = option::some(object::id(&escrow));
        event::emit(EscrowFundedEvent {
            escrow_id,
            amount,
            payer,
        });
        transfer::share_object(escrow);
        create_receipt(object::id_address(contract), string::utf8(b"escrow_funded"), ctx);
    }    
    public entry fun submit_contract(
        contract: &mut PactDaContract,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == contract.party_a, EUnauthorized);
        assert!(contract.status == CONTRACT_STATUS_DRAFT, EInvalidStatus);

        contract.status = CONTRACT_STATUS_PENDING;
        create_receipt(object::id_address(contract), string::utf8(b"contract_submitted"), ctx);

    }

    public entry fun release_payment(
        contract: &mut PactDaContract,
        escrow: &mut Escrow,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(option::contains(&contract.escrow_id, &object::id(escrow)), EInvalidStatus);
        assert!(sender == escrow.payer, EUnauthorized);
        assert!(escrow.status == ESCROW_STATUS_FUNDED, EInvalidStatus);

        let amount = balance::value(&escrow.balance);
        let coin = coin::from_balance(balance::split(&mut escrow.balance, amount), ctx);
        transfer::public_transfer(coin, escrow.payee);
        escrow.status = ESCROW_STATUS_RELEASED;

        if (option::is_some(&contract.milestones)) {
            let milestones = option::borrow(&contract.milestones);
            let len = vector::length(milestones);
            let mut all_approved = true;
            let mut i = 0;
            while (i < len) {
                let milestone = vector::borrow(milestones, i);
                if (milestone.status != MILESTONE_STATUS_APPROVED) {
                    all_approved = false;
                    break;
                };
                i = i + 1;
            };
            if (all_approved && len > 0) {
                contract.status = CONTRACT_STATUS_COMPLETED;
            };
        } else {
            contract.status = CONTRACT_STATUS_COMPLETED;
        };
        
        create_receipt(object::id_address(contract), string::utf8(b"payment_released"), ctx);
    }    
    
    public entry fun refund_payment(
        contract: &mut PactDaContract,
        escrow: &mut Escrow,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(option::contains(&contract.escrow_id, &object::id(escrow)), EInvalidStatus);
        assert!(sender == escrow.payer, EUnauthorized); // Only the payer can initiate refunds
        assert!(escrow.status == ESCROW_STATUS_FUNDED, EInvalidStatus);

        let amount = balance::value(&escrow.balance);
        let coin = coin::from_balance(balance::split(&mut escrow.balance, amount), ctx);
        transfer::public_transfer(coin, escrow.payer);
        escrow.status = ESCROW_STATUS_REFUNDED;

        create_receipt(object::id_address(contract), string::utf8(b"payment_refunded"), ctx);
    }

    // === Milestone Management ===

    public entry fun submit_proof(
        contract: &mut PactDaContract,
        milestone_id: u64,
        proof_reference: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(contract.status == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        assert!(sender == contract.party_b && contract.party_b != @0x0, EUnauthorized);
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);

        let milestones = option::borrow_mut(&mut contract.milestones);

        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);

        let milestone = vector::borrow_mut(milestones, milestone_id);
        assert!(milestone.status == MILESTONE_STATUS_PENDING, EInvalidStatus);

        milestone.status = MILESTONE_STATUS_SUBMITTED;
        milestone.proof_reference = option::some(proof_reference);

        create_receipt(object::id_address(contract), string::utf8(b"proof_submitted"), ctx);
    }

    public entry fun approve_milestone(
        contract: &mut PactDaContract,
        milestone_id: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(contract.status == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        assert!(sender == contract.party_a, EUnauthorized);
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);

        let milestones = option::borrow_mut(&mut contract.milestones);

        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);

        let milestone = vector::borrow_mut(milestones, milestone_id);
        assert!(milestone.status == MILESTONE_STATUS_SUBMITTED, EInvalidStatus);

        milestone.status = MILESTONE_STATUS_APPROVED;

        create_receipt(object::id_address(contract), string::utf8(b"milestone_approved"), ctx);
    }

    // === Dispute Management ===

    public entry fun initiate_dispute(
        contract: &mut PactDaContract,
        milestone_id: u64,
        reason_hash: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(contract.status == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        assert!(
            (sender == contract.party_a) || (sender == contract.party_b && contract.party_b != @0x0),
            EUnauthorized
        );
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);

        let milestones = option::borrow_mut(&mut contract.milestones);

        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);

        contract.status = CONTRACT_STATUS_DISPUTED;

        contract.dispute_info = option::some(DisputeInfo {
            disputed_milestone_id: option::some(milestone_id),
            assigned_verifiers: option::none(),
            initiator: sender,
            reason_hash: option::some(reason_hash),
            outcome: option::none(),
        });
        create_receipt(object::id_address(contract), string::utf8(b"dispute_initiated"), ctx);
    }

    public entry fun simulate_dispute_outcome(
        contract: &mut PactDaContract,
        outcome: bool,
        ctx: &mut TxContext,
    ) {
        let _sender = tx_context::sender(ctx);
        assert!(contract.status == CONTRACT_STATUS_DISPUTED, EInvalidStatus);
        assert!(option::is_some(&contract.dispute_info), EInvalidStatus);

        let dispute_info = option::borrow_mut(&mut contract.dispute_info);
        dispute_info.outcome = option::some(outcome);

        if (outcome) {
            contract.status = CONTRACT_STATUS_COMPLETED;
        } else {
            contract.status = CONTRACT_STATUS_ACTIVE;
        };
        create_receipt(object::id_address(contract), string::utf8(b"dispute_outcome_simulated"), ctx);
    }

    // === Helper Functions ===
    fun create_receipt(
        contract_address: address,
        action_type: String,
        ctx: &mut TxContext,
    ) {
        event::emit(ContractActionEvent {
            contract_id: sui::object::id_from_address(contract_address),
            action_type,
            actor: tx_context::sender(ctx),
            timestamp: tx_context::epoch(ctx)
        });
    }

    public fun update_escrow_status(
        escrow: &mut Escrow,
        new_status: u8,
    ) {
        escrow.status = new_status;
    }

    // === View Functions ===
    public fun is_milestone_submitted(contract: &PactDaContract, milestone_id: u64): bool {
        if (!option::is_some(&contract.milestones)) {
            return false;
        };
        let milestones = option::borrow(&contract.milestones);
        if (milestone_id >= vector::length(milestones)) {
            return false;
        };
        let milestone = vector::borrow(milestones, milestone_id);
        milestone.status == MILESTONE_STATUS_SUBMITTED
    }

    public fun is_milestone_approved(contract: &PactDaContract, milestone_id: u64): bool {
        if (!option::is_some(&contract.milestones)) {
            return false;
        };
        let milestones = option::borrow(&contract.milestones);
        if (milestone_id >= vector::length(milestones)) {
            return false;
        };
        let milestone = vector::borrow(milestones, milestone_id);
        milestone.status == MILESTONE_STATUS_APPROVED
    }

    public fun get_escrow_id(contract: &PactDaContract): Option<ID> {
        contract.escrow_id
    }

    public fun get_status(contract: &PactDaContract): u8 {
        contract.status
    }

    public fun get_milestone_count(contract: &PactDaContract): u64 {
        if (option::is_some(&contract.milestones)) {
            vector::length(option::borrow(&contract.milestones))
        } else {
            0
        }
    }

    public fun get_party_a(contract: &PactDaContract): address {
        contract.party_a
    }

    public fun get_party_b(contract: &PactDaContract): address {
        contract.party_b
    }

    public fun is_party_a_signed(contract: &PactDaContract): bool {
        contract.is_party_a_signed
    }

    public fun is_party_b_signed(contract: &PactDaContract): bool {
        contract.is_party_b_signed
    }

    public fun get_title(contract: &PactDaContract): String {
        contract.title
    }

    public fun get_terms_content(contract: &PactDaContract): String {
        string::utf8(contract.terms_reference)
    }

    public fun get_milestone_details(contract: &PactDaContract, milestone_id: u64): (u64, vector<u8>, u64, u8) { 
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);
        let milestones = option::borrow(&contract.milestones);
        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
        
        let milestone = vector::borrow(milestones, milestone_id);
        (milestone.id, milestone.description_hash, milestone.value, milestone.status)
    }

    public fun milestone_has_proof(contract: &PactDaContract, milestone_id: u64): bool {
        if (!option::is_some(&contract.milestones)) {
            return false;
        };
        let milestones = option::borrow(&contract.milestones);
        if (milestone_id >= vector::length(milestones)) {
            return false;
        };
        let milestone = vector::borrow(milestones, milestone_id);
        option::is_some(&milestone.proof_reference)
    }

    public fun get_escrow_details(escrow: &Escrow): (u64, u8, address, address) {
        (
            balance::value(&escrow.balance),
            escrow.status,
            escrow.payer,
            escrow.payee,
        )
    }

    public fun get_escrow_contract_agaddress(escrow: &Escrow): address {
        escrow.contract_address
    }

    public fun get_escrow_payer(escrow: &Escrow): address {
        escrow.payer
    }

    public fun get_escrow_payee(escrow: &Escrow): address {
        escrow.payee
    }

    public fun get_escrow_status(escrow: &Escrow): u8 {
        escrow.status
    }

    public fun get_escrow_balance(escrow: &Escrow): u64 {
        balance::value(&escrow.balance)
    }

    public fun are_all_milestones_approved(contract: &PactDaContract): bool {
        if (!option::is_some(&contract.milestones)) {
            return true; 
        };
        let milestones = option::borrow(&contract.milestones);
        let len = vector::length(milestones);
        if (len == 0) {
            return true;
        };
        let mut i = 0;
        while (i < len) {
            let milestone = vector::borrow(milestones, i);
            if (milestone.status != MILESTONE_STATUS_APPROVED) {
                return false;
            };
            i = i + 1;
        };
        true
    }

    public(package) fun update_status_from_bridge(
        contract: &mut PactDaContract,
        new_status: u8,
        ctx: &mut TxContext
    ) {
        assert!(contract.status == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        assert!(new_status == CONTRACT_STATUS_COMPLETED, EInvalidStatus); 

        contract.status = new_status;

        create_receipt(object::id_address(contract), string::utf8(b"status_updated_from_bridge"), ctx);
    }

    public(package) fun approve_milestone_from_bridge(
        contract: &mut PactDaContract,
        milestone_id: u64,
        ctx: &mut TxContext,
    ) {
        assert!(contract.status == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);

        let milestones = option::borrow_mut(&mut contract.milestones);
        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);

        let milestone = vector::borrow_mut(milestones, milestone_id);
        assert!(milestone.status == MILESTONE_STATUS_SUBMITTED, EInvalidStatus);

        milestone.status = MILESTONE_STATUS_APPROVED;

        create_receipt(object::id_address(contract), string::utf8(b"milestone_approved_from_bridge"), ctx);
    }

    public(package) fun confirm_party_b_signed_from_bridge(
        contract: &mut PactDaContract,
        ctx: &mut TxContext,
    ) {
        assert!(contract.party_b == @0x0, EInvalidStatus); 
        assert!(option::is_some(&contract.cross_chain_parties), EInvalidStatus); 
        assert!(contract.status == CONTRACT_STATUS_PENDING, EInvalidStatus);
        assert!(!contract.is_party_b_signed, EInvalidStatus); 

        contract.is_party_b_signed = true;

        event::emit(ContractSignedEvent {
            contract_id: object::id(contract),
            signer: tx_context::sender(ctx), 
        });
        create_receipt(object::id_address(contract), string::utf8(b"contract_signed_by_b_via_bridge"), ctx);

        if (contract.is_party_a_signed && contract.is_party_b_signed) {
            contract.status = CONTRACT_STATUS_ACTIVE;
        };
    }

    public(package) fun update_details_from_bridge(
        contract: &mut PactDaContract,
        mut title_option: Option<vector<u8>>,
        mut terms_reference_option: Option<vector<u8>>,
        contract_start_date_option: Option<u64>,
        contract_deadline_date_option: Option<u64>,
        metadata_option: Option<vector<u8>>,
        mut contract_type_option: Option<u8>,
        ctx: &mut TxContext
    ) {
        assert!(
            contract.status == CONTRACT_STATUS_PENDING ||
            contract.status == CONTRACT_STATUS_ACTIVE ||
            contract.status == CONTRACT_STATUS_DRAFT,
            EInvalidStatus
        );

        if (option::is_some(&title_option)) {
            contract.title = string::utf8(option::extract(&mut title_option));
        };
        if (option::is_some(&terms_reference_option)) {
            contract.terms_reference = option::extract(&mut terms_reference_option);
        };
        if (option::is_some(&contract_start_date_option)) {
            contract.contract_start_date = contract_start_date_option;
        };
        if (option::is_some(&contract_deadline_date_option)) {
            contract.contract_deadline_date = contract_deadline_date_option;
        };
        if (option::is_some(&metadata_option)) {
            contract.metadata = metadata_option;
        };
        if (option::is_some(&contract_type_option)) {
            contract.contract_type = option::extract(&mut contract_type_option);
        };

        create_receipt(object::id_address(contract), string::utf8(b"details_updated_from_bridge"), ctx);
    }

    public(package) fun submit_proof_from_bridge(
        contract: &mut PactDaContract,
        milestone_id: u64,
        proof_reference_bytes: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(contract.status == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);

        let milestones = option::borrow_mut(&mut contract.milestones);
        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);

        let milestone = vector::borrow_mut(milestones, milestone_id);
        assert!(milestone.status == MILESTONE_STATUS_PENDING, EInvalidStatus);

        milestone.status = MILESTONE_STATUS_SUBMITTED;
        milestone.proof_reference = option::some(proof_reference_bytes);

        create_receipt(object::id_address(contract), string::utf8(b"proof_submitted_from_bridge"), ctx);
    }

    // === Test Helpers - Constants ===
    #[test_only]
    public fun get_contract_status_pending(): u8 {
        CONTRACT_STATUS_PENDING
    }

    public fun get_contract_status_active(): u8 {
        CONTRACT_STATUS_ACTIVE
    }

    public fun get_contract_status_completed(): u8 {
        CONTRACT_STATUS_COMPLETED
    }
    
    public fun get_contract_status_disputed(): u8 {
        CONTRACT_STATUS_DISPUTED
    }

    #[test_only]
    public fun get_contract_status_cancelled(): u8 {
        CONTRACT_STATUS_CANCELLED
    }    
    
    #[test_only]
    public fun get_contract_status_draft(): u8 {
        CONTRACT_STATUS_DRAFT
    }

    public fun get_escrow_status_funded(): u8 {
        ESCROW_STATUS_FUNDED
    }

    public fun get_escrow_status_released(): u8 {
        ESCROW_STATUS_RELEASED
    }

    public fun get_escrow_status_refunded(): u8 {
        ESCROW_STATUS_REFUNDED
    }

    #[test_only]
    public fun get_milestone_status_pending(): u8 {
        MILESTONE_STATUS_PENDING
    }

    #[test_only]
    public fun get_milestone_status_submitted(): u8 {
        MILESTONE_STATUS_SUBMITTED
    }

    public fun get_milestone_status_approved(): u8 {
        MILESTONE_STATUS_APPROVED
    }

    // === Test Helpers - Fields Access ===
    #[test_only]
    public fun get_terms_reference_test_only(contract: &PactDaContract): &vector<u8> {
        &contract.terms_reference
    }

    #[test_only]
    public fun get_contract_start_date_test_only(contract: &PactDaContract): &Option<u64> {
        &contract.contract_start_date
    }

    #[test_only]
    public fun get_contract_deadline_date_test_only(contract: &PactDaContract): &Option<u64> {
        &contract.contract_deadline_date
    }

    #[test_only]
    public fun get_metadata_test_only(contract: &PactDaContract): &Option<vector<u8>> {
        &contract.metadata
    }

    #[test_only]
    public fun get_contract_type_test_only(contract: &PactDaContract): u8 {
        contract.contract_type
    }

    public fun get_milestones(contract: &PactDaContract): &Option<vector<Milestone>> {
        &contract.milestones
    }

    public fun get_contract_status(contract: &PactDaContract): u8 {
        contract.status
    }

    #[test_only]
    public fun get_milestone(contract: &PactDaContract, milestone_id: u64): &Milestone {
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);
        let milestones = option::borrow(&contract.milestones);
        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
        
        vector::borrow(milestones, milestone_id)
    }

    public fun get_milestone_status(milestone: &Milestone): u8 {
        milestone.status
    }

    #[test_only]
    public fun get_milestone_proof(milestone: &Milestone): &Option<vector<u8>> {
        &milestone.proof_reference
    }

    #[test_only]
    public fun get_milestone_id(milestone: &Milestone): u64 {
        milestone.id
    }

    #[test_only]
    public fun get_milestone_description_hash(milestone: &Milestone): &vector<u8> { 
        &milestone.description_hash
    }

    public fun get_milestone_value(milestone: &Milestone): u64 {
        milestone.value
    }

    // === For bridge integration tests ===
    #[test_only]
    public fun get_error_invalid_status(): u64 {
        EInvalidStatus
    }

    #[test_only]
    public fun get_error_unauthorized(): u64 {
        EUnauthorized
    }

    #[test_only]
    public fun get_error_invalid_milestone(): u64 {
        EInvalidMilestone
    }

    // === ContractReceipt NFT for discoverability ===
    public struct ContractReceipt has key, store {
        id: UID,
        contract_id: ID,
        contract_title: String,
        party: address,
        role: u8, // 0 = PartyA, 1 = PartyB
    }

    public fun mint_contract_receipt(contract: &PactDaContract, party: address, role: u8, ctx: &mut TxContext): ContractReceipt {
        ContractReceipt {
            id: object::new(ctx),
            contract_id: object::id(contract),
            contract_title: contract.title,
            party,
            role,
        }
    }

    public entry fun issue_contract_receipts(contract: &PactDaContract, ctx: &mut TxContext) {
        let party_a = contract.party_a;
        let party_b = contract.party_b;
        let receipt_a = mint_contract_receipt(contract, party_a, 0, ctx);
        let receipt_b = mint_contract_receipt(contract, party_b, 1, ctx);
        transfer::transfer(receipt_a, party_a);
        transfer::transfer(receipt_b, party_b);
    }

}