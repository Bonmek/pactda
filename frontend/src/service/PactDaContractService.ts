import { PactDaContract } from '@/@types/PactDaContract'
import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'

// Import environment variables for package and module
const PACKAGE_ID =
  import.meta.env.VITE_SUI_PACKAGE_ID || import.meta.env.VITE_PACKAGE_ID
const MODULE_NAME =
  import.meta.env.VITE_SUI_MODULE_NAME || import.meta.env.VITE_MODULE_NAME




/**
 * Gets all contracts for a specific owner
 */
export const getAllContractsByOwner = async (
  suiClient: SuiClient,
  ownerAddress?: string,
) => {
  if (!ownerAddress) return
  const STRUCT_NAME = 'ContractReceipt'

  const typeFilter = `${PACKAGE_ID}::${MODULE_NAME}::${STRUCT_NAME}`
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
  })

  return allObjects.data
    .filter((obj) => {
      const content = obj.data?.content as any
      return content?.fields?.action_type === 'contract_created'
    })
    .map((obj) => {
      const content = obj.data?.content as any
      return {
        objectId: obj.data?.objectId,
        contractAddress: content.fields.contract_address,
        timestamp: content.fields.timestamp,
      }
    })
}

/**
 * Gets contracts based on a list of contract IDs
 */
export const getContracts = async (
  suiClient: SuiClient,
  contractIds: string[],
): Promise<PactDaContract[]> => {
  if (contractIds.length === 0) return []

  const objects = await suiClient.multiGetObjects({
    ids: contractIds,
    options: {
      showContent: true,
      showOwner: true,
    },
  })

  return objects
    .filter((obj) => obj.data?.content)
    .map((obj) => {
      const content = obj.data?.content as any
      const fields = content.fields

      return {
        id: obj.data?.objectId || '',
        objectId: obj.data?.objectId || '',
        title: fields.title || '',
        contractType: fields.contract_type || 0,
        status: fields.status || '',
        partyA: fields.party_a || '',
        partyAAddress: fields.party_a || '',
        partyASigned: fields.is_party_a_signed || false,
        partyB: fields.party_b || '',
        partyBAddress: fields.party_b || '',
        partyBSigned: fields.is_party_b_signed || false,
        termsReference: fields.terms_reference || undefined,
        startDate: fields.contract_start_date
          ? Number(fields.contract_start_date)
          : undefined,
        endDate: fields.contract_deadline_date
          ? Number(fields.contract_deadline_date)
          : undefined,
        metadata: fields.metadata || undefined,
        pactdaUrl: '', // Not stored in contract
        isPartyASigned: fields.is_party_a_signed || false,
        isPartyBSigned: fields.is_party_b_signed || false,
        version: fields.version || 0,
        digest: fields.digest || '',
        escrowId: fields.escrow_id || '',
        milestones: fields.milestones || [],
        amount: fields.amount || 0,
        currency: fields.currency || '',
        createdAt: fields.created_at || 0,
        updatedAt: fields.updated_at || 0
      }
    })
}

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
