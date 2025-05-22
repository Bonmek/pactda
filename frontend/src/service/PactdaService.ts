import { ContractDetails, PactDaContract } from '@/@types/pactDa';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;
const MODULE_NAME = import.meta.env.VITE_MODULE_NAME;

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
  });

  if (!response.data || response.data.content?.dataType !== 'moveObject') {
    return null;
  }

  const fields = response.data.content.fields;

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
  };


  return contract;
};

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

  const args = [
    partyBAddress && partyBAddress.trim() !== ''
      ? (() => {
          const isValidAddress = /^0x[a-fA-F0-9]{64}$/.test(partyBAddress);
          if (!isValidAddress) {
            throw new Error(
              `Invalid partyBAddress format: ${partyBAddress}. Must be a 64-character hex string starting with 0x.`,
            );
          }
          try {
            return txb.pure.option('address', partyBAddress);
          } catch (error) {
            console.error('Error encoding partyBAddress:', error);
            throw new Error(
              `Failed to encode party B address: ${partyBAddress}. Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        })()
      : (() => {
          return txb.pure.option('address', null);
        })(),

    // Second arg: title: String
    txb.pure.string(title),

    // Third arg: contract_type: Option<u8>
    contractType !== undefined
      ? (() => {
          return txb.pure.option('u8', contractType);
        })()
      : txb.pure.option('u8', null),

    // Fourth arg: terms_reference: Option<vector<u8>>
    termsReference && termsReference.trim() !== ''
      ? (() => {
          const encoded = Array.from(new TextEncoder().encode(termsReference));
          return txb.pure.option('vector<u8>', encoded);
        })()
      : txb.pure.option('vector<u8>', null),

    // Fifth arg: contract_start_date: Option<u64>
    startDate !== undefined
      ? (() => {
          return txb.pure.option('u64', startDate);
        })()
      : txb.pure.option('u64', null),

    // Sixth arg: contract_deadline_date: Option<u64>
    endDate !== undefined
      ? (() => {
          return txb.pure.option('u64', endDate);
        })()
      : txb.pure.option('u64', null),

    // Seventh arg: metadata: Option<vector<u8>>
    metadata && metadata.trim() !== ''
      ? (() => {
          const encoded = Array.from(new TextEncoder().encode(metadata));
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
  const txb = new Transaction();
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::sign_contract_party_a`,
    arguments: [txb.object(contractId)],
  });

  return txb;
};

export const buildSignContractAsPartyBTx = (contractId: string) => {
  const txb = new Transaction();
  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::sign_contract_party_b`,
    arguments: [txb.object(contractId)],
  });

  return txb;
};

export const buildSubmitContractTx = (contractId: string): Transaction => {
  const txb = new Transaction();

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::submit_contract`,
    arguments: [txb.object(contractId)],
  });

  return txb;
};

export const buildApproveContractTx = (contractId: string): Transaction => {
  const txb = new Transaction();

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::approve_contract`,
    arguments: [txb.object(contractId)],
  });

  return txb;
};

export const buildCreateMilestoneTx = (
  contractId: string,
  amount: bigint | number,
  description: string,
): Transaction => {
  const txb = new Transaction();
  const encoded = new TextEncoder().encode(description);

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::create_milestone`,
    arguments: [
      txb.object(contractId),
      txb.pure.u64(amount),
      txb.pure.vector('u8', Array.from(encoded)),
    ]
  });

  return txb;
};

export const buildCompleteMilestoneTx = (
  contractId: string,
  milestoneId: bigint | number,
): Transaction => {
  const txb = new Transaction();

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::complete_milestone`,
    arguments: [txb.object(contractId), txb.pure.u64(milestoneId)],
  });

  return txb;
};

export const buildReleasePaymentTx = (
  contractId: string,
  milestoneId: bigint | number,
): Transaction => {
  const txb = new Transaction();

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::release_payment`,
    arguments: [txb.object(contractId), txb.pure.u64(milestoneId)],
  });

  return txb;
};

