import { getAllContractsByOwner } from '@/service/PactdaService'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { useEffect, useState } from 'react'
import { ContractCard } from '../../components/ContractCard'
import { useNavigate } from 'react-router-dom'
import DashboardSkeleton from '@/components/Skeleton/DashboardSkeleton'
import { useSuiClientQueries } from '@mysten/dapp-kit'
import ContractsPagination from '@/components/ContractsPagination'

export interface ContractReceipt {
  objectId: string
  contractAddress: string
  timestamp: string
  actionType: string
}

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID
const MODULE_NAME = import.meta.env.VITE_MODULE_NAME

const Dashboard = () => {
  const [contracts, setContracts] = useState<any[] | null>(null)
  const [search, setSearch] = useState('')
  const suiClient = useSuiClient()
  const suiAccount = useCurrentAccount()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchContracts = async () => {
      if (!suiAccount?.address) return
      const data = await getAllContractsByOwner(suiClient, suiAccount.address)
      if (!data) return
      setContracts(data)
      getMyCreateContractCalls(suiAccount.address)
    }
    fetchContracts()
  }, [suiAccount?.address])

  const onCreateContract = () => {
    navigate('/create-contract')
  }

  async function getMyCreateContractCalls(address: string) {
    const allEvents = await suiClient.queryEvents({
      query: {
        MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::ContractCreatedEvent`,
      },
      limit: 500, // Adjust based on expected usage
    })

    console.log('getMyCreateContractCalls', allEvents)
  }

  const filteredContracts =
    contracts?.filter((contract) =>
      contract.contractAddress.toLowerCase().includes(search.toLowerCase()),
    ) || []

  return (
    <div className="min-h-screen bg-[#0d1117] py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Search and Create */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
          <input
            type="text"
            placeholder="Search contract address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-grow px-5 py-3 text-lg bg-[#161b22] text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onCreateContract}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg text-lg font-semibold transition"
          >
            + Create Contract
          </button>
        </div>

        {/* Content */}
        {contracts === null ? (
          <DashboardSkeleton />
        ) : filteredContracts.length === 0 ? (
          <div className="text-center text-gray-400 mt-20 text-lg">
            No contracts found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContracts.map((contract) => (
              <ContractCard
                key={contract.objectId}
                contractAddress={contract.contractAddress}
                timestamp={contract.timestamp}
              />
            ))}
          </div>
        )}
      </div>
      <ContractsPagination />
    </div>
  )
}

export default Dashboard
