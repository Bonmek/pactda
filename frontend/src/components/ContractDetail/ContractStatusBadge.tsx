import React from 'react'

export type StatusKey = 0 | 1 | 2 | 3 | 4 | 5

type ContractStatusBadgeProps = {
  status: StatusKey
}

const statusMapping: Record<StatusKey, { label: string; color: string }> = {
  0: { label: 'Draft', color: 'bg-gray-500 text-black' },
  1: {
    label: 'Awaiting signatures',
    color: 'bg-yellow-500 text-white',
  },
  2: { label: 'Active', color: 'bg-blue-500 text-white' },
  3: { label: 'In dispute', color: 'bg-red-500 text-white' },
  4: { label: 'Completed', color: 'bg-green-500 text-white' },
  5: { label: 'Denied', color: 'bg-gray-600 text-white' },
}

const ContractStatusBadge: React.FC<ContractStatusBadgeProps> = ({
  status,
}) => {
  const { label, color } = statusMapping[status] || {
    label: 'Unknown status',
    color: 'bg-gray-400 text-black',
  }

  return (
    <span className={`px-4 py-1 text-sm font-semibold rounded-full ${color}`}>
      {label}
    </span>
  )
}

export default ContractStatusBadge
