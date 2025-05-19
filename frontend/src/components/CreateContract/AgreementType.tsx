import { useState } from 'react'

const agreementTypes = [
  { key: 'General', value: 0 },
  { key: 'Art', value: 1 },
  { key: 'Programming', value: 2 },
  { key: 'Audit', value: 3 },
  { key: 'Service', value: 4 },
]

interface AgreementTypeProps {
  selectedType?: number
  onSelectType: (type?: number) => void
}

const AgreementType = ({selectedType, onSelectType}:AgreementTypeProps) => {


  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSelectType(Number(e.target.value))
  }

  return (
    <div className="space-y-4">
      <div className="w-full">
        <select
          className="w-full px-4 py-2 rounded-md bg-[#1E293B] border border-slate-700/50 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedType}
          onChange={handleChange}
        >
          <option value={undefined} disabled>
            Select agreement type
          </option>
          {agreementTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.key}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default AgreementType
