import * as anchor from '@coral-xyz/anchor';
// We need to use the dynamic import pattern for CommonJS modules in ESM
const { AnchorProvider, Program } = anchor;
import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Keypair
} from '@solana/web3.js';
import type { PactContract } from '../types';

// Program ID from Anchor.toml for the testnet deployment
export const PACTDA_PROGRAM_ID = new PublicKey('4KuTWVUXcvrvoDvGqoBeivSAisXo8cQz8WA5P5GZRvgq');

// Program Address in string format for direct use in tests
export const PACTDA_PROGRAM_ID_STRING = '4KuTWVUXcvrvoDvGqoBeivSAisXo8cQz8WA5P5GZRvgq';

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
): Promise<{ signature: string, solanaStubId: number }> {  try {
    
    const timestamp = Math.floor(Date.now() / 1000);
    const randomPart = Math.floor(Math.random() * 10000);
    const hashPart = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
    
    const solanaStubId = timestamp * 10000 + randomPart;
    
    console.log(`Generated Solana Stub ID: ${solanaStubId} (${timestamp}-${randomPart}-${hashPart})`);
    
    const provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed', preflightCommitment: 'confirmed' }
    );

    anchor.setProvider(provider);   
    const idl = getIdlForPactDaSolana();
    
    const program = new Program(idl, PACTDA_PROGRAM_ID, provider);
    
    const seeds = [Buffer.from(solanaStubId.toString())];
    const [stubPda] = PublicKey.findProgramAddressSync(seeds, PACTDA_PROGRAM_ID);
    
    console.log('Creating Solana stub on testnet with:');
    console.log('- Program ID:', PACTDA_PROGRAM_ID.toString());
    console.log('- Stub ID:', solanaStubId);
    console.log('- Stub PDA:', stubPda.toString());
    console.log('- Signer:', wallet.publicKey.toString());
    console.log('- Contract ID:', contract.id);
    
    try {      
      const tx = await program.methods
        .initializeStubDirect(
          createBN(solanaStubId),
          contract.id,                           
          contract.title || 'Untitled Contract',     
          contract.termsReference || 'No description',
          contract.pactdaUrl || 'https://pactda.io'  
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
      throw new Error(`Failed to create stub on Solana: ${programError instanceof Error ? programError.message : String(programError)}`);
    }
  } catch (error) {
    console.error('Error creating Solana stub:', error);
    throw error;
  }
}

/**
 * Creates a PactDa stub on Solana testnet with a sponsored transaction
 * Your wallet pays for the transaction instead of the user's wallet
 * 
 * @param connection Solana connection
 * @param sponsorPrivateKey Your private key to sponsor the transaction
 * @param userPublicKey The user's public key for attribution
 * @param contract PactContract details from Sui
 * @returns Transaction signature and stub ID
 */
export async function createSponsoredSolanaStub(
  connection: Connection,
  sponsorPrivateKey: Uint8Array,
  userPublicKey: PublicKey,
  contract: PactContract
): Promise<{ signature: string, solanaStubId: number }> {  try {

  const timestamp = Math.floor(Date.now() / 1000);
    const randomPart = Math.floor(Math.random() * 10000);
    const hashPart = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
    
    const solanaStubId = timestamp * 10000 + randomPart;
    
    console.log(`Generated Sponsored Solana Stub ID: ${solanaStubId} (${timestamp}-${randomPart}-${hashPart})`);

    const sponsorKeypair = Keypair.fromSecretKey(sponsorPrivateKey);
    
    const sponsorWallet = {
      publicKey: sponsorKeypair.publicKey,
      signTransaction: async (tx: anchor.web3.Transaction) => {
        tx.sign(sponsorKeypair);
        return tx;
      },
      signAllTransactions: async (txs: anchor.web3.Transaction[]) => {
        return txs.map(tx => {
          tx.sign(sponsorKeypair);
          return tx;
        });
      }
    } as anchor.Wallet;
    
    const provider = new AnchorProvider(
      connection,
      sponsorWallet,
      { commitment: 'confirmed', preflightCommitment: 'confirmed' }
    );
    
    anchor.setProvider(provider);

    const idl = getIdlForPactDaSolana();
    const program = new Program(idl, PACTDA_PROGRAM_ID, provider);
    
    const seeds = [Buffer.from(solanaStubId.toString())];
    const [stubPda] = PublicKey.findProgramAddressSync(seeds, PACTDA_PROGRAM_ID);
    
    console.log('Creating sponsored Solana stub on testnet with:');
    console.log('- Program ID:', PACTDA_PROGRAM_ID.toString());
    console.log('- Stub ID:', solanaStubId);
    console.log('- Stub PDA:', stubPda.toString());
    console.log('- Sponsor:', sponsorKeypair.publicKey.toString());
    console.log('- User:', userPublicKey.toString());
    console.log('- Contract ID:', contract.id);
    
    try {      // Actually call the program to create the stub with sponsor paying
      const tx = await program.methods
        .initializeStubDirect(
          createBN(solanaStubId),
          contract.id,                               
          contract.title || 'Untitled Contract',    
          contract.termsReference || 'No description', // Description from terms
          contract.pactdaUrl || 'https://pactda.io'  // URL
        )
        .accounts({
          pactDaStub: stubPda,
          signer: sponsorKeypair.publicKey,  // Sponsor is the signer and fee payer
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log('Sponsored Solana stub created successfully on testnet!');
      console.log('Transaction signature:', tx);
      console.log('You can view this transaction at https://explorer.solana.com/tx/' + tx + '?cluster=testnet');
      
      return { 
        signature: tx,
        solanaStubId 
      };
    } catch (programError) {
      console.error('Error calling Solana program:', programError);
      throw new Error(`Failed to create sponsored stub on Solana: ${programError instanceof Error ? programError.message : String(programError)}`);
    }
  } catch (error) {
    console.error('Error creating sponsored Solana stub:', error);
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
    const solanaStubId = contract.solanaStubId;
    if (!solanaStubId) {
      throw new Error('No Solana stub ID found for this contract');
    }    
    const provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed', preflightCommitment: 'confirmed' }
    );
    
    anchor.setProvider(provider);    
    const idl = getIdlForPactDaSignContract();
    
    // @ts-expect-error - The Anchor types have some issues but the code works at runtime
    const program = new Program(idl, PACTDA_PROGRAM_ID, provider);
    
    const seeds = [Buffer.from(solanaStubId.toString())];
    const [stubPda] = PublicKey.findProgramAddressSync(seeds, PACTDA_PROGRAM_ID);
    
    console.log('Signing contract on Solana testnet with:');
    console.log('- Program ID:', PACTDA_PROGRAM_ID.toString());
    console.log('- Stub ID:', solanaStubId);
    console.log('- Stub PDA:', stubPda.toString());
    console.log('- Signer:', wallet.publicKey.toString());

    try {      // Actually call the program to sign the contract
      const tx = await program.methods
        .signContract(
          createBN(solanaStubId)
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
      throw new Error(`Failed to sign contract on Solana: ${programError instanceof Error ? programError.message : String(programError)}`);
    }
  } catch (error) {
    console.error('Error signing contract on Solana:', error);
    throw error;
  }
}


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
    ]
  };
}

function createBN(value: number): anchor.BN {
  return new anchor.BN(value);
}