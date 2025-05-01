import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import {
  generateNonce,
  generateRandomness,
  jwtToAddress,
  genAddressSeed,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
} from '@mysten/sui/zklogin'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { CoinBalance, SuiClient } from '@mysten/sui/client'

// ---- CONFIG ----
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI
const FULLNODE_URL = import.meta.env.VITE_SUI_FULLNODE_URL

interface MyJwtPayload {
  iss: string
  sub: string
  aud: string
  nonce: string
  exp?: number
  iat?: number
  [key: string]: any
}

const PactdaGoogleLogin: React.FC = () => {
  const [nonce, setNonce] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<CoinBalance | null>(null)
  const suiClient = new SuiClient({ url: FULLNODE_URL })

  const getSuiBalance = async (address: string) => {
    const balance = await suiClient.getBalance({
      owner: address,
      coinType: '0x2::sui::SUI',
    })
    setBalance(balance)
  }

  const prepareLogin = async () => {
    const ephemeralKeypair = new Ed25519Keypair()
    const randomness = generateRandomness()

    const { epoch } = await suiClient.getLatestSuiSystemState()
    const maxEpoch = Number(epoch) + 2

    const n = generateNonce(
      ephemeralKeypair.getPublicKey(),
      maxEpoch,
      randomness,
    )

    // Save for later use
    sessionStorage.setItem(
      'ephemeral-private-key',
      ephemeralKeypair.getSecretKey(),
    )
    sessionStorage.setItem('jwt-randomness', randomness.toString())
    localStorage.setItem('login-nonce', n)
    localStorage.setItem('login-maxEpoch', maxEpoch.toString())
    setNonce(n)

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&response_type=id_token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20email&nonce=${n}`
    window.location.href = authUrl

    // Redirect to Google login
  }

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.hash.substring(1))
      const idToken = urlParams.get('id_token')

      if (!idToken) return

      try {
        const ephemeralPrivateKeyHex = sessionStorage.getItem(
          'ephemeral-private-key',
        )
        const randomnessStr = sessionStorage.getItem('jwt-randomness')
        const storedNonce = localStorage.getItem('login-nonce')
        const storedMaxEpoch = localStorage.getItem('login-maxEpoch')

        if (
          !ephemeralPrivateKeyHex ||
          !randomnessStr ||
          !storedNonce ||
          !storedMaxEpoch
        ) {
          throw new Error('Missing login session data.')
        }

        const ephemeralKeypair = Ed25519Keypair.fromSecretKey(
          ephemeralPrivateKeyHex,
        )

        console.log(ephemeralKeypair)
        const randomness = BigInt(randomnessStr)
        const maxEpoch = Number(storedMaxEpoch)

        const decodedJwt = jwtDecode<MyJwtPayload>(idToken)

        if (decodedJwt.nonce !== storedNonce) {
          throw new Error('Nonce mismatch.')
        }

        const suiClient = new SuiClient({ url: FULLNODE_URL })

        // Fetch salt
        const saltResponse = await fetch(
          'https://sui-zklogin-salt-api.vercel.app/api/salt',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              iss: decodedJwt.iss,
              sub: decodedJwt.sub,
            }),
          },
        )

        if (!saltResponse.ok) throw new Error('Failed to fetch salt.')

        const { salt } = await saltResponse.json()

        const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
          ephemeralKeypair.getPublicKey(),
        )

        const proverResponse = await axios.post(
          'https://prover-dev.mystenlabs.com/v1',
          {
            jwt: idToken,
            extendedEphemeralPublicKey,
            maxEpoch: maxEpoch.toString(),
            jwtRandomness: randomness.toString(),
            salt: salt,
            keyClaimName: 'sub',
          },
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )

        const { proofPoints, issBase64Details, headerBase64 } =
          proverResponse.data

        // Step 1. Generate zkLoginUserAddress (useful for sending transaction)
        const zkLoginUserAddress = jwtToAddress(idToken, salt)
        console.log('zkLogin User Address:', zkLoginUserAddress)

        setAddress(zkLoginUserAddress)

        const coins = await suiClient.getCoins({
          owner: zkLoginUserAddress,
          coinType: '0x2::sui::SUI',
        })

        getSuiBalance(zkLoginUserAddress)
        console.log('coins:', coins)
        if (!coins || coins.data.length === 0) {
          throw new Error('No SUI coins found for gas.')
        }

        const txb = new Transaction()

        txb.setSender(zkLoginUserAddress)

        const { bytes, signature: userSignature } = await txb.sign({
          client: suiClient,
          signer: ephemeralKeypair,
        })

        // 3. Assemble zkLogin Signature
        const addressSeed = genAddressSeed(
          salt,
          'sub',
          decodedJwt.sub,
          decodedJwt.aud,
        ).toString()

        const zkLoginSignature = getZkLoginSignature({
          inputs: {
            proofPoints,
            issBase64Details,
            headerBase64,
            addressSeed,
          },
          maxEpoch,
          userSignature,
        })

        // 4. Submit transaction
        const result = await suiClient.executeTransactionBlock({
          transactionBlock: bytes,
          signature: zkLoginSignature,
        })

        getSuiBalance(zkLoginUserAddress)

        console.log('Transaction Result:', result)
      } catch (error) {
        console.error('OAuth Callback Error:', error)
      }
    }

    if (window.location.pathname === '/') {
      handleOAuthCallback()
    }
  }, [])

  return (
    <div>
      {address && <div>address : {address}</div>}
      {balance && <div>balance: {balance?.totalBalance}</div>}
      <button onClick={prepareLogin}>Login with Google</button>
    </div>
  )
}

export default PactdaGoogleLogin
