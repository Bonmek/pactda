import { useState } from 'react'
import { Input } from '@/components/ui/input'

const blockchains = ['Sui', 'Ethereum', 'Solana', 'Polygon', 'Avalanche']

interface PartyInformationProps {
  partyAAddress?: string
  partyBAddress?: string
  onPartyBAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const PartyInformation = ({ partyAAddress, partyBAddress, onPartyBAddressChange }: PartyInformationProps) => {
  const [partyBBlockchain, setPartyBBlockchain] = useState<string>('Sui')

  const handleBlockchainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPartyBBlockchain(e.target.value)
  }

  return (
    <div className="space-y-8">
      {/* Party A - Initiator */}
      <div>
        <h3 className="block text-md font-semibold text-indigo-400 mb-2">
          You (Party A - Initiator)
        </h3>
        <Input
          placeholder="[Connected Sui Address]"
          className="w-full bg-slate-800/30 border-slate-700/50 text-white"
          value={partyAAddress}
          disabled
        />
      </div>

      {/* Party B - Counterparty */}
      <div>
        <h3 className="block text-md font-semibold text-indigo-400 mb-2">
          Counterparty (Party B) Address
        </h3>
        <Input
          placeholder="Enter Party B's address"
          className="w-full bg-slate-800/30 border-slate-700/50 text-white"
          value={partyBAddress}
          onChange={onPartyBAddressChange}
          required
        />
      </div>

      {/* Party B's Blockchain */}
      <div>
        <h3 className="block text-md font-semibold text-indigo-400 mb-2">
          Party B's Primary Blockchain
        </h3>
        <select
          className="w-full px-4 py-2 rounded-md bg-[#1E293B] border border-slate-700/50 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={partyBBlockchain}
          onChange={handleBlockchainChange}
        >
          {blockchains.map((blockchain) => (
            <option key={blockchain} value={blockchain}>
              {blockchain}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default PartyInformation
