import { useState } from 'react';
import { ethers } from 'ethers';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useAccount } from 'wagmi';
import { 
  transferNFTFromEthToSui, 
  transferNFTFromSuiToEth,
  getWormholeVAA,
  completeNFTTransferOnEth
} from '../services/tokenTransfer';
import { NFTBridge, TransferStatus } from '../types';
import { CHAINS, getNFTCollectionBySymbolAndChain } from '../config';

interface UseNFTTransferProps {
  sourceChain: number;
  targetChain: number;
}

interface UseNFTTransferReturn {
  transferNFT: (params: {
    collectionSymbol: string;
    tokenId: string;
    recipient?: string;
  }) => Promise<TransferStatus>;
  completeTransfer: (sourceChain: number, txHash: string) => Promise<TransferStatus | null>;
  status: TransferStatus;
  resetStatus: () => void;
}

/**
 * Hook for handling Wormhole NFT transfers between chains
 */
export function useNFTTransfer({ 
  sourceChain, 
  targetChain 
}: UseNFTTransferProps): UseNFTTransferReturn {
  const [status, setStatus] = useState<TransferStatus>({ status: 'idle' });
  
  // Get wallet accounts
  const suiAccount = useCurrentAccount();
  const { address: ethAddress, isConnected: isEthConnected } = useAccount();
  
  const resetStatus = () => {
    setStatus({ status: 'idle' });
  };
  
  // Transfer NFT from source chain to target chain
  const transferNFT = async ({
    collectionSymbol,
    tokenId,
    recipient
  }: {
    collectionSymbol: string;
    tokenId: string;
    recipient?: string;
  }): Promise<TransferStatus> => {
    try {
      setStatus({ status: 'preparing' });
      
      // Get NFT collection address on source chain
      const nftAddress = getNFTCollectionBySymbolAndChain(collectionSymbol, sourceChain);
      if (!nftAddress) {
        throw new Error(`NFT collection ${collectionSymbol} not supported on chain ${sourceChain}`);
      }
      
      // Determine recipient address if not provided
      let recipientAddress = recipient;
      if (!recipientAddress) {
        if (targetChain === Number(import.meta.env.VITE_CHAIN_ID_SUI) && suiAccount) {
          recipientAddress = suiAccount.address;
        } else if (targetChain === Number(import.meta.env.VITE_CHAIN_ID_ETH) && isEthConnected && ethAddress) {
          recipientAddress = ethAddress;
        } else {
          throw new Error('No recipient address provided and no wallet connected for target chain');
        }
      }
      
      // Set up transfer parameters
      const transferParams: NFTBridge = {
        sourceChain,
        targetChain,
        nft: nftAddress,
        tokenId,
        recipient: recipientAddress
      };
      
      let result: TransferStatus;
      
      // Execute the transfer based on source chain
      if (sourceChain === Number(import.meta.env.VITE_CHAIN_ID_ETH)) {
        // Get provider for Ethereum
        const provider = new ethers.BrowserProvider(window.ethereum);
        result = await transferNFTFromEthToSui(provider, transferParams);
      } else if (sourceChain === Number(import.meta.env.VITE_CHAIN_ID_SUI)) {
        // For this POC, assuming SuiWallet is already set up and connected
        const suiWallet = (window as any).suiWallet;
        // This is a placeholder. In a real app, you would use the actual Sui SDK client
        const suiProvider = null;
        
        result = await transferNFTFromSuiToEth(suiProvider, suiWallet, transferParams);
      } else {
        throw new Error(`Unsupported source chain: ${sourceChain}`);
      }
      
      setStatus(result);
      return result;
    } catch (error) {
      const errorStatus: TransferStatus = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setStatus(errorStatus);
      return errorStatus;
    }
  };
  
  // Complete a transfer on the target chain
  const completeTransfer = async (
    sourceChain: number,
    txHash: string
  ): Promise<TransferStatus | null> => {
    try {
      setStatus({ status: 'preparing' });
      
      // Get VAA from Wormhole
      const vaa = await getWormholeVAA(sourceChain, txHash);
      if (!vaa) {
        throw new Error('Failed to retrieve VAA');
      }
      
      let result: TransferStatus | null = null;
      
      // Complete the transfer based on target chain
      if (targetChain === Number(import.meta.env.VITE_CHAIN_ID_ETH)) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        result = await completeNFTTransferOnEth(provider, vaa.payload);
      } else {
        // For Sui, this would be implemented separately
        throw new Error('Completing NFT transfers on Sui not yet implemented');
      }
      
      if (result) {
        setStatus(result);
      }
      return result;
    } catch (error) {
      const errorStatus: TransferStatus = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setStatus(errorStatus);
      return errorStatus;
    }
  };

  return {
    transferNFT,
    completeTransfer,
    status,
    resetStatus
  };
}