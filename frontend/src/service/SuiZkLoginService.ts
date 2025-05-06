// src/services/suiZkLogin.ts
import {
  generateNonce,
  jwtToAddress,
  genAddressSeed,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
} from '@mysten/sui/zklogin'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL

// --- Utility to create a new ephemeral Ed25519 keypair ---
export const createEphemeralKey = (): Ed25519Keypair => {
  return new Ed25519Keypair()
}

// --- SessionStorage Functions ---

// Store the ephemeral private key in sessionStorage (as base64 string)
const setEphemeralPrivateKey = (key: Ed25519Keypair) => {
  sessionStorage.setItem('ephemeral-private-key', key.getSecretKey())
}

// Retrieve the ephemeral private key from sessionStorage and decode it
const getEphemeralPrivateKey = (): Uint8Array => {
  const value = sessionStorage.getItem('ephemeral-private-key')
  if (!value) throw new Error('Missing ephemeral private key')
  return Uint8Array.from(Buffer.from(value, 'base64'))
}

// Store JWT randomness in sessionStorage
const setJwtRandomness = (randomness: string) => {
  sessionStorage.setItem('jwt-randomness', randomness)
}

// Retrieve JWT randomness from sessionStorage
const getJwtRandomness = (): string => {
  const value = sessionStorage.getItem('jwt-randomness')
  if (!value) throw new Error('Missing jwt randomness')
  return value
}

// --- LocalStorage Functions ---

// Store the login nonce in localStorage
const setLoginNonce = (nonce: string) => {
  localStorage.setItem('login-nonce', nonce)
}

// Retrieve the login nonce from localStorage
const getLoginNonce = (): string => {
  const value = localStorage.getItem('login-nonce')
  if (!value) throw new Error('Missing login nonce')
  return value
}

// Store the maxEpoch value in localStorage
const setLoginMaxEpoch = (epoch: number) => {
  localStorage.setItem('login-maxEpoch', epoch.toString())
}

// Retrieve the maxEpoch value from localStorage
const getLoginMaxEpoch = (): number => {
  const value = localStorage.getItem('login-maxEpoch')
  if (!value) throw new Error('Missing login maxEpoch')
  return Number(value)
}

// Generate a nonce using ephemeral key, maxEpoch, and randomness
// and persist all required data to session/local storage
export const generateNonceAndStore = (
  ephemeralKey: Ed25519Keypair,
  maxEpoch: number,
  randomness: string,
): string => {
  const nonce = generateNonce(ephemeralKey.getPublicKey(), maxEpoch, randomness)

  setEphemeralPrivateKey(ephemeralKey)
  setJwtRandomness(randomness)
  setLoginNonce(nonce)
  setLoginMaxEpoch(maxEpoch)

  return nonce
}

// Restore all previously stored zkLogin session data
export const restoreEphemeralKeyAndRandomness = () => {
  const sk = getEphemeralPrivateKey()
  const randStr = getJwtRandomness()
  const maxEpoch = getLoginMaxEpoch()
  const nonce = getLoginNonce()

  return {
    ephemeralKeypair: Ed25519Keypair.fromSecretKey(sk),
    randomness: randStr,
    maxEpoch,
    nonce,
  }
}

/**
 * Parse the `id_token` from the OAuth2 callback URL fragment
 */
export const parseIdTokenFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.hash.substring(1))
  return urlParams.get('id_token')
}

/**
 * Decode the JWT `id_token`
 */
export const decodeIdToken = (idToken: string): JwtPayload => {
  return jwtDecode<JwtPayload>(idToken)
}

/**
 * Retrieve the zkLogin Sui address stored in sessionStorage
 */
export const getZkloginAddress = (): string | null => {
  return sessionStorage.getItem('zklogin-address')
}

/**
 * Store the zkLogin-derived Sui address from ID token
 */
export const setZkloginAddress = (zkLoginUserAddress: string) => {
  sessionStorage.setItem('zklogin-address', zkLoginUserAddress)
}

/**
 * Clears sessionStorage and zkLogin-related data for logout
 */
export const logoutZklogin = () => {
  sessionStorage.removeItem('id-token')
  clearZkLoginStorage()
}

// Clear all zkLogin-related data from local and session storage
export const clearZkLoginStorage = () => {
  sessionStorage.removeItem('ephemeral-private-key')
  sessionStorage.removeItem('jwt-randomness')
  sessionStorage.removeItem('zklogin-address')
  localStorage.removeItem('login-nonce')
  localStorage.removeItem('login-maxEpoch')
}

// Call Mysten Labs' zkLogin prover to request proof for the JWT token
export const requestZkLoginProof = async (
  idToken: string,
  ephemeralKey: Ed25519Keypair,
  maxEpoch: number,
  randomness: bigint,
  salt: string,
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

// Derive zkLogin Sui address from the JWT and salt
export const getZkAddress = (idToken: string, salt: string): string => {
  return jwtToAddress(idToken, salt)
}

// Generate the zkLogin signature to be used for authenticating transactions on Sui
export const createZkLoginSignature = (
  decodedJwt: JwtPayload,
  salt: string,
  proofPoints: any,
  issBase64Value: string,
  issBase64IndexMod4: number,
  headerBase64: string,
  maxEpoch: number,
  userSignature: string,
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
        value: issBase64Value,
        indexMod4: issBase64IndexMod4,
      },
      headerBase64,
      addressSeed,
    },
    maxEpoch,
    userSignature,
  })
}

// Fetch the salt value (used in address derivation) from your backend using issuer and subject
export const fetchSalt = async (iss: string, sub: string): Promise<string> => {
  const response = await fetch(`${BACKEND_API_URL}/salt`, {
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
