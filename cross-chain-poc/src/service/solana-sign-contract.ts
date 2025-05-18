import * as anchor from '@coral-xyz/anchor';
// We need to use the dynamic import pattern for CommonJS modules in ESM
const { AnchorProvider, Program, BN } = anchor;
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import type { PactContract } from "../types";
import { PACTDA_PROGRAM_ID } from "./SolanaService";

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
    anchor.setProvider(provider);    // Create a program interface
    // Note: In a production app, you'd load the IDL from a file or fetch it from the chain
    const program = new Program(
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
      },
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
      
      return tx;    } catch (programError) {
      console.error('Error calling Solana program to sign contract:', programError);
      throw new Error(`Failed to sign contract on Solana: ${programError instanceof Error ? programError.message : String(programError)}`);
    }
  } catch (error) {
    console.error('Error signing contract on Solana:', error);
    throw error;
  }
}
