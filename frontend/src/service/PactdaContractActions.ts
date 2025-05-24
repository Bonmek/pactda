// This file re-exports contract action logic for maintainability
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { toast } from 'sonner';
import { getContracts, buildSignContractAsPartyATx, buildSignContractAsPartyBTx, buildSubmitContractTx, buildFundEscrowTx, buildRefundEscrowTx, buildCreateContractWithMilestonesTx, buildCreateContractTx, buildUpdateContractTx, submitContractWithCrossChainSupport } from './PactdaService';
import type { PactDaContract } from '@/@types/PactDaContract';

export const getContractDetail = async (suiClient: any, contractId: string): Promise<PactDaContract | null> => {
  return await getContracts(suiClient, contractId);
};

export const signContract = async (
  contract: PactDaContract,
  address: string,
  signAndExecuteTransaction: any,
  suiClient: any,
  onSuccess: () => Promise<void>
) => {
  const { objectId, partyA, partyB } = contract;
  const isPartyA = address === partyA;
  const isPartyB = address === partyB;
  let txb;
  if (isPartyA) {
    txb = await buildSignContractAsPartyATx(objectId);
  } else if (isPartyB) {
    txb = await buildSignContractAsPartyBTx(objectId);
  } else {
    toast.error('You are not a party to this contract.');
    return;
  }
  const result = await signAndExecuteTransaction({ transaction: txb });
  if (!result.digest ) {
    toast.error('Transaction failed or was not successful');
    return;
  }
  toast.promise(
    suiClient.waitForTransaction({ digest: result.digest, options: { showEffects: true } }),
    {
      loading: 'Processing signature...',
      success: async () => {
        await onSuccess();
        return 'Contract signed successfully!';
      },
      error: 'Error processing signature.',
    }
  );
};

export const submitContract = async (
  contract: PactDaContract,
  signAndExecuteTransaction: any,
  suiClient: any,
  currentAccount: any,
  onSuccess: () => Promise<void>
) => {
  try {
    toast.promise(
      submitContractWithCrossChainSupport(
        contract, 
        signAndExecuteTransaction, 
        suiClient, 
        currentAccount,
        onSuccess
      ),
      {
        loading: 'Submitting contract...',
        success: 'Contract submitted successfully!',
        error: 'Error submitting contract.',
      }
    );
  } catch (error) {
    console.error('Error in submitContract:', error);
    toast.error(`Error submitting contract: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const fundEscrow = async (
  contract: PactDaContract,
  address: string,
  amountStr: string,
  walletBalance: bigint,
  signAndExecuteTransaction: any,
  suiClient: any,
  onSuccess: () => Promise<void>,
  setShowFundModal: (open: boolean) => void
) => {
  let amount: bigint;
  try {
    amount = BigInt(Math.floor(Number(amountStr) * 1e9));
  } catch {
    toast.error('Invalid amount');
    return;
  }
  if (amount <= 0n || amount > walletBalance) {
    toast.error('Invalid amount');
    return;
  }
  // Build the transaction using the service
  const txb = await buildFundEscrowTx(contract.objectId, amount, address, suiClient, contract.partyA);
  const result = await signAndExecuteTransaction({ transaction: txb });
  if (!result.digest) throw new Error('No digest');
  toast.promise(
    suiClient.waitForTransaction({ digest: result.digest, options: { showEffects: true } }),
    {
      loading: 'Funding escrow...',
      success: async () => {
        await onSuccess();
        setShowFundModal(false);
        return 'Escrow funded!';
      },
      error: 'Error funding escrow.',
    }
  );
};

export const refundEscrow = async (
  contract: PactDaContract,
  escrowId: string,
  address: string,
  signAndExecuteTransaction: any,
  suiClient: any,
  onSuccess: () => Promise<void>,
  setShowRefundModal: (open: boolean) => void
) => {
  // Build the transaction using the service
  const txb = await buildRefundEscrowTx(contract.objectId, escrowId, address);
  const result = await signAndExecuteTransaction({ transaction: txb });
  if (!result.digest) throw new Error('No digest');
  toast.promise(
    suiClient.waitForTransaction({ digest: result.digest, options: { showEffects: true } }),
    {
      loading: 'Refunding escrow...',
      success: async () => {
        await onSuccess();
        setShowRefundModal(false);
        return 'Escrow refunded!';
      },
      error: 'Error refunding escrow.',
    }
  );
};

// Utility: compare two milestone arrays (id, description, value)
export function milestonesChanged(oldMilestones: any[], newMilestones: any[]): boolean {
  if (oldMilestones.length !== newMilestones.length) return true;
  for (let i = 0; i < oldMilestones.length; i++) {
    const a = oldMilestones[i];
    const b = newMilestones[i];
    if (a.description !== b.description || String(a.value) !== String(b.value)) return true;
  }
  return false;
}

// Create or update contract with/without milestones atomically
export const createOrUpdateContractWithMilestones = async (
  isCreate: boolean,
  contractData: {
    title: string,
    partyBAddress?: string,
    contractType?: number,
    termsReference?: string,
    startDate?: number,
    endDate?: number,
    metadata?: string,
    contractId?: string // for update
  },
  milestones: { description: string, value: string }[],
  oldMilestones: { description: string, value: string }[] | undefined,
  signAndExecuteTransaction: any,
  suiClient: any,
  onSuccess: () => Promise<void>
) => {
  let txb;
  if (isCreate) {
    if (milestones.length > 0) {
      txb = buildCreateContractWithMilestonesTx(
        contractData.title,
        contractData.partyBAddress,
        contractData.contractType,
        contractData.termsReference,
        contractData.startDate,
        contractData.endDate,
        contractData.metadata,
        milestones.map(m => m.description),
        milestones.map(m => m.value)
      );
    } else {
      // Contract only
      txb = buildCreateContractTx(
        contractData.title,
        contractData.partyBAddress,
        contractData.contractType,
        contractData.termsReference,
        contractData.startDate,
        contractData.endDate,
        contractData.metadata
      );
    }
  } else {
    // Update
    if (oldMilestones && milestonesChanged(oldMilestones, milestones)) {
      txb = buildUpdateContractTx(contractData.contractId!, {
        contractType: contractData.contractType,
        termsReference: contractData.termsReference,
        metadata: contractData.metadata,
        startDate: contractData.startDate ? new Date(contractData.startDate * 1000) : undefined,
        endDate: contractData.endDate ? new Date(contractData.endDate * 1000) : undefined,
        suiPartyBAddress: contractData.partyBAddress,
      });
      // TODO: Add update_milestones tx if Move supports it
    } else {
      txb = buildUpdateContractTx(contractData.contractId!, {
        contractType: contractData.contractType,
        termsReference: contractData.termsReference,
        metadata: contractData.metadata,
        startDate: contractData.startDate ? new Date(contractData.startDate * 1000) : undefined,
        endDate: contractData.endDate ? new Date(contractData.endDate * 1000) : undefined,
        suiPartyBAddress: contractData.partyBAddress,
      });
    }
  }
  const result = await signAndExecuteTransaction({ transaction: txb });
  if (!result.digest) {
    toast.error('Transaction failed or was not successful');
    return;
  }
  toast.promise(
    suiClient.waitForTransaction({ digest: result.digest, options: { showEffects: true } }),
    {
      loading: isCreate ? 'Creating contract...' : 'Updating contract...',
      success: async () => {
        await onSuccess();
        return isCreate ? 'Contract created successfully!' : 'Contract updated successfully!';
      },
      error: isCreate ? 'Error creating contract.' : 'Error updating contract.',
    }
  );
};
