import { SuiClient } from '@mysten/sui/client'
import { coinWithBalance, Transaction } from '@mysten/sui/transactions'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { PactDaContract } from '@/@types/PactDaContract'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { toast } from 'sonner'
import { solanaService } from './SolanaService'

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
    partyASigned: (fields as any).is_party_a_signed,
    partyB: (fields as any).party_b,
    partyBSigned: (fields as any).is_party_b_signed,
    status: (fields as any).status,
    termsReference: new TextDecoder().decode(
      Uint8Array.from((fields as any).terms_reference),
    ),
    title: (fields as any).title,
    contractType: (fields as any).contract_type,
    contractStartDate: (fields as any).contract_start_date,
    contractDeadlineDate: (fields as any).contract_deadline_date,
    metadata: (fields as any).metadata,
    cross_chain_parties: (fields as any).cross_chain_parties,
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
  const txb = new Transaction()

  // Validate inputs to prevent errors
  if (!title) {
    throw new Error('Title is required')
  }

  const args = [
    partyBAddress && partyBAddress.trim() !== ''
      ? (() => {
          const isValidAddress = /^0x[a-fA-F0-9]{64}$/.test(partyBAddress)
          if (!isValidAddress) {
            throw new Error(
              `Invalid partyBAddress format: ${partyBAddress}. Must be a 64-character hex string starting with 0x.`,
            )
          }
          try {
            return txb.pure.option('address', partyBAddress)
          } catch (error) {
            console.error('Error encoding partyBAddress:', error)
            throw new Error(
              `Failed to encode party B address: ${partyBAddress}. Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            )
          }
        })()
      : (() => {
          return txb.pure.option('address', null)
        })(),

    // Second arg: title: String
    txb.pure.string(title),

    // Third arg: contract_type: Option<u8>
    contractType !== undefined
      ? (() => {
          return txb.pure.option('u8', contractType)
        })()
      : txb.pure.option('u8', null),

    // Fourth arg: terms_reference: Option<vector<u8>>
    termsReference && termsReference.trim() !== ''
      ? (() => {
          const encoded = Array.from(new TextEncoder().encode(termsReference))
          return txb.pure.option('vector<u8>', encoded)
        })()
      : txb.pure.option('vector<u8>', null),

    // Fifth arg: contract_start_date: Option<u64>
    startDate !== undefined
      ? (() => {
          return txb.pure.option('u64', startDate)
        })()
      : txb.pure.option('u64', null),

    // Sixth arg: contract_deadline_date: Option<u64>
    endDate !== undefined
      ? (() => {
          return txb.pure.option('u64', endDate)
        })()
      : txb.pure.option('u64', null),

    // Seventh arg: metadata: Option<vector<u8>>
    metadata && metadata.trim() !== ''
      ? (() => {
          const encoded = Array.from(new TextEncoder().encode(metadata))
          return txb.pure.option('vector<u8>', encoded)
        })()
      : txb.pure.option('vector<u8>', null),
  ]
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::create_contract`,
    arguments: args,
  })

  return txb
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

export const buildSubmitContractTx = (contractId: string): Transaction => {
  const txb = new Transaction()

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::submit_contract`,
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
  description: string,
  amount: bigint | number,
): Transaction => {
  const txb = new Transaction()
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::add_milestones`,
    arguments: [
      txb.object(contractId),
      txb.pure.vector('string', [description]),
      txb.pure.vector('u64', [BigInt(amount)]),
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

export const buildUpdateContractTx = (
  contractId: string,
  values: {
    chainId?: number // Option<u16> for cross-chain, usually undefined for Sui-only
    partyBCrossChain?: string // Option<vector<u8>> (hex string or undefined)
    suiPartyBAddress?: string // Option<address>
    contractType?: number // Option<u8>
    termsReference?: string // Option<vector<u8>>
    metadata?: string // Option<vector<u8>>
    startDate?: Date // Option<u64>
    endDate?: Date // Option<u64>
  },
): Transaction => {
  const txb = new Transaction()

  const args = [
    // 1. contract: &mut PactDaContract
    txb.object(contractId),
    // 2. chain_id: Option<u16>
    values.chainId !== undefined && values.chainId !== null
      ? txb.pure.option('u16', values.chainId)
      : txb.pure.option('u16', null),
    // 3. party_b_cross_chain: Option<vector<u8>>
    values.partyBCrossChain && values.partyBCrossChain.trim() !== ''
      ? (() => {
          let hex = values.partyBCrossChain.trim()
          if (hex.startsWith('0x')) hex = hex.slice(2)
          // Browser-compatible hex to bytes conversion (no Buffer)
          const bytes = (hex.match(/.{1,2}/g) || []).map((byte) =>
            parseInt(byte, 16),
          )
          return txb.pure.option('vector<u8>', bytes)
        })()
      : txb.pure.option('vector<u8>', null),
    // 4. party_b: Option<address>
    values.suiPartyBAddress && values.suiPartyBAddress.trim() !== ''
      ? (() => {
          if (values.partyBCrossChain) {
            return txb.pure.option('address', null)
          }
          const isValidAddress = /^0x[a-fA-F0-9]{64}$/.test(
            values.suiPartyBAddress!,
          )
          if (!isValidAddress)
            throw new Error('Invalid Sui address for party_b')
          return txb.pure.option('address', values.suiPartyBAddress)
        })()
      : txb.pure.option('address', null),
    // 5. title: Option<String> (always None for update)
    txb.pure.option('string', null),
    // 6. terms_reference: Option<vector<u8>>
    values.termsReference && values.termsReference.trim() !== ''
      ? (() => {
          const encoded = Array.from(
            new TextEncoder().encode(values.termsReference!),
          )
          return txb.pure.option('vector<u8>', encoded)
        })()
      : txb.pure.option('vector<u8>', null),
    // 7. contract_start_date: Option<u64>
    values.startDate !== undefined && values.startDate !== null
      ? txb.pure.option('u64', Math.floor(values.startDate.getTime() / 1000))
      : txb.pure.option('u64', null),
    // 8. contract_deadline_date: Option<u64>
    values.endDate !== undefined && values.endDate !== null
      ? txb.pure.option('u64', Math.floor(values.endDate.getTime() / 1000))
      : txb.pure.option('u64', null),
    // 9. metadata: Option<vector<u8>>
    values.metadata && values.metadata.trim() !== ''
      ? (() => {
          const encoded = Array.from(new TextEncoder().encode(values.metadata!))
          return txb.pure.option('vector<u8>', encoded)
        })()
      : txb.pure.option('vector<u8>', null),
    // 10. contract_type: Option<u8>
    values.contractType !== undefined && values.contractType !== null
      ? txb.pure.option('u8', values.contractType)
      : txb.pure.option('u8', null),
  ]

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::update_contract`,
    arguments: args,
  })

  return txb
}

export function formatSUI(amount: bigint, digits = 4): string {
  const SUI_DECIMALS = 9
  const divisor = 10n ** BigInt(SUI_DECIMALS)
  const whole = amount / divisor
  const fraction = amount % divisor
  const fractionStr = fraction
    .toString()
    .padStart(SUI_DECIMALS, '0')
    .slice(0, digits)
  return `${whole.toString()}.${fractionStr}`.replace(/\.?0+$/, '')
}

export async function getSuiBalance(
  suiClient: SuiClient,
  address: string,
): Promise<string> {
  try {
    const coinBalance = await suiClient.getBalance({ owner: address })
    return formatSUI(BigInt(coinBalance.totalBalance), 4)
  } catch (error) {
    console.error('Error fetching SUI balance:', error)
    return 'N/A'
  }
}

export async function canFundEscrow(
  suiClient: SuiClient,
  address: string,
  amount: bigint,
  minGasReserve: bigint = 10_000_000n, // 0.01 SUI
): Promise<boolean> {
  try {
    const coins = await suiClient.getCoins({
      owner: address,
      coinType: '0x2::sui::SUI',
    })
    return coins.data.some(
      (c: any) => BigInt(c.balance) > amount + minGasReserve,
    )
  } catch (error) {
    console.error('Error checking if user can fund escrow:', error)
    return false
  }
}

export const buildFundEscrowTx = async (
  contractId: string,
  amount: bigint,
  address: string,
  suiClient: any,
  currentAccount: string,
) => {
  const coins = (
    await suiClient.getCoins({ owner: address, coinType: '0x2::sui::SUI' })
  ).data
  const txb = new Transaction()
  txb.setSender(currentAccount)
  const mainCoin = coins.find((c: any) => BigInt(c.balance) > amount)
  if (!mainCoin) {
    toast.error('No coin with enough SUI balance for payment.')
  }
  const paymentCoin = coinWithBalance({
    balance: amount,
    type: '0x2::sui::SUI',
  })
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::fund_escrow`,
    arguments: [txb.object(contractId), paymentCoin],
  })
  return txb
}

export const buildRefundEscrowTx = async (
  contractId: string,
  escrowId: string,
  currentAccount: string,
) => {
  const txb = new Transaction()
  txb.setSenderIfNotSet(currentAccount)
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::refund_payment`,
    arguments: [txb.object(contractId), txb.object(escrowId)],
  })
  return txb
}

export const buildCreateContractWithMilestonesTx = (
  title: string,
  partyBAddress: string | undefined,
  contractType: number | undefined,
  termsReference: string | undefined,
  startDate: number | undefined,
  endDate: number | undefined,
  metadata: string | undefined,
  milestoneDescriptions: string[],
  milestoneValues: string[],
): Transaction => {
  const txb = new Transaction()

  // --- create_contract ---
  const args = [
    partyBAddress && partyBAddress.trim() !== ''
      ? (() => {
          const isValidAddress = /^0x[a-fA-F0-9]{64}$/.test(partyBAddress)
          if (!isValidAddress) {
            throw new Error(
              `Invalid partyBAddress format: ${partyBAddress}. Must be a 64-character hex string starting with 0x.`,
            )
          }
          try {
            return txb.pure.option('address', partyBAddress)
          } catch (error) {
            throw new Error(
              `Failed to encode party B address: ${partyBAddress}. Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            )
          }
        })()
      : txb.pure.option('address', null),
    txb.pure.string(title),
    contractType !== undefined
      ? txb.pure.option('u8', contractType)
      : txb.pure.option('u8', null),
    termsReference && termsReference.trim() !== ''
      ? (() => {
          const encoded = Array.from(new TextEncoder().encode(termsReference))
          return txb.pure.option('vector<u8>', encoded)
        })()
      : txb.pure.option('vector<u8>', null),
    startDate !== undefined
      ? txb.pure.option('u64', startDate)
      : txb.pure.option('u64', null),
    endDate !== undefined
      ? txb.pure.option('u64', endDate)
      : txb.pure.option('u64', null),
    metadata && metadata.trim() !== ''
      ? (() => {
          const encoded = Array.from(new TextEncoder().encode(metadata))
          return txb.pure.option('vector<u8>', encoded)
        })()
      : txb.pure.option('vector<u8>', null),
  ]
  // Call create_contract
  const contractObj = txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::create_contract`,
    arguments: args,
  })

  // --- add_milestones ---
  if (milestoneDescriptions.length > 0 && milestoneValues.length > 0) {
    // Prepare Move vectors as raw values
    txb.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::add_milestones`,
      arguments: [
        contractObj,
        txb.pure.vector('string', milestoneDescriptions),
        txb.pure.vector(
          'u64',
          milestoneValues.map((val) => BigInt(val)),
        ),
      ],
    })
  }

  return txb
}

