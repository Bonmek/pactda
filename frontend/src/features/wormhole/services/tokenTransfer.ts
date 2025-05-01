import { ethers } from 'ethers';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { CHAINS } from '../config';
import { TokenBridge, TransferStatus, WormholeVAA, NFTBridge } from '../types';

// Token bridge ABI for the example
const TOKEN_BRIDGE_ABI = [
  'function transferTokens(address token, uint256 amount, uint16 recipientChain, bytes32 recipient, uint256 arbiterFee, uint32 nonce) external returns (uint64 sequence)',
  'function completeTransfer(bytes calldata encodedVm) external',
];

// NFT bridge ABI for the example
const NFT_BRIDGE_ABI = [
  'function transferNFT(address token, uint256 tokenId, uint16 recipientChain, bytes32 recipient, uint32 nonce) external returns (uint64 sequence)',
  'function completeTransfer(bytes calldata encodedVm) external',
];

// NFT approval ABI
const NFT_APPROVAL_ABI = [
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  'function getApproved(uint256 tokenId) external view returns (address)',
  'function approve(address to, uint256 tokenId) external'
];

/**
 * Initiates a token transfer from Ethereum to Sui via Wormhole
 */
export async function transferFromEthToSui(
  provider: ethers.BrowserProvider,
  params: TokenBridge
): Promise<TransferStatus> {
  try {
    const status: TransferStatus = { status: 'preparing' };
    const signer = await provider.getSigner();
    const sourceChainConfig = CHAINS[params.sourceChain];
    const targetChainConfig = CHAINS[params.targetChain];
    
    if (!sourceChainConfig || !targetChainConfig) {
      throw new Error('Invalid chain configuration');
    }

    // Create contract instance
    const tokenBridgeContract = new ethers.Contract(
      sourceChainConfig.tokenBridgeAddress,
      TOKEN_BRIDGE_ABI,
      signer
    );

    // Create token contract for approval
    const tokenContract = new ethers.Contract(
      params.token,
      ['function approve(address spender, uint256 amount) external returns (bool)'],
      signer
    );

    // Approve token spending
    status.status = 'signing';
    const approveTx = await tokenContract.approve(
      sourceChainConfig.tokenBridgeAddress, 
      params.amount
    );
    await approveTx.wait();

    // Format recipient address for Wormhole (32-byte address)
    const recipientAddress = ethers.zeroPadValue(params.recipient, 32);
    
    // Transfer tokens
    status.status = 'sending';
    const transferTx = await tokenBridgeContract.transferTokens(
      params.token,
      params.amount,
      params.targetChain,
      recipientAddress,
      params.fee || '0',
      Math.floor(Math.random() * 100000) // Random nonce
    );
    
    status.txHash = transferTx.hash;
    status.status = 'confirming';
    
    await transferTx.wait();
    status.status = 'completed';
    
    return status;
  } catch (error) {
    console.error('Error transferring tokens from Ethereum:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Initiates a token transfer from Sui to Ethereum via Wormhole
 */
export async function transferFromSuiToEth(
  suiProvider: any, // SuiClient
  suiWallet: any, // ConnectedWallet from Sui
  params: TokenBridge
): Promise<TransferStatus> {
  try {
    const status: TransferStatus = { status: 'preparing' };
    const sourceChainConfig = CHAINS[params.sourceChain];
    const targetChainConfig = CHAINS[params.targetChain];
    
    if (!sourceChainConfig || !targetChainConfig) {
      throw new Error('Invalid chain configuration');
    }

    // Create a new transaction block
    const tx = new TransactionBlock();
    
    // Call to token bridge module - this is simplified and would need to be adapted
    // to your actual SUI module implementation
    tx.moveCall({
      target: `${sourceChainConfig.tokenBridgeAddress}::token_bridge::transfer_tokens`,
      arguments: [
        tx.pure(params.token), // Token object ID
        tx.pure(params.amount), // Amount as string
        tx.pure(params.targetChain), // Target chain as number
        tx.pure(params.recipient), // Recipient address
        tx.pure(params.fee || '0'), // Fee
      ],
    });

    status.status = 'signing';
    
    // Sign and execute the transaction
    const result = await suiWallet.signAndExecuteTransactionBlock({
      transactionBlock: tx,
    });
    
    status.txHash = result.digest;
    status.status = 'completed';
    
    return status;
  } catch (error) {
    console.error('Error transferring tokens from Sui:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Retrieves a Wormhole VAA for a completed transfer
 */
export async function getWormholeVAA(
  sourceChain: number,
  transactionHash: string,
  wormholeRpc: string = import.meta.env.VITE_WORMHOLE_RPC || ''
): Promise<WormholeVAA | null> {
  try {
    // In a real implementation, you would:
    // 1. Wait for finality on the source chain
    // 2. Call Wormhole Guardian network to get the signed VAA
    // 3. Parse and return the VAA
    
    // For this POC, we'll simulate calling the Wormhole RPC
    const response = await fetch(
      `${wormholeRpc}/v1/signed_vaa/${sourceChain}/${transactionHash}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch VAA: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // This is a simplified example and would need parsing in a real app
    return data.vaaBytes ? {
      // This is a placeholder - in reality you would parse the VAA bytes
      version: 1,
      guardianSetIndex: 0,
      signatures: [],
      timestamp: Date.now() / 1000,
      nonce: 0,
      emitterChain: sourceChain,
      emitterAddress: '',
      sequence: '0',
      consistencyLevel: 0,
      payload: data.vaaBytes,
    } : null;
  } catch (error) {
    console.error('Error fetching VAA:', error);
    return null;
  }
}

/**
 * Completes a token transfer on the target chain (Ethereum in this example)
 */
export async function completeTransferOnEth(
  provider: ethers.BrowserProvider,
  vaa: string // Encoded VAA bytes
): Promise<TransferStatus> {
  try {
    const status: TransferStatus = { status: 'preparing' };
    const signer = await provider.getSigner();
    const chainConfig = CHAINS[Number(import.meta.env.VITE_CHAIN_ID_ETH)];
    
    if (!chainConfig) {
      throw new Error('Invalid chain configuration');
    }

    // Create contract instance
    const tokenBridgeContract = new ethers.Contract(
      chainConfig.tokenBridgeAddress,
      TOKEN_BRIDGE_ABI,
      signer
    );

    // Complete the transfer on Ethereum
    status.status = 'sending';
    const completeTx = await tokenBridgeContract.completeTransfer(vaa);
    
    status.txHash = completeTx.hash;
    status.status = 'confirming';
    
    await completeTx.wait();
    status.status = 'completed';
    
    return status;
  } catch (error) {
    console.error('Error completing transfer on Ethereum:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Initiates an NFT transfer from Ethereum to Sui via Wormhole
 */
export async function transferNFTFromEthToSui(
  provider: ethers.BrowserProvider,
  params: NFTBridge
): Promise<TransferStatus> {
  try {
    const status: TransferStatus = { status: 'preparing' };
    const signer = await provider.getSigner();
    const sourceChainConfig = CHAINS[params.sourceChain];
    const targetChainConfig = CHAINS[params.targetChain];
    
    if (!sourceChainConfig || !targetChainConfig) {
      throw new Error('Invalid chain configuration');
    }

    // Create contract instances
    const nftBridgeContract = new ethers.Contract(
      sourceChainConfig.nftBridgeAddress,
      NFT_BRIDGE_ABI,
      signer
    );

    // Create NFT contract for approval
    const nftContract = new ethers.Contract(
      params.nft,
      NFT_APPROVAL_ABI,
      signer
    );

    // Check current approval
    const signerAddress = await signer.getAddress();
    const isApproved = await nftContract.isApprovedForAll(signerAddress, sourceChainConfig.nftBridgeAddress);

    // Approve NFT for bridge if not already approved
    if (!isApproved) {
      status.status = 'signing';
      console.log('Approving NFT bridge to transfer NFTs');
      const approveTx = await nftContract.setApprovalForAll(sourceChainConfig.nftBridgeAddress, true);
      await approveTx.wait();
    }

    // Format recipient address for Wormhole (32-byte address)
    const recipientAddress = ethers.zeroPadValue(params.recipient, 32);
    
    // Transfer NFT
    status.status = 'sending';
    const transferTx = await nftBridgeContract.transferNFT(
      params.nft,
      params.tokenId,
      params.targetChain,
      recipientAddress,
      Math.floor(Math.random() * 100000) // Random nonce
    );
    
    status.txHash = transferTx.hash;
    status.status = 'confirming';
    
    await transferTx.wait();
    status.status = 'completed';
    
    return status;
  } catch (error) {
    console.error('Error transferring NFT from Ethereum:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Initiates an NFT transfer from Sui to Ethereum via Wormhole
 */
export async function transferNFTFromSuiToEth(
  suiProvider: any, // SuiClient
  suiWallet: any, // ConnectedWallet from Sui
  params: NFTBridge
): Promise<TransferStatus> {
  try {
    const status: TransferStatus = { status: 'preparing' };
    const sourceChainConfig = CHAINS[params.sourceChain];
    const targetChainConfig = CHAINS[params.targetChain];
    
    if (!sourceChainConfig || !targetChainConfig) {
      throw new Error('Invalid chain configuration');
    }

    // Create a new transaction block
    const tx = new TransactionBlock();
    
    // Call to NFT bridge module - this is simplified and would need to be adapted
    // to your actual SUI module implementation
    tx.moveCall({
      target: `${sourceChainConfig.nftBridgeAddress}::nft_bridge::transfer_nft`,
      arguments: [
        tx.pure(params.nft), // NFT object ID
        tx.pure(params.tokenId), // Token ID
        tx.pure(params.targetChain), // Target chain as number
        tx.pure(params.recipient), // Recipient address
      ],
    });

    status.status = 'signing';
    
    // Sign and execute the transaction
    const result = await suiWallet.signAndExecuteTransactionBlock({
      transactionBlock: tx,
    });
    
    status.txHash = result.digest;
    status.status = 'completed';
    
    return status;
  } catch (error) {
    console.error('Error transferring NFT from Sui:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Completes an NFT transfer on the target chain (Ethereum in this example)
 */
export async function completeNFTTransferOnEth(
  provider: ethers.BrowserProvider,
  vaa: string // Encoded VAA bytes
): Promise<TransferStatus> {
  try {
    const status: TransferStatus = { status: 'preparing' };
    const signer = await provider.getSigner();
    const chainConfig = CHAINS[Number(import.meta.env.VITE_CHAIN_ID_ETH)];
    
    if (!chainConfig) {
      throw new Error('Invalid chain configuration');
    }

    // Create contract instance
    const nftBridgeContract = new ethers.Contract(
      chainConfig.nftBridgeAddress,
      NFT_BRIDGE_ABI,
      signer
    );

    // Complete the transfer on Ethereum
    status.status = 'sending';
    const completeTx = await nftBridgeContract.completeTransfer(vaa);
    
    status.txHash = completeTx.hash;
    status.status = 'confirming';
    
    await completeTx.wait();
    status.status = 'completed';
    
    return status;
  } catch (error) {
    console.error('Error completing NFT transfer on Ethereum:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}