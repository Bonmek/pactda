module pactda::pactda_milestone {
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
    
    use pactda::pactda;
    use pactda::pactda_utils;

    const EInvalidStatus: u64 = 2;
    const EUnauthorized: u64 = 4;
    const EInvalidMilestone: u64 = 5;
    const EInsufficientFunds: u64 = 6;
    const EMilestonePaid: u64 = 7;
    const EMilestoneDisputed: u64 = 8;
    
    const CONTRACT_STATUS_ACTIVE: u8 = 2;
    const CONTRACT_STATUS_DISPUTED: u8 = 3;
    const CONTRACT_STATUS_COMPLETED: u8 = 4;
    const ESCROW_STATUS_FUNDED: u8 = 0;
    const ESCROW_STATUS_RELEASED: u8 = 1;
    const ESCROW_STATUS_REFUNDED: u8 = 2;
    const MILESTONE_STATUS_APPROVED: u8 = 2;
    
    public struct MilestonePaymentRecord has key, store {
        id: UID,
        contract_id: ID,
        paid_milestones: vector<u64>,
        disputed_milestones: vector<u64>,
        total_paid: u64,
        escrow_id: ID,
        last_payment_timestamp: u64,
    }
    
    public struct MilestonePaymentReleasedEvent has copy, drop {
        contract_id: ID,
        milestone_id: u64,
        amount: u64,
        payer: address,
        payee: address,
        timestamp: u64,
    }

    public struct MilestonePaymentRecordCreatedEvent has copy, drop {
        record_id: ID,
        contract_id: ID,
        escrow_id: ID
    }

    public struct MilestoneDisputedEvent has copy, drop {
        contract_id: ID,
        milestone_id: u64,
        dispute_initiator: address
    }
    
    public entry fun create_payment_record(
        contract: &pactda::PactDaContract,
        escrow: &pactda::Escrow,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(pactda::get_escrow_id(contract) == option::some(object::id(escrow)), EInvalidStatus);
        
        assert!(sender == pactda::get_escrow_payer(escrow), EUnauthorized);
        
        let payment_record = MilestonePaymentRecord {
            id: object::new(ctx),
            contract_id: object::id(contract),
            paid_milestones: vector::empty<u64>(),
            disputed_milestones: vector::empty<u64>(),
            total_paid: 0,
            escrow_id: object::id(escrow),
            last_payment_timestamp: tx_context::epoch(ctx),
        };
        
        let record_id = object::id(&payment_record);
        
        event::emit(MilestonePaymentRecordCreatedEvent {
            record_id,
            contract_id: object::id(contract),
            escrow_id: object::id(escrow)
        });
        
        transfer::share_object(payment_record);
    }    public entry fun release_milestone_payment(
        contract: &mut pactda::PactDaContract,
        escrow: &mut pactda::Escrow,
        milestone_id: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(pactda::get_escrow_id(contract) == option::some(object::id(escrow)), EInvalidStatus);
        assert!(sender == pactda::get_escrow_payer(escrow), EUnauthorized);
        assert!(pactda::get_escrow_status(escrow) == ESCROW_STATUS_FUNDED, EInvalidStatus);
        
        assert!(pactda::get_status(contract) == pactda::get_contract_status_active(), EInvalidStatus);
        
        let milestone_value: u64;
        
        {
            assert!(option::is_some(pactda::get_milestones(contract)), EInvalidMilestone);
            let milestones = option::borrow(pactda::get_milestones(contract));
            assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
            
            if (is_milestone_disputed(contract, milestone_id)) {
                abort EMilestoneDisputed
            };
            
            let milestone = vector::borrow(milestones, milestone_id);
            assert!(pactda::get_milestone_status(milestone) == pactda::get_milestone_status_approved(), EInvalidStatus);
            milestone_value = pactda::get_milestone_value(milestone);
        };
        
        let escrow_balance = pactda::get_escrow_balance(escrow);
        assert!(escrow_balance >= milestone_value, EInsufficientFunds);
        
        pactda::release_payment(contract, escrow, ctx);
        
        let timestamp = tx_context::epoch(ctx);
        
        event::emit(MilestonePaymentReleasedEvent {
            contract_id: object::id(contract),
            milestone_id,
            amount: milestone_value,
            payer: pactda::get_escrow_payer(escrow),
            payee: pactda::get_escrow_payee(escrow),
            timestamp
        });
    }
      public entry fun release_multiple_milestone_payments(
        contract: &mut pactda::PactDaContract,
        escrow: &mut pactda::Escrow,
        milestone_ids: vector<u64>,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(pactda::get_escrow_id(contract) == option::some(object::id(escrow)), EInvalidStatus);
        assert!(sender == pactda::get_escrow_payer(escrow), EUnauthorized);
        assert!(pactda::get_escrow_status(escrow) == ESCROW_STATUS_FUNDED, EInvalidStatus);
        assert!(pactda::get_status(contract) == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        
        assert!(option::is_some(pactda::get_milestones(contract)), EInvalidMilestone);
        
        let mut total_payment = 0;
        let mut milestone_values = vector::empty<u64>();
        {
            let milestones = option::borrow(pactda::get_milestones(contract));
            let mut i = 0;
            let len = vector::length(&milestone_ids);
            
            while (i < len) {
                let milestone_id = *vector::borrow(&milestone_ids, i);
                assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
                
                if (is_milestone_disputed(contract, milestone_id)) {
                    abort EMilestoneDisputed
                };
                
                let milestone = vector::borrow(milestones, milestone_id);
                assert!(pactda::get_milestone_status(milestone) == MILESTONE_STATUS_APPROVED, EInvalidStatus);
                
                let milestone_value = pactda::get_milestone_value(milestone);
                total_payment = total_payment + milestone_value;
                vector::push_back(&mut milestone_values, milestone_value);
                i = i + 1;
            };
        };
        
        let escrow_balance = pactda::get_escrow_balance(escrow);
        assert!(escrow_balance >= total_payment, EInsufficientFunds);
        
        pactda::release_payment(contract, escrow, ctx);
        
        let timestamp = tx_context::epoch(ctx);
        
        {
            let milestones = option::borrow(pactda::get_milestones(contract));
            let mut i = 0;
            let len = vector::length(&milestone_ids);
            
            while (i < len) {
                let milestone_id = *vector::borrow(&milestone_ids, i);
                let milestone = vector::borrow(milestones, milestone_id);
                
                event::emit(MilestonePaymentReleasedEvent {
                    contract_id: object::id(contract),
                    milestone_id,
                    amount: pactda::get_milestone_value(milestone),
                    payer: pactda::get_escrow_payer(escrow),
                    payee: pactda::get_escrow_payee(escrow),
                    timestamp
                });
                
                i = i + 1;
            };
        }
    }
      public entry fun release_multiple_milestone_payments_with_tracking(
        contract: &mut pactda::PactDaContract,
        escrow: &mut pactda::Escrow,
        milestone_ids: vector<u64>,
        payment_record: &mut MilestonePaymentRecord,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(payment_record.contract_id == object::id(contract), EInvalidStatus);
        assert!(payment_record.escrow_id == object::id(escrow), EInvalidStatus);
        
        assert!(pactda::get_escrow_id(contract) == option::some(object::id(escrow)), EInvalidStatus);
        assert!(sender == pactda::get_escrow_payer(escrow), EUnauthorized);
        assert!(pactda::get_escrow_status(escrow) == ESCROW_STATUS_FUNDED, EInvalidStatus);
        assert!(pactda::get_status(contract) == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        
        assert!(option::is_some(pactda::get_milestones(contract)), EInvalidMilestone);
        
        let mut total_payment = 0;
        let mut milestone_values = vector::empty<u64>();
        
        {
            let milestones = option::borrow(pactda::get_milestones(contract));
            
            let mut i = 0;
            let len = vector::length(&milestone_ids);
            
            while (i < len) {
                let milestone_id = *vector::borrow(&milestone_ids, i);
                
                assert!(!vector::contains(&payment_record.paid_milestones, &milestone_id), EMilestonePaid);
                
                if (is_milestone_disputed(contract, milestone_id) || 
                    vector::contains(&payment_record.disputed_milestones, &milestone_id)) {
                    abort EMilestoneDisputed
                };
                
                assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
                
                let milestone = vector::borrow(milestones, milestone_id);
                assert!(pactda::get_milestone_status(milestone) == MILESTONE_STATUS_APPROVED, EInvalidStatus);
                
                let milestone_value = pactda::get_milestone_value(milestone);
                total_payment = total_payment + milestone_value;
                vector::push_back(&mut milestone_values, milestone_value);
                i = i + 1;
            };
        };
        
        let escrow_balance = pactda::get_escrow_balance(escrow);
        assert!(escrow_balance >= total_payment, EInsufficientFunds);
        
        pactda::release_payment(contract, escrow, ctx);
        
        let timestamp = tx_context::epoch(ctx);
        payment_record.last_payment_timestamp = timestamp;
        
        {
            let milestones = option::borrow(pactda::get_milestones(contract));
            
            let mut i = 0;
            let len = vector::length(&milestone_ids);
            
            while (i < len) {
                let milestone_id = *vector::borrow(&milestone_ids, i);
                let milestone = vector::borrow(milestones, milestone_id);
                let milestone_value = pactda::get_milestone_value(milestone);
                
                vector::push_back(&mut payment_record.paid_milestones, milestone_id);
                
                event::emit(MilestonePaymentReleasedEvent {
                    contract_id: object::id(contract),
                    milestone_id,
                    amount: milestone_value,
                    payer: pactda::get_escrow_payer(escrow),
                    payee: pactda::get_escrow_payee(escrow),
                    timestamp
                });
                
                i = i + 1;
            };
        };
        
        payment_record.total_paid = payment_record.total_paid + total_payment;
    }
      public entry fun release_milestone_payment_with_tracking(
        contract: &mut pactda::PactDaContract,
        escrow: &mut pactda::Escrow,
        milestone_id: u64,
        payment_record: &mut MilestonePaymentRecord,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(payment_record.contract_id == object::id(contract), EInvalidStatus);
        assert!(payment_record.escrow_id == object::id(escrow), EInvalidStatus);
        
        assert!(pactda::get_escrow_id(contract) == option::some(object::id(escrow)), EInvalidStatus);
        assert!(sender == pactda::get_escrow_payer(escrow), EUnauthorized);
        assert!(pactda::get_escrow_status(escrow) == ESCROW_STATUS_FUNDED, EInvalidStatus);
        assert!(pactda::get_status(contract) == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        
        assert!(!vector::contains(&payment_record.paid_milestones, &milestone_id), EMilestonePaid);
        
        if (is_milestone_disputed(contract, milestone_id) ||
            vector::contains(&payment_record.disputed_milestones, &milestone_id)) {
            abort EMilestoneDisputed
        };
        
        let milestone_value: u64;
        
        {
            assert!(option::is_some(pactda::get_milestones(contract)), EInvalidMilestone);
            let milestones = option::borrow(pactda::get_milestones(contract));
            assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
            
            let milestone = vector::borrow(milestones, milestone_id);
            assert!(pactda::get_milestone_status(milestone) == MILESTONE_STATUS_APPROVED, EInvalidStatus);
            
            milestone_value = pactda::get_milestone_value(milestone);
        };
        
        let escrow_balance = pactda::get_escrow_balance(escrow);
        assert!(escrow_balance >= milestone_value, EInsufficientFunds);
        
        pactda::release_payment(contract, escrow, ctx);
        
        vector::push_back(&mut payment_record.paid_milestones, milestone_id);
        payment_record.total_paid = payment_record.total_paid + milestone_value;
        
        let timestamp = tx_context::epoch(ctx);
        payment_record.last_payment_timestamp = timestamp;
        
        event::emit(MilestonePaymentReleasedEvent {
            contract_id: object::id(contract),
            milestone_id,
            amount: milestone_value,
            payer: pactda::get_escrow_payer(escrow),
            payee: pactda::get_escrow_payee(escrow),
            timestamp
        });
    }
    
    // === Dispute Handling ===
    public fun is_milestone_disputed(contract: &pactda::PactDaContract, milestone_id: u64): bool {
        pactda::get_status(contract) == CONTRACT_STATUS_DISPUTED
    }
    
    public entry fun mark_milestone_disputed(
        contract: &pactda::PactDaContract,
        milestone_id: u64,
        payment_record: &mut MilestonePaymentRecord,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(payment_record.contract_id == object::id(contract), EInvalidStatus);
        
        assert!(
            (sender == pactda::get_party_a(contract)) || 
            (sender == pactda::get_party_b(contract) && pactda::get_party_b(contract) != @0x0),
            EUnauthorized
        );
        
        assert!(option::is_some(pactda::get_milestones(contract)), EInvalidMilestone);
        let milestones = option::borrow(pactda::get_milestones(contract));
        assert!(milestone_id < vector::length(milestones), EInvalidMilestone);
        
        assert!(!vector::contains(&payment_record.paid_milestones, &milestone_id), EMilestonePaid);
        
        if (!vector::contains(&payment_record.disputed_milestones, &milestone_id)) {
            vector::push_back(&mut payment_record.disputed_milestones, milestone_id);
            
            event::emit(MilestoneDisputedEvent {
                contract_id: object::id(contract),
                milestone_id,
                dispute_initiator: sender
            });
        }
    }
    
    public entry fun process_dispute_refund(
        contract: &mut pactda::PactDaContract,
        escrow: &mut pactda::Escrow,
        refund_amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(
            (sender == pactda::get_party_a(contract)) || 
            (sender == pactda::get_party_b(contract) && pactda::get_party_b(contract) != @0x0),
            EUnauthorized
        );
        
        assert!(pactda::get_escrow_id(contract) == option::some(object::id(escrow)), EInvalidStatus);
        
        assert!(pactda::get_status(contract) == CONTRACT_STATUS_ACTIVE, EInvalidStatus);
        
        let escrow_balance = pactda::get_escrow_balance(escrow);
        assert!(escrow_balance >= refund_amount, EInsufficientFunds);
        pactda::refund_payment(contract, escrow, ctx);
    }
    
    // === View Functions ===
    
    public fun is_milestone_paid(payment_record: &MilestonePaymentRecord, milestone_id: u64): bool {
        vector::contains(&payment_record.paid_milestones, &milestone_id)
    }
    
    public fun is_milestone_marked_disputed(payment_record: &MilestonePaymentRecord, milestone_id: u64): bool {
        vector::contains(&payment_record.disputed_milestones, &milestone_id)
    }
    
    public fun get_total_paid(payment_record: &MilestonePaymentRecord): u64 {
        payment_record.total_paid
    }
    
    public fun get_paid_milestones(payment_record: &MilestonePaymentRecord): vector<u64> {
        payment_record.paid_milestones
    }
    
    public fun get_disputed_milestones(payment_record: &MilestonePaymentRecord): vector<u64> {
        payment_record.disputed_milestones
    }
    
    public fun get_contract_id(payment_record: &MilestonePaymentRecord): ID {
        payment_record.contract_id
    }
    
    public fun get_escrow_id(payment_record: &MilestonePaymentRecord): ID {
        payment_record.escrow_id
    }
    
    public fun get_last_payment_timestamp(payment_record: &MilestonePaymentRecord): u64 {
        payment_record.last_payment_timestamp
    }
}
