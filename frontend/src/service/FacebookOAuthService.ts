import { createEphemeralKey, generateNonceAndStore } from './SuiZkLoginService'
import { generateRandomness } from '@mysten/sui/zklogin'
import { SuiClient } from '@mysten/sui/client'

const CLIENT_ID = import.meta.env.VITE_FACEBOOK_APP_ID
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI

/**
 * Start the Facebook login flow using zkLogin:
 * - Generate ephemeral key
 * - Generate randomness and nonce
 * - Store all zkLogin-related values
 * - Redirect to Facebook OAuth with generated nonce
 */
export const loginWithFacebook = async (suiClient: SuiClient) => {
  const ephemeralKeypair = createEphemeralKey()
  const randomness = generateRandomness()

  const { epoch } = await suiClient.getLatestSuiSystemState()
  const maxEpoch = Number(epoch) + 2

  const nonce = generateNonceAndStore(ephemeralKeypair, maxEpoch, randomness)

  const authUrl = generateFacebookLoginUrl(nonce, CLIENT_ID, REDIRECT_URI)
  window.location.href = authUrl
}

/**
 * Generate Facebook OAuth2 login URL with proper scopes and nonce
 */
export const generateFacebookLoginUrl = (
  nonce: string,
  clientId: string,
  redirectUri: string,
): string => {
  return `https://www.facebook.com/v17.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri,
  )}&scope=openid&nonce=${nonce}&response_type=id_token`
}
