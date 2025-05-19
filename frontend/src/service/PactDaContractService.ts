import { PactDaContract } from '@/@types/PactDaContract'
import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'

// Import environment variables for package and module
const PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID || import.meta.env.VITE_PACKAGE_ID
const MODULE_NAME = import.meta.env.VITE_SUI_MODULE_NAME || import.meta.env.VITE_MODULE_NAME

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
 * Retrieves a contract object ID from a transaction digest.
 * 
 * @param suiClient SuiClient instance
 * @param digest Transaction digest from the executed transaction
 * @returns Promise with the contract object ID or null if not found
 */
export const getContractIdFromDigest = async (
  suiClient: SuiClient,
  digest: string
): Promise<string | null> => {
  try {
    // Get transaction details using the digest
    const txnResponse = await suiClient.getTransactionBlock({
      digest,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    // Look for contract creation event
    if (txnResponse.events) {
      const contractCreatedEvent = txnResponse.events.find(
        event => 
          event.type.includes(`${PACKAGE_ID}::${MODULE_NAME}::ContractCreatedEvent`) ||
          event.parsedJson?.contract_id
      );
      
      if (contractCreatedEvent?.parsedJson?.contract_id) {
        return contractCreatedEvent.parsedJson.contract_id;
      }
    }

    // As a fallback, look for created objects in effects
    if (txnResponse.effects?.created && txnResponse.effects.created.length > 0) {
      const createdObjects = txnResponse.effects.created;
      // Filter objects with contract-related types if possible
      const contractObject = createdObjects.find(obj => 
        obj.owner === 'Shared' || // Contracts are typically shared objects
        (obj.type && obj.type.includes(`${PACKAGE_ID}::${MODULE_NAME}::PactDaContract`))
      );
      
      if (contractObject?.reference?.objectId) {
        return contractObject.reference.objectId;
      }
      
      // If no contract-specific object found, return the first created object ID
      if (createdObjects[0]?.reference?.objectId) {
        return createdObjects[0].reference.objectId;
      }
    }
    
    return null;
  } catch (error) {
    throw new Error(`Failed to get contract ID from digest ${digest}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Gets all contracts for a specific owner
 */
export const getAllContractsByOwner = async (
  suiClient: SuiClient,
  ownerAddress?: string,
) => {
  if (!ownerAddress) return;
  const STRUCT_NAME = 'ContractReceipt';

  const typeFilter = `${PACKAGE_ID}::${MODULE_NAME}::${STRUCT_NAME}`;
  const allObjects = await suiClient.getOwnedObjects({
    owner: ownerAddress,
    options: {
      showOwner: true,
      showType: true,
      showContent: true,
    },
    filter: {
      StructType: typeFilter,
    },
  });

  return allObjects.data
    .filter((obj) => {
      const content = obj.data?.content as any;
      return content?.fields?.action_type === 'contract_created';
    })
    .map((obj) => {
      const content = obj.data?.content as any;
      return {
        objectId: obj.data?.objectId,
        contractAddress: content.fields.contract_address,
        timestamp: content.fields.timestamp,
      };
    });
};

/**
 * Gets contracts based on a list of contract IDs
 */
export const getContracts = async (
  suiClient: SuiClient,
  contractIds: string[],
): Promise<PactDaContract[]> => {
  if (contractIds.length === 0) return [];

  const objects = await suiClient.multiGetObjects({
    ids: contractIds,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  return objects
    .filter((obj) => obj.data?.content)
    .map((obj) => {
      const content = obj.data?.content as any;
      const fields = content.fields;

      return {
        id: obj.data?.objectId || '',
        title: fields.title || '',
        contractType: fields.contract_type || 0,
        status: fields.status || '',
        partyAAddress: fields.party_a || '',
        partyBAddress: fields.party_b || '',
        termsReference: fields.terms_reference || undefined,
        startDate: fields.contract_start_date ? Number(fields.contract_start_date) : undefined,
        endDate: fields.contract_deadline_date ? Number(fields.contract_deadline_date) : undefined,
        metadata: fields.metadata || undefined,
        pactdaUrl: '', // Not stored in contract
        isPartyASigned: fields.is_party_a_signed || false,
        isPartyBSigned: fields.is_party_b_signed || false,
      };
    });
};

export const buildAddMilestoneTx = (
  contractId: string,
  milestoneTitle: string,
  description?: string,
  startDate?: number,
  endDate?: number,
  status?: number
): Transaction => {
  if (!contractId) {
    throw new Error('Contract ID is required');
  }

  if (!milestoneTitle) {
    throw new Error('Milestone Title is required');
  }

  const txb = new Transaction();
  const args = [];

  // === Helper Functions ===
  const encodeBytes = (data: string) => 
    Array.from(new TextEncoder().encode(data));

  // === Contract ID (address) ===
  args.push(txb.pure.address(contractId));

  // === Milestone Title (string) ===
  args.push(txb.pure.string(milestoneTitle));

  // === Description (Option<vector<u8>>) ===
  args.push(
    description && description.trim() !== ''
      ? txb.pure.option('vector<u8>', encodeBytes(description))
      : txb.pure.option('vector<u8>', null)
  );

  // === Start Date (Option<u64>) ===
  args.push(
    startDate !== undefined
      ? txb.pure.option('u64', BigInt(startDate))
      : txb.pure.option('u64', null)
  );

  // === End Date (Option<u64>) ===
  args.push(
    endDate !== undefined
      ? txb.pure.option('u64', BigInt(endDate))
      : txb.pure.option('u64', null)
  );

  // === Status (Option<u8>) ===
  args.push(
    status !== undefined
      ? txb.pure.option('u8', status)
      : txb.pure.option('u8', null)
  );

  // === Move Call ===
  try {
    txb.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::add_milestone`,
      arguments: args,
    });
    return txb;
  } catch (error) {
    throw new Error(
      `Failed to build transaction: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};


// Export functions for contract interactions
export {
  buildSignContractAsPartyATx,
  buildSignContractAsPartyBTx,
  buildApproveContractTx,
  buildCreateMilestoneTx,
  buildCompleteMilestoneTx,
  buildReleasePaymentTx,
  buildCancelContractTx,
} from './PactdaService';