export const buildBatchUpsertMilestonesTx = (
  contractId: string,
  milestoneIds: number[],
  descriptionHashes: Uint8Array[],
  values: number[],
): Transaction => {
  const txb = new Transaction()
  // Prepare Move vectors
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::batch_upsert_milestones`,
    arguments: [
      txb.object(contractId),
      txb.pure.vector(
        'u64',
        milestoneIds.map((id) => BigInt(id)),
      ),
      txb.pure.vector(
        'vector<u8>',
        descriptionHashes.map((hash) => Array.from(hash)),
      ),
      txb.pure.vector(
        'u64',
        values.map((v) => BigInt(v)),
      ),
    ],
  })
  return txb
}

export const buildRemoveMilestoneTx = (
  contractId: string,
  milestoneId: number,
): Transaction => {
  const txb = new Transaction()
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::remove_milestone`,
    arguments: [txb.object(contractId), txb.pure.u64(milestoneId)],
  })
  return txb
}

// Cross-chain contract creation
export const buildCreateContractCrossChainTx = (
  chainId: number,
  partyBAddressBytes: number[],
  title: string,
  contractType?: number,
  termsReference?: string,
  startDate?: number,
  endDate?: number,
  metadata?: string,
): Transaction => {
  const txb = new Transaction()
  if (!title) throw new Error('Title is required')
  if (
    !partyBAddressBytes ||
    !Array.isArray(partyBAddressBytes) ||
    partyBAddressBytes.length === 0
  ) {
    throw new Error('Party B address bytes required for cross-chain contract')
  }
  const args = [
    txb.pure.u16(chainId),
    txb.pure.vector('u8', partyBAddressBytes),
    txb.pure.string(title),
    contractType !== undefined
      ? txb.pure.option('u8', contractType)
      : txb.pure.option('u8', null),
    termsReference && termsReference.trim() !== ''
      ? (() => {
          const encoded = Array.from(new TextEncoder().encode(termsReference))
          return txb.pure.option('vector<u8>', encoded)
        })()
      : txb.pure.option('vector<u8>', null),
    startDate !== undefined
      ? txb.pure.option('u64', startDate)
      : txb.pure.option('u64', null),
    endDate !== undefined
      ? txb.pure.option('u64', endDate)
      : txb.pure.option('u64', null),
    metadata && metadata.trim() !== ''
      ? (() => {
          const encoded = Array.from(new TextEncoder().encode(metadata))
          return txb.pure.option('vector<u8>', encoded)
        })()
      : txb.pure.option('vector<u8>', null),
  ]
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::create_contract_cross_chain`,
    arguments: args,
  })
  return txb
}

export const buildSubmitProofTx = (
  contractId: string,
  milestoneId: number,
  proofReference: string,
): Transaction => {
  const txb = new Transaction()
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::submit_proof`,
    arguments: [
      txb.object(contractId),
      txb.pure.u64(milestoneId),
      txb.pure.vector(
        'u8',
        Array.from(new TextEncoder().encode(proofReference)),
      ),
    ],
  })
  return txb
}

