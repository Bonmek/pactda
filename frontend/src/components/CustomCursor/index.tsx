import React, { useEffect, useRef, useState } from 'react'

const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const helperRef = useRef<HTMLDivElement>(null)
  const [isPointerDown, setIsPointerDown] = useState<boolean>(false)
  const trailElements = useRef<HTMLDivElement[]>([])
  const trailTimeout = useRef<number | null>(null)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [showHelper, setShowHelper] = useState<boolean>(false)
  const [firstVisit, setFirstVisit] = useState<boolean>(false)
  useEffect(() => {
    // Check if this is user's first visit
    const hasVisitedBefore = localStorage.getItem('pactda_visited')

    if (!hasVisitedBefore) {
      setFirstVisit(true)
      localStorage.setItem('pactda_visited', 'true')

      // Show the helper after a short delay
      setTimeout(() => {
        setShowHelper(true)

        // Hide helper after 3 seconds
        setTimeout(() => {
          setShowHelper(false)
        }, 3000)
      }, 500)
    }
  }, [])

  useEffect(() => {
    // Check if device is mobile by screen size and touch capability
    const checkMobile = () => {
      const hasTouchScreen =
        'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(hasTouchScreen || isSmallScreen)
    }

    // Check initially
    checkMobile()

    // Add resize listener
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  useEffect(() => {
    if (isMobile) return

    const cursor = cursorRef.current
    const dot = dotRef.current
    const container = containerRef.current
    if (!cursor || !dot || !container) return

    // Add discovery animation class if first visit
    if (firstVisit && cursor) {
      cursor.classList.add('cursor-discovery-animation')

      // Remove animation class after it completes
      setTimeout(() => {
        cursor.classList.remove('cursor-discovery-animation')
      }, 1200)
    }

    const onMouseMove = (e: MouseEvent) => {
      cursor.style.left = `${e.clientX}px`
      cursor.style.top = `${e.clientY}px`

      dot.style.left = `${e.clientX}px`
      dot.style.top = `${e.clientY}px`

      createTrailElement(e.clientX, e.clientY)
    }
    const createTrailElement = (x: number, y: number) => {
      if (trailTimeout.current) window.clearTimeout(trailTimeout.current)

      trailTimeout.current = window.setTimeout(() => {
        const trail = document.createElement('div')
        trail.className = 'cursor-trail'
        trail.style.left = `${x}px`
        trail.style.top = `${y}px`
        container.appendChild(trail)

        trailElements.current.push(trail)

        setTimeout(() => {
          if (container.contains(trail)) {
            container.removeChild(trail)
            trailElements.current = trailElements.current.filter(
              (el) => el !== trail,
            )
          }
        }, 800)
      }, 15)
    }

    const addHoverState = () => {
      cursor.classList.add('custom-cursor-hover')
    }

    const removeHoverState = () => {
      cursor.classList.remove('custom-cursor-hover')
    }

    // Click animation
    const onMouseDown = () => {
      setIsPointerDown(true)
      cursor.classList.add('custom-cursor-click')
    }

    const onMouseUp = () => {
      setIsPointerDown(false)
      cursor.classList.remove('custom-cursor-click')
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    const interactiveElements = document.querySelectorAll(
      'a, button, .cursor-pointer, [role="button"], input[type="submit"], input[type="button"], input[type="reset"], [onClick]',
    )

    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', addHoverState)
      el.addEventListener('mouseleave', removeHoverState)
    })

    const refreshInterval = setInterval(() => {
      const newInteractiveElements = document.querySelectorAll(
        'a, button, .cursor-pointer, [role="button"], input[type="submit"], input[type="button"], input[type="reset"], [onClick]',
      )
      newInteractiveElements.forEach((el) => {
        if (!el.hasAttribute('data-cursor-tracked')) {
          el.setAttribute('data-cursor-tracked', 'true')
          el.addEventListener('mouseenter', addHoverState)
          el.addEventListener('mouseleave', removeHoverState)
        }
      })
    }, 2000)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)

      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', addHoverState)
        el.removeEventListener('mouseleave', removeHoverState)
      })

      clearInterval(refreshInterval)

      if (trailTimeout.current) window.clearTimeout(trailTimeout.current)

      trailElements.current.forEach((el) => {
        if (container && container.contains(el)) {
          container.removeChild(el)
        }
      })
    }
  }, [isMobile])
  if (isMobile) return null

  return (
    <>
      <div id="cursor-container" ref={containerRef}>
        <div id="custom-cursor" ref={cursorRef}></div>
        <div id="cursor-dot" ref={dotRef}></div>
      </div>
      <div
        className={`cursor-helper ${showHelper ? 'show' : ''}`}
        ref={helperRef}
      >
        Move your mouse to navigate with the custom cursor
      </div>
    </>
  )
}

export default CustomCursor
