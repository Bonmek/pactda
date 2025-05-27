import { motion } from 'framer-motion'
import { getContracts } from '@/service/PactdaService'
import { useEffect, useState, useRef, Fragment } from 'react'
import * as PactdaService from '@/service/PactdaService'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { PactDaContract } from '@/@types/PactDaContract'
import { useNavigate, useParams } from 'react-router-dom'
import { Milestone } from '@/features/wormhole/types' // Assuming Milestone is correctly typed here
import { Card, CardContent } from '@/components/ui/card'
import ActionsCard from '@/components/ContractDetail/ActionsCard'
import { toast } from 'sonner'
import ContractStatusBadge, {
  StatusKey,
} from '@/components/ContractDetail/ContractStatusBadge'
import { SuiEvent } from '@mysten/sui.js/client'
import { Dialog } from '@headlessui/react' // For modal
import FundEscrowModal from './FundEscrowModal'
import ContractActionConfirmationModal from '@/components/ui/ContractActionConfirmationModal'
import { useContractActions, useWalletBalance } from './contractActions'
import { formatSUI } from '@/service/PactdaService'
import SuiIcon from '@/components/CreateContract/chain-logos/sui.svg'
import {
  decodeDescription,
  getMilestoneField,
  getMilestoneStatusLabel,
} from '@/utils/milestone'
import { OnChainMilestone } from '@/types/milestone'
import { useWallet } from '@solana/wallet-adapter-react' // Correct hook for Solana wallet
import { solanaService } from '@/service/SolanaService' // Import the singleton
import {
  ConnectionProvider as SolanaConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider as SolanaWalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

const agreementTypes = [
  { key: 'General', value: 0 },
  { key: 'Art', value: 1 },
  { key: 'Programming', value: 2 },
  { key: 'Audit', value: 3 },
  { key: 'Service', value: 4 },
]

function ContractDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [contract, setContract] = useState<PactDaContract | null>(null)
  const [events, setEvents] = useState<SuiEvent[]>([])
  const [escrow, setEscrow] = useState<{ balance: any; status: any } | null>(
    null,
  )
  const [showFundModal, setShowFundModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [funding, setFunding] = useState(false)
  const suiClient = useSuiClient()
  const suiAccount = useCurrentAccount()
  const address = suiAccount?.address
  const walletBalance = useWalletBalance(address, suiClient)
  const solanaWallet = useWallet() // Get Solana wallet context

  const {
    handleSignContract,
    handleSubmitContract,
    handleFundEscrow,
    handleRefundEscrow,
    showFundEscrowButton,
    showRefundEscrowButton,
  } = useContractActions({
    contract,
    escrow, // pass escrow for status logic
    setContract,
    setShowFundModal,
    setFunding,
    walletBalance,
    setShowRefundModal,
  })

  // Modal state for all contract actions
  const [actionModal, setActionModal] = useState<{
    open: boolean
    txb: any | null
    title: string
    onConfirmed: (result: any) => void
    content?: React.ReactNode
    escrowAmount?: number | null | undefined
    escrowAction?: 'fund' | 'refund'
  }>({
    open: false,
    txb: null,
    title: '',
    onConfirmed: () => {},
    content: null,
  })

  const [showProofModal, setShowProofModal] = useState(false)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(
    null,
  )
  const [proofInput, setProofInput] = useState('')
  const [submittingProof, setSubmittingProof] = useState(false)

  function handleOpenProofModal(milestoneId: number) {
    setSelectedMilestoneId(milestoneId)
    setProofInput('')
    setShowProofModal(true)
  }

  async function handleSubmitProof() {
    if (selectedMilestoneId === null || !proofInput || !contract) return
    setShowProofModal(false)
    setProofInput('')
    setSelectedMilestoneId(null)
    await handleAction(
      'submitProof',
      undefined,
      selectedMilestoneId,
      proofInput,
    )
  }

  // Add state for dispute modal
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeMilestoneId, setDisputeMilestoneId] = useState<number | null>(
    null,
  )
  const [submittingDispute, setSubmittingDispute] = useState(false)

  function handleOpenDisputeModal(milestoneId: number) {
    setDisputeMilestoneId(milestoneId)
    setDisputeReason('')
    setShowDisputeModal(true)
  }

  async function handleSubmitDispute() {
    if (disputeMilestoneId === null || !disputeReason || !contract) return
    setSubmittingDispute(true)
    setShowDisputeModal(false)
    await handleAction(
      'disputeMilestone',
      undefined,
      disputeMilestoneId,
      disputeReason,
    )
    setSubmittingDispute(false)
    setDisputeReason('')
    setDisputeMilestoneId(null)
  }

  // Fetch contract details
  const fetchContract = async (forceClone = false) => {
    if (!id) return
    try {
      const res = await getContracts(suiClient, id)
      if (res) {
        setContract(forceClone ? { ...res } : res)
        if (res.escrowId) {
          try {
            const escrowObject = await suiClient.getObject({
              id: res.escrowId,
              options: { showContent: true },
            })
            if (escrowObject?.data?.content?.dataType === 'moveObject') {
              const escrowFields = escrowObject.data.content.fields as any
              setEscrow({
                balance:
                  escrowFields.balance?.fields?.value ?? escrowFields.balance,
                status:
                  escrowFields.status?.fields?.value ?? escrowFields.status,
              })
            }
          } catch (e) {
            setEscrow(null)
          }
        } else {
          setEscrow(null)
        }
      } else {
        setContract(null)
        setEscrow(null)
      }
    } catch (error) {
      setContract(null)
      setEscrow(null)
    }
  }

  useEffect(() => {
    fetchContract()
  }, [id, suiClient])

  // Fetch contract activity
  useEffect(() => {
    const fetchContractActivity = async () => {
      if (!contract || !contract.objectId || !suiClient) {
        setEvents([])
        return
      }

      try {
        const txBlockResponses = await suiClient
          .queryTransactionBlocks({
            filter: { ChangedObject: contract.objectId },
            options: {
              showBalanceChanges: true,
              showEffects: true,
              showInput: true,
            },
            limit: 200,
            order: 'descending',
          })
          .then((res) => {
            if (res.data && res.data.length > 0) {
              return res
            } else {
              throw new Error('No transaction blocks found for this contract.')
            }
          })

        const allEvents: SuiEvent[] = []
        if (txBlockResponses.data) {
          txBlockResponses.data.forEach((txBlock) => {
            if (txBlock.events) {
              allEvents.push(...txBlock.events)
            }
          })
        }

        allEvents.sort((a, b) => {
          const tsA =
            typeof a.timestampMs === 'string'
              ? parseInt(a.timestampMs, 10)
              : (a.timestampMs ?? 0)
          const tsB =
            typeof b.timestampMs === 'string'
              ? parseInt(b.timestampMs, 10)
              : (b.timestampMs ?? 0)
          return tsB - tsA
        })

        setEvents(allEvents)
      } catch (error) {
        console.error(
          'Error fetching contract activity via transactions:',
          error,
        )

        setEvents([])
      }
    }

    if (contract && contract.objectId) {
      fetchContractActivity()
    }
  }, [contract, suiClient])

  const formatDate = (dateValue?: string | number | null): string => {
    if (!dateValue) return 'Date N/A'
    let date: Date
    if (typeof dateValue === 'string') {
      // Try to parse as ISO string
      date = new Date(dateValue)
      if (isNaN(date.getTime())) {
        // Fallback: try as timestamp (seconds)
        const asNum = parseInt(dateValue, 10)
        if (!isNaN(asNum)) {
          // If value is 10 digits, treat as seconds, else ms
          date = new Date(asNum < 1e12 ? asNum * 1000 : asNum)
        }
      }
    } else if (typeof dateValue === 'number') {
      // If value is 10 digits, treat as seconds, else ms
      date = new Date(dateValue < 1e12 ? dateValue * 1000 : dateValue)
    } else {
      date = new Date(dateValue)
    }
    if (isNaN(date.getTime()) || date.getFullYear() === 1970) return '-'
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const isValidDate = (dateValue?: string | number | null): boolean => {
    if (!dateValue) return false
    let date: Date
    if (typeof dateValue === 'string') {
      date = new Date(dateValue)
      if (isNaN(date.getTime())) {
        const asNum = parseInt(dateValue, 10)
        if (!isNaN(asNum)) {
          date = new Date(asNum < 1e12 ? asNum * 1000 : asNum)
        }
      }
    } else if (typeof dateValue === 'number') {
      date = new Date(dateValue < 1e12 ? dateValue * 1000 : dateValue)
    } else {
      date = new Date(dateValue)
    }
    return !isNaN(date.getTime()) && date.getFullYear() !== 1970
  }

  const getAgreementType = (value: number): string => {
    const agreement = agreementTypes.find((type) => type.value === value)
    return agreement ? agreement.key : 'Unknown Type'
  }
  const resetAndFetchContract = async () => {
    setContract(null)
    setEscrow(null)
    await new Promise((resolve) => setTimeout(resolve, 300))
    await fetchContract(true)
  }

  const isCrossChain = contract
    ? PactdaService.isCrossChainContract(contract)
    : false
  const crossChainInfo = contract
    ? PactdaService.getCrossChainInfo(contract)
    : null
  const handleAction = async (
    action:
      | 'sign'
      | 'submit'
      | 'fund'
      | 'refund'
      | 'submitProof'
      | 'approveMilestone'
      | 'create-solana-stub'
      | 'sign-cross-chain'
      | 'submit-proof-cross-chain'
      | 'disputeMilestone',
    fundAmount?: string,
    milestoneId?: number,
    proofInputArg?: string,
  ) => {
    if (!contract || (!address && !solanaWallet?.publicKey)) return
    let txb: any = null
    let title = ''
    let content: React.ReactNode = null
    let onConfirmed = async (_result: any) => {}
    let escrowAmount: number | null | undefined = undefined
    let escrowAction: 'fund' | 'refund' | undefined = undefined

    if (action === 'submit') {
      if (!contract.title || contract.title.trim().length < 3) {
        toast.error('Title is required and must be at least 3 characters.')
        return
      }
      if (
        !contract.milestones ||
        contract.milestones.length === 0 ||
        !contract.milestones.some((m: any) => {
          const desc = m.fields.description_hash
          return (
            desc &&
            ((typeof desc === 'string' && desc.trim().length > 0) ||
              (Array.isArray(desc) && desc.length > 0))
          )
        })
      ) {
        toast.error(
          'At least one milestone with a description is required before submitting.',
        )
        return
      }
      // If cross-chain Solana, create stub automatically before submit
      const isCrossChain = PactdaService.isCrossChainContract(contract)
      const crossChainInfo = PactdaService.getCrossChainInfo(contract)
      if (isCrossChain && crossChainInfo && crossChainInfo.chainId === 1) {
        try {
          await PactdaService.createSolanaStub(contract, address)
        } catch (e) {
          toast.error('Failed to create Solana stub. Please try again.')
          return
        }
      }
      txb = await import('@/service/PactdaService').then((m) =>
        m.buildSubmitContractTx(contract.objectId),
      )
      title = 'Confirm Submit Contract'
      content = <div>Submit contract for review?</div>
      onConfirmed = async () => {
        await resetAndFetchContract()
        toast.success('Contract submitted!')
      }
    } else if (action === 'create-solana-stub') {
      const isCrossChain = PactdaService.isCrossChainContract(contract)
      const crossChainInfo = PactdaService.getCrossChainInfo(contract)

      if (!isCrossChain || !crossChainInfo) {
        toast.error('This is not a cross-chain contract')
        return
      }
      toast.promise(PactdaService.createSolanaStub(contract, address), {
        loading: 'Creating Solana stub...',
        success: 'Solana stub created successfully!',
        error: 'Failed to create Solana stub. Please try again.',
      })
      return
    } else if (action === 'sign') {
      const isPartyA = address === contract.partyA
      let isPartyB = address === contract.partyB
      const isCrossChain = PactdaService.isCrossChainContract(contract)
      const crossChainInfo = PactdaService.getCrossChainInfo(contract)
      // --- Cross-chain Party B detection for non-Sui wallets ---
      let crossChainPartyBAddress = getCrossChainPartyBAddress()
      let isCrossChainPartyB = false
      if (
        isCrossChain &&
        crossChainInfo &&
        crossChainInfo.chainId === 1 &&
        !address && // Not Sui wallet
        solanaWallet?.publicKey &&
        crossChainPartyBAddress &&
        solanaWallet.publicKey.toBase58() === crossChainPartyBAddress
      ) {
        isCrossChainPartyB = true
      }
      // ---
      if (
        (isCrossChain &&
          crossChainInfo &&
          crossChainInfo.chainId === 1 &&
          isPartyB) ||
        isCrossChainPartyB
      ) {
        // Cross-chain Party B signing from Solana
        const solanaPubkey =
          solanaWallet?.publicKey?.toBase58() || crossChainPartyBAddress
        if (!solanaPubkey || !solanaWallet?.publicKey) {
          toast.error('No Solana wallet connected.')
          return
        }
        await solanaService.ensureStubExistsForContract(solanaPubkey, contract)
        toast.promise(
          solanaService.signContractCrossChain(solanaPubkey, contract, {
            publicKey: solanaWallet.publicKey,
            signTransaction: solanaWallet.signTransaction,
          }),
          {
            loading: 'Signing contract on Solana...',
            success: 'Contract signed on Solana successfully!',
            error: 'Failed to sign contract on Solana. Please try again.',
          },
        )
        return
      } else {
        if (isPartyA)
          txb = await import('@/service/PactdaService').then((m) =>
            m.buildSignContractAsPartyATx(contract.objectId),
          )
        else if (isPartyB)
          txb = await import('@/service/PactdaService').then((m) =>
            m.buildSignContractAsPartyBTx(contract.objectId),
          )
        title = 'Confirm Sign Contract'
        content = (
          <div>Sign contract as {isPartyA ? 'Party A' : 'Party B'}?</div>
        )
        onConfirmed = async () => {
          await resetAndFetchContract()
          toast.success('Contract signed!')
        }
      }
    } else if (action === 'sign-cross-chain') {
      const crossChainInfo = PactdaService.getCrossChainInfo(contract)
      if (!crossChainInfo || crossChainInfo.chainId !== 1) {
        toast.error(
          'This action is only available for Solana cross-chain contracts',
        )
        return
      }

      toast.promise(
        import('@/service/SolanaService').then((m) =>
          m.solanaService.signContractCrossChain(address || '', contract),
        ),
        {
          loading: 'Signing contract on Solana...',
          success: 'Contract signed on Solana successfully!',
          error: 'Failed to sign contract on Solana. Please try again.',
        },
      )
      return
    } else if (action === 'fund') {
      if (!fundAmount) return
      const amount = BigInt(Math.floor(Number(fundAmount) * 1e9))
      txb = await import('@/service/PactdaService').then((m) =>
        m.buildFundEscrowTx(
          contract.objectId,
          amount,
          address || '',
          suiClient,
          address || '',
        ),
      )
      title = 'Confirm Fund Escrow'
      content = <div>Fund escrow with {fundAmount} SUI?</div>
      onConfirmed = async () => {
        await resetAndFetchContract()
        toast.success('Escrow funded!')
      }
      escrowAmount = Number(fundAmount)
      escrowAction = 'fund'
    } else if (action === 'refund') {
      if (!contract.escrowId) return
      txb = await import('@/service/PactdaService').then((m) =>
        m.buildRefundEscrowTx(
          contract.objectId,
          (contract.escrowId as string) || '', // Fix: always pass string
          address || '',
        ),
      )
      title = 'Confirm Refund Escrow'
      let refundAmount =
        escrow?.balance !== undefined
          ? Number(formatSUI(BigInt(escrow.balance)))
          : undefined
      content = <div>Refund escrow? This action cannot be undone.</div>
      onConfirmed = async () => {
        await resetAndFetchContract()
        toast.success('Escrow refunded!')
      }
      escrowAmount = refundAmount
      escrowAction = 'refund'
    } else if (action === 'submitProof') {
      if (typeof milestoneId !== 'number' || !proofInputArg) return

      const isCrossChain = PactdaService.isCrossChainContract(contract)
      const crossChainInfo = PactdaService.getCrossChainInfo(contract)

      if (isCrossChain && crossChainInfo && crossChainInfo.chainId === 1) {
        toast.promise(
          import('@/service/SolanaService').then((m) =>
            m.solanaService.submitProofCrossChain(
              address || '',
              contract,
              milestoneId,
              proofInputArg,
            ),
          ),
          {
            loading: 'Submitting proof via Solana...',
            success: 'Proof submitted via Solana successfully!',
            error: 'Failed to submit proof via Solana. Please try again.',
          },
        )
        return
      } else {
        txb = await PactdaService.buildSubmitProofTx(
          contract.objectId,
          milestoneId,
          proofInputArg,
        )
        title = `Submit Proof for Milestone #${milestoneId + 1}`
        content = <div>Submit proof for milestone #{milestoneId + 1}?</div>
        onConfirmed = async () => {
          await resetAndFetchContract()
          toast.success('Proof submitted!')
        }
      }
    } else if (action === 'submit-proof-cross-chain') {
      // Explicit cross-chain proof submission action
      if (typeof milestoneId !== 'number' || !proofInputArg) return
      const crossChainInfo = PactdaService.getCrossChainInfo(contract)
      if (!crossChainInfo || crossChainInfo.chainId !== 1) return
      await solanaService.ensureStubExistsForContract(address || '', contract)
      // Not implemented: submitProofCrossChain. Show error for now.
      toast.error(
        'Cross-chain proof submission is not yet implemented in SolanaService.',
      )
      return
    } else if (action === 'disputeMilestone') {
      if (typeof milestoneId !== 'number' || !proofInputArg) return
      // proofInputArg is dispute reason
      txb = await import('@/service/PactdaService').then((m) =>
        m.buildInitiateDisputeTx(
          contract.objectId,
          milestoneId,
          proofInputArg,
          address || '',
          suiClient,
        ),
      )
      title = 'Confirm Dispute Milestone'
      content = (
        <div>Are you sure you want to dispute milestone {milestoneId + 1}?</div>
      )
      onConfirmed = async () => {
        await resetAndFetchContract()
        toast.success('Milestone disputed!')
      }
    } else if (action === 'approveMilestone') {
      if (typeof milestoneId !== 'number') return
      if (!contract.escrowId) {
        toast.error('No escrow found for this contract.')
        return
      }
      txb = await PactdaService.buildReleasePaymentTx(
        contract.objectId,
        contract.escrowId as string,
      )
      title = `Approve & Release Milestone #${milestoneId + 1}`
      content = (
        <div>Approve and release payment for milestone #{milestoneId + 1}?</div>
      )
      onConfirmed = async () => {
        await resetAndFetchContract()
        toast.success('Milestone approved and payment released!')
      }
    }

    setActionModal({
      open: true,
      txb,
      title,
      onConfirmed,
      content,
      escrowAmount,
      escrowAction,
    })
  }

  // Utility to get cross-chain Party B address (for non-Sui wallets)
  function getCrossChainPartyBAddress() {
    if (!contract || !contract.cross_chain_parties) return null
    const partyB = Array.isArray(contract.cross_chain_parties)
      ? contract.cross_chain_parties.find((p: any) => {
          const role = p.fields ? p.fields.role : p.role
          return role === 1 // PARTY_ROLE_B
        })
      : null
    if (!partyB) return null
    const addr = partyB.fields
      ? partyB.fields.party_address
      : partyB.party_address
    if (Array.isArray(addr)) {
      return new TextDecoder().decode(Uint8Array.from(addr))
    }
    return addr
  }

  const milestonesRef = useRef<HTMLDivElement>(null)

  function handleScrollToMilestones() {
    if (milestonesRef.current) {
      milestonesRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  if (!contract) {
    return (
      <div className="min-h-screen text-white p-4 md:p-8 flex justify-center items-center">
        <p>Loading contract details...</p>
        {/* You could add a spinner here */}
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white p-4 md:p-8 justify-center flex-col">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-6 text-blue-400 hover:text-blue-300 transition cursor-pointer hover:underline"
      >
        ← Back to contracts
      </button>
      <div className="flex flex-col items-center w-full cursor-default">
        <motion.div
          className="w-full max-w-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="rounded-3xl shadow-2xl bg-gradient-to-br from-[#232946] via-[#1a1a2e] to-[#0f3460] border border-indigo-700/40 backdrop-blur-xl cursor-pointer hover:shadow-indigo-500/30 transition-shadow">
            <CardContent className="p-2 md:p-4 lg:p-8 md:-mt-8">
              <motion.h1
                className="text-3xl md:text-5xl font-extralight tracking-tight px-2 md:px-4 py-4 pt-0 text-center mb-2 md:mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent drop-shadow-lg">
                  {contract.title ? contract.title : '-'}
                </span>
              </motion.h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-2 md:px-8 mb-8">
                <div className="space-y-4">
                  {' '}
                  {/* Mobile Status Badge */}
                  <div className="flex flex-col items-center justify-start gap-4 md:hidden">
                    <ContractStatusBadge
                      status={contract.status as StatusKey}
                    />
                    {/* Cross-chain indicator for mobile */}
                    {PactdaService.isCrossChainContract(contract) &&
                      (() => {
                        const crossChainInfo =
                          PactdaService.getCrossChainInfo(contract)
                        if (crossChainInfo) {
                          const CHAIN_IDS = {
                            Sui:
                              Number(import.meta.env.VITE_CHAIN_ID_SUI) || 21,
                            Solana:
                              Number(import.meta.env.VITE_CHAIN_ID_SOLANA) || 1,
                            Ethereum:
                              Number(import.meta.env.VITE_CHAIN_ID_ETHEREUM) ||
                              2,
                            Polygon:
                              Number(import.meta.env.VITE_CHAIN_ID_POLYGON) ||
                              5,
                            Avalanche:
                              Number(import.meta.env.VITE_CHAIN_ID_AVALANCHE) ||
                              6,
                          }
                          const chainName =
                            (
                              Object.keys(CHAIN_IDS) as Array<
                                keyof typeof CHAIN_IDS
                              >
                            ).find(
                              (key) => CHAIN_IDS[key] == crossChainInfo.chainId,
                            ) || `Chain ${crossChainInfo.chainId}`

                          return (
                            <div className="px-3 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white border border-purple-400/30 shadow-md">
                              🌐 Cross-Chain ({chainName})
                            </div>
                          )
                        }
                        return null
                      })()}
                  </div>
                  <div className="flex items-center gap-3 text-lg text-indigo-300/80">
                    <span className="font-semibold text-indigo-400/90">
                      Type:
                    </span>
                    <span className="font-light text-white/90">
                      {contract.contractType !== undefined &&
                      contract.contractType !== null
                        ? getAgreementType(contract.contractType)
                        : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-3 text-lg text-indigo-300/80">
                    <div className="flex gap-3">
                      <span className="font-semibold text-indigo-400/90">
                        Start:
                      </span>
                      <span className="font-light text-white/90">
                        {isValidDate(contract.contractStartDate)
                          ? formatDate(contract.contractStartDate)
                          : '-'}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-semibold text-indigo-400/90 md:ml-4">
                        Deadline:
                      </span>
                      <span className="font-light text-white/90">
                        {isValidDate(contract.contractDeadlineDate)
                          ? formatDate(contract.contractDeadlineDate)
                          : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="flex md:items-center gap-3 text-lg text-indigo-300/80">
                    <span className="font-semibold text-indigo-400/90">
                      ID:
                    </span>
                    <span className="font-mono text-white/80 text-base break-all">
                      {contract.objectId ?? '-'}
                    </span>
                  </div>
                  {contract.status === 0 && // Assuming 0 is a 'Draft' or 'Updatable' status
                    address === contract.partyA && (
                      <div className="w-full md:w-50">
                        <button
                          className="w-full bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white rounded-xl px-6 py-2 text-base font-semibold shadow-lg transition mb-2 mt-4 pulse-effect cursor-pointer hover:scale-105"
                          onClick={() =>
                            navigate(`/contract/${contract.objectId}/edit`)
                          }
                        >
                          ✏️ Update Contract
                        </button>
                      </div>
                    )}
                </div>{' '}
                {/* Desktop Status Badge */}
                <div className="hidden md:flex flex-col items-end justify-start gap-4">
                  <ContractStatusBadge status={contract.status as StatusKey} />
                  {/* Cross-chain indicator */}
                  {PactdaService.isCrossChainContract(contract) &&
                    (() => {
                      const crossChainInfo =
                        PactdaService.getCrossChainInfo(contract)
                      if (crossChainInfo) {
                        // Try to map chain_id to chain name
                        const CHAIN_IDS = {
                          Sui: Number(import.meta.env.VITE_CHAIN_ID_SUI) || 21,
                          Solana:
                            Number(import.meta.env.VITE_CHAIN_ID_SOLANA) || 1,
                          Ethereum:
                            Number(import.meta.env.VITE_CHAIN_ID_ETHEREUM) || 2,
                          Polygon:
                            Number(import.meta.env.VITE_CHAIN_ID_POLYGON) || 5,
                          Avalanche:
                            Number(import.meta.env.VITE_CHAIN_ID_AVALANCHE) ||
                            6,
                        }
                        const chainName =
                          (
                            Object.keys(CHAIN_IDS) as Array<
                              keyof typeof CHAIN_IDS
                            >
                          ).find(
                            (key) => CHAIN_IDS[key] == crossChainInfo.chainId,
                          ) || `Chain ${crossChainInfo.chainId}`

                        return (
                          <div className="px-3 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white border border-purple-400/30 shadow-md">
                            🌐 Cross-Chain ({chainName})
                          </div>
                        )
                      }
                      return null
                    })()}
                </div>
              </div>
              {/* Responsive ActionsCard: show at top on mobile, right column on desktop */}{' '}
              {/* Mobile: ActionsCard at top */}
              <div className="block md:hidden mb-6">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-800/40 to-fuchsia-800/10 p-4 shadow-lg border border-indigo-700/20 flex flex-col gap-4">
                  <ActionsCard
                    onSign={() => handleAction('sign')}
                    status={contract.status}
                    address={address!}
                    partyA={contract.partyA}
                    partyB={contract.partyB}
                    partyASigned={contract.partyASigned}
                    partyBSigned={contract.partyBSigned}
                    onSubmit={() => handleAction('submit')}
                    onFundEscrow={
                      showFundEscrowButton
                        ? () => setShowFundModal(true)
                        : undefined
                    }
                    // onCreateSolanaStub removed: stub creation is now automatic with submit
                  />
                  {showRefundEscrowButton && (
                    <button
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-xl px-6 py-2 text-base font-semibold shadow-lg transition mb-2 mt-2"
                      onClick={() => handleAction('refund')}
                    >
                      Refund Escrow
                    </button>
                  )}
                  {/* Only show Submit Proof button to Party B */}
                  {address === contract.partyB && (
                    <button
                      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white rounded-xl px-6 py-2 text-base font-semibold shadow-lg transition mb-2 mt-2"
                      onClick={handleScrollToMilestones}
                    >
                      Submit Proof
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[60%_40%] gap-8 p-2 md:p-4">
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  {/* Parties Info */}
                  <div className="rounded-2xl bg-gradient-to-br from-indigo-900/30 to-indigo-700/10 p-6 shadow-lg border border-indigo-700/20">
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <span className="block text-indigo-300/80 font-semibold mb-1">
                          Party A
                        </span>
                        <span className="block font-mono text-white/90 text-base break-all">
                          {contract.partyA || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-indigo-300/80 font-semibold mb-1">
                          Party B
                        </span>
                        {contract.cross_chain_parties &&
                        Array.isArray(contract.cross_chain_parties) &&
                        contract.cross_chain_parties.length > 0 ? (
                          (() => {
                            const partyBInfo =
                              contract.cross_chain_parties[0]?.fields
                            if (partyBInfo) {
                              // Try to map chain_id to chain name
                              const CHAIN_IDS = {
                                Sui:
                                  Number(import.meta.env.VITE_CHAIN_ID_SUI) ||
                                  1,
                                Solana:
                                  Number(
                                    import.meta.env.VITE_CHAIN_ID_SOLANA,
                                  ) || 1,
                                Ethereum:
                                  Number(
                                    import.meta.env.VITE_CHAIN_ID_ETHEREUM,
                                  ) || 2,
                                Polygon:
                                  Number(
                                    import.meta.env.VITE_CHAIN_ID_POLYGON,
                                  ) || 5,
                                Avalanche:
                                  Number(
                                    import.meta.env.VITE_CHAIN_ID_AVALANCHE,
                                  ) || 6,
                              }
                              // Fix: use keyof typeof CHAIN_IDS for type safety
                              const chainName =
                                (
                                  Object.keys(CHAIN_IDS) as Array<
                                    keyof typeof CHAIN_IDS
                                  >
                                ).find(
                                  (key) =>
                                    CHAIN_IDS[key] == partyBInfo.chain_id,
                                ) || `Chain ID ${partyBInfo.chain_id}`
                              // Decode address (stored as bytes/array)
                              let address = ''
                              if (Array.isArray(partyBInfo.party_address)) {
                                address = new TextDecoder().decode(
                                  Uint8Array.from(partyBInfo.party_address),
                                )
                              } else if (
                                typeof partyBInfo.party_address === 'string'
                              ) {
                                address = partyBInfo.party_address
                              }
                              return (
                                <span className="block font-mono text-white/90 text-base break-all">
                                  {address}{' '}
                                  <span className="text-indigo-400/80 ml-2">
                                    [{chainName}]
                                  </span>
                                </span>
                              )
                            }
                            return (
                              <span className="block font-mono text-white/90 text-base break-all">
                                -
                              </span>
                            )
                          })()
                        ) : (
                          <span className="block font-mono text-white/90 text-base break-all">
                            {contract.partyB || '-'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Key Terms */}
                  <div className="rounded-2xl bg-gradient-to-br from-fuchsia-900/30 to-fuchsia-700/10 p-6 shadow-lg border border-fuchsia-700/20">
                    <span className="block text-fuchsia-300/80 font-semibold mb-1">
                      Key Terms
                    </span>
                    <span className="block text-white/90 text-base whitespace-pre-wrap min-h-[2rem]">
                      {contract.termsReference &&
                      contract.termsReference.trim() !== ''
                        ? contract.termsReference
                        : '-'}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-purple-700/10 p-6 shadow-lg border border-purple-700/20">
                    <span className="block text-purple-300/80 font-semibold mb-1">
                      Metadata / Additional Links
                    </span>
                    <span className="block text-white/90 text-xs break-all min-h-[1.5rem]">
                      {contract.metadata && contract.metadata.trim() !== ''
                        ? contract.metadata
                        : '-'}
                    </span>
                  </div>

                  {/* Escrow Details */}
                  {escrow &&
                  (escrow.status === 'refunded' || escrow.status === 2) ? (
                    <div className="rounded-2xl bg-gradient-to-br from-blue-900/30 to-blue-700/10 p-6 shadow-lg border border-blue-700/20">
                      <span className="block text-blue-300/80 font-semibold mb-1">
                        Escrow (Refunded)
                      </span>
                      <span className="block text-white/80 text-base">
                        This escrow has been refunded and is now closed.
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-gradient-to-br from-blue-900/30 to-blue-700/10 p-6 shadow-lg border border-blue-700/20">
                      <span className="block text-blue-300/80 font-semibold mb-1">
                        Escrow
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        <span className="block text-white/90 text-base">
                          Address:{' '}
                          <span className="font-mono">
                            {contract.escrowId || '-'}
                          </span>
                        </span>
                        <span className="text-white/90 text-base flex items-center gap-1">
                          Balance:{' '}
                          <span className="text-green-400 flex items-center gap-1">
                            {escrow?.balance !== undefined
                              ? formatSUI(BigInt(escrow.balance))
                              : '-'}
                            <img
                              src={SuiIcon}
                              alt="SUI"
                              className="inline w-5 h-5 ml-1 align-middle"
                            />
                          </span>
                        </span>

                        <div className="flex gap-3 mt-2"></div>
                      </div>
                    </div>
                  )}

                  {/* Milestones */}
                  <div
                    ref={milestonesRef}
                    className="rounded-2xl bg-gradient-to-br from-emerald-900/30 to-emerald-700/10 p-6 shadow-lg border border-emerald-700/20"
                  >
                    <span className="block text-emerald-300/80 font-semibold mb-1">
                      Milestones
                    </span>
                    {Array.isArray(contract.milestones) &&
                    contract.milestones.length > 0 ? (
                      <ul className="list-disc list-inside text-white/90 text-base space-y-2">
                        {contract.milestones.map(
                          (milestone: any, idx: number) => {
                            // Always decode description_hash to string
                            const descRaw = milestone.fields.description_hash
                            let desc = ''
                            if (
                              Array.isArray(descRaw) ||
                              typeof descRaw === 'string'
                            ) {
                              desc = decodeDescription(descRaw)
                            } else {
                              desc = ''
                            }
                            let value = milestone.fields.value
                            let valueSUI =
                              value !== undefined &&
                              value !== null &&
                              value !== '' &&
                              !isNaN(Number(value))
                                ? (Number(value) / 1e9).toLocaleString(
                                    undefined,
                                    { maximumFractionDigits: 4 },
                                  )
                                : '-'
                            const statusLabel = getMilestoneStatusLabel(
                              milestone.fields.status,
                            )
                            const proof = decodeDescription(
                              milestone.fields.proof_reference,
                            )
                            const isPending = milestone.fields.status === 0 // Pending
                            const isSubmitted = milestone.fields.status === 1 // Submitted
                            const canDispute =
                              (isSubmitted && address === contract.partyB) || // Party B can dispute after proof submitted
                              (isPending && address === contract.partyA) // Party A can dispute if milestone is stuck
                            return (
                              <li key={idx} className="flex flex-col gap-1">
                                <span className="text-emerald-400 text-sm">
                                  Milestone {idx + 1}:
                                </span>
                                <span className="font-semibold">
                                  {desc || '-'}
                                </span>
                                {valueSUI !== '-' && (
                                  <span className="text-emerald-400 text-sm">
                                    Value: {valueSUI} SUI
                                  </span>
                                )}
                                {valueSUI === '-' && (
                                  <span className="text-emerald-400 text-sm">
                                    Value: -
                                  </span>
                                )}
                                <span className="text-blue-300 text-xs">
                                  Status: {statusLabel}
                                </span>
                                {proof && (
                                  <span className="text-purple-300 text-xs break-all">
                                    Proof:{' '}
                                    {typeof proof === 'string'
                                      ? proof
                                      : JSON.stringify(proof)}
                                  </span>
                                )}
                                {isPending && address === contract.partyB && (
                                  <button
                                    className="mt-1 px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 transition"
                                    onClick={() => handleOpenProofModal(idx)}
                                  >
                                    Submit Proof
                                  </button>
                                )}
                                {isSubmitted && address === contract.partyA && (
                                  <button
                                    className="mt-1 px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 transition"
                                    onClick={() =>
                                      handleAction(
                                        'approveMilestone',
                                        undefined,
                                        idx,
                                      )
                                    }
                                  >
                                    Approve & Release
                                  </button>
                                )}
                                {canDispute && (
                                  <button
                                    className="mt-1 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                                    onClick={() => handleOpenDisputeModal(idx)}
                                  >
                                    Dispute
                                  </button>
                                )}
                              </li>
                            )
                          },
                        )}
                      </ul>
                    ) : (
                      <span className="block text-white/60 italic">
                        - No milestones defined -
                      </span>
                    )}
                  </div>

                  {/* Activity Timeline */}
                  <div className="rounded-2xl bg-gradient-to-br from-gray-800/30 to-gray-700/10 p-6 shadow-lg border border-gray-600/20">
                    <h3 className="text-xl font-semibold text-gray-300/80 mb-4">
                      Activity Timeline
                    </h3>
                    {events.length > 0 ? (
                      <ul className="space-y-4">
                        {events.map((event, index) => (
                          <li
                            key={event.id.txDigest + event.id.eventSeq + index}
                            className="p-3 bg-gray-700/20 rounded-lg shadow"
                          >
                            <p className="text-sm text-gray-400">
                              <span className="font-semibold text-sky-400">
                                Event Type:
                              </span>{' '}
                              {event.type.split('::').pop()} <br />
                              <span className="font-semibold text-sky-400">
                                Timestamp:
                              </span>{' '}
                              {formatDate(event.timestampMs)} <br />
                              <span className="font-semibold text-sky-400">
                                Transaction:
                              </span>{' '}
                              <a
                                href={`https://suiscan.xyz/testnet/tx/${event.id.txDigest}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-500 hover:underline"
                              >
                                {event.id.txDigest.substring(0, 10)}...
                              </a>
                            </p>
                            {event.parsedJson && (
                              <details className="mt-2 text-xs text-gray-500">
                                <summary className="cursor-pointer hover:text-gray-300">
                                  View Details
                                </summary>
                                <pre className="mt-1 p-2 bg-gray-900/50 rounded overflow-auto">
                                  {JSON.stringify(event.parsedJson, null, 2)}
                                </pre>
                              </details>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 italic">
                        No contract-specific activity found.
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Desktop: ActionsCard and Activity Timeline in right column */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="space-y-8 hidden md:block"
                >
                  {' '}
                  <div className="rounded-2xl bg-gradient-to-br from-indigo-800/40 to-fuchsia-800/10 p-4 shadow-lg border border-indigo-700/20 flex flex-col gap-4">
                    {' '}
                    <ActionsCard
                      onSign={() => handleAction('sign')}
                      status={contract.status}
                      address={address!}
                      partyA={contract.partyA}
                      partyB={contract.partyB}
                      partyASigned={contract.partyASigned}
                      partyBSigned={contract.partyBSigned}
                      onSubmit={() => handleAction('submit')}
                      onFundEscrow={
                        showFundEscrowButton
                          ? () => setShowFundModal(true)
                          : undefined
                      }
                    />
                    {showRefundEscrowButton && (
                      <button
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-xl px-6 py-2 text-base font-semibold shadow-lg transition mb-2 mt-2"
                        onClick={() => handleAction('refund')}
                      >
                        Refund Escrow
                      </button>
                    )}
                    {/* Only show Submit Proof button to Party B */}
                    {address === contract.partyB && (
                      <button
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white rounded-xl px-6 py-2 text-base font-semibold shadow-lg transition mb-2 mt-2"
                        onClick={handleScrollToMilestones}
                      >
                        Submit Proof
                      </button>
                    )}
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-700/10 p-4 shadow-lg border border-gray-700/20">
                    <span className="block text-gray-300/80 font-semibold mb-1">
                      Activity Timeline
                    </span>
                    {events.length > 0 ? (
                      <ul className="space-y-2 mt-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                        {events.map((event) => (
                          <li
                            key={`${event.id.txDigest}-${event.id.eventSeq}`}
                            className="text-xs p-2.5 bg-gray-700/50 rounded-lg shadow-md hover:bg-gray-700/70 transition-colors duration-150"
                          >
                            <div className="flex justify-between items-start mb-1.5">
                              <span className="font-semibold text-indigo-300 break-all mr-2">
                                {event.type.split('::').pop() || 'Event'}
                              </span>
                              {event.timestampMs && (
                                <span className="text-white/60 text-[0.7rem] flex-shrink-0 whitespace-nowrap">
                                  {new Date(
                                    parseInt(event.timestampMs),
                                  ).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <pre className="text-white/80 text-[0.75rem] whitespace-pre-wrap break-all bg-black/30 p-2 rounded-md custom-scrollbar overflow-x-auto">
                              {JSON.stringify(event.parsedJson, null, 2)}
                            </pre>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="block text-white/60 italic mt-2">
                        - No activity events found. -
                      </span>
                    )}
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <FundEscrowModal
        open={showFundModal}
        onClose={() => setShowFundModal(false)}
        onFund={(amount) => {
          setShowFundModal(false)
          handleAction('fund', amount)
        }}
        max={walletBalance}
        loading={funding}
        firstMilestoneValue={(() => {
          if (
            !contract ||
            !contract.milestones ||
            contract.milestones.length === 0
          )
            return 0
          let mistValue: number | string | undefined =
            'fields' in contract.milestones[0]
              ? (contract.milestones[0] as any).fields.value
              : (contract.milestones[0] as any)?.value
          if (typeof mistValue === 'string') {
            mistValue = Number(mistValue)
          }
          if (typeof mistValue === 'number' && !isNaN(mistValue)) {
            return mistValue / 1e9 // Convert MIST to SUI
          }
          return 0
        })()}
      />
      <ContractActionConfirmationModal
        isOpen={actionModal.open}
        onClose={() => setActionModal({ ...actionModal, open: false })}
        onConfirmed={async (result) => {
          await actionModal.onConfirmed(result)
          await resetAndFetchContract()
          setActionModal({ ...actionModal, open: false })
        }}
        transactionBlock={actionModal.txb}
        title={actionModal.title}
        escrowAmount={actionModal.escrowAmount}
        escrowAction={actionModal.escrowAction}
      >
        {actionModal.content}
      </ContractActionConfirmationModal>
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl border border-indigo-700">
            <h2 className="text-lg font-semibold mb-4 text-indigo-300">
              Submit Proof for Milestone #
              {selectedMilestoneId !== null ? selectedMilestoneId + 1 : ''}
            </h2>
            <textarea
              className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mb-4"
              rows={3}
              placeholder="Enter proof reference (URL, hash, etc)"
              value={proofInput}
              onChange={(e) => setProofInput(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                onClick={() => setShowProofModal(false)}
                disabled={submittingProof}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                onClick={handleSubmitProof}
                disabled={submittingProof || !proofInput}
              >
                {submittingProof ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-lg border border-red-700/40">
            <h2 className="text-lg font-semibold text-red-400 mb-2">
              Dispute Milestone
            </h2>
            <textarea
              className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mb-4"
              rows={3}
              placeholder="Enter reason for dispute..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-1 rounded bg-gray-700 text-white hover:bg-gray-600"
                onClick={() => setShowDisputeModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                disabled={!disputeReason || submittingDispute}
                onClick={handleSubmitDispute}
              >
                {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const solanaNetwork = WalletAdapterNetwork.Testnet
const solanaEndpoint = clusterApiUrl(solanaNetwork)
const solanaWallets = [new UnsafeBurnerWalletAdapter()]

function ContractDetailWithSolanaProvider(props: any) {
  return (
    <SolanaConnectionProvider endpoint={solanaEndpoint}>
      <SolanaWalletProvider wallets={solanaWallets} autoConnect>
        <SolanaWalletModalProvider>
          <ContractDetail {...props} />
        </SolanaWalletModalProvider>
      </SolanaWalletProvider>
    </SolanaConnectionProvider>
  )
}

// Replace the default export
export default ContractDetailWithSolanaProvider
