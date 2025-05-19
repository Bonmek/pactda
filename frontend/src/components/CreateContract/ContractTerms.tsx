import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/DatePicker'
import { useState } from 'react'

type ContractTermsProps = {
  startDate: Date | undefined
  endDate: Date | undefined
  setStartDate: (date?: Date) => void
  setEndDate: (date?: Date) => void
  termsReference: string | undefined
  onTermsReferenceChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

const ContractTerms = ({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  termsReference,
  onTermsReferenceChange,
}: ContractTermsProps) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            min={new Date()}
            placeholder="Select start date"
          />
        </div>
        <div>
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            min={startDate || new Date()}
            placeholder="Select end date"
          />
        </div>
      </div>
      <div>
        <label className="block text-md font-semibold text-indigo-400 mb-2">
          Contract Summary
        </label>
        <textarea
          value={termsReference}
          onChange={onTermsReferenceChange}
          placeholder="Brief description of the agreement terms..."
          rows={4}
          className="w-full rounded-lg bg-slate-800/30 border border-slate-700/50 text-white p-3 focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition"
        />
      </div>
    </>
  )
}

export default ContractTerms
