import ContractForm from '@/components/CreateContract/CreateForm'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'

const CreateContract = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen text-white p-4 md:p-8  justify-center flex-col">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-blue-400 hover:text-blue-300 transition cursor-pointer"
      >
        ← Back to contracts
      </button>
      <div className="flex flex-col items-center">
        <motion.div
          className="w-full max-w-8xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="rounded-2xl shadow-lg bg-gray-800">
            <CardContent className="p-8">
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
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default CreateContract
