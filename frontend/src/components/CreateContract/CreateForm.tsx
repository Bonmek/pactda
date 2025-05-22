import React, { useState, useEffect, useCallback, useRef } from 'react' // Added useRef here
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { contractTemplates, ContractTemplate } from '../../../config/contractTemplates'
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
// import solanaLogo from './chain-logos/solana.svg'; // Solana not used currently
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

const DRAFT_CONTRACT_KEY = 'pactDaAutoSavedContractDraft'; // Local storage key for auto-saved draft

const ContractForm: React.FC<ContractFormProps> = ({
  initialValues = {},
  onSubmit, // This prop is not used in the current implementation for form submission
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
  
  // Form state variables
  const [title, setTitle] = useState<string | undefined>(initialValues.title)
  const [suiPartyBAddress, setSuiPartyBAddress] = useState<string | undefined>(initialValues.suiPartyBAddress)
  const [contractType, setContractType] = useState<number | undefined>(initialValues.contractType)
  const [termsReference, setTermsReference] = useState<string | undefined>(initialValues.termsReference)
  const [metadata, setMetadata] = useState<string | undefined>(initialValues.metadata)
  const [startDate, setStartDate] = useState<Date | undefined>(initialValues.contractStartDate)
  const [endDate, setEndDate] = useState<Date | undefined>(initialValues.contractDeadlineDate)
  const [milestones, setMilestones] = useState<Milestone[]>(initialValues.milestones || [])
  
  const [contractFile, setContractFile] = useState<File | null>(null) // Not part of auto-save for now
  const [contractFileUrl, setContractFileUrl] = useState<string | undefined>() // Not part of auto-save
  const [uploading, setUploading] = useState(false) // Not part of auto-save
  
  const titleRef = useRef<HTMLInputElement>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // Named drafts feature state
  const [drafts, setDrafts] = useState<any[]>([])
  const [showDraftMenu, setShowDraftMenu] = useState(false)
  const draftMenuRef = useRef<HTMLDivElement>(null)

  const escrowChainIcon = suiLogo

  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  // Load auto-saved draft from local storage on initial mount if in 'create' mode
  useEffect(() => {
    if (mode === 'create') {
      try {
        const autoSavedDraftJSON = localStorage.getItem(DRAFT_CONTRACT_KEY);
        if (autoSavedDraftJSON) {
          const autoSavedDraft = JSON.parse(autoSavedDraftJSON);
          if (autoSavedDraft && Object.keys(autoSavedDraft).length > 0) {
            setTitle(autoSavedDraft.title || undefined);
            setSuiPartyBAddress(autoSavedDraft.suiPartyBAddress || undefined);
            setContractType(autoSavedDraft.contractType !== undefined ? autoSavedDraft.contractType : undefined);
            setTermsReference(autoSavedDraft.termsReference || undefined);
            setMetadata(autoSavedDraft.metadata || undefined);
            setStartDate(autoSavedDraft.startDate ? new Date(autoSavedDraft.startDate) : undefined);
            setEndDate(autoSavedDraft.endDate ? new Date(autoSavedDraft.endDate) : undefined);
            setMilestones(autoSavedDraft.milestones || []);
            setSelectedTemplateId(autoSavedDraft.selectedTemplateId || '');
            toast.info('Unsaved draft loaded from your last session.', { duration: 3000 });
          }
        }
      } catch (error) {
        console.error('Error loading auto-saved draft from local storage:', error);
        // localStorage.removeItem(DRAFT_CONTRACT_KEY); // Optional: Clear potentially corrupted data
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]); // Only run on initial mount for 'create' mode

  // Save form state to local storage whenever relevant fields change, only in 'create' mode
  useEffect(() => {
    if (mode === 'create') {
      const draftData = {
        title,
        suiPartyBAddress,
        contractType,
        termsReference,
        metadata,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        milestones,
        selectedTemplateId,
      };
      
      const hasDataToSave = Object.values(draftData).some(value => {
        if (value === undefined || value === null) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'string') return value.trim() !== '';
        return true;
      });

      if (hasDataToSave) {
        localStorage.setItem(DRAFT_CONTRACT_KEY, JSON.stringify(draftData));
      } else {
        // If form is effectively empty, remove the auto-saved draft
        localStorage.removeItem(DRAFT_CONTRACT_KEY);
      }
    }
  }, [title, suiPartyBAddress, contractType, termsReference, metadata, startDate, endDate, milestones, selectedTemplateId, mode]);


  const updateCompletedSteps = useCallback(() => {
    const completed = []
    if (title && title.length > 3) completed.push('title')
    if (contractType !== undefined) completed.push('type')
    if (address && (suiPartyBAddress || suiPartyBAddress === '')) completed.push('parties')
    if (termsReference || (startDate && endDate)) completed.push('terms')
    completed.push('payment') // Assuming payment section is always "complete" for now
    if (milestones.length > 0 && milestones.some((m) => m.title && m.value)) completed.push('milestones')
    if (metadata) completed.push('additional')

    if (JSON.stringify(completed) !== JSON.stringify(completedSteps)) {
      setCompletedSteps(completed)
    }
  }, [title, contractType, address, suiPartyBAddress, termsReference, startDate, endDate, milestones, metadata, completedSteps]);


  useEffect(() => {
    updateCompletedSteps();
  }, [updateCompletedSteps]);


  // Load named drafts (existing feature)
  useEffect(() => {
    if (mode === 'create') { // Also ensure named drafts are only loaded for create mode initially
      try {
        const draftsJSON = localStorage.getItem('contractDrafts')
        if (draftsJSON) {
          const loadedDrafts = JSON.parse(draftsJSON)
          setDrafts(loadedDrafts)
        }
      } catch (error) {
        console.error('Error loading named drafts list:', error)
      }
    }
  }, [mode]); 
  
  // Click outside handler for named drafts menu
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
      { id: Date.now().toString(), title: '', description: '', value: '' },
    ])
  }

  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter((milestone) => milestone.id !== id))
  }

  const updateMilestone = (id: string, field: keyof Milestone, value: string) => {
    setMilestones(
      milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, [field]: value } : milestone,
      ),
    )
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value.length === 0 ? undefined : e.target.value)
  }

  const handlePartyBAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSuiPartyBAddress(e.target.value.length === 0 ? undefined : e.target.value)
  }
  const handleContractTypeChange = (value?: number) => {
    setContractType(value)
  }
  const handleTermsReferenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTermsReference(e.target.value.length === 0 ? undefined : e.target.value)
  }
  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMetadata(e.target.value.length === 0 ? undefined : e.target.value)
  }
  const handleStartDateChange = (date?: Date) => {
    setStartDate(date === undefined ? undefined : date)
  }
  const handleEndDateChange = (date?: Date) => {
    setEndDate(date === undefined ? undefined : date)
  }

  // Modal and gas states
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
        } catch (e) { setCurrentBalance(null); } finally { setBalanceLoading(false); }
      } else { setCurrentBalance(null); }
    };
    fetchBalance();
  }, [address, suiClient]);

  const handleSubmit = async () => {
    try {
      if (!currentAccount) { toast.error('Please connect your Sui wallet.'); return; }
      if (!title) {
        toast.error('Title is required.');
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleRef.current?.focus();
        return;
      }
      if (suiPartyBAddress && suiPartyBAddress.trim() !== '' && !/^0x[a-fA-F0-9]{64}$/.test(suiPartyBAddress)) {
        toast.error("Party B's Sui Address is invalid. It must be a 64-character hex string starting with 0x, or left empty.");
        return;
      }
      if (contractType !== undefined && (contractType < 0 || contractType > 255)) {
        toast.error('Please select a contract type.'); return;
      }
      if (termsReference && termsReference.trim() !== '' && /[^ -~]/.test(termsReference)) {
        toast.error('Terms Reference contains non-ASCII characters. Please use only ASCII characters.'); return;
      }
      if (termsReference && termsReference.length > 1000) {
        toast.error('Terms Reference is too long. Max 1000 characters.'); return;
      }
      if (metadata && metadata.trim() !== '' && /[^ -~]/.test(metadata)) {
        toast.error('Metadata contains non-ASCII characters. Please use only ASCII characters.'); return;
      }
      if (metadata && metadata.length > 1000) {
        toast.error('Metadata is too long. Max 1000 characters.'); return;
      }
      const startDateTimestamp = startDate ? Math.floor(startDate.getTime() / 1000) : undefined;
      const endDateTimestamp = endDate ? Math.floor(endDate.getTime() / 1000) : undefined;
      if (startDateTimestamp && isNaN(startDateTimestamp)) { toast.error('Invalid Start Date.'); return; }
      if (endDateTimestamp && isNaN(endDateTimestamp)) { toast.error('Invalid End Date.'); return; }
      if (startDateTimestamp && endDateTimestamp && startDateTimestamp >= endDateTimestamp) {
        toast.error('Start Date must be before End Date.'); return;
      }

      setLoading(true);
      const cleanPartyBAddress = suiPartyBAddress && suiPartyBAddress.trim() !== '' ? suiPartyBAddress : undefined;
      const cleanTermsReference = termsReference && termsReference.trim() !== '' ? termsReference : undefined;
      const cleanMetadata = metadata && metadata.trim() !== '' ? metadata : undefined;

      const txb = buildCreateContractTx(
        title!, cleanPartyBAddress, contractType, cleanTermsReference,
        startDateTimestamp, endDateTimestamp, cleanMetadata,
      );
      if (address) txb.setSenderIfNotSet(address);
      
      setGasLoading(true); setGasError(null); setEstimatedGas(null);
      setPendingTxb(txb); setShowConfirmModal(true);

      try {
        const dryRunBytes = await txb.build({ client: suiClient });
        const dryRunResult = await suiClient.dryRunTransactionBlock({ transactionBlock: dryRunBytes });
        if (dryRunResult.effects && dryRunResult.effects.gasUsed) {
          const { computationCost, storageCost, storageRebate } = dryRunResult.effects.gasUsed;
          const totalMist = BigInt(computationCost) + BigInt(storageCost) - BigInt(storageRebate);
          setEstimatedGas(`${(Number(totalMist) / 1e9).toFixed(6)} SUI`);
        } else { setEstimatedGas(null); setGasError('Could not estimate gas.'); }
      } catch (err) { setGasError('Failed to estimate gas.'); setEstimatedGas(null); } 
      finally { setGasLoading(false); setLoading(false); }
    } catch (e: unknown) {
      toast.error(`Failed to prepare contract: ${e instanceof Error ? e.message : 'An unexpected error occurred.'}`);
      setLoading(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!pendingTxb) return;
    setConfirming(true);
    try {
      const result = await signAndExecuteTransaction({ transaction: pendingTxb });
      if (!result.digest) {
        toast.error('Transaction succeeded but no digest was returned');
        setConfirming(false); setShowConfirmModal(false); return;
      }
      const txn = await suiClient.waitForTransaction({ digest: result.digest, options: { showEffects: true } });
      let createdObjectId = '';
      if (txn.effects && txn.effects.created && txn.effects?.created?.length > 0) {
        createdObjectId = txn.effects?.created[0]?.reference.objectId;
      }
      if (!createdObjectId) {
        toast.error('Transaction succeeded but no object ID was returned');
        setConfirming(false); setShowConfirmModal(false); return;
      }
      toast.success('Contract created successfully!');
      
      // Clear drafts
      localStorage.removeItem('contractDrafts'); // Named drafts
      localStorage.removeItem('currentDraftId'); // Current named draft ID
      if (mode === 'create') {
        localStorage.removeItem(DRAFT_CONTRACT_KEY); // Auto-saved draft
      }

      navigate(`/contract/${createdObjectId}`);
      // Reset form state
      setTitle(undefined); setSuiPartyBAddress(undefined); setContractType(undefined);
      setTermsReference(undefined); setStartDate(undefined); setEndDate(undefined);
      setMetadata(undefined); setMilestones([]); setSelectedTemplateId('');
    } catch (e: unknown) {
      toast.error(`Failed to create contract: ${e instanceof Error ? e.message : 'An unexpected error occurred.'}`);
    } finally {
      setConfirming(false); setShowConfirmModal(false);
    }
  };

  const saveDraft = () => { // For named drafts feature
    try {
      const existingDraftsJSON = localStorage.getItem('contractDrafts')
      const existingDrafts = existingDraftsJSON ? JSON.parse(existingDraftsJSON) : []
      const newDraft = {
        id: Date.now().toString(), createdAt: new Date().toISOString(),
        title: title || 'Untitled Draft',
        data: {
          title, suiPartyBAddress, contractType, termsReference, metadata,
          startDate: startDate ? startDate.toISOString() : undefined,
          endDate: endDate ? endDate.toISOString() : undefined,
          milestones, selectedTemplateId, // Include selectedTemplateId in named drafts too
        }
      }
      const updatedDrafts = [newDraft, ...existingDrafts]
      localStorage.setItem('contractDrafts', JSON.stringify(updatedDrafts))
      localStorage.setItem('currentDraftId', newDraft.id)
      setDrafts(updatedDrafts); // Update state for named drafts UI
      toast.success('Draft saved successfully!', { description: `Saved as "${newDraft.title}"` })
    } catch (error) {
      toast.error('Failed to save draft.'); console.error('Error saving draft:', error)
    }
  }

  const loadDraftById = (draftId: string) => { // For named drafts feature
    setShowDraftMenu(false); loadDraft(draftId);
  }
  
  const handleLoadDraftClick = () => { // For named drafts feature
    if (drafts.length === 1) { loadDraft(drafts[0].id); return; }
    setShowDraftMenu(!showDraftMenu);
  }
  
  const deleteDraft = (draftId: string, event: React.MouseEvent) => { // For named drafts feature
    event.stopPropagation();
    try {
      const draftsJSON = localStorage.getItem('contractDrafts'); if (!draftsJSON) return;
      const existingDrafts = JSON.parse(draftsJSON);
      const updatedDrafts = existingDrafts.filter((draft: any) => draft.id !== draftId);
      localStorage.setItem('contractDrafts', JSON.stringify(updatedDrafts));
      setDrafts(updatedDrafts);
      const currentId = localStorage.getItem('currentDraftId');
      if (currentId === draftId) localStorage.removeItem('currentDraftId');
      toast.success('Draft deleted successfully');
    } catch (error) { toast.error('Failed to delete draft'); console.error('Error deleting draft:', error); }
  }
  
  const loadDraft = (draftId?: string) => { // For named drafts feature
    try {
      const draftsJSON = localStorage.getItem('contractDrafts'); if (!draftsJSON) { toast.info('No saved drafts found'); return; }
      const loadedDrafts = JSON.parse(draftsJSON); if (!loadedDrafts.length) { toast.info('No saved drafts found'); return; }
      if (!draftId) { const currentId = localStorage.getItem('currentDraftId'); draftId = currentId || loadedDrafts[0].id; }
      const selectedDraft = loadedDrafts.find((d: any) => d.id === draftId); if (!selectedDraft) { toast.error('Draft not found'); return; }
      
      localStorage.setItem('currentDraftId', selectedDraft.id);
      const parsedData = selectedDraft.data;
      
      setTitle(parsedData.title || undefined);
      setSuiPartyBAddress(parsedData.suiPartyBAddress || undefined);
      setContractType(parsedData.contractType !== undefined ? parsedData.contractType : undefined);
      setTermsReference(parsedData.termsReference || undefined);
      setMetadata(parsedData.metadata || undefined);
      setStartDate(parsedData.startDate ? new Date(parsedData.startDate) : undefined);
      setEndDate(parsedData.endDate ? new Date(parsedData.endDate) : undefined);
      setMilestones(parsedData.milestones || []);
      setSelectedTemplateId(parsedData.selectedTemplateId || ''); // Load template ID from named draft

      // Also update the auto-saved draft with the content of the loaded named draft
      if (mode === 'create') {
          localStorage.setItem(DRAFT_CONTRACT_KEY, JSON.stringify(parsedData));
      }

      setTimeout(() => {
        updateCompletedSteps();
        toast.success('Draft loaded successfully!', { description: `Loaded "${selectedDraft.title}" (${new Date(selectedDraft.createdAt).toLocaleString()})`, duration: 3000 });
      }, 0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return selectedDraft;
    } catch (error) { toast.error('Failed to load draft.'); console.error('Error loading draft:', error); }
  }

  const totalWeight = weightedSteps.reduce((sum, step) => sum + step.weight, 0)
  const completedWeight = weightedSteps.filter((step) => completedSteps.includes(step.id)).reduce((sum, step) => sum + step.weight, 0)
  const completionPercentage = Math.round((completedWeight / totalWeight) * 100)

  const handleTemplateChange = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);

    if (!templateId || templateId === "none") {
      setTitle(initialValues.title || undefined);
      setSuiPartyBAddress(initialValues.suiPartyBAddress || undefined);
      setContractType(initialValues.contractType || undefined);
      setTermsReference(initialValues.termsReference || undefined);
      setMetadata(initialValues.metadata || undefined);
      setStartDate(initialValues.contractStartDate || undefined);
      setEndDate(initialValues.contractDeadlineDate || undefined);
      setMilestones(initialValues.milestones || []);
      if (mode === 'create') {
        localStorage.removeItem(DRAFT_CONTRACT_KEY); // Clear auto-saved draft
      }
      toast.info('Form cleared to custom agreement.');
      return;
    }

    const template = contractTemplates.find(t => t.id === templateId);
    if (template) {
      setTitle(template.contractDetails.title || initialValues.title || undefined);
      setSuiPartyBAddress(template.contractDetails.partyBAddress || initialValues.suiPartyBAddress || undefined);
      setContractType(template.contractDetails.contractType !== undefined ? template.contractDetails.contractType : initialValues.contractType);
      setTermsReference(template.contractDetails.termsReference || initialValues.termsReference || undefined);
      setMetadata(template.contractDetails.metadata || initialValues.metadata || undefined);
      setStartDate(initialValues.contractStartDate || undefined); // Templates don't set dates
      setEndDate(initialValues.contractDeadlineDate || undefined);  // Templates don't set dates
      if (template.milestones) {
        setMilestones(template.milestones.map(m => ({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          title: m.description, description: '', value: m.amount.toString(),
        })));
      } else { setMilestones(initialValues.milestones || []); }
      toast.success(`Template "${template.name}" applied.`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues, mode]); // Added mode to dependencies

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setContractFile(file); setUploading(true);
    try {
      await new Promise((res) => setTimeout(res, 1200)); // Mock upload
      setContractFileUrl('suiwalrus://mock-file-id'); toast.success('File uploaded (mock)!');
    } catch (err) { toast.error('File upload failed'); setContractFileUrl(undefined); } 
    finally { setUploading(false); }
  }

  return (
    <div className="relative bg-gradient-to-br from-[#0a1836] via-[#0d2047] to-[#101c3a] min-h-screen rounded-2xl shadow-2xl border border-blue-900/40 p-2 md:p-8">
      <motion.h1 /* ... existing JSX ... */ >
        <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
          Smart Contract Agreement
        </span>
      </motion.h1>
      
      <div className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-md py-3 mb-8 rounded-lg border border-blue-500/20 shadow-lg">
        {/* ... existing progress bar and step indicators JSX ... */}
        <div className="mb-2 flex justify-between items-center px-4">
          <h3 className="text-blue-300 text-sm font-medium">
            Contract Creation Progress
          </h3>
          <span className="text-blue-400 text-sm font-semibold">
            {completionPercentage}% Complete
          </span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mx-auto px-0">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
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
      
      <div className="mb-6 bg-slate-800/50 p-3 rounded-lg border border-blue-500/10 text-blue-300/90 text-sm flex items-center">
        {/* ... existing required fields legend ... */}
        <span className="text-red-400 mr-1 text-lg">*</span> Only the contract
        title is required
      </div>
      
      {mode === 'create' && drafts.length > 0 && (
        <motion.div /* ... existing named drafts banner JSX ... */ 
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
          {showDraftMenu && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pt-2 border-t border-slate-600/50">
              {/* ... existing named drafts list rendering ... */}
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
        {mode === 'create' && (
          <motion.div variants={itemVariants} className="mb-8">
            {/* ... existing template selector JSX ... */}
            <FormSection title="Start with a Template" subtitle="(Optional)">
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger className="w-full bg-slate-800/40 border-blue-500/30 text-white py-3 text-lg rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-600/30">
                  <SelectValue placeholder="Select a template or start custom" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="none" className="hover:bg-slate-700 focus:bg-slate-700">
                    -- Start Custom / Clear Form --
                  </SelectItem>
                  {contractTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id} className="hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-slate-400 mt-1">{template.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-blue-300 mt-1 ml-1">
                Selecting a template will pre-fill relevant fields. You can modify them afterwards.
              </div>
            </FormSection>
          </motion.div>
        )}

        {/* Agreement Title */}
        <motion.div variants={itemVariants} className="mb-4">
          {/* ... existing title section JSX ... */}
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Looks good!
                </div>
              )}
              {(!title || title.length <= 5) && title !== undefined && (
                <div className="mt-2 text-xs text-amber-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Please enter a descriptive title (min 6 characters)
                </div>
              )}
            </div>
          </FormSection>
        </motion.div>
        
        {/* File Upload Section */}
        <motion.div variants={itemVariants} className="mb-4">
          {/* ... existing file upload section JSX ... */}
          <FormSection title="Upload Contract File" subtitle="(Optional, stored on Sui Walrus)">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-300 mb-1 ml-1">Contract File (PDF, DOCX, etc.)</label>
              <input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" className="block w-full text-sm text-blue-200 bg-slate-800/40 border border-blue-500/30 rounded-lg p-2 file:bg-blue-700 file:text-white file:rounded file:px-4 file:py-2 file:mr-4 opacity-60 cursor-not-allowed" disabled />
              <div className="text-blue-400 text-xs mt-1">Coming soon: Upload contract files to Sui Walrus</div>
            </div>
          </FormSection>
        </motion.div>

        {/* Agreement Type */}
        <motion.div variants={itemVariants} className="mb-4">
          {/* ... existing agreement type section JSX ... */}
          <FormSection title="Type of Agreement">
            <div className="space-y-2">
              <AgreementType selectedType={contractType} onSelectType={handleContractTypeChange} />
              <div className="text-xs text-blue-300 mt-1 ml-1">Choose the type that best describes your agreement.</div>
            </div>
          </FormSection>
        </motion.div>

        {/* Parties Involved */}
        <motion.div variants={itemVariants} className="mb-4">
          {/* ... existing parties section JSX ... */}
          <FormSection title="Parties Involved" subtitle="You (Party A - Initiator)">
            <div className="space-y-2">
              <PartyInformation partyAAddress={address} partyBAddress={suiPartyBAddress} onPartyBAddressChange={handlePartyBAddressChange} />
              <div className="text-xs text-blue-300 mt-1 ml-1">Enter the Sui address of the other party.</div>
            </div>
          </FormSection>
        </motion.div>

        {/* Key Terms & Dates */}
        <motion.div variants={itemVariants} className="mb-4">
          {/* ... existing terms & dates section JSX ... */}
          <FormSection title="Key Terms & Dates" subtitle="Key Contract Terms / Summary">
            <div className="space-y-2">
              <ContractTerms startDate={startDate} endDate={endDate} setStartDate={handleStartDateChange} setEndDate={handleEndDateChange} onTermsReferenceChange={handleTermsReferenceChange} termsReference={termsReference} />
              <div className="text-xs text-blue-300 mt-1 ml-1">Summarize the main terms and set the contract period.</div>
            </div>
          </FormSection>
        </motion.div>

        {/* Escrow & Payment */}
        <motion.div variants={itemVariants} className="mb-4">
          {/* ... existing escrow section JSX ... */}
          <FormSection title="Escrow & Payment">
            <EscrowPayment useChainIcon={true} chainIcon={escrowChainIcon} />
          </FormSection>
        </motion.div>

        {/* Milestones */}
        <motion.div variants={itemVariants} className="mb-4">
          {/* ... existing milestones section JSX ... */}
          <FormSection title="Milestones" subtitle="(Optional - if not added, total escrow value applies to final delivery)">
            <MilestoneList milestones={milestones} updateMilestone={updateMilestone} removeMilestone={removeMilestone} addMilestone={addMilestone} />
            <div className="text-xs text-blue-300 mt-1 ml-1">Break down the contract into milestones for staged payments (optional).</div>
          </FormSection>
        </motion.div>

        {/* Additional Information */}
        <motion.div variants={itemVariants} className="mb-4">
          {/* ... existing additional info section JSX ... */}
          <FormSection title="Additional Information" subtitle="Metadata / Links (Optional)">
            <AdditionalInformation onMetadataChange={handleMetadataChange} metaData={metadata ?? ''} />
            <div className="text-xs text-blue-300 mt-1 ml-1">Add any extra notes, links, or metadata (optional).</div>
          </FormSection>
        </motion.div>
        
        <motion.div /* ... existing action buttons JSX ... */ 
          className="flex justify-center items-center gap-4 pt-4 pb-4 mt-8 sticky bottom-4 from-transparent px-4 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
            {/* ... content of action buttons ... */}
        </motion.div>
        
        <div className="bg-slate-800/30 p-4 rounded-lg border border-blue-500/10 mt-8">
          {/* ... existing tips section JSX ... */}
          <h4 className="text-blue-300 font-medium flex items-center"><span className="mr-2">💡</span> Tips for Creating Contracts</h4>
          <ul className="list-disc list-inside text-slate-400 text-sm mt-2 space-y-1">
            <li>All fields marked with <span className="text-red-400">*</span> are required</li>
            <li>Use "Save Draft" to save multiple versions of your contract</li>
            <li>Use "Load Draft" to select and continue working on a previously saved version</li>
            <li>Be specific and clear with your agreement title and terms</li>
            <li>Include all relevant dates and deadlines</li>
            <li>Specify milestones for complex agreements to track progress</li>
            <li>Review all details before creating the contract</li>
          </ul>
        </div>
      </motion.div>

      <ConfirmationModal /* ... existing confirmation modal JSX ... */ >
        {/* ... content of confirmation modal ... */}
      </ConfirmationModal>
    </div>
  )
}

export default ContractForm
