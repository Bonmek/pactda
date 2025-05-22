import { motion } from 'framer-motion';
import { getMilestoneStatusLabel, getMilestoneStatusStyle } from '@/lib/utils';
import { MilestoneStatus } from '@/types/pactDa';
import {
  buildSignContractAsPartyATx,
  buildSubmitContractTx,
  getContracts,
} from '@/service/PactdaService';
import { useEffect, useState } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useManagedTransaction } from '@/hooks/useManagedTransaction';
import { PactDaContract } from '@/@types/PactDaContract';
import { useContractRole, ContractUserRole } from '@/hooks/useContractRole';
import { ContractStatus } from '@/types/pactDa';
import { useNavigate, useParams } from 'react-router-dom';
import { useRef } from 'react'; // Import useRef
import { Milestone } from '@/features/wormhole/types'; // Assuming Milestone is correctly typed here
import { Card, CardContent } from '@/components/ui/card';
import PartiesCard from '@/components/ContractDetail/PartiesCard';
import KeyTermsCard from '@/components/ContractDetail/KeyTermsCard';
import MetadataCard from '@/components/ContractDetail/MetadataCard';
import EscrowCard from '@/components/ContractDetail/EscrowCard';
import MilestonesCard from '@/components/ContractDetail/MilestonesCard';
import ActionsCard from '@/components/ContractDetail/ActionsCard';
// import ActivityTimelineCard from '@/components/ContractDetail/ActivityTimelineCard'; // Keep if used elsewhere, but direct rendering now
import { toast } from 'sonner';
import ContractStatusBadge, {
  StatusKey,
} from '@/components/ContractDetail/ContractStatusBadge';
import { SuiEvent } from '@mysten/sui.js/client';

