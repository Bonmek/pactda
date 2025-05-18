import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SuiWalletCard, MetaMaskWalletCard } from '../../components/Wallet'

export default function Index() {
  return (
    <div className="container mx-auto px-4 py-16 min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Removed floating elements to use the global pattern background */}

      <div className="relative z-10 text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient-x drop-shadow-lg">
          Welcome to the Future of Trust
        </h1>
        <p className="text-2xl text-gray-200 max-w-2xl mx-auto mb-8 animate-fade-in-up">
          PactDA is the next-gen decentralized trust protocol for contract
          creators. Secure, cross-chain, and easy to use.
        </p>
        <div className="flex flex-col md:flex-row gap-6 justify-center items-center animate-fade-in-up">
          <Link
            to="/create-contract"
            className="px-8 py-4 rounded-full bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 text-white font-bold text-lg shadow-xl hover:scale-105 transition-transform duration-200 magnetic-btn"
          >
            Create Your First Contract
          </Link>
          <Link
            to="/dashboard"
            className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-700 to-blue-500 text-white font-bold text-lg shadow-xl hover:scale-105 transition-transform duration-200 magnetic-btn"
          >
            Explore Dashboard
          </Link>
        </div>
      </div>
      <div className="relative z-10 w-full max-w-5xl mx-auto mb-16 animate-fade-in-up">
        <div className="grid md:grid-cols-4 gap-6 text-center">
          <div className="bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-200">
            <div className="text-3xl mb-2">🔒</div>
            <div className="text-lg font-bold text-blue-300 mb-1">
              Audited Security
            </div>
            <div className="text-gray-400 text-sm">
              Smart contracts are fully audited and open source.
            </div>
          </div>
          <div className="bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-200">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-lg font-bold text-purple-300 mb-1">
              Instant Settlement
            </div>
            <div className="text-gray-400 text-sm">
              Cross-chain, milestone-based escrow with no delays.
            </div>
          </div>
          <div className="bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-200">
            <div className="text-3xl mb-2">🧑‍💻</div>
            <div className="text-lg font-bold text-pink-300 mb-1">
              Web2 & Web3 Login
            </div>
            <div className="text-gray-400 text-sm">
              zkLogin, Sui, and MetaMask supported for all users.
            </div>
          </div>
          <div className="bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg hover:scale-105 transition-transform duration-200">
            <div className="text-3xl mb-2">🌐</div>
            <div className="text-lg font-bold text-green-300 mb-1">
              Multi-Chain Ready
            </div>
            <div className="text-gray-400 text-sm">
              Sui, Ethereum, and more with Wormhole integration.
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 w-full max-w-4xl mx-auto mb-16 animate-fade-in-up">
        <h2 className="text-2xl font-bold text-center mb-8 text-blue-300">
          How It Works
        </h2>
        <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
          <div className="flex-1 bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg text-left">
            <h3 className="text-lg font-bold mb-2 text-purple-300">
              1. Connect & Create
            </h3>
            <p className="text-gray-300 mb-2">
              Connect your wallet or login with Google/Facebook. Start a new
              contract in seconds.
            </p>
            <h3 className="text-lg font-bold mb-2 text-blue-300">
              2. Set Milestones
            </h3>
            <p className="text-gray-300 mb-2">
              Define payment milestones and terms. Funds are locked in smart
              escrow.
            </p>
            <h3 className="text-lg font-bold mb-2 text-green-300">
              3. Trustless Execution
            </h3>
            <p className="text-gray-300">
              Funds are released automatically as milestones are met. Disputes
              resolved on-chain.
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-64 h-64 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-spin-slow flex items-center justify-center shadow-2xl">
              <span className="text-5xl text-white font-extrabold drop-shadow-lg">
                🤝
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 w-full max-w-3xl mx-auto animate-fade-in-up">
        <h2 className="text-2xl font-bold text-center mb-8 text-pink-300">
          What People Say
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg">
            <div className="text-lg font-bold text-blue-300 mb-2">
              "I trust PactDA for all my freelance contracts!"
            </div>
            <div className="text-gray-400 text-sm">- Alice, Web3 Developer</div>
          </div>
          <div className="bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg">
            <div className="text-lg font-bold text-purple-300 mb-2">
              "The onboarding is so easy, even for my clients."
            </div>
            <div className="text-gray-400 text-sm">- Bob, Agency Owner</div>
          </div>
          <div className="bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg">
            <div className="text-lg font-bold text-green-300 mb-2">
              "Finally, a protocol I can recommend to everyone."
            </div>
            <div className="text-gray-400 text-sm">
              - Carol, Blockchain Auditor
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
