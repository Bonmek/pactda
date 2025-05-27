import * as anchor from '@coral-xyz/anchor'
import {
  Connection,
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import bs58 from 'bs58'
import { PactDaContract } from '@/@types/PactDaContract'
import { BufferPolyfill } from '@/utils/buffer-polyfill'
import PactdaSolIDL from '../idl/pactda_sol.json'
import { getCrossChainInfo } from './PactdaService'

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = BufferPolyfill as any
}

export const PACTDA_PROGRAM_ID = new PublicKey(
  '4KuTWVUXcvrvoDvGqoBeivSAisXo8cQz8WA5P5GZRvgq',
)

// Action type constants for cross-chain messages
export const SUI_ACTIONS = {
  SIGN_CONTRACT: 10,
  SUBMIT_PROOF: 11,
} as const

// Fallback RPC endpoints for better reliability
const FALLBACK_RPC_ENDPOINTS = [
  'https://api.testnet.solana.com',
  'https://testnet.helius-rpc.com/?api-key=public',
  'https://solana-testnet.g.alchemy.com/v2/demo',
  'https://rpc.ankr.com/solana_testnet',
]

const SOLANA_RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_RPC_URL || FALLBACK_RPC_ENDPOINTS[1] // Use Helius public endpoint as default

export class SolanaService {
  private connection: Connection
  private sponsorKeypair?: Keypair
  private currentRpcIndex: number = 0
  constructor() {
    this.connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed')
  }

  /**
   * Try to connect to a working RPC endpoint
   */
  private async tryFallbackRpc(): Promise<void> {
    const originalEndpoint = this.connection.rpcEndpoint

    for (let i = 0; i < FALLBACK_RPC_ENDPOINTS.length; i++) {
      try {
        const endpoint = FALLBACK_RPC_ENDPOINTS[i]
        console.log(`Trying RPC endpoint: ${endpoint}`)

        const testConnection = new Connection(endpoint, 'confirmed')
        // Test the connection with a simple call
        await testConnection.getLatestBlockhash()

        // If successful, update the connection
        this.connection = testConnection
        this.currentRpcIndex = i
        console.log(`Successfully connected to RPC: ${endpoint}`)
        return
      } catch (error) {
        console.warn(
          `Failed to connect to ${FALLBACK_RPC_ENDPOINTS[i]}:`,
          error,
        )
        continue
      }
    }

    throw new Error(
      'All RPC endpoints failed. Please check your network connection or try again later.',
    )
  }

  public initializeSponsor(sponsorPrivateKeyBase58?: string): void {
    const privateKey =
      sponsorPrivateKeyBase58 || import.meta.env.VITE_SOLANA_SPONSOR_PRIVATE_KEY

    if (!privateKey) {
      console.warn(
        'No Solana sponsor private key provided. Sponsored transactions will not be available.',
      )
      return
    }

    try {
      let secretKey: Uint8Array

      if (privateKey.startsWith('[') && privateKey.endsWith(']')) {
        const arrayStr = privateKey.slice(1, -1) // Remove brackets
        const keyArray = arrayStr
          .split(',')
          .map((num: string) => parseInt(num.trim()))
        secretKey = new Uint8Array(keyArray)
        console.log('Parsed array format private key')
      } else if (privateKey.includes(',')) {
        const keyArray = privateKey
          .split(',')
          .map((num: string) => parseInt(num.trim()))
        secretKey = new Uint8Array(keyArray)
        console.log('Parsed comma-separated format private key')
      } else {
        secretKey = bs58.decode(privateKey)
        console.log('Parsed base58 format private key')
      }

      this.sponsorKeypair = Keypair.fromSecretKey(secretKey)
    } catch (error) {
      console.error('Error loading sponsor keypair:', error)
      throw new Error(
        'Invalid sponsor private key format. Please ensure it is in base58 format or array format [162,232,...].',
      )
    }
  }

