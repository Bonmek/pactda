

import { ConnectButton, useWalletKit } from '@mysten/wallet-kit';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { injected } from '@wagmi/connectors';
import { useState } from 'react';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-12 bg-gradient-to-br from-gray-50 to-gray-200">
      <h1 className="text-4xl font-extrabold text-gray-800">🔗 Wallet Connect Demo</h1>
      <div className="flex flex-wrap gap-12 justify-center">
        <SuiWalletCard />
        <MetaMaskWalletCard />
      </div>
    </main>
  );
}

// ---- SUI WALLET CARD ----
function SuiWalletCard() {
  const { currentAccount, isConnected } = useWalletKit();

  return (
    <div className="border border-gray-300 rounded-3xl p-8 w-80 flex flex-col items-center shadow-xl bg-white hover:shadow-2xl transition">
      <h2 className="text-2xl font-semibold text-blue-600 mb-6">Sui Wallet</h2>
      <ConnectButton />
      {isConnected && currentAccount && (
        <div className="mt-6 flex flex-col items-center text-gray-700 w-full">
          <p className="text-sm font-medium mb-2">Connected Address:</p>
          <div className="w-full p-3 bg-gray-100 border border-blue-300 rounded-xl text-center break-words text-xs font-mono">
            {currentAccount.address}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- METAMASK WALLET CARD ----
function MetaMaskWalletCard() {
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });

  const handleConnect = async () => {
    const metamaskConnector = connectors.find(c => c.id === 'injected');
    if (!metamaskConnector) {
      console.error('MetaMask not found');
      return;
    }
    await connect({ connector: metamaskConnector });
  };

  return (
    <div className="border border-gray-300 rounded-3xl p-8 w-80 flex flex-col items-center shadow-xl bg-white hover:shadow-2xl transition">
      <h2 className="text-2xl font-semibold text-yellow-600 mb-6">MetaMask Wallet</h2>
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={isPending}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 rounded-lg transition"
        >
          {isPending ? "Connecting..." : "Connect MetaMask"}
        </button>
      ) : (
        <>
          <div className="mt-6 flex flex-col items-center text-gray-700 w-full">
            <p className="text-sm font-medium mb-2">Connected Address:</p>
            <div className="w-full p-3 bg-gray-100 border border-yellow-300 rounded-xl text-center break-words text-xs font-mono">
              {address}
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center text-gray-700 w-full">
            <p className="text-sm font-medium mb-2">Balance:</p>
            <div className="w-full p-3 bg-gray-100 border border-green-300 rounded-xl text-center text-xs font-mono">
              {balanceData ? `${balanceData.formatted.slice(0, 6)} ${balanceData.symbol}` : '-'}
            </div>
          </div>

          <button
            onClick={() => disconnect()}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 rounded-lg mt-6 transition"
          >
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}
