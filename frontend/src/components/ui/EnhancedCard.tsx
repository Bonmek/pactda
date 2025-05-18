import React from 'react'

interface EnhancedCardProps {
  title?: string
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  gradient?: boolean
}

/**
 * An enhanced card component with consistent styling for the new design
 */
const EnhancedCard: React.FC<EnhancedCardProps> = ({
  title,
  children,
  className = '',
  hover = true,
  onClick,
  gradient = false,
}) => (
  <div
    className={`
      bg-gray-900 bg-opacity-70
      rounded-xl 
      p-6 
      shadow-lg 
      ${hover ? 'hover:scale-105 transition-transform duration-200 card-hover' : ''}
      ${className}
    `}
    onClick={onClick}
  >
    {title && (
      <h2
        className={`text-xl font-bold mb-4 ${gradient ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400' : 'text-blue-300'}`}
      >
        {title}
      </h2>
    )}
    {children}
  </div>
)

export default EnhancedCard
