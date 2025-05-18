import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Program ID from Anchor.toml for the testnet deployment
const PACTDA_PROGRAM_ID = new PublicKey('4KuTWVUXcvrvoDvGqoBeivSAisXo8cQz8WA5P5GZRvgq');

// Get the sponsor's private key from environment
const sponsorPrivateKeyBase58 = process.env.VITE_SPONSOR_PRIVATE_KEY;

// If no key is provided, try to read it from the sponsor_wallet.json file
if (!sponsorPrivateKeyBase58) {
  try {
    // Read the sponsor wallet JSON file (with [1,2,3,...] format)
    const walletData = JSON.parse(fs.readFileSync('./scripts/sponsor_wallet.json', 'utf8'));
    // Convert to Uint8Array
    const privateKeyUint8 = new Uint8Array(walletData);
    // Convert to base58 for output
    const privateKeyBase58 = bs58.encode(privateKeyUint8);
    console.log('\nExtracted sponsor wallet private key (Base58):');
    console.log(privateKeyBase58);
    console.log('\nAdd this to your .env file as VITE_SPONSOR_PRIVATE_KEY=<key>');
    process.exit(1);
  } catch (error) {
    console.error('Error reading sponsor wallet:', error);
    console.log('Make sure you have a sponsor_wallet.json file or set VITE_SPONSOR_PRIVATE_KEY in your .env file');
    process.exit(1);
  }
}

// Decode the Base58 private key
const sponsorPrivateKey = bs58.decode(sponsorPrivateKeyBase58);

// Create a simulated contract for testing
const mockContract = {
  id: 'sui-contract-id-' + Date.now().toString(),
  title: 'Test Cross-Chain Contract',
  termsReference: 'This is a sponsored test contract created at ' + new Date().toISOString(),
  pactdaUrl: 'https://test.pactda.io/contract/' + Date.now().toString()
};

// Create a Solana connection to testnet
const connection = new Connection('https://api.testnet.solana.com', 'confirmed');

// Implementation of createSponsoredSolanaStub function directly in this file
async function createSponsoredSolanaStub(
  connection,
  sponsorPrivateKey,
  userPublicKey,
  contract
) {
  try {
    // Create a unique stub ID based on timestamp + random part
    const solanaStubId = Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);

    // Create a Keypair for the sponsor wallet from the private key
    const sponsorKeypair = Keypair.fromSecretKey(sponsorPrivateKey);
    
    // Initialize provider with the connection and sponsor wallet
    const sponsorWallet = {
      publicKey: sponsorKeypair.publicKey,
      signTransaction: async (tx) => {
        tx.sign(sponsorKeypair);
        return tx;
      },
      signAllTransactions: async (txs) => {
        return txs.map(tx => {
          tx.sign(sponsorKeypair);
          return tx;
        });
      }
    };
    
    const provider = new anchor.AnchorProvider(
      connection,
      sponsorWallet,
      { commitment: 'confirmed', preflightCommitment: 'confirmed' }
    );
    
    // Set the provider globally
    anchor.setProvider(provider);
    
    // Create a program interface with IDL
    const idl = {
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
    };
    
    // Create the program
    const program = new anchor.Program(idl, PACTDA_PROGRAM_ID, provider);
    
    // Calculate PDA for the stub
    const seeds = [Buffer.from(solanaStubId.toString())];
    const [stubPda] = PublicKey.findProgramAddressSync(seeds, PACTDA_PROGRAM_ID);
    
    console.log('Creating sponsored stub with:');
    console.log('- Program ID:', PACTDA_PROGRAM_ID.toString());
    console.log('- Stub ID:', solanaStubId);
    console.log('- Stub PDA:', stubPda.toString());
    console.log('- Sponsor:', sponsorKeypair.publicKey.toString());
    console.log('- User:', userPublicKey.toString());
    console.log('- Contract ID:', contract.id);
    
    try {
      // Actually call the program to create the stub with sponsor paying
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
          signer: sponsorKeypair.publicKey,  // Sponsor is the signer and fee payer
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      console.log('\nSuccess! Created sponsored Solana stub:');
      console.log('- Stub ID:', solanaStubId);
      console.log('- Transaction signature:', tx);
      console.log('- Explorer URL: https://explorer.solana.com/tx/' + tx + '?cluster=testnet');
      
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

// Test the sponsored transaction flow
async function testSponsoredTransaction() {
  console.log('Testing sponsored transaction for cross-chain contract...');
  
  try {
    // Create a fake public key for attribution (would normally be the user's wallet)
    // In a real app, this would be the connected wallet's public key
    const fakeUserPublicKey = new PublicKey('3mN83M8re87kB5Lq8uJKEMLuyPpnhYJ8JSkVMyTnuNFw');
    
    console.log('Creating sponsored stub with:');
    console.log('- Contract ID:', mockContract.id);
    console.log('- Title:', mockContract.title);
    console.log('- User public key:', fakeUserPublicKey.toString());
    
    // Call the function
    const result = await createSponsoredSolanaStub(
      connection,
      sponsorPrivateKey,
      fakeUserPublicKey,
      mockContract
    );
    
    console.log('\nSuccess! Created sponsored Solana stub:');
    console.log('- Stub ID:', result.solanaStubId);
    console.log('- Transaction signature:', result.signature);
    console.log('- Explorer URL: https://explorer.solana.com/tx/' + result.signature + '?cluster=testnet');
    
    return result;
  } catch (error) {
    console.error('\nError testing sponsored transaction:', error);
    throw error;
  }
}

// Run the test
testSponsoredTransaction()
  .then(() => {
    console.log('\nTest completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nTest failed:', error);
    process.exit(1);
  });
