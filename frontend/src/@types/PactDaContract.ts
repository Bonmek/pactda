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
}