import React, { ReactNode, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface PageLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

/**
 * A consistent Page Layout to be used across all pages
 */
const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  children,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div
      className={`container mx-auto px-4 py-16 min-h-[80vh] flex flex-col items-center justify-start relative overflow-hidden ${className}`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute left-1/4 top-0 w-96 h-96 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-3xl"
          style={{ filter: 'blur(80px)' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="absolute right-1/4 bottom-0 w-72 h-72 bg-gradient-to-br from-pink-500 to-blue-500 rounded-full blur-2xl"
          style={{ filter: 'blur(60px)' }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 5, repeat: Infinity, repeatType: 'loop' }}
          className="absolute top-1/3 right-1/3 w-32 h-32 bg-blue-300 bg-opacity-20 rounded-full blur-xl"
        />
      </div>{' '}
      {/* Animated Page header */}
      <div className="relative z-10 text-center mb-12 w-full">
        <motion.h1
          whileHover={{
            scale: 1.03,
            textShadow: '0 0 8px rgba(96, 165, 250, 0.5)',
            backgroundPosition: '100% 50%',
          }}
          whileTap={{ scale: 0.98 }}
          className="text-5xl md:text-6xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-lg cursor-pointer bg-size-200 bg-pos-0"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p className="text-xl text-gray-200 max-w-2xl mx-auto mb-8">
            {subtitle}
          </motion.p>
        )}
      </div>
      {/* Page content */}
      <motion.div className="relative z-10 w-full max-w-4xl mx-auto">
        {children}{' '}
      </motion.div>
    </div>
  )
}

export default PageLayout
