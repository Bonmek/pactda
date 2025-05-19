import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'

interface Props {
  contract: any
  address?: string
}

export const ContractCard: React.FC<Props> = ({ contract, address }) => {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const formatTime = (ts: string) => {
    const unixTime = parseInt(ts, 10)
    if (isNaN(unixTime)) return '-'
    return new Date(unixTime * 1000).toLocaleString()
  }

  const onSeeDetail = (id: string) => navigate(`/contract/${id}`)
  const onEdit = (id: string) => navigate(`/contract/${id}/edit`)
  const onCancel = (id: string) => console.log('Cancel:', id)

  // Close the menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="bg-[#1A223F] border border-[#2A3B5A] rounded-lg py-2 px-4 mb-4 shadow-md text-[#D0D8F0] relative">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-lg font-semibold text-[#A5B4FC]">
            {contract.title || 'Untitled Contract'}
          </h3>
          <p className="text-sm text-gray-300 mb-1">
            Other Party:{' '}
            <span className="inline-block w-4 h-4 rounded-full bg-[#4b5563] mr-1 align-middle"></span>
            <span className="font-mono text-xs">
              {contract.party_a == address
                ? truncateAddress(contract.party_a)
                : truncateAddress(contract.party_b)}
            </span>
          </p>
          <p className="text-sm text-gray-300 mb-1">
            Your Role: {contract.party_a == address ? 'Promisee' : 'Promisor'}
          </p>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="p-2 hover:bg-[#2A3B5A] rounded-full transition duration-200 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
              />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-0.5 w-40 bg-[#2A3B5A] rounded-lg shadow-lg z-10 animate-fade-in overflow-hidden ">
              <button
                onClick={() => onSeeDetail(contract.contract_id)}
                className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-[#3A4A6A] rounded-none transition duration-150 cursor-pointer"
              >
                🔍 View
              </button>
              <button
                disabled={true}
                onClick={() => onEdit(contract.contract_id)}
                className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-[#3A4A6A] rounded-none transition duration-150 cursor-pointer"
              >
                ✏️ Edit
              </button>
              <button
                disabled={true}
                onClick={() => onCancel(contract.contract_id)}
                className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-[#3A4A6A] rounded-none transition duration-150 cursor-pointer"
              >
                ❌ Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function truncateAddress(address: string): string {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'
}
