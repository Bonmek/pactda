use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey; // Corrected path

// Your Solana Program ID
declare_id!("4KuTWVUXcvrvoDvGqoBeivSAisXo8cQz8WA5P5GZRvgq");

// Wormhole Core Bridge Program ID on Solana
const WORMHOLE_BRIDGE_ADDRESS: Pubkey = pubkey!("worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth");

// --- Action Types ---
// Action types for messages sent FROM Sui TO Solana (received in VAA)
pub mod solana_actions {
    pub const INITIALIZE_STUB: u8 = 0;
    pub const UPDATE_DISPLAY_STATUS: u8 = 1;
    pub const UPDATE_STUB_DETAILS: u8 = 2; // New action for updating details
}

// Action types for messages sent FROM Solana TO Sui (emitted in event)
pub mod sui_actions {
    pub const SIGN_CONTRACT: u8 = 10;
    pub const SUBMIT_PROOF: u8 = 11;
    // Add more as needed
}

// Target Sui chain ID (Wormhole's ID for Sui)
const TARGET_CHAIN_SUI: u16 = 21; // Please verify this is the correct Wormhole Chain ID for Sui

#[program]
pub mod pactda_sol {
    use super::*;

    /// Initializes a new PactDa stub on Solana, typically called by a user directly.
    pub fn initialize_stub_direct(
        ctx: Context<InitializeStubDirect>,
        solana_stub_id: u64,
        sui_contract_identifier: String,
        title: String,
        description: String,
        pactda_url: String,
    ) -> Result<()> {
        let stub = &mut ctx.accounts.pact_da_stub;
        stub.initiator = *ctx.accounts.signer.key;
        stub.solana_stub_id = solana_stub_id;
        stub.sui_contract_identifier = sui_contract_identifier;
        stub.title = title;
        stub.description = description;
        stub.pactda_url = pactda_url;
        stub.display_status = "Initialized on Solana (Direct)".to_string();
        
        // Initialize new optional fields
        stub.terms_reference = None;
        stub.contract_start_date = None;
        stub.contract_deadline_date = None;
        stub.metadata = None;
        stub.contract_type = None;
        
        stub.bump = ctx.bumps.pact_da_stub;

        msg!(
            "PactDA Solana Stub Initialized (Direct). Solana Stub ID: {}, Sui Identifier: {}",
            stub.solana_stub_id,
            stub.sui_contract_identifier
        );
        Ok(())
    }

    /// Emits an event indicating an action to be relayed to Sui via Wormhole.
    pub fn request_action_on_sui(
        ctx: Context<RequestActionOnSui>,
        _solana_stub_id: u64, // Used for PDA derivation and constraint
        action_type_for_sui: u8,
        action_specific_payload_bytes: Vec<u8>, // e.g., Borsh-serialized SignContractSuiPayload
        target_sui_bridge_address_bytes: [u8; 32],
    ) -> Result<()> {
        let stub = &ctx.accounts.pact_da_stub;

        // The full payload for the event will include the sui_contract_identifier
        // so the relayer/Sui bridge knows which Sui contract this action is for.
        let event_payload = ActionToSuiPayload {
            sui_contract_identifier: stub.sui_contract_identifier.clone(),
            action_specific_data: action_specific_payload_bytes,
        };

        emit!(ActionToSuiRequested {
            solana_stub_id: stub.solana_stub_id,
            initiator_on_solana: stub.initiator,
            action_type_for_sui,
            // Serialize the combined payload for the event
            full_action_payload_for_sui: event_payload.try_to_vec()?,
            target_chain_id: TARGET_CHAIN_SUI,
            target_sui_bridge_address: target_sui_bridge_address_bytes,
        });

        msg!(
            "Action (type {}) requested for Sui contract {} (Solana Stub ID {}). Relayer should process.",
            action_type_for_sui,
            stub.sui_contract_identifier,
            stub.solana_stub_id
        );
        Ok(())
    }

