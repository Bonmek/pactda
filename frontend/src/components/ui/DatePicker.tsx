import * as React from 'react'
import { Popover } from '@headlessui/react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isBefore,
  isAfter,
} from 'date-fns'

interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  min?: Date
  max?: Date
  placeholder?: string
  disabled?: boolean
  className?: string
  label?: string
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  placeholder = 'Pick a date',
  disabled,
  className = '',
  label,
}) => {
  // Always use value as the source of truth
  const [selected, setSelected] = React.useState<Date | undefined>(value)
  const [month, setMonth] = React.useState<Date>(value || new Date())

  // Fix: Always update local state if value prop changes
  React.useEffect(() => {
    setSelected(value)
    if (value) setMonth(value)
  }, [value])

  const handleSelect = (date: Date, close: () => void) => {
    setSelected(date)
    onChange(date)
    close()
  }

  const isDateDisabled = (date: Date) => {
    if (min && isBefore(date, min)) return true
    if (max && isAfter(date, max)) return true
    return false
  }

  const renderDays = () => {
    const startMonth = startOfMonth(month)
    const endMonthDate = endOfMonth(month)
    const startDate = startOfWeek(startMonth, { weekStartsOn: 1 })
    const endDate = endOfWeek(endMonthDate, { weekStartsOn: 1 })
    const days = []
    let day = startDate
    while (day <= endDate) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className={`w-full  ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-blue-300 mb-1 ml-1">
          {label}
        </label>
      )}
      <Popover className="relative">
        {({ close }) => (
          <>
            <Popover.Button
              type="button"
              disabled={disabled}
              className={`flex items-center w-full bg-slate-800/40 border border-blue-500/30 text-white rounded-lg px-4 py-3 text-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-600/30 transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-400'}`}
            >
              <CalendarIcon className="w-5 h-5 text-blue-400 mr-2" />
              <span className={selected ? '' : 'text-slate-400'}>
                {selected ? format(selected, 'yyyy-MM-dd') : placeholder}
              </span>
            </Popover.Button>
            <Popover.Panel className="absolute z-[9999] mt-2 left-0 w-80 bg-slate-900 border border-blue-500/20 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  className="p-1 rounded hover:bg-slate-800 text-blue-300"
                  onClick={() => setMonth(subMonths(month, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold text-white text-lg">
                  {format(month, 'MMMM yyyy')}
                </span>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-slate-800 text-blue-300"
                  onClick={() => setMonth(addMonths(month, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((d) => (
                  <div
                    key={d}
                    className="text-xs text-blue-300 text-center font-semibold"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderDays().map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, month)
                  const isSelected = selected && isSameDay(day, selected)
                  const disabledDay = !isCurrentMonth || isDateDisabled(day)
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all
                        ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold'
                            : disabledDay
                              ? 'text-slate-500 cursor-not-allowed'
                              : 'text-blue-100 hover:bg-blue-700/40 hover:text-white'
                        }
                        ${!isCurrentMonth ? 'opacity-40' : ''}`}
                      onClick={() => {
                        if (!disabledDay) handleSelect(day, close)
                      }}
                      disabled={disabledDay}
                      aria-label={format(day, 'yyyy-MM-dd')}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>
            </Popover.Panel>
          </>
        )}
      </Popover>
    </div>
  )
}
