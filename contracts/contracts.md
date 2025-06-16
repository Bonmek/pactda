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

- Use **Sui Move PascalCase convention** for all object structs.
- Use **snake_case** for all function names.
- Create the following key object and struct definitions:

```move
// From pactda::pactda

// Main contract object
public struct PactDaContract has key, store {
    id: UID,
    title: String,
    contract_type: u8,       // E.g., 0 for standard, 1 for service, etc.
    status: u8,              // Draft(0), Pending(1), Active(2), Disputed(3), Completed(4), Cancelled(5)
    party_a: address,        // Sui address
    party_b: address,        // Sui address (can be @0x0 if cross-chain party_b is primary)
    terms_reference: vector<u8>, // Hash or link to detailed terms
    contract_start_date: Option<u64>, // Timestamp
    contract_deadline_date: Option<u64>, // Timestamp
    escrow_id: Option<ID>,   // ID of the associated Escrow object
    milestones: Option<vector<Milestone>>,
    dispute_info: Option<DisputeInfo>,
    cross_chain_parties: Option<vector<CrossChainPartyInfo>>,
    metadata: Option<vector<u8>>, // Flexible field for additional data
    creation_epoch: u64,
    is_party_a_signed: bool,
    is_party_b_signed: bool,
}

// Escrow object
public struct Escrow has key {
    id: UID,
    contract_address: address, // Address of the PactDaContract this escrow belongs to
    balance: Balance<SUI>,
    payer: address,
    payee: address,
    status: u8,              // Funded(0), Released(1), Refunded(2)
}

// VCNFT objects (structural definitions)
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

// Supporting structs for PactDaContract
public struct Milestone has store, drop {
    id: u64,                 // Index in the vector
    description_hash: vector<u8>,
    value: u64,              // Value associated with this milestone (e.g. payment amount)
    status: u8,              // Pending(0), Submitted(1), Approved(2)
    proof_reference: Option<vector<u8>> // Hash or link to proof of completion
}

public struct DisputeInfo has store, drop {
    disputed_milestone_id: Option<u64>,
    initiator: address,
    reason_hash: Option<vector<u8>>,
    assigned_verifiers: Option<VerifierSet>,
    outcome: Option<bool>    // True for party_a wins, false for party_b wins (example)
}

public struct VerifierSet has store, drop {
    nominated_1: address,
    nominated_2: address,
    system_1: address,
    system_2: address,
    system_3: address
}

public struct CrossChainPartyInfo has store, drop {
    chain_id: u16,           // Wormhole Chain ID
    party_address: vector<u8>, // Address on the source chain
    role: u8,                // E.g., 0 for party_a, 1 for party_b
}

// Structs for cross-chain configuration and VAA processing (within pactda module)
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
    vaa_validity_period: u64, // Example field
    trusted_emitters: vector<TrustedEmitter>,
    address_mappings: vector<AddressMapping>, // Example field
}

public struct ProcessedVAA has key, store { // Used in pactda module, distinct from bridge's ProcessedVaaInfo
    id: UID,
    emitter_chain: u16,
    emitter_address: vector<u8>,
    sequence: u64,
    timestamp: u64, // Note: Wormhole VAA timestamp is u32
}

// From pactda::pactda_wormhole_bridge

// Main bridge object
public struct PactDaBridge has key {
    id: UID,
    owner: address,
    wormhole_state: ID,      // ID of the Wormhole State object
    emitter_cap: EmitterCap, // Capability to send Wormhole messages
    registered_contracts: Table<u16, vector<u8>>, // chain_id -> foreign_contract_address
    processed_vaas: Table<vector<u8>, ProcessedVaaInfo>, // vaa_digest -> info
}

// Information about a processed VAA (for bridge replay protection)
public struct ProcessedVaaInfo has copy, drop, store {
    sequence: u64,
    timestamp: u32,          // Timestamp from VAA header
    source_chain: u16,
}
```

### 2. Core Module Functions

- Implement the following function signatures in your Move modules:

