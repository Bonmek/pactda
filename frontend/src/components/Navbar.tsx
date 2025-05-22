import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Wallet, ChevronDown, LogOut } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom' // Corrected: useLocation is from react-router-dom
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit' // Corrected: useWalletKit is deprecated, use useCurrentAccount and useDisconnectWallet
import { Button } from './ui/button'
import UserBalance from './Wallet/UserBalance' // Import the UserBalance component

const Navbar = () => {
  const currentAccount = useCurrentAccount()
  const { mutate: disconnect } = useDisconnectWallet()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [open, setOpen] = useState<boolean>(false)
  const location = useLocation()
  const [copied, setCopied] = useState(false)
  const logo = '/images/logos/Ivory_cliped.png'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { id: 'Home', to: '/' },
    ...(currentAccount?.address ? [{ id: 'Dashboard', to: '/dashboard' }] : []),
    { id: 'How To Use', to: '/how-to-use' },
    { id: 'About', to: '/about' },
  ]

  const isActivePath = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-in-out
          ${
            isScrolled
              ? 'bg-gradient-to-r from-[#061429]/95 via-[#05101f]/95 to-[#061429]/95 backdrop-blur-xl border-b-2 border-[#004db3]/30 rounded-b-2xl shadow-lg shadow-[#061429]/30'
              : 'bg-transparent'
          }`}
      >
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <img src={logo} alt="logo" className="w-25 h-auto" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {/* Navigation Links */}
              <div className="flex space-x-6">
                {navItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.to}
                    className={`relative group transition-all duration-300 ${
                      isActivePath(item.to)
                        ? 'text-white font-bold tracking-wide'
                        : 'text-blue-300 hover:text-white font-medium'
                    }`}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="relative"
                    >
                      <span className="relative z-10">{item.id}</span>
                      <motion.span
                        className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-700 to-blue-500"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isActivePath(item.to) ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ scaleX: 1 }}
                      />
                      <motion.span
                        className="absolute inset-0 rounded-lg -z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isActivePath(item.to) ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ opacity: 1 }}
                      />
                    </motion.div>
                  </Link>
                ))}
              </div>
              {/* User Balance Display */}
              {currentAccount && <UserBalance />}

              {/* Connect Wallet Button / Account Info Dropdown */}
              {currentAccount ? (
                <div className="relative group">
                  <motion.button
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-700 to-blue-500 text-white hover:shadow-lg hover:shadow-blue-700/30 transition-all duration-300 group"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setOpen(!open)}
                  >
                    <Wallet className="w-4 h-4 text-white" />
                    <span className="text-white font-semibold">
                      {currentAccount.address.slice(0, 10)}...
                    </span>
                    <ChevronDown className="w-4 h-4 text-white ml-1" />
                  </motion.button>

                  {open && (
                    <div className="absolute right-0 mt-2 min-w-[240px] bg-[#061429]/95 border border-blue-700/30 text-white shadow-2xl rounded-2xl p-3 backdrop-blur-2xl z-50">
                      <div className="flex items-center space-x-2 px-2 pt-1 pb-2">
                        <Wallet className="w-4 h-4 text-blue-400" />
                        <span className="block text-xs text-blue-300 font-mono break-all select-all">
                          {currentAccount.address.slice(0, 25)}...
                        </span>
                        <button
                          className="ml-auto px-2 py-1 rounded bg-blue-800/50 hover:bg-blue-700/50 text-xs text-blue-300 transition"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              currentAccount.address,
                            )
                            setCopied(true)
                            setTimeout(() => setCopied(false), 1200)
                          }}
                          title="Copy address"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="my-2 h-px bg-blue-700/30" />
                      <button
                        onClick={() => disconnect()}
                        className="w-full text-left text-red-400 hover:bg-[#05101f]/80 hover:text-red-500 focus:bg-[#05101f]/80 focus:text-red-500 font-semibold rounded-lg transition-colors duration-150 cursor-pointer px-3 py-2 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <motion.button
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-700 to-blue-500 text-white hover:shadow-lg hover:shadow-blue-700/30 transition-all duration-300 group"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setOpen(true)}
                >
                  <Wallet className="w-4 h-4 text-white" />
                  <span className="text-white font-bold">Connect Wallet</span>
                </motion.button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              className="md:hidden p-2 text-blue-300 hover:text-white transition-colors duration-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              whileTap={{ scale: 0.9 }}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </motion.button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Content */}
            <motion.div
              className="absolute right-0 top-0 h-full w-72 bg-gradient-to-b from-[#061429]/95 to-[#05101f]/95 shadow-lg shadow-blue-700/20 backdrop-blur-xl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <div className="p-6 space-y-6">
                {navItems.map((item, index) => (
                  <Link
                    key={item.id}
                    to={item.to}
                    className={`block py-3 transition-all duration-300 ${
                      isActivePath(item.to)
                        ? 'text-white font-bold bg-gradient-to-r from-blue-700/20 to-blue-500/20 rounded-lg p-4'
                        : 'text-blue-300 hover:text-white hover:bg-blue-700/10 rounded-lg p-4'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-2"
                    >
                      <span className="text-lg tracking-wide">{item.id}</span>
                    </motion.div>
                  </Link>
                ))}
                {currentAccount?.address ? (
                  <section className="space-y-2">
                    <Button
                      className="block w-full px-3 py-2 rounded-lg bg-[#0f2b4d]/30 text-blue-300 font-mono font-semibold text-sm text-center truncate select-all mb-2 border border-blue-700/30 shadow-sm transition-colors duration-200 hover:bg-[#0f2b4d]/50 focus:outline-none"
                      onClick={() => {
                        navigator.clipboard.writeText(currentAccount.address)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1200)
                      }}
                      title="Copy address"
                    >
                      {copied
                        ? 'Copied!'
                        : `${currentAccount.address.slice(0, 25)}...`}
                    </Button>
                    <motion.button
                      className="w-full flex items-center justify-center mt-5 space-x-2 px-6 py-3 rounded-full bg-red-500 text-white font-bold tracking-wide hover:shadow-lg hover:shadow-blue-700/20 transition-all duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => disconnect()}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </motion.button>
                  </section>
                ) : (
                  <motion.button
                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-700 to-blue-500 text-white font-bold tracking-wide hover:shadow-lg hover:shadow-blue-700/30 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setOpen(true)}
                  >
                    <Wallet className="w-5 h-5 text-white" />
                    <span>Connect Wallet</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Navbar
