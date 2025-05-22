import React, { useState, useEffect } from 'react'
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
import suiLogo from './chain-logos/sui.svg'
import solanaLogo from './chain-logos/solana.svg'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

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

const weightedSteps = [
  { id: 'title', label: 'Title', icon: '📝', weight: 30 },
  { id: 'type', label: 'Agreement Type', icon: '📋', weight: 10 },
  { id: 'parties', label: 'Parties', icon: '👥', weight: 15 },
  { id: 'terms', label: 'Terms & Dates', icon: '📅', weight: 15 },
  { id: 'payment', label: 'Payment', icon: '💰', weight: 10 },
  { id: 'milestones', label: 'Milestones', icon: '🏆', weight: 10 },
  { id: 'additional', label: 'Additional Info', icon: '📎', weight: 10 },
]

// Steps for the form completion process
const formSteps = [
  { id: 'title', label: 'Title', icon: '📝', required: true },
  { id: 'type', label: 'Agreement Type', icon: '📋', required: false },
  { id: 'parties', label: 'Parties', icon: '👥', required: false },
  { id: 'terms', label: 'Terms & Dates', icon: '📅', required: false },
  { id: 'payment', label: 'Payment', icon: '💰', required: false },
  { id: 'milestones', label: 'Milestones', icon: '🏆', required: false },
  { id: 'additional', label: 'Additional Info', icon: '📎', required: false },
]

interface ContractFormProps {
  initialValues?: {
    title?: string
    suiPartyBAddress?: string
    contractType?: number
    termsReference?: string
    metadata?: string
    contractStartDate?: Date
    contractDeadlineDate?: Date
    milestones?: Milestone[]
  }
  onSubmit?: (values: {
    title: string
    suiPartyBAddress?: string
    contractType?: number
    termsReference?: string
    metadata?: string
    contractStartDate?: Date
    contractDeadlineDate?: Date
    milestones?: Milestone[]
  }) => Promise<void> | void
  disableTitle?: boolean
  mode?: 'create' | 'update'
}

