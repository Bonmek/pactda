import { useCurrentAccount } from '@mysten/dapp-kit'
import { useAccount } from 'wagmi'
import { useAuth } from '@/contexts/AuthContext'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'

export type WalletType = 'sui' | 'okx' | 'solana' | 'google' | 'facebook' | null

export function useCrossChainWallet() {
  // Sui
  const suiAccount = useCurrentAccount()
  // EVM (OKX)
  const { address: ethAddress, isConnected: isEthConnected } = useAccount()
  // zkLogin
  const { zkloginAddress } = useAuth()
  // Solana
  let solanaAddress: string | null = null
  let isSolanaConnected = false
  try {
    const solanaWallet = useSolanaWallet()
    if (solanaWallet && solanaWallet.connected && solanaWallet.publicKey) {
      solanaAddress = solanaWallet.publicKey.toBase58()
      isSolanaConnected = true
    }
  } catch {}

  // Detect which wallet is connected and return address/type
  if (suiAccount) {
    return { walletType: 'sui' as WalletType, address: suiAccount.address }
  }
  if (isEthConnected && ethAddress) {
    return { walletType: 'okx' as WalletType, address: ethAddress }
  }
  if (isSolanaConnected && solanaAddress) {
    return { walletType: 'solana' as WalletType, address: solanaAddress }
  }
  if (zkloginAddress) {
    // Could distinguish google/facebook if needed
    return { walletType: 'google' as WalletType, address: zkloginAddress }
  }
  return { walletType: null, address: null }
}
