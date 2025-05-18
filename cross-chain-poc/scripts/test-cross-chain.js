import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

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

// Test the sponsored transaction flow
async function testSponsoredTransaction() {
  console.log('Testing sponsored transaction for cross-chain contract...');  try {
    // Import the createSponsoredSolanaStub function 
    // Use a direct import of our CJS wrapper
    const { createSponsoredSolanaStub } = await import('./solana-service.cjs');
    
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
