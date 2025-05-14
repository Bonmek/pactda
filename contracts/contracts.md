---
description: 
globs: 
alwaysApply: false
---
---
description: contracts, move, block chain
globs: 
alwaysApply: false
---
---
description: PactDa Sui Smart Contract Design Components
globs: 
alwaysApply: true
---
### 1. Core Move Objects & Structs

- Use **Sui Move CamelCase convention** for all object structs
- Use **snake_case** for all function names
- Create the following key object and struct definitions:

```move
// Main contract object
struct PactDaContract has key {
    id: UID,
    status: u8,              // Active(0), Disputed(1), Completed(2), etc.
    party_a: address,        // Sui address
    party_b: address,        // Sui address
    cross_chain_parties: Option<vector<CrossChainPartyInfo>>,
    terms_reference: vector<u8>,
    escrow_id: Option<ID>,
    milestones: Option<vector<Milestone>>,
    dispute_info: Option<DisputeInfo>,
}

// Escrow object
struct Escrow has key {
    id: UID,
    contract_id: ID,
    balance: Balance<SUI>,
    payer: address,
    payee: address,
    status: u8,              // Funded(0), Released(1), Refunded(2), Locked(3)
}

// VCNFT objects (structural definitions only for MVP)
struct VcnftType1 has key, store {
    id: UID
}

struct VcnftType2 has key, store {
    id: UID,
    owner: address,
    is_active: bool,
    specialization_tags: Option<vector<String>>,
    staked_sui_object_id: Option<ID>
}

// Supporting structs
struct Milestone has store {
    id: u64,
    description_hash: vector<u8>,
    value: u64,
    status: u8,              // Pending(0), Submitted(1), Approved(2), Disputed(3)
    proof_reference: Option<vector<u8>>
}

struct DisputeInfo has store {
    disputed_milestone_id: Option<u64>,
    initiator: address,
    reason_hash: Option<vector<u8>>,
    assigned_verifiers: Option<VerifierSet>,
    outcome: Option<bool>
}

struct VerifierSet has store {
    nominated_1: address,
    nominated_2: address,
    system_1: address,
    system_2: address,
    system_3: address
}

struct CrossChainPartyInfo has store {
    chain_id: u16,           // Wormhole Chain ID
    party_address: vector<u8> // Address on the source chain
}

// For Wormhole VAA processing
struct VerifiedWormholePayload has copy, drop {
    source_chain: u16,
    source_address: vector<u8>,
    target_contract_id: ID,
    action_type: u8,         // Approve(0), Dispute(1), etc.
    action_params: vector<u8> // e.g., milestone ID
}
```

### 2. Core Module Functions

- Implement the following function signatures in your Move modules:

```move
// Contract creation and management
public fun create_contract(
    party_a: address,
    party_b: address,
    terms_reference: vector<u8>,
    milestones: vector<Milestone>,
    ctx: &mut TxContext
): PactDaContract;

// Escrow management
public fun fund_escrow(
    contract: &mut PactDaContract,
    amount: Balance<SUI>,
    ctx: &mut TxContext
): Escrow;

public fun release_payment(
    escrow: &mut Escrow,
    recipient: address,
    ctx: &mut TxContext
);

// Milestone management
public fun submit_proof(
    contract: &mut PactDaContract,
    milestone_id: u64,
    proof_reference: vector<u8>,
    ctx: &mut TxContext
);

public fun approve_work_or_milestone(
    contract: &mut PactDaContract,
    escrow: &mut Escrow,
    milestone_id: u64,
    ctx: &mut TxContext
);

// Dispute management
public fun initiate_dispute(
    contract: &mut PactDaContract,
    milestone_id: Option<u64>,
    reason_hash: vector<u8>,
    ctx: &mut TxContext
);

// MVP only - for demo purposes
public fun simulate_dispute_outcome(
    contract: &mut PactDaContract,
    escrow: &mut Escrow,
    outcome: bool,
    ctx: &mut TxContext
);

// Wormhole integration
public entry fun process_wormhole_vaa(
    vaa_bytes: vector<u8>,
    ctx: &mut TxContext
);

// Internal function called by process_wormhole_vaa
fun approve_milestone_from_wormhole(
    contract: &mut PactDaContract,
    escrow: &mut Escrow,
    payload: VerifiedWormholePayload,
    ctx: &mut TxContext
);
```

