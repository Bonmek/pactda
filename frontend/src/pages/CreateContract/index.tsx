import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildCreateContractTx } from '@/service/PactdaService'

const chain = import.meta.env.VITE_SUI_CHAIN

const CreateContract = () => {
  const [partyB, setPartyB] = useState('')
  const [termsRef, setTermsRef] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const txb = buildCreateContractTx(partyB, termsRef)

      signAndExecuteTransaction(
        {
          transaction: txb,
          chain: chain,
        },
        {
          onSuccess: async (result) => {
            console.log('executed transaction', result)
            await new Promise((res) => setTimeout(res, 2000))
            navigate('/dashboard')
          },
        },
      )
    } catch (error) {
      console.error('Error creating contract:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex  justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-[#161b22] p-10 rounded-3xl shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-blue-400 hover:text-blue-300 transition"
        >
          ← Back to contracts
        </button>

        <h1 className="text-3xl font-bold text-white mb-8">
          Create New Contract
        </h1>

        {/* Party B Address */}
        <div className="mb-6">
          <label className="block text-lg text-gray-300 mb-2">
            Party B Address
          </label>
          <input
            type="text"
            value={partyB}
            onChange={(e) => setPartyB(e.target.value)}
            className="w-full px-5 py-3 text-lg bg-[#0d1117] text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0x..."
          />
        </div>

        {/* Terms */}
        <div className="mb-8">
          <label className="block text-lg text-gray-300 mb-2">
            Terms
            <span className="text-xs text-gray-500">
              (Details of the contract)
            </span>
          </label>
          <textarea
            value={termsRef}
            onChange={(e) => setTermsRef(e.target.value)}
            className="w-full px-5 py-3 text-lg h-40 bg-[#0d1117] text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter terms text..."
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg rounded-lg font-semibold transition-all duration-200 ease-in-out disabled:opacity-50"
          disabled={loading || !partyB || !termsRef}
        >
          {loading ? 'Creating...' : 'Create Contract'}
        </button>
      </div>
    </div>
  )
}

export default CreateContract