const agreementTypes = [
  { key: 'General', value: 0 },
  { key: 'Art', value: 1 },
  { key: 'Programming', value: 2 },
  { key: 'Audit', value: 3 },
  { key: 'Service', value: 4 },
];

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<PactDaContract | null>(null);
  const [events, setEvents] = useState<SuiEvent[]>([]); // Stores historical events for the timeline
  const notifiedEventIds = useRef<Set<string>>(new Set()); // Tracks events for which notifications have been shown
  const [escrow, setEscrow] = useState<{ balance: any; status: any } | null>(null);
  const suiClient = useSuiClient();
  const suiAccount = useCurrentAccount();
  const address = suiAccount?.address; // Keep for now, might be useful for other non-role specific checks
  const { 
    executeTransaction, 
    isLoading: isTransactionLoading, 
    isCheckingCost, 
    estimatedCost, 
    checkTransactionCost 
  } = useManagedTransaction();
  const role = useContractRole(contract); // Call useContractRole

  const fetchContract = async () => {
    if (!id) return;
    try {
      const res = await getContracts(suiClient, id);
      setContract(res);

      if (res?.escrowId) {
        try {
          const escrowObject = await suiClient.getObject({ 
            id: res.escrowId,
            options: { showContent: true },
          });
          if (escrowObject?.data?.content?.dataType === 'moveObject') {
            const escrowFields = escrowObject.data.content.fields as any; // Use 'as any' for now to bypass strict type checking, will need actual type later
            setEscrow({
              balance: escrowFields.balance?.fields?.value ?? escrowFields.balance, // Attempt to access nested 'value' or direct balance
              status: escrowFields.status?.fields?.value ?? escrowFields.status, // Attempt to access nested 'value' or direct status
            });
          }
        } catch (e) {
          console.error("Error fetching escrow object", e);
        }
      }
    } catch (error) {
      console.error("Failed to fetch contract:", error);
      toast.error("Failed to load contract details.");
      setContract(null);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [id, suiClient]);

  useEffect(() => {
    const fetchContractActivity = async () => {
      if (!contract || !contract.objectId || !suiClient) {
        setEvents([]);
        return;
      }

      try {

        const txBlockResponses = await suiClient.queryTransactionBlocks({
          filter: { ChangedObject: contract.objectId }, 
          options: {
            showBalanceChanges: true, 
            showEffects: true,  
            showInput: true,     
          },
          limit: 200, 
          order: 'descending',
        });
        console.log("Transaction Block Responses:", txBlockResponses);

        let allEvents: SuiEvent[] = [];
        if (txBlockResponses.data) {
          txBlockResponses.data.forEach(txBlock => {
            if (txBlock.events) {
              allEvents.push(...txBlock.events);
            }
          });
        }

        // Filter events to ensure they are directly related to the current contract.
        // This assumes that relevant events emitted by the PactDA smart contract
        // will have a `contract_id` field in their `parsedJson` that matches
        // the `contract.objectId`. If this field name is different or not present
        // in all relevant events, this filter will need adjustment.
        // Other potential fields could be `pact_id`, or even `id` if it consistently refers to the contract object.
        // If no such consistent field exists, the ChangedObject filter at the queryTransactionBlocks level
        // is a broader but still useful filter.
        const filteredEvents = allEvents.filter(event => {
          return event.parsedJson && (
            event.parsedJson.contract_id === contract.objectId ||
            event.parsedJson.id === contract.objectId || // Some events might use 'id' for the contract
            event.parsedJson.contract === contract.objectId // Another possible field name
          );
        });
        
        filteredEvents.sort((a, b) => {
          const tsA = typeof a.timestampMs === 'string' ? parseInt(a.timestampMs, 10) : a.timestampMs ?? 0;
          const tsB = typeof b.timestampMs === 'string' ? parseInt(b.timestampMs, 10) : b.timestampMs ?? 0;
          return tsB - tsA;
        });

        // Process events for notifications
        filteredEvents.forEach(event => showNotificationForEvent(event));
        setEvents(filteredEvents);

      } catch (error) {
        console.error('Error fetching contract activity via transactions:', error);
        toast.error('Failed to fetch contract activity. See console for details.');
        setEvents([]);
      }
    };

    if (contract && contract.objectId) { 
      fetchContractActivity();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.objectId, suiClient]); // Removed contract from deps to avoid loop with setContract, fetchContract calls showNotification
                                     // Adding fetchContract here will also create a loop.
                                     // showNotificationForEvent and fetchContract are stable due to useCallback or being outside.
                                     // Re-evaluate if contract data (like title) is stale in notifications.

  const showNotificationForEvent = useCallback((event: SuiEvent) => {
    if (!contract || !role || !address) return;

    const eventId = event.id.txDigest + event.id.eventSeq;
    if (notifiedEventIds.current.has(eventId)) {
      return; // Already notified for this event
    }

    const eventTypeSuffix = event.type.split('::').pop() || '';
    let notificationMessage = '';
    let toastOptions: { action?: { label: string; onClick: () => void }; duration?: number, id?: string } = {
        duration: 10000,
        id: eventId, // Use eventId as toastId to prevent duplicates from sonner itself
        action: {
            label: 'View Contract',
            onClick: () => navigate(`/contract/${contract.objectId}`),
        },
    };

    // --- Define notification logic based on event type and user role ---
    // Placeholder: these event type suffixes need to match your actual smart contract events.
    // parsedJson fields are also assumptions.

    if (eventTypeSuffix.includes('ContractSigned')) { // General signed event
        const signingParty = event.parsedJson?.party_address || event.parsedJson?.signer; // Assuming 'party_address' or 'signer' in event
        if (signingParty === contract.partyA && role === ContractUserRole.PARTY_B && !contract.partyBSigned) {
            notificationMessage = `Contract '${contract.title}' has been signed by Party A. It's your turn to sign.`;
        } else if (signingParty === contract.partyB && role === ContractUserRole.PARTY_A && !contract.partyASigned) {
            notificationMessage = `Contract '${contract.title}' has been signed by Party B.`;
        }
    } else if (eventTypeSuffix.includes('ContractActive') || eventTypeSuffix.includes('ContractSubmitted')) {
        if (role === ContractUserRole.PARTY_A || role === ContractUserRole.PARTY_B) {
            notificationMessage = `Contract '${contract.title}' is now active.`;
        }
    } else if (eventTypeSuffix.includes('MilestoneSubmitted')) {
        const submittedBy = event.parsedJson?.submitted_by; // Assuming field
        const milestoneId = event.parsedJson?.milestone_id; // Assuming field
        const milestone = contract.milestones.find(m => m.id === milestoneId);
        const milestoneDesc = milestone?.description || `Milestone ID ${milestoneId}`;
        if (submittedBy && ((role === ContractUserRole.PARTY_A && submittedBy !== contract.partyA) || (role === ContractUserRole.PARTY_B && submittedBy !== contract.partyB))) {
            notificationMessage = `Milestone '${milestoneDesc}' for contract '${contract.title}' has been submitted for your approval.`;
        }
    } else if (eventTypeSuffix.includes('MilestoneApproved')) {
        const milestoneId = event.parsedJson?.milestone_id;
        const milestone = contract.milestones.find(m => m.id === milestoneId);
        const milestoneDesc = milestone?.description || `Milestone ID ${milestoneId}`;
        if (role === ContractUserRole.PARTY_A || role === ContractUserRole.PARTY_B) {
            notificationMessage = `Milestone '${milestoneDesc}' for contract '${contract.title}' has been approved.`;
        }
    } else if (eventTypeSuffix.includes('PaymentReleased')) {
        const milestoneId = event.parsedJson?.milestone_id;
        const recipient = event.parsedJson?.recipient; // Assuming field
        const milestone = contract.milestones.find(m => m.id === milestoneId);
        const milestoneDesc = milestone?.description || `Milestone ID ${milestoneId}`;
        if ((role === ContractUserRole.PARTY_A || role === ContractUserRole.PARTY_B) && recipient === address) {
            notificationMessage = `Payment for milestone '${milestoneDesc}' in contract '${contract.title}' has been released to you.`;
        } else if (role === ContractUserRole.PARTY_A || role === ContractUserRole.PARTY_B) {
            notificationMessage = `Payment for milestone '${milestoneDesc}' in contract '${contract.title}' has been released.`;
        }
    } else if (eventTypeSuffix.includes('DisputeRaised')) {
         if (role === ContractUserRole.PARTY_A || role === ContractUserRole.PARTY_B) {
            notificationMessage = `A dispute has been raised for contract '${contract.title}'.`;
        }
    }
    // Add more `else if` blocks for other event types...

    if (notificationMessage) {
      console.log("Showing toast for event:", eventTypeSuffix, "Message:", notificationMessage);
      toast.info(notificationMessage, toastOptions);
      notifiedEventIds.current.add(eventId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, role, address, navigate]); // Dependencies for showNotificationForEvent


  // Proof-of-Concept for suiClient.subscribeEvent
  useEffect(() => {
    if (!suiClient || !contract || !contract.objectId || !showNotificationForEvent) { // Added showNotificationForEvent
      return;
    }

    const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || "0xYOUR_PACKAGE_ID_FROM_ENV";
    const MODULE_NAME = import.meta.env.VITE_MODULE_NAME || "pactda";

    // Define a list of event types we are interested in for real-time updates.
    // These should be the fully qualified type names from your Move contract.
    // Example: `${PACKAGE_ID}::${MODULE_NAME}::ContractSignedEvent`
    // For PoC, using a generic placeholder. Replace with actual event type suffixes.
    const eventTypesToSubscribe = [
        // More specific if available:
        // `${PACKAGE_ID}::${MODULE_NAME}::ContractSignedByPartyA`,
        // `${PACKAGE_ID}::${MODULE_NAME}::ContractSignedByPartyB`,
        // `${PACKAGE_ID}::${MODULE_NAME}::ContractActive`,
        // `${PACKAGE_ID}::${MODULE_NAME}::MilestoneSubmitted`,
        // `${PACKAGE_ID}::${MODULE_NAME}::MilestoneApproved`,
        // `${PACKAGE_ID}::${MODULE_NAME}::PaymentReleased`,
        // `${PACKAGE_ID}::${MODULE_NAME}::DisputeRaised`,
        // Generic placeholder for demonstration if specific types are unknown:
        `${PACKAGE_ID}::${MODULE_NAME}::PactDaEvent`, // A generic parent event if one exists
    ];
    
    console.log(`Attempting to subscribe to events from package: ${PACKAGE_ID}::${MODULE_NAME}`);

    const unsubscribeFunctions: (() => void)[] = [];

    eventTypesToSubscribe.forEach(eventType => {
      (async () => {
        try {
          const unsubscribe = await suiClient.subscribeEvent({
            filter: { MoveEventType: eventType }, // Or use Package / Module filter if more appropriate
            onMessage: (event: SuiEvent) => {
              console.log(`Received real-time event (${eventType.split('::').pop()}):`, event);
              // Client-side filter to ensure the event is for the current contract
              if (event.parsedJson &&
                  (event.parsedJson.contract_id === contract.objectId ||
                   event.parsedJson.id === contract.objectId ||
                   event.parsedJson.contract === contract.objectId)) {
                
                showNotificationForEvent(event); // Use the centralized notification logic

                // Potentially re-fetch data if the event implies a state change not covered by existing fetches
                // Example: if a milestone is added by the other party.
                // fetchContract(); 
                // fetchContractActivity(); // To update the timeline immediately
              }
            },
          });
          console.log(`Subscribed to ${eventType}`);
          unsubscribeFunctions.push(unsubscribe);
        } catch (error) {
          console.error(`Error subscribing to ${eventType}:`, error);
          // Don't toast for subscription errors for generic PactDaEvent to avoid spam if it's too broad
          if (!eventType.endsWith("::PactDaEvent")) {
             toast.error(`Failed to subscribe to ${eventType.split("::").pop()} events.`);
          }
        }
      })();
    });

    return () => {
      unsubscribeFunctions.forEach(unsub => {
        try {
          unsub();
          console.log("Unsubscribed from an event stream.");
        } catch (error) {
          console.error("Error unsubscribing from event stream:", error);
        }
      });
    };
  }, [suiClient, contract?.objectId, showNotificationForEvent, fetchContract]); // Added showNotificationForEvent and fetchContract

  const formatDate = (timestampMs?: string | number | null): string => {
    if (!timestampMs) return 'Date N/A';
    const numericTimestamp = typeof timestampMs === 'string' ? parseInt(timestampMs, 10) : timestampMs;
    if (isNaN(numericTimestamp)) return 'Invalid Date';

    const date = new Date(numericTimestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getAgreementType = (value: number): string => {
    const agreement = agreementTypes.find((type) => type.value === value);
    return agreement ? agreement.key : 'Unknown Type';
  };

  const handleSignContract = async () => {
    if (!contract || !address) return;
    const { objectId, partyA, partyB } = contract;
    const isPartyA = address === partyA;
    const isPartyB = address === partyB;

    let txb;
    if (isPartyA) {
      txb = await buildSignContractAsPartyATx(objectId);
    } else if (isPartyB) {
      txb = await buildSignContractAsPartyBTx(objectId);
    } else {
      toast.error('You are not a party to this contract.');
      return;
    }

    // Check cost first
    const costDetails = await checkTransactionCost(txb);
    if (!costDetails || !costDetails.hasSufficientBalance) {
      // Toast for insufficient balance is handled by checkTransactionCost
      // or executeTransaction if called directly without prior check
      return; 
    }

    await executeTransaction({
      transaction: txb,
      loadingMessage: 'Processing signature...',
      successMessage: 'Contract signed successfully!',
      onSuccess: () => fetchContract(),
      onError: (error) => console.error('Error signing contract:', error),
      skipCostCheck: true, // Cost was already checked
    });
  };

  const handleSubmitContract = async () => {
    if (!contract || !address) return;
    const { objectId } = contract;

    const txb = await buildSubmitContractTx(objectId);

    // Check cost first
    const costDetails = await checkTransactionCost(txb);
    if (!costDetails || !costDetails.hasSufficientBalance) {
      return;
    }

    await executeTransaction({
      transaction: txb,
      loadingMessage: 'Submitting contract...',
      successMessage: 'Contract submitted successfully!',
      onSuccess: () => fetchContract(),
      onError: (error) => console.error('Error submitting contract:', error),
      skipCostCheck: true, // Cost was already checked
    });
  };

  // Placeholder functions for milestone actions - implement as needed
  const addMilestone = () => {
    toast.info('Add milestone functionality not yet implemented.');
  };

  const removeMilestone = (id: string) => {
    toast.info(`Remove milestone ${id} functionality not yet implemented.`);
  };

  const updateMilestone = (
    id: string,
    field: keyof Milestone, // Milestone should be defined in your types
    value: string,
  ) => {
    toast.info(
      `Update milestone ${id} field ${String(field)} to ${value} not yet implemented.`,
    );
  };

  if (!contract) {
    return (
      <div className="min-h-screen text-white p-4 md:p-8 flex justify-center items-center">
        <p>Loading contract details...</p>
        {/* You could add a spinner here */}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-4 md:p-8 justify-center flex-col">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-6 text-blue-400 hover:text-blue-300 transition cursor-pointer"
      >
        ← Back to contracts
      </button>
      <div className="flex flex-col items-center w-full">
        <motion.div
          className="w-full max-w-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="rounded-3xl shadow-2xl bg-gradient-to-br from-[#232946] via-[#1a1a2e] to-[#0f3460] border border-indigo-700/40 backdrop-blur-xl">
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
                  {/* Mobile Status Badge */}
                  <div className="flex flex-col items-center justify-start gap-4 md:hidden">
                    <ContractStatusBadge
                      status={contract.status as StatusKey}
                    />
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
                        {contract.contractStartDate
                          ? formatDate(contract.contractStartDate)
                          : '-'}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-semibold text-indigo-400/90 md:ml-4">
                        Deadline:
                      </span>
                      <span className="font-light text-white/90">
                        {contract.contractDeadlineDate
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
                  {/* Update Contract button visibility based on role and status */}
                  {contract.status === ContractStatus.Draft && role === ContractUserRole.PARTY_A && (
                      <div className="w-full md:w-50">
                        <button
                          className="w-full bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white rounded-xl px-6 py-2 text-base font-semibold shadow-lg transition mb-2 mt-4 pulse-effect"
                          onClick={() => navigate(`/contract/${contract.objectId}/edit`)}
                        >
                          ✏️ Update Contract
                        </button>
                      </div>
                    )}
                </div>
                {/* Desktop Status Badge */}
                <div className="hidden md:flex flex-col items-end justify-start gap-4">
                  <ContractStatusBadge
                    status={contract.status as StatusKey}
                  />
                </div>
              </div>

              {/* Responsive ActionsCard: show at top on mobile, right column on desktop */}
              {/* Mobile: ActionsCard at top */}
              <div className="block md:hidden mb-6">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-800/40 to-fuchsia-800/10 p-4 shadow-lg border border-indigo-700/20 flex flex-col gap-4">
                  <ActionsCard
                    contract={contract} // Pass the full contract object
                    onSign={handleSignContract}
                    onSubmit={handleSubmitContract}
                    isLoading={isTransactionLoading || isCheckingCost}
                    estimatedCost={estimatedCost?.gasEstimation}
                    canExecute={estimatedCost ? estimatedCost.hasSufficientBalance : true}
                  />
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
                        <span className="block font-mono text-white/90 text-base break-all">
                          {contract.partyB || '-'}
                        </span>
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
                      <span className="block text-white/90 text-base">
                        Balance: <span className="text-green-400">-</span> {/* TODO: Fetch escrow balance */}
                      </span>
                      <span className="block text-white/90 text-base">
                        Status: <span className="text-blue-400">-</span> {/* TODO: Fetch escrow status */}
                      </span>
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-900/30 to-emerald-700/10 p-6 shadow-lg border border-emerald-700/20">
                    <span className="block text-emerald-300/80 font-semibold mb-1">
                      Milestones
                    </span>
                    {Array.isArray(contract.milestones) &&
                      contract.milestones.length > 0 ? (
                      <ul className="list-disc list-inside text-white/90 text-base space-y-1">
                        {contract.milestones.map((milestone: Milestone, idx: number) => ( // Added explicit types
                          <li key={idx}>
                            <span className="font-semibold">
                              {milestone.description || '-'} {/* Changed from description_hash to description */}
                            </span>{' '}
                            -{' '}
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getMilestoneStatusStyle(milestone.status as MilestoneStatus)}`}
                            >
                              {getMilestoneStatusLabel(milestone.status as MilestoneStatus)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="block text-white/60 italic">- No milestones defined -</span>
                    )}
                  </div>

                  {/* Activity Timeline */}
                  <div className="rounded-2xl bg-gradient-to-br from-gray-800/30 to-gray-700/10 p-6 shadow-lg border border-gray-600/20">
                    <h3 className="text-xl font-semibold text-gray-300/80 mb-4">Activity Timeline</h3>
                    {events.length > 0 ? (
                      <ul className="space-y-4">
                        {events.map((event, index) => (
                          <li key={event.id.txDigest + event.id.eventSeq + index} className="p-3 bg-gray-700/20 rounded-lg shadow">
                            <p className="text-sm text-gray-400">
                              <span className="font-semibold text-sky-400">Event Type:</span> {event.type.split('::').pop()} <br />
                              <span className="font-semibold text-sky-400">Timestamp:</span> {formatDate(event.timestampMs)} <br />
                              <span className="font-semibold text-sky-400">Transaction:</span> <a href={`https://suiscan.xyz/testnet/tx/${event.id.txDigest}`} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">{event.id.txDigest.substring(0,10)}...</a>
                            </p>
                            {event.parsedJson && (
                              <details className="mt-2 text-xs text-gray-500">
                                <summary className="cursor-pointer hover:text-gray-300">View Details</summary>
                                <pre className="mt-1 p-2 bg-gray-900/50 rounded overflow-auto">
                                  {JSON.stringify(event.parsedJson, null, 2)}
                                </pre>
                              </details>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 italic">No contract-specific activity found.</p>
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
                  <div className="rounded-2xl bg-gradient-to-br from-indigo-800/40 to-fuchsia-800/10 p-4 shadow-lg border border-indigo-700/20 flex flex-col gap-4">
                    <ActionsCard
                      contract={contract} // Pass the full contract object
                      onSign={handleSignContract}
                      onSubmit={handleSubmitContract}
                      isLoading={isTransactionLoading || isCheckingCost}
                      estimatedCost={estimatedCost?.gasEstimation}
                      canExecute={estimatedCost ? estimatedCost.hasSufficientBalance : true}
                    />
                  </div>
                  {/* Estimated Cost Display - Desktop */}
                  {(isCheckingCost || estimatedCost) && 
                    (role === ContractUserRole.PARTY_A || role === ContractUserRole.PARTY_B) && // Show cost only if user is a party
                    (contract.status === ContractStatus.Draft || contract.status === ContractStatus.Pending) && // And contract is in a state where action is possible
                    (
                     <div className="mt-2 text-sm text-center text-indigo-300/80">
                       {isCheckingCost && "Calculating cost..."}
                       {estimatedCost && !isCheckingCost && (
                         `Est. Cost: ${estimatedCost.gasEstimation} SUI. Your Balance: ${estimatedCost.userBalance} SUI.`
                       )}
                       {estimatedCost && !estimatedCost.hasSufficientBalance && !isCheckingCost && (
                         <span className="text-red-400 block"> Insufficient balance for this transaction.</span>
                       )}
                     </div>
                  )}
                  <div className="rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-700/10 p-4 shadow-lg border border-gray-700/20">
                    <span className="block text-gray-300/80 font-semibold mb-1">
                      Activity Timeline
                    </span>
                    {events.length > 0 ? (
                      <ul className="space-y-2 mt-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                        {events.map((event) => (
                          <li key={`${event.id.txDigest}-${event.id.eventSeq}`} className="text-xs p-2.5 bg-gray-700/50 rounded-lg shadow-md hover:bg-gray-700/70 transition-colors duration-150">
                            <div className="flex justify-between items-start mb-1.5">
                              <span className="font-semibold text-indigo-300 break-all mr-2">
                                {event.type.split('::').pop() || 'Event'}
                              </span>
                              {event.timestampMs && (
                                <span className="text-white/60 text-[0.7rem] flex-shrink-0 whitespace-nowrap">
                                  {new Date(parseInt(event.timestampMs)).toLocaleString()}
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
                      <span className="block text-white/60 italic mt-2">- No activity events found. -</span>
                    )}
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
