import { useCurrentAccount } from '@mysten/dapp-kit';
import { PactDaContract } from '@/@types/PactDaContract'; // Adjust path as necessary

export enum ContractUserRole {
  PARTY_A = 'partyA',
  PARTY_B = 'partyB',
  ARBITER = 'arbiter', // Placeholder for future arbiter logic
  OBSERVER = 'observer', // User is not Party A, Party B, or Arbiter
  UNKNOWN = 'unknown', // Contract or user is null/undefined
}

/**
 * Determines the role of the current user in relation to a given PactDaContract.
 * @param contract The PactDaContract object. If null, role will be UNKNOWN.
 * @returns The role of the current user (ContractUserRole).
 */
export function useContractRole(contract: PactDaContract | null): ContractUserRole {
  const currentAccount = useCurrentAccount();

  if (!contract || !currentAccount || !currentAccount.address) {
    return ContractUserRole.UNKNOWN;
  }

  const userAddress = currentAccount.address;

  if (contract.partyA === userAddress) {
    return ContractUserRole.PARTY_A;
  }

  if (contract.partyB === userAddress) {
    return ContractUserRole.PARTY_B;
  }

  // Placeholder for arbiter logic - assuming 'arbiterAddress' might be a field
  // if (contract.arbiterAddress && contract.arbiterAddress === userAddress) {
  //   return ContractUserRole.ARBITER;
  // }

  // If the user is not Party A, Party B, (or Arbiter in the future), they are an Observer
  return ContractUserRole.OBSERVER;
}
