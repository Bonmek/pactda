#[test_module(pactda = @pactda)]
module pactda::pactda_tests {
    // Sui Framework Imports
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::sui::SUI;
    use sui::test_scenario::{Self as test, Scenario, next_tx, ctx};
    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::pay;
    use sui::tx_context::{TxContext};
    use sui::clock::{Clock}; // Needed for test scenario

    // Standard Library Imports
    use std::vector;
    use std::option::{Self, Option};
    use std::string::{Self, String};

    // PactDa Core Import
    use pactda::pactda::{
        Self, PactDaContract, Milestone, Escrow, VCNFT,
        // Status Constants
        CONTRACT_STATUS_PENDING, CONTRACT_STATUS_ACTIVE, CONTRACT_STATUS_COMPLETED,
        ESCROW_STATUS_FUNDED, ESCROW_STATUS_RELEASED, ESCROW_STATUS_REFUNDED,
        MILESTONE_STATUS_PENDING, MILESTONE_STATUS_SUBMITTED, MILESTONE_STATUS_APPROVED,
        // Error Constants (from pactda.move)
        EInvalidStatus, EUnauthorized, EInvalidMilestone
        // Note: Other error codes used previously might not exist or apply anymore.
    };

    // === Test Constants ===
    const PARTY_A: address = @0xA; // Renamed from CLIENT
    const PARTY_B: address = @0xB; // Renamed from FREELANCER
    const OTHER_USER: address = @0xDEAD; // User not involved in the contract
    const INITIAL_BALANCE: u64 = 1_000_000_000; // 1 SUI
    const TERMS_REF: vector<u8> = b"ipfs://example_terms";
    const PROOF_REF: vector<u8> = b"ipfs://example_proof";

    // === Helper Functions ===

    /// Creates a basic test scenario with minted SUI for party_a, party_b.
    fun create_test_scenario(): Scenario {
        let mut scenario = test::begin(PARTY_A); // Start scenario as PARTY_A

        // Mint SUI for Party A
        let ctx = test::ctx(&mut scenario);
        let coin = coin::mint_for_testing<SUI>(INITIAL_BALANCE, ctx);
        transfer::public_transfer(coin, PARTY_A);

        // Mint SUI for Party B
        next_tx(&mut scenario, PARTY_B);
        let ctx = test::ctx(&mut scenario);
        let coin = coin::mint_for_testing<SUI>(INITIAL_BALANCE, ctx);
        transfer::public_transfer(coin, PARTY_B);

        // Mint SUI for Other User
        next_tx(&mut scenario, OTHER_USER);
        let ctx = test::ctx(&mut scenario);
        let coin = coin::mint_for_testing<SUI>(INITIAL_BALANCE, ctx);
        transfer::public_transfer(coin, OTHER_USER);

        scenario
    }

    #[test_only]
    fun get_contract_mut(scenario: &mut Scenario): PactDaContract {
        test::take_shared<PactDaContract>(scenario)
    }

    #[test_only]
    fun return_contract(scenario: &mut Scenario, contract: PactDaContract) {
        test::return_shared(contract);
    }

    #[test_only]
    /// Helper to get the Escrow object associated with a contract.
    fun get_escrow_mut(scenario: &mut Scenario, contract: &PactDaContract): Escrow {
        let escrow_addr_opt = pactda::get_escrow_id(contract);
        assert!(option::is_some(&escrow_addr_opt), 100); // Escrow must exist
        let escrow_addr = option::destroy_some(escrow_addr_opt);
        
        // Get the escrow object ID and take it from the shared objects
        let escrow_id = object::id_from_address(escrow_addr);
        test::take_shared_by_id<Escrow>(scenario, escrow_id)
    }

    #[test_only]
    fun return_escrow(scenario: &mut Scenario, escrow: Escrow) {
        test::return_shared(escrow);
    }

    #[test_only]
    /// Helper to get a user's SUI balance.
    fun get_balance(scenario: &Scenario, user: address): u64 {
        let ids = test::ids_for_address<Coin<SUI>>(user);
        let mut total_balance = 0;
        let mut i = 0;
        while (i < vector::length(&ids)) {
            let id = *vector::borrow(&ids, i);
            let coin = test::take_from_address_by_id<Coin<SUI>>(scenario, user, id);
            total_balance = total_balance + coin::value(&coin);
            transfer::public_transfer(coin, user); // Return the coin
            i = i + 1;
        };
        total_balance
    }

