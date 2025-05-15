export interface Party {
    address: string;
    displayName: string;
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
}