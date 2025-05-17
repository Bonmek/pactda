// ContractsPagination.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { ContractCard } from './ContractCard'

const ITEMS_PER_PAGE = 10
const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID
const MODULE_NAME = import.meta.env.VITE_MODULE_NAME

export default function ContractsPagination() {
  const currentAccount = useCurrentAccount()
  const address = currentAccount?.address
  const [allContracts, setAllContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('partyA')
  const [currentPage, setCurrentPage] = useState(1)
  const [isCacheLoaded, setIsCacheLoaded] = useState(false)

  const suiClient = useSuiClient()

  // Load contracts from cache first for instant UI rendering
  useEffect(() => {
    const cachedData = localStorage.getItem('pactda-contracts-cache')
    if (cachedData) {
      try {
        const { contracts, timestamp } = JSON.parse(cachedData)
        // Use cache if less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setAllContracts(contracts)
          setLoading(false)
          setIsCacheLoaded(true)
        }
      } catch (e) {
        console.error('Error loading from cache:', e)
      }
    }
  }, [])

  // Fetch all contracts in batches
  const fetchAllContracts = useCallback(async () => {
    if (!address || (isCacheLoaded && !allContracts)) return

    setLoading(true)
    let allFetchedContracts = []
    let cursor = null
    let hasMore = true

    try {
      // Batch load all contracts
      while (hasMore) {
        const response = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::ContractCreatedEvent`,
          },
          order: 'descending',
          cursor,
          limit: 100, // Fetch in large batches for efficiency
        })

        allFetchedContracts = [
          ...allFetchedContracts,
          ...response.data.map((event) => event.parsedJson),
        ]

        if (response.hasNextPage) {
          cursor = response.nextCursor
        } else {
          hasMore = false
        }

        // Safety limit - don't load more than 1000 contracts
        if (allFetchedContracts.length >= 1000) break
      }

      // Cache for faster subsequent loads
      localStorage.setItem(
        'pactda-contracts-cache',
        JSON.stringify({
          contracts: allFetchedContracts,
          timestamp: Date.now(),
        }),
      )

      setAllContracts(allFetchedContracts)
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoading(false)
    }
  }, [suiClient, address, isCacheLoaded])

  // Load contracts on component mount
  useEffect(() => {
    fetchAllContracts()
  }, [fetchAllContracts])
  // Reset to page 1 when changing tabs
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // Filter contracts based on active tab
  const filteredContracts = useMemo(() => {
    if (!allContracts.length) return []

    return allContracts.filter((contract) => {
      const content = contract
      if (!content) return false

      switch (activeTab) {
        case 'partyA':
          return content.party_a === address
        case 'partyB':
          return content.party_b === address
        // case 'crossChain':
        //   if (!content.cross_chain_parties?.fields?.vec?.fields) return false
        //   const parties = content.cross_chain_parties.fields.vec.fields
        //   return parties.some(
        //     (party) =>
        //       party.fields.role === 1 && // PARTY_ROLE_B
        //       // You'd replace these with actual values from connected wallets
        //       party.fields.chain_id === yourCrossChainId &&
        //       compareAddressBytes(
        //         party.fields.party_address,
        //         yourCrossChainAddressBytes,
        //       ),
        //   )
        default:
          return false
      }
    })
  }, [allContracts, activeTab, address])

  // Calculate pagination
  const paginatedContracts = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
    const endIdx = startIdx + ITEMS_PER_PAGE
    return filteredContracts.slice(startIdx, endIdx)
  }, [filteredContracts, currentPage])

  // Calculate total pages
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredContracts.length / ITEMS_PER_PAGE)),
    [filteredContracts],
  )

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Complex pagination logic for many pages
      if (currentPage <= 3) {
        // Near the start
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        // In the middle
        pages.push(1)
        pages.push('...')
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }, [currentPage, totalPages])

  // Helper function to compare byte arrays
  function compareAddressBytes(a, b) {
    if (!a || !b || a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  return (
    <div className="contracts-container p-4">
      {/* Tab Navigation */}
      {/* <div className="flex gap-2 mb-6">
      {['partyA', 'partyB'].map((tab) => (
        <button
          key={tab}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200
            ${
              activeTab === tab
                ? 'bg-[#3B82F6] text-white shadow'
                : 'bg-[#1E293B] text-gray-300 hover:bg-[#374151]'
            }`}
          onClick={() => setActiveTab(tab)}
        >
          {tab === 'partyA' ? "I'm Party A" : "I'm Party B"} ({filteredContracts.length})
        </button>
      ))}
    </div> */}

      {/* Loading or Empty State */}
      {loading && !isCacheLoaded ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading contracts...</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p>No contracts found for this role</p>
        </div>
      ) : (
        <>
          {/* Contracts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedContracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6">
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border border-[#37415A] 
                ${
                  currentPage === 1
                    ? 'text-gray-500 bg-[#1A223F] cursor-not-allowed'
                    : 'bg-[#2A3B5A] hover:bg-[#37415A] text-[#E0E7FF]'
                }`}
              >
                &lt; Prev
              </button>

              {pageNumbers.map((page, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    typeof page === 'number' ? setCurrentPage(page) : null
                  }
                  disabled={typeof page !== 'number'}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border border-[#37415A] 
                  ${
                    typeof page !== 'number'
                      ? 'text-gray-500 bg-[#1A223F] cursor-not-allowed'
                      : currentPage === page
                        ? 'bg-[#3B82F6] text-white shadow'
                        : 'bg-[#2A3B5A] text-[#E0E7FF] hover:bg-[#37415A]'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() =>
                  setCurrentPage((page) => Math.min(page + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border border-[#37415A] 
                ${
                  currentPage === totalPages
                    ? 'text-gray-500 bg-[#1A223F] cursor-not-allowed'
                    : 'bg-[#2A3B5A] hover:bg-[#37415A] text-[#E0E7FF]'
                }`}
              >
                Next &gt;
              </button>
            </div>

            <div className="text-sm text-gray-400 mt-2 md:mt-0">
              Page{' '}
              <span className="text-[#A5B4FC] font-medium">{currentPage}</span>{' '}
              of{' '}
              <span className="text-[#A5B4FC] font-medium">{totalPages}</span> (
              <span className="text-[#7DD3FC] font-medium">
                {filteredContracts.length}
              </span>{' '}
              total)
            </div>
          </div>

          {/* Refresh Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                localStorage.removeItem('pactda-contracts-cache')
                setIsCacheLoaded(false)
                fetchAllContracts()
              }}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm px-4 py-2 rounded-md shadow-md transition-all duration-200"
            >
              🔄 Refresh Contracts
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Helper functions
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

function formatEpoch(epoch: string): string {
  if (!epoch) return 'N/A'
  return new Date(Number(epoch) * 1000).toLocaleDateString()
}
