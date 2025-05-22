import { motion } from 'framer-motion';
import {
  buildSignContractAsPartyATx,
  buildSubmitContractTx,
  getContracts,
} from '@/service/PactdaService';
import { useEffect, useState } from 'react';
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit';
import { PactDaContract } from '@/@types/PactDaContract';
import { useNavigate, useParams } from 'react-router-dom';
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
  const [events, setEvents] = useState<SuiEvent[]>([]);
  const [escrow, setEscrow] = useState<{ balance: any; status: any } | null>(null);
  const suiClient = useSuiClient();
  const suiAccount = useCurrentAccount();
  const address = suiAccount?.address;
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

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

        const allEvents: SuiEvent[] = [];
        if (txBlockResponses.data) {
          txBlockResponses.data.forEach(txBlock => {
            if (txBlock.events) {
              allEvents.push(...txBlock.events);
            }
          });
        }

        allEvents.sort((a, b) => {
          const tsA = typeof a.timestampMs === 'string' ? parseInt(a.timestampMs, 10) : a.timestampMs ?? 0;
          const tsB = typeof b.timestampMs === 'string' ? parseInt(b.timestampMs, 10) : b.timestampMs ?? 0;
          return tsB - tsA;
        });

        setEvents(allEvents);


      } catch (error) {
        console.error('Error fetching contract activity via transactions:', error);
        toast.error('Failed to fetch contract activity. See console for details.');
        setEvents([]);
      }
    };

    if (contract && contract.objectId) { 
      fetchContractActivity();
    }
  }, [contract, suiClient]); 

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

    try {
      let txb;
      if (isPartyA) {
        txb = await buildSignContractAsPartyATx(objectId);
      } else if (isPartyB) {
        txb = await buildSignContractAsPartyATx(objectId); 
      } else {
        toast.error('You are not a party to this contract.');
        return;
      }

      const result = await signAndExecuteTransaction({ transaction: txb });
      if (!result.digest) {
        toast.error('Transaction succeeded but no digest was returned');
        return;
      }

      toast.promise(
        suiClient.waitForTransaction({
          digest: result.digest,
          options: { showEffects: true },
        }),
        {
          loading: 'Processing signature...', 
          success: () => {
            fetchContract(); 
            return 'Contract signed successfully!';
          },
          error: 'Error processing signature.',
        }
      );
    } catch (error) {
      toast.error('Error signing contract');
      console.error('Error signing contract:', error);
    } 
  };

  const handleSubmitContract = async () => {
    if (!contract || !address) return;
    const { objectId } = contract;
    try {
      const txb = await buildSubmitContractTx(objectId);
      const result = await signAndExecuteTransaction({ transaction: txb });
      if (!result.digest) {
        toast.error('Transaction succeeded but no digest was returned');
        return;
      }
      toast.promise(
        suiClient.waitForTransaction({
          digest: result.digest,
          options: { showEffects: true },
        }),
        {
          loading: 'Submitting contract...',
          success: () => {
            fetchContract();
            return 'Contract submitted successfully!';
          },
          error: 'Error submitting contract.',
        }
      );
    } catch (error) {
      toast.error('Error submitting contract');
      console.error('Error submitting contract:', error);
    }
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
                  {contract.status === 0 && // Assuming 0 is a 'Draft' or 'Updatable' status
                    address === contract.partyA && (
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
                    onSign={handleSignContract}
                    status={contract.status}
                    address={address!} // address is checked in handleSignContract, but good to be explicit if possible
                    partyA={contract.partyA}
                    partyB={contract.partyB} // Added missing prop
                    partyASigned={contract.partyASigned} // Added missing prop
                    partyBSigned={contract.partyBSigned} // Added missing prop
                    onSubmit={handleSubmitContract} // Added missing prop
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
                            <span className="text-emerald-400">
                              {milestone.status || '-'}
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
                      onSign={handleSignContract}
                      status={contract.status}
                      address={address!} // address is checked in handleSignContract
                      partyA={contract.partyA}
                      partyB={contract.partyB}
                      partyASigned={contract.partyASigned}
                      partyBSigned={contract.partyBSigned}
                      onSubmit={handleSubmitContract}
                    />
                  </div>
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
