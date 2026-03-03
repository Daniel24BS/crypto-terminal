import { useState, useEffect } from 'react'
import { usePortfolio } from '../context/PortfolioContext'

interface Coin {
  id: string
  symbol: string
  name: string
  networkFee: number
}

interface ConversionResult {
  finalResult: string
  amountToBuy: string
  breakdown: string
  resultLabel: string
}

interface Transaction {
  date: string
  fiatAmount: number
  cryptoAmount: number
  coin: string
  fee: number
}

const coins: Coin[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', networkFee: 0.0002 },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', networkFee: 0.0012 },
  { id: 'solana', symbol: 'SOL', name: 'Solana', networkFee: 0.008 },
  { id: 'xrp', symbol: 'XRP', name: 'Ripple', networkFee: 0.2 },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', networkFee: 0.001 },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', networkFee: 0.17 },
  { id: 'avalanche', symbol: 'AVAX', name: 'Avalanche', networkFee: 0.001 },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', networkFee: 5.0 },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', networkFee: 100000 },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe', networkFee: 500000 },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', networkFee: 0.1 },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', networkFee: 0.01 },
  { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', networkFee: 0.025 },
  { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash', networkFee: 0.0001 },
  { id: 'fetch', symbol: 'FET', name: 'Fetch.ai', networkFee: 0.1 },
  { id: 'injective', symbol: 'INJ', name: 'Injective', networkFee: 0.01 },
  { id: 'kaspa', symbol: 'KAS', name: 'Kaspa', networkFee: 0.1 },
  { id: 'toncoin', symbol: 'TON', name: 'Toncoin', networkFee: 0.05 }
]

export default function SmartConverter() {
  const { balances } = usePortfolio()
  const [isInverse, setIsInverse] = useState(false)
  const [ilsValue, setIlsValue] = useState('')
  const [usdValue, setUsdValue] = useState('')
  const [cryptoValue, setCryptoValue] = useState('')
  const [selectedCoin, setSelectedCoin] = useState('solana')
  const [baseExchangeRate, setBaseExchangeRate] = useState(balances?.usdToIlsRate || 3.65)
  const [loading, setLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [history, setHistory] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('tx_history')
    return saved ? JSON.parse(saved) : []
  })
  const [klineData, setKlineData] = useState<number[]>([])
  const [decimalsAllowed, setDecimalsAllowed] = useState(8)
  const [spreadPercent, setSpreadPercent] = useState(0)
  const [volatility, setVolatility] = useState(0)

  const bybitFiatFee = 0.02

  // Update exchange rate when portfolio data changes
  useEffect(() => {
    if (balances?.usdToIlsRate) {
      setBaseExchangeRate(balances.usdToIlsRate)
    }
  }, [balances?.usdToIlsRate])

  // New fee calculation rules (updated)
  const calculateFee = (amountILS: number): number => {
    if (amountILS > 200) {
      return amountILS * 0.10; // 10% for transactions > 200 ILS
    } else {
      return 10; // Fixed 10 ILS for transactions <= 200 ILS
    }
  }

  const syncFiat = (source: 'ils' | 'usd', value: string) => {
    if (source === 'ils') {
      const val = parseFloat(value)
      if (!isNaN(val)) {
        setUsdValue((val / baseExchangeRate).toFixed(2))
      } else {
        setUsdValue('')
      }
    } else {
      const val = parseFloat(value)
      if (!isNaN(val)) {
        setIlsValue((val * baseExchangeRate).toFixed(2))
      } else {
        setIlsValue('')
      }
    }
  }

  const formatFiat = (ilsVal: number, usdRate?: number) => {
    const usdVal = usdRate ? ilsVal * usdRate : ilsVal / baseExchangeRate
    return `${ilsVal.toFixed(2)} ₪ ($${usdVal.toFixed(2)})`
  }

  const calculate = async () => {
    let inputILS = 0
    let inputCrypto = 0

    if (!isInverse) {
      inputILS = parseFloat(ilsValue) || parseFloat(usdValue) * baseExchangeRate
      if (!inputILS || inputILS <= 0) {
        alert('הכנס סכום תקין בשקלים או דולרים')
        return
      }
    } else {
      inputCrypto = parseFloat(cryptoValue)
      if (!inputCrypto || inputCrypto <= 0) {
        alert('הכנס כמות מטבעות תקינה')
        return
      }
    }

    setLoading(true)
    setResult(null)

    try {
      // Get coin info
      const coin = coins.find(c => c.id === selectedCoin)!
      const symbol = coin.symbol
      let rateUSD = 0
      
      // Try to get price from portfolio first (faster)
      const portfolioAsset = balances?.unified?.find(asset => asset.coin === symbol)
      
      if (portfolioAsset && (portfolioAsset as any).price && (portfolioAsset as any).price > 0) {
        // Use portfolio price if available
        rateUSD = (portfolioAsset as any).price
        console.log(`Using portfolio price for ${symbol}: $${rateUSD}`)
      } else {
        // Fetch price from Worker using GET_TICKER
        console.log("Fetching external price for:", symbol)
        setPriceLoading(true)
        
        try {
          const tickerResponse = await fetch('https://crypto-terminal-api.07daniel50.workers.dev/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'GET_TICKER', coin: symbol })
          })
          
          console.log("Worker response status:", tickerResponse.status)
          
          if (tickerResponse.ok) {
            const tickerData = await tickerResponse.json()
            console.log("Worker response data:", tickerData)
            rateUSD = tickerData.price || 0
            setDecimalsAllowed(tickerData.decimalsAllowed || 8)
            setSpreadPercent(tickerData.spreadPercent || 0)
            console.log(`Fetched ticker price for ${symbol}: $${rateUSD}, decimals: ${tickerData.decimalsAllowed}, spread: ${tickerData.spreadPercent}%`)
          } else {
            const errorText = await tickerResponse.text()
            console.error(`Failed to fetch ticker for ${symbol}. Status: ${tickerResponse.status}, Error: ${errorText}`)
          }
        } catch (error) {
          console.error(`Error fetching ticker for ${symbol}:`, error)
        } finally {
          setPriceLoading(false)
        }
      }

      if (rateUSD === 0) {
        console.warn(`Price not available for ${symbol}`)
        return
      }

      const rateILS = rateUSD * baseExchangeRate
      console.log(`Final price for ${symbol}: $${rateUSD} (₪${rateILS.toFixed(2)})`)
      
      // Calculate volatility from kline data
      let calculatedVolatility = 0
      if (klineData.length >= 2) {
        const maxPrice = Math.max(...klineData)
        const minPrice = Math.min(...klineData)
        calculatedVolatility = ((maxPrice - minPrice) / minPrice) * 100
        console.log(`Volatility for ${symbol}: ${calculatedVolatility.toFixed(1)}% (max: $${maxPrice}, min: $${minPrice})`)
      }
      
      // Update volatility state for UI
      setVolatility(calculatedVolatility)

      if (!isInverse) {
        // Fiat to Crypto mode
        const myProfitILS = calculateFee(inputILS)

        if (inputILS <= myProfitILS) {
          setLoading(false)
          alert('הסכום נמוך מדי לעסקה (מכסה רק את עמלת השירות שלך)')
          return
        }

        let buyBudgetILS = inputILS - myProfitILS
        let cryptoBought = (buyBudgetILS * (1 - bybitFiatFee)) / rateILS
        let finalToClient = cryptoBought - coin.networkFee
        if (finalToClient < 0) finalToClient = 0

        // Apply lot size rounding (Feature 12)
        const roundingFactor = Math.pow(10, decimalsAllowed)
        finalToClient = Math.floor(finalToClient * roundingFactor) / roundingFactor

        const feeType = inputILS > 200 ? '10% מהסכום' : 'עמלה קבועה של 10₪'
        
        // Check for slippage warning (Feature 1)
        const slippageWarning = spreadPercent > 0.5 ? 
          '⚠️ אזהרת נזילות: פער מחירים (Spread) גבוה' : ''
        
        setResult({
          resultLabel: 'נטו ללקוח (אחרי עמלות):',
          finalResult: `${finalToClient.toFixed(decimalsAllowed)} ${symbol}`,
          amountToBuy: `${(cryptoBought * roundingFactor / roundingFactor).toFixed(decimalsAllowed)} ${symbol}`,
          breakdown: `
            <strong>פירוט עסקה מלא:</strong><br/>
            • הלקוח שילם: ${formatFiat(inputILS, rateUSD / rateILS)}<br/>
            • עמלת שירות שלך: <span style="color:#2e7d32;font-weight:bold;">${formatFiat(myProfitILS, rateUSD / rateILS)}</span> (${feeType})<br/>
            • תקציב קנייה (נטו): ${formatFiat(buyBudgetILS, rateUSD / rateILS)}<br/>
            • עמלת רשת: ${coin.networkFee} ${symbol}<br/>
            • עמלת Bybit: 2%<br/>
            • ${slippageWarning}<br/>
            • עוגל לפי חוקי הבורסה: (עוגל לפי חוקי הבורסה)<br/>
          `
        })

      } else {
        // Crypto to Fiat mode (inverse)
        let cryptoToBuy = inputCrypto + coin.networkFee
        let budgetNeededILS = (cryptoToBuy * rateILS) / (1 - bybitFiatFee)
        
        const myProfitILS = calculateFee(budgetNeededILS)
        let totalToPayILS = budgetNeededILS + myProfitILS

        const feeType = budgetNeededILS > 200 ? '10% מהסכום' : 'עמלה קבועה של 10₪'

        setResult({
          resultLabel: 'הלקוח צריך לשלם בסך הכל:',
          finalResult: formatFiat(totalToPayILS, rateUSD / rateILS),
          amountToBuy: `${cryptoToBuy.toFixed(5)} ${symbol}`,
          breakdown: `
            <strong>פירוט עסקה (חישוב הפוך):</strong><br/>
            • הלקוח יקבל: ${inputCrypto} ${symbol}<br/>
            • עמלת שירות שלך: <span style="color:#2e7d32;font-weight:bold;">${formatFiat(myProfitILS, rateUSD / rateILS)}</span> (${feeType})<br/>
            • שער המטבע: 1 ${symbol} = ${rateILS.toFixed(2)} ₪ / $${rateUSD.toFixed(2)}<br/>
            • עמלת Bybit: 2%<br/>
          `
        })
      }
    } catch (e) {
      console.error('Calculation error:', e)
      alert('שגיאה בחישוב - בדוק נתונים')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!result) return
    const text = `סיכום עסקה: ${result.resultLabel} ${result.finalResult.replace(/<[^>]*>/g, '')}. תודה רבה!`
    navigator.clipboard.writeText(text).then(() => {
      alert('הסיכום הועתק וימוכן להדבקה ללקוח!')
    })
  }

  const toggleMode = () => {
    setIsInverse(!isInverse)
    setResult(null)
    setIlsValue('')
    setUsdValue('')
    setCryptoValue('')
  }

  const saveTransaction = () => {
    if (!result) return
    
    const coin = coins.find(c => c.id === selectedCoin)
    if (!coin) return
    
    const inputILS = parseFloat(ilsValue) || 0
    const fee = calculateFee(inputILS)
    let cryptoAmount = 0
    
    // Extract crypto amount from result
    const cryptoMatch = result.finalResult.match(/([\d.]+)\s+(\w+)/)
    if (cryptoMatch) {
      cryptoAmount = parseFloat(cryptoMatch[1])
    }
    
    const transaction: Transaction = {
      date: new Date().toISOString(),
      fiatAmount: inputILS,
      cryptoAmount,
      coin: coin.symbol,
      fee
    }
    
    const newHistory = [transaction, ...history].slice(0, 10) // Keep last 10
    setHistory(newHistory)
    localStorage.setItem('tx_history', JSON.stringify(newHistory))
  }

  // Auto-refresh price every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!selectedCoin) return
      
      const coin = coins.find(c => c.id === selectedCoin)
      if (!coin) return
      
      try {
        // Silent price fetch without loading indicator
        const response = await fetch('https://crypto-terminal-api.07daniel50.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'GET_TICKER', coin: coin.symbol })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.price) {
            // Update price silently without affecting user input
            setPriceLoading(false)
          }
        }
      } catch (error) {
        console.log('Auto-refresh failed:', error)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [selectedCoin])

  // Fetch kline data when coin changes
  useEffect(() => {
    const fetchKlineData = async () => {
      const coin = coins.find(c => c.id === selectedCoin)
      if (!coin) return
      
      try {
        const response = await fetch('https://crypto-terminal-api.07daniel50.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'GET_KLINE', symbol: coin.symbol })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.prices && Array.isArray(data.prices)) {
            setKlineData(data.prices.reverse()) // Reverse for chronological order
          }
        }
      } catch (error) {
        console.log('Kline fetch failed:', error)
      }
    }

    fetchKlineData()
  }, [selectedCoin])

  // Simple SVG sparkline component
  const Sparkline = ({ data }: { data: number[] }) => {
    if (data.length < 2) return null
    
    const width = 200
    const height = 40
    const padding = 2
    
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    
    const points = data.map((price, index) => {
      const x = (index / (data.length - 1)) * (width - 2 * padding) + padding
      const y = height - padding - ((price - min) / range) * (height - 2 * padding)
      return `${x},${y}`
    }).join(' ')
    
    const lastPrice = data[data.length - 1]
    const firstPrice = data[0]
    const isUp = lastPrice > firstPrice
    
    return (
      <div className="flex items-center gap-2">
        <svg width={width} height={height} className="opacity-80">
          <polyline
            points={points}
            fill="none"
            stroke={isUp ? '#10b981' : '#ef4444'}
            strokeWidth="2"
          />
        </svg>
        <span className={`text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '↗' : '↘'} {((lastPrice - firstPrice) / firstPrice * 100).toFixed(1)}%
        </span>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-400">מחשבון המרה מתקדם</h2>
        <div className="text-sm bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full">
          {isInverse ? 'מצב: הלקוח רוצה כמות קריפטו' : 'מצב: לקוח משלם פיאט (₪/$)'}
        </div>
      </div>

      {!isInverse ? (
        <div className="space-y-4 mb-6">
          <label className="block text-sm font-medium">סכום שהתקבל מהלקוח:</label>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <span className="absolute right-3 top-3 text-gray-400 font-bold">₪</span>
              <input
                type="number"
                value={ilsValue}
                onChange={(e) => {
                  setIlsValue(e.target.value)
                  syncFiat('ils', e.target.value)
                }}
                placeholder="שקלים"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-8 py-3 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="relative">
              <span className="absolute right-3 top-3 text-gray-400 font-bold">$</span>
              <input
                type="number"
                value={usdValue}
                onChange={(e) => {
                  setUsdValue(e.target.value)
                  syncFiat('usd', e.target.value)
                }}
                placeholder="דולרים"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-8 py-3 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="text-xs text-gray-400 text-center">
            שער בסיס (USDT): 1$ = {baseExchangeRate.toFixed(2)} ₪
          </div>
          <div className="text-xs text-blue-400 text-center bg-blue-900/20 rounded p-2">
            💡 עמלה: 10 ש"ח עד 200 ש"ח, 10% מעל 200 ש"ח
          </div>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          <label className="block text-sm font-medium">כמות מטבע מבוקשת ללקוח:</label>
          <div className="relative">
            <span className="absolute right-3 top-3 text-gray-400">💎</span>
            <input
              type="number"
              value={cryptoValue}
              onChange={(e) => setCryptoValue(e.target.value)}
              placeholder="כמה מטבעות לקוח רוצה?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-8 py-3 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <label className="block text-sm font-medium">בחר מטבע:</label>
        <select
          value={selectedCoin}
          onChange={(e) => setSelectedCoin(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 focus:border-blue-500 focus:outline-none"
        >
          {coins.map(coin => (
            <option key={coin.id} value={coin.id}>
              {coin.symbol} - {coin.name}
            </option>
          ))}
        </select>
        
        {/* Mini Graph */}
        {klineData.length > 1 && (
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">מגמה 20 שעות אחרונות:</div>
            <Sparkline data={klineData} />
          </div>
        )}

        {/* Volatility Gauge */}
        {volatility > 0 && (
          <div className="bg-gray-800 rounded-lg p-3 mb-4">
            <div className="text-xs text-gray-400 mb-2">תנודתיות מחירים:</div>
            <div className="flex items-center gap-2">
              {volatility > 5 ? (
                <span className="bg-red-900/30 text-red-400 px-2 py-1 rounded-full text-xs font-medium">
                  🔴 תנודתיות גבוהה (סיכון)
                </span>
              ) : volatility > 2 ? (
                <span className="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded-full text-xs font-medium">
                  🟡 תנודתיות בינונית
                </span>
              ) : (
                <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                  🟢 שוק יציב
                </span>
              )}
              <span className="text-xs text-gray-300">({volatility.toFixed(1)}%)</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={calculate}
          disabled={loading || priceLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? 'מחשב נתונים...' : priceLoading ? 'טוען מחיר...' : 'חשב עסקה'}
        </button>
        
        <button
          onClick={toggleMode}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          🔄 החלף כיוון חישוב
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 text-center">
            <div className="font-semibold text-blue-300 mb-2">{result.resultLabel}</div>
            <div className="text-2xl font-bold text-blue-400" dangerouslySetInnerHTML={{ __html: result.finalResult }} />
          </div>

          <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
            <div className="text-sm text-green-300 mb-1">⚡ כמות לקנייה ב-Bybit:</div>
            <div className="text-xl font-bold text-green-400">{result.amountToBuy}</div>
            <div className="text-xs text-gray-400">(מגלם רווח ועמלות)</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div dangerouslySetInnerHTML={{ __html: result.breakdown }} />
          </div>

          <button
            onClick={copyToClipboard}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            📋 העתק סיכום ללקוח
          </button>

          <button
            onClick={saveTransaction}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            💾 שמור עסקה
          </button>
        </div>
      )}

      {/* Transaction History */}
      {history.length > 0 && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <h4 className="font-semibold mb-3 text-purple-400">📜 היסטוריית עסקאות</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.map((tx, index) => (
              <div key={index} className="text-xs text-gray-300 border-b border-gray-700 pb-2">
                <div className="flex justify-between">
                  <span>{new Date(tx.date).toLocaleDateString('he-IL')} {new Date(tx.date).toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})}</span>
                  <span className="text-purple-400">{tx.coin}</span>
                </div>
                <div className="flex justify-between">
                  <span>₪{tx.fiatAmount.toFixed(2)} → {tx.cryptoAmount.toFixed(6)} {tx.coin}</span>
                  <span className="text-green-400">עמלה: ₪{tx.fee.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h4 className="font-semibold mb-2 text-yellow-400">מבנה עמלות חדש</h4>
        <div className="text-sm text-gray-300 space-y-1">
          <div>• <strong>עמלת שירות:</strong> 10₪ קבוע (עד 200₪) או 10% מהסכום (מעל 200₪)</div>
          <div>• עמלת Bybit: 2%</div>
          <div>• עמלות רשת לפי מטבע</div>
          <div className="text-xs text-gray-400 mt-2">העמלה מחושבת אוטומטית לפי גודל העסקה</div>
        </div>
      </div>
    </div>
  )
}
