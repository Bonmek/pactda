import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { toast } from 'sonner';
import { useState, useCallback } from 'react';
import { estimateTransactionCost } from '@/service/PactdaService';
import { mapContractError } from '@/lib/errorUtils'; // Import the new error mapping function

export interface ExecuteTransactionOptions {
  transaction: Transaction;
  loadingMessage?: string;
  successMessage?: string;
  onSuccess?: (result: SuiTransactionBlockResponse) => void;
  onError?: (error: any) => void;
  skipCostCheck?: boolean; // Option to skip cost check if already done
}

export interface TransactionCostEstimate {
  gasEstimation: string;
  hasSufficientBalance: boolean;
  userBalance: string;
  rawTotalCost: bigint;
}

export function useManagedTransaction() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCost, setIsCheckingCost] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<TransactionCostEstimate | null>(null);

  const checkTransactionCost = useCallback(
    async (transaction: Transaction, userAddress?: string): Promise<TransactionCostEstimate | null> => {
      const address = userAddress || currentAccount?.address;
      if (!address) {
        toast.error('Wallet address not found. Cannot estimate cost.');
        return null;
      }
      if (!suiClient) {
        toast.error('Sui client not available. Cannot estimate cost.');
        return null;
      }

      setIsCheckingCost(true);
      setEstimatedCost(null); // Reset previous estimate
      try {
        const costResult = await estimateTransactionCost(suiClient, transaction, address);
        setEstimatedCost(costResult);
        if (costResult && !costResult.hasSufficientBalance) {
          toast.warning(
            `Insufficient balance. Est. cost: ${costResult.gasEstimation} SUI, Your balance: ${costResult.userBalance} SUI`
          );
        }
        setIsCheckingCost(false);
        return costResult;
      } catch (error) {
        console.error('Error during cost estimation:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to estimate transaction cost.');
        setIsCheckingCost(false);
        setEstimatedCost(null);
        return null;
      }
    },
    [suiClient, currentAccount?.address]
  );

  const executeTransaction = async ({
    transaction,
    loadingMessage = 'Processing transaction...',
    successMessage = 'Transaction successful!',
    onSuccess,
    onError,
    skipCostCheck = false, // Default to false
  }: ExecuteTransactionOptions): Promise<SuiTransactionBlockResponse | null> => {
    setIsLoading(true);

    if (!currentAccount?.address) {
      toast.error('Wallet not connected or address unavailable.');
      setIsLoading(false);
      if (onError) onError(new Error('Wallet not connected.'));
      return null;
    }

    // Perform cost check if not skipped and not already performed or if estimate is missing
    if (!skipCostCheck || !estimatedCost) {
      const costDetails = await checkTransactionCost(transaction, currentAccount.address);
      if (!costDetails || !costDetails.hasSufficientBalance) {
        // Toast for insufficient balance is handled by checkTransactionCost
        setIsLoading(false);
        if (onError) onError(new Error('Insufficient balance or cost estimation failed.'));
        return null;
      }
    } else if (estimatedCost && !estimatedCost.hasSufficientBalance) {
      // If cost was checked (skipCostCheck=true) but was insufficient
      toast.warning(
        `Insufficient balance. Est. cost: ${estimatedCost.gasEstimation} SUI, Your balance: ${estimatedCost.userBalance} SUI`
      );
      setIsLoading(false);
      if (onError) onError(new Error('Insufficient balance.'));
      return null;
    }

    // Proceed with transaction
    try {
      const result = await signAndExecuteTransaction({ transaction });
      if (!result.digest) {
        throw new Error('Transaction succeeded but no digest was returned.');
      }

      const transactionResult = await toast.promise(
        suiClient.waitForTransaction({
          digest: result.digest,
          options: { showEffects: true },
        }),
        {
          loading: loadingMessage,
          success: (data) => {
            if (onSuccess) {
              onSuccess(data);
            }
            setEstimatedCost(null); // Reset cost after successful transaction
            return successMessage;
          },
          error: (err: any) => { // Added 'any' type for err to inspect its properties
            console.error("Transaction execution error (raw):", err);

            let contractErrorMessage = err.message || 'Transaction execution failed.';

            // Attempt to extract a more specific error message from the error object
            // This structure depends on how SUI/dApp-kit surfaces errors from waitForTransaction
            // For `dryRunTransactionBlock`, it's often in `err.effects.status.error`
            // For `signAndExecuteTransaction` followed by `waitForTransaction`, the error from `waitForTransaction`
            // might be a string directly, or an object with details.
            // If the error object `err` from `waitForTransaction` (which `toast.promise` handles)
            // has a specific field for the Move abort message, use that.
            // Example based on common patterns for Sui errors:
            if (typeof err === 'string') {
                contractErrorMessage = err;
            } else if (err.effects && err.effects.status && err.effects.status.error) {
              // This is typical for dryRun errors, but waitForTransaction might wrap it differently
              contractErrorMessage = err.effects.status.error;
            } else if (err.message) {
                // Fallback to err.message if it exists
                contractErrorMessage = err.message;
            }
            // If contractErrorMessage itself is an object/array (less common for final error string), stringify it.
            if (typeof contractErrorMessage !== 'string') {
                contractErrorMessage = JSON.stringify(contractErrorMessage);
            }
            
            const friendlyMessage = mapContractError(contractErrorMessage);
            
            if (onError) { // Call original onError if provided by the consuming component
              onError(err); 
            }
            return friendlyMessage; // This message will be displayed by the toast
          },
        }
      );
      setIsLoading(false);
      return transactionResult;
    } catch (error: any) { // Added 'any' type for broader error object inspection
      setIsLoading(false);
      console.error('Outer Transaction Error (error during signAndExecuteTransaction or setup):', error);
      
      // If the error is from signAndExecute (before waitForTransaction), it might also contain useful info
      let outerErrorMessage = 'An unexpected error occurred during transaction preparation.';
      if (error instanceof Error) {
        outerErrorMessage = error.message;
      } else if (typeof error === 'string') {
        outerErrorMessage = error;
      }

      // Try to map this error as well, as it might be a contract issue caught earlier
      const friendlyOuterMessage = mapContractError(outerErrorMessage);

      toast.error(friendlyOuterMessage);
      
      if (onError) {
        onError(error);
      }
      setEstimatedCost(null); // Also reset on outer error
      return null;
    }
  };

  return { 
    executeTransaction, 
    isLoading, 
    isCheckingCost, 
    estimatedCost, 
    checkTransactionCost 
  };
}
