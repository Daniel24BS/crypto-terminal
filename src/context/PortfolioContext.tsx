import { createContext, useContext } from 'react'

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
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider')
  }
  return context
}
