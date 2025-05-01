import { WalletKitProvider } from '@mysten/wallet-kit'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected } from '@wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
  },
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletKitProvider>
        <WagmiProvider config={wagmiConfig}>
            {children}
        </WagmiProvider>
      </WalletKitProvider>
    </QueryClientProvider>
  )
}