```move
// === pactda::pactda module ===

// Contract creation and management
public entry fun create_contract(
    party_b: Option<address>,
    title: String,
    contract_type: Option<u8>,
    terms_reference: Option<vector<u8>>,
    contract_start_date: Option<u64>,
    contract_deadline_date: Option<u64>,
    metadata: Option<vector<u8>>,
    ctx: &mut TxContext,
);

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
);

public entry fun update_contract(
    contract: &mut PactDaContract,
    chain_id: Option<u16>,
    party_b_cross_chain: Option<vector<u8>>,
    party_b: Option<address>,
    title: Option<String>,
    terms_reference: Option<vector<u8>>,
    contract_start_date: Option<u64>,
    contract_deadline_date: Option<u64>,
    metadata: Option<vector<u8>>,
    ctx: &mut TxContext,
);

public entry fun submit_contract( // Transitions from Draft to Pending
    contract: &mut PactDaContract,
    ctx: &mut TxContext,
);

public entry fun sign_contract_party_a(
    contract: &mut PactDaContract,
    ctx: &mut TxContext,
);

public entry fun sign_contract_party_b(
    contract: &mut PactDaContract,
    ctx: &mut TxContext,
);

public entry fun deny_contract( // Cancels a Draft or Pending contract
    contract: &mut PactDaContract,
    ctx: &mut TxContext,
);

// Escrow management
public entry fun fund_escrow(
    contract: &mut PactDaContract,
    payment: Coin<SUI>,
    ctx: &mut TxContext
);

public entry fun release_payment(
    contract: &mut PactDaContract, // Used to update contract status if all milestones done
    escrow: &mut Escrow,
    ctx: &mut TxContext,
);

public entry fun refund_payment(
    contract: &mut PactDaContract, // Context for receipt
    escrow: &mut Escrow,
    ctx: &mut TxContext,
);

// Milestone management
public entry fun add_milestones(
    contract: &mut PactDaContract,
    milestone_description_hashes: vector<vector<u8>>,
    milestone_values: vector<u64>,
    ctx: &mut TxContext,
);

public entry fun submit_proof(
    contract: &mut PactDaContract,
    milestone_id: u64,
    proof_reference: vector<u8>,
    ctx: &mut TxContext
);

public entry fun approve_milestone(
    contract: &mut PactDaContract,
    milestone_id: u64,
    ctx: &mut TxContext,
);

// Dispute management
public entry fun initiate_dispute(
    contract: &mut PactDaContract,
    milestone_id: u64, // ID of the milestone being disputed
    reason_hash: vector<u8>,
    ctx: &mut TxContext
);

public entry fun simulate_dispute_outcome( // For demo/testing purposes
    contract: &mut PactDaContract,
    outcome: bool, // True if party_a wins dispute, false otherwise
    ctx: &mut TxContext
);


// === pactda::pactda_wormhole_bridge module ===

public entry fun initialize(
    wormhole_state: &WormholeState,
    ctx: &mut TxContext
);

public entry fun register_foreign_contract(
    bridge: &mut PactDaBridge,
    chain_id: u16,
    contract_address: vector<u8>, // Expecting 32 bytes
    ctx: &mut TxContext
);

// For preparing messages to be sent via Wormhole
public fun approve_milestone_cross_chain(
    bridge: &mut PactDaBridge,
    target_chain: u16,
    target_contract_id: vector<u8>,
    milestone_id: u64,
    _ctx: &mut TxContext // Marked unused in current impl
): MessageTicket;

public fun update_contract_status_cross_chain(
    bridge: &mut PactDaBridge,
    target_chain: u16,
    target_contract_id: vector<u8>,
    new_status: u8,
    _ctx: &mut TxContext // Marked unused in current impl
): MessageTicket;

// For processing incoming Wormhole VAAs
public entry fun process_message(
    bridge: &mut PactDaBridge,
    wormhole_state: &WormholeState,
    clock: &Clock,
    vaa_bytes: vector<u8>,
    target_contract: &mut PactDaContract, // The specific contract instance this VAA targets
    ctx: &mut TxContext
);

// View function to get Wormhole message fee
public fun fee(state: &WormholeState): u64;

```

### 3. Status Code Definitions

- Use standardized status codes across all objects:
```move
// === pactda::pactda module ===

// Contract status codes
const CONTRACT_STATUS_DRAFT: u8 = 0;
const CONTRACT_STATUS_PENDING: u8 = 1; // Submitted for review, awaiting other party signatures
const CONTRACT_STATUS_ACTIVE: u8 = 2;  // Both parties signed, work can begin
const CONTRACT_STATUS_DISPUTED: u8 = 3;
const CONTRACT_STATUS_COMPLETED: u8 = 4;
const CONTRACT_STATUS_CANCELLED: u8 = 5;

// Escrow status codes
const ESCROW_STATUS_FUNDED: u8 = 0;
const ESCROW_STATUS_RELEASED: u8 = 1;
const ESCROW_STATUS_REFUNDED: u8 = 2;
// const ESCROW_STATUS_LOCKED: u8 = 3; // Currently commented out in code

// Milestone status codes
const MILESTONE_STATUS_PENDING: u8 = 0;
const MILESTONE_STATUS_SUBMITTED: u8 = 1;
const MILESTONE_STATUS_APPROVED: u8 = 2;
// const MILESTONE_STATUS_DISPUTED: u8 = 3; // Currently commented out in code for Milestone struct

// Party Roles (example for CrossChainPartyInfo)
const PARTY_ROLE_B: u8 = 1; // Example, if party_a is implicitly 0 or handled differently

// === pactda::pactda_wormhole_bridge module ===

// Action types for Wormhole payloads
const ACTION_APPROVE_MILESTONE: u8 = 0;
const ACTION_DISPUTE: u8 = 1;             // Placeholder, full implementation TBD
const ACTION_VERIFY_VCNFT: u8 = 2;        // Placeholder, full implementation TBD
const ACTION_CONTRACT_STATUS_UPDATE: u8 = 3;
const ACTION_ESCROW_STATUS_UPDATE: u8 = 4;  // Placeholder, full implementation TBD
```