export async function buildApproveMilestoneTx(
  contractId: string,
  escrowId: string,
  milestoneId: number,
  suiClient: SuiClient,
): Promise<Transaction> {
  const paymentRecordId = await findMilestonePaymentRecordId(
    contractId,
    escrowId,
    suiClient,
  )
  const txb = new Transaction()
  let paymentRecordArg
  if (!paymentRecordId) {
    const [paymentRecordResult] = txb.moveCall({
      target: `${PACKAGE_ID}::pactda_milestone::create_payment_record`,
      arguments: [txb.object(contractId), txb.object(escrowId)],
    })
    paymentRecordArg = paymentRecordResult
  } else {
    paymentRecordArg = txb.object(paymentRecordId)
  }
  txb.moveCall({
    target: `${PACKAGE_ID}::pactda_milestone::release_milestone_payment_with_tracking`,
    arguments: [
      txb.object(contractId),
      txb.object(escrowId),
      txb.pure.u64(milestoneId),
      paymentRecordArg,
    ],
  })
  return txb
}

export async function findMilestonePaymentRecordId(
  contractId: string,
  payerAddress: string,
  suiClient: SuiClient,
): Promise<string | undefined> {
  const typeFilter = `${PACKAGE_ID}::pactda_milestone::MilestonePaymentRecord`
  const objects = await suiClient.getOwnedObjects({
    owner: payerAddress,
    options: { showType: true, showContent: true },
    filter: { StructType: typeFilter },
  })
  for (const obj of objects.data) {
    const content = obj.data?.content as any
    if (content?.fields?.contract_id === contractId) {
      return obj.data?.objectId
    }
  }
  return undefined
}

