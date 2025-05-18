/**
 * Tool to extract a base58-encoded private key from a Solana keypair JSON file
 * 
 * Usage:
 *   node scripts/extract-key.js path/to/keypair.json
 * 
 * This script will output the private key in base58 encoding format
 * which can be used as VITE_SPONSOR_PRIVATE_KEY in your .env file.
 */

import fs from 'fs';
import bs58 from 'bs58';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the file path from the command line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.error('Error: Please provide a path to your keypair file');
  console.error('Usage: node scripts/extract-key.js path/to/keypair.json');
  process.exit(1);
}

try {
  // Read the keypair file
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Parse the JSON file
  const keypair = JSON.parse(fileContent);
  
  // Ensure it's an array (Solana keypair format)
  if (!Array.isArray(keypair)) {
    console.error('Error: Invalid keypair format. Expected an array of numbers.');
    process.exit(1);
  }
  
  // Convert to Uint8Array
  const secretKey = Uint8Array.from(keypair);
  
  // Encode to base58
  const base58Key = bs58.encode(secretKey);
  
  console.log('\nYour Base58 encoded private key:');
  console.log(base58Key);
  console.log('\nAdd this to your .env file as:');
  console.log(`VITE_SPONSOR_PRIVATE_KEY=${base58Key}`);
  console.log('\nWARNING: Keep this key secure and never commit it to version control!');
  
} catch (error) {
  console.error('Error processing the keypair file:', error.message);
  process.exit(1);
}
