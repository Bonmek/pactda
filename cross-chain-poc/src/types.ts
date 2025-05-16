export interface PactContract {
  id: string; // Sui Contract ID
  title: string; // Corresponds to title: String in Move
  description?: string; // User-friendly description, will be termsReference if not separately managed
  pactdaUrl: string;
  partyAAddress: string; // Sui address of Party A (creator)
  partyBAddress?: string; // Solana address of Party B (for cross-chain aspect)
  suiPartyBAddress?: string; // Optional Sui address for party_b: Option<address> in create_contract
  contractType?: number; // For contract_type: Option<u8>
  termsReference?: string; // For terms_reference: Option<vector<u8>> (replaces 'description' for contract arg)
  startDate?: number; // Unix timestamp for contract_start_date: Option<u64>
  endDate?: number; // Unix timestamp for contract_deadline_date: Option<u64>
  metadata?: string; // For metadata: Option<vector<u8>>
  
  // Solana integration fields
  solanaStubId?: number; // ID for the Solana stub (will be converted to BN for contract calls)
  solanaStubInitiator?: string; // Solana public key string of the account that initialized the stub
  solanaSignatureId?: string; // Solana transaction signature when party B signs
  solPartyB?: string;     // Solana address of Party B
  solStubCreated?: boolean; // Whether a Solana stub has been created
  solSigned?: boolean;    // Whether Party B has signed on Solana
  
  // UI/display fields
  status: string; // e.g., "Created on Sui", "Stub on Solana", "Signed by Party B"
  suiExplorerUrl?: string; // URL to view Sui transaction
  solanaExplorerUrl?: string; // URL to view Solana stub creation transaction
  solanaSignExplorerUrl?: string; // URL to view Solana sign transaction
  suiCreator?: string;    // Alias for partyAAddress for display purposes
}