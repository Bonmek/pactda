/*
#[test_only]
module pactda::pactda_tests;
// uncomment this line to import the module
 use pactda::pactda;
 

const ENotImplemented: u64 = 0;

#[test]
fun test_pactda() {
    // pass
}

#[test, expected_failure(abort_code = ::pactda::pactda_tests::ENotImplemented)]
fun test_pactda_fail() {
    abort ENotImplemented
}
*/

#[test_only]
module pactda::pactda_tests;

    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use std::string::{Self, String};
    
    use pactda::pactda::{Self, PactDaContract, Escrow, VCNFT, ContractReceipt};

    // Test addresses
    const PARTY_A: address = @0xA;
    const PARTY_B: address = @0xB;
    
    // Test helper to create a basic contract with one milestone
    fun create_test_contract(scenario: &mut Scenario, milestone_value: u64): ID {
        // Start as party A
        ts::next_tx(scenario, PARTY_A);
        {
            // Create contract without milestones
            pactda::create_contract(
                PARTY_B,
                b"test_terms",
                ts::ctx(scenario)
            );
        };
        
        // Get contract ID using the receipt
        let contract_id;
        ts::next_tx(scenario, PARTY_A);
        {
            let receipt = ts::take_from_sender<ContractReceipt>(scenario);
            contract_id = object::id(&receipt);
            ts::return_to_sender(scenario, receipt);
        };
        
        // Add milestones to the contract
        ts::next_tx(scenario, PARTY_A);
        {
            let mut contract = ts::take_shared<PactDaContract>(scenario);
            
            // Create milestone data
            let mut descriptions = vector::empty<String>();
            let mut values = vector::empty<u64>();
            
            vector::push_back(&mut descriptions, string::utf8(b"Test milestone"));
            vector::push_back(&mut values, milestone_value);
            
            // Add milestones to the contract
            pactda::add_milestones(&mut contract, descriptions, values, ts::ctx(scenario));
            
            ts::return_shared(contract);
        };
        
        return contract_id
    }
    
    // Test helper to create a contract without milestones
    fun create_test_contract_no_milestones(scenario: &mut Scenario): ID {
        // Start as party A
        ts::next_tx(scenario, PARTY_A);
        {
            // Create contract without milestones
            pactda::create_contract(
                PARTY_B,
                b"test_terms",
                ts::ctx(scenario)
            );
        };
        
        // Get the contract ID
        ts::next_tx(scenario, PARTY_A);
        {
            let receipt = ts::take_from_sender<ContractReceipt>(scenario);
            let contract_id = object::id(&receipt);
            ts::return_to_sender(scenario, receipt);
            return contract_id
        }
    }
    
    // Test full contract flow
    #[test]
    fun test_full_contract_flow() {
        let mut scenario = ts::begin(PARTY_A);
        let milestone_value = 1000;
        
        // 1. Create contract (without milestones)
        ts::next_tx(&mut scenario, PARTY_A);
        {
            // Create contract without any milestones
            pactda::create_contract(
                PARTY_B,
                b"test_terms",
                ts::ctx(&mut scenario)
            );
        };
        
        // 2. Add milestones to contract
        ts::next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            
            // Create milestone data
            let mut descriptions = vector::empty<String>();
            let mut values = vector::empty<u64>();
            
            vector::push_back(&mut descriptions, string::utf8(b"Test milestone"));
            vector::push_back(&mut values, milestone_value);
            
            // Add milestones to the contract
            pactda::add_milestones(&mut contract, descriptions, values, ts::ctx(&mut scenario));
            
            ts::return_shared(contract);
        };
        
        // 3. Party B signs contract
        ts::next_tx(&mut scenario, PARTY_B);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            pactda::sign_contract_party_b(&mut contract, ts::ctx(&mut scenario));
            ts::return_shared(contract);
        };
        
        // 4. Party A funds escrow
        ts::next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            let coin = coin::mint_for_testing<SUI>(milestone_value, ts::ctx(&mut scenario));
            pactda::fund_escrow(&mut contract, coin, ts::ctx(&mut scenario));
            ts::return_shared(contract);
        };
        
        // 5. Party B submits proof of work
        ts::next_tx(&mut scenario, PARTY_B);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            pactda::submit_proof(&mut contract, 0, b"proof_reference", ts::ctx(&mut scenario));
            ts::return_shared(contract);
        };
        
        // 6. Party A approves milestone
        ts::next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            pactda::approve_milestone(&mut contract, 0, ts::ctx(&mut scenario));
            ts::return_shared(contract);
        };
        
        // 7. Party A releases payment
        ts::next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            
            // Get the escrow ID from the contract
            let escrow_id_opt = pactda::get_escrow_id(&contract);
            assert!(option::is_some(&escrow_id_opt), 0);
            let escrow_id = *option::borrow(&escrow_id_opt);
            
            // Take escrow object
            let mut escrow = ts::take_shared_by_id<Escrow>(&scenario, object::id_from_address(escrow_id));
            
            // Release payment
            pactda::release_payment(&mut contract, &mut escrow, ts::ctx(&mut scenario));
            
            // Check contract is completed
            assert!(pactda::get_status(&contract) == 3, 0); // CONTRACT_STATUS_COMPLETED
            
            // Return objects
            ts::return_shared(contract);
            ts::return_shared(escrow);
        };
        
        // 8. Check Party B received payment
        ts::next_tx(&mut scenario, PARTY_B);
        {
            // Party B should have the payment now
            let coin = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == milestone_value, 0);
            ts::return_to_sender(&scenario, coin);
        };
        
        ts::end(scenario);
    }
    
    // Test contract refund flow
    #[test]
    fun test_refund_flow() {
        let mut scenario = ts::begin(PARTY_A);
        let milestone_value = 1000;
        
        // 1. Create and sign contract
        let _contract_id = create_test_contract(&mut scenario, milestone_value);
        
        ts::next_tx(&mut scenario, PARTY_B);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            pactda::sign_contract_party_b(&mut contract, ts::ctx(&mut scenario));
            ts::return_shared(contract);
        };
        
        // 2. Party A funds escrow
        ts::next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            let coin = coin::mint_for_testing<SUI>(milestone_value, ts::ctx(&mut scenario));
            pactda::fund_escrow(&mut contract, coin, ts::ctx(&mut scenario));
            ts::return_shared(contract);
        };
        
        // 3. Party B agrees to refund payment (e.g., can't complete work)
        ts::next_tx(&mut scenario, PARTY_B);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            
            // Get the escrow ID from the contract
            let escrow_id_opt = pactda::get_escrow_id(&contract);
            assert!(option::is_some(&escrow_id_opt), 0);
            let escrow_id = *option::borrow(&escrow_id_opt);
            
            // Take escrow object
            let mut escrow = ts::take_shared_by_id<Escrow>(&scenario, object::id_from_address(escrow_id));
            
            // Refund payment
            pactda::refund_payment(&mut contract, &mut escrow, ts::ctx(&mut scenario));
            
            // Return objects
            ts::return_shared(contract);
            ts::return_shared(escrow);
        };
        
        // 4. Check Party A received refund
        ts::next_tx(&mut scenario, PARTY_A);
        {
            // Party A should have the refund now
            let coin = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == milestone_value, 0);
            ts::return_to_sender(&scenario, coin);
        };
        
        ts::end(scenario);
    }
    
    // Test contract without milestones
    #[test]
    fun test_contract_without_milestones() {
        let mut scenario = ts::begin(PARTY_A);
        let payment_value = 1000;
        
        // 1. Create contract without milestones
        let _contract_id = create_test_contract_no_milestones(&mut scenario);
        
        // 2. Party B signs contract
        ts::next_tx(&mut scenario, PARTY_B);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            pactda::sign_contract_party_b(&mut contract, ts::ctx(&mut scenario));
            ts::return_shared(contract);
        };
        
        // 3. Party A funds escrow
        ts::next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            let coin = coin::mint_for_testing<SUI>(payment_value, ts::ctx(&mut scenario));
            pactda::fund_escrow(&mut contract, coin, ts::ctx(&mut scenario));
            ts::return_shared(contract);
        };
        
        // 4. Party A releases payment
        ts::next_tx(&mut scenario, PARTY_A);
        {
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            
            // Get the escrow ID from the contract
            let escrow_id_opt = pactda::get_escrow_id(&contract);
            assert!(option::is_some(&escrow_id_opt), 0);
            let escrow_id = *option::borrow(&escrow_id_opt);
            
            // Take escrow object
            let mut escrow = ts::take_shared_by_id<Escrow>(&scenario, object::id_from_address(escrow_id));
            
            // Release payment
            pactda::release_payment(&mut contract, &mut escrow, ts::ctx(&mut scenario));
            
            // Check contract is completed
            assert!(pactda::get_status(&contract) == 3, 0); // CONTRACT_STATUS_COMPLETED
            
            // Return objects
            ts::return_shared(contract);
            ts::return_shared(escrow);
        };
        
        // 5. Check Party B received payment
        ts::next_tx(&mut scenario, PARTY_B);
        {
            // Party B should have the payment now
            let coin = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == payment_value, 0);
            ts::return_to_sender(&scenario, coin);
        };
        
        ts::end(scenario);
    }
    
    // Test dual signature requirement
    #[test]
    fun test_dual_signature_requirement() {
        let mut scenario = ts::begin(PARTY_B); // Start as Party B this time
        
        // 1. Create contract as Party B (will need Party A to sign later)
        ts::next_tx(&mut scenario, PARTY_B);
        {
            
            // Create contract with Party A as the counterparty
            pactda::create_contract(
                PARTY_A,
                b"test_terms",
                ts::ctx(&mut scenario)
            );
            
            // Note: Party B is automatically signed as creator
        };
        
        // 2. Party A signs contract - no need to find by ID, we can just take the shared contract
        ts::next_tx(&mut scenario, PARTY_A);
        {
            // We can simply take the shared contract - there's only one in this test
            let mut contract = ts::take_shared<PactDaContract>(&scenario);
            
            // Contract should be pending until both sign
            assert!(pactda::get_status(&contract) == 0, 0); // CONTRACT_STATUS_PENDING
            assert!(pactda::is_party_a_signed(&contract) == true, 0); // Creator (Party B) already signed
            assert!(pactda::is_party_b_signed(&contract) == false, 0); // Party A has not signed yet
            
            // Party A signs
            pactda::sign_contract_party_b(&mut contract, ts::ctx(&mut scenario));
            
            // Now contract should be active
            assert!(pactda::get_status(&contract) == 1, 0); // CONTRACT_STATUS_ACTIVE
            assert!(pactda::is_party_b_signed(&contract) == true, 0);
            
            ts::return_shared(contract);
        };
        
        ts::end(scenario);
    }
    
    // Test VCNFT creation
    #[test]
    fun test_vcnft_creation() {
        let mut scenario = ts::begin(PARTY_A);
        
        // Create VCNFT
        ts::next_tx(&mut scenario, PARTY_A);
        {
            let mut tags = vector::empty<String>();
            vector::push_back(&mut tags, string::utf8(b"Web3"));
            vector::push_back(&mut tags, string::utf8(b"Legal"));
            
            pactda::create_vcnft(1, tags, ts::ctx(&mut scenario));
        };
        
        // Verify VCNFT was created
        ts::next_tx(&mut scenario, PARTY_A);
        {
            let vcnft = ts::take_from_sender<VCNFT>(&scenario);
            assert!(pactda::get_vcnft_owner(&vcnft) == PARTY_A, 0);
            assert!(pactda::get_vcnft_type_id(&vcnft) == 1, 0);
            assert!(pactda::is_vcnft_active(&vcnft) == true, 0);
            assert!(vector::length(pactda::get_vcnft_specialization_tags(&vcnft)) == 2, 0);
            ts::return_to_sender(&scenario, vcnft);
        };
        
        ts::end(scenario);
    }
}
