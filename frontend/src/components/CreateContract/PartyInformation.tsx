import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import suiLogo from './chain-logos/sui.svg'
import solanaLogo from './chain-logos/solana.svg'
import EthereumLogo from './chain-logos/ethereum.svg'
import PolygonLogo from './chain-logos/polygon.svg'
import AvalanceLogo from './chain-logos/avalanche.svg'

// Update blockchains array to use SVGs for icons
const blockchains = [
  { name: 'Sui', icon: suiLogo, color: 'text-blue-400' },
  { name: 'Ethereum', icon: EthereumLogo, color: 'text-indigo-400' },
  { name: 'Solana', icon: solanaLogo, color: 'text-purple-400' },
  { name: 'Polygon', icon: PolygonLogo, color: 'text-purple-500' },
  { name: 'Avalanche', icon: AvalanceLogo, color: 'text-red-400' },
]

interface PartyInformationProps {
  partyAAddress?: string
  partyBAddress?: string
  onPartyBAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const PartyInformation = ({
  partyAAddress,
  partyBAddress,
  onPartyBAddressChange,
}: PartyInformationProps) => {
  const [partyBBlockchain, setPartyBBlockchain] = useState<string>('Sui')

  const handleBlockchainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPartyBBlockchain(e.target.value)
  }

  // Handle direct click on blockchain option
  const handleBlockchainClick = (blockchain: string) => {
    setPartyBBlockchain(blockchain)
  }

  return (
    <div className="space-y-8">
      {/* Party A - Initiator */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 p-4 rounded-lg border border-blue-600/20">
        <h3 className="text-md font-semibold text-blue-400 mb-3 flex items-center">
          <span className="mr-2 p-1 bg-blue-900/30 rounded-full w-6 h-6 inline-flex items-center justify-center text-xs border border-blue-500/30">
            A
          </span>
          You (Party A - Initiator)
        </h3>

        <div className="relative">
          <Input
            placeholder="[Connected Sui Address]"
            className="w-full bg-slate-800/40 border-blue-500/30 text-blue-100 py-2 pl-10 pr-3 rounded-lg focus:border-blue-400"
            value={partyAAddress}
            disabled
          />
          <div className="absolute left-3 top-5 transform -translate-y-1/2">
            <img src={suiLogo} alt={partyBBlockchain} className="w-5 h-5" />
          </div>
          {partyAAddress && (
            <div className="mt-2 text-xs text-green-400 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Connected wallet verified
            </div>
          )}
        </div>
      </div>

      {/* Party B - Counterparty */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 p-4 rounded-lg border border-indigo-600/20">
        <h3 className="text-md font-semibold text-indigo-400 mb-3 flex items-center">
          <span className="mr-2 p-1 bg-indigo-900/30 rounded-full w-6 h-6 inline-flex items-center justify-center text-xs border border-indigo-500/30">
            B
          </span>
          Counterparty (Party B) Address
        </h3>
        <div className="relative">
          <Input
            placeholder="Enter Party B's address"
            className="w-full bg-slate-800/40 border-indigo-500/30 text-white py-2 pl-10 pr-3 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-600/30"
            value={partyBAddress}
            onChange={onPartyBAddressChange}
          />
          <div className="absolute left-3 top-4 transform -translate-y-1/2">
            {blockchains.find((b) => b.name === partyBBlockchain)?.icon ? (
              <img
                src={blockchains.find((b) => b.name === partyBBlockchain)?.icon}
                alt={partyBBlockchain}
                className="w-5 h-5"
              />
            ) : (
              <span className="w-5 h-5 flex items-center justify-center">
                {partyBBlockchain[0]}
              </span>
            )}
          </div>

          {partyBAddress && partyBAddress.length > 30 && (
            <div className="mt-2 text-xs text-green-400 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Address format valid
            </div>
          )}

          {partyBAddress &&
            partyBAddress.length > 0 &&
            partyBAddress.length <= 30 && (
              <div className="mt-2 text-xs text-amber-400 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Please enter a valid address
              </div>
            )}
        </div>
      </div>

      {/* Party B's Blockchain */}
      <div className="mt-6">
        <h3 className="text-md font-semibold text-indigo-400 mb-3">
          Party B's Primary Blockchain
        </h3>

        {/* Visual blockchain selector */}
        <div className="flex flex-wrap gap-3 mb-4">
          {blockchains.map((blockchain) => (
            <motion.div
              key={blockchain.name}
              className={`px-4 py-2 rounded-lg cursor-pointer inline-flex items-center ${
                partyBBlockchain === blockchain.name
                  ? 'bg-indigo-900/40 border-2 border-indigo-500/50'
                  : 'bg-slate-800/40 border border-slate-700/50 hover:border-indigo-500/30'
              }`}
              onClick={() => handleBlockchainClick(blockchain.name)}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
            >
              {blockchain.icon ? (
                <img
                  src={blockchain.icon}
                  alt={blockchain.name}
                  className="w-5 h-5 mr-2"
                />
              ) : (
                <span className="mr-2">{blockchain.name[0]}</span>
              )}
              <span className={blockchain.color}>{blockchain.name}</span>
            </motion.div>
          ))}
        </div>

        {/* Fallback select for accessibility */}
        {/* <select
          className="w-full px-4 py-3 rounded-lg bg-slate-800/60 border border-indigo-500/30 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
          value={partyBBlockchain}
          onChange={handleBlockchainChange}
        >
          {blockchains.map((blockchain) => (
            <option key={blockchain.name} value={blockchain.name}>
              <img
                src={blockchain.icon}
                alt={blockchain.name}
                className="w-5 h-5 mr-2"
              />{' '}
              {blockchain.name}
            </option>
          ))}
        </select> */}
      </div>
    </div>
  )
}

export default PartyInformation
