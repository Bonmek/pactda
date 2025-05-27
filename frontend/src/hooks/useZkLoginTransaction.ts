// src/hooks/useZkLoginTransaction.ts
import { useCallback } from 'react'
import { Transaction } from '@mysten/sui/transactions'
import { useSuiClient } from '@mysten/dapp-kit'
import { signAndExecuteTransactionWithZkLogin } from '@/service/ZkLoginTransactionService'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Custom hook to handle zkLogin transactions
 * This hook provides a similar interface to useSignAndExecuteTransaction from @mysten/dapp-kit
 */
export const useZkLoginTransaction = () => {
  const suiClient = useSuiClient()
  const { zkloginAddress } = useAuth()

  const mutateAsync = useCallback(
    async ({ transaction }: { transaction: Transaction }) => {
      if (!zkloginAddress) {
        throw new Error('No zkLogin address found. Please log in first.')
      }

      return await signAndExecuteTransactionWithZkLogin(transaction, suiClient)
    },
    [zkloginAddress, suiClient]
  )

  return {
    mutateAsync,
    // To maintain compatibility with useSignAndExecuteTransaction from dapp-kit
    mutate: (params: { transaction: Transaction }) => {
      mutateAsync(params).catch(error => {
        console.error('Error executing zkLogin transaction:', error)
      })
    }
  }
}
