// src/components/Button/SignWithZkLoginButton.tsx
import React, { useState } from 'react'
import { Transaction } from '@mysten/sui/transactions'
import { useUnifiedTransaction } from '@/hooks/useUnifiedTransaction'

type SignWithZkLoginButtonProps = {
  label: string
  buildTransaction: () => Transaction
  onExecuted: () => Promise<void>
}

/**
 * A reusable button component that supports both standard wallets and zkLogin
 */
function SignWithZkLoginButton({
  label,
  buildTransaction,
  onExecuted,
}: SignWithZkLoginButtonProps) {
  const { executeTransaction } = useUnifiedTransaction()
  const [isLoading, setIsLoading] = useState(false)
  
  const handleClick = () => {
    setIsLoading(true)
    const txb = buildTransaction()

    // Our unified executor handles both zkLogin and standard wallet transactions
    executeTransaction(txb)
      .then(async (result) => {
        await onExecuted()
      })
      .catch((err) => {
        console.error('❌ failed', err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`mt-4 inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-xl transition ${
        isLoading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {isLoading ? 'Signing...' : label}
    </button>
  )
}

export default SignWithZkLoginButton
