import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'
import {
  jwtToAddress,
  getExtendedEphemeralPublicKey,
  genAddressSeed,
  getZkLoginSignature,
} from '@mysten/sui/zklogin'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { SuiClient, CoinBalance } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import {
  parseIdTokenFromUrl,
  decodeIdToken,
} from '../../service/GoogleAuthService'
import {
  restoreEphemeralKeyAndRandomness,
  fetchSalt,
} from '../../service/SuiZkLoginService'

const suiClient = new SuiClient({
  url: import.meta.env.VITE_SUI_FULLNODE_URL,
})

const GoogleCallback = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const idToken = parseIdTokenFromUrl()

        if (!idToken) throw new Error('Missing id_token in URL')

        sessionStorage.setItem('jwt-randomness',idToken)

        const decodedJwt = decodeIdToken(idToken)

        const salt = await fetchSalt(decodedJwt.iss, decodedJwt.sub)

        const zkLoginUserAddress = jwtToAddress(idToken, salt)

        localStorage.setItem('zklogin-address', zkLoginUserAddress)

        setTimeout(() => {
          navigate('/') 
        }, 2000)
      } catch (err: any) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div>
      {loading && <p> Logging you in via Google...</p>}
      {error && <p style={{ color: 'red' }}>❌ {error}</p>}
    </div>
  )
}

export default GoogleCallback