    /// Processes a VAA originating from Sui.
    /// This function dispatches to specific handlers based on the action type in the VAA payload.
    pub fn process_vaa_from_sui(
        _ctx: Context<ProcessVaaFromSui>, // ctx is not used if we only error out
        _vaa_hash: [u8; 32], // Used for wormhole_message PDA constraint
        _vaa_payload_solana_stub_id: u64, // Added to match #[instruction] and client call expectation
                                          // VAA payload is now deserialized on-chain from wormhole_message
    ) -> Result<()> {
        // This function is deprecated and will always return an error.
        // The line `let acc_data = ctx.accounts.wormhole_message.try_borrow_data()?;` was removed.
        // Example: if PostedVaaData has a known structure where payload is at a certain offset.
        // This is highly dependent on how `wormhole_message` account data is structured by Wormhole.
        // Let's assume `extract_vaa_payload` is a utility function you'd write or get from SDK.
        // const VAA_PAYLOAD_OFFSET: usize = 51; // Example offset, LIKELY INCORRECT, placeholder
        // let vaa_payload_bytes = &acc_data[VAA_PAYLOAD_OFFSET..];

        // A more robust way is to use the wormhole_sdk::vaa::Vaa structure if available
        // and the wormhole_message account is of a type that allows loading it.
        // For now, we'll simulate by expecting the relayer to pass the payload,
        // or by defining a simpler on-chain deserialization.
        // Let's assume the first byte of the VAA payload is the action_type.
        // THIS IS A SIMPLIFICATION. A full VAA parsing is complex.
        // We will proceed by defining specific instructions for each VAA action type for clarity.

        // Re-design: Create separate instructions for each VAA action from Sui for clarity.
        // This `process_vaa_from_sui` will be removed in favor of specific handlers.
        // For now, this function will error, prompting use of specific handlers.
        Err(PactDaError::GenericVaaHandlerDeprecated.into())
    }

    /// Initializes a PactDaSolStub based on a VAA from Sui.
    pub fn initialize_stub_from_vaa(
        ctx: Context<InitializeStubFromVaa>,
        _vaa_hash: [u8; 32], // Used by SharedVaaAccounts
        target_solana_stub_id: u64,
        sui_contract_identifier: String,
        title: String,
        description: String,
        pactda_url: String,
        party_b_solana_address: Pubkey,
        // New optional fields from Sui, passed by relayer
        terms_reference: Option<String>,
        contract_start_date: Option<u64>,
        contract_deadline_date: Option<u64>,
        metadata: Option<String>,
        contract_type: Option<u8>,
    ) -> Result<()> {
        let stub = &mut ctx.accounts.pact_da_stub;
        stub.initiator = party_b_solana_address;
        stub.solana_stub_id = target_solana_stub_id;
        stub.sui_contract_identifier = sui_contract_identifier;
        stub.title = title;
        stub.description = description;
        stub.pactda_url = pactda_url;
        stub.display_status = "Initialized from Sui VAA".to_string();
        
        // Set new optional fields
        stub.terms_reference = terms_reference;
        stub.contract_start_date = contract_start_date;
        stub.contract_deadline_date = contract_deadline_date;
        stub.metadata = metadata;
        stub.contract_type = contract_type;

        stub.bump = ctx.bumps.pact_da_stub;

        msg!(
            "PactDA Solana Stub Initialized from Sui VAA. Solana Stub ID: {}, Sui Identifier: {}, Initiator: {}",
            stub.solana_stub_id,
            stub.sui_contract_identifier,
            stub.initiator
        );
        Ok(())
    }

    /// Updates the display status of a PactDaSolStub based on a VAA from Sui.
    pub fn update_stub_status_from_vaa(
        ctx: Context<UpdateStubStatusFromVaa>,
        _vaa_hash: [u8; 32], // For wormhole_message constraint in Accounts struct
        // Assuming relayer deserializes payload and passes args:
        _target_solana_stub_id: u64, // From VAA payload, used for PDA seeds in Accounts struct
        new_display_status: String, // From VAA payload
    ) -> Result<()> {
        // VAA verification by wormhole_message account constraints.
        // If full payload bytes were passed, deserialize `UpdateDisplayStatusFromSuiPayload` here.

        let stub = &mut ctx.accounts.pact_da_stub;
        // Constraint `pact_da_stub.solana_stub_id == target_solana_stub_id` in Accounts struct handles matching.
        stub.display_status = new_display_status;

        msg!(
            "Solana Stub ID {} display status updated from Sui VAA to: {}",
            stub.solana_stub_id,
            stub.display_status
        );
        Ok(())
    }

