import ContractForm from '@/components/CreateContract/CreateForm'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { getContracts, buildUpdateContractTx } from '@/service/PactdaService'
import { useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { PactDaContract } from '@/@types/PactDaContract'
import { toast } from 'sonner'

const UpdateContract = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction()
  const [contract, setContract] = useState<PactDaContract | null>(null)
  const [initialValues, setInitialValues] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchContract()
    }
  }, [id])

  const fetchContract = async () => {
    setLoading(true)
    const res = await getContracts(suiClient, id!)
    setContract(res)
    // Transform for ContractForm initialValues
    const initial = res
      ? {
          title: res.title ?? '',
          suiPartyBAddress: res.partyB ?? '',
          contractType:
            res.contractType !== null ? res.contractType : undefined,
          termsReference: res.termsReference ?? '',
          metadata: res.metadata ?? '',
          contractStartDate: res.contractStartDate
            ? new Date(Number(res.contractStartDate) * 1000)
            : undefined,
          contractDeadlineDate: res.contractDeadlineDate
            ? new Date(Number(res.contractDeadlineDate) * 1000)
            : undefined,
          milestones: Array.isArray(res.milestones) ? res.milestones : [],
        }
      : undefined
    setInitialValues(initial || null)
    setLoading(false)
  }

  const handleUpdate = async (values: any) => {
    if (!contract) return
    try {
      const txb = await buildUpdateContractTx(contract.objectId, values)
      const result = await signAndExecuteTransaction({ transaction: txb })
      if (!result.digest) {
        toast.error('Transaction succeeded but no digest was returned')
        return
      }
      toast.success('Contract updated successfully!')
      navigate(`/contract/${contract.objectId}`)
    } catch (error) {
      toast.error('Error updating contract')
      console.error('Error updating contract:', error)
    }
  }
  console.log('contract', contract)

  return (
    <div className="min-h-screen text-white p-4 md:p-8 flex-col justify-center">
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
          <Card>
            <CardContent className="p-1 pt-0 -mt-5 -mb-6">
              {loading ? (
                <div className="text-center py-10">Loading...</div>
              ) : initialValues ? (
                <ContractForm
                  initialValues={initialValues}
                  onSubmit={handleUpdate}
                  disableTitle={true}
                  mode="update"
                />
              ) : (
                <div className="text-center py-10 text-red-400">
                  Contract not found
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default UpdateContract
