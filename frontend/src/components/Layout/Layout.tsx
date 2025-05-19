import React, { useState, useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import Header from './Header'
import Footer from './Footer'
import clsx from 'clsx'
import { useLocation } from 'react-router-dom'
import GlobalEffects from '../Effects/GlobalEffects'
import PageTransition from '../Effects/PageTransition'
import PatternBackground from '../Effects/PatternBackground'
import CustomCursor from '../CustomCursor'

import styles from './Layout.module.css'

interface LayoutProps {
  selectedWalletType: 'sui' | 'metamask' | 'google' | 'facebook' | null
  setSelectedWalletType: (
    type: 'sui' | 'metamask' | 'google' | 'facebook' | null,
  ) => void
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({
  selectedWalletType,
  setSelectedWalletType,
  children,
}) => {
  const [scrollPosition, setScrollPosition] = useState(0)
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  // Handle scroll position for glow effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Try to load the saved wallet type from localStorage
  useEffect(() => {
    const savedWalletType = localStorage.getItem('selectedWalletType') as
      | 'sui'
      | 'metamask'
      | 'google'
      | 'facebook'
      | null
    if (savedWalletType) {
      setSelectedWalletType(savedWalletType)
    }
  }, [setSelectedWalletType])

  // Save the selected wallet type to localStorage
  useEffect(() => {
    if (selectedWalletType) {
      localStorage.setItem('selectedWalletType', selectedWalletType)
    } else {
      localStorage.removeItem('selectedWalletType')
    }
  }, [selectedWalletType])
  // Track mouse position for parallax effects
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100 relative overflow-hidden">
      {/* Custom animated cursor */}
      <CustomCursor />
      {/* Interactive pattern background */}
      <PatternBackground
        density={40}
        speedFactor={0.2}
        color="rgba(59, 130, 246, 0.5)"
      />
      {/* Global animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Large gradient orbs that follow mouse */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/5 blur-3xl"
          style={{
            left: `${mousePosition.x * 20}%`,
            top: `${mousePosition.y * 20}%`,
            transform: `translate(-${mousePosition.x * 50}%, -${mousePosition.y * 50}%)`,
            transition: 'left 0.6s ease-out, top 0.6s ease-out',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-br from-pink-500/15 to-blue-500/5 blur-3xl"
          style={{
            right: `${mousePosition.x * 20}%`,
            bottom: `${mousePosition.y * 20}%`,
            transform: `translate(${mousePosition.x * 50}%, ${mousePosition.y * 50}%)`,
            transition: 'right 0.8s ease-out, bottom 0.8s ease-out',
          }}
        />

        {/* Removed animated particles background in favor of the new pattern background */}
      </div>
      <Header
        selectedWalletType={selectedWalletType}
        setSelectedWalletType={setSelectedWalletType}
      />
      <main className={styles.layout}>
        {/* Decorative blue glowing elements */}
        <div
          className={clsx(styles.blueGlow, styles.topGlow)}
          style={{ opacity: 0.7 - scrollPosition / 1000 }}
        />
        <div
          className={clsx(styles.blueGlow, styles.bottomGlow)}
          style={{ opacity: 0.5 + scrollPosition / 2000 }}
        />

        <div className="relative z-10 w-full h-full">
          <div className={styles.container}>
            {' '}
            <div
              className={clsx(
                isHomePage ? 'my-2' : styles.content,
                'relative z-10 w-full h-full',
              )}
            >
              <PageTransition>{children}</PageTransition>
            </div>
          </div>
        </div>
      </main>{' '}
      <Footer />
      <GlobalEffects />
    </div>
  )
}

export default Layout
