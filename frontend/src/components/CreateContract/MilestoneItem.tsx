import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Trash } from 'lucide-react'
import { motion } from 'framer-motion'
import { Milestone } from '@/types/milestone'

type MilestoneItemProps = {
  milestone: Milestone
  onUpdate: (id: number, field: keyof Milestone, value: string) => void
  onRemove: (id: number) => void
  index?: number
  total?: number
}

const MilestoneItem = ({
  milestone,
  onUpdate,
  onRemove,
  index,
  total,
}: MilestoneItemProps) => {
  const isOnChain = (milestone as any).isOnChain === true
  let valueSUI: string = ''
  if (isOnChain) {
    valueSUI = (Number(milestone.value) / 1e9).toString()
  } else {
    valueSUI =
      typeof milestone.value === 'string'
        ? milestone.value
        : milestone.value.toString()
  }
  const valueDisplay = valueSUI !== '' ? valueSUI : '-'
  const [descError, setDescError] = React.useState(false)
  const [valueError, setValueError] = React.useState(false)

  const [descInput, setDescInput] = React.useState(
    milestone.description_hash ?? '',
  )
  React.useEffect(() => {
    setDescInput(milestone.description_hash ?? '')
  }, [milestone.id, milestone.description_hash])

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const val = e.target.value
    setDescInput(val)
    setDescError(!val || val.trim().length === 0)
  }
  const handleDescriptionBlur = () => {
    if (descInput !== milestone.description_hash) {
      onUpdate(milestone.id, 'description_hash', descInput)
    }
  }
  const handleDescriptionKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleDescriptionBlur()
    }
  }
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setValueError(!val || Number(val) <= 0)
    if (isOnChain) {
      const mist =
        val && !isNaN(Number(val)) ? Math.round(Number(val) * 1e9) : 0
      onUpdate(milestone.id, 'value', mist.toString())
    } else {
      onUpdate(milestone.id, 'value', val)
    }
  }

  return (
    <motion.div
      className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/50 relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{
        boxShadow: '0 8px 20px -5px rgba(0,0,0,0.2)',
        borderColor: 'rgba(139, 92, 246, 0.5)',
        transition: { duration: 0.2 },
      }}
    >
      <div className="flex items-center mb-2">
        <span className="text-sm font-semibold text-violet-300 mr-2">
          Milestone {index !== undefined ? index + 1 : ''}
          {total ? ` of ${total}` : ''}
        </span>
      </div>
      {/* Mobile layout */}
      <div className="flex flex-col gap-4 md:hidden">
        <div>
          <label className="text-xs text-slate-400 mb-1 font-light flex items-center">
            Description
          </label>
          <Textarea
            value={descInput}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            onKeyDown={handleDescriptionKeyDown}
            placeholder="e.g., 'Design homepage and deliver Figma file'"
            className={`bg-slate-800/50 border-slate-700/50 text-white min-h-[60px] resize-none ${descError ? 'border-red-400' : ''}`}
            maxLength={200}
            aria-label="Milestone description"
          />
          {descError && (
            <div className="text-xs text-red-400 mt-1">
              Description cannot be empty.
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 font-light flex items-center">
            Value (SUI)
          </label>
          <Input
            value={valueSUI}
            onChange={handleValueChange}
            placeholder="e.g., 250"
            type="number"
            min="0"
            className={`bg-slate-800/50 border-slate-700/50 text-white ${valueError ? 'border-red-400' : ''}`}
            aria-label="Milestone value"
          />
          {valueError && (
            <div className="text-xs text-red-400 mt-1">
              Value must be greater than 0.
            </div>
          )}
          {valueDisplay === '-' && !valueError && (
            <div className="text-slate-400 text-xs mt-1">Value: -</div>
          )}
        </div>
        <div className="flex items-end justify-end">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              type="button"
              variant="destructive"
              onClick={() => onRemove(milestone.id)}
              className="text-red-400 hover:text-white hover:bg-red-600/80 border border-red-400"
              title="Remove this milestone"
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Remove milestone</span>
            </Button>
          </motion.div>
        </div>
      </div>
      {/* Desktop layout */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs text-slate-400 mb-1 font-light flex items-center">
            Description
          </label>
          <Textarea
            value={descInput}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            onKeyDown={handleDescriptionKeyDown}
            placeholder="e.g., 'Design homepage and deliver Figma file'"
            className={`bg-slate-800/50 border-slate-700/50 text-white min-h-[60px] resize-none ${descError ? 'border-red-400' : ''}`}
            maxLength={200}
            aria-label="Milestone description"
          />
          {descError && (
            <div className="text-xs text-red-400 mt-1">
              Description cannot be empty.
            </div>
          )}
        </div>
        <div className="md:col-span-1">
          <label className="text-xs text-slate-400 mb-1 font-light flex items-center">
            Value (SUI)
          </label>
          <Input
            value={valueSUI}
            onChange={handleValueChange}
            placeholder="e.g., 250"
            type="number"
            min="1"
            className={`bg-slate-800/50 border-slate-700/50 text-white ${valueError ? 'border-red-400' : ''}`}
            aria-label="Milestone value"
          />
          {valueError && (
            <div className="text-xs text-red-400 mt-1">
              Value must be greater than 0.
            </div>
          )}
          {valueDisplay === '-' && !valueError && (
            <div className="text-slate-400 text-xs mt-1">Value: -</div>
          )}
        </div>
        <div className="md:col-span-1 flex items-end justify-end">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              type="button"
              variant="destructive"
              onClick={() => onRemove(milestone.id)}
              className="text-red-400 hover:text-white hover:bg-red-600/80 border border-red-400"
              title="Remove this milestone"
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Remove milestone</span>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

export default MilestoneItem
