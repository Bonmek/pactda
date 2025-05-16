import ContractForm from '@/components/CreateContract/CreateForm'
import { motion } from 'framer-motion'

const CreateContract = () => {
  return (
    <div className="min-h-screen text-white p-4 md:p-8 flex flex-col items-center">
      <motion.div
        className="w-full max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.h1
          className="text-2xl md:text-4xl font-light tracking-tight mb-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Smart Contract Agreement
          </span>
        </motion.h1>
        <ContractForm />
      </motion.div>
    </div>
  )
}

export default CreateContract
