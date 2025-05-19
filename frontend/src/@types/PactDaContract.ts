export type PactDaContract = {
  objectId: string
  version: string
  digest: string
  escrowId: string | null
  milestones: any 
  partyA: string
  partyASigned: boolean
  partyB: string
  partyBSigned: boolean
  status: number
  termsReference: string 
  title: string
  contractStartDate: number | null
  contractDeadlineDate: number | null
  contractType: number | null
  metadata: string | null
}