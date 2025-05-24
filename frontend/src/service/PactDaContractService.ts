import { PactDaContract } from '@/@types/PactDaContract'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { toast } from 'sonner'
import { buildCreateMilestoneTx, buildSignContractAsPartyATx, buildSignContractAsPartyBTx, buildSubmitContractTx } from './PactdaService'

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
        updatedAt: fields.updated_at || 0,
      }
    })
}


// Get contract detail
export const getContractDetail = async (suiClient, contractId) => {
  const contracts = await getContracts(suiClient, [contractId])
  return contracts[0] || null
}

// Sign contract
export const signContract = async (
  contract,
  address,
  signAndExecuteTransaction,
  suiClient,
  onSuccess,
) => {
  const { objectId, partyA, partyB } = contract
  const isPartyA = address === partyA
  const isPartyB = address === partyB
  let txb
  if (isPartyA) {
    txb = await buildSignContractAsPartyATx(objectId)
  } else if (isPartyB) {
    txb = await buildSignContractAsPartyBTx(objectId)
  } else {
    toast.error('You are not a party to this contract.')
    return
  }
  const result = await signAndExecuteTransaction({ transaction: txb })
  if (!result.digest) {
    toast.error('Transaction succeeded but no digest was returned')
    return
  }
  toast.promise(
    suiClient.waitForTransaction({ digest: result.digest, options: { showEffects: true } }),
    {
      loading: 'Processing signature...',
      success: async () => {
        await onSuccess()
        return 'Contract signed successfully!'
      },
      error: 'Error processing signature.',
    },
  )
}

// Submit contract
export const submitContract = async (
  contract,
  signAndExecuteTransaction,
  suiClient,
  onSuccess,
) => {
  const { objectId } = contract
  const txb = await buildSubmitContractTx(objectId)
  const result = await signAndExecuteTransaction({ transaction: txb })
  if (!result.digest) {
    toast.error('Transaction succeeded but no digest was returned')
    return
  }
  toast.promise(
    suiClient.waitForTransaction({ digest: result.digest, options: { showEffects: true } }),
    {
      loading: 'Submitting contract...',
      success: async () => {
        await onSuccess()
        return 'Contract submitted successfully!'
      },
      error: 'Error submitting contract.',
    },
  )
}


// Export functions for contract interactions
export {
  buildSignContractAsPartyATx,
  buildSignContractAsPartyBTx,
  buildApproveContractTx,
  buildCreateMilestoneTx,
  buildCompleteMilestoneTx,
  buildReleasePaymentTx,
  buildCancelContractTx,
} from './PactdaService'
