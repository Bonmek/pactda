#[test_only]

module pactda::pactda_wormhole_tests;

    use sui::test_scenario::{Self as ts, Scenario};

    use pactda::pactda_wormhole::{Self as cross_chain_auth, CrossChainConfig};
    fun test_register_address_mapping() {
        use sui::test_scenario;
        
        let admin = @0xA1;
        let user1 = @0xB1;
        let user2 = @0xC1;
        let scenario = test_scenario::begin(admin);
        
        // Setup
        {
            let ctx = test_scenario::ctx(&mut scenario);
            let external_address = external_address::new(bytes32::new(x"0000000000000000000000000000000000000000000000000000000000000001"));
            let vaa_validity_period = 86400000;
            
            cross_chain_auth::AuthorizePayload(external_address, vaa_validity_period, ctx);
        };
        
        // User1 registers address mapping
        test_scenario::next_tx(&mut scenario, user1);
        {
            let config = test_scenario::take_shared<CrossChainConfig>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            let chain_id: u16 = 2;
            let external_addr = x"000000000000000000000000ABCDEF0123456789ABCDEF0123456789ABCDEF01";
            
            cross_chain_auth::register_address_mapping(&mut config, chain_id, external_addr, ctx);
            
            // Verify mapping was added
            assert!(vector::length(&config.address_mappings) == 1, 0);
            let mapping = vector::borrow(&config.address_mappings, 0);
            assert!(mapping.chain_id == chain_id, 0);
            assert!(mapping.sui_address == user1, 0);
            
            test_scenario::return_shared(config);
        };
        
        // User1 registers the same mapping again (should be idempotent)
        test_scenario::next_tx(&mut scenario, user1);
        {
            let config = test_scenario::take_shared<CrossChainConfig>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            let chain_id: u16 = 2;
            let external_addr = x"000000000000000000000000ABCDEF0123456789ABCDEF0123456789ABCDEF01";
            
            cross_chain_auth::register_address_mapping(&mut config, chain_id, external_addr, ctx);
            
            // Verify mapping count hasn't changed
            assert!(vector::length(&config.address_mappings) == 1, 0);
            
            test_scenario::return_shared(config);
        };
        
        // User2 registers a different mapping
        test_scenario::next_tx(&mut scenario, user2);
        {
            let config = test_scenario::take_shared<CrossChainConfig>(&scenario);
            let ctx = test_scenario::ctx(&mut scenario);
            let chain_id: u16 = 2;
            let external_addr = x"000000000000000000000000FEDCBA9876543210FEDCBA9876543210FEDCBA98";
            
            cross_chain_auth::register_address_mapping(&mut config, chain_id, external_addr, ctx);
            
            // Verify both mappings exist
            assert!(vector::length(&config.address_mappings) == 2, 0);
            
            test_scenario::return_shared(config);
        };
        
        test_scenario::end(scenario);
    }