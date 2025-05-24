import React, { useEffect, useState } from 'react';
import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface ContractActionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmed: (result: any) => void;
  transactionBlock: any; // TransactionBlock instance
  title?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  escrowAmount?: number | null; // Amount to be escrowed
  escrowAction?: 'refund' | 'fund'; // Action type for escrow
}

const ContractActionConfirmationModal: React.FC<ContractActionConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmed,
  transactionBlock,
  title = 'Confirm Action',
  children,
  confirmLabel = 'Confirm',
  escrowAction,
  escrowAmount
}) => {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);
  const [gasLoading, setGasLoading] = useState(false);
  const [gasError, setGasError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
    const address = currentAccount?.address

    const [currentBalance, setCurrentBalance] = useState<string | null>(null)
    const [balanceLoading, setBalanceLoading] = useState(false)
  
    useEffect(() => {
      const fetchBalance = async () => {
        if (address) {
          setBalanceLoading(true)
          try {
            const coinBalance = await suiClient.getBalance({ owner: address })
            setCurrentBalance((Number(coinBalance.totalBalance) / 1e9).toFixed(6))
          } catch (e) {
            setCurrentBalance(null)
          } finally {
            setBalanceLoading(false)
          }
        } else {
          setCurrentBalance(null)
        }
      }
      fetchBalance()
    }, [address, suiClient])

  useEffect(() => {
    const estimateGas = async () => {
      if (!transactionBlock || !currentAccount?.address) return;
      setGasLoading(true);
      setGasError(null);
      setEstimatedGas(null);
      try {
        transactionBlock.setSenderIfNotSet(currentAccount.address);
        const dryRunBytes = await transactionBlock.build({ client: suiClient });
        const dryRunResult = await suiClient.dryRunTransactionBlock({ transactionBlock: dryRunBytes });
        if (dryRunResult.effects && dryRunResult.effects.gasUsed) {
          const { computationCost, storageCost, storageRebate } = dryRunResult.effects.gasUsed;
          const totalMist = BigInt(computationCost) + BigInt(storageCost) - BigInt(storageRebate);
          setEstimatedGas(`${(Number(totalMist) / 1e9).toFixed(6)} SUI`);
        } else {
          setEstimatedGas(null);
          setGasError('Could not estimate gas.');
        }
      } catch (err) {
        setGasError('Failed to estimate gas.');
        setEstimatedGas(null);
      } finally {
        setGasLoading(false);
      }
    };
    if (isOpen) estimateGas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transactionBlock, currentAccount?.address]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const result = await signAndExecuteTransaction({ transaction: transactionBlock });
      onConfirmed(result);
    } catch (e) {
      // error handled in parent
    } finally {
      setConfirming(false);
      onClose();
    }
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={title}
      isLoading={gasLoading  || balanceLoading}
      currentBalance={currentBalance}
      isConfirming={confirming}
      estimatedGas={estimatedGas}
      gasCalculationError={gasError}
      escrowAction={escrowAction}
        escrowAmount={escrowAmount}
    >
      {children}
      {/* You can add more details here if needed */}
    </ConfirmationModal>
  );
};

export default ContractActionConfirmationModal;
