import { useState } from 'react'
import { motion } from 'framer-motion'

const agreementTypes = [
  {
    key: 'General',
    value: 0,
    icon: '📄',
    description: 'Standard agreement for general purposes',
  },
  {
    key: 'Art',
    value: 1,
    icon: '🎨',
    description: 'For artwork, design and creative services',
  },
  {
    key: 'Programming',
    value: 2,
    icon: '💻',
    description: 'Software development and coding work',
  },
  {
    key: 'Audit',
    value: 3,
    icon: '🔍',
    description: 'Code review and audit services',
  },
  {
    key: 'Service',
    value: 4,
    icon: '🛠️',
    description: 'Professional and consulting services',
  },
]

interface AgreementTypeProps {
  selectedType?: number
  onSelectType: (type?: number) => void
}

const AgreementType = ({ selectedType, onSelectType }: AgreementTypeProps) => {
  const handleCardSelect = (value: number) => {
    onSelectType(value)
  }

  return (
    <div className="space-y-4">
      {/* Card-based selection for agreement types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {agreementTypes.map((type) => (
          <motion.div
            key={type.value}
            className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
              selectedType === type.value
                ? 'bg-gradient-to-br from-blue-600/40 to-indigo-700/40 border-2 border-blue-400/70 shadow-lg shadow-blue-900/30'
                : 'bg-slate-800/30 border border-slate-700/60 hover:border-blue-400/50 hover:bg-slate-800/50'
            }`}
            onClick={() => handleCardSelect(type.value)}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <span className="text-2xl mb-2">{type.icon}</span>
              <h3
                className={`font-medium ${
                  selectedType === type.value
                    ? 'text-blue-300'
                    : 'text-slate-300'
                }`}
              >
                {type.key}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{type.description}</p>
              {/* Visual indicator for selected item */}
              {selectedType === type.value && (
                <motion.div
                  className="w-4 h-4 rounded-full bg-blue-400 mt-2 flex items-center justify-center"
                  layoutId="selectedTypeIndicator"
                />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default AgreementType
