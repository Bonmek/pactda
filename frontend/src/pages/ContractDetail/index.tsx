import { motion } from 'framer-motion'
import { getContracts } from '@/service/PactdaService'
import { useEffect, useState } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
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

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [contract, setContract] = useState<PactDaContract | null>(null)
  const suiClient = useSuiClient()
  const suiAccount = useCurrentAccount()

  useEffect(() => {
    fetchContract()
  }, [id])

  const fetchContract = async () => {
    const res = await getContracts(suiClient, id!)
    setContract(res)
  }

  const handleSignContract = async () => {
    setContract(null)
    await new Promise((res) => setTimeout(res, 1000))
    await fetchContract()
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
                className="text-2xl md:text-4xl font-light tracking-tight mb-6 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                  {contract && contract.title}
                </span>
              </motion.h1>
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
                        onSign={function (): void {
                          throw new Error('Function not implemented.')
                        }}
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
