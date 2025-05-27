// src/service/ZkLoginTransactionService.ts
import { Transaction } from '@mysten/sui/transactions'
import { SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { jwtDecode } from 'jwt-decode'
import {
  requestZkLoginProof,
  createZkLoginSignature,
  restoreEphemeralKeyAndRandomness,
  getZkAddress,
} from './SuiZkLoginService'

/**
 * Signs and executes a transaction using zkLogin credentials
 *
 * @param transaction - The transaction to execute
 * @param suiClient - SUI client instance
 * @returns The transaction response
 */
export const signAndExecuteTransactionWithZkLogin = async (
  transaction: Transaction,
  suiClient: SuiClient,
) => {
  try {
    console.log('Starting zkLogin transaction signing process...')

    // Get the stored JWT token from session storage
    const idToken = sessionStorage.getItem('id-token')
    if (!idToken) {
      throw new Error('No JWT token found. Please login again.')
    }

    const decodedJwt = jwtDecode<any>(idToken)
    console.log(
      'JWT decoded - issuer:',
      decodedJwt.iss,
      'subject type:',
      typeof decodedJwt.sub,
    )

    // Check if the JWT is expired
    if (decodedJwt.exp && Date.now() >= decodedJwt.exp * 1000) {
      console.error('JWT token has expired', {
        expiry: new Date(decodedJwt.exp * 1000),
        now: new Date(),
      })
      throw new Error('Your login session has expired. Please log in again.')
    }

    // Restore the ephemeral key and randomness that was used during login
    const { ephemeralKeypair, randomness, maxEpoch } =
      restoreEphemeralKeyAndRandomness()
    console.log('Restored ephemeral key and randomness, maxEpoch:', maxEpoch)

    // Get the stored salt from server
    const salt = await fetchSaltFromSessionOrServer(
      decodedJwt.iss,
      decodedJwt.sub,
    )
    console.log('Retrieved salt for address derivation')

    // Build the transaction block
    // For zkLogin, we need to explicitly set the sender as the zkLogin address
    const zkLoginAddress = sessionStorage.getItem('zklogin-address')
    if (!zkLoginAddress) {
      throw new Error('Failed to retrieve zkLogin address')
    }

    // Verify the stored address matches what we would derive from current JWT and salt
    // This catches cases where the session data might be out of sync
    if (!verifyZkLoginAddress(idToken, salt, zkLoginAddress)) {
      console.error(
        'zkLogin address verification failed - session may be corrupted',
      )
      throw new Error(
        'Authentication session is invalid. Please log out and login again.',
      )
    }

    // Set the sender address to the zkLogin address - IMPORTANT: Must use setSender explicitly
    console.log(
      `Setting transaction sender to zkLogin address: ${zkLoginAddress}`,
    )
    transaction.setSender(zkLoginAddress)
    // Build the transaction block bytes
    console.log('Signing transaction with ephemeral keypair...')
    let txBytes
    let userSignature: string
    try {
      const signResult = await transaction.sign({
        client: suiClient,
        signer: ephemeralKeypair,
      })
      txBytes = signResult.bytes
      userSignature = signResult.signature
      console.log('Transaction signed successfully with ephemeral key')
    } catch (signError) {
      console.error('Error signing transaction with ephemeral key:', signError)
      throw new Error(
        `Failed to sign transaction: ${signError instanceof Error ? signError.message : String(signError)}`,
      )
    }

    // Request zkLogin proof from Mysten Labs prover service
    console.log('Requesting zkLogin proof from prover service...')
    let zkProof
    try {
      zkProof = await requestZkLoginProof(
        idToken,
        ephemeralKeypair,
        maxEpoch,
        randomness,
        salt,
      )
      console.log('Received zkLogin proof successfully')
    } catch (error: unknown) {
      console.error('Failed to get zkLogin proof:', error)
      throw new Error(
        `Failed to get zkLogin proof: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    // Create the zkLogin signature
    console.log('Creating zkLogin signature...')
    let zkLoginSignature
    try {
      zkLoginSignature = createZkLoginSignature(
        decodedJwt,
        salt,
        zkProof.proofPoints,
        zkProof.issBase64Details.value,
        zkProof.issBase64Details.indexMod4,
        zkProof.headerBase64,
        maxEpoch,
        userSignature,
      )
      console.log('zkLogin signature created successfully')
    } catch (error: unknown) {
      console.error('Failed to create zkLogin signature:', error)
      throw new Error(
        `Failed to create zkLogin signature: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    // Execute the transaction with the zkLogin signature
    console.log('Executing transaction with zkLogin signature...')
    try {
      const response = await suiClient.executeTransactionBlock({
        transactionBlock: txBytes,
        signature: zkLoginSignature,
        options: {
          showEffects: true,
          showEvents: true,
        },
      })

      console.log('Transaction executed successfully!')
      return response
    } catch (error: unknown) {
      console.error('Transaction execution failed:', error)

      // Add detailed error information to help with debugging
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String(error.message)
        if (errorMessage.includes('Invalid user signature')) {
          console.error(
            'This is likely an issue with the zkLogin authentication. Check the salt, JWT, or signature generation.',
          )
        }
      }

      throw error
    }
  } catch (error: unknown) {
    console.error('Error signing transaction with zkLogin:', error)
    throw error
  }
}

/**
 * Verifies that the stored zkLogin address matches the one that would be derived
 * from the current JWT and salt. This helps detect cases where authentication data
 * might be corrupted.
 */
const verifyZkLoginAddress = (
  jwt: string,
  salt: string,
  storedAddress: string,
): boolean => {
  try {
    const derivedAddress = getZkAddress(jwt, salt)
    const matches = derivedAddress === storedAddress

    if (!matches) {
      console.error(
        'Address mismatch detected!',
        '\nStored:',
        storedAddress,
        '\nDerived:',
        derivedAddress,
      )
    }

    return matches
  } catch (error) {
    console.error('Failed to verify zkLogin address:', error)
    return false
  }
}

/**
 * Fetches salt either from session storage or from the backend API
 */
const fetchSaltFromSessionOrServer = async (
  issuer: string,
  subject: string,
): Promise<string> => {
  // Try to get salt from session storage first
  const saltFromSession = sessionStorage.getItem('zklogin-salt')

  if (saltFromSession) {
    console.log('Using salt from session storage')
    return saltFromSession
  }

  console.log('Salt not found in session storage, fetching from server...')
  // If not found, fetch from server
  const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL

  try {
    if (!BACKEND_API_URL) {
      throw new Error(
        'Backend API URL not configured. Set VITE_BACKEND_API_URL in environment.',
      )
    }

    console.log(
      `Fetching salt from ${BACKEND_API_URL}/salt for subject: ${subject.substring(0, 5)}...`,
    )
    const response = await fetch(`${BACKEND_API_URL}/salt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iss: issuer, sub: subject }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch salt: ${response.status} ${errorText}`)
    }

    const data = await response.json()

    if (!data.salt) {
      throw new Error('Salt not found in server response')
    }

    const { salt } = data
    console.log('Retrieved salt from server successfully')

    // Store for future use
    sessionStorage.setItem('zklogin-salt', salt)

    return salt
  } catch (error) {
    console.error('Salt fetching error:', error)
    throw new Error(
      `Failed to fetch salt: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
