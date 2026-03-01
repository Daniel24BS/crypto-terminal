import { useState, useEffect } from 'react'
import { usePortfolio } from '../App'

interface TargetPrice {
  [coin: string]: string
}

export default function Simulator() {
  const { balances, usdToIlsRate } = usePortfolio()
  const [targetPrices, setTargetPrices] = useState<TargetPrice>({})
  const [hypotheticalValue, setHypotheticalValue] = useState({ usd: 0, ils: 0, profit: 0, profitPercent: 0 })

  useEffect(() => {
    // Load saved target prices from localStorage
    const saved = localStorage.getItem('simulatorTargetPrices')
    if (saved) {
      setTargetPrices(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    // Calculate hypothetical value whenever target prices or balances change
    if (balances && balances.unified.length > 0) {
      let totalUSD = 0
      let currentUSD = balances.totalUSD

      balances.unified.forEach(coin => {
        const targetPrice = parseFloat(targetPrices[coin.coin] || '0')
        const amount = parseFloat(coin.total || '0')
        if (targetPrice > 0 && amount > 0) {
          totalUSD += amount * targetPrice
        }
      })

      const profit = totalUSD - currentUSD
      const profitPercent = currentUSD > 0 ? (profit / currentUSD) * 100 : 0
      const totalILS = totalUSD * (usdToIlsRate || 3.7)

      setHypotheticalValue({ usd: totalUSD, ils: totalILS, profit, profitPercent })
    }
  }, [targetPrices, balances, usdToIlsRate])

  const updateTargetPrice = (coin: string, price: string) => {
    const newPrices = { ...targetPrices, [coin]: price }
    setTargetPrices(newPrices)
    localStorage.setItem('simulatorTargetPrices', JSON.stringify(newPrices))
  }

  const clearAllTargets = () => {
    setTargetPrices({})
    localStorage.removeItem('simulatorTargetPrices')
  }

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatILS = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatCrypto = (value: string, coin: string) => {
    const num = parseFloat(value)
    if (coin === 'USDT' || coin === 'USDC') {
      return num.toFixed(2)
    }
    return num.toFixed(6)
  }

  const getProfitClass = (profit: number) => {
    if (profit > 0) return 'text-green-400'
    if (profit < 0) return 'text-red-400'
    return 'text-gray-400'
  }

  const getProfitBgClass = (profit: number) => {
    if (profit > 0) return 'bg-green-900/30 border-green-600'
    if (profit < 0) return 'bg-red-900/30 border-red-600'
    return 'bg-gray-800 border-gray-600'
  }

  if (!balances || balances.unified.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold mb-4">What-If Simulator</h2>
        <p className="text-gray-400 mb-6">
          Please connect your portfolio first to use the simulator.
        </p>
        <div className="inline-flex items-center px-4 py-2 bg-blue-600/20 border border-blue-600 rounded-lg">
          <span className="mr-2">💼</span>
          Go to Portfolio Tab → Connect Bybit API
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">What-If Simulator</h1>
        <p className="text-gray-400">Calculate potential portfolio value at target prices</p>
      </div>

      {/* Hypothetical Portfolio Value */}
      <div className={`border rounded-lg p-6 ${getProfitBgClass(hypotheticalValue.profit)}`}>
        <div className="text-center">
          <div className="text-sm mb-2">Hypothetical Portfolio Value</div>
          <div className="text-4xl font-bold mb-2">
            {formatUSD(hypotheticalValue.usd)} | {formatILS(hypotheticalValue.ils)}
          </div>
          <div className={`text-lg font-semibold ${getProfitClass(hypotheticalValue.profit)}`}>
            {hypotheticalValue.profit >= 0 ? '+' : ''}{formatUSD(hypotheticalValue.profit)} 
            ({hypotheticalValue.profitPercent >= 0 ? '+' : ''}{hypotheticalValue.profitPercent.toFixed(2)}%)
          </div>
          <div className="text-sm text-gray-400 mt-2">
            Current: {formatUSD(balances.totalUSD)} | {formatILS(balances.totalILS || 0)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          Set target prices for your coins to see potential portfolio value
        </div>
        <button
          onClick={clearAllTargets}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
        >
          Clear All Targets
        </button>
      </div>

      {/* Coin List with Target Prices */}
      <div className="bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
        <div className="space-y-3">
          {balances.unified.map((coin) => (
            <div key={coin.coin} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="text-xl">🪙</div>
                  <div>
                    <div className="font-semibold">{coin.coinName}</div>
                    <div className="text-sm text-gray-400">{coin.coin}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">{formatCrypto(coin.total, coin.coin)}</div>
                  <div className="text-sm text-green-400">{formatUSD(coin.usdValue)}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">Target Price (USD)</label>
                  <input
                    type="number"
                    value={targetPrices[coin.coin] || ''}
                    onChange={(e) => updateTargetPrice(coin.coin, e.target.value)}
                    placeholder={`Current: $${(coin.usdValue / parseFloat(coin.total)).toFixed(2)}`}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="text-right min-w-[120px]">
                  <div className="text-xs text-gray-400 mb-1">Potential Value</div>
                  <div className="font-semibold text-green-400">
                    {targetPrices[coin.coin] && parseFloat(targetPrices[coin.coin]) > 0
                      ? formatUSD(parseFloat(coin.total) * parseFloat(targetPrices[coin.coin]))
                      : '-'
                    }
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-300 mb-2">How to Use:</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Enter target prices for your coins in the input fields</li>
          <li>• The simulator calculates your portfolio value if all targets are met</li>
          <li>• Green indicates potential profit, red indicates potential loss</li>
          <li>• Target prices are saved automatically and persist between sessions</li>
        </ul>
      </div>
    </div>
  )
}
