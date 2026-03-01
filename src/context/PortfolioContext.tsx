import { createContext, useContext, useState } from 'react'

interface AccountBalance {
  unified: {
    coin: string
    coinId: string
    coinName: string
    total: string
    available: string
    usdValue: number
  }[]
  fund: any[]
  totalUSD: number
  totalILS?: number
  usdToIlsRate?: number
}

interface PortfolioContextType {
  balances: AccountBalance | null
  loading: boolean
  error: string
  isConnected: boolean
  apiKey: string
  apiSecret: string
  usdToIlsRate: number
  setBalances: (balances: AccountBalance | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string) => void
  setIsConnected: (isConnected: boolean) => void
  setApiKey: (apiKey: string) => void
  setApiSecret: (apiSecret: string) => void
  setUsdToIlsRate: (rate: number) => void
  refreshPortfolio: () => void
}

export const PortfolioContext = createContext<PortfolioContextType | null>(null)

export const usePortfolio = () => {
  const context = useContext(PortfolioContext)
  // FAILSAFE: Return fallback instead of throwing error to prevent black screen
  if (!context) {
    return {
      balances: null,
      loading: false,
      error: '',
      isConnected: false,
      apiKey: '',
      apiSecret: '',
      usdToIlsRate: 3.7,
      setBalances: () => {},
      setLoading: () => {},
      setError: () => {},
      setIsConnected: () => {},
      setApiKey: () => {},
      setApiSecret: () => {},
      setUsdToIlsRate: () => {},
      refreshPortfolio: () => {}
    }
  }
  return context
}

export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  const [balances, setBalances] = useState<AccountBalance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [usdToIlsRate, setUsdToIlsRate] = useState(3.7)

  const refreshPortfolio = () => {
    // This will be implemented in Portfolio component
    console.log('Portfolio refresh requested')
  }

  const value: PortfolioContextType = {
    balances,
    loading,
    error,
    isConnected,
    apiKey,
    apiSecret,
    usdToIlsRate,
    setBalances,
    setLoading,
    setError,
    setIsConnected,
    setApiKey,
    setApiSecret,
    setUsdToIlsRate,
    refreshPortfolio
  }

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}
