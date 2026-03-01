import { useState, useEffect } from 'react'
import { usePortfolio } from '../App'

interface CoinData {
  symbol: string
  name: string
  price: number
  change24h: number
  volume24h: number
  priceChangePercent: number
}

export default function MyCoinsRadar() {
  const { balances, isConnected, apiKey } = usePortfolio()
  const [coinData, setCoinData] = useState<CoinData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (balances && balances.unified.length > 0) {
      fetchMyCoinsData()
    } else {
      setCoinData([])
      if (!isConnected || !apiKey) {
        setError('Please connect your Bybit API in the Portfolio tab first to see your coins.')
      } else {
        setError('No coins found in your portfolio.')
      }
    }
  }, [balances, isConnected, apiKey])

  const fetchMyCoinsData = async () => {
    if (!balances || balances.unified.length === 0) return

    setLoading(true)
    setError('')

    try {
      console.log('🎯 Fetching market data for your coins...')
      
      // Get unique coin symbols from portfolio
      const coinSymbols = balances.unified.map(coin => coin.coin).filter(Boolean)
      console.log('📊 Fetching data for coins:', coinSymbols)

      // Fetch market data from Bybit
      const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot')
      if (!response.ok) throw new Error('Failed to fetch market data')
      
      const data = await response.json()
      const tickers = data?.result?.list || []

      // Process data for user's coins only
      const myCoinsData: CoinData[] = coinSymbols.map(symbol => {
        const ticker = tickers.find((t: any) => t.symbol === `${symbol}USDT`)
        
        if (ticker) {
          const price = parseFloat(ticker.lastPrice || '0')
          const change24h = parseFloat(ticker.price24hPcnt || '0')
          const volume24h = parseFloat(ticker.turnover24h || '0')
          
          return {
            symbol,
            name: getCoinName(symbol),
            price,
            change24h,
            volume24h,
            priceChangePercent: change24h * 100
          }
        }
        
        return {
          symbol,
          name: getCoinName(symbol),
          price: 0,
          change24h: 0,
          volume24h: 0,
          priceChangePercent: 0
        }
      }).filter(coin => coin.price > 0)

      console.log('✅ Market data fetched for your coins:', myCoinsData)
      setCoinData(myCoinsData)

    } catch (err: any) {
      console.error('❌ Failed to fetch market data:', err)
      setError(`Failed to fetch market data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getCoinName = (symbol: string): string => {
    const names: { [key: string]: string } = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'BNB': 'Binance Coin',
      'SOL': 'Solana',
      'ADA': 'Cardano',
      'XRP': 'Ripple',
      'DOT': 'Polkadot',
      'DOGE': 'Dogecoin',
      'AVAX': 'Avalanche',
      'MATIC': 'Polygon',
      'LINK': 'Chainlink',
      'UNI': 'Uniswap',
      'LTC': 'Litecoin',
      'ATOM': 'Cosmos',
      'FIL': 'Filecoin',
      'TRX': 'TRON',
      'XLM': 'Stellar',
      'VET': 'VeChain',
      'THETA': 'Theta',
      'ICP': 'Internet Computer'
    }
    return names[symbol] || symbol
  }

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toFixed(2)}`
    if (price >= 0.01) return `$${price.toFixed(4)}`
    return `$${price.toFixed(6)}`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`
    return `$${volume.toFixed(2)}`
  }

  const getPerformanceClass = (changePercent: number) => {
    if (changePercent > 5) return 'border-green-500 bg-green-500/10 shadow-green-500/25' // Take Profit zone
    if (changePercent < -5) return 'border-red-500 bg-red-500/10 shadow-red-500/25' // DCA zone
    return 'border-gray-600 bg-gray-800'
  }

  const getChangeClass = (changePercent: number) => {
    if (changePercent > 5) return 'text-green-400 font-bold'
    if (changePercent < -5) return 'text-red-400 font-bold'
    if (changePercent > 0) return 'text-green-300'
    if (changePercent < 0) return 'text-red-300'
    return 'text-gray-400'
  }

  if (!isConnected || !apiKey) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔗</div>
        <h2 className="text-2xl font-bold mb-4">Connect Your Portfolio First</h2>
        <p className="text-gray-400 mb-6">
          Please connect your Bybit API in the Portfolio tab to see your coins' market data here.
        </p>
        <div className="inline-flex items-center px-4 py-2 bg-blue-600/20 border border-blue-600 rounded-lg">
          <span className="mr-2">💼</span>
          Go to Portfolio Tab → Connect Bybit API
        </div>
      </div>
    )
  }

  if (error && coinData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-2xl font-bold mb-4">No Coins Found</h2>
        <p className="text-gray-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">My Coins Radar</h1>
        <p className="text-gray-400">Real-time market data for your portfolio coins</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Fetching market data for your coins...</p>
        </div>
      ) : (
        <>
          {coinData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-400">Total Coins</div>
                <div className="text-2xl font-bold text-blue-400">{coinData.length}</div>
              </div>
              <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 text-center">
                <div className="text-sm text-green-300">Take Profit Zone (+5%)</div>
                <div className="text-2xl font-bold text-green-400">
                  {coinData.filter(c => c.change24h > 0.05).length}
                </div>
              </div>
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-center">
                <div className="text-sm text-red-300">DCA Zone (-5%)</div>
                <div className="text-2xl font-bold text-red-400">
                  {coinData.filter(c => c.change24h < -0.05).length}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {coinData.map((coin) => (
              <div
                key={coin.symbol}
                className={`border rounded-lg p-4 transition-all duration-300 ${getPerformanceClass(coin.priceChangePercent)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🪙</div>
                    <div>
                      <div className="font-semibold text-lg">{coin.name}</div>
                      <div className="text-sm text-gray-400">{coin.symbol}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatPrice(coin.price)}
                    </div>
                    <div className={`text-sm ${getChangeClass(coin.priceChangePercent)}`}>
                      {coin.priceChangePercent >= 0 ? '+' : ''}{coin.priceChangePercent.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-400">
                      Vol: {formatVolume(coin.volume24h)}
                    </div>
                  </div>
                </div>

                {coin.priceChangePercent > 5 && (
                  <div className="mt-2 text-xs text-green-400 font-semibold">
                    🎯 Take Profit Zone - Consider taking profits
                  </div>
                )}
                {coin.priceChangePercent < -5 && (
                  <div className="mt-2 text-xs text-red-400 font-semibold">
                    💰 DCA Zone - Good opportunity to average down
                  </div>
                )}
              </div>
            ))}
          </div>

          {coinData.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-400">No market data available for your coins</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
