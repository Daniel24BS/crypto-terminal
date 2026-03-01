import { useState, createContext, useContext } from 'react'
import './App.css'
import SmartConverter from './components/SmartConverter'
import MemecoinRadar from './components/MemecoinRadar'
import Portfolio from './components/Portfolio'
import MarketSentiment from './components/MarketSentiment'
import Simulator from './components/Simulator'

interface BybitBalance {
  coin: string
  coinId: string
  coinName: string
  total: string
  available: string
  usdValue: number
}

interface AccountBalance {
  unified: BybitBalance[]
  fund: BybitBalance[]
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
  refreshPortfolio: () => Promise<void>
}

const PortfolioContext = createContext<PortfolioContextType | null>(null)

export const usePortfolio = () => {
  const context = useContext(PortfolioContext)
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider')
  }
  return context
}

function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [balances, setBalances] = useState<AccountBalance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [usdToIlsRate, setUsdToIlsRate] = useState(3.7)

  const refreshPortfolio = async () => {
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
    setUsdToIlsRate,
    setBalances,
    setLoading,
    setError,
    setIsConnected,
    setApiKey,
    setApiSecret,
    refreshPortfolio
  }

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('converter')

  const tabs = [
    { id: 'converter', name: 'Smart Converter & Fee Calculator', icon: '💱' },
    { id: 'memecoin', name: 'My Coins Radar', icon: '📊' },
    { id: 'portfolio', name: 'Portfolio Overview', icon: '💼' },
    { id: 'simulator', name: 'What-If Simulator', icon: '🎯' },
    { id: 'sentiment', name: 'Market Sentiment (Fear & Greed)', icon: '😱' }
  ]

  return (
    <PortfolioProvider>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <div className="container mx-auto px-4 py-6">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Crypto Super App
            </h1>
            <p className="text-center text-gray-400">Your comprehensive cryptocurrency toolkit</p>
          </header>

          <nav className="mb-8">
            <div className="flex flex-wrap justify-center gap-2 border-b border-gray-800 pb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>
          </nav>

          <main className="max-w-6xl mx-auto">
            {activeTab === 'converter' && <SmartConverter />}
            {activeTab === 'memecoin' && <MemecoinRadar />}
            {activeTab === 'portfolio' && <Portfolio />}
            {activeTab === 'simulator' && <Simulator />}
            {activeTab === 'sentiment' && <MarketSentiment />}
          </main>
        </div>
      </div>
    </PortfolioProvider>
  )
}

export default App
