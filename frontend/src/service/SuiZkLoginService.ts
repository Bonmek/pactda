// src/services/suiZkLogin.ts
import {
    generateNonce,
    generateRandomness,
    jwtToAddress,
    genAddressSeed,
    getExtendedEphemeralPublicKey,
    getZkLoginSignature,
  } from '@mysten/sui/zklogin'
  import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
  import axios from 'axios'
  
  export const createEphemeralKey = (): Ed25519Keypair => {
    return new Ed25519Keypair()
  }
  
  export const generateNonceAndStore = (
    ephemeralKey: Ed25519Keypair,
    maxEpoch: number,
    randomness: string
  ): string => {
    const nonce = generateNonce(ephemeralKey.getPublicKey(), maxEpoch, randomness)
    sessionStorage.setItem('ephemeral-private-key', ephemeralKey.getSecretKey())
    sessionStorage.setItem('jwt-randomness', randomness)
    localStorage.setItem('login-nonce', nonce)
    localStorage.setItem('login-maxEpoch', maxEpoch.toString())
    return nonce
  }
  
  export const restoreEphemeralKeyAndRandomness = () => {
    const sk = sessionStorage.getItem('ephemeral-private-key')
    const randStr = sessionStorage.getItem('jwt-randomness')
    const maxEpoch = localStorage.getItem('login-maxEpoch')
    const nonce = localStorage.getItem('login-nonce')
  
    if (!sk || !randStr || !maxEpoch || !nonce) throw new Error('Missing session data')
  
    return {
      ephemeralKeypair: Ed25519Keypair.fromSecretKey(sk),
      randomness: randStr,
      maxEpoch: Number(maxEpoch),
      nonce,
    }
  }
  
  export const requestZkLoginProof = async (
    idToken: string,
    ephemeralKey: Ed25519Keypair,
    maxEpoch: number,
    randomness: bigint,
    salt: string
  ) => {
    const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
      ephemeralKey.getPublicKey(),
    )
  
    const res = await axios.post(
      'https://prover-dev.mystenlabs.com/v1',
      {
        jwt: idToken,
        extendedEphemeralPublicKey,
        maxEpoch: maxEpoch.toString(),
        jwtRandomness: randomness.toString(),
        salt,
        keyClaimName: 'sub',
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
  
    return res.data
  }
  
  export const getZkAddress = (idToken: string, salt: string): string => {
    return jwtToAddress(idToken, salt)
  }
  
  export const createZkLoginSignature = (
    decodedJwt: JwtPayload,
    salt: string,
    proofPoints: any,
    issBase64Value: string,
    issBase64IndexMod4: number,
    headerBase64: string,
    maxEpoch: number,
    userSignature: string
  ) => {
    const addressSeed = genAddressSeed(
      salt,
      'sub',
      decodedJwt.sub,
      decodedJwt.aud,
    ).toString()
  
    return getZkLoginSignature({
      inputs: {
        proofPoints,
        issBase64Details: {
            value : issBase64Value,
            indexMod4: issBase64IndexMod4
        },
        headerBase64,
        addressSeed,
      },
      maxEpoch,
      userSignature,
    })
  }
  
export const fetchSalt = async (iss: string, sub: string): Promise<string> => {
    const response = await fetch('https://sui-zklogin-salt-api.vercel.app/api/salt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iss, sub }),
    })
  
    if (!response.ok) {
      throw new Error('Failed to fetch salt.')
    }
  
    const { salt } = await response.json()
    return salt
  }