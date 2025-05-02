// src/services/googleAuth.ts
import { jwtDecode } from 'jwt-decode'

export const generateGoogleLoginUrl = (
  nonce: string,
  clientId: string,
  redirectUri: string
): string => {
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=id_token&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=openid%20email&nonce=${nonce}`
}

export const parseIdTokenFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.hash.substring(1))
  return urlParams.get('id_token')
}

export const decodeIdToken = (idToken: string): JwtPayload => {
  return jwtDecode<JwtPayload>(idToken)
}

