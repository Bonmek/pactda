import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

interface Props {
  contract: any
}

export const ContractCard: React.FC<Props> = ({ contract }) => {
  const formatTime = (ts: string) => {
    const unixTime = parseInt(ts, 10)
    if (isNaN(unixTime)) return '-'
    return new Date(unixTime * 1000).toLocaleString()
  }

  const navigate = useNavigate()

  const onSeeDetail = (id: string) => {
    navigate(`/contract/${id}`)
  }

  return (
    <div className="bg-[#1A223F] border border-[#2A3B5A] rounded-lg p-5 mb-4 shadow-md text-[#D0D8F0]">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-[#A5B4FC]">
          {contract.title || 'Untitled Contract'}
        </h3>
        <span className="status-tag bg-[#1E40AF] text-[#D1D5DB] border border-[#3B82F6] px-3 py-1 rounded-full text-xs font-semibold uppercase">
          {renderStatus(contract.status)}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-1">Type: Service Agreement</p>
      <p className="text-xs text-gray-400 mb-2">
        Deadline: <span className="font-medium">2025-09-30</span>
      </p>
      <p className="text-sm text-gray-300 mb-1">
        Other Party:{' '}
        <span className="inline-block w-4 h-4 rounded-full bg-[#4b5563] mr-1 align-middle"></span>
        <span className="font-mono text-xs">
          {truncateAddress(contract.party_b)}
        </span>
      </p>
      <p className="text-sm text-gray-300 mb-1">Your Role: Party A (Client)</p>
      <p className="text-sm text-gray-300 mb-4">Value: 1200 SUI</p>
      <button
        onClick={() => onSeeDetail(contract.contract_id)}
        className="bg-[#3B82F6] hover:bg-[#2563EB] w-full text-sm text-white py-3 rounded-md font-semibold shadow-md hover:-translate-y-0.5 transition-all"
      >
        View & Manage
      </button>
    </div>
  )
}

function renderStatus(status: number): string {
  const statusMap = {
    0: 'Draft',
    1: 'Pending',
    2: 'Active',
    3: 'Disputed',
    4: 'Completed',
    5: 'Cancelled',
  }
  return statusMap[status as keyof typeof statusMap] || 'Unknown'
}

function truncateAddress(address: string): string {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'
}