export async function buildCreateMilestonePaymentRecordTx(
  contractId: string,
  escrowId: string,
): Promise<Transaction> {
  const txb = new Transaction()
  txb.moveCall({
    target: `${PACKAGE_ID}::pactda_milestone::create_payment_record`,
    arguments: [txb.object(contractId), txb.object(escrowId)],
  })
  return txb
}

export async function buildReleaseMilestonePaymentTx(
  contractId: string,
  escrowId: string,
  milestoneId: number,
  paymentRecordId: string,
): Promise<Transaction> {
  console.log('data', contractId, escrowId, milestoneId, paymentRecordId)
  const txb = new Transaction()
  txb.moveCall({
    target: `${PACKAGE_ID}::pactda::release_payment`,
    arguments: [
      txb.object(contractId),
      txb.object(escrowId),
    ],
  })
  return txb
}

export async function hasMilestonePaymentRecord(
  contractId: string,
  payerAddress: string,
  suiClient: SuiClient,
): Promise<string | undefined> {
  return findMilestonePaymentRecordId(contractId, payerAddress, suiClient)
}

// Cross-chain detection and interaction utilities
export const isCrossChainContract = (contract: PactDaContract): boolean => {
  return !!(contract.cross_chain_parties && 
            Array.isArray(contract.cross_chain_parties) && 
            contract.cross_chain_parties.length > 0)
}

