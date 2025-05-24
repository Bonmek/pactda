import { useState, useEffect } from 'react'

export default function FundEscrowModal({
  open,
  onClose,
  onFund,
  max,
  loading,
  firstMilestoneValue,
}: {
  open: boolean
  onClose: () => void
  onFund: (amount: string) => void
  max: bigint
  loading: boolean
  firstMilestoneValue?: number
}) {
  const [amount, setAmount] = useState('')
  const [touched, setTouched] = useState(false)
  const minAmount = firstMilestoneValue ?? 0
  const maxAmount = Number(max) / 1e9
  const amountNum = Number(amount)
  const showError =
    touched &&
    (amount === '' ||
      isNaN(amountNum) ||
      amountNum < minAmount ||
      amountNum > maxAmount)
  let errorMsg = ''
  if (amount === '' || isNaN(amountNum)) errorMsg = 'Please enter an amount.'
  else if (amountNum < minAmount)
    errorMsg = `Amount must be at least ${minAmount} SUI (first milestone).`
  else if (amountNum > maxAmount)
    errorMsg = `Amount cannot exceed your balance (${maxAmount} SUI).`

  useEffect(() => {
    if (!open) {
      setAmount('')
      setTouched(false)
    }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed z-50 inset-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#232946] rounded-2xl p-8 shadow-2xl w-full max-w-md mx-auto z-10 border border-blue-700/40">
        <div className="text-2xl font-bold mb-4 text-blue-200 text-center tracking-tight">
          Fund Escrow
        </div>
        <div className="mb-6">
          <label className="block mb-2 text-base text-blue-100 font-semibold">
            Amount
            <span className="ml-2 text-xs text-blue-300 font-normal">
              (max: {maxAmount} SUI)
            </span>
            {minAmount > 0 && (
              <span className="block text-yellow-300 text-xs mt-1 font-medium">
                Minimum required: {minAmount} SUI (must cover at least the first
                milestone)
              </span>
            )}
          </label>
          <input
            type="number"
            min={minAmount}
            max={maxAmount}
            step="0.000001"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setTouched(true)
            }}
            onBlur={() => setTouched(true)}
            className={`w-full rounded-lg p-3 text-lg bg-slate-900 text-blue-200 border-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-150 ${showError ? 'border-red-400' : 'border-blue-700/40'}`}
            disabled={loading}
            placeholder={`Enter amount in SUI`}
            autoFocus
          />
          {showError && (
            <div className="text-red-400 text-sm mt-2 font-medium flex items-center gap-1">
              <svg
                className="w-4 h-4 inline-block"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {errorMsg}
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-lg font-semibold shadow-md transition-all duration-150"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg text-lg font-semibold shadow-md transition-all duration-150 disabled:opacity-60"
            onClick={() => {
              setTouched(true)
              if (!showError) onFund(amount)
            }}
            disabled={loading || showError}
          >
            {loading ? 'Funding...' : 'Fund'}
          </button>
        </div>
      </div>
    </div>
  )
}
