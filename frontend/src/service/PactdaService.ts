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

export const buildApproveContractTx = (contractId: string): Transaction => {
  const txb = new Transaction()

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::approve_contract`,
    arguments: [txb.object(contractId)],
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
    arguments: [txb.object(contractId), txb.pure.u64(milestoneId)],
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
    arguments: [txb.object(contractId), txb.pure.u64(milestoneId)],
  })

  return txb
}

export const buildCancelContractTx = (contractId: string): Transaction => {
  const txb = new Transaction()

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::cancel_contract`,
    arguments: [txb.object(contractId)],
  })

  return txb
}