const ContractForm: React.FC<ContractFormProps> = ({
  initialValues = {},
  onSubmit,
  disableTitle = false,
  mode = 'create',
}) => {
  const suiClient = useSuiClient()
  const currentAccount = useCurrentAccount()
  const address = currentAccount?.address
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState<string | undefined>(initialValues.title) // String
  const [suiPartyBAddress, setSuiPartyBAddress] = useState<string | undefined>(
    initialValues.suiPartyBAddress,
  ) // Option<address>
  const [contractType, setContractType] = useState<number | undefined>(
    initialValues.contractType,
  ) // Option<u8>
  const [termsReference, setTermsReference] = useState<string | undefined>(
    initialValues.termsReference,
  ) // Option<vector<u8>>
  const [metadata, setMetadata] = useState<string | undefined>(
    initialValues.metadata,
  ) // Option<vector<u8>>
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialValues.contractStartDate,
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialValues.contractDeadlineDate,
  )
  const [milestones, setMilestones] = useState<Milestone[]>(
    initialValues.milestones || [],
  )
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractFileUrl, setContractFileUrl] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const titleRef = React.useRef<HTMLInputElement>(null)
  
  const [drafts, setDrafts] = useState<any[]>([])
  const [showDraftMenu, setShowDraftMenu] = useState(false)
  const draftMenuRef = React.useRef<HTMLDivElement>(null)

  const escrowChainIcon = suiLogo // Only Sui enabled for now

  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const updateCompletedSteps = () => {
    const completed = []

    if (title && title.length > 3) completed.push('title')
    if (contractType !== undefined) completed.push('type')
    if (address && (suiPartyBAddress || suiPartyBAddress === ''))
      completed.push('parties')
    if (termsReference || (startDate && endDate)) completed.push('terms')
    completed.push('payment')
    if (milestones.length > 0 && milestones.some((m) => m.title))
      completed.push('milestones')
    if (metadata) completed.push('additional')

    if (JSON.stringify(completed) !== JSON.stringify(completedSteps)) {
      setCompletedSteps(completed)
    }
  }

  useEffect(() => {
    const shouldUpdate = title !== undefined || 
                        contractType !== undefined || 
                        suiPartyBAddress !== undefined || 
                        termsReference !== undefined || 
                        startDate !== undefined || 
                        endDate !== undefined || 
                        metadata !== undefined || 
                        milestones.length > 0 || 
                        address !== undefined;
    
    if (shouldUpdate) {
      updateCompletedSteps();
    }
  }, [
    title,
    contractType,
    suiPartyBAddress,
    termsReference,
    startDate,
    endDate,
    metadata,
    milestones,
    address,
  ])

  useEffect(() => {
    if (mode === 'create') {
      try {
        const draftsJSON = localStorage.getItem('contractDrafts')
        if (draftsJSON) {
          const loadedDrafts = JSON.parse(draftsJSON)
          setDrafts(loadedDrafts)
        }
      } catch (error) {
        console.error('Error loading drafts list:', error)
      }
    }
  }, [mode, initialValues])
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (draftMenuRef.current && !draftMenuRef.current.contains(event.target as Node)) {
        setShowDraftMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [draftMenuRef])

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: Date.now().toString(),
        title: '',
        description: '',
        value: '',
      },
    ])
  }

  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter((milestone) => milestone.id !== id))
  }

  const updateMilestone = (
    id: string,
    field: keyof Milestone,
    value: string,
  ) => {
    setMilestones(
      milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, [field]: value } : milestone,
      ),
    )
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length == 0) {
      setTitle(undefined)
    } else {
      setTitle(e.target.value)
    }
    updateCompletedSteps()
  }

  const handlePartyBAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.value.length == 0) {
      setSuiPartyBAddress(undefined)
    } else {
      setSuiPartyBAddress(e.target.value)
    }
    updateCompletedSteps()
  }
  const handleContractTypeChange = (value?: number) => {
    setContractType(value)
    updateCompletedSteps()
  }
  const handleTermsReferenceChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    if (e.target.value.length == 0) {
      setTermsReference(undefined)
    } else {
      setTermsReference(e.target.value)
    }
    updateCompletedSteps()
  }
  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length == 0) {
      setMetadata(undefined)
    } else {
      setMetadata(e.target.value)
    }
    updateCompletedSteps()
  }
  const handleStartDateChange = (date?: Date) => {
    if (date == undefined) {
      setStartDate(undefined)
    } else {
      setStartDate(date)
    }
    updateCompletedSteps()
  }
  const handleEndDateChange = (date?: Date) => {
    if (date == undefined) {
      setEndDate(undefined)
    } else {
      setEndDate(date)
    }
    updateCompletedSteps()
  }
  const handleMilestoneChange = (milestone: Milestone) => {
    updateCompletedSteps()
  }

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);
  const [gasLoading, setGasLoading] = useState(false);
  const [gasError, setGasError] = useState<string | null>(null);
  const [pendingTxb, setPendingTxb] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);

  const [currentBalance, setCurrentBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (address) {
        setBalanceLoading(true);
        try {
          const coinBalance = await suiClient.getBalance({ owner: address });
          setCurrentBalance((Number(coinBalance.totalBalance) / 1e9).toFixed(6));
        } catch (e) {
          setCurrentBalance(null);
        } finally {
          setBalanceLoading(false);
        }
      } else {
        setCurrentBalance(null);
      }
    };
    fetchBalance();
  }, [address, suiClient]);

  const handleSubmit = async () => {
    try {
      if (!currentAccount) {
        toast.error('Please connect your Sui wallet.')
        return
      }
      if (!title) {
        toast.error('Title is required.')
        titleRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
        titleRef.current?.focus()
        return
      }

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

      if (
        contractType !== undefined &&
        (contractType < 0 || contractType > 255)
      ) {
        toast.error('Please select a contract type.')
        return
      }

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

      if (metadata && metadata.trim() !== '') {
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
      } 
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

      let txb

      txb = buildCreateContractTx(
        title!,
        cleanPartyBAddress,
        contractType,
        cleanTermsReference,
        startDateTimestamp,
        endDateTimestamp,
        cleanMetadata,
      )
      // Set sender for dry run context
      if (address) txb.setSenderIfNotSet(address);
      setGasLoading(true)
      setGasError(null)
      setEstimatedGas(null)
      setPendingTxb(txb)
      setShowConfirmModal(true)

      // Dry run for gas estimation
      try {
        const dryRunBytes = await txb.build({ client: suiClient });
        const dryRunResult = await suiClient.dryRunTransactionBlock({ transactionBlock: dryRunBytes });
        if (dryRunResult.effects && dryRunResult.effects.gasUsed) {
          const { computationCost, storageCost, storageRebate } = dryRunResult.effects.gasUsed;
          const totalMist = BigInt(computationCost) + BigInt(storageCost) - BigInt(storageRebate);
          const formatted = `${(Number(totalMist) / 1e9).toFixed(6)} SUI`;
          setEstimatedGas(formatted);
        } else {
          setEstimatedGas(null);
          setGasError('Could not estimate gas.');
        }
      } catch (err) {
        setGasError('Failed to estimate gas.');
        setEstimatedGas(null);
      } finally {
        setGasLoading(false)
        setLoading(false)
      }
    } catch (e: unknown) {
      let errorMessage = 'Failed to create contract: '
      if (e instanceof Error) {
        errorMessage += e.message
      } else {
        errorMessage += 'An unexpected error occurred.'
      }
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  const handleConfirmTransaction = async () => {
    if (!pendingTxb) return;
    setConfirming(true);
    try {
      const result = await signAndExecuteTransaction({ transaction: pendingTxb });
      if (!result.digest) {
        toast.error('Transaction succeeded but no digest was returned');
        setConfirming(false);
        setShowConfirmModal(false);
        return;
      }
      const txn = await suiClient.waitForTransaction({
        digest: result.digest,
        options: { showEffects: true },
      });
      let createdObjectId = '';
      if (txn.effects && txn.effects.created && txn.effects?.created?.length > 0) {
        createdObjectId = txn.effects?.created[0]?.reference.objectId;
      }
      if (!createdObjectId) {
        toast.error('Transaction succeeded but no object ID was returned');
        setConfirming(false);
        setShowConfirmModal(false);
        return;
      }
      toast.success('Contract created successfully!');
      localStorage.removeItem('contractDrafts');
      localStorage.removeItem('currentDraftId');
      navigate(`/contract/${createdObjectId}`);
      setTitle(undefined);
      setSuiPartyBAddress(undefined);
      setContractType(undefined);
      setTermsReference(undefined);
      setStartDate(undefined);
      setEndDate(undefined);
      setMetadata(undefined);
    } catch (e: unknown) {
      let errorMessage = 'Failed to create contract: ';
      if (e instanceof Error) {
        errorMessage += e.message;
      } else {
        errorMessage += 'An unexpected error occurred.';
      }
      toast.error(errorMessage);
    } finally {
      setConfirming(false);
      setShowConfirmModal(false);
    }
  }

  const saveDraft = () => {
    try {
      const existingDraftsJSON = localStorage.getItem('contractDrafts')
      const existingDrafts = existingDraftsJSON ? JSON.parse(existingDraftsJSON) : []
      
      const newDraft = {
        id: Date.now().toString(), 
        createdAt: new Date().toISOString(),
        title: title || 'Untitled Draft',
        data: {
          title,
          suiPartyBAddress,
          contractType,
          termsReference,
          metadata,
          startDate: startDate ? startDate.toISOString() : undefined,
          endDate: endDate ? endDate.toISOString() : undefined,
          milestones,
        }
      }
      
      const updatedDrafts = [newDraft, ...existingDrafts]
      
      localStorage.setItem('contractDrafts', JSON.stringify(updatedDrafts))
      
      localStorage.setItem('currentDraftId', newDraft.id)
      
      toast.success('Draft saved successfully!', {
        description: `Saved as "${newDraft.title}"`,
      })
    } catch (error) {
      toast.error('Failed to save draft.')
      console.error('Error saving draft:', error)
    }
  }

  const loadDraftById = (draftId: string) => {
    setShowDraftMenu(false)
    loadDraft(draftId)
  }
  
  const handleLoadDraftClick = () => {
    if (drafts.length === 1) {
      loadDraft(drafts[0].id)
      return
    }
    
    setShowDraftMenu(!showDraftMenu)
  }
  
  const deleteDraft = (draftId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent the draft from being loaded
    
    try {
      const draftsJSON = localStorage.getItem('contractDrafts')
      if (!draftsJSON) return
      
      const existingDrafts = JSON.parse(draftsJSON)
      const updatedDrafts = existingDrafts.filter((draft: any) => draft.id !== draftId)
      
      localStorage.setItem('contractDrafts', JSON.stringify(updatedDrafts))
      setDrafts(updatedDrafts)
      
      const currentId = localStorage.getItem('currentDraftId')
      if (currentId === draftId) {
        localStorage.removeItem('currentDraftId')
      }
      
      toast.success('Draft deleted successfully')
    } catch (error) {
      toast.error('Failed to delete draft')
      console.error('Error deleting draft:', error)
    }
  }
  
  const loadDraft = (draftId?: string) => {
    try {
      const draftsJSON = localStorage.getItem('contractDrafts')
      if (!draftsJSON) {
        toast.info('No saved drafts found')
        return
      }
      
      const drafts = JSON.parse(draftsJSON)
      if (!drafts.length) {
        toast.info('No saved drafts found')
        return
      }
      
      if (!draftId) {
        const currentId = localStorage.getItem('currentDraftId')
        draftId = currentId || drafts[0].id
      }
      
      // Find the draft by ID
      const selectedDraft = drafts.find((draft: any) => draft.id === draftId)
      if (!selectedDraft) {
        toast.error('Draft not found')
        return
      }
      
      localStorage.setItem('currentDraftId', selectedDraft.id)
      
      const parsedDraft = selectedDraft.data
      
      const updates: {[key: string]: any} = {
        title: parsedDraft.title || undefined,
        suiPartyBAddress: parsedDraft.suiPartyBAddress || undefined,
        contractType: parsedDraft.contractType,
        termsReference: parsedDraft.termsReference || undefined,
        metadata: parsedDraft.metadata || undefined,
        startDate: undefined,
        endDate: undefined,
        milestones: parsedDraft.milestones || []
      };
      
      if (parsedDraft.startDate) {
        updates.startDate = new Date(parsedDraft.startDate);
      }
      if (parsedDraft.endDate) {
        updates.endDate = new Date(parsedDraft.endDate);
      }
      
      setTitle(undefined);
      setSuiPartyBAddress(undefined);
      setContractType(undefined);
      setTermsReference(undefined);
      setMetadata(undefined);
      setStartDate(undefined);
      setEndDate(undefined);
      setMilestones([]);
      
      setTitle(updates.title);
      setSuiPartyBAddress(updates.suiPartyBAddress);
      setContractType(updates.contractType);
      setTermsReference(updates.termsReference);
      setMetadata(updates.metadata);
      setStartDate(updates.startDate);
      setEndDate(updates.endDate);
      if (updates.milestones) setMilestones(updates.milestones);
      
      setTimeout(() => {
        updateCompletedSteps();
        toast.success('Draft loaded successfully!', {
          description: `Loaded "${selectedDraft.title}" (${new Date(selectedDraft.createdAt).toLocaleString()})`,
          duration: 3000,
        });
      }, 0);
      
      // Scroll to top of the form
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      return selectedDraft
    } catch (error) {
      toast.error('Failed to load draft.')
      console.error('Error loading draft:', error)
    }
  }

  const totalWeight = weightedSteps.reduce((sum, step) => sum + step.weight, 0)
  const completedWeight = weightedSteps
    .filter((step) => completedSteps.includes(step.id))
    .reduce((sum, step) => sum + step.weight, 0)
  const completionPercentage = Math.round((completedWeight / totalWeight) * 100)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setContractFile(file)
    setUploading(true)
    try {
      // TODO: Replace with actual Sui Walrus upload logic
      await new Promise((res) => setTimeout(res, 1200))
      setContractFileUrl('suiwalrus://mock-file-id')
      toast.success('File uploaded (mock)!')
    } catch (err) {
      toast.error('File upload failed')
      setContractFileUrl(undefined)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative bg-gradient-to-br from-[#0a1836] via-[#0d2047] to-[#101c3a] min-h-screen rounded-2xl shadow-2xl border border-blue-900/40 p-2 md:p-8">
      <motion.h1
        className="text-2xl md:text-4xl font-light tracking-tight mb-6 text-center mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
          Smart Contract Agreement
        </span>
      </motion.h1>
      {/* Progress bar and step indicators */}
      <div className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-md py-3 mb-8 rounded-lg border border-blue-500/20 shadow-lg">
        <div className="mb-2 flex justify-between items-center px-4">
          <h3 className="text-blue-300 text-sm font-medium">
            Contract Creation Progress
          </h3>
          <span className="text-blue-400 text-sm font-semibold">
            {completionPercentage}% Complete
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mx-auto px-0">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        {/* Step indicators (no numbers, only show required for title) */}
        <div className="flex justify-between mt-4 px-4 overflow-x-auto pb-2 hide-scrollbar">
          {formSteps.map((step) => (
            <div
              key={step.id}
              className="flex flex-col items-center mx-1 min-w-[60px] px-1"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all duration-300 ${
                  completedSteps.includes(step.id)
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                    : step.id === 'title'
                      ? 'bg-gray-800 text-gray-400 border border-red-500/50'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                <span>{step.icon}</span>
              </div>
              <span
                className={`text-xs truncate max-w-[80px] text-center ${
                  completedSteps.includes(step.id)
                    ? 'text-blue-300'
                    : step.id === 'title'
                      ? 'text-red-300/70'
                      : 'text-gray-500'
                }`}
              >
                {step.label}{' '}
                {step.id === 'title' && (
                  <span className="text-red-400 text-xs">*</span>
                )}
              </span>
            </div>
          ))}
        </div>{' '}
      </div>
      {/* Required fields legend (only for title) */}
      <div className="mb-6 bg-slate-800/50 p-3 rounded-lg border border-blue-500/10 text-blue-300/90 text-sm flex items-center">
        <span className="text-red-400 mr-1 text-lg">*</span> Only the contract
        title is required
      </div>
      
      {/* Draft management banner */}
      {mode === 'create' && drafts.length > 0 && (
        <motion.div 
          className="mb-6 bg-gradient-to-r from-slate-800 to-slate-700 p-4 rounded-lg border border-emerald-500/20 shadow-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-emerald-400 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </span>
              <h3 className="text-emerald-300 font-medium">Saved Drafts ({drafts.length})</h3>
            </div>
            
            <Button
              onClick={() => setShowDraftMenu(!showDraftMenu)}
              className="bg-emerald-700/50 hover:bg-emerald-700/70 border border-emerald-600/50 text-emerald-100 text-xs px-3 py-1 rounded-md"
            >
              {showDraftMenu ? "Hide Drafts" : "View Drafts"}
            </Button>
          </div>
          
          {/* Draft list */}
          {showDraftMenu && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pt-2 border-t border-slate-600/50">
              {drafts.map((draft) => (
                <div 
                  key={draft.id}
                  className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-md cursor-pointer flex justify-between items-center"
                  onClick={() => loadDraftById(draft.id)}
                >
                  <div className="overflow-hidden">
                    <div className="font-medium text-blue-300 truncate">
                      {draft.title || "Untitled Draft"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(draft.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-800/30 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadDraftById(draft.id);
                      }}
                      title="Load this draft"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    <button 
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-800/30 rounded-full"
                      onClick={(e) => deleteDraft(draft.id, e)}
                      title="Delete this draft"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
        
      )}
      
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Agreement Title */}
        <motion.div variants={itemVariants} className="mb-4">
          <FormSection title="Agreement Title" required={true}>
            <div className="relative">
              <div className="relative flex items-center">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-lg flex items-center justify-center">
                  📝
                </span>
                <Input
                  ref={titleRef}
                  placeholder="e.g., Q1 Marketing Campaign, Logo Design Services"
                  className={`bg-slate-800/40 border-blue-500/30 text-white pl-10 py-3 text-lg rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-600/30 ${(!title || title.length <= 5) && title !== undefined ? 'border-amber-400' : ''}`}
                  value={title ?? ''}
                  onChange={handleTitleChange}
                  required
                  disabled={disableTitle}
                />
              </div>
              <div className="text-xs text-blue-300 mt-1 ml-1">
                Give your contract a clear, descriptive name.
              </div>
              {title && title.length > 5 && (
                <div className="mt-2 text-xs text-green-400 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Looks good!
                </div>
              )}
              {(!title || title.length <= 5) && title !== undefined && (
                <div className="mt-2 text-xs text-amber-400 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Please enter a descriptive title (min 6 characters)
                </div>
              )}
            </div>
          </FormSection>
        </motion.div>
        {/* File Upload Section */}
        <motion.div variants={itemVariants} className="mb-4">
          <FormSection
            title="Upload Contract File"
            subtitle="(Optional, stored on Sui Walrus)"
          >
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-300 mb-1 ml-1">
                Contract File (PDF, DOCX, etc.)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                className="block w-full text-sm text-blue-200 bg-slate-800/40 border border-blue-500/30 rounded-lg p-2 file:bg-blue-700 file:text-white file:rounded file:px-4 file:py-2 file:mr-4 opacity-60 cursor-not-allowed"
                disabled
              />
              <div className="text-blue-400 text-xs mt-1">
                Coming soon: Upload contract files to Sui Walrus
              </div>
            </div>
          </FormSection>
        </motion.div>
        {/* Agreement Type */}
        <motion.div variants={itemVariants} className="mb-4">
          <FormSection title="Type of Agreement">
            <div className="space-y-2">
              <AgreementType
                selectedType={contractType}
                onSelectType={handleContractTypeChange}
              />
              <div className="text-xs text-blue-300 mt-1 ml-1">
                Choose the type that best describes your agreement.
              </div>
            </div>
          </FormSection>
        </motion.div>
        {/* Parties Involved */}
        <motion.div variants={itemVariants} className="mb-4">
          <FormSection
            title="Parties Involved"
            subtitle="You (Party A - Initiator)"
          >
            <div className="space-y-2">
              <PartyInformation
                partyAAddress={address}
                partyBAddress={suiPartyBAddress}
                onPartyBAddressChange={handlePartyBAddressChange}
              />
              <div className="text-xs text-blue-300 mt-1 ml-1">
                Enter the Sui address of the other party.
              </div>
            </div>
          </FormSection>
        </motion.div>
        {/* Key Terms & Dates */}
        <motion.div variants={itemVariants} className="mb-4">
          <FormSection
            title="Key Terms & Dates"
            subtitle="Key Contract Terms / Summary"
          >
            <div className="space-y-2">
              <ContractTerms
                startDate={startDate}
                endDate={endDate}
                setStartDate={handleStartDateChange}
                setEndDate={handleEndDateChange}
                onTermsReferenceChange={handleTermsReferenceChange}
                termsReference={termsReference}
              />
              <div className="text-xs text-blue-300 mt-1 ml-1">
                Summarize the main terms and set the contract period.
              </div>
            </div>
          </FormSection>
        </motion.div>
        {/* Escrow & Payment */}
        <motion.div variants={itemVariants} className="mb-4">
          <FormSection title="Escrow & Payment">
            <EscrowPayment useChainIcon={true} chainIcon={escrowChainIcon} />
          </FormSection>
        </motion.div>
        {/* Milestones */}
        <motion.div variants={itemVariants} className="mb-4">
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
            <div className="text-xs text-blue-300 mt-1 ml-1">
              Break down the contract into milestones for staged payments
              (optional).
            </div>
          </FormSection>
        </motion.div>
        {/* Additional Information */}
        <motion.div variants={itemVariants} className="mb-4">
          <FormSection
            title="Additional Information"
            subtitle="Metadata / Links (Optional)"
          >
            <AdditionalInformation
              onMetadataChange={handleMetadataChange}
              metaData={metadata ?? ''}
            />
            <div className="text-xs text-blue-300 mt-1 ml-1">
              Add any extra notes, links, or metadata (optional).
            </div>
          </FormSection>
        </motion.div>
        {/* Action buttons */}
        <motion.div
          className="flex justify-center items-center gap-4 pt-4 pb-4 mt-8 sticky bottom-4 from-transparent px-4 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          {/* Draft management buttons */}
          {mode === 'create' && (
            <div className="flex gap-2">
              {/* Draft management with dropdown */}
              <div className="relative" ref={draftMenuRef}>
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    onClick={handleLoadDraftClick}
                    type="button"
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-6 text-lg font-medium shadow-lg shadow-emerald-900/20 rounded-2xl border-2 border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/30 transition-all duration-200 flex items-center"
                  >
                    <span className="mr-2">Load Draft</span>
                    {drafts.length > 0 && (
                      <span className="bg-white text-emerald-700 rounded-full text-xs w-5 h-5 flex items-center justify-center">
                        {drafts.length}
                      </span>
                    )}
                  </Button>
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-600/10 to-emerald-700/10 blur-lg rounded-2xl"></div>
                </motion.div>
                
                {/* Drafts dropdown menu */}
                {showDraftMenu && drafts.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-72 max-h-64 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                    <div className="p-2 text-slate-300 text-sm font-semibold border-b border-slate-700">
                      Select a draft to load
                    </div>
                    {drafts.map((draft) => (
                      <div 
                        key={draft.id}
                        className="p-3 hover:bg-slate-700 border-b border-slate-700 last:border-b-0 cursor-pointer transition-colors flex justify-between items-center"
                        onClick={() => loadDraftById(draft.id)}
                      >
                        <div>
                          <div className="text-blue-300 font-medium truncate w-48">
                            {draft.title || "Untitled Draft"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(draft.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <button 
                          className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-red-900/20"
                          onClick={(e) => deleteDraft(draft.id, e)}
                          title="Delete draft"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Save Draft button */}
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  onClick={saveDraft}
                  type="button"
                  className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-6 text-lg font-medium shadow-lg shadow-slate-900/20 rounded-2xl border-2 border-slate-500/40 focus:ring-4 focus:ring-slate-500/30 transition-all duration-200"
                >
                  Save Draft
                </Button>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-600/10 to-slate-700/10 blur-lg rounded-2xl"></div>
              </motion.div>
            </div>
          )}
          
          {/* Create/Update button */}
          <motion.div
            className="relative"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button
              onClick={handleSubmit}
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-12 py-6 text-xl font-bold shadow-lg shadow-blue-900/20 rounded-2xl border-2 border-blue-500/40 focus:ring-4 focus:ring-blue-500/30 transition-all duration-200"
              disabled={loading}
            >
              {loading
                ? (mode === 'update' ? 'Updating...' : 'Creating...')
                : (mode === 'update' ? 'Update Contract' : 'Create Contract')}
            </Button>
            {/* Glow effect */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-600/20 to-indigo-700/20 blur-lg rounded-2xl"></div>
          </motion.div>
        </motion.div>
        {/* Tips section */}
        <div className="bg-slate-800/30 p-4 rounded-lg border border-blue-500/10 mt-8">
          <h4 className="text-blue-300 font-medium flex items-center">
            <span className="mr-2">💡</span> Tips for Creating Contracts
          </h4>
          <ul className="list-disc list-inside text-slate-400 text-sm mt-2 space-y-1">
            <li>
              All fields marked with <span className="text-red-400">*</span> are
              required
            </li>
            <li>Use "Save Draft" to save multiple versions of your contract</li>
            <li>Use "Load Draft" to select and continue working on a previously saved version</li>
            <li>Be specific and clear with your agreement title and terms</li>
            <li>Include all relevant dates and deadlines</li>
            <li>Specify milestones for complex agreements to track progress</li>
            <li>Review all details before creating the contract</li>
          </ul>
        </div>
      </motion.div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setPendingTxb(null); }}
        onConfirm={handleConfirmTransaction}
        title="Confirm Contract Creation"
        isLoading={gasLoading}
        isConfirming={confirming}
        estimatedGas={estimatedGas}
        gasCalculationError={gasError}
        currentBalance={currentBalance}
      >
        <div>
          <p className="mb-2">You are about to create a new contract. Please review the estimated transaction fee below before confirming.</p>
          {title && <p><span className="font-semibold">Title:</span> {title}</p>}
          {suiPartyBAddress && <p><span className="font-semibold">Party B:</span> {suiPartyBAddress}</p>}
          {contractType !== undefined && <p><span className="font-semibold">Type:</span> {contractType}</p>}
        </div>
      </ConfirmationModal>
    </div>
  )
}

export default ContractForm
