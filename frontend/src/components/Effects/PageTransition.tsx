import React, { useEffect, useState } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

/**
 * Adds smooth fade-in transitions when navigating between pages
 */
const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 10)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`
        transition-opacity duration-500 ease-in-out
        ${isVisible ? 'opacity-100' : 'opacity-0'} 
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export default PageTransition