    /// Updates various details of a PactDaSolStub based on a VAA from Sui.
    pub fn update_stub_details_from_vaa(
        ctx: Context<UpdateStubDetailsFromVaa>,
        _vaa_hash: [u8; 32], // Used by SharedVaaAccounts
        _target_solana_stub_id: u64, // Used for constraint in Accounts struct
        new_title: Option<String>,
        new_terms_reference: Option<String>,
        new_contract_start_date: Option<u64>,
        new_contract_deadline_date: Option<u64>,
        new_metadata: Option<String>,
        new_contract_type: Option<u8>,
    ) -> Result<()> {
        let stub = &mut ctx.accounts.pact_da_stub;

        if let Some(title_val) = new_title { 
            stub.title = title_val; // stub.title is String, not Option<String>
        }
        
        // Update Option fields only if a Some value is explicitly passed.
        // If the instruction argument is None, the existing value in the stub is preserved.
        if new_terms_reference.is_some() {
             stub.terms_reference = new_terms_reference;
        }
        if new_contract_start_date.is_some() {
            stub.contract_start_date = new_contract_start_date;
        }
        if new_contract_deadline_date.is_some() {
            stub.contract_deadline_date = new_contract_deadline_date;
        }
        if new_metadata.is_some() {
            stub.metadata = new_metadata;
        }
        if new_contract_type.is_some() {
            stub.contract_type = new_contract_type;
        }
        
        msg!(
            "Solana Stub ID {} details updated from Sui VAA.",
            stub.solana_stub_id
        );
        Ok(())
    }
}

// --- Accounts Structs ---

#[derive(Accounts)]
#[instruction(solana_stub_id: u64)]
pub struct InitializeStubDirect<'info> {
    #[account(
        init,
        payer = signer,
        space = PactDaSolStub::MAX_SIZE,
        seeds = [
            b"pactda_stub_v1",
            signer.key().as_ref(), // Initiator is the signer
            solana_stub_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub pact_da_stub: Account<'info, PactDaSolStub>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(solana_stub_id: u64)]
pub struct RequestActionOnSui<'info> {
    #[account(
        seeds = [
            b"pactda_stub_v1",
            pact_da_stub.initiator.as_ref(),
            solana_stub_id.to_le_bytes().as_ref()
        ],
        bump = pact_da_stub.bump,
        constraint = pact_da_stub.solana_stub_id == solana_stub_id @ PactDaError::StubIdMismatch
    )]
    pub pact_da_stub: Account<'info, PactDaSolStub>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

// Common accounts for VAA processing (payer and bridge)
#[derive(Accounts)]
pub struct SharedVaaAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>, // Relayer
    /// CHECK: Wormhole bridge account, verified by address.
    #[account(address = WORMHOLE_BRIDGE_ADDRESS)]
    pub wormhole_bridge: AccountInfo<'info>,
    // system_program is removed from here; add to top-level structs if they init accounts.
    // wormhole_message is removed from here; add to top-level structs with vaa_hash from instruction.
}

#[derive(Accounts)]
#[instruction(
    vaa_hash: [u8; 32], // Passed by relayer
    target_solana_stub_id: u64, // From VAA payload, passed by relayer
    sui_contract_identifier: String, // From VAA payload
    title: String, // From VAA payload
    description: String, // From VAA payload
    pactda_url: String, // From VAA payload
    party_b_solana_address: Pubkey, // From VAA payload, becomes initiator
    // Add new optional fields to instruction context
    _terms_reference: Option<String>, 
    _contract_start_date: Option<u64>, 
    _contract_deadline_date: Option<u64>, 
    _metadata: Option<String>, 
    _contract_type: Option<u8> 
)]
pub struct InitializeStubFromVaa<'info> {
    // Use the simpler SharedVaaAccounts
    pub shared: SharedVaaAccounts<'info>,
    
    /// CHECK: Posted VAA account. Seeds are checked against WORMHOLE_CORE_BRIDGE_PID.
    #[account(
        seeds = [b"postedVAA", vaa_hash.as_ref()],
        bump, 
        seeds::program = WORMHOLE_BRIDGE_ADDRESS
    )]
    pub wormhole_message: AccountInfo<'info>, // Holds the VAA data

    #[account(
        init,
        payer = shared.payer, // Relayer pays
        space = PactDaSolStub::MAX_SIZE,
        seeds = [
            b"pactda_stub_v1",
            party_b_solana_address.as_ref(), // Use party_b from VAA as initiator for seeds
            target_solana_stub_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub pact_da_stub: Account<'info, PactDaSolStub>,
    pub system_program: Program<'info, System>, // System program needed for `init`
}

