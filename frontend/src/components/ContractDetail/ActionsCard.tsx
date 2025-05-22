import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import DetailSection from './DetailSection';
import { useContractRole, ContractUserRole } from '@/hooks/useContractRole';
import { PactDaContract } from '@/@types/PactDaContract'; // Adjust path as necessary
import { ContractStatus } from '@/types/pactDa'; // Adjust path as necessary

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface ActionsCardProps {
  contract: PactDaContract | null;
  onSign: () => void;
  onSubmit: () => void;
  isLoading?: boolean;
  estimatedCost?: string | null;
  canExecute?: boolean;
}

const ActionsCard: React.FC<ActionsCardProps> = ({
  contract,
  onSign,
  onSubmit,
  isLoading = false,
  estimatedCost = null,
  canExecute = true,
}) => {
  const role = useContractRole(contract);

  if (!contract) {
    return (
      <motion.div variants={itemVariants}>
        <DetailSection title="Actions">
          <p className="text-sm text-gray-400 text-center">Contract details not available.</p>
        </DetailSection>
      </motion.div>
    );
  }

  const { status, partyASigned, partyBSigned } = contract;

  // Determine if the current user (based on role) has already signed
  const currentUserHasSigned = 
    (role === ContractUserRole.PARTY_A && partyASigned) ||
    (role === ContractUserRole.PARTY_B && partyBSigned);

  // Conditions for showing specific buttons
  const canSubmitAsPartyA = role === ContractUserRole.PARTY_A && status === ContractStatus.Draft;
  const canSign = status === ContractStatus.Pending; // Broadened from PendingSignature
                                                        // Assuming Pending means pending signatures

  const disableActions = isLoading || !canExecute || (canSign && currentUserHasSigned);

  return (
    <motion.div variants={itemVariants}>
      <DetailSection title="Actions">
        <div className="space-y-3">
          {canSubmitAsPartyA && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
              onClick={onSubmit}
              disabled={disableActions}
            >
              {isLoading ? 'Processing...' : 'Submit Contract'}
            </Button>
          )}

          {canSign && (role === ContractUserRole.PARTY_A || role === ContractUserRole.PARTY_B) && (
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
              onClick={onSign}
              disabled={disableActions}
            >
              {isLoading
                ? 'Processing...'
                : currentUserHasSigned
                  ? 'Already Signed'
                  : `Sign as ${role === ContractUserRole.PARTY_A ? 'Party A' : 'Party B'}`}
            </Button>
          )}

          {!canSubmitAsPartyA && !canSign && (
            <p className="text-sm text-gray-400 text-center">
              No actions available for your role ({role}) or current contract status ({status}).
            </p>
          )}
           {(canSubmitAsPartyA || (canSign && (role === ContractUserRole.PARTY_A || role === ContractUserRole.PARTY_B))) && estimatedCost && !isLoading && (
            <p className="text-xs text-indigo-300/70 text-center mt-1">
              Est. Cost: {estimatedCost} SUI
            </p>
          )}
          {(canSubmitAsPartyA || (canSign && (role === ContractUserRole.PARTY_A || role === ContractUserRole.PARTY_B))) && !canExecute && !isLoading && (
            <p className="text-xs text-red-400 text-center mt-1">
              Insufficient balance for this action.
            </p>
          )}
        </div>
      </DetailSection>
    </motion.div>
  );
};

export default ActionsCard;
