import React from 'react';
import { NFTBridgeForm } from '../../features/wormhole/components/NFTBridgeForm';
import { PACTDA_CONFIG } from '../../features/wormhole/config';

export default function TokenBridgePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
            PactDA Cross-Chain NFT Bridge
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Transfer NFTs between Sui and Ethereum securely with Wormhole integration
          </p>
        </div>
        
        {/* Visual representation of chains */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">ETH</span>
            </div>
            <div className="w-32 h-2 bg-gradient-to-r from-blue-700 to-teal-500 relative">
              <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
                Wormhole
              </div>
            </div>
            <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">SUI</span>
            </div>
          </div>
        </div>
        
        {/* PactDA Core Vision */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6 mb-10">
          <h3 className="text-xl font-semibold mb-3 text-blue-400">
            PactDA: Decentralized Agreement & Trust Protocol
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            PactDA is a decentralized agreement platform architected with Sui as its secure execution 
            hub and enhanced with non-custodial multi-chain authorization via Wormhole. This enables 
            users on supported chains (e.g., Ethereum) to interact with Sui-based agreements using 
            their native wallets, alongside Sui-native users leveraging zkLogin for seamless onboarding.
          </p>
          
          <h4 className="text-md font-semibold mb-2 text-purple-300">Key Features:</h4>
          <ul className="list-disc list-inside text-sm text-gray-300 space-y-1 mb-4">
            <li>Multi-Chain Authorization (Non-Custodial)</li>
            <li>Smart Contract Escrow</li>
            <li>Automated Payment Release</li>
            <li>Agreement Lifecycle Management</li>
            <li>Future VCNFT Dispute Resolution Framework</li>
          </ul>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
              Trustless
            </div>
            <div className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
              Non-custodial
            </div>
            <div className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
              Multi-chain
            </div>
            <div className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
              Secure
            </div>
          </div>
        </div>
        
        {/* NFT Bridge Form Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Cross-Chain NFT Bridge</h2>
          <p className="text-gray-300 mb-8">
            This cross-chain NFT bridge demonstrates PactDA's capability to securely transfer NFTs 
            between chains using Wormhole as the messaging protocol. This technology enables secure 
            cross-chain agreement verification and ownership transfer of digital assets.
          </p>
          
          {/* The actual bridge component */}
          <NFTBridgeForm />
        </div>
        
        {/* How It Works Section */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6 mb-12">
          <h3 className="text-xl font-semibold mb-4 text-blue-400 text-center">
            How Cross-Chain NFT Transfer Works
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-medium text-gray-200">Lock NFT on Source Chain</h4>
                <p className="text-sm text-gray-400">
                  When you initiate an NFT transfer from your source chain (e.g., Ethereum), 
                  the NFT is locked in a bridge contract and a transfer message is emitted for Wormhole.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-medium text-gray-200">Wormhole Guardian Verification</h4>
                <p className="text-sm text-gray-400">
                  Wormhole's decentralized Guardian network observes and attests to the emitted 
                  message, creating a cryptographically secure VAA (Verified Action Approval).
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-medium text-gray-200">Mint NFT on Target Chain</h4>
                <p className="text-sm text-gray-400">
                  On the target chain (e.g., Sui), the VAA is verified and an equivalent wrapped NFT 
                  is minted to the recipient. The same mechanism powers PactDA's cross-chain agreement 
                  verification and VCNFT-based dispute resolution.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Future Integration Note */}
        <div className="text-center text-sm text-gray-400 py-4">
          <p>
            In the full PactDA protocol, NFT transfers enable secure cross-chain ownership of digital assets,
            including agreement verification NFTs and reputation-based VCNFT dispute resolution tokens.
          </p>
          <p className="mt-2">
            <span className="text-blue-400">Coming soon:</span> Cross-chain agreement creation, milestone approvals, and VCNFT-based dispute resolution.
          </p>
        </div>
      </div>
    </div>
  );
}