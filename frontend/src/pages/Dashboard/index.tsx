import { getAllContractsByOwner } from '@/service/PactdaService'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { useEffect, useState } from 'react'
import { ContractCard } from '../../components/ContractCard'
import { useNavigate } from 'react-router-dom'
import DashboardSkeleton from '@/components/Skeleton/DashboardSkeleton'
import { useSuiClientQueries } from '@mysten/dapp-kit'
import ContractsPagination from '@/components/ContractsPagination'
import { motion } from 'framer-motion'
import { Separator } from '@/components/ui/separator'

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
  const [roleSelected, setRoleSelected] = useState('')
  const [typeSelected, setTypeSelected] = useState('')
  const navigate = useNavigate()

  const onCreateContract = () => {
    navigate('/create-contract')
  }

  const handleRoleChange = (role: string) => {
    setRoleSelected(role)
  }

  const handleTypeChange = (type: string) => {
    setTypeSelected(type)
  }

  const handleSearchKeyChange = (key: string) => {
    setSearch(key)
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-8xl mx-auto">
        {/* Search and Create */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="text-2xl md:text-4xl font-light tracking-tight mb-6 text-center "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              My Digital Agreements
            </span>
          </motion.h1>

          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <input
                type="text"
                onChange={(e) => handleSearchKeyChange(e.target.value)}
                value={search}
                placeholder="Search by title or ID..."
                className="bg-[#1E293B] text-sm text-white placeholder-gray-400 border border-[#334155] rounded-md px-3 py-2 w-full sm:w-auto md:w-78 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                onChange={(e) => handleRoleChange(e.target.value)}
                value={roleSelected}
                className="bg-[#1E293B] text-sm text-white border border-[#334155] rounded-md px-3 py-2 md:w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="partyA">I'm Party A</option>
                <option value="partyB">I'm Party B</option>
              </select>

              <select
                onChange={(e) => handleTypeChange(e.target.value)}
                value={typeSelected}
                className="bg-[#1E293B] text-sm text-white border border-[#334155] rounded-md px-3 py-2 md:w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="general">General</option>
                <option value="art">Art</option>
                <option value="programming">Programming</option>
                <option value="audit">Audit</option>
              </select>
            </div>

            <button
              onClick={onCreateContract}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-md shadow w-full md:w-auto text-center transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="text-lg">+</span> Create New Agreement
            </button>
          </div>

          <ContractsPagination role={roleSelected} type={typeSelected} searchKey={search} />
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard
