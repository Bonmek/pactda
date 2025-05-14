// ContractsPagination.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'

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
    <div className="contracts-container">
      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={activeTab === 'partyA' ? 'active' : ''}
          onClick={() => setActiveTab('partyA')}
        >
          I'm Party A ({filteredContracts.length})
        </button>
        <button
          className={activeTab === 'partyB' ? 'active' : ''}
          onClick={() => setActiveTab('partyB')}
        >
          I'm Party B ({filteredContracts.length})
        </button>
        {/* <button
          className={activeTab === 'crossChain' ? 'active' : ''}
          onClick={() => setActiveTab('crossChain')}
        >
          Cross Chain ({filteredContracts.length})
        </button> */}
      </div>

      {/* Loading or Empty State */}
      {loading && !isCacheLoaded ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading contracts...</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="empty-state">
          <p>No contracts found for this role</p>
        </div>
      ) : (
        <>
          {/* Contracts Grid */}
          <div className="contracts-grid">
            {paginatedContracts.map((contract) => (
              <ContractCard key={contract.objectId} contract={contract} />
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              &lt; Prev
            </button>

            {pageNumbers.map((page, idx) => (
              <button
                key={idx}
                onClick={() =>
                  typeof page === 'number' ? setCurrentPage(page) : null
                }
                className={`pagination-button ${currentPage === page ? 'active' : ''} ${typeof page !== 'number' ? 'ellipsis' : ''}`}
                disabled={typeof page !== 'number'}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() =>
                setCurrentPage((page) => Math.min(page + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next &gt;
            </button>

            <div className="pagination-info">
              Page {currentPage} of {totalPages} ({filteredContracts.length}{' '}
              total)
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              localStorage.removeItem('pactda-contracts-cache')
              setIsCacheLoaded(false)
              fetchAllContracts()
            }}
            className="refresh-button"
          >
            Refresh Contracts
          </button>
        </>
      )}
    </div>
  )
}

// Contract Card Component - Memoized for performance
const ContractCard = React.memo(({ contract }: any) => {
  const content = contract || {}

  return (
    <div className="contract-card">
      <h3>{content.title || 'Untitled Contract'}</h3>
      <div className="contract-status">
        Status: {renderStatus(content.status)}
      </div>
      <div className="contract-parties">
        <div>Party A: {truncateAddress(content.party_a)}</div>
        <div>
          Party B:{' '}
          {content.party_b !== '0x0'
            ? truncateAddress(content.party_b)
            : 'Cross-Chain'}
        </div>
      </div>
      <div className="contract-signatures">
        {content.is_party_a_signed && (
          <span className="signature party-a">A ✓</span>
        )}
        {content.is_party_b_signed && (
          <span className="signature party-b">B ✓</span>
        )}
      </div>
      <button className="view-button">View Details</button>
    </div>
  )
})

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
