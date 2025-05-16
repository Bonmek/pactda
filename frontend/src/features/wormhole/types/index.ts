/**
 * Types for PactDA Wormhole integration
 */

export interface TokenBridge {
  sourceChain: number; // Wormhole chain ID
  targetChain: number; // Wormhole chain ID
  token: string; // Token address on source chain
  amount: string; // Amount to transfer (in smallest unit)
  recipient: string; // Recipient address on target chain
  fee?: string; // Optional relayer fee
}

export interface NFTBridge {
  sourceChain: number; // Wormhole chain ID
  targetChain: number; // Wormhole chain ID
  nft: string; // NFT address on source chain
  tokenId: string; // Token ID of the NFT
  recipient: string; // Recipient address on target chain
  fee?: string; // Optional relayer fee
}

export interface TransferStatus {
  status: 'idle' | 'preparing' | 'signing' | 'sending' | 'confirming' | 'completed' | 'failed';
  txHash?: string; // Source chain transaction hash
  targetTxHash?: string; // Target chain transaction hash (if applicable)
  error?: string;
}

export interface ChainConfig {
  name: string;
  rpc: string;
  wormholeChainId: number;
  nativeChainId: number; // Chain's own ID system (e.g., EVM chainId)
  bridgeAddress: string;
  tokenBridgeAddress: string;
  nftBridgeAddress: string; // Added for NFT bridge support
  explorerUrl: string;
}

export interface SupportedToken {
  symbol: string;
  name: string;
  logo?: string;
  decimals: number;
  addresses: Record<number, string>; // Map of chainId to token address
}

export interface SupportedNFTCollection {
  symbol: string;
  name: string;
  logo?: string;
  addresses: Record<number, string>; // Map of chainId to NFT collection address
}

// PactDA specific types related to cross-chain agreements
export interface CrossChainAgreement {
  id: string;
  sourceChain: number;
  creator: string;
  counterparty: string; // Address on target chain
  counterpartyChain: number;
  status: 'draft' | 'pending' | 'active' | 'disputed' | 'completed' | 'cancelled';
  escrowAmount?: string;
  escrowToken?: string;
  deliverables: string;
  milestones: Milestone[];
}

export interface Milestone {
  id: number;
  description: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected' | 'disputed';
  proof?: string;
  approvalTxHash?: string;
}

// Wormhole VAA (Verified Action Approval) interface
export interface WormholeVAA {
  version: number;
  guardianSetIndex: number;
  signatures: string[];
  timestamp: number;
  nonce: number;
  emitterChain: number;
  emitterAddress: string;
  sequence: string;
  consistencyLevel: number;
  payload: string; // Hex encoded payload
}