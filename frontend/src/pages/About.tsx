import React from 'react'
import PageLayout from '../components/Layout/PageLayout'
import { motion } from 'framer-motion'
import { Shield, Zap, Globe, RefreshCw, Lock } from 'lucide-react'

const About: React.FC = () => {
  return (
    <PageLayout
      title="About PactDA"
      subtitle="PactDA is a next-generation decentralized trust protocol for contract creators, freelancers, and businesses. Our mission is to make digital agreements secure, transparent, and easy to use for everyone."
    >
      {' '}
      <div className="w-full max-w-4xl mx-auto mb-16">
        <div className="grid md:grid-cols-2 gap-8 text-left">
          <motion.div
            whileHover={{ scale: 1.03 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900 bg-opacity-70 rounded-xl p-8 shadow-lg card-hover border border-blue-900 border-opacity-20"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-900 bg-opacity-30 rounded-full">
                <RefreshCw className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-blue-300 mb-2">
                  Our Vision
                </h2>
                <p className="text-gray-300 leading-relaxed">
                  We believe in a world where trust is programmable and
                  borderless. PactDA leverages the Sui blockchain and
                  cross-chain technology to enable secure, milestone-based
                  agreements for any use case.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gray-900 bg-opacity-70 rounded-xl p-8 shadow-lg card-hover relative border border-purple-900 border-opacity-20 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full filter blur-3xl opacity-10 -z-10 animate-pulse"></div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-900 bg-opacity-30 rounded-full">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-purple-300 mb-3">
                  Why PactDA?
                </h2>
                <ul className="space-y-3">
                  <motion.li
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 text-gray-300"
                  >
                    <Lock className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>Audited, open-source smart contracts</span>
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center gap-2 text-gray-300"
                  >
                    <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>Multi-chain support (Sui, Ethereum, more soon)</span>
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 text-gray-300"
                  >
                    <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Web2 and Web3 onboarding (zkLogin, wallets)</span>
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center gap-2 text-gray-300"
                  >
                    <RefreshCw className="w-4 h-4 text-pink-400 flex-shrink-0" />
                    <span>Automated escrow and dispute resolution</span>
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center gap-2 text-gray-300"
                  >
                    <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Transparent, on-chain event history</span>
                  </motion.li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>{' '}
      <div className="w-full max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-2xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400"
        >
          Meet the Team
        </motion.h2>

        <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg flex flex-col items-center border border-purple-900 border-opacity-20 relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full filter blur-3xl opacity-10 -z-10"></div>
            <motion.div
              whileHover={{ rotate: -10, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center text-3xl font-bold text-white mb-3 shadow-lg"
            >
              Ten
            </motion.div>
            <div className="text-lg font-bold text-purple-300 mb-1">
              Tanawat Palaboon
            </div>
            <div className="text-gray-400 text-sm">
              Project Manager/Developer
            </div>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  )
}

export default About
