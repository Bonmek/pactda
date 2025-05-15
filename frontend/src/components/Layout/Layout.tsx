import type { PropsWithChildren } from 'react'
import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import styles from './Layout.module.css'
import clsx from 'clsx'
import Navbar from '../Navbar'

const Layout: React.FC<PropsWithChildren> = ({ children, ...rest }) => {
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const [scrollPosition, setScrollPosition] = useState(0)
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <Navbar />
      <main className={styles.layout} {...rest}>
        {/* Decorative blue glowing elements */}
        <div className={clsx(styles.blueGlow, styles.topGlow)} style={{ opacity: 0.7 - (scrollPosition / 1000) }} />
        <div className={clsx(styles.blueGlow, styles.bottomGlow)} style={{ opacity: 0.5 + (scrollPosition / 2000) }} />
      
      {/* Animated particles background */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i}
            className="absolute bg-blue-400 rounded-full"
            style={{
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5,
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 w-full h-full">
        <div className={styles.container}>
          <div className={clsx(
            isHomePage ? '' : styles.content,
            'relative z-10 w-full h-full'
          )}>
            {children}
          </div>
        </div>
      </div>
      
      {/* Blue gradient bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 opacity-70" />
    </main>
    </>
  )
}

export default Layout