### 3. Status Code Definitions

- Use standardized status codes across all objects:
```move
// Contract status codes
const CONTRACT_STATUS_ACTIVE: u8 = 0;
const CONTRACT_STATUS_DISPUTED: u8 = 1;
const CONTRACT_STATUS_COMPLETED: u8 = 2;
const CONTRACT_STATUS_CANCELLED: u8 = 3;

// Escrow status codes
const ESCROW_STATUS_FUNDED: u8 = 0;
const ESCROW_STATUS_RELEASED: u8 = 1;
const ESCROW_STATUS_REFUNDED: u8 = 2;
const ESCROW_STATUS_LOCKED: u8 = 3;

// Milestone status codes
const MILESTONE_STATUS_PENDING: u8 = 0;
const MILESTONE_STATUS_SUBMITTED: u8 = 1;
const MILESTONE_STATUS_APPROVED: u8 = 2;
const MILESTONE_STATUS_DISPUTED: u8 = 3;

// Wormhole action types
const WORMHOLE_ACTION_APPROVE: u8 = 0;
const WORMHOLE_ACTION_DISPUTE: u8 = 1;
const WORMHOLE_ACTION_CANCEL: u8 = 2;
```

### 4. Wormhole Integration Requirements

- Follow these guidelines for Wormhole integration:
  - Import the Wormhole core module for VAA verification
  - Parse VAA payloads according to Wormhole standards
  - Implement proper chain ID verification
  - Verify source addresses match expected parties
  - Handle cross-chain authorization securely
  
```move
// Example code pattern for Wormhole integration
use sui::wormhole::vaa::{parse_and_verify, VAA};

public entry fun process_wormhole_vaa(vaa_bytes: vector<u8>, ctx: &mut TxContext) {
    // 1. Parse and verify the VAA using Wormhole core contract
    let vaa = parse_and_verify(vaa_bytes, ctx);
    
    // 2. Extract core VAA fields
    let emitter_chain = vaa.emitter_chain();
    let emitter_address = vaa.emitter_address();
    let payload = vaa.payload();
    
    // 3. Parse payload into PactDa-specific format
    let parsed_payload = parse_pactda_payload(payload);
    
    // 4. Route to appropriate handler based on action type
    if (parsed_payload.action_type == WORMHOLE_ACTION_APPROVE) {
        // Handle milestone approval
        let contract = get_contract_by_id(parsed_payload.target_contract_id);
        let escrow = get_escrow_by_id(contract.escrow_id);
        approve_milestone_from_wormhole(contract, escrow, parsed_payload, ctx);
    } else if (parsed_payload.action_type == WORMHOLE_ACTION_DISPUTE) {
        // Handle dispute initiation
        // ...
    }
}
```

### 5. Object Relationships & Ownership

- Follow these ownership guidelines:
  - `PactDaContract` should be a shared object accessible by multiple parties
  - `Escrow` should be owned by the contract module with controlled access
  - VCNFTs should be transferable objects with proper ownership tracking
  - Use dynamic fields for extensible storage when appropriate

### 6. Security Best Practices

- Implement these security measures:
  - Add proper authorization checks on all critical functions
  - Verify transaction senders match expected parties
  - Use one-time witnesses for module initialization
  - Implement proper error handling with descriptive error codes
  - Protect against reentrancy attacks
  - Validate all input parameters

### 7. Testing Requirements

- Create comprehensive test coverage:
  - Unit tests for all core functions
  - Integration tests for contract lifecycle
  - Specific tests for Wormhole message processing
  - Mock VAAs for testing cross-chain functionality
  - Hardcoded test cases for dispute resolution scenarios

### 8. Documentation Standards

- Document code following these guidelines:
  - Add module-level documentation explaining overall purpose
  - Document each struct with its purpose and field descriptions
  - Document each function with:
    - Purpose
    - Parameters
    - Return values
    - Access control requirements
    - Possible error conditions
  - Include example usage in documentation comments