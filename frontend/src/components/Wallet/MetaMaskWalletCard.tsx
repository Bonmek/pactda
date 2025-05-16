import { useConnect, useDisconnect, useAccount, useBalance } from 'wagmi';

export function MetaMaskWalletCard() {
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
    <div className="border border-gray-700 rounded-3xl p-8 w-96 flex flex-col items-center shadow-xl bg-gray-800 hover:shadow-2xl transition">
      <h2 className="text-2xl font-semibold text-yellow-500 mb-6">MetaMask Wallet</h2>
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={isPending}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 rounded-lg transition"
        >
          {isPending ? "Connecting..." : "Connect MetaMask"}
        </button>
      ) : (
        <>
          <div className="mt-6 flex flex-col items-center text-gray-300 w-full">
            <p className="text-sm font-medium mb-2">Connected Address:</p>
            <div className="w-full p-3 bg-gray-900 border border-yellow-600 rounded-xl text-center break-words text-xs font-mono">
              {address}
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center text-gray-300 w-full">
            <p className="text-sm font-medium mb-2">Balance:</p>
            <div className="w-full p-3 bg-gray-900 border border-green-700 rounded-xl text-center text-xs font-mono">
              {balanceData ? `${balanceData.formatted.slice(0, 6)} ${balanceData.symbol}` : '-'}
            </div>
          </div>

          <button
            onClick={() => disconnect()}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-medium py-2 rounded-lg mt-6 transition"
          >
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}