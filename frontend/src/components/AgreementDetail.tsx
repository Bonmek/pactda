import { useNavigate, useParams, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { mockAgreements } from '../mocks/agreements';
import type { AgreementData } from '../types/agreement';

type PartyType = {
    role: string;
    address: string;
    status: string;
};

type MilestoneType = {
    id: number;
    title: string;
    value: string;
    deadline: string;
    status: string;
    proof: string;
};

export default function AgreementDetail() {
    const navigate = useNavigate();
    const { id } = useParams();

    // Find agreement by id (as string)
    const agreement = mockAgreements.find((a: AgreementData) => String(a.id) === String(id));

    if (!agreement) {
        return (
            <div className="min-h-screen bg-[#0c1225] text-white p-6 flex items-center justify-center">
                <div className="text-lg text-red-400">Agreement not found.</div>
            </div>
        );
    }

    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.key}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50, transition: { duration: 0.3 } }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                className="min-h-screen bg-gradient-to-br from-[#0c1225] via-[#131a36] to-[#1a2247] text-white p-6 px-10 rounded-lg"
            >
                <Button
                    variant="ghost"
                    className="mb-8 text-gray-400 hover:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    onClick={() => navigate('/dashboard')}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                </Button>

                <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
                    <h1 className="text-3xl font-bold text-[#a9b8fa] tracking-tight leading-tight drop-shadow-md">
                        {agreement.title}
                    </h1>
                    <Badge className="bg-gradient-to-r from-blue-700 to-blue-400 text-white uppercase shadow-md px-4 py-2 text-sm tracking-wider">
                        {agreement.status}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-[#111936]/90 rounded-2xl p-8 shadow-2xl border border-blue-800/40 backdrop-blur-md transition-all duration-300 hover:scale-[1.01]">
                            <h2 className="text-lg font-bold uppercase tracking-widest text-blue-200 mb-6 border-b border-blue-800/30 pb-2 flex items-center gap-2">
                                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                                Contract Details
                            </h2>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Type:</span>
                                    <span className="font-semibold text-blue-100">{agreement.type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Start:</span>
                                    <span className="text-blue-100">{(agreement as any).startDate || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Deadline:</span>
                                    <span className="text-blue-100">{agreement.deadline}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">ID:</span>
                                    <span className="font-mono text-xs text-blue-300">{(agreement as any).contractId || agreement.id}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1a2247]/70 rounded-2xl p-8 shadow-lg border border-yellow-600/20 backdrop-blur-md transition-all duration-300 hover:scale-[1.01]">
                            <h2 className="text-lg font-bold uppercase tracking-widest text-yellow-300 mb-6 border-b border-yellow-700/20 pb-2 flex items-center gap-2">
                                <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full"></span>
                                Parties
                            </h2>
                            <div className="space-y-4">
                                {(agreement as any).parties?.map((party: PartyType, index: number) => (
                                    <div key={index} className="flex justify-between items-center bg-[#232e4a]/50 rounded-lg px-4 py-3 shadow-inner border border-yellow-900/10">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-yellow-200 font-bold flex items-center gap-2">
                                                <svg className="inline w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /></svg>
                                                {party.role}
                                            </span>
                                            <span className="font-mono text-xs text-yellow-300 mt-1">{party.address}</span>
                                        </div>
                                        <Badge className={party.status === 'Signed' ? 'bg-green-600' : 'bg-yellow-600'}>{party.status}</Badge>
                                    </div>
                                )) || <div className="text-gray-500">No parties info.</div>}
                            </div>
                        </div>

                        <div className="bg-[#232e4a]/80 rounded-2xl p-8 shadow-lg border border-purple-700/30 backdrop-blur-md transition-all duration-300 hover:scale-[1.01]">
                            <h2 className="text-lg font-bold uppercase tracking-widest text-purple-300 mb-6 border-b border-purple-700/20 pb-2 flex items-center gap-2">
                                <span className="inline-block w-2 h-2 bg-purple-400 rounded-full"></span>
                                Milestones
                            </h2>
                            {(agreement as any).milestones?.map((milestone: MilestoneType, index: number) => (
                                <div key={index} className="relative border-l-4 border-purple-500/70 pl-6 pb-8 last:pb-0 group">
                                    <div className="absolute -left-2 top-2 w-4 h-4 bg-purple-400 rounded-full border-2 border-white group-hover:scale-110 transition-transform"></div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-semibold text-purple-100 flex items-center gap-2">
                                            <svg className="inline w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M8 11h8" /></svg>
                                            {milestone.title}
                                        </h3>
                                        <Badge className={milestone.status === 'COMPLETED' ? 'bg-green-600' : milestone.status === 'IN_PROGRESS' ? 'bg-yellow-600' : 'bg-purple-600'}>{milestone.status}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">Value:</span>
                                            <span className="ml-2 text-purple-100">{milestone.value}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Deadline:</span>
                                            <span className="ml-2 text-purple-100">{milestone.deadline}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-400">Proof:</span>
                                            <span className="ml-2 text-gray-400 italic">{milestone.proof}</span>
                                        </div>
                                    </div>
                                </div>
                            )) || <div className="text-gray-500">No milestones info.</div>}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-[#111936] rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-blue-200 mb-4">Actions</h2>
                            <Button className="w-full bg-blue-500 hover:bg-blue-600 mb-3">
                                Send for Review
                            </Button>
                        </div>

                        <div className="bg-[#111936] rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-blue-200 mb-4">Escrow</h2>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status:</span>
                                    <span className="text-yellow-500">{(agreement as any).escrow?.status || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Value:</span>
                                    <span>{(agreement as any).escrow?.totalValue || agreement.value}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Funded by:</span>
                                    <span className="text-gray-500">{(agreement as any).escrow?.fundedBy || '-'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#111936] rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-blue-200 mb-4">Activity Timeline</h2>
                            <div className="space-y-4">
                                {(agreement as any).activity?.map((event: { date: string; description: string }, index: number) => (
                                    <div key={index} className="border-l-2 border-blue-500 pl-4 pb-4">
                                        <div className="text-sm text-gray-400">{event.date}</div>
                                        <div className="mt-1">{event.description}</div>
                                    </div>
                                )) || <div className="text-gray-500">No activity info.</div>}
                            </div>
                            {/* TODO: For full UX, add a detailed agreement in mockAgreements with all fields used here. */}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}