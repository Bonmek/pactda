# PactDA Cross-Chain Proof of Concept

This project demonstrates a cross-chain contract system that connects Sui and Solana blockchain networks. It allows creating contracts on Sui that can interact with Solana through a cross-chain bridge pattern.

## Features

- Create regular Sui contracts
- Create cross-chain contracts on Sui with Solana as the counterparty
- Create Solana stub contracts for cross-chain contracts
- Sign contracts on Solana
- Sponsored transaction support where your wallet (not the user's wallet) pays for Solana transactions

## Getting Started

### Prerequisites

- Node.js 16+
- pnpm
- Sui wallet extension
- Solana wallet extension (like Phantom)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/pactda-cross-chain-poc.git
   cd pactda-cross-chain-poc
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   
   Then edit the `.env` file to add your Solana sponsor wallet private key if you want to enable the sponsored transaction feature.

4. Start the development server:
   ```
   pnpm dev
   ```

## Cross-Chain Workflow

The cross-chain contract creation workflow works as follows:

1. Party A creates a contract on Sui, specifying a Solana address for Party B
2. The contract is stored on the Sui blockchain
3. A "stub" contract needs to be created on Solana with reference to the Sui contract
4. This can be done by either:
   - Party B using their own Solana wallet (paying for the transaction)
   - Using the sponsor wallet feature where your application pays for the transaction
5. Once the stub is created, Party B can sign the contract on Solana
6. Both blockchains now have a record of the contract and signatures

## Sponsored Transactions

The application includes a feature where your wallet (not the user's wallet) pays for Solana transactions when creating stub contracts. To enable this:

1. Generate a new sponsor wallet for Solana testnet:
   ```
   solana-keygen new -o sponsor_wallet.json
   ```

2. Fund this wallet with SOL on testnet:
   ```
   solana airdrop 1 $(solana-keygen pubkey sponsor_wallet.json) --url https://api.testnet.solana.com
   ```

3. Get the wallet's public key and verify the balance:
   ```
   solana-keygen pubkey sponsor_wallet.json
   solana balance $(solana-keygen pubkey sponsor_wallet.json) --url https://api.testnet.solana.com
   ```

4. Extract the private key and set it in your `.env` file:
   ```
   VITE_SPONSOR_PRIVATE_KEY=your_base58_encoded_private_key
   ```
   
   To extract the private key in Base58 format, you can use one of these methods:
   - If you have access to the terminal output when you created the key, it should show the Base58 private key
   - Or export it programmatically using a small Node.js script:
   
   ```javascript
   // extract-key.js
   const fs = require('fs');
   const bs58 = require('bs58');
   
   const keyData = JSON.parse(fs.readFileSync('sponsor_wallet.json', 'utf8'));
   console.log(bs58.encode(Buffer.from(keyData)));
   ```

When sponsored transactions are enabled, users can create Solana stub contracts without needing their own SOL for transaction fees.

## Technical Implementation

### Contract Creation on Sui

The Sui contract creation uses the Sui SDK to create a contract object with all necessary information:

```typescript
const contract = {
  id: uniqueId,
  title: title,
  termsReference: terms,
  partyAAddress: suiWallet, // Sui address
  partyBAddress: solanaParticipant, // Solana address for cross-chain
  // Additional fields...
};
```

### Solana Stub Contract Creation

Creating a stub on Solana uses Anchor to interact with the Solana program:

1. With user's wallet (standard):
```typescript
const result = await createSolanaStub(
  connection, 
  wallet, 
  contract
);
```

2. With sponsored transaction:
```typescript
const result = await createSponsoredStub(
  connection, 
  userPublicKey,  // For attribution only
  contract
);
```

### Sponsored Transaction Implementation

The sponsored transaction feature uses a wallet created from a private key:

```typescript
// Create a Keypair from the sponsor's private key
const sponsorKeypair = Keypair.fromSecretKey(sponsorPrivateKey);

// Create an Anchor wallet adapter from the keypair
const sponsorWallet = {
  publicKey: sponsorKeypair.publicKey,
  signTransaction: async (tx) => {
    tx.sign(sponsorKeypair);
    return tx;
  }
  // Additional methods...
};
```

## Project Structure

- `src/service/SolanaService.ts`: Handles Solana transactions and contract operations
- `src/service/SponsorService.ts`: Manages sponsored transactions for Solana
- `src/CreateSuiContract.tsx`: UI for creating Sui contracts (regular and cross-chain)
- `src/SolanaSignContract.tsx`: UI for signing Solana contracts
- `src/ContractList.tsx`: Displays all contracts and their statuses
- `src/App.tsx`: Main application component

## Security Considerations

- **Important**: In a production environment, never store private keys in client-side code
- Use a secure backend service to manage private keys and sign transactions
- The sponsor wallet feature should be implemented as a server-side service in production
- Consider using a proper key management system for production deployments
- Rate limit the sponsored transactions to prevent abuse
- Implement proper validation to ensure only legitimate contracts get sponsored

## Troubleshooting

- If the sponsored transactions aren't working, check:
  - The sponsor wallet has enough SOL for transactions
  - The environment variable is correctly set (must start with `VITE_` for Vite to expose it)
  - The private key is correctly Base58 encoded

- Common errors:
  - "Invalid private key input" - The private key isn't correctly Base58 encoded
  - "Transaction simulation failed" - Usually means the program validation failed or there's not enough SOL
  - "Connection error" - Check your network connection to the Solana testnet/devnet

## License

This project is licensed under the MIT License - see the LICENSE file for details.
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
