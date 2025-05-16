import { useState } from 'react';
import { SuiClientProvider, WalletProvider as SuiWalletProvider, ConnectButton as SuiConnectButton, createNetworkConfig } from '@mysten/dapp-kit';
import { ConnectionProvider, WalletProvider as SolWalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

import { CreateSuiContract } from './CreateSuiContract';
import { ContractList } from './ContractList';
import { SolanaSignContract } from './SolanaSignContract';
import type { PactContract } from './types';
import { createSolanaStub, signContractOnSolana } from './service/SolanaService';

import '@mysten/dapp-kit/dist/index.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui.js/client';

const solWallets = [new PhantomWalletAdapter()];
const solEndpoint = clusterApiUrl('devnet');

// Wrap the app in a function component to use hooks
function AppContent() {
  const [contracts, setContracts] = useState<PactContract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  
  // Get Solana connection and wallet
  const { connection } = useConnection();
  const solanaWallet = useWallet();

  // 1. Create contract on Sui
  const handleCreate = (contract: PactContract) => {
    // Add solPartyB and suiCreator fields for display purposes
    const enhancedContract = {
      ...contract,
      solPartyB: contract.partyBAddress,
      suiCreator: contract.partyAAddress
    };
    setContracts(prev => [...prev, enhancedContract]);
  };

  // 2. Create stub on Solana - real implementation for testnet
  const handleCreateSolStub = async (id: string) => {
    if (!solanaWallet.publicKey || !solanaWallet.signTransaction) {
      setError("Please connect your Solana wallet first");
      return;
    }
    
    if (!connection) {
      setError("No connection to Solana testnet. Please check your network connection.");
      return;
    }
    
    // Find the contract
    const contract = contracts.find(c => c.id === id);
    if (!contract) {
      setError(`Contract with ID ${id} not found`);
      return;
    }
    
    // Check if the wallet has enough SOL for the transaction
    try {
      const balance = await connection.getBalance(solanaWallet.publicKey);
      console.log("Wallet balance:", solanaWallet.publicKey);
      if (balance < 10000000) { // 0.01 SOL minimum
        setError("Your Solana wallet needs more SOL for this transaction. Please fund it on testnet.");
        return;
      }
    } catch (balanceError) {
      console.error("Error checking balance:", balanceError);
      // Continue anyway - we'll let the actual transaction fail if there's not enough balance
    }
    
    setLoading(prev => ({ ...prev, [id]: true }));
    setError(null);
    
    try {
      // Create an Anchor wallet adapter
      const anchorWallet = {
        publicKey: solanaWallet.publicKey,
        signTransaction: solanaWallet.signTransaction,
        signAllTransactions: solanaWallet.signAllTransactions!
      } as anchor.Wallet;
      
      // Call the Solana service to create a stub on testnet
      const { signature, solanaStubId } = await createSolanaStub(
        connection, 
        anchorWallet, 
        contract
      );
      
      // Update the contract with Solana stub information
      setContracts(prev =>
        prev.map(c => c.id === id ? { 
          ...c, 
          solStubCreated: true,
          solanaStubId,
          solanaStubInitiator: solanaWallet.publicKey!.toString(),
          status: `${c.status} + Stub on Solana testnet`,
          solanaExplorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=testnet`
        } : c)
      );
      
      console.log(`Solana stub created on testnet: ${signature} for contract ${id}, stub ID: ${solanaStubId}`);
    } catch (err) {
      console.error("Error creating Solana stub:", err);
      
      // Handle specific error cases
      let errorMessage = "Failed to create Solana stub";
      
      if (err instanceof Error) {
        if (err.message.includes("Insufficient funds")) {
          errorMessage = "Not enough SOL in your wallet for this transaction. Please get some testnet SOL.";
        } else if (err.message.includes("Transaction simulation failed")) {
          errorMessage = "Solana transaction simulation failed. This may be due to program constraints.";
        } else if (err.message.includes("User rejected")) {
          errorMessage = "You rejected the transaction signature request.";
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // 3. Party B signs on Sol - real implementation
  const handleSign = async (id: string, _signer: string) => {
    if (!solanaWallet.publicKey || !solanaWallet.signTransaction) {
      setError("Please connect your Solana wallet first");
      return;
    }
    
    if (!connection) {
      setError("No connection to Solana testnet. Please check your network connection.");
      return;
    }
    
    // Find the contract
    const contract = contracts.find(c => c.id === id);
    if (!contract) {
      setError(`Contract with ID ${id} not found`);
      return;
    }
    
    // Check if the contract has a Solana stub
    if (!contract.solanaStubId) {
      setError("This contract doesn't have a Solana stub yet. Please create a stub first.");
      return;
    }
    
    // Check if the wallet has enough SOL for the transaction
    try {
      const balance = await connection.getBalance(solanaWallet.publicKey);
      if (balance < 10000000) { // 0.01 SOL minimum
        setError("Your Solana wallet needs more SOL for this transaction. Please fund it on testnet.");
        return;
      }
    } catch (balanceError) {
      console.error("Error checking balance:", balanceError);
      // Continue anyway - we'll let the actual transaction fail if there's not enough balance
    }
    
    setLoading(prev => ({ ...prev, [id]: true }));
    setError(null);
    
    try {
      // Create an Anchor wallet adapter
      const anchorWallet = {
        publicKey: solanaWallet.publicKey,
        signTransaction: solanaWallet.signTransaction,
        signAllTransactions: solanaWallet.signAllTransactions!
      } as anchor.Wallet;
      
      // Call the real signContractOnSolana function for testnet
      const signature = await signContractOnSolana(
        connection, 
        anchorWallet, 
        contract
      );
      
      // Update the contract with signing information
      setContracts(prev =>
        prev.map(c => c.id === id ? { 
          ...c, 
          solSigned: true,
          solanaSignatureId: signature,
          status: `${c.status} + Signed by Party B on Solana testnet`,
          solanaSignExplorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=testnet`
        } : c)
      );
      
      console.log(`Contract signed on Solana testnet with transaction signature: ${signature}`);
    } catch (err) {
      console.error("Error signing contract on Solana testnet:", err);
      
      // Handle specific error cases
      let errorMessage = "Failed to sign contract on Solana";
      
      if (err instanceof Error) {
        if (err.message.includes("Insufficient funds")) {
          errorMessage = "Not enough SOL in your wallet for this transaction. Please get some testnet SOL.";
        } else if (err.message.includes("Transaction simulation failed")) {
          errorMessage = "Solana transaction simulation failed. This may be due to program constraints.";
        } else if (err.message.includes("User rejected")) {
          errorMessage = "You rejected the transaction signature request.";
        } else if (err.message.includes("Invalid stub")) {
          errorMessage = "Invalid stub ID or PDA. The stub may not exist on-chain.";
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Don't need networkConfig here as it's used in the main App component



  return (
    <>
      <div style={{ display: 'flex', gap: 32, padding: 32 }}>
        <div>
          <h1>PactDA Cross-Chain Demo</h1>
          <SuiConnectButton />
          <CreateSuiContract onCreate={handleCreate} />
        </div>
        <div>
          <WalletMultiButton />
          <SolanaSignContract 
            contracts={contracts} 
            onSign={handleSign} 
            loading={loading}
          />
        </div>
      </div>
      {error && (
        <div style={{
          color: 'red', 
          margin: '0 32px 16px',
          padding: '8px 16px',
          backgroundColor: '#ffeeee',
          borderRadius: 4
        }}>
          {error}
        </div>
      )}
      <ContractList 
        contracts={contracts} 
        onCreateSolStub={handleCreateSolStub} 
        loading={loading}
      />
    </>
  );
}

export default function App() {
  const queryClient = new QueryClient();

  const { networkConfig } = createNetworkConfig({
    localnet: { url: getFullnodeUrl('localnet') },
    mainnet: { url: getFullnodeUrl('mainnet') },
    testnet: { url: getFullnodeUrl('testnet') },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <SuiWalletProvider>
          <ConnectionProvider endpoint={solEndpoint}>
            <SolWalletProvider wallets={solWallets} autoConnect>
              <WalletModalProvider>
                <AppContent />
              </WalletModalProvider>
            </SolWalletProvider>
          </ConnectionProvider>
        </SuiWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
