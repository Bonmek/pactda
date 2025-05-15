export interface Party {
    address: string;
    displayName: string;
}

export interface PartyDetail {
    role: string;
    address: string;
    status: string;
}

export interface Milestone {
    id: number;
    title: string;
    value: string;
    deadline: string;
    status: string;
    proof: string;
}

export interface Escrow {
    status: string;
    totalValue: string;
    fundedBy: string;
}

export interface AgreementData {
    id: string;
    title: string;
    status: 'active' | 'pending' | 'draft' | 'completed' | 'cancelled' | string;
    type: string;
    deadline: string;
    otherParty: Party;
    yourRole: string;
    value: string;
    action: string;
    cancellationReason?: string;
    parties?: PartyDetail[];
    milestones?: Milestone[];
    escrow?: Escrow;
    activity?: { date: string; description: string }[];
}