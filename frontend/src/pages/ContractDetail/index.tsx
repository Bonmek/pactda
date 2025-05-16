import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getContracts } from '@/service/PactdaService'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { PactDaContract } from '@/@types/PactDaContract'
import SignContractAsPartyAButton from '@/components/ฺButton/SignContractAsPartyAButton'
import SignContractAsPartyBButton from '@/components/ฺButton/SignContractAsPartyBButton'
import SectionCard from '@/components/Card/SectionCard'
import ContractDetailSkeleton from '@/components/Skeleton/ContractDetailSkeleton'

function ContractDetail() {
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

  if (!contract) {
  return <ContractDetailSkeleton />
}

  return (
    <div className="min-h-screen bg-[#0d1117] px-4 py-10 text-white">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-blue-400 hover:text-blue-300 transition"
        >
          ← Back to contracts
        </button>

        {/* Header */}
        <div className="bg-[#161b22] rounded-3xl p-8 shadow-2xl">
          <h1 className="text-4xl font-bold mb-2">📝 Contract Details</h1>
          <p className="text-gray-400 text-sm">ID: {contract.objectId}</p>
          <div className="flex flex-row space-x-4 mt-2">
            {suiAccount?.address === contract.partyA &&
              !contract.partyASigned && (
                <SignContractAsPartyAButton
                  contractId={contract.objectId}
                  OnExecuted={handleSignContract}
                />
              )}
            {suiAccount?.address === contract.partyB &&
              !contract.partyBSigned && (
                <SignContractAsPartyBButton
                  contractId={contract.objectId}
                  OnExecuted={handleSignContract}
                />
              )}
          </div>
        </div>

        {/* Info Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Metadata */}
          <SectionCard title="📦 Metadata">
            <DetailRow label="Escrow ID" value={contract.escrowId || 'N/A'} />
            <DetailRow label="Terms" value={contract.termsReference} />
            <DetailRow
              label="Status"
              value={getStatusLabel(contract.status)}
              badge
            />
          </SectionCard>

          {/* Parties */}
          <SectionCard title="👥 Parties">
            <DetailRow label="Party A" value={contract.partyA} isAddress />
            <DetailRow
              label="Party A Signed"
              value={contract.partyASigned ? 'Signed' : 'Not signed'}
              badge
              signed={contract.partyASigned}
            />
            <DetailRow label="Party B" value={contract.partyB} isAddress />

            <DetailRow
              label="Party B Signed"
              value={contract.partyBSigned ? 'Signed' : 'Not signed'}
              badge
              signed={contract.partyBSigned}
            />
          </SectionCard>
        </div>

        {/* Milestones */}
        <SectionCard title="📌 Milestones" className="mt-8">
          {contract.milestones ? (
            <div className="space-y-3 text-sm text-gray-300">
              {Object.entries(contract.milestones).map(([key, val]) => (
                <div
                  key={key}
                  className="bg-[#0d1117] border border-gray-700 rounded-xl p-3 flex justify-between"
                >
                  <span className="font-medium">{key}</span>
                  <span>{JSON.stringify(val)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No milestones found.</p>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

const DetailRow = ({
  label,
  value,
  badge = false,
  signed,
  isAddress = false,
}: {
  label: string
  value: string
  badge?: boolean
  signed?: boolean
  isAddress?: boolean
}) => {
  const shorten = (str: string) =>
    str.length > 20 ? `${str.slice(0, 6)}...${str.slice(-4)}` : str

  return (
    <div className="flex justify-between items-center py-1 gap-4">
      <span className="text-gray-400 whitespace-nowrap">{label}</span>

      {badge ? (
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            signed === true
              ? 'bg-green-700 text-green-200'
              : signed === false
                ? 'bg-red-700 text-red-300'
                : 'bg-blue-700 text-blue-200'
          }`}
        >
          {value}
        </span>
      ) : (
        <span
          className={`font-medium text-white max-w-[200px] md:max-w-xs truncate`}
          title={isAddress ? value : ''}
        >
          {isAddress ? shorten(value) : value}
        </span>
      )}
    </div>
  )
}

const getStatusLabel = (status: number): string => {
  switch (status) {
    case 0:
      return '📝 Draft'
    case 1:
      return '✍️ Pending'
    case 2:
      return '✅ Active'
    case 3:
      return '🏁 Completed'
    case 4:
      return '❌ Cancelled'
    default:
      return '❓ Unknown'
  }
}

export default ContractDetail
