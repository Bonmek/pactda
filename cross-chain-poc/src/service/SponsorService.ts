import * as anchor from '@coral-xyz/anchor';
import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Keypair,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import bs58 from "bs58";
import type { PactContract } from "../types";

// Program ID for the PactDa Solana program
const PACTDA_PROGRAM_ID = new PublicKey('4KuTWVUXcvrvoDvGqoBeivSAisXo8cQz8WA5P5GZRvgq');

/**
 * Service for creating sponsored transactions on the PactDa Solana program
 */
export class SponsorService {
  private connection: Connection;
  private sponsorKeypair?: Keypair;

  /**
   * Creates a new SponsorService
   *
   * @param connection Solana connection
   * @param sponsorPrivateKeyBase58 Optional sponsor private key in base58 format
   */
  constructor(connection: Connection, sponsorPrivateKeyBase58?: string) {
    this.connection = connection;

    // If a sponsor key is provided, load it
    if (sponsorPrivateKeyBase58) {
      this.loadSponsorKeypair(sponsorPrivateKeyBase58);
    }
  }

  /**
   * Load sponsor keypair from a base58 encoded private key
   */
  public loadSponsorKeypair(privateKeyBase58: string): void {
    try {
      const decodedKey = bs58.decode(privateKeyBase58);
      this.sponsorKeypair = Keypair.fromSecretKey(decodedKey);
      console.log("Sponsor wallet loaded successfully");
      console.log("Public key:", this.sponsorKeypair.publicKey.toString());
    } catch (error) {
      console.error("Error loading sponsor keypair:", error);
      throw new Error(
        "Invalid sponsor private key format. Please ensure it is in base58 format."
      );
    }
  }

  /**
   * Check if the sponsor wallet has sufficient balance
   *
   * @param minimumSolBalance Minimum SOL balance required (default: 0.05)
   */
  public async checkSponsorWalletBalance(minimumSolBalance = 0.05): Promise<{
    isBalanceSufficient: boolean;
    balanceInSol: number;
    publicKey: string;
  }> {
    if (!this.sponsorKeypair) {
      throw new Error(
        "Sponsor wallet not initialized. Call loadSponsorKeypair first."
      );
    }

    const balance = await this.connection.getBalance(
      this.sponsorKeypair.publicKey
    );
    const balanceInSol = balance / LAMPORTS_PER_SOL;
    const minimumLamports = minimumSolBalance * LAMPORTS_PER_SOL;

    return {
      isBalanceSufficient: balance >= minimumLamports,
      balanceInSol,
      publicKey: this.sponsorKeypair.publicKey.toString(),
    };
  }

