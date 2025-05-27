import { useEffect, useState } from 'react'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { formatSUI } from '@mysten/sui.js/utils'

const UserBalance = () => {
  const suiClient = useSuiClient()
  const account = useCurrentAccount()
  const [balance, setBalance] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchBalance = async () => {
      if (account?.address) {
        setIsLoading(true)
        try {
          const coinBalance = await suiClient.getBalance({
            owner: account.address,
          })
          setBalance(
            formatSUI(BigInt(coinBalance.totalBalance), {
              withAbbr: false,
              digits: 4,
            }),
          )
        } catch (error) {
          console.error('Error fetching balance:', error)
          setBalance(null)
        } finally {
          setIsLoading(false)
        }
      } else {
        setBalance(null)
      }
    }

    fetchBalance()
    const intervalId = setInterval(fetchBalance, 30000)

    return () => clearInterval(intervalId)
  }, [account?.address, suiClient])

  if (!account) {
    return null 
  }

  return (
    <div className="text-sm text-gray-300 mr-4">
      {isLoading && !balance ? (
        <span>Loading balance...</span>
      ) : balance !== null ? (
        <span>Balance: {balance} SUI</span>
      ) : (
        <span>Balance: N/A</span>
      )}
    </div>
  )
}

export default UserBalance
