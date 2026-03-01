import { createContext, useContext, useState, useEffect } from 'react'

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
  
  // Initialize API keys from localStorage on mount
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('bybit_api_key') || ''
  })
  const [apiSecret, setApiSecret] = useState(() => {
    return localStorage.getItem('bybit_api_secret') || ''
  })
  const [usdToIlsRate, setUsdToIlsRate] = useState(3.7)

  // Save API keys to localStorage whenever they change
  const handleSetApiKey = (key: string) => {
    setApiKey(key)
    if (key) {
      localStorage.setItem('bybit_api_key', key)
    } else {
      localStorage.removeItem('bybit_api_key')
    }
  }

  const handleSetApiSecret = (secret: string) => {
    setApiSecret(secret)
    if (secret) {
      localStorage.setItem('bybit_api_secret', secret)
    } else {
      localStorage.removeItem('bybit_api_secret')
    }
  }

  // Auto-fetch portfolio when API keys are available
  useEffect(() => {
    if (apiKey && apiSecret && !balances) {
      refreshPortfolio()
    }
  }, [apiKey, apiSecret])

  const refreshPortfolio = async () => {
    if (!apiKey || !apiSecret) {
      setError('API keys not provided')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Use our own Vercel serverless function
      const response = await fetch('/api/fetch-portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          apiSecret
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Portfolio data from serverless function:", data)

      if (data?.result?.list) {
        const accountData = data.result.list[0]
        const unifiedBalances = accountData.coin.filter((coin: any) => 
          parseFloat(coin.walletBalance) > 0 || parseFloat(coin.unrealisedPnl) !== 0
        ).map((coin: any) => ({
          coin: coin.coin,
          coinId: coin.coin.toLowerCase(),
          coinName: coin.coin,
          total: coin.walletBalance,
          available: coin.free,
          usdValue: parseFloat(coin.walletBalance) * (coin.usdPrice || 0)
        }))

        const totalUSD = unifiedBalances.reduce((sum: number, balance: any) => 
          sum + balance.usdValue, 0
        )

        setBalances({
          unified: unifiedBalances,
          fund: [],
          totalUSD,
          totalILS: totalUSD * usdToIlsRate,
          usdToIlsRate
        })
        setIsConnected(true)
      } else {
        setError('No portfolio data found')
      }
    } catch (error) {
      console.error('Portfolio fetch error:', error)
      setError('Failed to fetch portfolio data')
    } finally {
      setLoading(false)
    }
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
    setApiKey: handleSetApiKey,
    setApiSecret: handleSetApiSecret,
    setUsdToIlsRate,
    refreshPortfolio
  }

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}
