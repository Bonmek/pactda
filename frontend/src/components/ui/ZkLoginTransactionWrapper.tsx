// src/components/ui/ZkLoginTransactionWrapper.tsx
import React from 'react'
import { Transaction } from '@mysten/sui/transactions'
import { useAuth } from '@/contexts/AuthContext'
import { useZkLoginTransaction } from '@/hooks/useZkLoginTransaction'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'

interface ZkLoginTransactionWrapperProps {
  children: (
    signAndExecuteTransaction: (params: {
      transaction: Transaction
    }) => Promise<any>,
  ) => React.ReactNode
}

/**
 * A wrapper component that provides the appropriate transaction signing function
 * based on the user's login method (zkLogin or regular wallet)
 */
const ZkLoginTransactionWrapper: React.FC<ZkLoginTransactionWrapperProps> = ({
  children,
}) => {
  const { zkloginAddress } = useAuth()
  const { mutateAsync: zkLoginSignAndExecuteTransaction } =
    useZkLoginTransaction()
  const { mutateAsync: standardSignAndExecuteTransaction } =
    useSignAndExecuteTransaction()

  // Choose the appropriate signing method based on authentication type
  const signAndExecuteTransaction = async (params: {
    transaction: Transaction
  }) => {
    if (zkloginAddress) {
      return zkLoginSignAndExecuteTransaction(params)
    }
    return standardSignAndExecuteTransaction(params)
  }

  return <>{children(signAndExecuteTransaction)}</>
}

export default ZkLoginTransactionWrapper
