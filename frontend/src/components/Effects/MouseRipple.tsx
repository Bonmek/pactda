import React, { useEffect, useState } from 'react'
import styles from '../Layout/Layout.module.css'

interface RippleProps {
  x: number
  y: number
  size: number
  key: string
}

const MouseRipple: React.FC = () => {
  const [ripples, setRipples] = useState<RippleProps[]>([])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const size = Math.random() * 100 + 50
      const newRipple = {
        x: e.clientX - size / 2,
        y: e.clientY - size / 2,
        size,
        key: `${Date.now()}`,
      }

      setRipples((prevRipples) => [...prevRipples, newRipple])

      // Remove ripple after animation completes
      setTimeout(() => {
        setRipples((prevRipples) =>
          prevRipples.filter((r) => r.key !== newRipple.key),
        )
      }, 600)
    }

    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {ripples.map((ripple) => (
        <div
          key={ripple.key}
          className={styles.ripple}
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            width: `${ripple.size}px`,
            height: `${ripple.size}px`,
          }}
        />
      ))}
    </div>
  )
}

export default MouseRipple