  /**
   * Check if sponsored transactions are available
   */
  public isSponsorAvailable(): boolean {
    return !!this.sponsorKeypair
  }
  /**
   * Check sponsor wallet balance
   */
  public async checkSponsorBalance(): Promise<{
    isBalanceSufficient: boolean
    balanceInSol: number
    publicKey: string
  }> {
    if (!this.sponsorKeypair) {
      throw new Error('Sponsor wallet not initialized')
    }

    try {
      const balance = await this.connection.getBalance(
        this.sponsorKeypair.publicKey,
      )
      const balanceInSol = balance / LAMPORTS_PER_SOL
      const minimumLamports = 0.05 * LAMPORTS_PER_SOL // Minimum 0.05 SOL

      return {
        isBalanceSufficient: balance >= minimumLamports,
        balanceInSol,
        publicKey: this.sponsorKeypair.publicKey.toString(),
      }
    } catch (error) {
      console.warn(
        'Failed to get balance from current RPC endpoint, trying fallbacks...',
      )
      await this.tryFallbackRpc()

      // Retry with new connection
      const balance = await this.connection.getBalance(
        this.sponsorKeypair.publicKey,
      )
      const balanceInSol = balance / LAMPORTS_PER_SOL
      const minimumLamports = 0.05 * LAMPORTS_PER_SOL // Minimum 0.05 SOL

      return {
        isBalanceSufficient: balance >= minimumLamports,
        balanceInSol,
        publicKey: this.sponsorKeypair.publicKey.toString(),
      }
    }
  } /**
   * Create a sponsored Solana stub for a PactDa contract
   * This creates an actual transaction on Solana blockchain
   * Accepts an optional stubId for deterministic cross-chain flows
   */
  public async createSponsoredStub(
    userPublicKeyStr: string,
    contract: PactDaContract,
    stubId?: number,
  ): Promise<{ signature: string; solanaStubId: number }> {
    if (!this.sponsorKeypair) {
      throw new Error(
        'Sponsor keypair not loaded. Call initializeSponsor first.',
      )
    }

    try {
      const balanceInfo = await this.checkSponsorBalance()

      if (!balanceInfo.isBalanceSufficient) {
        throw new Error(
          `Insufficient sponsor wallet balance. Current: ${balanceInfo.balanceInSol.toFixed(4)} SOL, ` +
            `Required: at least 0.05 SOL. Please fund the sponsor wallet: ${balanceInfo.publicKey}`,
        )
      }
      // Use deterministic stubId if provided, else derive from contract.objectId
      let solanaStubId: number
      if (typeof stubId === 'number') {
        solanaStubId = stubId
      } else {
        const contractIdBytes = new TextEncoder().encode(contract.objectId)
        let hash = 0
        for (let i = 0; i < contractIdBytes.length; i++) {
          hash = ((hash << 5) - hash + contractIdBytes[i]) & 0xffffffff
        }
        solanaStubId = Math.abs(hash) % 1000000
      }

      let userPublicKey: PublicKey
      if (!userPublicKeyStr || userPublicKeyStr.trim() === '') {
        userPublicKey = this.sponsorKeypair.publicKey
        console.log('Using sponsor wallet as default user for stub creation')
      } else if (userPublicKeyStr.startsWith('0x')) {
        userPublicKey = this.sponsorKeypair.publicKey
        console.log(
          'Detected Sui address, using sponsor wallet for Solana stub creation',
        )
      } else {
        try {
          userPublicKey = new PublicKey(userPublicKeyStr)
        } catch (error) {
          userPublicKey = this.sponsorKeypair.publicKey
          console.log(
            'Failed to parse user address as Solana public key, using sponsor wallet',
          )
        }
      }

      // Always use sponsor keypair as the initiator for PDA derivation
      const initiatorPublicKey = this.sponsorKeypair.publicKey
      const stubIdBuffer = new Uint8Array(8)
      new DataView(stubIdBuffer.buffer).setBigUint64(
        0,
        BigInt(solanaStubId),
        true,
      ) // little-endian

      const seeds = [
        new TextEncoder().encode('pactda_stub_v1'),
        initiatorPublicKey.toBytes(),
        stubIdBuffer,
      ]
      const [stubPda] = PublicKey.findProgramAddressSync(
        seeds,
        PACTDA_PROGRAM_ID,
      )
      console.log('Solana stub details:', {
        programId: PACTDA_PROGRAM_ID.toString(),
        stubPda: stubPda.toString(),
        sponsor: this.sponsorKeypair.publicKey.toString(),
        initiatorPublicKey: initiatorPublicKey.toString(),
        userPublicKey: userPublicKeyStr,
        solanaStubId,
      }) // Create instruction data manually to avoid Anchor browser compatibility issues
      const instructionData = this.createInitializeStubDirectInstructionData(
        solanaStubId,
        contract.objectId,
        contract.title,
        contract.metadata || `Contract: ${contract.title}`,
        `https://pactda.com/contract/${contract.objectId}`,
      )

      const instruction = new TransactionInstruction({
        keys: [
          {
            pubkey: stubPda,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: this.sponsorKeypair.publicKey,
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: PACTDA_PROGRAM_ID,
        data: Buffer.from(instructionData),
      })

      const transaction = new Transaction().add(instruction)

      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = this.sponsorKeypair.publicKey

      transaction.sign(this.sponsorKeypair)
      console.log('Sending transaction to Solana...')

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.sponsorKeypair],
        {
          commitment: 'confirmed',
          skipPreflight: false,
        },
      )

      console.log('Solana stub creation completed successfully!')
      console.log('Stub ID:', solanaStubId)
      console.log('Transaction signature:', signature)
      console.log('Stub PDA:', stubPda.toString())

      return {
        signature,
        solanaStubId,
      }
    } catch (error) {
      console.error('Error creating sponsored Solana stub:', error)

      // Enhanced error handling for SendTransactionError
      if (error && typeof error === 'object' && 'getLogs' in error) {
        try {
          const logs = (error as any).getLogs()
          console.error('Transaction logs:', logs)
        } catch (logError) {
          console.error('Could not get transaction logs:', logError)
        }
      }

      // Check for common error patterns
      let errorMessage = error instanceof Error ? error.message : String(error)

      if (
        errorMessage.includes(
          'Attempt to debit an account but found no record of a prior credit',
        )
      ) {
        errorMessage = `Insufficient funds in sponsor wallet. Please fund the sponsor wallet: ${this.sponsorKeypair?.publicKey.toString()}`
      } else if (errorMessage.includes('Simulation failed')) {
        errorMessage = `Transaction simulation failed. This might be due to insufficient funds or program errors. ${errorMessage}`
      }

      throw new Error(`Failed to create Solana stub: ${errorMessage}`)
    }
  } /**
   * Create instruction data manually for initializeStubDirect
   * This avoids Anchor compatibility issues in the browser
   */
  private createInitializeStubDirectInstructionData(
    solanaStubId: number,
    suiContractIdentifier: string,
    title: string,
    description: string,
    pactdaUrl: string,
  ): Uint8Array {
    // Correct discriminator for "initialize_stub_direct" function
    // Calculated using sha256("global:initialize_stub_direct")
    const discriminator = [43, 144, 132, 215, 252, 194, 154, 168] // 0x2b, 0x90, 0x84, 0xd7, 0xfc, 0xc2, 0x9a, 0xa8

    // Create buffers for each parameter
    const stubIdBuffer = new ArrayBuffer(8)
    new DataView(stubIdBuffer).setBigUint64(0, BigInt(solanaStubId), true) // little-endian

    // String encoding with length prefix (Borsh format)
    const suiContractBytes = new TextEncoder().encode(suiContractIdentifier)
    const titleBytes = new TextEncoder().encode(title)
    const descriptionBytes = new TextEncoder().encode(description)
    const urlBytes = new TextEncoder().encode(pactdaUrl)

    // Calculate total size
    const totalSize =
      8 + // discriminator
      8 + // stub_id (u64)
      4 +
      suiContractBytes.length + // sui_contract_identifier (String)
      4 +
      titleBytes.length + // title (String)
      4 +
      descriptionBytes.length + // description (String)
      4 +
      urlBytes.length // pactda_url (String)

    const buffer = new Uint8Array(totalSize)
    let offset = 0

    // Write discriminator
    buffer.set(discriminator, offset)
    offset += 8

    // Write stub_id (u64, little-endian)
    new DataView(buffer.buffer).setBigUint64(offset, BigInt(solanaStubId), true)
    offset += 8

    // Write sui_contract_identifier (String with length prefix)
    new DataView(buffer.buffer).setUint32(offset, suiContractBytes.length, true)
    offset += 4
    buffer.set(suiContractBytes, offset)
    offset += suiContractBytes.length

    // Write title (String with length prefix)
    new DataView(buffer.buffer).setUint32(offset, titleBytes.length, true)
    offset += 4
    buffer.set(titleBytes, offset)
    offset += titleBytes.length

    // Write description (String with length prefix)
    new DataView(buffer.buffer).setUint32(offset, descriptionBytes.length, true)
    offset += 4
    buffer.set(descriptionBytes, offset)
    offset += descriptionBytes.length

    // Write pactda_url (String with length prefix)
    new DataView(buffer.buffer).setUint32(offset, urlBytes.length, true)
    offset += 4
    buffer.set(urlBytes, offset)

    return buffer
  }