### 4. Event Definitions

- Emit events for significant state changes and actions:

```move
// === pactda::pactda module Events ===

public struct ContractCreatedEvent has copy, drop {
    contract_id: ID,
    party_a: address,
    party_b: address, // Can be @0x0 if cross-chain
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

public struct ContractActionEvent has copy, drop { // Generic event for various actions
    contract_id: ID,
    action_type: String, // e.g., "milestones_added", "proof_submitted"
    actor: address,
    timestamp: u64, // Epoch timestamp
}

// === pactda::pactda_wormhole_bridge module Events ===

public struct CrossChainMessageReceived has copy, drop {
    source_chain: u16,
    source_address: vector<u8>, // Registered contract address on source chain
    action_type: u8,
    message_hash: vector<u8>,   // Typically VAA digest
}

public struct MilestoneApprovedCrossChain has copy, drop {
    contract_address: address,  // Sui address of the target PactDa contract
    milestone_id: u64,
    source_chain: u16,
}

public struct ContractStatusUpdatedCrossChain has copy, drop {
    contract_address: address,  // Sui address of the target PactDa contract
    new_status: u8,
    source_chain: u16,
}

public struct ForeignContractRegistered has copy, drop {
    chain_id: u16,
    contract_address: vector<u8>, // Address of the foreign contract
}
```

### 5. Wormhole Integration Requirements

- Follow these guidelines for Wormhole integration using the `pactda_wormhole_bridge` module:
  - **Bridge Initialization**: The `PactDaBridge` object must be initialized using `initialize`, linking it to the Wormhole `State` object and creating an `EmitterCap`.
  - **Foreign Contract Registration**: Use `register_foreign_contract` to map Wormhole chain IDs to the addresses of corresponding PactDa contracts on those chains. This is crucial for authorizing incoming messages.
  - **Sending Messages**:
    - Use functions like `approve_milestone_cross_chain` or `update_contract_status_cross_chain` to prepare a `MessageTicket`.
    - The `MessageTicket` must then be passed to `wormhole::publish_message::publish_message` along with the required fee (obtained via `pactda_wormhole_bridge::fee`) in the same transaction to dispatch the message.
    - Payloads are constructed with an `action_type` byte followed by action-specific data.
  - **Receiving Messages (VAA Processing)**:
    - The `process_message` entry function handles incoming VAAs.
    - It uses `wormhole::vaa::parse_and_verify` to validate the VAA against the guardian set and checks for structural integrity.
    - **Replay Protection**: The bridge maintains a `processed_vaas` table (mapping VAA digest to `ProcessedVaaInfo`) to prevent processing the same VAA multiple times.
    - **Authorization**: The VAA's `emitter_chain` and `emitter_address` are checked against the `registered_contracts` table to ensure the message originates from a known and trusted foreign contract.
    - **Payload Parsing**: The payload is parsed to extract an `action_type` and action-specific data.
    - **Action Dispatch**: Based on the `action_type`, the bridge calls the appropriate internal handler (e.g., `handle_milestone_approval`), which in turn interacts with the `pactda::pactda` module (e.g., calling `PactDa::approve_milestone_from_bridge`).
  - **Target Contract**: The `process_message` function requires the caller (e.g., a relayer) to provide the specific `PactDaContract` object instance that the VAA targets. This implies an off-chain mechanism or payload convention to identify the target Sui contract.

