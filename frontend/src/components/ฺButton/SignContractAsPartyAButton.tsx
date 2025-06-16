import React, { useState } from 'react'
import { buildSignContractAsPartyATx } from '@/service/PactdaService'
import { useUnifiedTransaction } from '@/hooks/useUnifiedTransaction'

type SignContractAsPartyAButtonProps = {
  contractId: string
  OnExecuted: () => Promise<void>
}

function SignContractAsPartyAButton({
  contractId,
  OnExecuted,
}: SignContractAsPartyAButtonProps) {
  const { mutate: standardSignAndExecuteTransaction } =
    useSignAndExecuteTransaction()
  const { mutate: zkLoginSignAndExecuteTransaction } = useZkLoginTransaction()
  const { zkloginAddress } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const chain = import.meta.env.VITE_SUI_CHAIN

  // Choose the appropriate signing method
  const signAndExecuteTransaction = zkloginAddress
    ? zkLoginSignAndExecuteTransaction
    : standardSignAndExecuteTransaction
  const handleClick = () => {
    setIsLoading(true)
    const txb = buildSignContractAsPartyATx(contractId)

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
      {isLoading ? 'Signing...' : 'Sign as Party A'}
    </button>
  )
}

export default SignContractAsPartyAButton
