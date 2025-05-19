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
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit'
import { buildCreateContractTx } from '@/service/PactdaService'

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
  const suiClient = useSuiClient()
  const currentAccount = useCurrentAccount()
  const address = currentAccount?.address
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState<string | undefined>() // String
  const [suiPartyBAddress, setSuiPartyBAddress] = useState<string | undefined>() // Option<address>
  const [contractType, setContractType] = useState<number | undefined>(
    undefined,
  ) // Option<u8>
  const [termsReference, setTermsReference] = useState<string | undefined>() // Option<vector<u8>>
  const [metadata, setMetadata] = useState<string | undefined>() // Option<vector<u8>>
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [milestones, setMilestones] = useState<Milestone[]>([])

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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length == 0) {
      setTitle(undefined)
    } else {
      setTitle(e.target.value)
    }
  }

  const handlePartyBAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.value.length == 0) {
      setSuiPartyBAddress(undefined)
    } else {
      setSuiPartyBAddress(e.target.value)
    }
  }
  const handleContractTypeChange = (value?: number) => {
    setContractType(value)
  }
  const handleTermsReferenceChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    if (e.target.value.length == 0) {
      setTermsReference(undefined)
    } else {
      setTermsReference(e.target.value)
    }
  }
  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length == 0) {
      setMetadata(undefined)
    } else {
      setMetadata(e.target.value)
    }
  }
  const handleStartDateChange = (date?: Date) => {
    if (date == undefined) {
      setStartDate(undefined)
    } else {
      setStartDate(date)
    }
  }
  const handleEndDateChange = (date?: Date) => {
    if (date == undefined) {
      setEndDate(undefined)
    } else {
      setEndDate(date)
    }
  }
  const handleMilestoneChange = (milestone: Milestone) => {
    // Add logic for handling milestone changes here
  }

  const handleCreate = async () => {
    console.log('Creating contract...')
    try {
      if (!currentAccount) {
        toast.error('Please connect your Sui wallet.')
        return
      }
      if (!title) {
        toast.error('Title is required.')
        return
      }

      // Regular Sui contract validation
      // Validate suiPartyBAddress if provided
      if (
        suiPartyBAddress &&
        suiPartyBAddress.trim() !== '' &&
        !/^0x[a-fA-F0-9]{64}$/.test(suiPartyBAddress)
      ) {
        toast.error(
          "Party B's Sui Address is invalid. It must be a 64-character hex string starting with 0x, or left empty.",
        )
        return
      }

      // Common validations for both contract types
      // Validate contractType if provided
      if (
        contractType !== undefined &&
        (contractType < 0 || contractType > 255)
      ) {
        toast.error('Please select a contract type.')
        return
      }

      // Validate termsReference for potential BCS serialization issues
      if (termsReference && termsReference.trim() !== '') {
        // Check for non-ASCII characters or control characters that might cause BCS serialization issues
        if (/[^ -~]/.test(termsReference)) {
          toast.error(
            'Terms Reference contains non-ASCII characters that may cause errors. Please use only ASCII characters.',
          )
          return
        }
        if (termsReference.length > 1000) {
          toast.error(
            'Terms Reference is too long. Please keep it under 1000 characters.',
          )
          return
        }
      }

      // Validate metadata for potential BCS serialization issues
      if (metadata && metadata.trim() !== '') {
        // Check for non-ASCII characters or control characters that might cause BCS serialization issues
        if (/[^ -~]/.test(metadata)) {
          toast.error(
            'Metadata contains non-ASCII characters that may cause errors. Please use only ASCII characters.',
          )
          return
        }
        if (metadata.length > 1000) {
          toast.error(
            'Metadata is too long. Please keep it under 1000 characters.',
          )
          return
        }
      } // Convert date strings to timestamps (u64)
      const startDateTimestamp = startDate
        ? Math.floor(startDate.getTime() / 1000)
        : undefined
      const endDateTimestamp = endDate
        ? Math.floor(endDate.getTime() / 1000)
        : undefined

      if (startDateTimestamp && isNaN(startDateTimestamp)) {
        toast.error('Invalid Start Date.')
        return
      }
      if (endDateTimestamp && isNaN(endDateTimestamp)) {
        toast.error('Invalid End Date.')
        return
      }
      if (
        startDateTimestamp &&
        endDateTimestamp &&
        startDateTimestamp >= endDateTimestamp
      ) {
        toast.error('Start Date must be before End Date.')
        return
      }

      setLoading(true)

      // Handle empty strings correctly by converting to undefined
      const cleanPartyBAddress =
        suiPartyBAddress && suiPartyBAddress.trim() !== ''
          ? suiPartyBAddress
          : undefined
      const cleanTermsReference =
        termsReference && termsReference.trim() !== ''
          ? termsReference
          : undefined
      const cleanMetadata =
        metadata && metadata.trim() !== '' ? metadata : undefined

      // Check for potentially problematic inputs
      if (cleanTermsReference && /[^ -~]/.test(cleanTermsReference)) {
        toast.error(
          'Terms reference contains non-printable or special characters which may cause encoding issues. Please use simple text only.',
        )
        setLoading(false)
        return
      }

      if (cleanMetadata && /[^ -~]/.test(cleanMetadata)) {
        toast.error(
          'Metadata contains non-printable or special characters which may cause encoding issues. Please use simple text only.',
        )
        setLoading(false)
        return
      }

      try {
        // Choose between cross-chain or regular contract creation
        let txb

        // Create regular Sui contract
        txb = buildCreateContractTx(
          title!,
          cleanPartyBAddress,
          contractType,
          cleanTermsReference,
          startDateTimestamp,
          endDateTimestamp,
          cleanMetadata,
        )

        // Execute the transaction
        const result = await signAndExecuteTransaction({ transaction: txb })

        // Get the transaction digest
        if (!result.digest) {
          toast.error('Transaction succeeded but no digest was returned')
          setLoading(false)
          return
        }

        const txn = await suiClient.waitForTransaction({
          digest: result.digest,
          options: {
            showEffects: true,
          },
        })
        let createdObjectId = ''

        // Use the digest to find the contract object ID
        if (
          txn.effects &&
          txn.effects.created &&
          txn.effects?.created?.length > 0
        ) {
          createdObjectId = txn.effects?.created[0]?.reference.objectId
        }

        if (!createdObjectId) {
          toast.error('Transaction succeeded but no object ID was returned')
          setLoading(false)
          return
        }
        toast.success('Contract created successfully!')
        navigate(`/contracts/${createdObjectId}`)

        // Reset form
        setTitle(undefined)
        setSuiPartyBAddress(undefined)
        setContractType(undefined)
        setTermsReference(undefined)
        setStartDate(undefined)
        setEndDate(undefined)
        setMetadata(undefined)
      } catch (e: unknown) {
        // Updated type
        let errorMessage = 'Failed to create contract: '
        if (e instanceof Error) {
          errorMessage += e.message
        } else {
          errorMessage += 'An unexpected error occurred.'
        }
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = () => {
    toast.success('Draft saved successfully!')
  }

  return (
    <motion.div
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
            value={title}
            onChange={handleTitleChange}
          />
        </FormSection>
      </motion.div>

      <motion.div variants={itemVariants}>
        <FormSection title="Type of Agreement">
          <AgreementType
            selectedType={contractType}
            onSelectType={handleContractTypeChange}
          />
        </FormSection>
      </motion.div>

      <motion.div variants={itemVariants}>
        <FormSection
          title="Parties Involved"
          subtitle="You (Party A - Initiator)"
        >
          <PartyInformation
            partyAAddress={address}
            partyBAddress={suiPartyBAddress}
            onPartyBAddressChange={handlePartyBAddressChange}
          />
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
            setStartDate={handleStartDateChange}
            setEndDate={handleEndDateChange}
            onTermsReferenceChange={handleTermsReferenceChange}
            termsReference={termsReference}
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
          <AdditionalInformation
            onMetadataChange={handleMetadataChange}
            metaData={metadata}
          />
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
            onClick={handleCreate}
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Send for Review
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default ContractForm
