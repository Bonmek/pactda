import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SuiWalletCard, MetaMaskWalletCard } from '../../components/Wallet';
import PactdaGoogleLogin from '@/components/Wallet/PactdaGoogleLogin';

interface IndexProps {
  selectedWalletType: 'sui' | 'metamask' | null;
  setSelectedWalletType: (type: 'sui' | 'metamask' | null) => void;
}

export default function Index({ selectedWalletType, setSelectedWalletType }: IndexProps) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            PactDA Protocol
          </span>
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Decentralized Agreement & Trust Protocol with Multi-Chain Support
        </p>
      </div>

      <div className="max-w-4xl mx-auto bg-gray-800/30 border border-gray-700 rounded-xl p-6 mb-12">
        <h2 className="text-2xl font-bold mb-4 text-center">Core Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-5 rounded-lg">
            <h3 className="text-xl font-semibold mb-2 text-blue-400">Multi-Chain Authorization</h3>
            <p className="text-gray-300 mb-3">
              Use your preferred wallet (Sui or Ethereum) to interact with agreements secured on Sui.
            </p>
            <Link 
              to="/token-bridge" 
              className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center"
            >
              Try Token Bridge Demo
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>
          <div className="bg-gray-800 p-5 rounded-lg">
            <h3 className="text-xl font-semibold mb-2 text-green-400">Smart Contract Escrow</h3>
            <p className="text-gray-300">
              Secure fund management with automated milestone-based payments and dispute resolution.
            </p>
          </div>
          <div className="bg-gray-800 p-5 rounded-lg">
            <h3 className="text-xl font-semibold mb-2 text-yellow-400">Seamless Onboarding</h3>
            <p className="text-gray-300">
              Web2-friendly experience with zkLogin for new users alongside support for existing web3 wallets.
            </p>
          </div>
          <div className="bg-gray-800 p-5 rounded-lg">
            <h3 className="text-xl font-semibold mb-2 text-purple-400">VCNFT Framework</h3>
            <p className="text-gray-300">
              Decentralized dispute resolution through Verifiable Credential NFTs (coming soon).
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-center mb-6">Connect Your Wallet</h2>
      <div className="flex flex-col md:flex-row justify-center gap-8 mb-12">
        <SuiWalletCard />
        <MetaMaskWalletCard />
        <PactdaGoogleLogin/>
      </div>
    </div>
  )
}
