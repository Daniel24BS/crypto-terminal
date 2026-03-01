import { useState, useEffect } from 'react'
import { usePortfolio } from './PortfolioContext'

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

export default function Portfolio() {
  const { balances, loading, error, isConnected, apiKey, apiSecret, usdToIlsRate, setBalances, setLoading, setError, setIsConnected, setApiKey, setApiSecret, refreshPortfolio } = usePortfolio()

  const [buyPrices, setBuyPrices] = useState<Record<string, string>>({})

  useEffect(() => {
    // Load buy prices from localStorage on component mount
    const savedBuyPrices = localStorage.getItem('portfolioBuyPrices')
    if (savedBuyPrices) {
      setBuyPrices(JSON.parse(savedBuyPrices))
    }
  }, [])

  // Save buy prices to localStorage whenever they change
  const updateBuyPrice = (coin: string, price: string) => {
    const newBuyPrices = { ...buyPrices, [coin]: price }
    setBuyPrices(newBuyPrices)
    localStorage.setItem('portfolioBuyPrices', JSON.stringify(newBuyPrices))
  }

  // Calculate PnL for a coin
  const calculatePnL = (coin: string, currentValue: number, currentAmount: string) => {
    const buyPrice = parseFloat(buyPrices[coin] || '0')
    const currentTotal = parseFloat(currentAmount)
    
    if (buyPrice === 0 || currentTotal === 0) {
      return { profit: 0, roi: 0 }
    }
    
    const avgBuyPricePerCoin = buyPrice / currentTotal
    const totalInvested = avgBuyPricePerCoin * currentTotal
    const profit = currentValue - totalInvested
    const roi = ((profit / totalInvested) * 100)
    
    return { profit, roi }
  }

  const formatUSD = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatILS = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatCrypto = (amount: string, symbol: string): string => {
    const num = parseFloat(amount)
    if (num === 0) return '0'
    if (num < 0.000001) return `<0.000001`
    if (num < 0.00001) return `<0.00001`
    if (num < 0.0001) return `<0.0001`
    if (num < 0.001) return `<0.001`
    if (num < 0.01) return `<0.01`
    if (num < 0.1) return `<0.1`
    if (num < 1) return `<0.1`
    if (num < 10) return `<0.1`
    if (num < 100) return `<0.1`
    if (num < 1000) return `<0.1`
    return `${num.toFixed(6)} ${symbol}`
  }

  const getCoinName = (symbol: string): string => {
    const coinNames: Record<string, string> = {
      BTC: 'Bitcoin',
      ETH: 'Ethereum',
      USDT: 'Tether',
      USDC: 'USD Coin',
      BNB: 'Binance Coin',
      SOL: 'Solana',
      ADA: 'Cardano',
      XRP: 'Ripple',
      DOGE: 'Dogecoin',
      MATIC: 'Polygon',
      DOT: 'Polkadot',
      AVAX: 'Avalanche',
      LINK: 'Chainlink',
      UNI: 'Uniswap',
      ATOM: 'Cosmos',
      'LUNA': 'Luna 2.0',
      ICP: 'Internet Computer',
      VET: 'VeChain',
      THETA: 'Theta Network',
      FTM: 'Fantom',
      APE: 'ApeCoin',
      SHIB: 'Shiba Inu',
      CRO: 'Cronos',
      MANA: 'Decentraland',
      SAND: 'The Sandbox',
      AXS: 'Axie Infinity',
      ENJ: 'Enjin Coin',
      CHZ: 'Chiliz',
      PUMP: 'PUMP',
      LAVA: 'LAVA'
    }
    
    return coinNames[symbol] || symbol
  }

  const getCoinIcon = (symbol: string): string => {
    const coinIcons: Record<string, string> = {
      BTC: '₿',
      ETH: 'Ξ',
      USDT: '₮',
      USDC: '$',
      BNB: '🟡',
      SOL: '◎',
      ADA: '₳',
      XRP: 'X',
      DOGE: '🐕',
      MATIC: '🟦',
      DOT: '●',
      AVAX: '🔺',
      LINK: '🔗',
      UNI: '🦄',
      ATOM: '⚛',
      'LUNA': '🌙',
      ICP: '🧠',
      VET: 'V',
      THETA: 'Θ',
      FTM: 'F',
      APE: '🐵',
      SHIB: '🐕',
      CRO: '🟪',
      MANA: '🏖',
      SAND: '🏖',
      AXS: '🎮',
      ENJ: '🟩',
      CHZ: '🎴',
      PUMP: '🚀',
      LAVA: '🌋'
    }
    
    return coinIcons[symbol] || '🪙'
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">💼 Portfolio</h1>
        <p className="text-gray-400">Track your cryptocurrency investments</p>
      </div>

      {!isConnected ? (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Connect to Bybit API</h2>
            <p className="text-gray-400 mb-6">Enter your API credentials to view your portfolio</p>
          </div>
          
          <div className="space-y-4 max-w-md mx-auto">
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API Key"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">API Secret</label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Enter API Secret"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={() => {
                localStorage.setItem('bybit_api_key', apiKey)
                localStorage.setItem('bybit_api_secret', apiSecret)
                setIsConnected(true)
              }}
              disabled={!apiKey || !apiSecret}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect Portfolio
            </button>
          </div>
        </div>
      ) : (
        <>
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading portfolio data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900 border border-red-500 text-white px-4 py-3 rounded-lg">
              <p className="text-center">{error}</p>
            </div>
          )}

          {balances && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-green-400">
                      {formatUSD(balances.totalUSD)}
                    </h2>
                    <p className="text-sm text-gray-400">
                      Total Portfolio Value
                      {balances.totalILS && usdToIlsRate && (
                        <span className="text-blue-300">
                          ({formatILS(balances.totalILS)})
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <button
                      onClick={refreshPortfolio}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      🔄
                    </button>
                    <div className="text-sm text-gray-400 mt-2">Trading + Earn + Funding</div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    <button
                      onClick={() => {
                        localStorage.removeItem('bybit_api_key')
                        localStorage.removeItem('bybit_api_secret')
                        setApiKey('')
                        setApiSecret('')
                        setIsConnected(false)
                        setBalances(null)
                      }}
                      className="text-red-400 hover:text-red-300 underline"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-purple-400">
                  💼 All Assets (Trading + Earn + Funding)
                </h3>
                <div className="bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {balances.unified.length > 0 ? (
                    <div className="space-y-3">
                      {balances.unified.map((balance) => {
                        const pnl = calculatePnL(balance.coin, balance.usdValue, balance.total)
                        return (
                          <div key={`${balance.coin}-combined`} className="bg-gray-700 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="text-xl text-purple-400">{getCoinIcon(balance.coin)}</div>
                                <div>
                                  <div className="font-medium text-sm">{balance.coinName}</div>
                                  <div className="text-xs text-gray-400">{balance.coin}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-sm">
                                  {formatCrypto(balance.total, balance.coin)}
                                </div>
                                <div className="text-sm font-semibold text-green-400">
                                  {balance.usdValue > 0 ? formatUSD(balance.usdValue) : '$0.00 (Price unavailable)'}
                                </div>
                                {balances.totalILS && usdToIlsRate && balance.usdValue > 0 && (
                                  <div className="text-xs text-blue-300">
                                    ({formatILS(balance.usdValue * usdToIlsRate)})
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* PnL Section */}
                            <div className="border-t border-gray-600 pt-3">
                              <div className="flex items-center space-x-3">
                                <div className="flex-1">
                                  <label className="text-xs text-gray-400 block mb-1">Avg Buy Price (USD)</label>
                                  <input
                                    type="number"
                                    value={buyPrices[balance.coin] || ''}
                                    onChange={(e) => updateBuyPrice(balance.coin, e.target.value)}
                                    placeholder="Enter buy price"
                                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                    step="0.01"
                                    min="0"
                                  />
                                </div>
                                <div className="text-right min-w-[100px]">
                                  <div className="text-xs text-gray-400 mb-1">PnL</div>
                                  <div className={`text-sm font-semibold ${pnl.profit > 0 ? 'text-green-400' : (pnl.profit < 0 ? 'text-red-400' : 'text-gray-400')}`}>
                                    {pnl.profit !== 0 ? `${pnl.profit >= 0 ? '+' : ''}${formatUSD(pnl.profit)}` : '-'}
                                  </div>
                                  <div className={`text-xs ${pnl.roi > 0 ? 'text-green-300' : (pnl.roi < 0 ? 'text-red-300' : 'text-gray-400')}`}>
                                    {pnl.roi !== 0 ? `${pnl.roi >= 0 ? '+' : ''}${pnl.roi.toFixed(2)}%` : '-'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No assets found in any account
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
