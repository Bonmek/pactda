import React from 'react'
import { Link } from 'react-router-dom'

interface Props {
  contractAddress: string
  timestamp: string
}

export const ContractCard: React.FC<Props> = ({
  contractAddress,
  timestamp,
}) => {
  const formatTime = (ts: string) => {
    const unixTime = parseInt(ts, 10)
    if (isNaN(unixTime)) return '-'
    return new Date(unixTime * 1000).toLocaleString()
  }



  return (
    <Link to={`/contract/${contractAddress}`} className="block group">
      <div className="bg-[#161b22] border border-gray-700 rounded-2xl p-5 shadow hover:shadow-lg transition-all duration-200">
        {/* Contract Address */}
        <div className="text-sm text-gray-400 mb-1">📄 Contract Address</div>
        <div
          className="text-lg font-mono text-white truncate group-hover:underline"
          title={contractAddress}
        >
          {contractAddress}
        </div>

        {/* Timestamp */}
        <div className="text-sm text-gray-400 mt-4 mb-1">🕒 Created</div>
        <div className="text-md text-gray-200">{formatTime(timestamp)}</div>
      </div>
    </Link>
  )
}
