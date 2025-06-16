import React, { useEffect } from 'react'
import { useUI } from '../../contexts/UIContext'

/**
 * GlobalEffects component to handle site-wide animations and effects
 * This is meant to be included once in the Layout component
 */
const GlobalEffects: React.FC = () => {
  const {
    ripples,
    mousePosition,
    isReducedMotion,
    isGlassomorphismEnabled,
    addRipple,
  } = useUI()

  // Add click ripple effect
  useEffect(() => {
    if (isReducedMotion) return

    const handleClick = (e: MouseEvent) => {
      addRipple(e.clientX, e.clientY)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [addRipple, isReducedMotion])

  return (
    <>
      {/* Mouse-following gradient orbs */}
      {!isReducedMotion && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/5 blur-3xl"
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
        </div>
      )}

      {/* Click ripple effects */}
      {!isReducedMotion && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {ripples.map((ripple) => (
            <div
              key={ripple.id}
              className="absolute bg-white rounded-full transform scale-0 animate-ripple opacity-30"
              style={{
                left: `${ripple.x}px`,
                top: `${ripple.y}px`,
                width: `${ripple.size}px`,
                height: `${ripple.size}px`,
                marginLeft: `-${ripple.size / 2}px`,
                marginTop: `-${ripple.size / 2}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Add a subtle noise texture for glass effects if enabled */}
      {isGlassomorphismEnabled && (
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-5"
          style={{
            backgroundImage:
              'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAEZklEQVRogZ2aW5LkIAhAbbvf/a+s+ZiqjgMCKmo+MpkYERC5qOrP7+/vT621Pn+qiIiIiHzOpaqf76r6fD7f/7Vr7oJ7btf/XaS1Vn/qR0RE6/+wc38BiEAEZCBp3fsNhN13nwsCqaqfj9YaFEtEICfXZUBYKLXW+vP7+yu1Veec67MwYGJoNhRhBHaQzCpuwIqx6FgQESml1HOuvYmCGiMiBWPZoWhjGYViPue0pKh9bPVZzRQKlwW9RQBLga43vhMZ9qgXRzF1zhkCRVZAFsmUskBR+yLwikB7VxDC21m/5/f3lwYSQUV1U6HVVloDYAZBwLHF2DWoLrJJ0etRVaxtCIPJAIkL/xeVqMRUWGtIVsLN5YGRIPSc4zjqOeeErUXFULBFVslKSpWqSUXXREmxaxGYVAdbBdVJJMYMJqtbDJ6ViKeAp4ZnCe+aEMisCFlgPKV2MOu+KBAUMqJfIZCqzA03u+atQgp57Y+B6yXa67AXK9HHjjlnn2yN/5tS45RJfojt/Qg676X7OEflBaJadV1XPecMJVi25swi3jIaJT9kmS4VD+KubCiRcFPQXPFaNUbJKsSAZDNDFDO7BSxQqm1X42OLrYKswUoMWcVTiY0Rtl5mHQ+IB8fKTFYDkIKsNeGx5b2KdCtwVvtCkbtBY5a1ZnG9xoG9r4lAtIoOQNKtlVkkUi7bcHnrJ2A5iIUYK71Nnnp2T2TQbVeysOZttI9ufFVmVgWVGKcVqw2eG6vPMTfKxRFTK3Lr/QLyg8NU1VuZxRhizPblHEvHcXRdRmusCmZxg0ppAWBrLbKAZzWP7NxwbN11AqqLBINXxasOIJjYQFvmjTUyJbyKxpTrSgkjHJXwoihrmb2gUJlB5a2UtM6BwlIq8RSbLKXW7hcmIR2W8pqwHQxUYWVhH+UiCKrQoxjHcYwTWpEFVr/Aqg3L61RUdahmEcS2WjvQVRpGs4tXzlGLZaVRWYvMGrYeelZ6ezK9chnV0RXEOWe16+7uEZSDNIHdDzFg2KqpxGx8qOrUrrJUkXWxCb/bN6mq38YDZRqbxM7SJ4CgtQa1y0KMQSEwe14AeUBQTPVAE6Lep2qQ98pnldrSamwZZDVPKfaG2AZl6E5RKl6Xe/+JdQxdS8CIaOYVG4i3OlkpRvXS7TXZBx3IzcBRUdtsoOt2mJE1F5hYyN1UQMgK3gcjz2retSgJrz2yStXqZi0pIsswqvvHVb1tVLKWCrZNq2K1zUbNrILeSM+u8c5l07u3e7Jp2P2x92fbMHQ9um76RWj1qM7d1rZU+MDRC0ZltGuxXOPFnFUuU0YX10VfrzQXUPSPK1UZ1QC7sPr6Zb2OqcZgPYupdX12raoOMIvPL9q9CiGCtfGwz/NbLPQlF/3Tizf1WShlAKyKRW21oBH0+jvkV8jMO+uR3bUMQgRu70GQnncyiIEG0+39HcJ7I3Z+9mXrLhDrng4nIqoqP/+6Zjwz9UJZAAAAAElFTkSuQmCC)',
            backgroundRepeat: 'repeat',
          }}
        />
      )}
    </>
  )
}

export default GlobalEffects