export const buildCancelContractTx = (contractId: string): Transaction => {
  const txb = new Transaction();

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::cancel_contract`,
    arguments: [txb.object(contractId)],
  });

  return txb;
};

export const buildUpdateContractTx = (
  contractId: string,
  values: {
    chainId?: number; // Option<u16> for cross-chain, usually undefined for Sui-only
    partyBCrossChain?: string; // Option<vector<u8>> (hex string or undefined)
    suiPartyBAddress?: string; // Option<address>
    contractType?: number; // Option<u8>
    termsReference?: string; // Option<vector<u8>>
    metadata?: string; // Option<vector<u8>>
    startDate?: Date; // Option<u64>
    endDate?: Date; // Option<u64>
  },
): Transaction => {
  const txb = new Transaction();


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
          // Accepts a hex string (with or without 0x)
          let hex = values.partyBCrossChain.trim();
          if (hex.startsWith('0x')) hex = hex.slice(2);
          const bytes = Array.from(Buffer.from(hex, 'hex'));
          return txb.pure.option('vector<u8>', bytes);
        })()
      : txb.pure.option('vector<u8>', null),
    // 4. party_b: Option<address>
    values.suiPartyBAddress && values.suiPartyBAddress.trim() !== ''
      ? (() => {
          const isValidAddress = /^0x[a-fA-F0-9]{64}$/.test(
            values.suiPartyBAddress!,
          );
          if (!isValidAddress)
            throw new Error('Invalid Sui address for party_b');
          return txb.pure.option('address', values.suiPartyBAddress);
        })()
      : txb.pure.option('address', null),
    // 5. title: Option<String> (always None for update)
    txb.pure.option('string', null),
    // 6. terms_reference: Option<vector<u8>>
    values.termsReference && values.termsReference.trim() !== ''
      ? (() => {
          const encoded = Array.from(
            new TextEncoder().encode(values.termsReference!),
          );
          return txb.pure.option('vector<u8>', encoded);
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
          const encoded = Array.from(new TextEncoder().encode(values.metadata!));
          return txb.pure.option('vector<u8>', encoded);
        })()
      : txb.pure.option('vector<u8>', null),
    // 10. contract_type: Option<u8>
    values.contractType !== undefined && values.contractType !== null
      ? txb.pure.option('u8', values.contractType)
      : txb.pure.option('u8', null),
  ];

  txb.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::update_contract`,
    arguments: args,
  });

  return txb;
};

/**
 * Format a SUI balance from its base unit (mist) to SUI string with up to 4 decimals.
 */
function formatSUI(amount: bigint, digits = 4): string {
  const SUI_DECIMALS = 9;
  const divisor = 10n ** BigInt(SUI_DECIMALS);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(SUI_DECIMALS, '0').slice(0, digits);
  return `${whole.toString()}.${fractionStr}`.replace(/\.?0+$/, '');
}

/**
 * Fetch and format the SUI balance for a given address.
 * @param suiClient SuiClient instance
 * @param address Wallet address
 * @returns Formatted SUI balance as a string (e.g., '1.2345')
 */
export async function getSuiBalance(suiClient: SuiClient, address: string): Promise<string> {
  try {
    const coinBalance = await suiClient.getBalance({ owner: address });
    return formatSUI(BigInt(coinBalance.totalBalance), 4);
  } catch (error) {
    console.error('Error fetching SUI balance:', error);
    return 'N/A';
  }
}

export async function estimateTransactionCost(
  suiClient: SuiClient,
  transactionBlock: Transaction,
  userAddress: string, // Added userAddress parameter
): Promise<{
  gasEstimation: string;
  hasSufficientBalance: boolean;
  userBalance: string;
  rawTotalCost: bigint;
} | null> {
  try {
    // 1. Perform a dryRunTransactionBlock
    const dryRunResponse = await suiClient.dryRunTransactionBlock({
      transactionBlock: transactionBlock,
    });

    if (dryRunResponse.effects.status.status !== 'success') {
      console.error('Dry run failed:', dryRunResponse.effects.status.error);
      throw new Error(`Dry run failed: ${dryRunResponse.effects.status.error}`);
    }

    // 2. Extract gas computation cost and storage cost
    const computationCost = BigInt(dryRunResponse.effects.gasUsed.computationCost);
    const storageCost = BigInt(dryRunResponse.effects.gasUsed.storageCost);
    const storageRebate = BigInt(dryRunResponse.effects.gasUsed.storageRebate);

    // Sum these to get an estimated total gas cost in MIST
    // Total Gas Cost = Computation Cost + Storage Cost - Storage Rebate
    const estimatedTotalGasCostMist = computationCost + storageCost - storageRebate;

    // 3. Fetch the current user's balance
    const balanceResponse = await suiClient.getBalance({ owner: userAddress });
    const userBalanceMist = BigInt(balanceResponse.totalBalance);

    // 4. Compare the user's balance with the estimated gas cost
    const hasSufficientBalance = userBalanceMist >= estimatedTotalGasCostMist;

    // 5. Format for return
    const gasEstimationFormatted = formatSUI(estimatedTotalGasCostMist);
    const userBalanceFormatted = formatSUI(userBalanceMist);

    return {
      gasEstimation: gasEstimationFormatted,
      hasSufficientBalance,
      userBalance: userBalanceFormatted,
      rawTotalCost: estimatedTotalGasCostMist, // Return raw cost for potential further use
    };
  } catch (error) {
    console.error('Error estimating transaction cost:', error);
    // Propagate error or return null based on desired error handling strategy
    // For now, returning null to indicate failure in estimation
    return null;
  }
}
