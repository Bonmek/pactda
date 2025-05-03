// src/services/googleAuth.ts
import { SuiClient } from '@mysten/sui/client'
import { jwtDecode } from 'jwt-decode'
import { createEphemeralKey, generateNonceAndStore } from './SuiZkLoginService'
import { generateRandomness } from '@mysten/sui/zklogin'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI
const FULLNODE_URL = import.meta.env.VITE_SUI_FULLNODE_URL
const suiClient = new SuiClient({ url: FULLNODE_URL })

export const loginWithGoogle = async () => {
  const ephemeralKeypair = createEphemeralKey()
  const randomness = generateRandomness()

  const { epoch } = await suiClient.getLatestSuiSystemState()
  const maxEpoch = Number(epoch) + 2

  const nonce = generateNonceAndStore(ephemeralKeypair, maxEpoch, randomness)

  const authUrl = generateGoogleLoginUrl(nonce, CLIENT_ID, REDIRECT_URI)
  window.location.href = authUrl
}

export const logoutGoogle = () => {
    sessionStorage.removeItem('ephemeral-private-key')
    sessionStorage.removeItem('jwt-randomness')
    sessionStorage.removeItem('google-id-token')
    sessionStorage.removeItem('zklogin-address')
    localStorage.removeItem('login-nonce')
    localStorage.removeItem('login-maxEpoch')
}

export const setGoogleAddress = (zkLoginUserAddress: string) => {
    sessionStorage.setItem('zklogin-address', zkLoginUserAddress)
}

export const getGoogleAddress = ():string | null => {
   return sessionStorage.getItem('zklogin-address')
}

export const generateGoogleLoginUrl = (
  nonce: string,
  clientId: string,
  redirectUri: string,
): string => {
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=id_token&redirect_uri=${encodeURIComponent(
    redirectUri,
  )}&scope=openid%20email&nonce=${nonce}`
}

export const parseIdTokenFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.hash.substring(1))
  return urlParams.get('id_token')
}

export const decodeIdToken = (idToken: string): JwtPayload => {
  return jwtDecode<JwtPayload>(idToken)
}
