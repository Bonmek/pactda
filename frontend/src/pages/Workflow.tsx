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
  AlertCircle,
  Wallet,
  Mail,
  FileText,
  CreditCard,
  Users,
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
      </div>{' '}
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
        {/* Quick Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="bg-gradient-to-r from-blue-900 to-purple-900 bg-opacity-50 p-6 rounded-xl border border-blue-700 border-opacity-30 shadow-lg max-w-3xl mx-auto mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-6 h-6 text-yellow-400" />
            <h3 className="text-lg font-bold text-yellow-300">
              Quick Start Tips
            </h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-blue-300">
                  Security First:
                </span>
                <p className="text-gray-300">
                  Always verify contract details before signing
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-green-300">Plan Ahead:</span>
                <p className="text-gray-300">
                  Set realistic milestones and deadlines
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-purple-300">
                  Communicate:
                </span>
                <p className="text-gray-300">
                  Stay in touch throughout the project
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-4xl mx-auto mb-16"
      >
        {' '}
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
              <h2 className="text-xl font-bold text-blue-300 mb-3">
                1. Connect & Onboard
              </h2>

              {/* Prerequisites */}
              <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700 border-opacity-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-300">
                    Prerequisites:
                  </span>
                </div>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li className="flex items-center gap-2">
                    <Wallet className="w-3 h-3" />A crypto wallet (Sui Wallet,
                    MetaMask) OR
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    Google/Facebook account for easy signup
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Valid email address for notifications (future updates)
                  </li>
                </ul>
              </div>

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
              <h2 className="text-xl font-bold text-cyan-300 mb-3">
                2. Create Contract
              </h2>

              {/* Prerequisites */}
              <div className="mb-4 p-3 bg-cyan-900 bg-opacity-30 rounded-lg border border-cyan-700 border-opacity-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-cyan-300">
                    Prerequisites:
                  </span>
                </div>
                <ul className="text-sm text-cyan-200 space-y-1">
                  <li className="flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    Clear project scope and deliverables
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Defined timeline and milestones
                  </li>
                  <li className="flex items-center gap-2">
                    <CreditCard className="w-3 h-3" />
                    Payment amounts for each milestone
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    Counterparty's wallet address or email
                  </li>
                </ul>
              </div>

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
              <h2 className="text-xl font-bold text-amber-300 mb-3">
                3. Review & Sign
              </h2>

              {/* Prerequisites */}
              <div className="mb-4 p-3 bg-amber-900 bg-opacity-30 rounded-lg border border-amber-700 border-opacity-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">
                    Prerequisites:
                  </span>
                </div>
                <ul className="text-sm text-amber-200 space-y-1">
                  <li className="flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    Both parties must review contract terms
                  </li>
                  <li className="flex items-center gap-2">
                    <Wallet className="w-3 h-3" />
                    Connected wallet for digital signature
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" />
                    Agreement on all milestone details
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Understanding of smart contract terms
                  </li>
                </ul>
              </div>

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
              <h2 className="text-xl font-bold text-green-300 mb-3">
                4. Fund Escrow
              </h2>

              {/* Prerequisites */}
              <div className="mb-4 p-3 bg-green-900 bg-opacity-30 rounded-lg border border-green-700 border-opacity-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-green-300">
                    Prerequisites:
                  </span>
                </div>
                <ul className="text-sm text-green-200 space-y-1">
                  <li className="flex items-center gap-2">
                    <CreditCard className="w-3 h-3" />
                    Sufficient funds in your wallet
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    Small amount for transaction fees
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" />
                    Both parties have signed the contract
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Understanding of escrow mechanism
                  </li>
                </ul>
              </div>

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
              <h2 className="text-xl font-bold text-purple-300 mb-3">
                5. Milestone Management
              </h2>

              {/* Prerequisites */}
              <div className="mb-4 p-3 bg-purple-900 bg-opacity-30 rounded-lg border border-purple-700 border-opacity-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-300">
                    Prerequisites:
                  </span>
                </div>
                <ul className="text-sm text-purple-200 space-y-1">
                  <li className="flex items-center gap-2">
                    <Banknote className="w-3 h-3" />
                    Escrow must be funded
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    Work deliverables and proof ready
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Regular communication between parties
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" />
                    Clear milestone completion criteria
                  </li>
                </ul>
              </div>

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
              <h2 className="text-xl font-bold text-pink-300 mb-3">
                6. Complete & Release
              </h2>

              {/* Prerequisites */}
              <div className="mb-4 p-3 bg-pink-900 bg-opacity-30 rounded-lg border border-pink-700 border-opacity-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-pink-400" />
                  <span className="text-sm font-semibold text-pink-300">
                    Prerequisites:
                  </span>
                </div>
                <ul className="text-sm text-pink-200 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" />
                    Milestone deliverables submitted
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    Client approval of work completed
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    No active disputes on milestone
                  </li>
                  <li className="flex items-center gap-2">
                    <Banknote className="w-3 h-3" />
                    Sufficient funds remain in escrow
                  </li>
                </ul>
              </div>

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
