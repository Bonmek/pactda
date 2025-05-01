import { useState } from 'react';
import { ethers } from 'ethers';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useAccount } from 'wagmi';
import { 
  transferFromEthToSui, 
  transferFromSuiToEth,
  getWormholeVAA,
  completeTransferOnEth
} from '../services/tokenTransfer';
import { TokenBridge, TransferStatus } from '../types';
import { CHAINS, getTokenBySymbolAndChain } from '../config';

interface UseTokenTransferProps {
  sourceChain: number;
  targetChain: number;
}

interface UseTokenTransferReturn {
  transferToken: (params: {
    tokenSymbol: string;
    amount: string;
    recipient?: string;
  }) => Promise<TransferStatus>;
  completeTransfer: (sourceChain: number, txHash: string) => Promise<TransferStatus | null>;
  status: TransferStatus;
  resetStatus: () => void;
}

/**
 * Hook for handling Wormhole token transfers between chains
 */
export function useTokenTransfer({ 
  sourceChain, 
  targetChain 
}: UseTokenTransferProps): UseTokenTransferReturn {
  const [status, setStatus] = useState<TransferStatus>({ status: 'idle' });
  
  // Get wallet accounts
  const suiAccount = useCurrentAccount();
  const { address: ethAddress, isConnected: isEthConnected } = useAccount();
  
  const resetStatus = () => {
    setStatus({ status: 'idle' });
  };
  
  // Transfer token from source chain to target chain
  const transferToken = async ({
    tokenSymbol,
    amount,
    recipient
  }: {
    tokenSymbol: string;
    amount: string;
    recipient?: string;
  }): Promise<TransferStatus> => {
    try {
      setStatus({ status: 'preparing' });
      
      // Get token address on source chain
      const tokenAddress = getTokenBySymbolAndChain(tokenSymbol, sourceChain);
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} not supported on chain ${sourceChain}`);
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
      const transferParams: TokenBridge = {
        sourceChain,
        targetChain,
        token: tokenAddress,
        amount,
        recipient: recipientAddress
      };
      
      let result: TransferStatus;
      
      // Execute the transfer based on source chain
      if (sourceChain === Number(import.meta.env.VITE_CHAIN_ID_ETH)) {
        // Get provider for Ethereum
        const provider = new ethers.BrowserProvider(window.ethereum);
        result = await transferFromEthToSui(provider, transferParams);
      } else if (sourceChain === Number(import.meta.env.VITE_CHAIN_ID_SUI)) {
        // For this POC, assuming SuiWallet is already set up and connected
        const suiWallet = (window as any).suiWallet;
        // This is a placeholder. In a real app, you would use the actual Sui SDK client
        const suiProvider = null;
        
        result = await transferFromSuiToEth(suiProvider, suiWallet, transferParams);
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
        result = await completeTransferOnEth(provider, vaa.payload);
      } else {
        // For Sui, this would be implemented separately
        throw new Error('Completing transfers on Sui not yet implemented');
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
    transferToken,
    completeTransfer,
    status,
    resetStatus
  };
}