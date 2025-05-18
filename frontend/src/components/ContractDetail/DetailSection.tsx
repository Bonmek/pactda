import { ReactNode } from 'react'
import { motion } from 'framer-motion'

type DetailSectionProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

const DetailSection = ({ title, subtitle, children }: DetailSectionProps) => {
  return (
    <motion.section
      className="space-y-4"
      whileHover={{
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        transition: { duration: 0.2 },
      }}
    >
      <div>
        <motion.h2
          className="text-lg text-slate-300 font-light tracking-wide"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="bg-gradient-to-r from-indigo-300 to-purple-400 bg-clip-text text-transparent text-2xl">
            {title}
          </span>
        </motion.h2>
        {subtitle && (
          <motion.p
            className="text-sm text-slate-400 mt-1 font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      <motion.div
        className="space-y-3 backdrop-blur-sm p-4 rounded-lg border border-slate-700/30"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {children}
      </motion.div>
    </motion.section>
  )
}

export default DetailSection
