/*
/// Module: pactda
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions
module pactda::pactda;


    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;
    use std::string::{Self, String};

    // Error codes
    // const EInvalidParty: u64 = 1;
    const EInvalidStatus: u64 = 2;
    // const EInsufficientFunds: u64 = 3;
    const EUnauthorized: u64 = 4;
    const EInvalidMilestone: u64 = 5;
    // const ENotSigned: u64 = 6;

    // Status codes
    const CONTRACT_STATUS_PENDING: u8 = 0;
    const CONTRACT_STATUS_ACTIVE: u8 = 1;
    // const CONTRACT_STATUS_DISPUTED: u8 = 2;
    const CONTRACT_STATUS_COMPLETED: u8 = 3;
    // const CONTRACT_STATUS_CANCELLED: u8 = 4;

    const ESCROW_STATUS_FUNDED: u8 = 0;
    const ESCROW_STATUS_RELEASED: u8 = 1;
    const ESCROW_STATUS_REFUNDED: u8 = 2;
    // const ESCROW_STATUS_LOCKED: u8 = 3;

    const MILESTONE_STATUS_PENDING: u8 = 0;
    const MILESTONE_STATUS_SUBMITTED: u8 = 1;
    const MILESTONE_STATUS_APPROVED: u8 = 2;
    // const MILESTONE_STATUS_DISPUTED: u8 = 3;

    // Main contract object
    public struct PactDaContract has key, store {
        id: UID,
        status: u8,
        party_a: address,
        party_b: address,
        terms_reference: vector<u8>,
        escrow_id: Option<address>,
        milestones: Option<vector<Milestone>>,
        party_a_signed: bool,
        party_b_signed: bool,
    }

    // Escrow object
    public struct Escrow has key {
        id: UID,
        contract_address: address,
        balance: Balance<SUI>,
        payer: address,
        payee: address,
        status: u8,
    }

    // Basic VCNFT for verification credentials
    public struct VCNFT has key, store {
        id: UID,
        owner: address,
        type_id: u8,
        is_active: bool,
        specialization_tags: vector<String>,
    }

    // Supporting struct
    public struct Milestone has store, drop {
        id: u64,
        description: String,
        value: u64,
        status: u8,
        proof_reference: Option<vector<u8>>
    }

    // Receipt for contract operations
    public struct ContractReceipt has key, store {
        id: UID,
        contract_address: address,
        action_type: String,
        timestamp: u64,
    }

    // === Events ===
    /// Event emitted when a contract is created
    public struct ContractCreatedEvent has copy, drop {
        contract_id: ID,
        party_a: address,
        party_b: address
    }

    /// Event emitted when a contract is signed
    public struct ContractSignedEvent has copy, drop {
        contract_id: ID,
        signer: address
    }

    /// Event emitted when an escrow is funded
    public struct EscrowFundedEvent has copy, drop {
        escrow_id: ID,
        amount: u64,
        payer: address
    }

    // === Contract Creation and Management ===

    /// Creates a new contract between two parties
    public entry fun create_contract(
        party_b: address,
        terms_reference: vector<u8>,
        ctx: &mut TxContext
    ) {
        let party_a = tx_context::sender(ctx);
        
        // Create and transfer the contract without milestones
        let contract = PactDaContract {
            id: object::new(ctx),
            status: CONTRACT_STATUS_PENDING,
            party_a,
            party_b,
            terms_reference,
            escrow_id: option::none(),
            milestones: option::none(),
            party_a_signed: false,
            party_b_signed: false,
        };

        let contract_id = object::id(&contract);
        
        // Emit contract created event
        event::emit(ContractCreatedEvent {
            contract_id,
            party_a,
            party_b
        });

        transfer::share_object(contract);
        
        // Create receipt
        create_receipt(object::id_to_address(&contract_id), string::utf8(b"contract_created"), ctx);
    }

    /// Adds milestones to an existing contract
    public entry fun add_milestones(
        contract: &mut PactDaContract,
        milestone_descriptions: vector<String>,
        milestone_values: vector<u64>,
        ctx: &mut TxContext
    ) {
        // Validate inputs
        assert!(vector::length(&milestone_descriptions) == vector::length(&milestone_values), EInvalidMilestone);
        assert!(vector::length(&milestone_descriptions) > 0, EInvalidMilestone);
        
        let sender = tx_context::sender(ctx);
        
        // Only contract parties can add milestones
        assert!(sender == contract.party_a || sender == contract.party_b, EUnauthorized);
        
        // Can only add milestones when contract is pending
        assert!(contract.status == CONTRACT_STATUS_PENDING, EInvalidStatus);
        
        // If milestones already exist, add to them
        if (option::is_some(&contract.milestones)) {
            let milestones = option::borrow_mut(&mut contract.milestones);
            let starting_id = vector::length(milestones);
            
            let mut i = 0;
            let len = vector::length(&milestone_descriptions);
            while (i < len) {
                let milestone = Milestone {
                    id: starting_id + i,
                    description: *vector::borrow(&milestone_descriptions, i),
                    value: *vector::borrow(&milestone_values, i),
                    status: MILESTONE_STATUS_PENDING,
                    proof_reference: option::none(),
                };
                vector::push_back(milestones, milestone);
                i = i + 1;
            };
        } else {
            // Create new milestones if none exist
            let mut milestones_vec = vector::empty<Milestone>();
            
            let mut i = 0;
            let len = vector::length(&milestone_descriptions);
            while (i < len) {
                let milestone = Milestone {
                    id: i,
                    description: *vector::borrow(&milestone_descriptions, i),
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

    // Party A signs the contract (if not the creator)
    public entry fun sign_contract_party_a(
        contract: &mut PactDaContract,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Only party A can call this
        assert!(sender == contract.party_a, EUnauthorized);
        assert!(contract.status == CONTRACT_STATUS_PENDING, EInvalidStatus);
        assert!(!contract.party_a_signed, EInvalidStatus); // Only if not already signed
        
        contract.party_a_signed = true;
        
        // Activate contract if both parties have signed
        if (contract.party_a_signed && contract.party_b_signed) {
            contract.status = CONTRACT_STATUS_ACTIVE;
        };
        
        event::emit(ContractSignedEvent {
            contract_id: object::id(contract),
            signer: sender
        });
        
        create_receipt(object::id_address(contract), string::utf8(b"contract_signed_by_a"), ctx);
    }

    // Party B signs the contract
    public entry fun sign_contract_party_b(
        contract: &mut PactDaContract,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Only party B can call this
        assert!(sender == contract.party_b, EUnauthorized);
        assert!(contract.status == CONTRACT_STATUS_PENDING, EInvalidStatus);
        assert!(!contract.party_b_signed, EInvalidStatus); // Only if not already signed
        
        contract.party_b_signed = true;
        
        // Activate contract if both parties have signed
        if (contract.party_a_signed && contract.party_b_signed) {
            contract.status = CONTRACT_STATUS_ACTIVE;
        };
        
        event::emit(ContractSignedEvent {
            contract_id: object::id(contract),
            signer: sender
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
        
        // Validate contract status and authorization
        assert!(contract.status == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        assert!(sender == contract.party_a || sender == contract.party_b, EUnauthorized);
        
        // Create escrow object
        let payment_balance = coin::into_balance(payment);
        let amount = balance::value(&payment_balance);
        let payer = sender;
        let payee = if (sender == contract.party_a) { contract.party_b } else { contract.party_a };
        
        let escrow = Escrow {
            id: object::new(ctx),
            contract_address: object::id_address(contract),
            balance: payment_balance,
            payer,
            payee,
            status: ESCROW_STATUS_FUNDED,
        };
        
        let escrow_id = object::id(&escrow);
        
        // Store escrow ID in contract
        contract.escrow_id = option::some(object::id_address(&escrow));
        
        event::emit(EscrowFundedEvent {
            escrow_id,
            amount,
            payer
        });
        
        // Share the escrow object
        transfer::share_object(escrow);
        
        create_receipt(object::id_address(contract), string::utf8(b"escrow_funded"), ctx);
    }

    public entry fun release_payment(
        contract: &mut PactDaContract,
        escrow: &mut Escrow,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Validate contract and escrow relationship
        assert!(option::contains(&contract.escrow_id, &object::id_address(escrow)), EInvalidStatus);
        
        // Validate authorization - only payer can release funds
        assert!(sender == escrow.payer, EUnauthorized);
        assert!(escrow.status == ESCROW_STATUS_FUNDED, EInvalidStatus);
        
        // Release funds
        let amount = balance::value(&escrow.balance);
        let coin = coin::from_balance(balance::split(&mut escrow.balance, amount), ctx);
        transfer::public_transfer(coin, escrow.payee);
        
        // Update status
        escrow.status = ESCROW_STATUS_RELEASED;
        
        // Check if milestones exist and all are completed
        if (option::is_some(&contract.milestones)) {
            let mut all_completed = true;
            let milestones = option::borrow(&contract.milestones);
            let mut i = 0;
            let len = vector::length(milestones);
            
            while (i < len) {
                let milestone = vector::borrow(milestones, i);
                if (milestone.status != MILESTONE_STATUS_APPROVED) {
                    all_completed = false;
                    break
                };
                i = i + 1;
            };
            
            if (all_completed) {
                contract.status = CONTRACT_STATUS_COMPLETED;
            };
        } else {
            // No milestones, mark contract as completed
            contract.status = CONTRACT_STATUS_COMPLETED;
        };
        
        create_receipt(object::id_address(contract), string::utf8(b"payment_released"), ctx);
    }

    public entry fun refund_payment(
        contract: &mut PactDaContract,
        escrow: &mut Escrow,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Validate contract and escrow relationship
        assert!(option::contains(&contract.escrow_id, &object::id_address(escrow)), EInvalidStatus);
        
        // Only payee can agree to refund
        assert!(sender == escrow.payee, EUnauthorized);
        assert!(escrow.status == ESCROW_STATUS_FUNDED, EInvalidStatus);
        
        // Refund payment
        let amount = balance::value(&escrow.balance);
        let coin = coin::from_balance(balance::split(&mut escrow.balance, amount), ctx);
        transfer::public_transfer(coin, escrow.payer);
        
        // Update status
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
        
        // Validate contract status and authorization
        assert!(contract.status == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        assert!(sender == contract.party_b, EUnauthorized);
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);
        
        // Get milestones
        let milestones = option::borrow_mut(&mut contract.milestones);
        
        // Validate milestone exists
        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
        
        // Update milestone
        let milestone = vector::borrow_mut(milestones, milestone_id);
        assert!(milestone.status == MILESTONE_STATUS_PENDING, EInvalidStatus);
        
        milestone.status = MILESTONE_STATUS_SUBMITTED;
        milestone.proof_reference = option::some(proof_reference);
        
        create_receipt(object::id_address(contract), string::utf8(b"proof_submitted"), ctx);
    }

    public entry fun approve_milestone(
        contract: &mut PactDaContract,
        milestone_id: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Validate contract status and authorization
        assert!(contract.status == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        assert!(sender == contract.party_a, EUnauthorized);
        assert!(option::is_some(&contract.milestones), EInvalidMilestone);
        
        // Get milestones
        let milestones = option::borrow_mut(&mut contract.milestones);
        
        // Validate milestone exists
        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
        
        // Update milestone
        let milestone = vector::borrow_mut(milestones, milestone_id);
        assert!(milestone.status == MILESTONE_STATUS_SUBMITTED, EInvalidStatus);
        
        milestone.status = MILESTONE_STATUS_APPROVED;
        
        create_receipt(object::id_address(contract), string::utf8(b"milestone_approved"), ctx);
    }

    // === VCNFT Management ===

    public entry fun create_vcnft(
        type_id: u8,
        specialization_tags: vector<String>,
        ctx: &mut TxContext
    ) {
        let owner = tx_context::sender(ctx);
        
        let vcnft = VCNFT {
            id: object::new(ctx),
            owner,
            type_id,
            is_active: true,
            specialization_tags,
        };
        
        transfer::transfer(vcnft, owner);
    }

    // === Helper Functions ===
    #[allow(lint(self_transfer))]
    fun create_receipt(
        contract_address: address,
        action_type: String,
        ctx: &mut TxContext
    ) {
        let receipt = ContractReceipt {
            id: object::new(ctx),
            contract_address,
            action_type,
            timestamp: tx_context::epoch(ctx),
        };
        
        transfer::transfer(receipt, tx_context::sender(ctx));
    }

    // === View Functions ===
    /// Returns whether a milestone exists and is in submitted state
    public fun is_milestone_submitted(contract: &PactDaContract, milestone_id: u64): bool {
        if (!option::is_some(&contract.milestones)) {
            return false
        };
        
        let milestones = option::borrow(&contract.milestones);
        if (milestone_id >= vector::length(milestones)) {
            return false
        };
        
        let milestone = vector::borrow(milestones, milestone_id);
        milestone.status == MILESTONE_STATUS_SUBMITTED
    }
    
    /// Returns whether a milestone exists and is approved
    public fun is_milestone_approved(contract: &PactDaContract, milestone_id: u64): bool {
        if (!option::is_some(&contract.milestones)) {
            return false
        };
        
        let milestones = option::borrow(&contract.milestones);
        if (milestone_id >= vector::length(milestones)) {
            return false
        };
        
        let milestone = vector::borrow(milestones, milestone_id);
        milestone.status == MILESTONE_STATUS_APPROVED
    }

    /// Returns the escrow ID of a contract if it exists
    public fun get_escrow_id(contract: &PactDaContract): Option<address> {
        contract.escrow_id
    }
    
    /// Returns the status of a contract
    public fun get_status(contract: &PactDaContract): u8 {
        contract.status
    }
    
    /// Returns whether party A has signed the contract
    public fun is_party_a_signed(contract: &PactDaContract): bool {
        contract.party_a_signed
    }
    
    /// Returns whether party B has signed the contract
    public fun is_party_b_signed(contract: &PactDaContract): bool {
        contract.party_b_signed
    }

    public fun get_party_a(contract: &PactDaContract): address {
        contract.party_a
    }

    public fun get_party_b(contract: &PactDaContract): address {
        contract.party_b
    }

    /// Returns the owner of a VCNFT
    public fun get_vcnft_owner(vcnft: &VCNFT): address {
        vcnft.owner
    }
    
    /// Returns the type ID of a VCNFT
    public fun get_vcnft_type_id(vcnft: &VCNFT): u8 {
        vcnft.type_id
    }
    
    /// Returns whether a VCNFT is active
    public fun is_vcnft_active(vcnft: &VCNFT): bool {
        vcnft.is_active
    }
    
    /// Returns the specialization tags of a VCNFT
    public fun get_vcnft_specialization_tags(vcnft: &VCNFT): &vector<String> {
        &vcnft.specialization_tags
    }



