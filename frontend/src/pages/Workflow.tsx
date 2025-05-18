import React, { useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  UserPlus,
  FilePlus,
  PenTool,
  ArrowRightLeft,
  Briefcase,
  CheckCircle,
  Banknote,
  Clock,
  Shield,
  Zap,
} from 'lucide-react'

const Workflow: React.FC = () => {
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.3])
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9])

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
          PactDA Workflow
        </motion.h1>
        <motion.p className="text-xl text-gray-200 max-w-2xl mx-auto mb-8 font-light leading-relaxed">
          See how PactDA guides you from contract creation to completion, step
          by step. Our workflow is designed to be intuitive, transparent, and
          secure.
        </motion.p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-4xl mx-auto mb-16"
      >
        <ol className="space-y-8">
          <motion.li variants={item} className="flex items-center gap-6">
            <motion.span
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg"
            >
              <UserPlus className="w-8 h-8 text-white" />
            </motion.span>
            <div className="bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-blue-900 border-opacity-20 shadow-lg flex-1 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-blue-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
              <h2 className="text-xl font-bold text-blue-300 mb-2">
                1. Connect & Onboard
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Connect your wallet (Sui, MetaMask, or zkLogin) or sign up with
                Google/Facebook. PactDA supports multiple login methods for
                seamless onboarding of both crypto-native and traditional users.
              </p>
            </div>
          </motion.li>

          <motion.li variants={item} className="flex items-center gap-6">
            <motion.span
              whileHover={{ scale: 1.1, rotate: -5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg"
            >
              <FilePlus className="w-8 h-8 text-white" />
            </motion.span>
            <div className="bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-cyan-900 border-opacity-20 shadow-lg flex-1 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-cyan-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
              <h2 className="text-xl font-bold text-cyan-300 mb-2">
                2. Create Contract
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Set up your agreement with a user-friendly interface. Add
                detailed milestones with descriptions, deadlines, and payment
                amounts. Invite the counterparty via email or wallet address to
                collaborate on the contract terms.
              </p>
            </div>
          </motion.li>

          <motion.li variants={item} className="flex items-center gap-6">
            <motion.span
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center shadow-lg"
            >
              <PenTool className="w-8 h-8 text-white" />
            </motion.span>
            <div className="bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-amber-900 border-opacity-20 shadow-lg flex-1 relative overflow-hidden">
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-amber-600 to-pink-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
              <h2 className="text-xl font-bold text-amber-300 mb-2">
                3. Review & Sign
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Both parties review the agreement details. The smart contract
                ensures that all terms are transparent and immutable once
                signed. Digital signatures are secured by blockchain technology,
                providing true cryptographic proof of agreement.
              </p>
            </div>
          </motion.li>

          <motion.li variants={item} className="flex items-center gap-6">
            <motion.span
              whileHover={{ scale: 1.1, rotate: -5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shadow-lg"
            >
              <Banknote className="w-8 h-8 text-white" />
            </motion.span>
            <div className="bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-green-900 border-opacity-20 shadow-lg flex-1 relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-green-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
              <h2 className="text-xl font-bold text-green-300 mb-2">
                4. Fund Escrow
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Deposit funds into the smart contract escrow for milestone-based
                release. The escrow supports multiple tokens and currencies,
                with cross-chain compatibility powered by Wormhole's secure
                bridge technology.
              </p>
            </div>
          </motion.li>

          <motion.li variants={item} className="flex items-center gap-6">
            <motion.span
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-700 flex items-center justify-center shadow-lg"
            >
              <Clock className="w-8 h-8 text-white" />
            </motion.span>
            <div className="bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-purple-900 border-opacity-20 shadow-lg flex-1 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-purple-600 to-blue-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
              <h2 className="text-xl font-bold text-purple-300 mb-2">
                5. Milestone Management
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Track progress of each milestone with real-time updates. Submit
                and review deliverables directly through the platform with
                secure file storage. Automated reminders ensure deadlines are
                met and all parties stay on track.
              </p>
            </div>
          </motion.li>

          <motion.li variants={item} className="flex items-center gap-6">
            <motion.span
              whileHover={{ scale: 1.1, rotate: -5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg"
            >
              <CheckCircle className="w-8 h-8 text-white" />
            </motion.span>
            <div className="bg-gray-900 bg-opacity-60 p-6 rounded-xl border border-pink-900 border-opacity-20 shadow-lg flex-1 relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-pink-600 to-purple-400 rounded-full filter blur-3xl opacity-10 -z-10"></div>
              <h2 className="text-xl font-bold text-pink-300 mb-2">
                6. Complete & Release
              </h2>
              <p className="text-gray-300 leading-relaxed">
                As milestones are completed and approved, funds are
                automatically released from escrow to the recipient. The entire
                payment history is recorded on-chain, providing an immutable
                record of all transactions.
              </p>
            </div>
          </motion.li>
        </ol>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.5 }}
        className="relative z-10 w-full max-w-3xl mx-auto bg-gray-900 bg-opacity-70 p-8 rounded-xl border border-blue-900 border-opacity-20 shadow-lg mb-8"
      >
        <h2 className="text-2xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          Dispute Resolution
        </h2>

        <div className="flex flex-col gap-4">
          <p className="text-gray-300 leading-relaxed">
            In case of disagreements, PactDA provides a built-in dispute
            resolution system:
          </p>

          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-start gap-3 mt-2"
          >
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-blue-300">
                Escrow Protection
              </h3>
              <p className="text-gray-400 text-sm">
                Funds remain securely locked until disputes are resolved
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-start gap-3"
          >
            <ArrowRightLeft className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-purple-300">
                On-Chain Mediation
              </h3>
              <p className="text-gray-400 text-sm">
                Optional third-party arbitration with verifiable outcomes
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-start gap-3"
          >
            <Briefcase className="w-5 h-5 text-pink-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-pink-300">
                Evidence Submission
              </h3>
              <p className="text-gray-400 text-sm">
                Secure system for submitting and reviewing dispute evidence
              </p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-start gap-3"
          >
            <Zap className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-green-300">
                Fast Resolution
              </h3>
              <p className="text-gray-400 text-sm">
                Quicker than traditional legal processes with transparent
                outcomes
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default Workflow
