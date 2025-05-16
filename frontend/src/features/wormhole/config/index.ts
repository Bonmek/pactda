import { ChainConfig, SupportedToken, SupportedNFTCollection } from '../types';

// Chain configurations using environment variables
export const CHAINS: Record<number, ChainConfig> = {
  // Sui Chain
  [Number(import.meta.env.VITE_CHAIN_ID_SUI)]: {
    name: 'Sui',
    rpc: import.meta.env.VITE_SUI_RPC || 'https://fullnode.testnet.sui.io',
    wormholeChainId: Number(import.meta.env.VITE_CHAIN_ID_SUI),
    nativeChainId: 0, // Sui doesn't have a traditional chain ID system
    bridgeAddress: import.meta.env.VITE_WORMHOLE_BRIDGE_ADDRESS_SUI || '',
    tokenBridgeAddress: import.meta.env.VITE_WORMHOLE_TOKEN_BRIDGE_SUI || '',
    nftBridgeAddress: import.meta.env.VITE_WORMHOLE_NFT_BRIDGE_SUI || '',
    explorerUrl: 'https://explorer.sui.io/txblock/',
  },
  // Ethereum (Goerli) Chain
  [Number(import.meta.env.VITE_CHAIN_ID_ETH)]: {
    name: 'Ethereum Goerli',
    rpc: import.meta.env.VITE_ETH_RPC || '',
    wormholeChainId: Number(import.meta.env.VITE_CHAIN_ID_ETH),
    nativeChainId: 5, // Goerli chainId
    bridgeAddress: import.meta.env.VITE_WORMHOLE_BRIDGE_ADDRESS_ETH || '',
    tokenBridgeAddress: import.meta.env.VITE_WORMHOLE_TOKEN_BRIDGE_ETH || '',
    nftBridgeAddress: import.meta.env.VITE_WORMHOLE_NFT_BRIDGE_ETH || '',
    explorerUrl: 'https://goerli.etherscan.io/tx/',
  },
};

// Supported tokens for cross-chain transfers
export const SUPPORTED_TOKENS: SupportedToken[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: '/assets/tokens/usdc.svg',
    addresses: {
      [Number(import.meta.env.VITE_CHAIN_ID_SUI)]: import.meta.env.VITE_SUI_USDC_ADDRESS || '',
      [Number(import.meta.env.VITE_CHAIN_ID_ETH)]: import.meta.env.VITE_ETH_USDC_ADDRESS || '',
    },
  },
];

// Supported NFT collections for cross-chain transfers
export const SUPPORTED_NFT_COLLECTIONS: SupportedNFTCollection[] = [
  {
    symbol: 'PACT',
    name: 'PactDA Agreement NFTs',
    logo: '/assets/nfts/pact.png',
    addresses: {
      [Number(import.meta.env.VITE_CHAIN_ID_SUI)]: import.meta.env.VITE_SUI_PACT_NFT_ADDRESS || '',
      [Number(import.meta.env.VITE_CHAIN_ID_ETH)]: import.meta.env.VITE_ETH_PACT_NFT_ADDRESS || '',
    },
  },
  {
    symbol: 'VCNFT',
    name: 'VC Reputation NFTs',
    logo: '/assets/nfts/vcnft.png',
    addresses: {
      [Number(import.meta.env.VITE_CHAIN_ID_SUI)]: import.meta.env.VITE_SUI_VCNFT_ADDRESS || '',
      [Number(import.meta.env.VITE_CHAIN_ID_ETH)]: import.meta.env.VITE_ETH_VCNFT_ADDRESS || '',
    },
  },
];

// PactDA agreement configuration
export const PACTDA_CONFIG = {
  // Default fee percentage for escrow (e.g., 1% = 100 basis points)
  defaultFeeBps: 100,
  
  // Maximum number of milestones per agreement
  maxMilestones: 10,
  
  // Minimum delay between milestone approvals (in seconds)
  minMilestoneDelay: 60,
  
  // Supported chains for agreements
  supportedChains: [
    Number(import.meta.env.VITE_CHAIN_ID_SUI),
    Number(import.meta.env.VITE_CHAIN_ID_ETH)
  ],
  
  // Wormhole RPC URL
  wormholeRpc: import.meta.env.VITE_WORMHOLE_RPC || 'https://wormhole-v2-testnet-api.certus.one',
};

// Utility function to get config by chain ID
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAINS[chainId];
}

// Utility function to get token by symbol and chain
export function getTokenBySymbolAndChain(symbol: string, chainId: number): string | undefined {
  const token = SUPPORTED_TOKENS.find(t => t.symbol === symbol);
  return token?.addresses[chainId];
}

// Utility function to get NFT collection by symbol and chain
export function getNFTCollectionBySymbolAndChain(symbol: string, chainId: number): string | undefined {
  const collection = SUPPORTED_NFT_COLLECTIONS.find(c => c.symbol === symbol);
  return collection?.addresses[chainId];
}