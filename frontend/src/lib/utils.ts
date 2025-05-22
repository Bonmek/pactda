import { ContractStatus, MilestoneStatus } from '@/types/pactDa';

export function getContractStatusLabel(status: ContractStatus): string {
  switch (status) {
    case ContractStatus.Draft:
      return 'Draft';
    case ContractStatus.Pending:
      return 'Pending Signature';
    case ContractStatus.Active:
      return 'Active';
    case ContractStatus.Dispute:
      return 'Dispute';
    case ContractStatus.Completed:
      return 'Completed';
    case ContractStatus.Cancelled:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

export function getMilestoneStatusLabel(status: MilestoneStatus): string {
  switch (status) {
    case MilestoneStatus.Pending:
      return 'Pending';
    case MilestoneStatus.Submitted:
      return 'Submitted for Approval';
    case MilestoneStatus.Approved:
      return 'Approved & Funded';
    default:
      return 'Unknown';
  }
}

export function getContractStatusStyle(status: ContractStatus): string {
  switch (status) {
    case ContractStatus.Draft:
      return 'bg-yellow-500 text-yellow-900';
    case ContractStatus.Pending:
      return 'bg-blue-500 text-blue-100';
    case ContractStatus.Active:
      return 'bg-green-500 text-green-100';
    case ContractStatus.Dispute:
      return 'bg-red-500 text-red-100';
    case ContractStatus.Completed:
      return 'bg-purple-500 text-purple-100';
    case ContractStatus.Cancelled:
      return 'bg-gray-500 text-gray-100';
    default:
      return 'bg-gray-200 text-gray-800'; // Default style for unknown status
  }
}

export function getMilestoneStatusStyle(status: MilestoneStatus): string {
  switch (status) {
    case MilestoneStatus.Pending:
      return 'bg-gray-400 text-gray-800';
    case MilestoneStatus.Submitted:
      return 'bg-yellow-400 text-yellow-800';
    case MilestoneStatus.Approved:
      return 'bg-green-400 text-green-800';
    default:
      return 'bg-gray-200 text-gray-800'; // Default style for unknown status
  }
}
