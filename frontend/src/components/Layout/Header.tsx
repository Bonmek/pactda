import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentAccount, useDisconnectWallet, useConnectWallet, useWallets } from '@mysten/dapp-kit';
import { useAccount, useDisconnect, useConnect } from 'wagmi';

interface HeaderProps {
  selectedWalletType: 'sui' | 'metamask' | null;
  setSelectedWalletType: (type: 'sui' | 'metamask' | null) => void;
}

const Header: React.FC<HeaderProps> = ({ selectedWalletType, setSelectedWalletType }) => {
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get wallet account information based on selected wallet type
  const suiAccount = useCurrentAccount();
  const { address: ethAddress, isConnected: isEthConnected } = useAccount();
  const { disconnect: disconnectEth } = useDisconnect();
  const { mutate: disconnectSui } = useDisconnectWallet();
  
  // Connect wallet hooks
  const { mutate: connectSuiWallet } = useConnectWallet();
  const { connect: connectEth, connectors } = useConnect();
  // Move the useWallets hook call to the component top level
  const wallets = useWallets();

  // Determine if any wallet is connected
  const isWalletConnected = (selectedWalletType === 'sui' && suiAccount) || 
                           (selectedWalletType === 'metamask' && isEthConnected);
  
  // Handle MetaMask connection
  const handleConnectMetaMask = async () => {
    const metamaskConnector = connectors.find(c => c.id === 'injected');
    if (!metamaskConnector) {
      console.error('MetaMask not found');
      return;
    }
    
    // Close dropdown first to provide a cleaner UI when popup appears
    setWalletDropdownOpen(false);
    
    try {
      // Set wallet type first to update UI
      setSelectedWalletType('metamask');
      // Then trigger the connect popup
      await connectEth({ connector: metamaskConnector });
    } catch (error) {
      // If connection fails or is rejected, reset wallet type
      console.error('MetaMask connection failed:', error);
      setSelectedWalletType(null);
    }
  };
  
  // Handle Sui wallet connection
  const handleConnectSui = () => {
    // Close dropdown first to provide a cleaner UI when popup appears
    setWalletDropdownOpen(false);
    
    try {
      // Use the wallets value from the hook called at the top level
      const suiWallet = wallets[0];
      
      if (!suiWallet) {
        console.error('No Sui wallet available');
        return;
      }

      // Set wallet type first to update UI
      setSelectedWalletType('sui');
      // Then trigger the connect popup (modal)
      connectSuiWallet({ wallet: suiWallet });
    } catch (error) {
      // If connection fails or is rejected, reset wallet type
      console.error('Sui wallet connection failed:', error);
      setSelectedWalletType(null);
    }
  };
  
  // Get the connected address based on wallet type
  const getConnectedAddress = () => {
    if (selectedWalletType === 'sui' && suiAccount) {
      return suiAccount.address;
    } else if (selectedWalletType === 'metamask' && ethAddress) {
      return ethAddress;
    }
    return null;
  };
  
  // Truncate address for display
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Handle wallet disconnect
  const handleDisconnect = () => {
    if (selectedWalletType === 'metamask') {
      disconnectEth();
    } else if (selectedWalletType === 'sui') {
      // Properly disconnect the Sui wallet
      disconnectSui();
    }
    
    // Clear selected wallet type
    setSelectedWalletType(null);
    setWalletDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setWalletDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="w-full py-4 border-b border-gray-800">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold text-blue-500">
            PactDA
          </Link>
          <nav className="hidden md:flex ml-8">
            <Link to="/" className="mx-2 text-gray-300 hover:text-white transition">
              Home
            </Link>
            <Link to="/token-bridge" className="mx-2 text-gray-300 hover:text-white transition">
              Token Bridge
            </Link>
            <Link to="/about" className="mx-2 text-gray-300 hover:text-white transition">
              About
            </Link>
            <Link to="/docs" className="mx-2 text-gray-300 hover:text-white transition">
              Docs
            </Link>
          </nav>
        </div>
        
        {/* Wallet Selector in header */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
            className={`${isWalletConnected ? 'bg-gray-800 border border-gray-600' : 'bg-blue-700 hover:bg-blue-800'} text-white font-medium py-2 px-6 rounded-lg transition flex items-center gap-2`}
          >
            {isWalletConnected ? (
              <>
                <span className={selectedWalletType === 'sui' ? 'text-blue-400' : 'text-yellow-500'}>
                  {selectedWalletType === 'sui' ? '⚡ Sui: ' : '🦊 MetaMask: '}
                </span>
                <span className="font-mono">{truncateAddress(getConnectedAddress() || '')}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </>
            ) : (
              <>
                Connect Wallet
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </>
            )}
          </button>
          
          {walletDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10">
              {isWalletConnected ? (
                <div className="p-4">
                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-1">Connected to {selectedWalletType === 'sui' ? 'Sui Wallet' : 'MetaMask'}</p>
                    <div className="p-2 bg-gray-900 rounded-md font-mono text-xs break-all">
                      {getConnectedAddress()}
                    </div>
                  </div>
                  <button 
                    onClick={handleDisconnect}
                    className="w-full text-left px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="p-2">
                  <button 
                    onClick={handleConnectSui}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 text-gray-200 rounded-md flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                    </svg>
                    Sui Wallet
                  </button>
                  <button 
                    onClick={handleConnectMetaMask}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 text-gray-200 rounded-md flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m7.3 14.7 1.2-1.2m1.8-1.8 1.5-1.5"></path>
                      <circle cx="13" cy="14" r="3"></circle>
                      <path d="M14.5 9.5 17 7l4 1-6 6-5-3 1.5-2.5Z"></path>
                      <path d="M19.9 8.1a2 2 0 0 1 0 2.7l-6.8 6.8a2 2 0 0 1-2.7 0l-7-7a2 2 0 0 1 0-2.7l6.7-6.7a2 2 0 0 1 2.7 0Z"></path>
                    </svg>
                    MetaMask
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;