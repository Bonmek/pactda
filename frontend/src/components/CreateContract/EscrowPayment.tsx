import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

// Sui icon SVG
const SuiIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g>
      <path
        d="M16.7 5.6c-.4-.7-1.1-1.1-1.7-1.1-.7 0-1.3.4-1.7 1.1-2.2 3.7-8.3 14.2-8.3 18.2 0 4.7 3.8 8.5 8.5 8.5s8.5-3.8 8.5-8.5c0-4-6.1-14.5-8.3-18.2zm-1.7 22.4c-3.6 0-6.5-2.9-6.5-6.5 0-2.7 3.9-10.2 6.5-14.7 2.6 4.5 6.5 12 6.5 14.7 0 3.6-2.9 6.5-6.5 6.5zm0-10.5c-1.1 0-2 .9-2 2 0 .6.3 1.2.8 1.6.2.2.2.5.1.7-.2.2-.5.2-.7.1-.8-.7-1.2-1.7-1.2-2.7 0-2.2 1.8-4 4-4s4 1.8 4 4c0 1-.4 2-1.2 2.7-.2.2-.5.2-.7-.1-.2-.2-.2-.5.1-.7.5-.4.8-1 .8-1.6 0-1.1-.9-2-2-2z"
        fill="#6EE7B7"
      />
    </g>
  </svg>
)

interface EscrowPaymentProps {
  useChainIcon?: boolean
  chainIcon?: string // SVG or image path for chain icon
}

const EscrowPayment = ({
  useChainIcon = false,
  chainIcon,
}: EscrowPaymentProps) => {
  const [currency] = useState('SUI')

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-md font-semibold text-indigo-400 mb-2">
          Total Contract Value
        </label>
        <div className="relative flex items-center">
          {useChainIcon && chainIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
              <img src={chainIcon} alt="Chain" className="w-5 h-5" />
            </span>
          )}
          {useChainIcon && !chainIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
              <SuiIcon />
            </span>
          )}
          <Input
            type="number"
            placeholder="Enter amount (e.g. 1000)"
            className={`bg-slate-800/40 border-blue-500/30 text-white ${
              useChainIcon ? 'pl-12' : 'pl-4'
            } py-3 text-lg rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-600/30`}
            min="0"
            step="0.01"
          />
          <div className="inline-flex ml-2">
            <Button
              type="button"
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 text-lg font-semibold rounded-lg"
            >
              {currency}
            </Button>
          </div>
        </div>
        <div className="text-xs text-blue-300 mt-1 ml-1">
          Specify the total value to be held in escrow for this contract
          (optional).
        </div>
      </div>
      <div>
        <label className="block text-md font-semibold text-indigo-400 mb-2">
          Payment Notes{' '}
          <span className="text-slate-400 font-normal">(Optional)</span>
        </label>
        <textarea
          placeholder="Add any additional payment terms or notes..."
          rows={3}
          className="w-full rounded-md bg-slate-800/40 border-blue-500/20 text-white p-3 focus:border-blue-400 focus:ring-2 focus:ring-blue-600/30"
        />
      </div>
    </div>
  )
}

export default EscrowPayment
