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
            console.log(`Fetched ticker price for ${symbol}: $${rateUSD}`)
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

        const feeType = inputILS > 200 ? '10% מהסכום' : 'עמלה קבועה של 15₪'
        
        setResult({
          resultLabel: 'נטו ללקוח (אחרי עמלות):',
          finalResult: `${finalToClient.toFixed(5)} ${symbol}`,
          amountToBuy: `${cryptoBought.toFixed(5)} ${symbol}`,
          breakdown: `
            <strong>פירוט עסקה מלא:</strong><br/>
            • הלקוח שילם: ${formatFiat(inputILS, rateUSD / rateILS)}<br/>
            • עמלת שירות שלך: <span style="color:#2e7d32;font-weight:bold;">${formatFiat(myProfitILS, rateUSD / rateILS)}</span> (${feeType})<br/>
            • תקציב קנייה (נטו): ${formatFiat(buyBudgetILS, rateUSD / rateILS)}<br/>
            • עמלת רשת: ${coin.networkFee} ${symbol}<br/>
            • עמלת Bybit: 2%<br/>
          `
        })

      } else {
        // Crypto to Fiat mode (inverse)
        let cryptoToBuy = inputCrypto + coin.networkFee
        let budgetNeededILS = (cryptoToBuy * rateILS) / (1 - bybitFiatFee)
        
        const myProfitILS = calculateFee(budgetNeededILS)
        let totalToPayILS = budgetNeededILS + myProfitILS

        const feeType = budgetNeededILS > 200 ? '10% מהסכום' : 'עמלה קבועה של 15₪'

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