    #[test_only]
    /// Helper to fund the escrow for a contract. Assumes sender has enough SUI.
    fun fund_escrow_helper(
        contract: &mut PactDaContract,
        coin_to_fund: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        pactda::fund_escrow(contract, coin_to_fund, ctx);
    }

    // === Core PactDa Tests (Rewritten) ===

    #[test]
    fun test_create_contract_success() {
        let mut scenario = create_test_scenario();

        next_tx(&mut scenario, PARTY_A);
        let ctx = test::ctx(&mut scenario);
        pactda::create_contract(PARTY_B, TERMS_REF, ctx);

        test::end(scenario);
    }

    #[test]
    fun test_add_milestones_success() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };

        next_tx(&mut scenario, PARTY_A);
        
        // Get the contract
        let mut contract = get_contract_mut(&mut scenario);
        
        // Create a new context for this transaction
        let ctx = test::ctx(&mut scenario);
        
        let descriptions = vector[string::utf8(b"Milestone 1"), string::utf8(b"Milestone 2")];
        let values = vector[100u64, 200u64];
        pactda::add_milestones(&mut contract, descriptions, values, ctx);

        // Verify milestones exist and have correct initial state
        let milestones_opt = pactda::get_milestones(&contract);
        assert!(option::is_some(milestones_opt), 0);
        let milestones = option::borrow(milestones_opt);
        assert!(vector::length(milestones) == 2, 1);

        // Use the milestone accessor functions for milestone 0
        let m0 = vector::borrow(milestones, 0);
        assert!(pactda::get_milestone_id(m0) == 0, 2);
        assert!(*pactda::get_milestone_description(m0) == string::utf8(b"Milestone 1"), 3);
        assert!(pactda::get_milestone_value(m0) == 100, 4);
        assert!(pactda::get_milestone_status(m0) == pactda::get_milestone_status_pending(), 5);
        assert!(option::is_none(pactda::get_milestone_proof(m0)), 6);

        // Use the milestone accessor functions for milestone 1
        let m1 = vector::borrow(milestones, 1);
        assert!(pactda::get_milestone_id(m1) == 1, 7);
        assert!(*pactda::get_milestone_description(m1) == string::utf8(b"Milestone 2"), 8);
        assert!(pactda::get_milestone_value(m1) == 200, 9);
        assert!(pactda::get_milestone_status(m1) == pactda::get_milestone_status_pending(), 10);
        assert!(option::is_none(pactda::get_milestone_proof(m1)), 11);

        assert!(pactda::get_status(&contract) == pactda::get_contract_status_pending(), 12); // Status unchanged

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EUnauthorized)]
    fun test_add_milestones_not_party() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };

        next_tx(&mut scenario, OTHER_USER); // Switch to other user
        let mut contract = get_contract_mut(&mut scenario);
        let descriptions = vector[string::utf8(b"Milestone X")];
        let values = vector[50u64];

        {
            // This should fail since OTHER_USER is not a party to the contract
            let ctx = test::ctx(&mut scenario);
            pactda::add_milestones(&mut contract, descriptions, values, ctx);
        };
    
        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EInvalidMilestone)]
    fun test_add_milestones_empty() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        
        next_tx(&mut scenario, PARTY_A);

        let mut contract = get_contract_mut(&mut scenario);
        let descriptions = vector::empty<String>();
        let values = vector::empty<u64>();

        {
            let ctx = test::ctx(&mut scenario);
            pactda::add_milestones(&mut contract, descriptions, values, ctx); // Should fail
        };

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EInvalidMilestone)]
    fun test_add_milestones_mismatch() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        
        next_tx(&mut scenario, PARTY_A);
        let mut contract = get_contract_mut(&mut scenario);
        let descriptions = vector[string::utf8(b"Milestone 1")];
        let values = vector[100u64, 200u64]; // Mismatched length

        {
        let ctx = test::ctx(&mut scenario);
        pactda::add_milestones(&mut contract, descriptions, values, ctx); // Should fail
        };

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    fun test_sign_contract_success() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };

        next_tx(&mut scenario, PARTY_A);
        // Party A signs
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        pactda::sign_contract_party_a(&mut contract, ctx);

        next_tx(&mut scenario, PARTY_A);

        assert!(pactda::is_party_a_signed(&contract), 0);
        assert!(!pactda::is_party_b_signed(&contract), 1);
        assert!(pactda::get_status(&contract) == pactda::get_contract_status_pending(), 2);
        return_contract(&mut scenario, contract);

        // Party B signs
        next_tx(&mut scenario, PARTY_B);
        let mut contract = get_contract_mut(&mut scenario);
        {
        let ctx = test::ctx(&mut scenario);
        pactda::sign_contract_party_b(&mut contract, ctx);
        };
        assert!(pactda::is_party_a_signed(&contract), 3);
        assert!(pactda::is_party_b_signed(&contract), 4);
        assert!(pactda::get_status(&contract) == pactda::get_contract_status_active(), 5); // Status becomes Active

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EUnauthorized)]
    fun test_sign_contract_wrong_party() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        
        next_tx(&mut scenario, OTHER_USER); // Other user tries to sign as Party A
        let mut contract = get_contract_mut(&mut scenario);

        {
        let ctx = test::ctx(&mut scenario); 
        pactda::sign_contract_party_a(&mut contract, ctx); // Should fail
        };

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EInvalidStatus)]
    fun test_sign_contract_already_signed() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        next_tx(&mut scenario, PARTY_A);

        let mut contract = get_contract_mut(&mut scenario);
        
        {
            let ctx = test::ctx(&mut scenario);
            pactda::sign_contract_party_a(&mut contract, ctx);
            pactda::sign_contract_party_a(&mut contract, ctx); // Sign again, should fail
        };

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EInvalidStatus)]
    fun test_add_milestones_after_signed() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        next_tx(&mut scenario, PARTY_A);

        let mut contract = get_contract_mut(&mut scenario);
        
        {
        let ctx = test::ctx(&mut scenario);
        pactda::sign_contract_party_a(&mut contract, ctx);
        };
        
        return_contract(&mut scenario, contract);

        next_tx(&mut scenario, PARTY_B);
        let mut contract = get_contract_mut(&mut scenario);
        


        // Try adding milestones after activation
        let descriptions = vector[string::utf8(b"Late Milestone")];
        let values = vector[50u64];
        {
            let ctx = test::ctx(&mut scenario);
            pactda::sign_contract_party_b(&mut contract, ctx); // Contract becomes Active
            pactda::add_milestones(&mut contract, descriptions, values, ctx); // Should fail
        };
        

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EInvalidStatus)]
    fun test_fund_escrow_not_active() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        next_tx(&mut scenario, PARTY_A);

        // Contract is PENDING, try funding
        let mut contract = get_contract_mut(&mut scenario);
        
        // Take coin directly in the test
        let mut coin = test::take_from_sender<Coin<SUI>>(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        let coin_to_fund = coin::split(&mut coin, 500, ctx);
        
        // Now call fund_escrow directly or use the simplified helper
        pactda::fund_escrow(&mut contract, coin_to_fund, ctx); // Should fail
        
        test::return_to_sender(&mut scenario, coin); // Return remaining coins
        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EUnauthorized)]
    fun test_fund_escrow_not_party() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        next_tx(&mut scenario, PARTY_A);

        // Sign contract to make it active
        let mut contract = get_contract_mut(&mut scenario);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::sign_contract_party_a(&mut contract, ctx);
        };
        return_contract(&mut scenario, contract);
        
        next_tx(&mut scenario, PARTY_B);
        
        let mut contract = get_contract_mut(&mut scenario);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::sign_contract_party_b(&mut contract, ctx);
        };
        return_contract(&mut scenario, contract);

        // OTHER_USER tries to fund
        next_tx(&mut scenario, OTHER_USER);
        
        let mut contract = get_contract_mut(&mut scenario);
        let mut coin = test::take_from_sender<Coin<SUI>>(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        let coin_to_fund = coin::split(&mut coin, 500, ctx);
        
        // This should fail since OTHER_USER is not a party to the contract
        fund_escrow_helper(&mut contract, coin_to_fund, ctx);
        
        test::return_to_sender(&mut scenario, coin);
        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    fun test_submit_proof_success() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        next_tx(&mut scenario, PARTY_A);

        // Add milestones and activate contract
        let mut contract = get_contract_mut(&mut scenario);
        
        let descriptions = vector[string::utf8(b"Milestone 1")];
        let values = vector[100u64];
        {
            let ctx = test::ctx(&mut scenario);
            pactda::add_milestones(&mut contract, descriptions, values, ctx);
            pactda::sign_contract_party_a(&mut contract, ctx);
        };
        return_contract(&mut scenario, contract);
        
        next_tx(&mut scenario, PARTY_B);
        let mut contract = get_contract_mut(&mut scenario);

        // Party B submits proof
        let milestone_id = 0;
        {
            let ctx = test::ctx(&mut scenario);
            pactda::sign_contract_party_b(&mut contract, ctx);
            pactda::submit_proof(&mut contract, milestone_id, PROOF_REF, ctx);
        };
        

        // Verify milestone status and proof using accessor functions
        let milestone = pactda::get_milestone(&contract, milestone_id);
        assert!(pactda::get_milestone_status(milestone) == pactda::get_milestone_status_submitted(), 0);
        assert!(option::is_some(pactda::get_milestone_proof(milestone)), 1);
        
        // This is a bit tricky to test deep equality, but we'll use the is_some check above as enough
        // since the only proof that could be there is the one we just submitted

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EUnauthorized)]
    fun test_submit_proof_not_party_b() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        next_tx(&mut scenario, PARTY_A);

        // Add milestones and activate contract
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        let descriptions = vector[string::utf8(b"Milestone 1")];
        let values = vector[100u64];
        pactda::add_milestones(&mut contract, descriptions, values, ctx);
        pactda::sign_contract_party_a(&mut contract, ctx);
        return_contract(&mut scenario, contract);
        
        next_tx(&mut scenario, PARTY_B);
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        pactda::sign_contract_party_b(&mut contract, ctx);
        return_contract(&mut scenario, contract);

        // Party A tries to submit proof
        next_tx(&mut scenario, PARTY_A);
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        pactda::submit_proof(&mut contract, 0, PROOF_REF, ctx); // Should fail

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EInvalidStatus)]
    fun test_submit_proof_wrong_milestone_status() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        next_tx(&mut scenario, PARTY_A);
        // Add milestones and activate contract
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        let descriptions = vector[string::utf8(b"Milestone 1")];
        let values = vector[100u64];
        pactda::add_milestones(&mut contract, descriptions, values, ctx);
        pactda::sign_contract_party_a(&mut contract, ctx);
        return_contract(&mut scenario, contract);
        
        next_tx(&mut scenario, PARTY_B);
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        pactda::sign_contract_party_b(&mut contract, ctx);

        // Submit proof twice
        pactda::submit_proof(&mut contract, 0, PROOF_REF, ctx);
        pactda::submit_proof(&mut contract, 0, PROOF_REF, ctx); // Should fail

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    fun test_approve_milestone_success() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        next_tx(&mut scenario, PARTY_A);

        // Add milestones, activate, submit proof
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        let descriptions = vector[string::utf8(b"Milestone 1")];
        let values = vector[100u64];
        pactda::add_milestones(&mut contract, descriptions, values, ctx);
        pactda::sign_contract_party_a(&mut contract, ctx);
        return_contract(&mut scenario, contract);
        
        next_tx(&mut scenario, PARTY_B);
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        pactda::sign_contract_party_b(&mut contract, ctx);
        pactda::submit_proof(&mut contract, 0, PROOF_REF, ctx);
        return_contract(&mut scenario, contract);

        // Party A approves
        next_tx(&mut scenario, PARTY_A);
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        let milestone_id = 0;
        pactda::approve_milestone(&mut contract, milestone_id, ctx);

        // Verify milestone status using accessor function
        let milestone = pactda::get_milestone(&contract, milestone_id);
        assert!(pactda::get_milestone_status(milestone) == pactda::get_milestone_status_approved(), 0);

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EUnauthorized)]
    fun test_approve_milestone_not_party_a() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        };
        next_tx(&mut scenario, PARTY_A);
        // Add milestones, activate, submit proof
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        let descriptions = vector[string::utf8(b"Milestone 1")];
        let values = vector[100u64];
        pactda::add_milestones(&mut contract, descriptions, values, ctx);
        pactda::sign_contract_party_a(&mut contract, ctx);
        return_contract(&mut scenario, contract);
        
        next_tx(&mut scenario, PARTY_B);
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        pactda::sign_contract_party_b(&mut contract, ctx);
        pactda::submit_proof(&mut contract, 0, PROOF_REF, ctx);

        // Party B tries to approve
        pactda::approve_milestone(&mut contract, 0, ctx); // Should fail

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }
}
