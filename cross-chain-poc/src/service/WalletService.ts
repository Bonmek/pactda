/**
 * Service to manage wallet-related functionality for the cross-chain proof of concept.
 * This includes checking wallet connections, getting balances, etc.
 */

import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Check if the Solana wallet has sufficient SOL for transaction fees.
 * @param connection Solana connection
 * @param walletAddress Solana wallet public key
 * @param minimumBalance Minimum SOL balance required (in lamports)
 * @returns Boolean indicating if the wallet has sufficient balance
 */
export const checkSolanaWalletBalance = async (
  connection: Connection,
  walletAddress: PublicKey,
  minimumBalance: number = 10000000 // Default: 0.01 SOL
): Promise<boolean> => {
  try {
    const balance = await connection.getBalance(walletAddress);
    return balance >= minimumBalance;
  } catch (error) {
    console.error('Error checking Solana wallet balance:', error);
    return false;
  }
};

/**
 * Format a Solana wallet address for display, shortening it for UI.
 * @param address Full wallet address
 * @returns Shortened address in format "abcd...wxyz"
 */
export const formatSolanaAddress = (address: string): string => {
  if (!address || address.length < 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

/**
 * Format a Sui wallet address for display, shortening it for UI.
 * @param address Full wallet address
 * @returns Shortened address in format "0xabcd...wxyz"
 */
export const formatSuiAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Check if both Sui and Solana wallets are connected for cross-chain operations.
 * @param suiAddress Sui wallet address
 * @param solanaAddress Solana wallet address (as public key or string)
 * @returns Boolean indicating if both wallets are connected
 */
export const areBothWalletsConnected = (
  suiAddress: string | undefined | null,
  solanaAddress: PublicKey | string | undefined | null
): boolean => {
  return !!(suiAddress && solanaAddress);
};

/**
 * Calculate the Wormhole chain ID for a blockchain.
 * @param chainName The name of the blockchain (e.g., 'solana', 'sui')
 * @returns The Wormhole chain ID
 */
export const getWormholeChainId = (chainName: string): number => {
  const chainIds: Record<string, number> = {
    ethereum: 2,
    bsc: 4,
    polygon: 5,
    avalanche: 6,
    fantom: 10,
    celo: 14,
    solana: 1,
    sui: 21,
  };
  
  return chainIds[chainName.toLowerCase()] || 0;
};
