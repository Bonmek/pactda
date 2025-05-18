import { PactDaContract } from '@/@types/PactDaContract'
import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID
const MODULE_NAME = import.meta.env.VITE_MODULE_NAME

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

export const getContracts = async (
  suiClient: SuiClient,
  sharedObjectId: string,
): Promise<PactDaContract | null> => {
  const response = await suiClient.getObject({
    id: sharedObjectId,
    options: {
      showContent: true,
      showType: true,
      showOwner: true,
      showPreviousTransaction: false,
    },
  })

  console.log('getContracts response:', response)

  if (!response.data || response.data.content?.dataType !== 'moveObject') {
    return null
  }

  const fields = response.data.content.fields

  const contract: PactDaContract = {
    objectId: response.data.objectId,
    version: response.data.version,
    digest: response.data.digest,
    escrowId: (fields as any).escrow_id,
    milestones: (fields as any).milestones,
    partyA: (fields as any).party_a,
    partyASigned: (fields as any).party_a_signed,
    partyB: (fields as any).party_b,
    partyBSigned: (fields as any).party_b_signed,
    status: (fields as any).status,
    termsReference: new TextDecoder().decode(
      Uint8Array.from((fields as any).terms_reference),
    ),
  }

  return contract
}

export const buildCreateContractTx = (
  title: string, // title is mandatory
  partyBAddress?: string, // Option<address>
  contractType?: number, // Option<u8>
  termsReference?: string, // Option<vector<u8>>
  startDate?: number, // Option<u64> (timestamp)
  endDate?: number, // Option<u64> (timestamp)
  metadata?: string, // Option<vector<u8>>
): Transaction => {
  const txb = new Transaction();

  // Validate inputs to prevent errors
  if (!title) {
    throw new Error('Title is required');
  }

  console.log('buildCreateContractTx inputs (raw):', {
    title,
    partyBAddress,
    contractType,
    termsReference,
    startDate,
    endDate,
    metadata,
  });
  
  console.log('buildCreateContractTx inputs (processed):', {
    title,
    partyBAddress: partyBAddress || 'null/undefined',
    partyBAddressIsEmpty: partyBAddress === '',
    partyBAddressType: typeof partyBAddress,
    contractType: contractType !== undefined ? contractType : 'null/undefined',
    contractTypeType: typeof contractType,
    termsReference: termsReference || 'null/undefined',
    startDate: startDate !== undefined ? new Date(startDate * 1000).toISOString() : 'null/undefined',
    endDate: endDate !== undefined ? new Date(endDate * 1000).toISOString() : 'null/undefined',
    metadata: metadata || 'null/undefined',
  });
  
  // Parameter order based on the Move function signature:
  // party_b: Option<address>, title: String, contract_type: Option<u8>, 
  // terms_reference: Option<vector<u8>>, contract_start_date: Option<u64>, 
  // contract_deadline_date: Option<u64>, metadata: Option<vector<u8>>
  const args = [    // First arg: party_b: Option<address>
    partyBAddress && partyBAddress.trim() !== '' 
      ? (() => {
          console.log('partyBAddress before encoding:', partyBAddress);
          const isValidAddress = /^0x[a-fA-F0-9]{64}$/.test(partyBAddress);
          if (!isValidAddress) {
            throw new Error(`Invalid partyBAddress format: ${partyBAddress}. Must be a 64-character hex string starting with 0x.`);
          }
          try {            // Make sure we have a valid party B address to encode
            const encodedAddress = txb.pure.address(partyBAddress);
            console.log('Validated and encoded partyBAddress (type):', typeof encodedAddress);
            // We need to return the proper option type with the encoded address
            return txb.pure.option('address', encodedAddress);
          } catch (error) {
            console.error('Error encoding partyBAddress:', error);
            throw new Error(`Failed to encode party B address: ${partyBAddress}. Error: ${error instanceof Error ? error.message : String(error)}`);
          }
        })() 
      : (() => {
          console.log('Using None/null for party_b address');
          return txb.pure.option('address', null);
        })(), // Pass null for empty/undefined value
      
    // Second arg: title: String
    txb.pure.string(title),
    
    // Third arg: contract_type: Option<u8>
    contractType !== undefined 
      ? (() => {
          console.log('contractType:', contractType);
          return txb.pure.option('u8', contractType);
        })() 
      : txb.pure.option('u8', null),
    
    // Fourth arg: terms_reference: Option<vector<u8>>
    termsReference && termsReference.trim() !== '' 
      ? (() => {
          const encoded = Array.from(new TextEncoder().encode(termsReference));
          console.log('Encoded termsReference:', encoded);
          return txb.pure.option('vector<u8>', encoded);
        })() 
      : txb.pure.option('vector<u8>', null),
      
    // Fifth arg: contract_start_date: Option<u64>
    startDate !== undefined 
      ? (() => {
          console.log('startDate:', startDate);
          return txb.pure.option('u64', startDate);
        })() 
      : txb.pure.option('u64', null),
      
    // Sixth arg: contract_deadline_date: Option<u64>
    endDate !== undefined 
      ? (() => {
          console.log('endDate:', endDate);
          return txb.pure.option('u64', endDate);
        })() 
      : txb.pure.option('u64', null),
      
    // Seventh arg: metadata: Option<vector<u8>>
    metadata && metadata.trim() !== '' 
      ? (() => {
          const encoded = Array.from(new TextEncoder().encode(metadata));
          console.log('Encoded metadata:', encoded);
          return txb.pure.option('vector<u8>', encoded);
        })() 
      : txb.pure.option('vector<u8>', null),
  ];
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::create_contract`,
    arguments: args,
  });

  return txb;
};

export const buildSignContractAsPartyATx = (contractId: string) => {
  const txb = new Transaction()
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::sign_contract_party_a`,
    arguments: [txb.object(contractId)],
  })

  return txb
}

export const buildSignContractAsPartyBTx = (contractId: string) => {
  const txb = new Transaction()
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::sign_contract_party_b`,
    arguments: [txb.object(contractId)],
  })

  return txb
}

export const buildApproveContractTx = (
  contractId: string,
): Transaction => {
  const txb = new Transaction()

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::approve_contract`,
    arguments: [
      txb.object(contractId),
    ],
  })

  return txb
}

export const buildCreateMilestoneTx = (
  contractId: string,
  amount: bigint | number,
  description: string,
): Transaction => {
  const txb = new Transaction()
  const encoded = new TextEncoder().encode(description)

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::create_milestone`,
    arguments: [
      txb.object(contractId),
      txb.pure.u64(amount),
      txb.pure.vector('u8', Array.from(encoded)),
    ],
  })

  return txb
}

export const buildCompleteMilestoneTx = (
  contractId: string,
  milestoneId: bigint | number,
): Transaction => {
  const txb = new Transaction()

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::complete_milestone`,
    arguments: [
      txb.object(contractId),
      txb.pure.u64(milestoneId),
    ],
  })

  return txb
}

export const buildReleasePaymentTx = (
  contractId: string,
  milestoneId: bigint | number,
): Transaction => {
  const txb = new Transaction()

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::release_payment`,
    arguments: [
      txb.object(contractId),
      txb.pure.u64(milestoneId),
    ],
  })

  return txb
}

export const buildCancelContractTx = (
  contractId: string,
): Transaction => {
  const txb = new Transaction()

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::cancel_contract`,
    arguments: [
      txb.object(contractId),
    ],
  })

  return txb
}
