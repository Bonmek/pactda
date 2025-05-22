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
        pactda::create_contract(
            option::some(PARTY_B), // Changed
            string::utf8(b"Test Contract"),
            option::some(0u8),  // Changed: contract_type as Option<u8>
            option::some(b"Terms for test contract"), // Changed: terms_reference as Option<vector<u8>>
            option::some(1000u64), // Ensured u64
            option::some(2000u64), // Ensured u64
            option::none(),
            ctx);     
        // Add milestones if needed
        if (milestone_count > 0) {
            next_tx(scenario, PARTY_A);
            
            // Take the shared object
            let mut contract = test::take_shared<PactDaContract>(scenario);
            
            let description_hashes = vector[b"Milestone 1 Hash", b"Milestone 2 Hash"];
            let values = vector[100u64, 200u64];


            let ctx = test::ctx(scenario);
            pactda::add_milestones(&mut contract, description_hashes, values, ctx);

            pactda::submit_contract(&mut contract, ctx);
            
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
            assert!(get_status(&contract) == pactda::get_contract_status_active(), 0);
            test::return_shared(contract);
        };

        // Update contract status via bridge function
        next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = test::take_shared<PactDaContract>(&mut scenario);
            let ctx = test::ctx(&mut scenario);
            pactda::update_status_from_bridge(&mut contract, pactda::get_contract_status_completed(), ctx);
            
            // Verify status was updated
            assert!(get_status(&contract) == pactda::get_contract_status_completed(), 1);
            
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
        pactda::create_contract(
            option::some(PARTY_B),
            string::utf8(b"Test Contract"),
            option::some(0u8),  // contract_type: Option<u8>
            option::some(b"Terms for test contract"), // terms_reference: Option<vector<u8>> (already correct)
            option::some(1000u64), // contract_start_date: Option<u64>
            option::some(2000u64), // contract_deadline_date: Option<u64>
            option::none(), // metadata
            ctx);             
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

    #[test]
    fun test_bridge_update_details_success() {
        let mut scenario = create_test_scenario();
        let _contract_id = setup_contract(&mut scenario, 1); // No milestones needed for this test

        let new_title_bytes = b"Updated Title via Bridge";
        let new_terms_bytes = b"ipfs://new_terms_bridge";
        let new_start_date = 3000u64;
        let new_deadline_date = 4000u64;
        let new_metadata_bytes = b"new_metadata_via_bridge";
        let new_contract_type = 1u8; // Example new contract type

        // Party A (or any authorized address for bridge calls in a real scenario) updates details
        next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = test::take_shared<PactDaContract>(&mut scenario);
            let ctx = test::ctx(&mut scenario);

            pactda::update_details_from_bridge(
                &mut contract,
                option::some(new_title_bytes), // Pass vector<u8> directly
                option::some(new_terms_bytes),
                option::some(new_start_date),
                option::some(new_deadline_date),
                option::some(new_metadata_bytes),
                option::some(new_contract_type),
                ctx
            );

            // Assertions
            assert!(pactda::get_title(&contract) == string::utf8(new_title_bytes), 0);
            assert!(*pactda::get_terms_reference_test_only(&contract) == new_terms_bytes, 1);
            assert!(*option::borrow(pactda::get_contract_start_date_test_only(&contract)) == new_start_date, 2);
            assert!(*option::borrow(pactda::get_contract_deadline_date_test_only(&contract)) == new_deadline_date, 3);
            assert!(*option::borrow(pactda::get_metadata_test_only(&contract)) == new_metadata_bytes, 4);
            assert!(pactda::get_contract_type_test_only(&contract) == new_contract_type, 5);
            
            test::return_shared(contract);
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EInvalidStatus)]
    fun test_bridge_update_details_invalid_status() {
        let mut scenario = create_test_scenario();
        let _contract_id = setup_contract(&mut scenario, 1); // Setup with a milestone

        // Complete the contract first
        next_tx(&mut scenario, PARTY_B); // Submit proof
        {
            let mut contract = test::take_shared<PactDaContract>(&mut scenario);
            let ctx = test::ctx(&mut scenario);
            pactda::submit_proof(&mut contract, 0, PROOF_REF, ctx);
            test::return_shared(contract);
        };
        next_tx(&mut scenario, PARTY_A); // Approve milestone
        {
            let mut contract = test::take_shared<PactDaContract>(&mut scenario);
            let ctx = test::ctx(&mut scenario);
            pactda::approve_milestone(&mut contract, 0, ctx); // Approve the only milestone
             // If escrow is involved and needs release to complete, that would be here.
            // For simplicity, assuming approve_milestone might complete it or we set it manually.
            // Let's assume for this test, we directly set it to COMPLETED via bridge for setup.
            // Or, if approve_milestone makes it COMPLETED, that's fine.
            // If not, we might need another step or a direct status update if allowed.
            // For this test, let's assume approving all milestones moves it to COMPLETED.
            // If not, we'd need to call update_status_from_bridge to set it to COMPLETED.
            // To be sure, let's explicitly set it to COMPLETED.
            pactda::update_status_from_bridge(&mut contract, pactda::get_contract_status_completed(), ctx);
            assert!(pactda::get_status(&contract) == pactda::get_contract_status_completed(), 100); // Verify it's completed
            test::return_shared(contract);
        };
        
        // Now try to update details on a COMPLETED contract
        next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = test::take_shared<PactDaContract>(&mut scenario);
            let ctx = test::ctx(&mut scenario);

            pactda::update_details_from_bridge(
                &mut contract,
                option::some(b"Updated Title"),
                option::none(),
                option::none(),
                option::none(),
                option::none(),
                option::none(),
                ctx
            ); // This should fail
            
            test::return_shared(contract);
        };

        test::end(scenario);
    }
}
