import { motion } from 'framer-motion'
import {
  buildSignContractAsPartyATx,
  buildSubmitContractTx,
  getContracts,
} from '@/service/PactdaService'
import { useEffect, useState } from 'react'
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit'
import { PactDaContract } from '@/@types/PactDaContract'
import { useNavigate, useParams } from 'react-router-dom'
import { Milestone } from '@/features/wormhole/types'
import { Card, CardContent } from '@/components/ui/card'
import PartiesCard from '@/components/ContractDetail/PartiesCard'
import KeyTermsCard from '@/components/ContractDetail/KeyTermsCard'
import MetadataCard from '@/components/ContractDetail/MetadataCard'
import EscrowCard from '@/components/ContractDetail/EscrowCard'
import MilestonesCard from '@/components/ContractDetail/MilestonesCard'
import ActionsCard from '@/components/ContractDetail/ActionsCard'
import ActivityTimelineCard from '@/components/ContractDetail/ActivityTimelineCard'
import { toast } from 'sonner'
import ContractStatusBadge, {
  StatusKey,
} from '@/components/ContractDetail/ContractStatusBadge'

const agreementTypes = [
  { key: 'General', value: 0 },
  { key: 'Art', value: 1 },
  { key: 'Programming', value: 2 },
  { key: 'Audit', value: 3 },
  { key: 'Service', value: 4 },
]

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [contract, setContract] = useState<PactDaContract | null>(null)
  const suiClient = useSuiClient()
  const suiAccount = useCurrentAccount()
  const address = suiAccount?.address
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction()

  useEffect(() => {
    fetchContract()
  }, [id])

  const fetchContract = async () => {
    const res = await getContracts(suiClient, id!)
    setContract(res)
  }

  const formatDate = (timestamp?: number): string | undefined => {
    if (!timestamp) return undefined
    const date = new Date(timestamp * 1000)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }).format(date)
  }

  const getAgreementType = (value: number): string => {
    const agreement = agreementTypes.find((type) => type.value === value)
    return agreement ? agreement.key : 'Unknown Type'
  }

  const handleSignContract = async () => {
    if (!contract) return
    const { objectId, partyA, partyB } = contract
    const isPartyA = address === partyA
    const isPartyB = address === partyB
    if (!address) return
    try {
      if (isPartyA) {
        const txb = await buildSignContractAsPartyATx(objectId)
        const result = await signAndExecuteTransaction({ transaction: txb })
        if (!result.digest) {
          toast.error('Transaction succeeded but no digest was returned')
          return
        }

        const txn = await suiClient.waitForTransaction({
          digest: result.digest,
          options: {
            showEffects: true,
          },
        })
      } else if (isPartyB) {
        const txb = await buildSignContractAsPartyATx(objectId)
        const result = await signAndExecuteTransaction({ transaction: txb })
        if (!result.digest) {
          toast.error('Transaction succeeded but no digest was returned')
          return
        }

        const txn = await suiClient.waitForTransaction({
          digest: result.digest,
          options: {
            showEffects: true,
          },
        })
      } else {
        toast.error('error signing contract')
        return
      }
    } catch (error) {
      toast.error('error signing contract')
      console.error('Error signing contract:', error)
    } finally {
      setContract(null)
      await fetchContract()
    }
  }

  const handleSubmitContract = async () => {
    if (!contract) return
    const { objectId } = contract
    if (!address) return
    try {
      const txb = await buildSubmitContractTx(objectId)
      const result = await signAndExecuteTransaction({ transaction: txb })
      if (!result.digest) {
        toast.error('Transaction succeeded but no digest was returned')
        return
      }

      const txn = await suiClient.waitForTransaction({
        digest: result.digest,
        options: {
          showEffects: true,
        },
      })
    } catch (error) {
      toast.error('error submitting contract')
      console.error('Error submitting contract:', error)
    } finally {
      setContract(null)
      await fetchContract()
    }
  }

  const addMilestone = () => {
    // ... keep existing code (milestone adding logic)
  }

  const removeMilestone = (id: string) => {
    // ... keep existing code (milestone removal logic)
  }

  const updateMilestone = (
    id: string,
    field: keyof Milestone,
    value: string,
  ) => {
    // ... keep existing code (milestone updating logic)
  }
  return (
    <div className="min-h-screen text-white p-4 md:p-8 ">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-blue-400 hover:text-blue-300 transition cursor-pointer"
      >
        ← Back to contracts
      </button>
      <div className="flex flex-col items-center">
        <motion.div
          className="w-full max-w-8xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="rounded-2xl shadow-lg bg-gray-800">
            <CardContent className="p-8">
              <motion.h1
                className="text-2xl md:text-4xl font-light tracking-tight  px-4 py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                  {contract && contract.title}
                </span>
              </motion.h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">
                    Type:{' '}
                    <span className="font-medium">
                      {contract?.contractType
                        ? getAgreementType(contract.contractType)
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mb-1">
                    Start:{' '}
                    <span className="font-medium">
                      {contract?.contractStartDate
                        ? formatDate(contract.contractStartDate)
                        : 'N/A'}
                    </span>{' '}
                    | Deadline:{' '}
                    <span className="font-medium">
                      {contract?.contractDeadlineDate
                        ? formatDate(contract.contractDeadlineDate)
                        : 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-6">
                    ID:{' '}
                    <span className="font-mono text-sm">
                      {contract?.objectId ?? '0x000...'}
                    </span>
                  </p>
                </div>
                {contract && (
                  <div className="flex items-start justify-end">
                    <ContractStatusBadge
                      status={contract.status as StatusKey}
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[70%_30%] gap-4 p-4">
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-4"
                >
                  {contract && (
                    <>
                      <PartiesCard {...contract} />
                      <KeyTermsCard {...contract} />
                      <MetadataCard />
                      <EscrowCard address={''} balance={''} status={'Active'} />
                      <MilestonesCard milestones={[]} />
                    </>
                  )}
                </motion.div>

                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="space-y-4"
                >
                  {contract && (
                    <>
                      <ActionsCard
                        onSign={handleSignContract}
                        status={contract.status}
                        address={address!}
                        partyA={contract.partyA}
                        partyB={contract.partyB}
                        partyASigned={contract.partyASigned}
                        partyBSigned={contract.partyBSigned}
                        onSubmit={handleSubmitContract}
                      />
                      <ActivityTimelineCard activities={[]} />
                    </>
                  )}
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
