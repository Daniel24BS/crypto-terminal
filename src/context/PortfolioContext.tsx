import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface Coin {
  coin: string
  total: string
  available: string
  usdValue: number
}

interface AccountBalance {
  unified: Coin[]
  fund: Coin[]
  totalUSD: number
  totalILS?: number
  usdToIlsRate?: number
}

interface PortfolioContextType {
  balances: AccountBalance | null
  isLoading: boolean
  error: string | null
  apiKey: string
  apiSecret: string
  setBalances: (balances: AccountBalance | null) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setApiKey: (key: string) => void
  setApiSecret: (secret: string) => void
  fetchPortfolio: () => void
}

export const PortfolioContext = createContext<PortfolioContextType | null>(null)

export const usePortfolio = () => {
  const context = useContext(PortfolioContext)
  if (!context) {
    throw new Error('usePortfolio must be used within PortfolioProvider')
  }
  return context
}

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  // INITIAL STATE: Read from localStorage
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('bybit_api_key') || ''
  })
  const [apiSecret, setApiSecret] = useState(() => {
    return localStorage.getItem('bybit_api_secret') || ''
  })
  
  const [balances, setBalances] = useState<AccountBalance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Save to localStorage whenever keys change
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

  // FETCH LOGIC: Only runs if keys exist
  const fetchPortfolio = async () => {
    if (!apiKey || !apiSecret) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('https://crypto-terminal-api.07daniel50.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'BYBIT_API_KEY': apiKey,
          'BYBIT_API_SECRET': apiSecret,
          'action': 'fetch_portfolio'
        },
        body: JSON.stringify({ action: 'fetch_portfolio' })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Portfolio fetch error response:', errorData)
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Portfolio data from Cloudflare Worker:", data)

      if (data?.balances?.result?.list && data.balances.result.list.length > 0) {
        const accountData = data.balances.result.list[0]
        const unifiedBalances = accountData.coin.filter((coin: any) => 
          parseFloat(coin.walletBalance) > 0 || parseFloat(coin.unrealisedPnl) !== 0
        ).map((coin: any) => ({
          coin: coin.coin,
          total: coin.walletBalance,
          available: coin.free,
          usdValue: parseFloat(coin.walletBalance) * (coin.usdPrice || 0)
        }))

        const totalUSD = unifiedBalances.reduce((sum: number, balance: any) => 
          sum + balance.usdValue, 0
        )

        const serverIlsRate = data.ilsRate || 3.65

        setBalances({
          unified: unifiedBalances,
          fund: [],
          totalUSD,
          totalILS: totalUSD * serverIlsRate,
          usdToIlsRate: serverIlsRate
        })
      } else {
        setError('No portfolio data found')
      }
    } catch (err) {
      console.error('Portfolio fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio data')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-fetch on mount if keys exist
  useEffect(() => {
    if (apiKey && apiSecret) {
      fetchPortfolio()
    }
  }, [])

  const value: PortfolioContextType = {
    balances,
    isLoading,
    error,
    apiKey,
    apiSecret,
    setBalances,
    setIsLoading,
    setError,
    setApiKey: handleSetApiKey,
    setApiSecret: handleSetApiSecret,
    fetchPortfolio
  }

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}
