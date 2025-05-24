import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import ContractForm from '@/components/CreateContract/ContractForm'

const CreateContract = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen text-white p-4  md:p-8  justify-center flex-col">
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
          <CardContent className="p-2 pt-0 -mt-5 -mb-6">
            <ContractForm />
          </CardContent>
        </motion.div>
      </div>
    </div>
  )
}

export default CreateContract
