import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useCurrentAccount,
  useDisconnectWallet,
  useConnectWallet,
  useWallets,
} from '@mysten/dapp-kit'
import { useAccount, useDisconnect, useConnect } from 'wagmi'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface HeaderProps {
  selectedWalletType: 'sui' | 'metamask' | 'google' | 'facebook' | null
  setSelectedWalletType: (
    type: 'sui' | 'metamask' | 'google' | 'facebook' | null,
  ) => void
}

const Header: React.FC<HeaderProps> = ({
  selectedWalletType,
  setSelectedWalletType,
}) => {
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  // ใช้ useAuth hook จาก context
  const { login, logout, zkloginAddress } = useAuth()

  // Get wallet account information based on selected wallet type
  const suiAccount = useCurrentAccount()
  const { address: ethAddress, isConnected: isEthConnected } = useAccount()
  const { disconnect: disconnectEth } = useDisconnect()
  const { mutate: disconnectSui } = useDisconnectWallet()

  // Connect wallet hooks
  const { mutate: connectSuiWallet } = useConnectWallet()
  const { connect: connectEth, connectors } = useConnect()
  // Move the useWallets hook call to the component top level
  const wallets = useWallets()

  // Determine if any wallet is connected
  const isWalletConnected =
    (selectedWalletType === 'sui' && suiAccount) ||
    (selectedWalletType === 'metamask' && isEthConnected) ||
    ((selectedWalletType === 'google' || selectedWalletType === 'facebook') &&
      zkloginAddress)

  // Handle MetaMask connection
  const handleConnectMetaMask = async () => {
    const metamaskConnector = connectors.find((c) => c.id === 'injected')
    if (!metamaskConnector) {
      toast.error('MetaMask not found')
      return
    }

    // Close dropdown first to provide a cleaner UI when popup appears
    setWalletDropdownOpen(false)

    try {
      // Set wallet type first to update UI
      setSelectedWalletType('metamask')
      // Then trigger the connect popup
      await connectEth({ connector: metamaskConnector })
      toast.success('Connected to MetaMask')
    } catch (error) {
      toast.error('MetaMask connection failed')
      setSelectedWalletType(null)
    }
  }

  // Handle Sui wallet connection
  const handleConnectSui = () => {
    // Close dropdown first to provide a cleaner UI when popup appears
    setWalletDropdownOpen(false)

    try {
      // Use the wallets value from the hook called at the top level
      const suiWallet = wallets[0]

      if (!suiWallet) {
        toast.error('No Sui wallet available')
        return
      }

      // Set wallet type first to update UI
      setSelectedWalletType('sui')
      // Then trigger the connect popup (modal)
      connectSuiWallet({ wallet: suiWallet })
      toast.success('Connected to Sui wallet')
    } catch (error) {
      toast.error('Sui wallet connection failed')
      setSelectedWalletType(null)
    }
  }

  // ใช้ context สำหรับการเข้าสู่ระบบ Google
  const handleConnectGoogle = async () => {
    try {
      setWalletDropdownOpen(false)
      setSelectedWalletType('google')
      await login({ authType: 'google' }) // ใช้ context login
      toast.success('Connected with Google')
    } catch (error) {
      toast.error('Google login failed')
      setSelectedWalletType(null)
    }
  }

  // ใช้ context สำหรับการเข้าสู่ระบบ Facebook
  const handleConnectFacebook = async () => {
    try {
      setWalletDropdownOpen(false)
      setSelectedWalletType('facebook')
      await login({ authType: 'facebook' }) // ใช้ context login
      toast.success('Connected with Facebook')
    } catch (error) {
      toast.error('Facebook login failed')
      setSelectedWalletType(null)
    }
  }

  // Get the connected address based on wallet type
  const getConnectedAddress = () => {
    if (selectedWalletType === 'sui' && suiAccount) {
      return suiAccount.address
    } else if (selectedWalletType === 'metamask' && ethAddress) {
      return ethAddress
    } else if (
      (selectedWalletType === 'google' || selectedWalletType === 'facebook') &&
      zkloginAddress
    ) {
      return zkloginAddress
    }
    return null
  }

  // Truncate address for display
  const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Handle wallet disconnect
  const handleDisconnect = () => {
    if (selectedWalletType === 'metamask') {
      disconnectEth()
      toast.success('Disconnected MetaMask')
    } else if (selectedWalletType === 'sui') {
      disconnectSui()
      toast.success('Disconnected Sui wallet')
    } else if (
      selectedWalletType === 'google' ||
      selectedWalletType === 'facebook'
    ) {
      logout() // ใช้ context logout
      toast.success('Logged out')
    }

    // Clear selected wallet type
    setSelectedWalletType(null)
    setWalletDropdownOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setWalletDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    // Set loading to true when the component mounts (page refresh)
    setIsLoading(true)

    // You can use a timeout here or check if accounts are being loaded
    const timer = setTimeout(() => {
      setIsLoading(false) // Stop loading after 1 second (or when you have the actual data)
    }, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [])
  // Mouse parallax state
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })
  // Add state for mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Listen for mouse movement for parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight
      setMouse({ x, y })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Ripple effect for clicks
  const [ripples, setRipples] = useState<
    { x: number; y: number; key: number }[]
  >([])
  const rippleRef = useRef<HTMLDivElement>(null)
  const handleGlobalClick = (e: React.MouseEvent) => {
    if (!rippleRef.current) return
    const rect = rippleRef.current.getBoundingClientRect()
    setRipples((ripples) => [
      ...ripples,
      {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        key: Date.now() + Math.random(),
      },
    ])
    setTimeout(() => setRipples((ripples) => ripples.slice(1)), 600)
  }

  return (
    <>
      {/* Global animated background with parallax and mouse interaction */}
      <div
        ref={rippleRef}
        className="fixed inset-0 -z-10 overflow-hidden select-none pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at ${mouse.x * 100}% ${mouse.y * 100}%, #1e293b 60%, #0f172a 100%)`,
        }}
      >
        {/* Parallax SVGs */}
        <svg
          className="absolute left-0 top-0 w-96 h-96 opacity-30"
          style={{
            transform: `translate(${mouse.x * 40}px,${mouse.y * 40}px)`,
          }}
          viewBox="0 0 96 96"
          fill="none"
        >
          <circle
            cx="48"
            cy="48"
            r="46"
            stroke="#7c3aed"
            strokeWidth="4"
            fill="#a5b4fc22"
          />
        </svg>
        <svg
          className="absolute right-0 top-0 w-72 h-72 opacity-20"
          style={{
            transform: `translate(${-mouse.x * 40}px,${mouse.y * 30}px)`,
          }}
          viewBox="0 0 72 72"
          fill="none"
        >
          <rect
            x="8"
            y="8"
            width="56"
            height="56"
            rx="16"
            fill="#f472b6"
            fillOpacity="0.15"
            stroke="#f472b6"
            strokeWidth="2"
          />
        </svg>
        <svg
          className="absolute left-1/2 -translate-x-1/2 top-1/2 w-[500px] h-[500px] opacity-10"
          style={{
            transform: `translate(-50%,-50%) scale(${1 + mouse.x * 0.2})`,
          }}
          viewBox="0 0 500 500"
          fill="none"
        >
          <ellipse
            cx="250"
            cy="250"
            rx="200"
            ry="100"
            fill="#a21caf"
            fillOpacity="0.10"
          />
        </svg>
        {/* Mouse click ripples */}
        {ripples.map((r) => (
          <span
            key={r.key}
            className="pointer-events-none absolute rounded-full bg-white/20 blur-2xl animate-ping"
            style={{ left: r.x - 100, top: r.y - 100, width: 200, height: 200 }}
          />
        ))}
      </div>
      <header
        className="w-full py-4 border-b border-gray-800 z-50 bg-gradient-to-r from-[#0c1225]/90 via-[#1a237e]/80 to-[#0f172a]/90 shadow-xl backdrop-blur-xl relative overflow-visible"
        onClick={handleGlobalClick}
      >
        {/* Animated SVG background icons (header layer) */}
        <div className="absolute left-0 top-0 w-full h-full pointer-events-none z-0">
          <svg
            className="absolute left-8 top-2 w-12 h-12 opacity-60"
            viewBox="0 0 48 48"
            fill="none"
          >
            <circle
              cx="24"
              cy="24"
              r="22"
              stroke="#7c3aed"
              strokeWidth="4"
              fill="#a5b4fc22"
            />
          </svg>
          <svg
            className="absolute right-8 top-4 w-10 h-10 opacity-50"
            viewBox="0 0 40 40"
            fill="none"
          >
            <rect
              x="4"
              y="4"
              width="32"
              height="32"
              rx="8"
              fill="#f472b6"
              fillOpacity="0.15"
              stroke="#f472b6"
              strokeWidth="2"
            />
          </svg>
          <svg
            className="absolute left-1/2 -translate-x-1/2 top-0 w-16 h-16 opacity-30"
            viewBox="0 0 64 64"
            fill="none"
          >
            <polygon
              points="32,8 56,56 8,56"
              fill="#38bdf8"
              fillOpacity="0.12"
            />
          </svg>
          <svg
            className="absolute right-24 bottom-0 w-14 h-14 opacity-40"
            viewBox="0 0 48 48"
            fill="none"
          >
            <ellipse
              cx="24"
              cy="24"
              rx="20"
              ry="10"
              fill="#a21caf"
              fillOpacity="0.10"
            />
          </svg>
        </div>
        <div className="container mx-auto px-4 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4 w-full justify-between md:justify-start mr-4">
            <Link to="/" className="flex items-center gap-2 group">
              {/* Redesigned PactDA Logo */}
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center rounded-lg shadow-lg relative overflow-hidden border border-indigo-400/30">
                <img
                  src="/public/icon.png"
                  alt="PactDA Logo"
                  className="absolute inset-0 w-full h-full object-cover group-hover:opacity-100 transition-opacity duration-300"
                ></img>
              </div>
              <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 transition-transform duration-300">
                PactDA
              </span>
            </Link>
            {/* Mobile menu button */}
            <button
              className="md:hidden ml-4 p-2 rounded-md bg-indigo-900/50 border border-indigo-500/30 text-indigo-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </>
                ) : (
                  <>
                    <line x1="4" y1="8" x2="20" y2="8"></line>
                    <line x1="4" y1="16" x2="20" y2="16"></line>
                  </>
                )}
              </svg>
            </button>
            <nav className="hidden md:flex ml-8 gap-2">
              <Link
                to="/"
                className="mx-2 flex items-center gap-1 text-gray-300 hover:text-white transition font-semibold hover:scale-105 duration-200"
              >
                <svg
                  className="w-5 h-5 text-blue-400 "
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Home
              </Link>
              <Link
                to="/workflow"
                className="mx-2 flex items-center gap-1 text-gray-300 hover:text-white transition font-semibold hover:scale-105 duration-200"
              >
                <svg
                  className="w-5 h-5 text-cyan-400 "
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M4 17v-2a4 4 0 014-4h8a4 4 0 014 4v2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                Workflow
              </Link>
              <Link
                to="/how-to-use"
                className="mx-2 flex items-center gap-1 text-gray-300 hover:text-white transition font-semibold hover:scale-105 duration-200"
              >
                <svg
                  className="w-5 h-5 text-amber-400 "
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 20h9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 4v16m0 0l-4-4m4 4l4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                How To Use
              </Link>
              <Link
                to="/about"
                className="mx-2 flex items-center gap-1 text-gray-300 hover:text-white transition font-semibold hover:scale-105 duration-200"
              >
                <svg
                  className="w-5 h-5 text-pink-400 "
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 16v-4m0-4h.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                About
              </Link>
              <Link
                to="/docs"
                className="mx-2 flex items-center gap-1 text-gray-300 hover:text-white transition font-semibold hover:scale-105 duration-200"
              >
                <svg
                  className="w-5 h-5 text-green-400 "
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <rect
                    x="4"
                    y="4"
                    width="16"
                    height="16"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M8 8h8M8 12h8M8 16h4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Docs
              </Link>
            </nav>{' '}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button
              className="relative hidden md:flex px-4 md:px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold border border-indigo-500/50 shadow-lg group overflow-hidden rounded-md backdrop-blur-sm"
              onClick={(e) => {
                navigate('/create-contract')
              }}
            >
              <div className="absolute inset-0 bg-grid-white/[0.05] bg-grid-6"></div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur"></div>
              <span className="relative z-10 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>{' '}
                Contract
              </span>
            </button>
            <div className="relative" ref={dropdownRef}>
              <button
                disabled={isLoading}
                onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                className={`wallet-btn relative flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-md border text-sm md:text-base ${
                  isWalletConnected || isLoading
                    ? 'bg-gray-900 border-indigo-500/30'
                    : 'bg-indigo-600 border-blue-400/30'
                } text-white font-medium shadow-md transition-all duration-200 overflow-hidden`}
              >
                <div className="absolute inset-0 bg-grid-white/[0.05] bg-grid-6"></div>
                {isLoading ? (
                  <span className="relative z-10 flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading...
                  </span>
                ) : isWalletConnected ? (
                  <>
                    <span className="w-6 md:w-7 h-6 md:h-7 flex items-center justify-center rounded-md bg-indigo-700 border border-indigo-400/30 font-mono text-sm relative z-10">
                      {getConnectedAddress()?.slice(2, 4) || 'U'}
                    </span>
                    <span className="font-mono text-xs md:text-sm relative z-10 hidden xs:block">
                      {truncateAddress(getConnectedAddress() || '')}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="relative z-10"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </>
                ) : (
                  <>
                    <span className="w-7 h-7 flex items-center justify-center rounded-md bg-indigo-700 border border-indigo-400/30 relative z-10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    <span className="relative z-10">Connect</span>
                  </>
                )}
              </button>
              {walletDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-indigo-500/30 rounded-md shadow-2xl z-50 backdrop-blur-sm overflow-hidden">
                  <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid-6"></div>
                  {isWalletConnected ? (
                    <div className="p-4 relative z-10">
                      <div className="mb-4">
                        <p className="text-sm text-indigo-400 mb-1">
                          Connected
                        </p>
                        <div className="p-2 bg-gray-800/70 rounded border border-indigo-500/20 font-mono text-xs break-all">
                          {getConnectedAddress()}
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnect}
                        className="w-full text-left px-4 py-2 bg-red-700/80 hover:bg-red-800 text-white rounded flex items-center justify-center gap-2 font-semibold transition-all duration-200 border border-red-500/30"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 relative z-10">
                      <button
                        onClick={handleConnectSui}
                        className="w-full text-left px-4 py-2 hover:bg-indigo-600/20 text-blue-300 rounded flex items-center gap-2 font-semibold transition-all duration-200 my-1"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                          <line x1="9" y1="9" x2="9.01" y2="9"></line>
                          <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                        Sui Wallet
                      </button>
                      <button
                        onClick={handleConnectMetaMask}
                        className="w-full text-left px-4 py-2 hover:bg-indigo-600/20 text-yellow-300 rounded flex items-center gap-2 font-semibold transition-all duration-200 my-1"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"></path>
                        </svg>
                        MetaMask
                      </button>
                      <div className="flex items-center my-3 text-gray-400 text-sm">
                        <div className="flex-grow border-t border-gray-700"></div>
                        <span className="px-2">zkLogin</span>
                        <div className="flex-grow border-t border-gray-700"></div>
                      </div>
                      <button
                        onClick={handleConnectGoogle}
                        className="w-full text-left px-4 py-2 hover:bg-indigo-600/20 text-red-300 rounded flex items-center gap-2 font-semibold transition-all duration-200 my-1"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <circle cx="12" cy="10" r="3"></circle>
                          <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path>
                        </svg>
                        Google
                      </button>
                      <button
                        onClick={handleConnectFacebook}
                        className="w-full text-left px-4 py-2 hover:bg-indigo-600/20 text-blue-400 rounded flex items-center gap-2 font-semibold transition-all duration-200 my-1"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            width="20"
                            height="20"
                            x="2"
                            y="2"
                            rx="5"
                          ></rect>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                        </svg>
                        Facebook
                      </button>
                    </div>
                  )}
                </div>
              )}{' '}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        ></div>

        {/* Slide-out navigation panel */}
        <div className="absolute right-0 top-0 bottom-0 w-3/4 max-w-sm bg-gradient-to-b from-gray-900 to-indigo-900/90 border-l border-indigo-500/30 shadow-xl flex flex-col">
          <div className="p-4 border-b border-indigo-500/30 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center rounded-lg shadow-lg relative overflow-hidden border border-indigo-400/30">
                <div className="absolute inset-0 bg-grid-white/10 bg-grid-8"></div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="relative z-10"
                >
                  <path
                    d="M12 2L4 6V12C4 15.31 7.58 20 12 22C16.42 20 20 15.31 20 12V6L12 2Z"
                    stroke="white"
                    strokeWidth="2"
                    fill="rgba(255,255,255,0.1)"
                  />
                  <path
                    d="M8 11L11 14L16 9"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
                PactDA
              </span>
            </div>
            <button
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <nav className="flex flex-col p-4 space-y-4">
            <Link
              to="/"
              className="flex items-center gap-3 py-3 px-4 rounded-md hover:bg-indigo-800/40 text-gray-300 hover:text-white transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Home
            </Link>
            <Link
              to="/workflow"
              className="flex items-center gap-3 py-3 px-4 rounded-md hover:bg-indigo-800/40 text-gray-300 hover:text-white transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg
                className="w-5 h-5 text-cyan-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4 17v-2a4 4 0 014-4h8a4 4 0 014 4v2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="7"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              Workflow
            </Link>
            <Link
              to="/how-to-use"
              className="flex items-center gap-3 py-3 px-4 rounded-md hover:bg-indigo-800/40 text-gray-300 hover:text-white transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg
                className="w-5 h-5 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 20h9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 4v16m0 0l-4-4m4 4l4-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              How To Use
            </Link>
            <Link
              to="/about"
              className="flex items-center gap-3 py-3 px-4 rounded-md hover:bg-indigo-800/40 text-gray-300 hover:text-white transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg
                className="w-5 h-5 text-pink-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 16v-4m0-4h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              About
            </Link>
            <Link
              to="/docs"
              className="flex items-center gap-3 py-3 px-4 rounded-md hover:bg-indigo-800/40 text-gray-300 hover:text-white transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <rect
                  x="4"
                  y="4"
                  width="16"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M8 8h8M8 12h8M8 16h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Docs
            </Link>

            <div className="pt-4 mt-4 border-t border-indigo-500/30">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/create-contract')
                }}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold border border-indigo-500/50 shadow-lg overflow-hidden rounded-md backdrop-blur-sm flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                Create Contract
              </button>
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}

export default Header
