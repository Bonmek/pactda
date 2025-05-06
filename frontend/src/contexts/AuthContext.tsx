import { loginWithFacebook } from '@/service/FacebookOAuthService'
import { loginWithGoogle } from '@/service/GoogleAuthService'
import { getZkloginAddress, logoutZklogin } from '@/service/SuiZkLoginService'
import { useSuiClient } from '@mysten/dapp-kit'
import React, { createContext, useContext, useEffect, useState } from 'react'

interface AuthContextType {
  zkloginAddress: string | null
  login: ({ authType }: AuthProps) => Promise<void>
  logout: () => void
}

interface AuthProps {
  authType: 'google' | 'facebook'
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [zkloginAddress, setZkloginAddress] = useState<string | null>(null)
  const suiClient = useSuiClient()

  const login = async ({ authType }: AuthProps) => {
    switch (authType) {
      case 'google':
        await loginWithGoogle(suiClient)
        break
      case 'facebook':
        await loginWithFacebook(suiClient)
        break
      default:
        throw new Error('Invalid Parameter')
    }
  }

  const logout = () => {
    logoutZklogin()
    setZkloginAddress(null)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setZkloginAddress(getZkloginAddress())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AuthContext.Provider value={{ zkloginAddress, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
