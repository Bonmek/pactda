## Brief overview
These guidelines outline the design principles and coding conventions observed in the PactDa Sui Move smart contracts (`pactda` and `pactda_wormhole_bridge` modules). They should be followed when modifying existing contracts or adding new ones within this project.

## Modularity and Interaction
- **Separate Core Logic:** Keep the main business logic (e.g., contract lifecycle, escrow) in a core module (`pactda`).
- **Isolate External Interactions:** Place logic for interacting with external systems (like Wormhole) in separate modules (`pactda_wormhole_bridge`).
- **Controlled Access:** Use `public(friend)` visibility for functions that need to be called by specific trusted modules (e.g., bridge calling core contract functions) while restricting general public access. Declare friendships in `Move.toml`.

## State Management
- **Dedicated State Structs:** Define primary structs (`PactDaContract`, `Escrow`, `PactDaBridge`) to encapsulate the state of each logical component. Use the `key` ability for top-level objects.
- **Optional Components:** Use `std::option::Option` for parts of the state that might not always be present (e.g., `escrow_id`, `milestones` in `PactDaContract`).
- **Dynamic Collections:** Use `sui::table::Table` for key-value mappings where keys are known types (e.g., `Table<u16, vector<u8>>` for chain ID to address mapping in the bridge). Use `std::vector` for ordered lists (e.g., `vector<Milestone>`).

## Statuses and Error Handling
- **Constant Status Codes:** Define `const` u8 values for representing discrete states (e.g., `CONTRACT_STATUS_ACTIVE`, `MILESTONE_STATUS_PENDING`).
- **Constant Error Codes:** Define `const` u64 values for specific error conditions (e.g., `EUnauthorized`, `EInvalidStatus`).
- **Assertions:** Use `assert!(condition, ERROR_CODE)` extensively at the beginning of functions to validate preconditions, authorization, and state consistency.

## Authorization
- **Sender Verification:** Check the transaction sender using `sui::tx_context::sender(ctx)` against authorized addresses stored in the state (e.g., `party_a`, `party_b`, `owner`).
- **Cross-Chain Authorization:** When processing messages from other chains (e.g., VAAs), verify the `emitter_address` and `emitter_chain` against registered foreign contracts or expected roles. Implement robust mapping if needed.

## Events
- **Emit Significant Events:** Use `sui::event::emit` for key state changes or actions (e.g., contract creation, signing, funding, cross-chain message sending/receiving).
- **Dedicated Event Structs:** Define specific structs with `copy, drop` abilities for each event type (e.g., `ContractCreatedEvent`, `CrossChainMessageSent`).

## Cross-Chain Interaction (Wormhole Bridge Specific)
- **Use Wormhole SDK:** Leverage the official Wormhole Move modules (`wormhole::state`, `wormhole::emitter`, `wormhole::vaa`, etc.).
- **Register Foreign Contracts:** Maintain a mapping (e.g., `Table`) of Wormhole chain IDs to corresponding contract addresses on those chains.
- **VAA Processing:**
    - Verify VAAs using Wormhole functions.
    - Prevent replay attacks by tracking processed VAA hashes (e.g., in a `Table<vector<u8>, bool>`).
    - Verify the VAA emitter against registered contracts.
- **Payload Handling:**
    - Define clear action types (`const ACTION_...: u8`).
    - Implement serialization/deserialization functions for packing/unpacking action types and data into/from `vector<u8>` payloads.

## Specific Patterns
- **Milestones:** Implement as an `Option<vector<Milestone>>` within the main contract. Each `Milestone` struct should have its own status.
- **Escrow:** Use a separate `Escrow` object (`has key`) linked from the main contract via `Option<address>`. Manage its lifecycle with status codes.
- **Receipts:** For user-initiated actions, consider creating and transferring a `Receipt` object (e.g., `ContractReceipt`) back to the sender as a record of the operation. Use `#[allow(lint(self_transfer))]` if needed.

## Naming and Style Conventions
- **Modules & Functions:** `snake_case` (e.g., `pactda_wormhole_bridge`, `create_contract`).
- **Structs & Types:** `PascalCase` (e.g., `PactDaContract`, `Milestone`).
- **Constants (Errors, Statuses, Actions):** `SCREAMING_SNAKE_CASE` or `PascalCase` (e.g., `EInvalidStatus`, `CONTRACT_STATUS_ACTIVE`, `ACTION_APPROVE_MILESTONE`). Follow Sui/Move conventions.
- **Events:** `PascalCase` ending with `Event` (e.g., `EscrowFundedEvent`).
- **Comments:** Use `///` for documentation comments on modules, structs, and public functions. Use `//` for inline implementation comments. Use `// TODO:` for planned work.
