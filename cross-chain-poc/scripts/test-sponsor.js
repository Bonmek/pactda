/**
 * Test script for verifying the sponsored transaction functionality
 * 
 * Usage:
 *   node scripts/test-sponsor.js
 * 
 * Make sure you have set VITE_SPONSOR_PRIVATE_KEY in your .env file first
 */

import dotenv from 'dotenv';
import { Connection } from '@solana/web3.js';
import { SponsorService } from '../src/service/SponsorService.js';

// Load environment variables
dotenv.config();

async function testSponsor() {
  // Get the sponsor private key from env
  const sponsorPrivateKeyBase58 = process.env.VITE_SPONSOR_PRIVATE_KEY;
  
  if (!sponsorPrivateKeyBase58) {
    console.error('❌ Error: VITE_SPONSOR_PRIVATE_KEY not found in .env file');
    console.error('   Please set this variable first. See the README.md for instructions.');
    process.exit(1);
  }

  try {
    // Connect to Solana testnet
    const connection = new Connection('https://api.testnet.solana.com', 'confirmed');
    console.log('Connected to Solana testnet');
    
    // Initialize SponsorService with the connection
    const sponsorService = new SponsorService(connection);
    
    // Load the sponsor keypair
    sponsorService.loadSponsorKeypair(sponsorPrivateKeyBase58);
    console.log('✅ Successfully loaded sponsor keypair');
    
    // Check account balance
    const { isBalanceSufficient, balanceInSol, publicKey } = 
      await sponsorService.checkSponsorWalletBalance(0.05);
    
    console.log(`Sponsor wallet public key: ${publicKey}`);
    console.log(`Sponsor wallet balance: ${balanceInSol} SOL`);
    
    if (!isBalanceSufficient) {
      console.warn('⚠️  Warning: Balance is low. You should add more SOL to this wallet.');
      console.log('   You can use the following command to add SOL:');
      console.log(`   solana airdrop 1 ${publicKey} --url https://api.testnet.solana.com`);
    } else {
      console.log('✅ Balance is sufficient for sponsoring transactions');
    }
    
    console.log('\nSponsor configuration verification complete!');
    
  } catch (error) {
    console.error('❌ Error processing the sponsor key:', error.message);
    
    if (error.message.includes('Invalid') || error.message.includes('format')) {
      console.error('\nThe provided private key appears to be invalid Base58 format.');
      console.error('Try using the extract-key.js script to correctly format your key:');
      console.error('node scripts/extract-key.js path/to/keypair.json');
    }
    
    process.exit(1);
  }
}

testSponsor().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
