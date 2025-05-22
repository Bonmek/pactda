export type SuiAddress = string; 
export type ContractId = string;

export interface MilestoneInput {
  description: string;
  amount: number; // Or string if dealing with large numbers, to be converted
  dueDate?: number; // Timestamp or similar representation
}

export interface Milestone extends MilestoneInput {
  id: string;
  description_hash: string;
  status: MilestoneStatus;
}

export enum MilestoneStatus {
  Pending = 'Pending', // 0
  Submitted = 'Submitted', // 1
  Approved = 'Approved', // 2
}

export interface ContractInput {
  title: string;
  description: string;
  contractorAddress: SuiAddress;
  currency: string; // e.g., 'SUI', 'USDC'
  totalAmount: number; // Or string
  initialMilestones?: MilestoneInput[];
}

export interface ContractDetails extends ContractInput {
  id: ContractId;
  clientAddress: SuiAddress;
  status: ContractStatus;
  creationDate: number; // Timestamp
  milestones: Milestone[];
  escrowId?: string;
  partyA: string;
  partyASigned: boolean;
  partyB: string;
  partyBSigned: boolean;
  termsReference: string;
  title: string;
  contractType: number;
  contractStartDate: number;
  contractDeadlineDate: number;
  metadata: string;
}

export enum ContractStatus {
  Draft = "Draft", // 0
  Pending = "Pending", // 1
  Active = "Active", // 2
  Dispute = "Dispute", // 3
  Completed = "Completed", // 4
  Cancelled = "Cancelled", // 5
}

// Summary for listing contracts
export interface ContractSummary {
  id: ContractId;
  title:string;
  partyA: SuiAddress;
  partyB: SuiAddress;
  totalAmount: number;
  status: ContractStatus;
  createdAt: number;
}

export interface CreateFullContractInput {
  contractDetails: ContractInput;
  milestones: MilestoneInput[];
  // partyASignature would be handled by the wallet interaction,
  // this input is for the data needed to initiate the process.
}

export interface Escrow {
  balance: number;
  status: number;
}
