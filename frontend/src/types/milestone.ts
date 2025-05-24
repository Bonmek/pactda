// Milestone types for both frontend and on-chain usage

export type Milestone = {
  id: number;
  description_hash: string;
  value: number;
  isOnChain?: boolean;
  onChainId?: number; // Preserve original on-chain ID for update/removal logic
};

export type OnChainMilestone = {
  fields: {
    id: number;
    description_hash: string | number[];
    value: number | string;
    status: number | string;
    proof_reference?: string | number[];
  };
};
