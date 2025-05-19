import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const EscrowPayment = () => {
  const [currency, setCurrency] = useState('SUI')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-md font-semibold text-indigo-400 mb-2">
            Total Contract Value
          </label>
          <div className="flex">
            <Input
              type="number"
              placeholder="0.00"
              className="bg-slate-800/30 border-slate-700/50 text-white rounded-r-none"
            />
            <div className="inline-flex">
              <Button
                type="button"
                className="bg-slate-700 hover:bg-slate-600 text-white rounded-l-none"
              >
                {currency}
              </Button>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-md font-semibold text-indigo-400 mb-2">
            Escrow Release Condition
          </label>
          <select 
            className="w-full px-4 py-2 rounded-md bg-[#1E293B] border border-slate-700/50 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="completion">Upon Completion</option>
            <option value="milestone">Per Milestone</option>
            <option value="date">On Specific Date</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-md font-semibold text-indigo-400 mb-2">
          Payment Notes (Optional)
        </label>
        <textarea
          placeholder="Additional payment terms or notes..."
          rows={3}
          className="w-full rounded-md bg-slate-800/30 border-slate-700/50 text-white p-2"
        />
      </div>
    </div>
  )
}

export default EscrowPayment
