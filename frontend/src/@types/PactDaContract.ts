import { Milestone, OnChainMilestone } from "@/types/milestone"

export type PactDaContract = {
  objectId: string
  version: string
  digest: string
  escrowId: string | null
  milestones: Milestone[] | OnChainMilestone[]
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
  cross_chain_parties: any
}
