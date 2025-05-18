import { Transaction } from '@mysten/sui/transactions';

/**
 * Builds a transaction to create a PactDa contract.
 * 
 * @param title Contract title
 * @param partyBAddress Optional party B address
 * @param contractType Optional contract type (0-255)
 * @param termsReference Optional terms reference
 * @param startDate Optional start date timestamp
 * @param endDate Optional end date timestamp
 * @param metadata Optional metadata
 * @returns Transaction object ready to be signed and executed
 */
export const buildCreateContractTx = (
  title: string,
  partyBAddress?: string,
  contractType?: number,
  termsReference?: string,
  startDate?: number,
  endDate?: number,
  metadata?: string,
): Transaction => {
  const txb = new Transaction();

  // Validate required inputs
  if (!title) {
    throw new Error('Title is required');
  }

  // Package ID and module name for the PactDA contract on testnet
  const PACKAGE_ID = '0x18f53036747b3b150fea147f42a8e23f9f48c21186337c831603c378075f2d7c';
  const MODULE_NAME = 'pactda';

  try {
    const args = [];
    
    // === Party B Address (Option<address>) ===
    if (partyBAddress && partyBAddress.trim() !== '') {
      // Validate the address format
      if (!/^0x[a-fA-F0-9]{64}$/.test(partyBAddress)) {
        throw new Error(`Invalid party B address format: ${partyBAddress}. Must be a 64-character hex string starting with 0x.`);
      }
      args.push(txb.pure.option('address', partyBAddress));
    } else {
      args.push(txb.pure.option('address', null));
    }
    
    // === Title (String) ===
    args.push(txb.pure.string(title));
    
    // === Contract Type (Option<u8>) ===
    if (contractType !== undefined) {
      if (contractType < 0 || contractType > 255) {
        throw new Error(`Contract type must be between 0 and 255, got ${contractType}`);
      }
      args.push(txb.pure.option('u8', contractType));
    } else {
      args.push(txb.pure.option('u8', null));
    }
    
    // === Terms Reference (Option<vector<u8>>) ===
    if (termsReference && termsReference.trim() !== '') {
      // Encode string to bytes
      const bytes = new TextEncoder().encode(termsReference);
      const bytesVector = Array.from(bytes);
      args.push(txb.pure.option('vector<u8>', bytesVector));
    } else {
      args.push(txb.pure.option('vector<u8>', null));
    }
    
    // === Start Date (Option<u64>) ===
    if (startDate !== undefined) {
      args.push(txb.pure.option('u64', BigInt(startDate)));
    } else {
      args.push(txb.pure.option('u64', null));
    }
    
    // === End Date (Option<u64>) ===
    if (endDate !== undefined) {
      args.push(txb.pure.option('u64', BigInt(endDate)));
    } else {
      args.push(txb.pure.option('u64', null));
    }
    
    // === Metadata (Option<vector<u8>>) ===
    if (metadata && metadata.trim() !== '') {
      const bytes = new TextEncoder().encode(metadata);
      const bytesVector = Array.from(bytes);
      args.push(txb.pure.option('vector<u8>', bytesVector));
    } else {
      args.push(txb.pure.option('vector<u8>', null));
    }

    // Add the move call to the transaction
    txb.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::create_contract`,
      arguments: args,
    });
    
    return txb;
  } catch (error) {
    throw new Error(`Failed to build transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Builds a transaction to create a cross-chain contract on Sui with a Solana party B.
 * 
 * @param title Contract title
 * @param chainId Chain ID of Party B (e.g., Solana = 1)
 * @param partyBAddress Party B address (Solana address as bytes)
 * @param contractType Optional contract type
 * @param termsReference Optional terms reference
 * @param startDate Optional start date timestamp
 * @param endDate Optional end date timestamp 
 * @param metadata Optional metadata
 * @returns Transaction object ready to be signed and executed
 */
export const buildCreateCrossChainContractTx = (
  title: string,
  chainId: number,
  partyBAddress: string,
  contractType?: number,
  termsReference?: string,
  startDate?: number,
  endDate?: number,
  metadata?: string,
): Transaction => {
  const txb = new Transaction();

  // Validate required inputs
  if (!title) {
    throw new Error('Title is required');
  }
  
  if (!partyBAddress) {
    throw new Error('Party B address is required for cross-chain contracts');
  }

  // Package ID and module name for the PactDA contract on testnet
  const PACKAGE_ID = '0x18f53036747b3b150fea147f42a8e23f9f48c21186337c831603c378075f2d7c';
  const MODULE_NAME = 'pactda';

  try {
    const args = [];
    
    // === Chain ID for Party B (u16) ===
    args.push(txb.pure.u16(chainId));
    
    // === Party B Address (vector<u8>) ===
    // Convert base58 Solana address to bytes if needed
    // For this PoC, we'll just convert the string to bytes for simplicity
    const partyBBytes = new TextEncoder().encode(partyBAddress);
    args.push(txb.pure.vector('u8', Array.from(partyBBytes)));
    
    // === Title (String) ===
    args.push(txb.pure.string(title));
    
    // === Contract Type (Option<u8>) ===
    if (contractType !== undefined) {
      if (contractType < 0 || contractType > 255) {
        throw new Error(`Contract type must be between 0 and 255, got ${contractType}`);
      }
      args.push(txb.pure.option('u8', contractType));
    } else {
      args.push(txb.pure.option('u8', null));
    }
    
    // === Terms Reference (Option<vector<u8>>) ===
    if (termsReference && termsReference.trim() !== '') {
      const bytes = new TextEncoder().encode(termsReference);
      args.push(txb.pure.option('vector<u8>', Array.from(bytes)));
    } else {
      args.push(txb.pure.option('vector<u8>', null));
    }
    
    // === Start Date (Option<u64>) ===
    if (startDate !== undefined) {
      args.push(txb.pure.option('u64', BigInt(startDate)));
    } else {
      args.push(txb.pure.option('u64', null));
    }
    
    // === End Date (Option<u64>) ===
    if (endDate !== undefined) {
      args.push(txb.pure.option('u64', BigInt(endDate)));
    } else {
      args.push(txb.pure.option('u64', null));
    }
    
    // === Metadata (Option<vector<u8>>) ===
    if (metadata && metadata.trim() !== '') {
      const bytes = new TextEncoder().encode(metadata);
      args.push(txb.pure.option('vector<u8>', Array.from(bytes)));
    } else {
      args.push(txb.pure.option('vector<u8>', null));
    }

    // Add the move call to the transaction
    txb.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::create_contract_cross_chain`,
      arguments: args,
    });
    
    return txb;
  } catch (error) {
    throw new Error(`Failed to build cross-chain transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
};