  /**
   * Get stub information from Solana
   */
  public async getStubInfo(
    solanaStubId: number,
    initiatorPublicKey: string,
  ): Promise<any> {
    try {
      const userPublicKey = new PublicKey(initiatorPublicKey)
      const stubIdBuffer = new Uint8Array(8)
      new DataView(stubIdBuffer.buffer).setBigUint64(
        0,
        BigInt(solanaStubId),
        true,
      ) // little-endian

      const seeds = [
        new TextEncoder().encode('pactda_stub_v1'),
        userPublicKey.toBytes(),
        stubIdBuffer,
      ]
      const [stubPda] = PublicKey.findProgramAddressSync(
        seeds,
        PACTDA_PROGRAM_ID,
      )

      return {
        stubId: solanaStubId,
        address: stubPda.toString(),
        programId: PACTDA_PROGRAM_ID.toString(),
      }
    } catch (error) {
      console.error('Error fetching stub info:', error)
      throw error
    }
  } /**
   * Helper to get cross-chain info from contract using PactdaService
   */
  private getCrossChainInfo(
    contract: PactDaContract,
  ): { solanaStubId?: number } | null {
    // Import PactdaService functions to use cross-chain detection
    const {
      isCrossChainContract,
      getCrossChainInfo,
    } = require('./PactdaService')

    // First check if this is a cross-chain contract
    if (!isCrossChainContract(contract)) {
      return null
    }

    const crossChainInfo = getCrossChainInfo(contract)
    if (!crossChainInfo || crossChainInfo.chainId !== 1) {
      // 1 = Solana
      return null
    }

    // For now, we'll derive the stub ID from the contract object ID
    // In production, this should be stored properly when the stub is created
    const stubId = this.deriveStubIdFromContract(contract)

    return { solanaStubId: stubId }
  }