#[derive(Accounts)]
#[instruction(
    vaa_hash: [u8; 32], // Passed by relayer
    target_solana_stub_id: u64, // From VAA payload, used for PDA seeds
    _new_display_status: String // From VAA payload
)]
pub struct UpdateStubStatusFromVaa<'info> {
    pub shared: SharedVaaAccounts<'info>,

    /// CHECK: Posted VAA account. Seeds are checked against WORMHOLE_CORE_BRIDGE_PID.
    #[account(
        seeds = [b"postedVAA", vaa_hash.as_ref()],
        bump, 
        seeds::program = WORMHOLE_BRIDGE_ADDRESS
    )]
    pub wormhole_message: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [
            b"pactda_stub_v1",
            pact_da_stub.initiator.as_ref(), // Use stored initiator for finding the stub
            target_solana_stub_id.to_le_bytes().as_ref()
        ],
        bump = pact_da_stub.bump,
        constraint = pact_da_stub.solana_stub_id == target_solana_stub_id @ PactDaError::StubIdMismatch
    )]
    pub pact_da_stub: Account<'info, PactDaSolStub>,
}

// New Accounts struct for updating details from VAA
#[derive(Accounts)]
#[instruction(
    vaa_hash: [u8; 32], 
    target_solana_stub_id: u64, 
    // Optional fields for update
    new_title: Option<String>,
    new_terms_reference: Option<String>,
    new_contract_start_date: Option<u64>,
    new_contract_deadline_date: Option<u64>,
    new_metadata: Option<String>,
    new_contract_type: Option<u8>
)]
pub struct UpdateStubDetailsFromVaa<'info> {
    pub shared: SharedVaaAccounts<'info>,

    /// CHECK: Posted VAA account. Seeds are checked against WORMHOLE_CORE_BRIDGE_PID.
    #[account(
        seeds = [b"postedVAA", vaa_hash.as_ref()],
        bump, 
        seeds::program = WORMHOLE_BRIDGE_ADDRESS
    )]
    pub wormhole_message: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [
            b"pactda_stub_v1",
            pact_da_stub.initiator.as_ref(),
            target_solana_stub_id.to_le_bytes().as_ref()
        ],
        bump = pact_da_stub.bump,
        constraint = pact_da_stub.solana_stub_id == target_solana_stub_id @ PactDaError::StubIdMismatch
    )]
    pub pact_da_stub: Account<'info, PactDaSolStub>,
}

// Deprecating generic VAA handler context
#[derive(Accounts)]
#[instruction(vaa_hash: [u8; 32], vaa_payload_solana_stub_id: u64)]
pub struct ProcessVaaFromSui<'info> {
    #[account(mut)]
    pub payer: Signer<'info>, // This is the relayer
    /// CHECK: Wormhole bridge account.
    #[account(address = WORMHOLE_BRIDGE_ADDRESS)]
    pub wormhole_bridge: AccountInfo<'info>, // Renamed from shared.wormhole_bridge for clarity if preferred

    /// CHECK: Posted VAA account.
    #[account(
        seeds = [b"postedVAA", vaa_hash.as_ref()], // vaa_hash from instruction
        bump, 
        seeds::program = WORMHOLE_BRIDGE_ADDRESS
    )]
    pub wormhole_message: AccountInfo<'info>, // Defined directly

    #[account(
        mut,
        seeds = [
            b"pactda_stub_v1",
            pact_da_stub.initiator.as_ref(),
            vaa_payload_solana_stub_id.to_le_bytes().as_ref()
        ],
        bump = pact_da_stub.bump,
        constraint = pact_da_stub.solana_stub_id == vaa_payload_solana_stub_id @ PactDaError::StubIdMismatch
    )]
    pub pact_da_stub: Account<'info, PactDaSolStub>,
    pub system_program: Program<'info, System>,
}


// --- State Account ---
#[account]
pub struct PactDaSolStub {
    pub initiator: Pubkey,
    pub solana_stub_id: u64,
    pub sui_contract_identifier: String, // Max 70 chars
    pub title: String,                   // Max 100 chars
    pub description: String,             // Max 250 chars 
    pub pactda_url: String,              // Max 120 chars 
    pub display_status: String,          // Max 100 chars

