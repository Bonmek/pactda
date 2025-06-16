import React, { useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  FileText,
  Book,
  Code,
  Database,
  Globe,
  ExternalLink,
  Shield,
  Network,
  Key,
  BookOpen,
} from 'lucide-react'

const Docs: React.FC = () => {
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.3])
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10,
      },
    },
  }

  const resourcesContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.8,
      },
    },
  }

  return (
    <div className="container mx-auto px-4 py-16 min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          style={{ opacity, scale, filter: 'blur(80px)' }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute left-1/4 top-0 w-96 h-96 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="absolute right-1/4 bottom-0 w-72 h-72 bg-gradient-to-br from-pink-500 to-blue-500 rounded-full"
          style={{ filter: 'blur(60px)' }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 5, repeat: Infinity, repeatType: 'loop' }}
          className="absolute top-1/3 right-1/3 w-32 h-32 bg-blue-300 bg-opacity-20 rounded-full"
          style={{ filter: 'blur(30px)' }}
        />{' '}
      </div>
      <div className="relative z-10 text-center mb-12">
        {' '}
        <motion.h1
          whileHover={{
            scale: 1.03,
            textShadow: '0 0 8px rgba(96, 165, 250, 0.5)',
            backgroundPosition: '100% 50%',
          }}
          whileTap={{ scale: 0.98 }}
          className="text-5xl md:text-6xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-lg cursor-pointer bg-size-200 bg-pos-0"
        >
          PactDA Documentation
        </motion.h1>
        <motion.p className="text-xl text-gray-200 max-w-2xl mx-auto mb-8 font-light leading-relaxed">
          Everything you need to build, integrate, and use PactDA smart
          contracts and protocol. Comprehensive guides for users and developers
          alike.
        </motion.p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-4xl mx-auto mb-16"
      >
        <div className="grid md:grid-cols-2 gap-8 text-left">
          <motion.div
            variants={item}
            whileHover={{
              scale: 1.03,
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)',
            }}
            className="bg-gray-900 bg-opacity-70 rounded-xl p-8 shadow-lg transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-blue-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-blue-300">
                Getting Started
              </h2>
            </div>
            <ul className="list-disc pl-5 text-gray-300 space-y-3">
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                Connect your wallet (Sui, MetaMask, or zkLogin)
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                Create a new contract and set milestones
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                Fund escrow and manage payments
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                Resolve disputes on-chain
              </motion.li>
            </ul>
          </motion.div>

          <motion.div
            variants={item}
            whileHover={{
              scale: 1.03,
              boxShadow: '0 10px 30px rgba(147, 51, 234, 0.2)',
            }}
            className="bg-gray-900 bg-opacity-70 rounded-xl p-8 shadow-lg transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-purple-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
            <div className="flex items-center gap-3 mb-4">
              <Code className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-purple-300">
                Smart Contract Reference
              </h2>
            </div>
            <ul className="list-disc pl-5 text-gray-300 space-y-3">
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                Contract lifecycle and status codes
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                Milestone management and verification
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                Escrow funding and conditional release
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                Cross-chain (Wormhole) integration
              </motion.li>
            </ul>
          </motion.div>

          <motion.div
            variants={item}
            whileHover={{
              scale: 1.03,
              boxShadow: '0 10px 30px rgba(236, 72, 153, 0.2)',
            }}
            className="bg-gray-900 bg-opacity-70 rounded-xl p-8 shadow-lg transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-pink-600 to-purple-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
            <div className="flex items-center gap-3 mb-4">
              <Network className="w-6 h-6 text-pink-400" />
              <h2 className="text-2xl font-bold text-pink-300">
                API Integration
              </h2>
            </div>
            <ul className="list-disc pl-5 text-gray-300 space-y-3">
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                REST API endpoints and authentication
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
              >
                Event listeners and webhooks
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
              >
                SDK documentation for JavaScript/TypeScript
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
              >
                Example integrations and code samples
              </motion.li>
            </ul>
          </motion.div>

          <motion.div
            variants={item}
            whileHover={{
              scale: 1.03,
              boxShadow: '0 10px 30px rgba(34, 211, 238, 0.2)',
            }}
            className="bg-gray-900 bg-opacity-70 rounded-xl p-8 shadow-lg transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-cyan-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h2 className="text-2xl font-bold text-cyan-300">
                Security Features
              </h2>
            </div>
            <ul className="list-disc pl-5 text-gray-300 space-y-3">
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                Smart contract audit reports and findings
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
              >
                Secure escrow mechanism architecture
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
              >
                Cryptographic verification of contract events
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
              >
                Zero-knowledge proof integration for privacy
              </motion.li>
            </ul>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        variants={resourcesContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-3xl mx-auto"
      >
        <motion.h2
          variants={item}
          className="text-2xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
        >
          External Resources
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-6">
          <motion.a
            variants={item}
            whileHover={{ scale: 1.05, y: -5 }}
            href="https://docs.sui.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg flex flex-col items-center transition-all duration-300 border border-blue-900 border-opacity-20 relative overflow-hidden"
          >
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-blue-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
            <Globe className="w-8 h-8 text-blue-400 mb-3" />
            <div className="text-lg font-bold text-blue-300 mb-2">Sui Docs</div>
            <div className="text-gray-400 text-sm text-center">
              Official Sui blockchain documentation and APIs
            </div>
            <ExternalLink className="w-4 h-4 text-blue-400 mt-3" />
          </motion.a>

          <motion.a
            variants={item}
            whileHover={{ scale: 1.05, y: -5 }}
            href="https://wormhole.com/docs/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg flex flex-col items-center transition-all duration-300 border border-purple-900 border-opacity-20 relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-purple-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
            <Network className="w-8 h-8 text-purple-400 mb-3" />
            <div className="text-lg font-bold text-purple-300 mb-2">
              Wormhole Docs
            </div>
            <div className="text-gray-400 text-sm text-center">
              Cross-chain protocol documentation and integration guides
            </div>
            <ExternalLink className="w-4 h-4 text-purple-400 mt-3" />
          </motion.a>

          <motion.a
            variants={item}
            whileHover={{ scale: 1.05, y: -5 }}
            href="https://github.com/pactda"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg flex flex-col items-center transition-all duration-300 border border-pink-900 border-opacity-20 relative overflow-hidden"
          >
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-pink-600 to-purple-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
            <Code className="w-8 h-8 text-pink-400 mb-3" />
            <div className="text-lg font-bold text-pink-300 mb-2">GitHub</div>
            <div className="text-gray-400 text-sm text-center">
              View source code, contribute, and report issues
            </div>
            <ExternalLink className="w-4 h-4 text-pink-400 mt-3" />
          </motion.a>
        </div>
      </motion.div>
    </div>
  )
}

export default Docs
