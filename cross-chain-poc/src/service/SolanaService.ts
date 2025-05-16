import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import type { PactContract } from '../types';

// Program ID from Anchor.toml for the testnet deployment
const PACTDA_PROGRAM_ID = new PublicKey('4KuTWVUXcvrvoDvGqoBeivSAisXo8cQz8WA5P5GZRvgq');

// We need to define a type that corresponds to our program IDL
type PactDaProgram = Program<{
  version: string;
  name: string;
  instructions: {
    name: string;
    accounts: {
      name: string;
      isMut: boolean;
      isSigner: boolean;
    }[];
    args: { name: string; type: string }[];
  }[];
  metadata?: Record<string, string>;
  address: string;
}>;

/**
 * Creates a PactDa stub on Solana testnet
 * 
 * @param connection Solana connection
 * @param wallet Connected wallet
 * @param contract PactContract details from Sui
 * @returns Transaction signature and stub ID
 */
export async function createSolanaStub(
  connection: Connection,
  wallet: anchor.Wallet,
  contract: PactContract
): Promise<{ signature: string, solanaStubId: number }> {
  try {
    // Create a unique stub ID based on timestamp + random part
    const solanaStubId = Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);

    // Initialize provider with the connection and wallet
    const provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed', preflightCommitment: 'confirmed' }
    );
    
    // Set the provider globally
    anchor.setProvider(provider);
    
    // Create a program interface
    // Note: In a production app, you'd load the IDL from a file or fetch it from the chain
    const program: PactDaProgram = new Program(
      {
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
        ]
      } as any,
      PACTDA_PROGRAM_ID,
      provider
    );
    
    // Calculate PDA for the stub
    const seeds = [Buffer.from(solanaStubId.toString())];
    const [stubPda] = PublicKey.findProgramAddressSync(seeds, PACTDA_PROGRAM_ID);
    
    console.log('Creating Solana stub on testnet with:');
    console.log('- Program ID:', PACTDA_PROGRAM_ID.toString());
    console.log('- Stub ID:', solanaStubId);
    console.log('- Stub PDA:', stubPda.toString());
    console.log('- Signer:', wallet.publicKey.toString());
    console.log('- Contract ID:', contract.id);
    
    try {
      // Actually call the program to create the stub
      const tx = await program.methods
        .initializeStubDirect(
          new BN(solanaStubId),
          contract.id,                               // Sui contract ID
          contract.title || 'Untitled Contract',     // Title
          contract.termsReference || 'No description', // Description from terms
          contract.pactdaUrl || 'https://pactda.io'  // URL
        )
        .accounts({
          pactDaStub: stubPda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log('Solana stub created successfully on testnet!');
      console.log('Transaction signature:', tx);
      console.log('You can view this transaction at https://explorer.solana.com/tx/' + tx + '?cluster=testnet');
      
      return { 
        signature: tx,
        solanaStubId 
      };
    } catch (programError) {
      console.error('Error calling Solana program:', programError);
      throw new Error(`Failed to create stub on Solana: ${programError.message || programError}`);
    }
  } catch (error) {
    console.error('Error creating Solana stub:', error);
    throw error;
  }
}

/**
 * Signs a PactDa contract as party B on Solana testnet
 * 
 * @param connection Solana connection
 * @param wallet Connected wallet
 * @param contract Contract details
 * @returns Transaction signature
 */
export async function signContractOnSolana(
  connection: Connection,
  wallet: anchor.Wallet,
  contract: PactContract
): Promise<string> {
  try {
    // Get stub ID
    const solanaStubId = contract.solanaStubId;
    if (!solanaStubId) {
      throw new Error('No Solana stub ID found for this contract');
    }

    // Initialize provider with the connection and wallet
    const provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed', preflightCommitment: 'confirmed' }
    );
    
    // Set the provider globally
    anchor.setProvider(provider);
    
    // Create a program interface
    // Note: In a production app, you'd load the IDL from a file or fetch it from the chain
    const program: PactDaProgram = new Program(
      {
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
        ]
      } as any,
      PACTDA_PROGRAM_ID,
      provider
    );
    
    // Calculate PDA for the stub
    const seeds = [Buffer.from(solanaStubId.toString())];
    const [stubPda] = PublicKey.findProgramAddressSync(seeds, PACTDA_PROGRAM_ID);
    
    console.log('Signing contract on Solana testnet with:');
    console.log('- Program ID:', PACTDA_PROGRAM_ID.toString());
    console.log('- Stub ID:', solanaStubId);
    console.log('- Stub PDA:', stubPda.toString());
    console.log('- Signer:', wallet.publicKey.toString());

    try {
      // Actually call the program to sign the contract
      const tx = await program.methods
        .signContract(
          new BN(solanaStubId)
        )
        .accounts({
          pactDaStub: stubPda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log('Contract signed successfully on Solana testnet!');
      console.log('Transaction signature:', tx);
      console.log('You can view this transaction at https://explorer.solana.com/tx/' + tx + '?cluster=testnet');
      
      return tx;
    } catch (programError) {
      console.error('Error calling Solana program to sign contract:', programError);
      throw new Error(`Failed to sign contract on Solana: ${programError.message || programError}`);
    }
  } catch (error) {
    console.error('Error signing contract on Solana:', error);
    throw error;
  }
}
