import React, { useEffect, useRef } from 'react'

interface PatternBackgroundProps {
  color?: string
  density?: number
  speedFactor?: number
}

const PatternBackground: React.FC<PatternBackgroundProps> = ({
  color = 'rgba(59, 130, 246, 0.5)',
  density = 30,
  speedFactor = 0.3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let mouseX = 0
    let mouseY = 0
    let nodes: Array<{
      x: number
      y: number
      vx: number
      vy: number
      radius: number
    }> = []

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      createNodes()
    }

    const createNodes = () => {
      nodes = []
      for (let i = 0; i < density; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * speedFactor,
          vy: (Math.random() - 0.5) * speedFactor,
          radius: Math.random() * 2 + 1,
        })
      }
    }

    const drawNodes = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw nodes
      nodes.forEach((node) => {
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()

        // Update position
        node.x += node.vx
        node.y += node.vy

        // Boundary check
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        // Draw connections
        nodes.forEach((otherNode) => {
          const dx = otherNode.x - node.x
          const dy = otherNode.y - node.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(otherNode.x, otherNode.y)
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.15 * (1 - distance / 150)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })

        // Mouse interaction
        const dx = mouseX - node.x
        const dy = mouseY - node.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 200) {
          const angle = Math.atan2(dy, dx)
          const force = (200 - distance) / 1000
          node.vx -= Math.cos(angle) * force
          node.vy -= Math.sin(angle) * force
        }
      })

      animationFrameId = requestAnimationFrame(drawNodes)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('mousemove', handleMouseMove)

    resizeCanvas()
    drawNodes()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [color, density, speedFactor])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none bg-transparent opacity-20"
    />
  )
}

export default PatternBackground
