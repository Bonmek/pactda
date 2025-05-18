import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import FormSection from './FormSection'
import PartyInformation from './PartyInformation'
import AgreementType from './AgreementType'
import ContractTerms from './ContractTerms'
import EscrowPayment from './EscrowPayment'
import MilestoneList from './MilestoneList'
import AdditionalInformation from './AdditionalInformation'
import { useNavigate } from 'react-router-dom'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { buildCreateContractTx } from '@/service/PactdaService'


// const [loading, setLoading] = useState(false)
// const navigate = useNavigate()
// const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()

// const handleSubmit = async () => {
//   setLoading(true)
//   try {
//     const txb = buildCreateContractTx(partyB, termsRef)

//     signAndExecuteTransaction(
//       {
//         transaction: txb,
//         chain: chain,
//       },
//       {
//         onSuccess: async (result) => {
//           console.log('executed transaction', result)
//           await new Promise((res) => setTimeout(res, 2000))
//           navigate('/dashboard')
//         },
//       },
//     )
//   } catch (error) {
//     console.error('Error creating contract:', error)
//     setLoading(false)
//   }
// }

type Milestone = {
  id: string
  title: string
  description: string
  value: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const ContractForm = () => {
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [milestones, setMilestones] = useState<Milestone[]>([])
    const currentAccount = useCurrentAccount()
    const address = currentAccount?.address

  const addMilestone = () => {
    // ... keep existing code (milestone adding logic)
  }

  const removeMilestone = (id: string) => {
    // ... keep existing code (milestone removal logic)
  }

  const updateMilestone = (
    id: string,
    field: keyof Milestone,
    value: string,
  ) => {
    // ... keep existing code (milestone updating logic)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('Contract submitted for review!')
  }

  const handleSaveDraft = () => {
    toast.success('Draft saved successfully!')
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants}>
        <FormSection title="Agreement Title">
          <Input
            placeholder="e.g., Q1 Marketing Campaign, Logo Design Services"
            className="bg-slate-800/30 border-slate-700/50 text-white"
          />
        </FormSection>
      </motion.div>

      <motion.div variants={itemVariants}>
        <FormSection title="Type of Agreement">
          <AgreementType />
        </FormSection>
      </motion.div>

      <motion.div variants={itemVariants}>
        <FormSection
          title="Parties Involved"
          subtitle="You (Party A - Initiator)"
        >
          <PartyInformation address={address} />
        </FormSection>
      </motion.div>

      <motion.div variants={itemVariants}>
        <FormSection
          title="Key Terms & Dates"
          subtitle="Key Contract Terms / Summary"
        >
          <ContractTerms
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
          />
        </FormSection>
      </motion.div>

      <motion.div variants={itemVariants}>
        <FormSection title="Escrow & Payment">
          <EscrowPayment />
        </FormSection>
      </motion.div>

      <motion.div variants={itemVariants}>
        <FormSection
          title="Milestones"
          subtitle="(Optional - if not added, total escrow value applies to final delivery)"
        >
          <MilestoneList
            milestones={milestones}
            updateMilestone={updateMilestone}
            removeMilestone={removeMilestone}
            addMilestone={addMilestone}
          />
        </FormSection>
      </motion.div>

      <motion.div variants={itemVariants}>
        <FormSection
          title="Additional Information"
          subtitle="Metadata / Links (Optional)"
        >
          <AdditionalInformation />
        </FormSection>
      </motion.div>

      <motion.div
        className="flex justify-end space-x-4 pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <motion.button
          type="button"
          onClick={handleSaveDraft}
          className="bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/40 text-white px-4 py-2 rounded"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Save Draft
        </motion.button>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleSubmit}
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Send for Review
          </Button>
        </motion.div>
      </motion.div>
    </motion.form>
  )
}

export default ContractForm
