#[test_only]
module pactda::pactda_bridge_integration_tests {
    // Standard Library Imports
    use std::string::{Self, String};

    // Sui Framework Imports
    use sui::test_scenario::{Self as test, Scenario, next_tx};
    use sui::object::{Self, ID};
    use sui::clock;
    use sui::transfer;
    use sui::coin;
    use sui::sui::SUI;

    // PactDa Imports
    use pactda::pactda::{
        Self, 
        PactDaContract,
        get_status,
        is_milestone_submitted, 
        is_milestone_approved
    };

    // Constants for the tests that match the internal contract constants
    const CONTRACT_STATUS_ACTIVE: u8 = 1; 
    const CONTRACT_STATUS_COMPLETED: u8 = 3;

    // === Test Constants ===
    const PARTY_A: address = @0xA;
    const PARTY_B: address = @0xB;
    const OTHER_USER: address = @0xDEAD;
    const INITIAL_BALANCE: u64 = 1_000_000_000; // 1 SUI
    const TERMS_REF: vector<u8> = b"ipfs://example_terms";
    const PROOF_REF: vector<u8> = b"ipfs://example_proof";

    // === Helper Functions ===

    /// Creates a basic test scenario with minted SUI for party_a, party_b.
    fun create_test_scenario(): Scenario {
        let mut scenario = test::begin(PARTY_A);

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

    /// Helper to set up a contract with a specified number of milestones
    fun setup_contract(scenario: &mut Scenario, milestone_count: u64): ID {
        // Create contract
        next_tx(scenario, PARTY_A);
        let ctx = test::ctx(scenario);
        pactda::create_contract(PARTY_B, TERMS_REF, ctx);

        // Add milestones if needed
        if (milestone_count > 0) {
            next_tx(scenario, PARTY_A);
            
            // Take the shared object
            let mut contract = test::take_shared<PactDaContract>(scenario);
            
            let mut descriptions = vector::empty<String>();
            let mut values = vector::empty<u64>();

            let mut i = 1;
            while (i <= milestone_count) {
                let mut desc = string::utf8(b"Milestone ");
                string::append(&mut desc, string::utf8(b"1"));
                vector::push_back(&mut descriptions, desc);
                vector::push_back(&mut values, 100 * i);
                i = i + 1;
            };

            let ctx = test::ctx(scenario);
            pactda::add_milestones(&mut contract, descriptions, values, ctx);
            
            // Sign contract
            let ctx = test::ctx(scenario);
            pactda::sign_contract_party_a(&mut contract, ctx);
            let contract_id = object::id(&contract);
            
            // Return the shared object to the scenario
            test::return_shared(contract);
            
            // Party B signs
            next_tx(scenario, PARTY_B);
            let mut contract = test::take_shared<PactDaContract>(scenario);
            let ctx = test::ctx(scenario);
            pactda::sign_contract_party_b(&mut contract, ctx);
            test::return_shared(contract);

            contract_id
        } else {
            // Get contract ID
            let mut contract = test::take_shared<PactDaContract>(scenario);
            let id = object::id(&contract);
            test::return_shared(contract);
            id
        }
    }

    // === Helper functions for contract and bridge access ===
    
    #[test_only]
    fun get_contract_mut(scenario: &mut Scenario): PactDaContract {
        test::take_shared<PactDaContract>(scenario)
    }

    // === Basic Bridge Test (Submit Milestone) ===

    #[test]
    fun test_submit_proof_success() {
        let mut scenario = create_test_scenario();

        // Create and activate contract with milestone
        let _contract_id = setup_contract(&mut scenario, 1);

        // Party B submits milestone proof  
        next_tx(&mut scenario, PARTY_B);
        {
            let mut contract = test::take_shared<PactDaContract>(&mut scenario);
            let ctx = test::ctx(&mut scenario);
            pactda::submit_proof(&mut contract, 0, PROOF_REF, ctx);
            
            // Verify milestone is submitted
            assert!(is_milestone_submitted(&contract, 0), 0);
            
            test::return_shared(contract);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_bridge_approve_milestone_success() {
        let mut scenario = create_test_scenario();

        // Create and activate contract with milestone
        let _contract_id = setup_contract(&mut scenario, 1);

        // Party B submits milestone proof
        next_tx(&mut scenario, PARTY_B);
        {
            let mut contract = test::take_shared<PactDaContract>(&mut scenario);
            let ctx = test::ctx(&mut scenario);
            pactda::submit_proof(&mut contract, 0, PROOF_REF, ctx);
            test::return_shared(contract);
        };

        // Call bridge function to approve milestone
        next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = test::take_shared<PactDaContract>(&mut scenario);
            let ctx = test::ctx(&mut scenario);
            pactda::approve_milestone_from_bridge(&mut contract, 0, ctx);
            
            // Verify milestone is approved
            assert!(is_milestone_approved(&contract, 0), 0);
            
            test::return_shared(contract);
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EInvalidStatus)]
    fun test_bridge_approve_milestone_invalid_state() {
        let mut scenario = create_test_scenario();

        // Create and activate contract with milestone (but don't submit proof)
        let _contract_id = setup_contract(&mut scenario, 1);

        // Try to approve milestone that hasn't been submitted
        next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = test::take_shared<PactDaContract>(&mut scenario);
            let ctx = test::ctx(&mut scenario);
            // This should fail because proof hasn't been submitted
            pactda::approve_milestone_from_bridge(&mut contract, 0, ctx);
            test::return_shared(contract);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_bridge_update_status_success() {
        let mut scenario = create_test_scenario();

        // Create and activate contract with milestone
        let _contract_id = setup_contract(&mut scenario, 1);

        // Verify contract is active
        next_tx(&mut scenario, PARTY_A);
        {
            let contract = test::take_shared<PactDaContract>(&mut scenario);
            assert!(get_status(&contract) == CONTRACT_STATUS_ACTIVE, 0);
            test::return_shared(contract);
        };

        // Update contract status via bridge function
        next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = test::take_shared<PactDaContract>(&mut scenario);
            let ctx = test::ctx(&mut scenario);
            pactda::update_status_from_bridge(&mut contract, CONTRACT_STATUS_COMPLETED, ctx);
            
            // Verify status was updated
            assert!(get_status(&contract) == CONTRACT_STATUS_COMPLETED, 1);
            
            test::return_shared(contract);
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EInvalidStatus)]
    fun test_bridge_update_status_invalid_transition() {
        let mut scenario = create_test_scenario();

        // Create contract but DON'T activate it (don't sign it)
        next_tx(&mut scenario, PARTY_A);
        let ctx = test::ctx(&mut scenario);
        pactda::create_contract(PARTY_B, TERMS_REF, ctx);
        
        // Try to update status on a contract that's still PENDING
        next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = test::take_shared<PactDaContract>(&mut scenario);
            let ctx = test::ctx(&mut scenario);
            // This should fail because contract is not ACTIVE
            pactda::update_status_from_bridge(&mut contract, CONTRACT_STATUS_COMPLETED, ctx);
            test::return_shared(contract);
        };
        
        test::end(scenario);
    }
}