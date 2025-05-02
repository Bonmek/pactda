import { generateRandomness } from '@mysten/sui/zklogin'
import React, { useEffect, useState } from 'react'
import { SuiClient } from '@mysten/sui/client'
import { generateNonceAndStore, createEphemeralKey } from '../../service/SuiZkLoginService'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI
const FULLNODE_URL = import.meta.env.VITE_SUI_FULLNODE_URL

const ZkloginWalletCard: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null)
  const suiClient = new SuiClient({ url: FULLNODE_URL })

  const prepareLogin = async () => {
    const ephemeralKeypair = createEphemeralKey()
    const randomness = generateRandomness()

    const { epoch } = await suiClient.getLatestSuiSystemState()
    const maxEpoch = Number(epoch) + 2

    const nonce = generateNonceAndStore(
      ephemeralKeypair,
      maxEpoch,
      randomness,
    )

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&response_type=id_token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20email&nonce=${nonce}`
    window.location.href = authUrl
  }

  const handleLogout = () => {
    localStorage.removeItem('zklogin-address')
    setAddress(null)
  }

  useEffect(() => {
    const storedAddress = localStorage.getItem('zklogin-address')
    if (storedAddress) {
      setAddress(storedAddress)
    }
  }, [])

  return (
    <div className="border border-gray-700 rounded-3xl p-8 w-96 flex flex-col items-center shadow-xl bg-gray-800 hover:shadow-2xl transition">
      <h2 className="text-2xl font-semibold text-blue-400 mb-6">zkLogin Wallet</h2>
      {!address ? (
        <button
          onClick={prepareLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
        >
          Login with Google
        </button>
      ) : (
        <>
          <div className="mt-6 flex flex-col items-center text-gray-300 w-full">
            <p className="text-sm font-medium mb-2">Connected Address:</p>
            <div className="w-full p-3 bg-gray-900 border border-blue-600 rounded-xl text-center break-words text-xs font-mono">
              {address}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-medium py-2 rounded-lg mt-6 transition"
          >
            Logout
          </button>
        </>
      )}
    </div>
  )
}

export default ZkloginWalletCard