export const getCrossChainParties = (contract: PactDaContract): any[] => {
  if (!isCrossChainContract(contract)) return []
  return contract.cross_chain_parties as any[]
}

export const hasCrossChainPartyB = (contract: PactDaContract): boolean => {
  const parties = getCrossChainParties(contract)
  return parties.some((party: any) => {
    const role = party.fields ? party.fields.role : party.role
    return role === 1 // PARTY_ROLE_B = 1
  })
}

export const getCrossChainInfo = (contract: PactDaContract) => {
  const parties = getCrossChainParties(contract)
  const partyBInfo = parties.find((party: any) => {
    const role = party.fields ? party.fields.role : party.role
    return role === 1 // PARTY_ROLE_B
  })
  
  if (!partyBInfo) return null
  
  return {
    chainId: partyBInfo.fields ? partyBInfo.fields.chain_id : partyBInfo.chain_id,
    partyAddress: partyBInfo.fields ? partyBInfo.fields.party_address : partyBInfo.party_address,
    role: partyBInfo.fields ? partyBInfo.fields.role : partyBInfo.role
  }
}

// Cross-chain submission functionality
export interface CrossChainSubmissionOptions {
  contract: PactDaContract
  bridgeConfig?: any
  targetChain?: number
  wormholeCore?: string
}

