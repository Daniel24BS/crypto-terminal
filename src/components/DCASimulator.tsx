import { useState } from 'react'

interface InvestmentResult {
  totalInvested: number
  totalCoins: number
  currentValue: number
  profitLoss: number
  profitLossPercentage: number
  monthlyData: { month: number; invested: number; coins: number; value: number }[]
}

const cryptocurrencies = [
  { symbol: 'BTC', name: 'Bitcoin', currentPrice: 43250 },
  { symbol: 'ETH', name: 'Ethereum', currentPrice: 2280 },
  { symbol: 'SOL', name: 'Solana', currentPrice: 98.45 },
  { symbol: 'XRP', name: 'Ripple', currentPrice: 0.52 }
]

export default function DCASimulator() {
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [selectedCoin, setSelectedCoin] = useState('BTC')
  const [timeframe, setTimeframe] = useState('12')
  const [volatility, setVolatility] = useState('10')
  const [result, setResult] = useState<InvestmentResult | null>(null)

  const calculateDCA = () => {
    const amount = parseFloat(monthlyAmount)
    const months = parseInt(timeframe)
    const volatilityPercent = parseFloat(volatility) / 100
    
    if (isNaN(amount) || amount <= 0 || isNaN(months) || months <= 0) return

    const coin = cryptocurrencies.find(c => c.symbol === selectedCoin)
    if (!coin) return

    const monthlyData = []
    let totalInvested = 0
    let totalCoins = 0

    for (let month = 1; month <= months; month++) {
      // Simulate price volatility
      const randomFactor = 1 + (Math.random() - 0.5) * 2 * volatilityPercent
      const monthPrice = coin.currentPrice * randomFactor
      
      const coinsBought = amount / monthPrice
      totalInvested += amount
      totalCoins += coinsBought
      
      monthlyData.push({
        month,
        invested: totalInvested,
        coins: totalCoins,
        value: totalCoins * coin.currentPrice
      })
    }

    const currentValue = totalCoins * coin.currentPrice
    const profitLoss = currentValue - totalInvested
    const profitLossPercentage = (profitLoss / totalInvested) * 100

    setResult({
      totalInvested,
      totalCoins,
      currentValue,
      profitLoss,
      profitLossPercentage,
      monthlyData
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const selectedCrypto = cryptocurrencies.find(c => c.symbol === selectedCoin)

  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-green-400">DCA Investment Simulator</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Monthly Investment Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400">$</span>
              <input
                type="number"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                placeholder="100"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cryptocurrency</label>
            <select
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none"
            >
              {cryptocurrencies.map(crypto => (
                <option key={crypto.symbol} value={crypto.symbol}>
                  {crypto.symbol} - {crypto.name} (${crypto.currentPrice.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Investment Period (Months)</label>
            <input
              type="number"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              min="1"
              max="60"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Price Volatility: {volatility}%
            </label>
            <input
              type="range"
              value={volatility}
              onChange={(e) => setVolatility(e.target.value)}
              min="0"
              max="50"
              step="5"
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Stable</span>
              <span>Very Volatile</span>
            </div>
          </div>

          <button
            onClick={calculateDCA}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Calculate DCA Strategy
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-blue-400">Investment Projection</h3>
          {result ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Invested:</span>
                <span className="font-mono">{formatCurrency(result.totalInvested)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total {selectedCoin}:</span>
                <span className="font-mono">{result.totalCoins.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Value:</span>
                <span className="font-mono">{formatCurrency(result.currentValue)}</span>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Profit/Loss:</span>
                  <span className={result.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatCurrency(result.profitLoss)} ({result.profitLossPercentage.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Enter parameters and click calculate</p>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <h4 className="font-semibold mb-3 text-yellow-400">Monthly Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2">Month</th>
                  <th className="text-right py-2">Invested</th>
                  <th className="text-right py-2">Total Coins</th>
                  <th className="text-right py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {result.monthlyData.slice(-6).map((data) => (
                  <tr key={data.month} className="border-b border-gray-700">
                    <td className="py-2">{data.month}</td>
                    <td className="text-right py-2">{formatCurrency(data.invested)}</td>
                    <td className="text-right py-2">{data.coins.toFixed(6)}</td>
                    <td className="text-right py-2">{formatCurrency(data.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-gray-800 rounded-lg">
        <h4 className="font-semibold mb-2 text-yellow-400">💡 About DCA</h4>
        <p className="text-sm text-gray-300">
          Dollar Cost Averaging (DCA) is an investment strategy where you invest a fixed amount regularly, 
          regardless of market conditions. This approach can reduce the impact of volatility and potentially 
          lower the average cost per unit over time.
        </p>
      </div>
    </div>
  )
}
