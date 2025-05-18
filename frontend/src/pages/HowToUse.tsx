import React, { useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  Wallet,
  FileText,
  Send,
  CheckCircle,
  UserPlus,
  Clock,
  Shield,
  Zap,
  ArrowRightCircle,
  Lock,
} from 'lucide-react'

const HowToUse: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.3])
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9])

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.5,
      },
    },
  }

  const stepsContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.8,
      },
    },
  }

  const stepItem = {
    hidden: { opacity: 0, x: -30 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  }

  return (
    <div className="container mx-auto px-4 py-16 min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute left-1/4 top-0 w-96 h-96 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"
          style={{ opacity, scale, filter: 'blur(80px)' }}
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
          How To Use PactDA
        </motion.h1>
        <motion.p className="text-xl text-gray-200 max-w-2xl mx-auto mb-8 font-light leading-relaxed">
          Follow these simple steps to get started with secure, milestone-based
          contracts on PactDA.
        </motion.p>
      </div>

      <motion.div
        variants={stepsContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-4xl mx-auto mb-16"
      >
        <ul className="space-y-8">
          <motion.li
            variants={stepItem}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)',
            }}
            className="flex items-center gap-6 bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-blue-900 border-opacity-20 shadow-lg relative overflow-hidden transition-all duration-300"
          >
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-blue-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>

            <motion.span
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg"
            >
              <Wallet className="w-8 h-8 text-white" />
            </motion.span>
            <div>
              <h2 className="text-xl font-bold text-blue-300 mb-2">
                1. Connect Your Wallet
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Choose Sui, MetaMask, or zkLogin, or sign in with
                Google/Facebook for Web2 onboarding. PactDA supports multiple
                login methods for ease of use.
              </p>
            </div>
          </motion.li>

          <motion.li
            variants={stepItem}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 10px 30px rgba(66, 153, 225, 0.2)',
            }}
            className="flex items-center gap-6 bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-cyan-900 border-opacity-20 shadow-lg relative overflow-hidden transition-all duration-300"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-cyan-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>

            <motion.span
              whileHover={{ scale: 1.1, rotate: -5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg"
            >
              <FileText className="w-8 h-8 text-white" />
            </motion.span>
            <div>
              <h2 className="text-xl font-bold text-cyan-300 mb-2">
                2. Create a Contract
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Fill in contract details, define milestones with clear
                deliverables and deadlines. Customize payment terms and
                conditions for each milestone.
              </p>
            </div>
          </motion.li>

          <motion.li
            variants={stepItem}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 10px 30px rgba(156, 39, 176, 0.2)',
            }}
            className="flex items-center gap-6 bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-purple-900 border-opacity-20 shadow-lg relative overflow-hidden transition-all duration-300"
          >
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-purple-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>

            <motion.span
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg"
            >
              <UserPlus className="w-8 h-8 text-white" />
            </motion.span>
            <div>
              <h2 className="text-xl font-bold text-purple-300 mb-2">
                3. Invite Counterparty
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Invite the other party to review and sign the contract. They'll
                receive a notification and can connect their wallet to accept
                the terms.
              </p>
            </div>
          </motion.li>

          <motion.li
            variants={stepItem}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 10px 30px rgba(236, 72, 153, 0.2)',
            }}
            className="flex items-center gap-6 bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-pink-900 border-opacity-20 shadow-lg relative overflow-hidden transition-all duration-300"
          >
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-pink-600 to-purple-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>

            <motion.span
              whileHover={{ scale: 1.1, rotate: -5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg"
            >
              <Send className="w-8 h-8 text-white" />
            </motion.span>
            <div>
              <h2 className="text-xl font-bold text-pink-300 mb-2">
                4. Fund Escrow
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Deposit funds into the smart contract escrow. Funds are securely
                held and released only when milestones are completed and
                approved.
              </p>
            </div>
          </motion.li>

          <motion.li
            variants={stepItem}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 10px 30px rgba(34, 211, 238, 0.2)',
            }}
            className="flex items-center gap-6 bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-cyan-900 border-opacity-20 shadow-lg relative overflow-hidden transition-all duration-300"
          >
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-cyan-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>

            <motion.span
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg"
            >
              <Clock className="w-8 h-8 text-white" />
            </motion.span>
            <div>
              <h2 className="text-xl font-bold text-cyan-300 mb-2">
                5. Track Progress
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Monitor milestone progress in real-time. Both parties can view
                deadlines, completed tasks, and upcoming milestones on an
                intuitive dashboard.
              </p>
            </div>
          </motion.li>

          <motion.li
            variants={stepItem}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)',
            }}
            className="flex items-center gap-6 bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-green-900 border-opacity-20 shadow-lg relative overflow-hidden transition-all duration-300"
          >
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-green-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>

            <motion.span
              whileHover={{ scale: 1.1, rotate: -5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shadow-lg"
            >
              <CheckCircle className="w-8 h-8 text-white" />
            </motion.span>
            <div>
              <h2 className="text-xl font-bold text-green-300 mb-2">
                6. Complete & Release
              </h2>
              <p className="text-gray-300 leading-relaxed">
                As milestones are completed and approved, funds are
                automatically released to the recipient. This ensures fair
                payment for work done.
              </p>
            </div>
          </motion.li>
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.5 }}
        className="relative z-10 w-full max-w-3xl mx-auto bg-gray-900 bg-opacity-70 p-8 rounded-xl border border-blue-900 border-opacity-20 shadow-lg"
      >
        <h2 className="text-2xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          Additional Features
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-start gap-3"
          >
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-blue-300">
                Dispute Resolution
              </h3>
              <p className="text-gray-400 text-sm">
                Built-in arbitration process for resolving disagreements
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-start gap-3"
          >
            <Zap className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-purple-300">
                Cross-Chain Compatible
              </h3>
              <p className="text-gray-400 text-sm">
                Works across multiple blockchains through Wormhole
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-start gap-3"
          >
            <ArrowRightCircle className="w-5 h-5 text-pink-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-pink-300">
                One-Click Deployment
              </h3>
              <p className="text-gray-400 text-sm">
                Create and deploy contracts with just a few clicks
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-start gap-3"
          >
            <Lock className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-green-300">
                Secure Smart Contracts
              </h3>
              <p className="text-gray-400 text-sm">
                All contracts are audited and open-source
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default HowToUse
