import React, { useState } from 'react'
import { buildSignContractAsPartyBTx } from '@/service/PactdaService'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'

type SignContractAsPartyBButtonProps = {
  contractId: string
  OnExecuted: () => Promise<void>
}

function SignContractAsPartyBButton({
  contractId,
  OnExecuted,
}: SignContractAsPartyBButtonProps) {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()
  const [isLoading, setIsLoading] = useState(false)
  const chain = import.meta.env.VITE_SUI_CHAIN
  const handleClick = () => {
    setIsLoading(true)
    const txb = buildSignContractAsPartyBTx(contractId)

    signAndExecuteTransaction(
      {
        transaction: txb,
        chain: chain,
      },
      {
        onSuccess: async (result) => {
          await OnExecuted()
        },
        onError: (err) => {
          console.error('❌ failed', err)
        },
        onSettled: () => {
          setIsLoading(false)
        },
      },
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`mt-4 inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-xl transition ${
        isLoading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {isLoading ? 'Signing...' : 'Sign as Party B'}
    </button>
  )
}

export default SignContractAsPartyBButton
