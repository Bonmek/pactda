import React from 'react';
import { ContractStatus } from '@/types/pactDa';
import { getContractStatusLabel, getContractStatusStyle } from '@/lib/utils';

type ContractStatusBadgeProps = {
  status: ContractStatus;
};

const ContractStatusBadge: React.FC<ContractStatusBadgeProps> = ({
  status,
}) => {
  const label = getContractStatusLabel(status);
  const style = getContractStatusStyle(status);

  return (
    <span className={`px-4 py-1 text-sm font-semibold rounded-full ${style}`}>
      {label}
    </span>
  );
};

export default ContractStatusBadge;
