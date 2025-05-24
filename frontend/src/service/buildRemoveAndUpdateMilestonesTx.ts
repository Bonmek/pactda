import { Transaction } from '@mysten/sui/transactions';
import { buildRemoveMilestoneTx, buildBatchUpsertMilestonesTx } from './PactdaService';

export const buildRemoveAndUpdateMilestonesTx = async (
  contractId: string,
  removedMilestoneIds: number[],
  milestoneIds: number[],
  descriptionHashes: Uint8Array[],
  values: number[]
): Promise<Transaction> => {
  const txb = new Transaction();
  // Add remove calls for each milestone to be removed
  for (const id of removedMilestoneIds) {
    txb.moveCall({
      target: `${import.meta.env.VITE_PACKAGE_ID}::${import.meta.env.VITE_MODULE_NAME}::remove_milestone`,
      arguments: [txb.object(contractId), txb.pure.u64(id)],
    });
  }
  // Add batch upsert for updates/creations
  if (milestoneIds.length > 0) {
    txb.moveCall({
      target: `${import.meta.env.VITE_PACKAGE_ID}::${import.meta.env.VITE_MODULE_NAME}::batch_upsert_milestones`,
      arguments: [
        txb.object(contractId),
        txb.pure.vector('u64', milestoneIds.map((id) => BigInt(id))),
        txb.pure.vector('vector<u8>', descriptionHashes.map((hash) => Array.from(hash))),
        txb.pure.vector('u64', values.map((v) => BigInt(v))),
      ],
    });
  }
  return txb;
};
