import { useEffect, useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import type { PactDaContract } from '@/@types/PactDaContract';
import { getContractDetail, signContract, submitContract, fundEscrow, refundEscrow } from '@/service/PactdaContractActions';

export function useWalletBalance(address, suiClient) {
  const [balance, setBalance] = useState(0n);

  useEffect(() => {
    if (!address || !suiClient) {
      setBalance(0n);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const coins = await suiClient.getCoins({ owner: address, coinType: '0x2::sui::SUI' });
        const total = coins.data.reduce((sum, c) => sum + BigInt(c.balance), 0n);
        if (!cancelled) setBalance(total);
      } catch (e) {
        if (!cancelled) setBalance(0n);
      }
    })();
    return () => { cancelled = true; };
  }, [address, suiClient]);

  return balance;
}

interface EscrowInfo {
  balance?: any;
  status?: any;
}

interface UseContractActionsParams {
  contract: PactDaContract | null;
  escrow?: EscrowInfo | null;
  setContract: (c: PactDaContract | null) => void;
  setShowFundModal: (b: boolean) => void;
  setFunding: (b: boolean) => void;
  walletBalance: bigint;
  setShowRefundModal: (b: boolean) => void;
}

export function useContractActions({ contract, escrow, setContract, setShowFundModal, setFunding, walletBalance, setShowRefundModal }: UseContractActionsParams) {
  const suiClient = useSuiClient();
  const suiAccount = useCurrentAccount();
  const address = suiAccount?.address;
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const handleSignContract = async () => {
    if (!contract || !address) return;
    await signContract(contract, address, signAndExecuteTransaction, suiClient, async () => setContract(await getContractDetail(suiClient, contract.objectId)));
  };
  const handleSubmitContract = async () => {
    if (!contract || !address) return;
    await submitContract(contract, signAndExecuteTransaction, suiClient, suiAccount, async () => setContract(await getContractDetail(suiClient, contract.objectId)));
  };

  const handleFundEscrow = async (amountStr: string) => {
    if (!contract || !address) return;
    setFunding(true);
    try {
      await fundEscrow(contract, address, amountStr, walletBalance, signAndExecuteTransaction, suiClient, async () => setContract(await getContractDetail(suiClient, contract.objectId)), setShowFundModal);
    } finally {
      setFunding(false);
    }
  };

  const handleRefundEscrow = async () => {
    if (!contract || !address || !contract.escrowId) return;
    await refundEscrow(
      contract,
      contract.escrowId,
      address,
      signAndExecuteTransaction,
      suiClient,
      async () => setContract(await getContractDetail(suiClient, contract.objectId)),
      setShowRefundModal
    );
  };

  // Escrow status logic
  // Assume escrow.status === 'refunded' or 2 means refunded, 1 means funded, 0 means not funded
  const escrowStatus = escrow?.status;
  const isRefunded = escrowStatus === 'refunded' || escrowStatus === 2;
  const isFunded = escrowStatus === 'funded' || escrowStatus === 1;

  // Show fund button if escrow is not funded or has been refunded
  const showFundEscrowButton = !contract?.escrowId || isRefunded;
  // Show refund button if escrow is funded and not refunded
  const showRefundEscrowButton = !!contract?.escrowId && isFunded && !isRefunded && contract?.status === 2; //contract = active

  return { handleSignContract, handleSubmitContract, handleFundEscrow, handleRefundEscrow, showFundEscrowButton, showRefundEscrowButton };
}