  /**
   * Creates a sponsored Solana stub for a PactDa contract
   *
   * @param userPublicKeyStr User's public key string (for attribution)
   * @param contract PactContract details from Sui
   * @returns Transaction signature and stub ID
   */
  public async createSponsoredSolanaStub(
    userPublicKeyStr: string,
    contract: PactContract
  ): Promise<{ signature: string; solanaStubId: number }> {
    // Check that sponsor keypair is loaded
    if (!this.sponsorKeypair) {
      throw new Error(
        "Sponsor keypair not loaded. Call loadSponsorKeypair first."
      );
    }

    try {
      // Generate stub ID based on timestamp and random component
      const timestamp = Math.floor(Date.now() / 1000);
      const randomPart = Math.floor(Math.random() * 10000);
      const hashPart = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
      
      const solanaStubId = timestamp * 10000 + randomPart;
      
      console.log(`Generated Sponsored Solana Stub ID: ${solanaStubId} (${timestamp}-${randomPart}-${hashPart})`);

      // Create a sponsor wallet adapter that can sign transactions
      const sponsorWallet = {
        publicKey: this.sponsorKeypair.publicKey,
        signTransaction: async (tx: anchor.web3.Transaction) => {
          tx.partialSign(this.sponsorKeypair!);
          return tx;
        },
        signAllTransactions: async (txs: anchor.web3.Transaction[]) => {
          return txs.map(tx => {
            tx.partialSign(this.sponsorKeypair!);
            return tx;
          });
        }
      } as anchor.Wallet;
      
      // Create provider with sponsor wallet
      const sponsorProvider = new anchor.AnchorProvider(
        this.connection,
        sponsorWallet,
        { commitment: 'confirmed', preflightCommitment: 'confirmed' }
      );
      
      anchor.setProvider(sponsorProvider);

      // Get the IDL using the same pattern as SolanaService
      const idl = getIdlForPactDaSolana();
      
      // @ts-expect-error - The Anchor types have some issues but the code works at runtime
      const program = new anchor.Program(idl, PACTDA_PROGRAM_ID, sponsorProvider);
      
      // Calculate PDA for the stub
      const seeds = [Buffer.from(solanaStubId.toString())];
      const [stubPda] = PublicKey.findProgramAddressSync(seeds, PACTDA_PROGRAM_ID);
      
      // User's public key (for attribution only, not signing)
      const userPublicKey = new PublicKey(userPublicKeyStr);

      console.log('Creating sponsored Solana stub on testnet with:');
      console.log('- Program ID:', PACTDA_PROGRAM_ID.toString());
      console.log('- Stub ID:', solanaStubId);
      console.log('- Stub PDA:', stubPda.toString());
      console.log('- Sponsor:', this.sponsorKeypair.publicKey.toString());
      console.log('- User:', userPublicKey.toString());
      console.log('- Contract ID:', contract.id);

      // Ensure all contract fields are available with defaults
      const title = contract.title || 'Untitled Contract';
      const termsReference = contract.termsReference || 'No description';
      const pactdaUrl = contract.pactdaUrl || 'https://pactda.io';

      // Check contract ID is available
      if (!contract.id) {
        throw new Error("Contract ID is required but missing");
      }

      // Call the program to create the stub
      const tx = await program.methods
        .initializeStubDirect(
          createBN(solanaStubId),
          contract.id,                               
          title,
          termsReference,
          pactdaUrl
        )
        .accounts({
          pactDaStub: stubPda,
          signer: this.sponsorKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log('Sponsored Solana stub created successfully on testnet!');
      console.log('Transaction signature:', tx);
      console.log(
        'You can view this transaction at https://explorer.solana.com/tx/' +
          tx +
          '?cluster=testnet'
      );

      return {
        signature: tx,
        solanaStubId,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error creating sponsored Solana stub:", error.message);
        if ("logs" in error) {
          console.error("Transaction logs:", (error as { logs: unknown }).logs);
        }
      } else {
        console.error("Unknown error creating sponsored Solana stub");
      }
      throw error;
    }
  }

  /**
   * Signs a contract with a sponsored transaction
   *
   * @param userPublicKeyStr User's public key string (for attribution)
   * @param contract Contract to sign
   * @returns Transaction signature
   */
  public async signContractSponsored(
    userPublicKeyStr: string,
    contract: PactContract
  ): Promise<string> {
    // Check that sponsor keypair is loaded
    if (!this.sponsorKeypair) {
      throw new Error(
        "Sponsor keypair not loaded. Call loadSponsorKeypair first."
      );
    }

    // Check contract has a Solana stub ID
    if (!contract.solanaStubId) {
      throw new Error("Solana stub ID is missing in the contract details.");
    }

    const solanaStubId = contract.solanaStubId;

    try {
      // Create a sponsor wallet adapter that can sign transactions
      const sponsorWallet = {
        publicKey: this.sponsorKeypair.publicKey,
        signTransaction: async (tx: anchor.web3.Transaction) => {
          tx.partialSign(this.sponsorKeypair!);
          return tx;
        },
        signAllTransactions: async (txs: anchor.web3.Transaction[]) => {
          return txs.map(tx => {
            tx.partialSign(this.sponsorKeypair!);
            return tx;
          });
        }
      } as anchor.Wallet;
      
      // Create provider with sponsor wallet
      const sponsorProvider = new anchor.AnchorProvider(
        this.connection,
        sponsorWallet,
        { commitment: 'confirmed', preflightCommitment: 'confirmed' }
      );
      
      anchor.setProvider(sponsorProvider);
      
      // Get the IDL using the same pattern as SolanaService
      const idl = getIdlForPactDaSignContract();
      
      // @ts-expect-error - The Anchor types have some issues but the code works at runtime
      const program = new anchor.Program(idl, PACTDA_PROGRAM_ID, sponsorProvider);
      
      // Calculate PDA for the stub
      const seeds = [Buffer.from(solanaStubId.toString())];
      const [stubPda] = PublicKey.findProgramAddressSync(seeds, PACTDA_PROGRAM_ID);
      
      // User's public key (for attribution only, not signing)
      const userPublicKey = new PublicKey(userPublicKeyStr);

      console.log('Signing contract on Solana testnet with sponsorship:');
      console.log('- Program ID:', PACTDA_PROGRAM_ID.toString());
      console.log('- Stub ID:', solanaStubId);
      console.log('- Stub PDA:', stubPda.toString());
      console.log('- Sponsor:', this.sponsorKeypair.publicKey.toString());
      console.log('- User (attribution):', userPublicKey.toString());

      // Call the program to sign the contract with sponsor paying
      const tx = await program.methods
        .signContract(createBN(solanaStubId))
        .accounts({
          pactDaStub: stubPda,
          signer: this.sponsorKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(
        "Contract signed successfully on Solana testnet with sponsorship!"
      );
      console.log("Transaction signature:", tx);
      console.log(
        "You can view this transaction at https://explorer.solana.com/tx/" +
          tx +
          "?cluster=testnet"
      );

      return tx;
    } catch (error: unknown) {
      // Log detailed error information
      if (error instanceof Error) {
        console.error("Error signing contract on Solana:", error.message);
        if ("logs" in error) {
          console.error("Transaction logs:", (error as { logs: unknown }).logs);
        }
      } else {
        console.error("Unknown error signing contract on Solana");
      }
      throw error;
    }
  }
}

/**
 * Check if sponsored transactions are enabled in the environment
 */
export function isSponsoredTransactionsEnabled(): boolean {
  return (
    typeof import.meta.env.VITE_SPONSOR_PRIVATE_KEY === "string" &&
    import.meta.env.VITE_SPONSOR_PRIVATE_KEY.trim() !== ""
  );
}

/**
 * Helper function to create a sponsored stub on Solana
 */
export async function createSponsoredStub(
  connection: Connection,
  userPublicKey: PublicKey,
  contract: PactContract
): Promise<{ signature: string; solanaStubId: number }> {
  const sponsorKey = import.meta.env.VITE_SPONSOR_PRIVATE_KEY;

  if (!sponsorKey) {
    throw new Error(
      "Sponsor key not configured. Please set VITE_SPONSOR_PRIVATE_KEY in .env"
    );
  }

  // Create service instance with sponsor key
  const service = new SponsorService(connection, sponsorKey);

  // Call the service method with user's public key
  return service.createSponsoredSolanaStub(userPublicKey.toString(), contract);
}

/**
 * Helper function to sign a contract with sponsorship
 */
export async function signContractSponsored(
  connection: Connection,
  userPublicKey: PublicKey,
  contract: PactContract
): Promise<string> {
  const sponsorKey = import.meta.env.VITE_SPONSOR_PRIVATE_KEY;

  if (!sponsorKey) {
    throw new Error(
      "Sponsor key not configured. Please set VITE_SPONSOR_PRIVATE_KEY in .env"
    );
  }

  // Create service instance with sponsor key
  const service = new SponsorService(connection, sponsorKey);

  // Call the service method with user's public key
  return service.signContractSponsored(userPublicKey.toString(), contract);
}

// Helper functions to match SolanaService.ts

function getIdlForPactDaSolana(): Record<string, unknown> {
  return {
    version: "0.1.0",
    name: "pactda_sol",
    instructions: [
      {
        name: "initializeStubDirect",
        accounts: [
          { name: "pactDaStub", isMut: true, isSigner: false },
          { name: "signer", isMut: true, isSigner: true },
          { name: "systemProgram", isMut: false, isSigner: false }
        ],
        args: [
          { name: "solanaStubId", type: "u64" },
          { name: "suiContractIdentifier", type: "string" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "pactdaUrl", type: "string" }
        ]
      }
    ],
    metadata: {
      address: PACTDA_PROGRAM_ID.toString()
    }
  };
}

function getIdlForPactDaSignContract(): Record<string, unknown> {
  return {
    version: "0.1.0",
    name: "pactda_sol",
    instructions: [
      {
        name: "signContract",
        accounts: [
          { name: "pactDaStub", isMut: true, isSigner: false },
          { name: "signer", isMut: true, isSigner: true },
          { name: "systemProgram", isMut: false, isSigner: false }
        ],
        args: [
          { name: "solanaStubId", type: "u64" }
        ]
      }
    ],
    metadata: {
      address: PACTDA_PROGRAM_ID.toString()
    }
  };
}

function createBN(value: number): anchor.BN {
  return new anchor.BN(value);
}

export default SponsorService;