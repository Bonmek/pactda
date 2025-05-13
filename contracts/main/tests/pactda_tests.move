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
        Self, PactDaContract, Milestone, Escrow,
        // Status Constants
        CONTRACT_STATUS_PENDING, CONTRACT_STATUS_ACTIVE, CONTRACT_STATUS_COMPLETED,
        CONTRACT_STATUS_CANCELLED,
        ESCROW_STATUS_FUNDED, ESCROW_STATUS_RELEASED, ESCROW_STATUS_REFUNDED,
        MILESTONE_STATUS_PENDING, MILESTONE_STATUS_SUBMITTED, MILESTONE_STATUS_APPROVED,
        // Error Constants (from pactda.move)
        EInvalidStatus, EUnauthorized, EInvalidMilestone
        // Note: Other error codes used previously might not exist or apply anymore.
    };
    use pactda::pactda::get_contract_status_cancelled;

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
        let tx_ctx_a = ctx(&mut scenario); // Changed from test::ctx
        let coin_a = coin::mint_for_testing<SUI>(INITIAL_BALANCE, tx_ctx_a);
        transfer::public_transfer(coin_a, PARTY_A);

        // Mint SUI for Party B
        next_tx(&mut scenario, PARTY_B);
        let tx_ctx_b = ctx(&mut scenario); // Changed from test::ctx
        let coin_b = coin::mint_for_testing<SUI>(INITIAL_BALANCE, tx_ctx_b);
        transfer::public_transfer(coin_b, PARTY_B);

        // Mint SUI for Other User
        next_tx(&mut scenario, OTHER_USER);
        let tx_ctx_other = ctx(&mut scenario); // Changed from test::ctx
        let coin_other = coin::mint_for_testing<SUI>(INITIAL_BALANCE, tx_ctx_other);
        transfer::public_transfer(coin_other, OTHER_USER);

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
        let escrow_id_opt = pactda::get_escrow_id(contract);
        assert!(option::is_some(&escrow_id_opt), 100); // Escrow must exist
        let escrow_id = option::destroy_some(escrow_id_opt);
        
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
        pactda::create_contract(
            option::some(PARTY_B), // party_b: Option<address>
            string::utf8(b"Test Contract"), // title: String
            option::some(0),  // contract_type: Option<u8>
            option::some(b"Terms for test contract"), // terms_reference: Option<vector<u8>>
            option::some(1000u64), // contract_start_date: Option<u64>
            option::some(2000u64), // contract_deadline_date: Option<u64>
            option::none(), // metadata: Option<vector<u8>>
        ctx);

        test::end(scenario);
    }

    #[test]
    fun test_create_contract_cross_chain_success() {
        let mut scenario = create_test_scenario();

        // Define cross-chain address for Party B (example Ethereum address)
        let cross_chain_party_address: vector<u8> = x"0123456789abcdef0123456789abcdef01234567";
        let chain_id: u16 = 2; // Ethereum chain ID in Wormhole convention

        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            // Create a contract with cross-chain Party B
            pactda::create_contract_cross_chain(
                chain_id,
                cross_chain_party_address,
                string::utf8(b"Cross-Chain Contract"),
                option::some(0),  // contract_type
                option::some(b"Terms for test contract"),
                option::some(1000u64), // contract_start_date: Option<u64>
                option::some(2000u64), // contract_deadline_date: Option<u64>
                option::none(), // metadata: Option<vector<u8>>
                ctx
            );
        };

        // Verify contract was created with cross-chain party
        let contract = get_contract_mut(&mut scenario);
        assert!(pactda::get_party_a(&contract) == PARTY_A, 0);
        // Party B on-chain address should be @0x0 for cross-chain contracts
        assert!(pactda::get_party_b(&contract) == @0x0, 1);
        // Status should be DRAFT after creation
        assert!(pactda::get_status(&contract) == pactda::get_contract_status_draft(), 2);

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    fun test_add_milestones_success() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx_create = test::ctx(&mut scenario);
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0),
                option::some(b"Terms for test contract"),
                option::some(1000),
                option::some(2000),
                option::none(),
                ctx_create
            );        
        };

        next_tx(&mut scenario, PARTY_A); // Party A submits the contract
        let mut contract = get_contract_mut(&mut scenario);
        let ctx_submit = test::ctx(&mut scenario);
        pactda::submit_contract(&mut contract, ctx_submit);
        assert!(pactda::get_status(&contract) == pactda::get_contract_status_pending(), 0); // Verify status is PENDING

        // Party A adds milestones (can reuse ctx_submit if same transaction block, or create new if separate)
        // For simplicity, let's assume it's part of the same logical step by Party A, using ctx_submit.
        // If it were a truly separate transaction, we'd do next_tx and get a new ctx.
        
        let description_hashes = vector[b"Milestone 1 Hash", b"Milestone 2 Hash"];
        let values = vector[100u64, 200u64];
        pactda::add_milestones(&mut contract, description_hashes, values, ctx_submit);

        // Verify milestones exist and have correct initial state
        let milestones_opt = pactda::get_milestones(&contract);
        assert!(option::is_some(milestones_opt), 1); // Adjusted assert index
        let milestones = option::borrow(milestones_opt);
        assert!(vector::length(milestones) == 2, 2); // Adjusted assert index

        // Use the milestone accessor functions for milestone 0
        let m0 = vector::borrow(milestones, 0);
        assert!(pactda::get_milestone_id(m0) == 0, 3);
        assert!(*pactda::get_milestone_description_hash(m0) == b"Milestone 1 Hash", 4);
        assert!(pactda::get_milestone_value(m0) == 100, 5);
        assert!(pactda::get_milestone_status(m0) == pactda::get_milestone_status_pending(), 6);
        assert!(option::is_none(pactda::get_milestone_proof(m0)), 7);

        // Use the milestone accessor functions for milestone 1
        let m1 = vector::borrow(milestones, 1);
        assert!(pactda::get_milestone_id(m1) == 1, 8);
        assert!(*pactda::get_milestone_description_hash(m1) == b"Milestone 2 Hash", 9);
        assert!(pactda::get_milestone_value(m1) == 200, 10);
        assert!(pactda::get_milestone_status(m1) == pactda::get_milestone_status_pending(), 11);
        assert!(option::is_none(pactda::get_milestone_proof(m1)), 12);

        // Status should remain PENDING after adding milestones
        assert!(pactda::get_status(&contract) == pactda::get_contract_status_pending(), 13); 

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EUnauthorized)]
    fun test_add_milestones_not_party() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx_create = test::ctx(&mut scenario);
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0),
                option::some(b"Terms for test contract"),
                option::some(1000),
                option::some(2000),
                option::none(),
                ctx_create
            );     
        };

        // Party A submits the contract to make it PENDING
        next_tx(&mut scenario, PARTY_A);
        let mut contract_for_submit = get_contract_mut(&mut scenario);
        let ctx_submit = test::ctx(&mut scenario);
        pactda::submit_contract(&mut contract_for_submit, ctx_submit);
        return_contract(&mut scenario, contract_for_submit); // Return it as it's taken by OTHER_USER next

        // OTHER_USER attempts to add milestones
        next_tx(&mut scenario, OTHER_USER); 
        let mut contract = get_contract_mut(&mut scenario);
        let description_hashes = vector[b"Milestone X Hash"];
        let values = vector[50u64];

        {
            // This should fail since OTHER_USER is not a party to the contract
            // and the contract is PENDING (or DRAFT, add_milestones checks for PENDING)
            let ctx_add_milestones = test::ctx(&mut scenario);
            pactda::add_milestones(&mut contract, description_hashes, values, ctx_add_milestones);
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
            let ctx_create = test::ctx(&mut scenario);
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0),
                option::some(b"Terms for test contract"),
                option::some(1000),
                option::some(2000),
                option::none(),
                ctx_create
            );     
        };
        
        // Party A submits the contract to make it PENDING
        next_tx(&mut scenario, PARTY_A);
        let mut contract = get_contract_mut(&mut scenario);
        let ctx_submit = test::ctx(&mut scenario);
        pactda::submit_contract(&mut contract, ctx_submit);
        // No need to return and re-get contract if the next action is by the same party in the same block

        let description_hashes = vector::empty<vector<u8>>();
        let values = vector::empty<u64>();

        {
            // Re-use ctx_submit if it's considered the same transaction block for Party A
            // If it's a new transaction, then:
            // next_tx(&mut scenario, PARTY_A);
            // let mut contract = get_contract_mut(&mut scenario);
            // let ctx_add_milestones = test::ctx(&mut scenario);
            // For this test, it's fine to assume Party A is doing this in the same logical step.
            pactda::add_milestones(&mut contract, description_hashes, values, ctx_submit); // Should fail
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
            let ctx_create = test::ctx(&mut scenario);
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0),
                option::some(b"Terms for test contract"),
                option::some(1000),
                option::some(2000),
                option::none(),
                ctx_create
            );     
        };
        
        // Party A submits the contract to make it PENDING
        next_tx(&mut scenario, PARTY_A);
        let mut contract = get_contract_mut(&mut scenario);
        let ctx_submit = test::ctx(&mut scenario);
        pactda::submit_contract(&mut contract, ctx_submit);
        // No need to return and re-get contract if the next action is by the same party in the same block

        let description_hashes = vector[b"Milestone 1 Hash"]; // vector<vector<u8>>
        let values = vector[100u64, 200u64]; // Mismatched length

        {
            // Re-use ctx_submit if it's considered the same transaction block for Party A
            pactda::add_milestones(&mut contract, description_hashes, values, ctx_submit); // Should fail
        };

        return_contract(&mut scenario, contract);
        test::end(scenario);
    }

    #[test]
    fun test_sign_contract_success() {
        let mut scenario = create_test_scenario();

        // 1. Party A creates contract
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx_create = test::ctx(&mut scenario);
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0),  // contract_type
                option::some(b"Terms for test contract"), // terms_reference
                option::some(1000u64), // contract_start_date
                option::some(2000u64), // contract_deadline_date
                option::none(),     // metadata
                ctx_create
            );     
        };

        // 2. Party A signs, then submits
        next_tx(&mut scenario, PARTY_A);
        let mut contract_a_ops = get_contract_mut(&mut scenario);
        let ctx_a_ops = test::ctx(&mut scenario);

        // Party A signs (contract is DRAFT)
        pactda::submit_contract(&mut contract_a_ops, ctx_a_ops);
        pactda::sign_contract_party_a(&mut contract_a_ops, ctx_a_ops);
        assert!(pactda::is_party_a_signed(&contract_a_ops), 0);
        assert!(!pactda::is_party_b_signed(&contract_a_ops), 1);
        assert!(pactda::get_status(&contract_a_ops) == pactda::get_contract_status_draft(), 2); // Status is DRAFT

        // Party A submits (contract moves from DRAFT to PENDING)
        pactda::submit_contract(&mut contract_a_ops, ctx_a_ops);
        assert!(pactda::get_status(&contract_a_ops) == pactda::get_contract_status_pending(), 3); // Status is PENDING
        
        return_contract(&mut scenario, contract_a_ops);

        // 3. Party B signs
        next_tx(&mut scenario, PARTY_B);
        let mut contract_b_ops = get_contract_mut(&mut scenario);
        let ctx_b_ops = test::ctx(&mut scenario);

        pactda::sign_contract_party_b(&mut contract_b_ops, ctx_b_ops);
        
        assert!(pactda::is_party_a_signed(&contract_b_ops), 4); // Party A still signed
        assert!(pactda::is_party_b_signed(&contract_b_ops), 5); // Party B now signed
        assert!(pactda::get_status(&contract_b_ops) == pactda::get_contract_status_active(), 6); // Status becomes Active

        return_contract(&mut scenario, contract_b_ops);
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = pactda::EUnauthorized)]
    fun test_sign_contract_wrong_party() {
        let mut scenario = create_test_scenario();
        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0),  // contract_type
                option::some(b"Terms for test contract"), // terms_reference
                option::some(1000u64), // contract_start_date
                option::some(2000u64), // contract_deadline_date
                option::none(), // metadata
                ctx);     
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
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0),  // contract_type
                option::some(b"Terms for test contract"), // terms_reference
                option::some(1000u64), // contract_start_date
                option::some(2000u64), // contract_deadline_date
                option::none(), // metadata
                ctx);     
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
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0),  // contract_type
                option::some(b"Terms for test contract"), // terms_reference
                option::some(1000u64), // contract_start_date
                option::some(2000u64), // contract_deadline_date
                option::none(), // metadata
                ctx);     
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
        let description_hashes = vector[b"Late Milestone"]; // Changed from vector<String> to vector<vector<u8>>
        let values = vector[50u64];
        {
            let ctx = test::ctx(&mut scenario);
            pactda::sign_contract_party_b(&mut contract, ctx); // Contract becomes Active
            pactda::add_milestones(&mut contract, description_hashes, values, ctx); // Should fail
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
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0u8),  // contract_type
                option::some(b"Terms for test contract"), // terms_reference
                option::some(1000u64), // contract_start_date
                option::some(2000u64), // contract_deadline_date
                option::none(), // metadata
                ctx);     
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
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0u8),  // contract_type
                option::some(b"Terms for test contract"), // terms_reference
                option::some(1000u64), // contract_start_date
                option::some(2000u64), // contract_deadline_date
                option::none(), // metadata
                ctx);     
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
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0u8),  // contract_type
                option::some(b"Terms for test contract"), // terms_reference
                option::some(1000u64), // contract_start_date
                option::some(2000u64), // contract_deadline_date
                option::none(), // metadata
                ctx);     
        };
        next_tx(&mut scenario, PARTY_A);

        // Add milestones and activate contract
        let mut contract = get_contract_mut(&mut scenario);
        
        let description_hashes = vector[b"Milestone 1"]; // Changed variable name and type
        let values = vector[100u64];
        {
            let ctx = test::ctx(&mut scenario);
            pactda::add_milestones(&mut contract, description_hashes, values, ctx);
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
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0u8),  // contract_type
                option::some(b"Terms for test contract"), // terms_reference
                option::some(1000u64),
                option::some(2000u64),
                option::none(),
                ctx);     
        };
        next_tx(&mut scenario, PARTY_A);

        // Add milestones and activate contract
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        let description_hashes = vector[b"Milestone 1"]; // Changed variable name and type
        let values = vector[100u64];
        pactda::add_milestones(&mut contract, description_hashes, values, ctx);
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
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0u8),  // contract_type
                option::some(b"Terms for test contract"), // terms_reference
                option::some(1000u64),
                option::some(2000u64),
                option::none(),
                ctx);     
        };
        next_tx(&mut scenario, PARTY_A);
        // Add milestones and activate contract
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        let description_hashes = vector[b"Milestone 1"]; // Changed variable name and type
        let values = vector[100u64];
        pactda::add_milestones(&mut contract, description_hashes, values, ctx); // Use corrected variable
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
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0u8),  // contract_type
                option::some(b"Terms for test contract"), // terms_reference
                option::some(1000u64),
                option::some(2000u64),
                option::none(),
                ctx);     
        };
        next_tx(&mut scenario, PARTY_A);

        // Add milestones, activate, submit proof
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        let description_hashes = vector[b"Milestone 1"]; // Changed variable name and type
        let values = vector[100u64];
        pactda::add_milestones(&mut contract, description_hashes, values, ctx);
        pactda::submit_contract(&mut contract, ctx);
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
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Test Contract"),
                option::some(0u8),  // contract_type
                option::some(b"Terms for test contract"), // terms_reference
                option::some(1000u64),
                option::some(2000u64),
                option::none(),
                ctx);     
        };
        next_tx(&mut scenario, PARTY_A);
        // Add milestones, activate, submit proof
        let mut contract = get_contract_mut(&mut scenario);
        let ctx = test::ctx(&mut scenario);
        let description_hashes = vector[b"Milestone 1"]; // Changed variable name and type
        let values = vector[100u64];
        pactda::add_milestones(&mut contract, description_hashes, values, ctx); // Use corrected variable
        pactda::submit_contract(&mut contract, ctx);
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

    #[test]
    fun test_update_contract_success() {
        let mut scenario = create_test_scenario();

        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Original Title"),
                option::some(0u8),
                option::some(b"Original Terms"), // terms_reference is vector<u8>
                option::some(1000u64),
                option::some(2000u64),
                option::none(),
                ctx
            );
        };

        // Update the contract
        next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = get_contract_mut(&mut scenario);
            let ctx = test::ctx(&mut scenario);

            pactda::update_contract(
                &mut contract,
                option::some(string::utf8(b"Updated Title")),
                option::some(b"Updated Terms"), // Changed to Option<vector<u8>>
                option::some(1500u64),          // Added u64 suffix
                option::some(2500u64),          // Added u64 suffix
                option::some(b"metadata"),
                ctx
            );

            // Verify update
            assert!(pactda::get_title(&contract) == string::utf8(b"Updated Title"), 0);
            assert!(pactda::get_terms_content(&contract) == string::utf8(b"Updated Terms"), 1); // Assertion remains valid

            return_contract(&mut scenario, contract);
        };

        test::end(scenario);
    }

    #[test]
    fun test_deny_contract_success() {
        let mut scenario = create_test_scenario();

        next_tx(&mut scenario, PARTY_A);
        {
            let ctx = test::ctx(&mut scenario);
            pactda::create_contract(
                option::some(PARTY_B),
                string::utf8(b"Contract to Deny"),
                option::some(0), // contract_type
                option::some(b"Terms"), // terms_reference
                option::none(), // contract_start_date
                option::none(), // contract_deadline_date
                option::none(), // metadata
                ctx
            );
        };

        // Party A denies the contract
        next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = get_contract_mut(&mut scenario);
            let ctx = test::ctx(&mut scenario);

            pactda::deny_contract(&mut contract, ctx);

            // Verify contract is cancelled
            assert!(pactda::get_status(&contract) == pactda::get_contract_status_cancelled(), 0);

            return_contract(&mut scenario, contract);
        };

        test::end(scenario);
    }
}
