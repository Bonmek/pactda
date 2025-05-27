// src/hooks/useUnifiedTransaction.ts
import { useCallback } from 'react'
import { Transaction } from '@mysten/sui/transactions'
import { useSuiClient } from '@mysten/dapp-kit'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { useAuth } from '@/contexts/AuthContext'
import { signAndExecuteTransactionWithZkLogin } from '@/service/ZkLoginTransactionService'

/**
 * Custom hook that provides a unified interface for transaction signing
 * that works with both regular Sui wallets and zkLogin authentication
 */
export function useUnifiedTransaction() {
  const suiClient = useSuiClient()
  const { zkloginAddress } = useAuth()
  const { mutateAsync: standardSignAndExecute } = useSignAndExecuteTransaction()
  
  const executeTransaction = useCallback(async (transaction: Transaction) => {
    try {
      // Set zkLogin address as the transaction sender if we're using zkLogin
      if (zkloginAddress) {
        console.log("Executing transaction with zkLogin authentication, address:", zkloginAddress)
        
        // Always use setSender to ensure the right address is used
        transaction.setSender(zkloginAddress)
        
        try {
          return await signAndExecuteTransactionWithZkLogin(transaction, suiClient)
        } catch (zkError) {
          // Handle zkLogin specific errors with detailed categorization
          console.error('zkLogin transaction execution error:', zkError)
          
          // Parse error message for better user feedback
          if (zkError instanceof Error) {
            const errorMsg = zkError.message.toLowerCase()
            
            // Invalid signature errors
            if (errorMsg.includes('invalid user signature') || errorMsg.includes('signature is not valid')) {
              console.error('zkLogin authentication signature error detected')
              throw new Error('Authentication signature invalid. Please log out and login again using zkLogin.')
            } 
            // Salt-related errors
            else if (errorMsg.includes('salt')) {
              console.error('zkLogin salt error detected')
              throw new Error('Authentication error: Problem with user identity data. Please log out and login again.')
            }
            // JWT or token expiration
            else if (errorMsg.includes('jwt') || errorMsg.includes('token') || errorMsg.includes('expired')) {
              console.error('zkLogin JWT/token error detected')
              throw new Error('Your authentication session has expired. Please log out and login again.')
            }
            // ZK Proof errors
            else if (errorMsg.includes('proof') || errorMsg.includes('groth16')) {
              console.error('zkLogin proof verification error detected')
              throw new Error('Authentication verification failed. Please try again or use a different login method.')
            }
          }
          
          // If we couldn't categorize the error, rethrow it
          throw zkError
        }
      } 
      
      // Otherwise use the standard wallet flow
      console.log("Executing transaction with standard wallet")
      return await standardSignAndExecute({ transaction })
    } catch (error) {
      console.error('Transaction execution error:', error)
      throw error
    }
  }, [zkloginAddress, suiClient, standardSignAndExecute])

  return {
    executeTransaction,
  }
}
