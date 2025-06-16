import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'

interface UIContextType {
  mousePosition: { x: number; y: number }
  isReducedMotion: boolean
  isGlassomorphismEnabled: boolean
  addRipple: (x: number, y: number) => void
  ripples: { id: string; x: number; y: number; size: number }[]
  toggleReducedMotion: () => void
  toggleGlassomorphism: () => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export const useUI = () => {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}

interface UIProviderProps {
  children: ReactNode
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [ripples, setRipples] = useState<
    { id: string; x: number; y: number; size: number }[]
  >([])
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [isGlassomorphismEnabled, setIsGlassomorphismEnabled] = useState(true)

  // Track mouse movement
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

  // Check for user's motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mediaQuery.matches)

    const handleChange = () => setIsReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const addRipple = (x: number, y: number) => {
    const newRipple = {
      id: `ripple-${Date.now()}`,
      x,
      y,
      size: Math.random() * 100 + 50,
    }

    setRipples((prev) => [...prev, newRipple])

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
    }, 600)
  }

  const toggleReducedMotion = () => {
    setIsReducedMotion((prev) => !prev)
  }

  const toggleGlassomorphism = () => {
    setIsGlassomorphismEnabled((prev) => !prev)
  }

  const value = {
    mousePosition,
    isReducedMotion,
    isGlassomorphismEnabled,
    addRipple,
    ripples,
    toggleReducedMotion,
    toggleGlassomorphism,
  }

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export default UIProvider
