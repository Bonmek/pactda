import { ReactNode } from 'react'
import { motion } from 'framer-motion'

type FormSectionProps = {
  title: string
  subtitle?: string
  required?: boolean
  children: ReactNode
}

const FormSection = ({
  title,
  subtitle,
  required = false,
  children,
}: FormSectionProps) => {
  return (
    <motion.section
      className="space-y-4 mb-8 relative"
      whileHover={{
        boxShadow: '0 15px 30px -10px rgba(30, 64, 175, 0.15)',
        transition: { duration: 0.2 },
      }}
    >
      {/* Section header with improved styling */}
      <div className="relative z-10">
        <motion.h2
          className="text-lg font-medium tracking-wide mb-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent text-2xl ml-2 md:ml-0">
            {title} {required && <span className="text-red-400 ml-1">*</span>}
          </span>
        </motion.h2>
        {subtitle && (
          <motion.p
            className="text-sm text-blue-200/80 mt-1 ml-3 md:ml-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Content area with improved styling */}
      <motion.div
        className="space-y-4 backdrop-blur-sm p-5 rounded-xl border border-blue-500/20 bg-gradient-to-b from-slate-800/70 to-slate-900/70 shadow-lg shadow-blue-900/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        whileHover={{
          borderColor: 'rgba(79, 70, 229, 0.4)',
          transition: { duration: 0.2 },
        }}
      >
        {children}
      </motion.div>

      {/* Decorative element */}
      <div className="absolute -left-1 md:-left-8 -top-1 w-2 h-12 bg-gradient-to-b from-blue-400 to-indigo-600 rounded-r-full opacity-70"></div>
    </motion.section>
  )
}

export default FormSection
