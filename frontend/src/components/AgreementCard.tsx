import { cn } from '@/lib/utils';
import { AgreementData } from '@/types/agreement';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface AgreementCardProps {
    agreement: AgreementData;
}

export default function AgreementCard({ agreement }: AgreementCardProps) {
    const {
        title,
        status,
        type,
        deadline,
        otherParty,
        yourRole,
        value,
        action,
    } = agreement;

    // Status badge styling
    const getBadgeVariant = () => {
        switch (status) {
            case 'active':
                return 'bg-green-500/10 text-green-400 hover:bg-green-500/20';
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20';
            case 'completed':
                return 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20';
            case 'cancelled':
                return 'bg-red-500/10 text-red-400 hover:bg-red-500/20';
            case 'draft':
            default:
                return 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20';
        }
    };

    // Status text
    const getStatusText = () => {
        switch (status) {
            case 'active':
                return 'ACTIVE';
            case 'pending':
                return 'PENDING SIGNATURES';
            case 'draft':
                return 'DRAFT';
            default:
                return status.toUpperCase();
        }
    };

    // Button styling based on status
    const getButtonVariant = () => {
        switch (status) {
            case 'active':
                return 'bg-blue-500 hover:bg-blue-600';
            case 'pending':
                return 'bg-purple-600 hover:bg-purple-700';
            case 'draft':
                return 'bg-gray-600 hover:bg-gray-700';
            default:
                return 'bg-blue-500 hover:bg-blue-600';
        }
    };

    return (
        <motion.div 
            className="h-full flex flex-col bg-[#111936] rounded-lg p-6 border border-[#1a2948]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ 
                y: -4,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                transition: { 
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1]
                }
            }}
            transition={{
                opacity: { duration: 0.3 },
                y: { 
                    type: 'spring',
                    stiffness: 300,
                    damping: 20
                }
            }}
        >
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-semibold text-blue-200 mr-4 line-clamp-2">{title}</h2>
                    <Badge className={cn('uppercase text-xs font-bold px-3 py-1 flex-shrink-0', getBadgeVariant())}>
                        {getStatusText()}
                    </Badge>
                </div>

                <div className="space-y-3 mb-6 text-sm text-gray-300 flex-grow">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-right">{type}</span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-gray-400">Deadline:</span>
                        <span className={cn(
                            "font-medium",
                            deadline === 'Overdue' ? 'text-red-400' : ''
                        )}>
                            {deadline}
                        </span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-gray-400">Other Party:</span>
                        <span className="flex items-center max-w-[60%] text-right">
                            <span className="h-2 w-2 rounded-full bg-gray-400 mr-2 flex-shrink-0"></span>
                            <span className="truncate">{otherParty.displayName}</span>
                        </span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-gray-400">Your Role:</span>
                        <span className="text-right">{yourRole}</span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-gray-400">Value:</span>
                        <span className="font-medium text-blue-300">{value}</span>
                    </div>
                </div>

                <div className="mt-auto pt-2">
                    <Button
                        className={cn('w-full', getButtonVariant())}
                        variant="default"
                        size="sm"
                    >
                        {action}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}