import React, { useState } from 'react';
import { useNFTTransfer } from '../hooks/useNFTTransfer';
import { CHAINS, SUPPORTED_NFT_COLLECTIONS } from '../config';
import { TransferStatus } from '../types';

interface NFTBridgeFormProps {
  defaultSourceChain?: number;
  defaultTargetChain?: number;
}

export const NFTBridgeForm: React.FC<NFTBridgeFormProps> = ({
  defaultSourceChain = Number(import.meta.env.VITE_CHAIN_ID_ETH),
  defaultTargetChain = Number(import.meta.env.VITE_CHAIN_ID_SUI),
}) => {
  // Form state
  const [sourceChain, setSourceChain] = useState(defaultSourceChain);
  const [targetChain, setTargetChain] = useState(defaultTargetChain);
  const [selectedNFTCollection, setSelectedNFTCollection] = useState(SUPPORTED_NFT_COLLECTIONS[0]?.symbol || '');
  const [tokenId, setTokenId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [txHash, setTxHash] = useState('');

  // Get NFT transfer hook
  const { transferNFT, completeTransfer, status, resetStatus } = useNFTTransfer({
    sourceChain,
    targetChain,
  });

  // Handle chain swap
  const handleSwapChains = () => {
    const temp = sourceChain;
    setSourceChain(targetChain);
    setTargetChain(temp);
  };

  // Handle NFT transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenId) {
      alert('Please enter a valid Token ID');
      return;
    }

    try {
      const result = await transferNFT({
        collectionSymbol: selectedNFTCollection,
        tokenId,
        recipient: recipient || undefined,
      });
      
      if (result.txHash) {
        setTxHash(result.txHash);
      }
    } catch (error) {
      console.error('NFT Transfer error:', error);
    }
  };

  // Handle completing a transfer (redeeming on target chain)
  const handleCompleteTransfer = async () => {
    if (!txHash) {
      alert('Please enter a transaction hash');
      return;
    }

    try {
      await completeTransfer(sourceChain, txHash);
    } catch (error) {
      console.error('Complete NFT transfer error:', error);
    }
  };

  // Status display component
  const StatusDisplay = ({ status }: { status: TransferStatus }) => (
    <div className={`mt-4 p-4 rounded-md ${
      status.status === 'completed' ? 'bg-green-800/20 border border-green-500' : 
      status.status === 'failed' ? 'bg-red-800/20 border border-red-500' : 
      'bg-blue-800/20 border border-blue-500'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Transfer Status: {status.status}</h3>
        {status.status !== 'idle' && (
          <button 
            onClick={resetStatus}
            className="text-sm text-gray-400 hover:text-white"
          >
            Reset
          </button>
        )}
      </div>
      {status.txHash && (
        <p className="text-sm">
          TX Hash: <span className="font-mono text-xs break-all">{status.txHash}</span>
        </p>
      )}
      {status.error && (
        <p className="text-sm text-red-400 mt-2">
          Error: {status.error}
        </p>
      )}
      {status.status === 'completed' && (
        <div className="mt-3 flex justify-end">
          <a
            href={`${CHAINS[sourceChain]?.explorerUrl}${status.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View on Explorer
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-xl">
      <h2 className="text-2xl font-bold text-center mb-6">PactDA Cross-Chain NFT Bridge</h2>
      <p className="text-gray-400 text-center mb-8">
        Transfer NFTs between Ethereum and Sui networks securely using Wormhole
      </p>
      
      <form onSubmit={handleTransfer} className="space-y-6">
        {/* Source and Target Chain Selection */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">Source Chain</label>
            <select 
              value={sourceChain}
              onChange={(e) => setSourceChain(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(CHAINS).map((chain) => (
                <option 
                  key={chain.wormholeChainId} 
                  value={chain.wormholeChainId}
                  disabled={chain.wormholeChainId === targetChain}
                >
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
          
          <button 
            type="button"
            onClick={handleSwapChains}
            className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-repeat"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
          </button>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">Target Chain</label>
            <select 
              value={targetChain}
              onChange={(e) => setTargetChain(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(CHAINS).map((chain) => (
                <option 
                  key={chain.wormholeChainId} 
                  value={chain.wormholeChainId}
                  disabled={chain.wormholeChainId === sourceChain}
                >
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* NFT Collection Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">NFT Collection</label>
          <select 
            value={selectedNFTCollection}
            onChange={(e) => setSelectedNFTCollection(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SUPPORTED_NFT_COLLECTIONS.map((collection) => (
              <option key={collection.symbol} value={collection.symbol}>
                {collection.name} ({collection.symbol})
              </option>
            ))}
          </select>
        </div>
        
        {/* Token ID */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Token ID</label>
          <input 
            type="text" 
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="Enter NFT Token ID"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Recipient Address (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Recipient Address (Optional)
          </label>
          <input 
            type="text" 
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="If empty, will send to your connected wallet on target chain"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={status.status !== 'idle' && status.status !== 'completed' && status.status !== 'failed'}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status.status === 'preparing' || status.status === 'signing' ? 'Preparing Transaction...' :
           status.status === 'sending' || status.status === 'confirming' ? 'Processing...' :
           'Transfer NFT'}
        </button>
      </form>
      
      {/* Status Display */}
      {status.status !== 'idle' && <StatusDisplay status={status} />}
      
      {/* Complete Transfer Section (for manual redemption) */}
      <div className="mt-8 pt-6 border-t border-gray-700">
        <h3 className="text-lg font-medium mb-4">Complete Pending Transfer</h3>
        <p className="text-sm text-gray-400 mb-4">
          If you have a pending NFT transfer that needs to be completed on the target chain, enter the source transaction hash below.
        </p>
        
        <div className="flex space-x-3">
          <input 
            type="text" 
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Transaction Hash"
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="button"
            onClick={handleCompleteTransfer}
            disabled={!txHash || status.status === 'sending' || status.status === 'confirming'}
            className="bg-green-700 hover:bg-green-800 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
};