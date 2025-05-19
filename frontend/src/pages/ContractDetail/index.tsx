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
    //
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
    <div className="min-h-screen text-white p-4 md:p-8  justify-center flex-col">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-6 text-blue-400 hover:text-blue-300 transition cursor-pointer"
      >
        ← Back to contracts
      </button>
      <div className="flex flex-col items-center w-full">
        <motion.div
          className="w-full max-w-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="rounded-3xl shadow-2xl bg-gradient-to-br from-[#232946] via-[#1a1a2e] to-[#0f3460] border border-indigo-700/40 backdrop-blur-xl">
            <CardContent className="p-2 md:p-4 lg:p-8 md:-mt-8">
              <motion.h1
                className="text-3xl md:text-5xl font-extralight tracking-tight px-2 md:px-4 py-4 pt-0 text-center mb-2 md:mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent drop-shadow-lg">
                  {contract && contract.title ? contract.title : '-'}
                </span>
              </motion.h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-2 md:px-8 mb-8">
                <div className="space-y-4">
                  {contract && (
                    <div className=" flex-col items-center justify-start gap-4 flex md:hidden">
                      <ContractStatusBadge
                        status={contract.status as StatusKey}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-lg text-indigo-300/80">
                    <span className="font-semibold text-indigo-400/90">
                      Type:
                    </span>
                    <span className="font-light text-white/90">
                      {contract?.contractType !== undefined &&
                      contract?.contractType !== null
                        ? getAgreementType(contract.contractType)
                        : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-3 text-lg text-indigo-300/80">
                    <div className="flex gap-3">
                      <span className="font-semibold text-indigo-400/90">
                        Start:
                      </span>
                      <span className="font-light text-white/90">
                        {contract?.contractStartDate
                          ? formatDate(contract.contractStartDate)
                          : '-'}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-semibold text-indigo-400/90 md:ml-4">
                        Deadline:
                      </span>
                      <span className="font-light text-white/90">
                        {contract?.contractDeadlineDate
                          ? formatDate(contract.contractDeadlineDate)
                          : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="flex md:items-center gap-3 text-lg text-indigo-300/80">
                    <span className="font-semibold text-indigo-400/90">
                      ID:
                    </span>
                    <span className="font-mono text-white/80 text-base break-all">
                      {contract?.objectId ?? '-'}
                    </span>
                  </div>
                  {contract &&
                    contract.status === 0 &&
                    address === contract.partyA && (
                      <div className="w-full md:w-50">
                      <button
                        className="w-full bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white rounded-xl px-6 py-2 text-base font-semibold shadow-lg transition mb-2 mt-4 pulse-effect"
                        onClick={() => navigate(`/contract/${contract.objectId}/edit`)}
                      >
                        ✏️ Update Contract
                      </button>
                      </div>
                    )}
                </div>
                {contract && (
                  <div className=" flex-col items-end justify-start gap-4 hidden md:flex">
                    <ContractStatusBadge
                      status={contract.status as StatusKey}
                    />
                  </div>
                )}
              </div>
              {/* Responsive ActionsCard: show at top on mobile, right column on desktop */}
              {/* Mobile: ActionsCard at top */}
              {contract && (
                <div className="block md:hidden mb-6">
                  <div className="rounded-2xl bg-gradient-to-br from-indigo-800/40 to-fuchsia-800/10 p-4 shadow-lg border border-indigo-700/20 flex flex-col gap-4">
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
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-[60%_40%] gap-8 p-2 md:p-4">
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  {contract && (
                    <>
                      <div className="rounded-2xl bg-gradient-to-br from-indigo-900/30 to-indigo-700/10 p-6 shadow-lg border border-indigo-700/20">
                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <span className="block text-indigo-300/80 font-semibold mb-1">
                              Party A
                            </span>
                            <span className="block font-mono text-white/90 text-base break-all">
                              {contract.partyA || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-indigo-300/80 font-semibold mb-1">
                              Party B
                            </span>
                            <span className="block font-mono text-white/90 text-base break-all">
                              {contract.partyB || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-900/30 to-fuchsia-700/10 p-6 shadow-lg border border-fuchsia-700/20">
                        <span className="block text-fuchsia-300/80 font-semibold mb-1">
                          Key Terms
                        </span>
                        <span className="block text-white/90 text-base whitespace-pre-wrap min-h-[2rem]">
                          {contract.termsReference &&
                          contract.termsReference.trim() !== ''
                            ? contract.termsReference
                            : '-'}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-purple-700/10 p-6 shadow-lg border border-purple-700/20">
                        <span className="block text-purple-300/80 font-semibold mb-1">
                          Metadata / Additional Links
                        </span>
                        <span className="block text-white/90 text-xs break-all min-h-[1.5rem]">
                          {contract.metadata && contract.metadata.trim() !== ''
                            ? contract.metadata
                            : '-'}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-blue-900/30 to-blue-700/10 p-6 shadow-lg border border-blue-700/20">
                        <span className="block text-blue-300/80 font-semibold mb-1">
                          Escrow
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          <span className="block text-white/90 text-base">
                            Address:{' '}
                            <span className="font-mono">
                              {contract.escrowId || '-'}
                            </span>
                          </span>
                          <span className="block text-white/90 text-base">
                            Balance: <span className="text-green-400">-</span>
                          </span>
                          <span className="block text-white/90 text-base">
                            Status: <span className="text-blue-400">-</span>
                          </span>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-emerald-900/30 to-emerald-700/10 p-6 shadow-lg border border-emerald-700/20">
                        <span className="block text-emerald-300/80 font-semibold mb-1">
                          Milestones
                        </span>
                        {Array.isArray(contract.milestones) &&
                        contract.milestones.length > 0 ? (
                          <ul className="list-disc list-inside text-white/90 text-base space-y-1">
                            {contract.milestones.map((milestone, idx) => (
                              <li key={idx}>
                                <span className="font-semibold">
                                  {milestone.name || '-'}
                                </span>{' '}
                                -{' '}
                                <span className="text-emerald-400">
                                  {milestone.status || '-'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="block text-white/60 italic">-</span>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
                {/* Desktop: ActionsCard in right column */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="space-y-8 hidden md:block"
                >
                  {contract && (
                    <>
                      <div className="rounded-2xl bg-gradient-to-br from-indigo-800/40 to-fuchsia-800/10 p-4 shadow-lg border border-indigo-700/20 flex flex-col gap-4">
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
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-700/10 p-4 shadow-lg border border-gray-700/20">
                        <span className="block text-gray-300/80 font-semibold mb-1">
                          Activity Timeline
                        </span>
                        <span className="block text-white/60 italic">-</span>
                      </div>
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
