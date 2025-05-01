import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

export function SuiWalletCard() {
	const account = useCurrentAccount();

  return (
    <div className="border border-gray-700 rounded-3xl p-8 w-96 flex flex-col items-center shadow-xl bg-gray-800 hover:shadow-2xl transition">
      <h2 className="text-2xl font-semibold text-blue-400 mb-6">Sui Wallet</h2>
      <ConnectButton />
      {account && (
        <div className="mt-6 flex flex-col items-center text-gray-300 w-full">
          <p className="text-sm font-medium mb-2">Connected Address:</p>
          <div className="w-full p-3 bg-gray-900 border border-blue-700 rounded-xl text-center break-words text-xs font-mono">
            {account.address}
          </div>
        </div>
      )}
    </div>
  );
}