export const buildCrossChainSubmitContractTx = async (
  options: CrossChainSubmissionOptions
): Promise<Transaction> => {
  const { contract } = options
  const txb = new Transaction()
  
  const crossChainInfo = getCrossChainInfo(contract)
  
  if (crossChainInfo && crossChainInfo.chainId !== 21) { 
    
    txb.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::submit_contract`,
      arguments: [txb.object(contract.objectId)],
    })
    
    
  } else {
    txb.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::submit_contract`,
      arguments: [txb.object(contract.objectId)],
    })
  }
  return txb
}

// Create Solana stub independently (separate from contract submission)
export const createSolanaStub = async (contract: PactDaContract) => {
  const crossChainInfo = getCrossChainInfo(contract)
  
  if (!crossChainInfo || crossChainInfo.chainId !== 1) { // 1 = Solana
    throw new Error('Contract is not a Solana cross-chain contract')
  }
  
  try {
    // Use empty string as userPublicKeyStr since this is a sponsor-only transaction
    const result = await solanaService.createSponsoredStub('', contract)
    console.log('Solana stub created:', result)
    return result
  } catch (error) {
    console.error('Failed to create Solana stub:', error)
    throw new Error(`Failed to create Solana stub: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const submitContractWithCrossChainSupport = async (
  contract: PactDaContract,
  signAndExecuteTransaction: any,
  suiClient: any,
  currentAccount: any,
  onSuccess: () => Promise<void>
) => {
  const isCC = isCrossChainContract(contract)
  const crossChainInfo = getCrossChainInfo(contract)

  let txb: Transaction
  
  if (isCC && crossChainInfo) {
    txb = await buildCrossChainSubmitContractTx({ contract })
    console.log('Submitting cross-chain contract:', {
      contractId: contract.objectId,
      chainId: crossChainInfo.chainId,
      partyAddress: crossChainInfo.partyAddress
    })

    const solanaChainId = parseInt(import.meta.env.VITE_CHAIN_ID_SOLANA || '1')
    if (crossChainInfo.chainId === solanaChainId && currentAccount?.address) {
      try {
        console.log('Creating Solana stub for cross-chain contract...')
        
        if (!solanaService.isSponsorAvailable()) {
          solanaService.initializeSponsor()
        }

        if (solanaService.isSponsorAvailable()) {
          const balanceInfo = await solanaService.checkSponsorBalance()
          if (!balanceInfo.isBalanceSufficient) {
            console.warn(`Insufficient sponsor balance: ${balanceInfo.balanceInSol} SOL (minimum 0.05 SOL required)`)
            toast.warning('Solana stub creation may fail due to insufficient sponsor balance')
          }

          const solanaResult = await solanaService.createSponsoredStub(
            currentAccount.address,
            contract
          )

          console.log('Solana stub created:', {
            signature: solanaResult.signature,
            stubId: solanaResult.solanaStubId
          })

          toast.success(`Solana stub created! Stub ID: ${solanaResult.solanaStubId}`, {
            action: {
              label: 'View on Explorer',
              onClick: () => window.open(`https://explorer.solana.com/tx/${solanaResult.signature}?cluster=testnet`, '_blank')
            }
          })
        } else {
          console.warn('Solana sponsor not available, skipping stub creation')
          toast.warning('Solana stub creation skipped - sponsor not configured')
        }
      } catch (solanaError) {
        console.error('Failed to create Solana stub:', solanaError)
        toast.error(`Failed to create Solana stub: ${solanaError instanceof Error ? solanaError.message : 'Unknown error'}`)
        // Don't fail the entire transaction for Solana stub creation failure
      }
    }
  } else {
    txb = buildSubmitContractTx(contract.objectId)
    console.log('Submitting local contract:', contract.objectId)
  }
  
  const result = await signAndExecuteTransaction({ transaction: txb })
  
  if (!result.digest) {
    throw new Error('Transaction succeeded but no digest was returned')
  }
  
  // Wait for transaction confirmation
  await suiClient.waitForTransaction({ 
    digest: result.digest, 
    options: { showEffects: true } 
  })
  
  await onSuccess()
  
  return result
}
