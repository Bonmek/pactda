/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: {
          900: '#111827',
          800: '#1F2937',
          700: '#374151',
          600: '#4B5563',
          500: '#6B7280',
          400: '#9CA3AF',
          300: '#D1D5DB',
          200: '#E5E7EB',
          100: '#F3F4F6',
          50: '#F9FAFB',
        },
        blue: {
          900: '#1E3A8A',
          800: '#1E40AF',
          700: '#1D4ED8',
          600: '#2563EB',
          500: '#3B82F6',
          400: '#60A5FA',
          300: '#93C5FD',
          200: '#BFDBFE',
          100: '#DBEAFE',
          50: '#EFF6FF',
        },
      },
      textShadow: {
        blue: '0 0 8px rgba(59, 130, 246, 0.5)',
        purple: '0 0 8px rgba(124, 58, 237, 0.5)',
        pink: '0 0 8px rgba(236, 72, 153, 0.5)',
      },
      backgroundSize: {
        'size-200': '200% 200%',
      },
      backgroundPosition: {
        'pos-0': '0% 50%',
        'pos-100': '100% 50%',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    // Add plugin for text-shadow utility
    function ({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-blue': {
          'text-shadow': '0 0 8px rgba(59, 130, 246, 0.5)',
        },
        '.text-shadow-purple': {
          'text-shadow': '0 0 8px rgba(124, 58, 237, 0.5)',
        },
        '.text-shadow-pink': {
          'text-shadow': '0 0 8px rgba(236, 72, 153, 0.5)',
        },
        '.bg-size-200': {
          'background-size': '200% 200%',
        },
        '.bg-pos-0': {
          'background-position': '0% 50%',
        },
        '.bg-pos-100': {
          'background-position': '100% 50%',
        },
      }
      addUtilities(newUtilities)
    },
  ],
}