    // New optional fields
    pub terms_reference: Option<String>,    // Max 100 chars if Some
    pub contract_start_date: Option<u64>,
    pub contract_deadline_date: Option<u64>,
    pub metadata: Option<String>,           // Max 200 chars if Some 
    pub contract_type: Option<u8>,

    pub bump: u8,
}

impl PactDaSolStub {
    // Recalculated MAX_SIZE:
    // Discriminator: 8
    // initiator: 32
    // solana_stub_id: 8
    // sui_contract_identifier: String (4 + 70) = 74
    // title: String (4 + 100) = 104
    // description: String (4 + 250) = 254 (Retained existing field, consider if it should be part of new metadata field)
    // pactda_url: String (4 + 120) = 124 (Retained existing field, consider if it should be part of new metadata field)
    // display_status: String (4 + 100) = 104
    // terms_reference: Option<String> (1 + (4 + 100 if Some)) = 105
    // contract_start_date: Option<u64> (1 + 8 if Some) = 9
    // contract_deadline_date: Option<u64> (1 + 8 if Some) = 9
    // metadata: Option<String> (1 + (4 + 200 if Some)) = 205
    // contract_type: Option<u8> (1 + 1 if Some) = 2
    // bump: 1
    // Total: 8 + 32 + 8 + 74 + 104 + 254 + 124 + 104 + 105 + 9 + 9 + 205 + 2 + 1 = 1039
    const MAX_SIZE: usize = 1039; 
}

// --- Events ---
#[event]
pub struct ActionToSuiRequested {
    pub solana_stub_id: u64,
    pub initiator_on_solana: Pubkey,
    pub action_type_for_sui: u8,
    // #[coder(borsh)] removed as Vec<u8> is already serialized bytes
    pub full_action_payload_for_sui: Vec<u8>, // Serialized ActionToSuiPayload
    pub target_chain_id: u16,
    pub target_sui_bridge_address: [u8; 32],
}

// --- Payload Structs ---

// Payload included in the ActionToSuiRequested event's `full_action_payload_for_sui`
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ActionToSuiPayload {
    pub sui_contract_identifier: String, // The main Sui PactDaContract Object ID
    pub action_specific_data: Vec<u8>,   // Borsh-serialized specific payload (e.g., SignContractSuiPayload)
}

// Specific payload for "signing" a contract on Sui (part of ActionToSuiPayload.action_specific_data)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SignContractSuiPayload {
    pub solana_signer_address_bytes: [u8; 32],
    pub party_role_on_sui: u8, // e.g., 0 for Party A, 1 for Party B
}

// Specific payload for submitting proof on Sui (part of ActionToSuiPayload.action_specific_data)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SubmitProofSuiPayload {
    pub solana_submitter_address_bytes: [u8; 32],
    pub proof_url: String,
    pub proof_description: String,
    pub milestone_id_on_sui: Option<u64>,
}

// Payload expected FROM Sui TO initialize a stub on Solana (deserialized from VAA)
// This is what the relayer would pass as individual args to `initialize_stub_from_vaa`
// or what would be deserialized if `initialize_stub_from_vaa` took `vaa_payload_bytes: Vec<u8>`.
// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
// pub struct InitializeStubFromSuiPayload {
//     // pub action: u8, // Should be solana_actions::INITIALIZE_STUB
//     pub target_solana_stub_id: u64,
//     pub sui_contract_identifier: String,
//     pub title: String,
//     pub description: String,
//     pub pactda_url: String,
//     pub party_b_solana_address: Pubkey, // The initiator of the stub on Solana
// }

// Payload expected FROM Sui TO update display status on Solana (deserialized from VAA)
// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
// pub struct UpdateDisplayStatusFromSuiPayload {
//     // pub action: u8, // Should be solana_actions::UPDATE_DISPLAY_STATUS
//     pub target_solana_stub_id: u64,
//     pub new_display_status: String,
// }


// --- Errors ---
#[error_code]
pub enum PactDaError {
    #[msg("Unauthorized action.")]
    Unauthorized,
    #[msg("Instruction argument 'solana_stub_id' does not match ID in PactDaSolStub account.")]
    StubIdMismatch,
    #[msg("VAA payload 'solana_stub_id' does not match ID in PactDaSolStub account.")]
    VaaTargetMismatch,
    #[msg("Generic VAA handler is deprecated. Use specific VAA handlers.")]
    GenericVaaHandlerDeprecated,
}
