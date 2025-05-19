import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  LinkIcon,
  Shield,
  Scale,
  Sparkles,
  Globe,
  Lock,
} from 'lucide-react'

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="flex flex-col w-full">
      {' '}
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-[90vh] md:min-h-screen text-center px-4 pt-0 mt-0">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-blue-700/10 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-48 sm:w-64 h-48 sm:h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          ></div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 5, repeat: Infinity, repeatType: 'loop' }}
            className="absolute top-1/3 right-1/3 w-24 sm:w-32 h-24 sm:h-32 bg-blue-300/20 rounded-full blur-xl"
          ></motion.div>
        </div>

        <div className="max-w-4xl mx-auto mt-[-5vh] md:mt-[-10vh] relative z-10">
          <motion.div
            whileHover={{
              scale: 1.03,
              transition: { type: 'spring', stiffness: 300 },
            }}
            whileTap={{ scale: 0.97 }}
            className="cursor-pointer"
          >
            {' '}
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-300 to-blue-100 mb-4 sm:mb-6 tracking-tight leading-tight header-hover bg-size-200 bg-pos-0 responsive-heading-lg">
              <span className="inline-block">PactDa: </span>
              <span className="inline-block">Decentralized Trust</span>
              <span className="block mt-1 sm:mt-2 pb-2">
                for Digital Agreements
              </span>
            </h1>
          </motion.div>

          <motion.p className="text-base sm:text-lg md:text-xl text-blue-200 mb-6 sm:mb-10 max-w-3xl mx-auto leading-relaxed responsive-text-sm">
            Securely create, manage, and enforce contracts across blockchains.
            <span className="block mt-2 text-blue-300 font-medium">
              Powered by Sui's speed, bridged by Wormhole for multi-chain
              access, and simplified by zkLogin for easy onboarding.
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {' '}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white px-5 sm:px-8 py-5 sm:py-6 rounded-full text-base sm:text-lg font-semibold shadow-lg shadow-blue-700/30 hover:shadow-blue-600/40 transition-all duration-300 relative overflow-hidden group responsive-btn"
                asChild
              >
                <Link to="/dashboard">
                  <span className="relative z-10 flex items-center">
                    Launch App{' '}
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                </Link>
              </Button>
            </motion.div>{' '}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="lg"
                className="border border-blue-500/50 text-blue-300 hover:text-white hover:bg-blue-800/30 px-5 sm:px-8 py-5 sm:py-6 rounded-full text-base sm:text-lg font-semibold backdrop-blur-sm transition-all duration-300 relative overflow-hidden group responsive-btn"
                onClick={() => {
                  document
                    .getElementById('features')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <span className="relative z-10">Learn More</span>
                <span className="absolute inset-0 bg-blue-800/0 group-hover:bg-blue-800/30 transition-colors duration-300"></span>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="absolute -z-10 w-full max-w-lg h-56 blur-3xl bg-blue-700/20 rounded-full top-1/4 left-1/2 transform -translate-x-1/2"
        ></motion.div>

        {/* Floating particles */}
        <div className="absolute inset-0 -z-5 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-blue-400/30"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, Math.random() * 30 - 15],
                x: [0, Math.random() * 30 - 15],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            />
          ))}
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center cursor-pointer"
          onClick={() =>
            document
              .getElementById('features')
              ?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          <p className="text-blue-300 mb-2 text-sm font-medium tracking-wide">
            Scroll to learn more
          </p>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
            }}
          >
            <svg
              className="w-6 h-6 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </motion.div>
        </motion.div>
      </section>{' '}
      {/* Features Section */}
      <section
        className="min-h-[90vh] md:min-h-screen flex items-center py-12 sm:py-16 md:py-20 px-4 relative"
        id="features"
      >
        {/* Background elements removed for cleaner design */}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto w-full"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-6 text-white responsive-heading-md">
              Why Choose <span className="text-blue-400">PactDa</span>?
            </h2>
            <p className="text-blue-300 text-center max-w-2xl mx-auto mb-8 sm:mb-12 md:mb-16 text-base sm:text-lg responsive-text-sm">
              Our platform combines cutting-edge blockchain technology with
              user-friendly design
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 responsive-card-grid">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              {' '}
              <Card className="h-full border border-blue-700/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-700/20 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center text-center p-4 sm:p-6 lg:p-8">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="p-3 sm:p-4 rounded-full bg-blue-900/30 mb-4 sm:mb-6 border border-blue-700/30 shadow-lg shadow-blue-900/20"
                  >
                    <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-4">
                    Seamless Multi-Chain Access
                  </h3>
                  <p className="text-blue-200">
                    Interact with Sui-based agreements using your existing
                    Ethereum wallet via Wormhole. Sui users enjoy effortless
                    onboarding with zkLogin.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border border-blue-700/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-700/20 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center text-center p-8">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="p-4 rounded-full bg-blue-900/30 mb-6 border border-blue-700/30 shadow-lg shadow-blue-900/20"
                  >
                    <Lock className="w-8 h-8 text-blue-400" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-4">
                    Automated Security & Escrow
                  </h3>
                  <p className="text-blue-200">
                    Funds are held securely in on-chain escrow and released
                    automatically based on contract terms or fair dispute
                    resolution, minimizing counterparty risk.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border border-blue-700/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-700/20 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center text-center p-8">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="p-4 rounded-full bg-blue-900/30 mb-6 border border-blue-700/30 shadow-lg shadow-blue-900/20"
                  >
                    <Sparkles className="w-8 h-8 text-blue-400" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-4">
                    Trustworthy Dispute Resolution
                  </h3>
                  <p className="text-blue-200">
                    Our future VCNFT system aims to provide impartial,
                    expert-driven resolution for disagreements, building a
                    foundation of trust.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
