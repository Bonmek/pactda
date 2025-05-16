import '@mysten/dapp-kit/dist/index.css'

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected } from '@wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getFullnodeUrl } from '@mysten/sui/client'
import { AuthProvider } from './contexts/AuthContext'

const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
  },
});

const networks = {
  devnet: { url: getFullnodeUrl('devnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
}

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider  autoConnect={true}>
          <WagmiProvider config={wagmiConfig}>
            <AuthProvider>{children}</AuthProvider>
          </WagmiProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}