```move
// Example code pattern for Wormhole VAA processing in pactda_wormhole_bridge::process_message

// (Inside process_message function)
// 1. Parse and Verify VAA
let vaa = VAA::parse_and_verify(wormhole_state, vaa_bytes, clock);

// 2. Replay Protection
let vaa_digest = VAA::digest(&vaa);
let vaa_digest_vec = bytes32::to_bytes(vaa_digest);
assert!(!table::contains(&bridge.processed_vaas, vaa_digest_vec), E_MESSAGE_ALREADY_PROCESSED);

// ... (record VAA in processed_vaas table) ...

// 3. Extract VAA Info
let emitter_chain = VAA::emitter_chain(&vaa);
let emitter_address_external = VAA::emitter_address(&vaa);
let payload = VAA::payload(&vaa);

// 4. Authorization (check emitter_chain and emitter_address against bridge.registered_contracts)
// ... assert!(is_authorized, E_UNAUTHORIZED_MESSENGER); ...

// 5. Parse custom payload
let (action_type, action_payload) = parse_payload(payload);

// 6. Dispatch to handler
if (action_type == ACTION_APPROVE_MILESTONE) {
    handle_milestone_approval(target_contract, action_payload, emitter_chain, emitter_address_external, ctx);
} else if (action_type == ACTION_CONTRACT_STATUS_UPDATE) {
    handle_contract_status_update(target_contract, action_payload, emitter_chain, emitter_address_external, ctx);
} // ... other actions
else {
    abort E_INVALID_ACTION
};

// 7. Emit event
event::emit(CrossChainMessageReceived { /* ... */ });

// 8. Cleanup VAA object
VAA::destroy(vaa); // Or wormhole::vaa::take_payload(vaa) if only payload is consumed.
                   // The current pactda_wormhole_bridge.move uses destroy(vaa).
```

### 6. Object Relationships & Ownership

- Follow these ownership guidelines:
  - `PactDaContract` should be a shared object accessible by multiple parties (party_a, party_b, potentially others for disputes).
  - `Escrow` should be a shared object, linked from `PactDaContract` via its ID. Its functions enforce payer/payee interactions.
  - `PactDaBridge` is a shared object, configured by an `owner`, holding the `EmitterCap` for Wormhole interactions.
  - VCNFTs (`VcnftType1`, `VcnftType2`) are `key, store` objects, implying they can be owned and transferred.
  - Use `std::option::Option` for optional components within structs (e.g., `escrow_id`, `milestones`).
  - Use `sui::table::Table` for dynamic key-value mappings (e.g., `registered_contracts` in `PactDaBridge`).
  - Use `std::vector` for ordered lists (e.g., `milestones` in `PactDaContract`).

### 7. Security Best Practices

- Implement these security measures:
  - **Authorization Checks**: Add proper authorization checks on all critical functions using `sui::tx_context::sender(ctx)` and comparing against stored authorized addresses (e.g., `party_a`, `party_b`, `owner`). Use `assert!` with descriptive error codes.
  - **Status Checks**: Validate current object statuses before allowing state transitions (e.g., cannot fund an already active contract, cannot sign a completed contract).
  - **Input Validation**: Validate input parameters (e.g., milestone IDs within bounds, non-empty hashes).
  - **Wormhole Security**:
    - Verify VAAs thoroughly using `wormhole::vaa::parse_and_verify`.
    - Implement robust replay protection for VAAs (as done with `processed_vaas` table).
    - Verify VAA emitter chain and address against a configurable list of trusted foreign contracts (`registered_contracts` table).
  - **Error Handling**: Use specific error codes (`const E_...: u64`) for distinct failure reasons.
  - **Reentrancy**: Sui Move's object-centric model and transaction atomicity generally mitigate traditional reentrancy risks, but care should be taken with complex cross-contract calls if any.
  - **Friend/Package Visibility**: Use `public(package)` for functions intended for internal calls between modules within the same package (e.g., bridge calling core contract functions) to restrict external access.

### 8. Testing Requirements

- Create comprehensive test coverage:
  - Unit tests for individual functions in `pactda.move` and `pactda_wormhole_bridge.move`.
  - Integration tests for the full lifecycle of a `PactDaContract` (creation, signing, funding, milestone management, completion, dispute).
  - Specific tests for Wormhole message sending and receiving:
    - Test payload serialization and deserialization.
    - Test VAA processing logic, including replay protection and authorization checks.
    - Use mock VAAs or simulate Wormhole interactions where possible.
  - Test edge cases and failure conditions (e.g., invalid inputs, unauthorized access, incorrect status).
  - Test dispute resolution scenarios.

### 9. Documentation Standards

- Document code following these guidelines:
  - Add module-level documentation (`///`) explaining the overall purpose and design of `pactda.move` and `pactda_wormhole_bridge.move`.
  - Document each public struct (`///`) with its purpose and descriptions for its fields.
  - Document each public function (`///`) with:
    - Purpose and brief description of its behavior.
    - Explanation of its parameters (`@param`).
    - Description of return values (if any).
    - Access control requirements (who can call it).
    - Key `assert!` conditions or potential error codes it might abort with.
  - Use inline comments (`//`) for implementation details or complex logic.
  - Use `// TODO:` for planned work or areas needing improvement.
