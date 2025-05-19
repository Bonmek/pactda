import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useRef } from 'react'

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
  const startRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLInputElement>(null)

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined
    setStartDate(date)
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined
    setEndDate(date)
  }

  const handleTermsReferenceChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    onTermsReferenceChange(e)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-md font-semibold text-indigo-400 mb-2">
            Start Date
          </label>
          <Input
            type="date"
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={handleStartDateChange}
            className="bg-slate-800/30 border border-slate-700/50 text-white focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 rounded-lg transition"
            ref={startRef}
            onFocus={() => startRef.current?.showPicker()}
          />
        </div>
        <div>
          <label className="block text-md font-semibold text-indigo-400 mb-2">
            End Date
          </label>
          <Input
            type="date"
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            onChange={handleEndDateChange}
            className="bg-slate-800/30 border border-slate-700/50 text-white focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 rounded-lg transition"
            ref={endRef}
            onFocus={() => endRef.current?.showPicker()}
          />
        </div>
      </div>
      <div>
        <label className="block text-md font-semibold text-indigo-400 mb-2">
          Contract Summary
        </label>
        <textarea
          value={termsReference}
          onChange={handleTermsReferenceChange}
          placeholder="Brief description of the agreement terms..."
          rows={4}
          className="w-full rounded-lg bg-slate-800/30 border border-slate-700/50 text-white p-3 focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition"
        />
      </div>
    </>
  )
}

export default ContractTerms