  /**
   * Derives a Solana stub ID from the contract object ID
   * This is a temporary solution - in production, the stub ID should be stored when created
   */
  private deriveStubIdFromContract(contract: PactDaContract): number {
    // Create a simple hash from the contract object ID to generate a consistent stub ID
    const contractIdBytes = new TextEncoder().encode(contract.objectId)
    let hash = 0
    for (let i = 0; i < contractIdBytes.length; i++) {
      hash = ((hash << 5) - hash + contractIdBytes[i]) & 0xffffffff
    }
    // Return the absolute value to ensure positive number
    return Math.abs(hash) % 1000000 // Keep it reasonable for u64
  }

  /**
   * Signs a contract on Solana using the cross-chain request pattern
   * This sends a signing request to Sui via the Wormhole bridge
   * @param userPublicKeyStr - Party B's Solana public key (base58)
   * @param contract - PactDaContract
   * @param wallet - (optional) Solana wallet object (must have publicKey, signTransaction)
   */
  public async signContractCrossChain(
    userPublicKeyStr: string,
    contract: PactDaContract,
    wallet?: {
      publicKey: PublicKey
      signTransaction: (tx: Transaction) => Promise<Transaction>
    },
  ): Promise<string> {
    // 1. Get Solana stub info (stubId)
    // Inline logic from PactdaService.getCrossChainInfo

    const getCrossChainParties = (contract: any) => {
      if (!contract.cross_chain_parties) return []
      return contract.cross_chain_parties as any[]
    }
    const parties = getCrossChainParties(contract)
    const partyBInfo = parties.find((party: any) => {
      const role = party.fields ? party.fields.role : party.role
      return role === 1 // PARTY_ROLE_B
    })
    if (!partyBInfo) throw new Error('No cross-chain Party B info found')
    const chainId = partyBInfo.fields
      ? partyBInfo.fields.chain_id
      : partyBInfo.chain_id
    if (chainId !== 1) throw new Error('Not a Solana cross-chain contract')
    // Derive stubId from contract.objectId (same as deriveStubIdFromContract)
    const contractIdBytes = new TextEncoder().encode(contract.objectId)
    let hash = 0
    for (let i = 0; i < contractIdBytes.length; i++) {
      hash = ((hash << 5) - hash + contractIdBytes[i]) & 0xffffffff
    }
    const solanaStubId = Math.abs(hash) % 1000000

    let userPublicKey: PublicKey
    try {
      userPublicKey = new PublicKey(userPublicKeyStr)
    } catch {
      throw new Error('Invalid Solana public key for Party B')
    }

    // --- Step 1: Always use the sponsor keypair from env as the stub initiator ---
    if (!this.sponsorKeypair) {
      this.initializeSponsor()
    }
    if (!this.sponsorKeypair) {
      throw new Error(
        'Sponsor keypair not loaded. Please set VITE_SOLANA_SPONSOR_PRIVATE_KEY in your .env',
      )
    }
    const initiatorPublicKey = this.sponsorKeypair.publicKey
    console.log(
      '[signContractCrossChain] Using sponsor keypair as stub initiator:',
      initiatorPublicKey.toBase58(),
    )
    const stubIdBuffer = new Uint8Array(8)
    new DataView(stubIdBuffer.buffer).setBigUint64(
      0,
      BigInt(solanaStubId),
      true,
    )
    const seeds = [
      new TextEncoder().encode('pactda_stub_v1'),
      initiatorPublicKey.toBytes(),
      stubIdBuffer,
    ]
    const [stubPda] = PublicKey.findProgramAddressSync(seeds, PACTDA_PROGRAM_ID)
    console.log(
      '[signContractCrossChain] Derived stub PDA:',
      stubPda.toBase58(),
    )

    // Fetch the stub account to verify existence and log
    const stubAccountInfo = await this.connection.getAccountInfo(stubPda)
    if (!stubAccountInfo) {
      console.error(
        '[signContractCrossChain] Stub account not found for PDA:',
        stubPda.toBase58(),
      )
      throw new Error(
        'Stub account not found on Solana. Make sure the stub is created and the stubId/initiatorPublicKey are correct.',
      )
    }
    console.log(
      '[signContractCrossChain] Stub account found, data length:',
      stubAccountInfo.data.length,
    )

    // --- Step 2: Prepare the payload (Party B's pubkey + role) ---
    const signPayload = new Uint8Array(33)
    signPayload.set(userPublicKey.toBytes(), 0)
    signPayload[32] = 1 // Party B role (1)
    console.log(
      '[signContractCrossChain] signPayload (hex):',
      Buffer.from(signPayload).toString('hex'),
    )
    console.log(
      '[signContractCrossChain] signPayload (base58):',
      bs58.encode(signPayload),
    )
    console.log(
      '[signContractCrossChain] userPublicKey:',
      userPublicKey.toBase58(),
    )
    console.log('[signContractCrossChain] Party B role:', 1)

    // --- Step 3: Prepare the Sui bridge address as bytes (from .env) ---
    let suiBridgeAddressHex =
      import.meta.env.VITE_WORMHOLE_BRIDGE_ADDRESS_SUI || ''
    suiBridgeAddressHex = suiBridgeAddressHex.replace(/^0x/, '')
    if (suiBridgeAddressHex.length !== 64) {
      throw new Error(
        'VITE_WORMHOLE_BRIDGE_ADDRESS_SUI must be a 32-byte hex string',
      )
    }
    const suiBridgeAddressBytes = new Uint8Array(
      suiBridgeAddressHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)),
    )
    console.log(
      '[signContractCrossChain] suiBridgeAddressBytes:',
      Buffer.from(suiBridgeAddressBytes).toString('hex'),
    )

    // --- Step 4: Build the instruction data for request_action_on_sui ---
    const discriminator = [15, 25, 61, 246, 52, 213, 60, 61]
    const payloadLen = 33
    const data = new Uint8Array(8 + 8 + 1 + 4 + payloadLen + 32)
    data.set(discriminator, 0)
    new DataView(data.buffer).setBigUint64(8, BigInt(solanaStubId), true)
    data[16] = 10 // SUI_ACTIONS.SIGN_CONTRACT
    new DataView(data.buffer).setUint32(17, payloadLen, true)
    data.set(signPayload, 21)
    data.set(suiBridgeAddressBytes, 54)
    console.log(
      '[signContractCrossChain] instruction data:',
      Buffer.from(data).toString('hex'),
    )

    // --- Step 5: Build and send the transaction ---
    // The signer must be the sponsor keypair
    // @ts-ignore
    const solWallet = wallet || window.solana
    if (!solWallet || !solWallet.publicKey) {
      throw new Error('No Solana wallet connected')
    }
    if (!solWallet.publicKey.equals(initiatorPublicKey)) {
      throw new Error(
        'The connected Solana wallet must be the sponsor (the account that created the stub)',
      )
    }
    const instruction = new TransactionInstruction({
      programId: PACTDA_PROGRAM_ID,
      keys: [
        { pubkey: stubPda, isSigner: false, isWritable: true },
        { pubkey: initiatorPublicKey, isSigner: true, isWritable: false },
      ],
      data: Buffer.from(data),
    })
    const tx = new Transaction().add(instruction)
    tx.feePayer = solWallet.publicKey
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash
    if (tx.feePayer) {
      console.log(
        '[signContractCrossChain] Transaction built, feePayer:',
        tx.feePayer.toBase58(),
      )
    }
    // Sign and send
    const signed = await solWallet.signTransaction(tx)
    console.log('[signContractCrossChain] Transaction signed')
    const sig = await this.connection.sendRawTransaction(signed.serialize())
    console.log('[signContractCrossChain] Transaction sent, signature:', sig)
    await this.connection.confirmTransaction(sig, 'confirmed')
    console.log('[signContractCrossChain] Transaction confirmed')
    return sig
  } /**
   * Ensures the Solana stub exists for the given contract and sponsor.
   * If not, creates it. Returns { stubPda, solanaStubId, signature (if created) }
   */
  public async ensureStubExistsForContract(
    userPublicKeyStr: string,
    contract: PactDaContract,
  ): Promise<{ stubPda: PublicKey; solanaStubId: number; signature?: string }> {
    if (!this.sponsorKeypair) {
      this.initializeSponsor()
    }
    if (!this.sponsorKeypair) {
      throw new Error(
        'Sponsor keypair not loaded. Please set VITE_SOLANA_SPONSOR_PRIVATE_KEY in your .env',
      )
    }
    // Derive stubId as in signContractCrossChain
    const contractIdBytes = new TextEncoder().encode(contract.objectId)
    let hash = 0
    for (let i = 0; i < contractIdBytes.length; i++) {
      hash = ((hash << 5) - hash + contractIdBytes[i]) & 0xffffffff
    }
    const solanaStubId = Math.abs(hash) % 1000000
    const initiatorPublicKey = this.sponsorKeypair.publicKey
    const stubIdBuffer = new Uint8Array(8)
    new DataView(stubIdBuffer.buffer).setBigUint64(
      0,
      BigInt(solanaStubId),
      true,
    )
    const seeds = [
      new TextEncoder().encode('pactda_stub_v1'),
      initiatorPublicKey.toBytes(),
      stubIdBuffer,
    ]
    const [stubPda] = PublicKey.findProgramAddressSync(seeds, PACTDA_PROGRAM_ID)
    const stubAccountInfo = await this.connection.getAccountInfo(stubPda)
    if (stubAccountInfo) {
      console.log(
        '[ensureStubExistsForContract] Stub already exists at PDA:',
        stubPda.toBase58(),
      )
      return { stubPda, solanaStubId }
    }
    // Create the stub
    console.log(
      '[ensureStubExistsForContract] Stub not found, creating at PDA:',
      stubPda.toBase58(),
    )
    const { signature } = await this.createSponsoredStub(
      userPublicKeyStr,
      contract,
      solanaStubId,
    )
    // Wait for the stub to appear (optional: poll for a few seconds)
    let retries = 5
    let found = false
    for (let i = 0; i < retries; i++) {
      const info = await this.connection.getAccountInfo(stubPda)
      if (info) {
        found = true
        break
      }
      await new Promise((res) => setTimeout(res, 1000))
    }
    if (!found) {
      throw new Error(
        'Stub creation transaction sent but account not found after waiting.',
      )
    }
    return { stubPda, solanaStubId, signature }
  }
}

export const solanaService = new SolanaService()
