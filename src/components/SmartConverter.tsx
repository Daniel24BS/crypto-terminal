import { useState, useEffect } from 'react'

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
  { id: 'solana', symbol: 'SOL', name: 'Solana', networkFee: 0.008 },
  { id: 'tether', symbol: 'USDT', name: 'Tether', networkFee: 1.0 },
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', networkFee: 0.0002 },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', networkFee: 0.0012 },
  { id: 'ripple', symbol: 'XRP', name: 'Ripple', networkFee: 0.2 },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', networkFee: 5.0 },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', networkFee: 0.001 },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe', networkFee: 500000 },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', networkFee: 100000 }
]

export default function SmartConverter() {
  const [isInverse, setIsInverse] = useState(false)
  const [ilsValue, setIlsValue] = useState('')
  const [usdValue, setUsdValue] = useState('')
  const [cryptoValue, setCryptoValue] = useState('')
  const [selectedCoin, setSelectedCoin] = useState('solana')
  const [baseExchangeRate, setBaseExchangeRate] = useState(3.65)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ConversionResult | null>(null)

  const MINIMUM_FEE_ILS = 15
  const bybitFiatFee = 0.02

  useEffect(() => {
    initRate()
  }, [])

  const initRate = async () => {
    try {
      // Get ILS rate from our Cloudflare Worker API
      console.log("Fetching ILS rate from Cloudflare Worker...")
      const response = await fetch('https://crypto-terminal-api.your-subdomain.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data?.ilsRate) {
          setBaseExchangeRate(data.ilsRate)
          console.log("SUCCESS: ILS rate from Cloudflare Worker:", data.ilsRate)
          return
        }
      }
      
      throw new Error('No ILS rate in server response')
    } catch (e) {
      console.error('Failed to fetch ILS rate from Cloudflare Worker:', e)
      // FALLBACK: Set a reasonable default rate so app doesn't crash
      console.log('Using fallback ILS rate: 3.65')
      setBaseExchangeRate(3.65)
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
      // Fetch current coin rates from our Cloudflare Worker API
      console.log("Fetching coin rates from Cloudflare Worker...")
      const response = await fetch('https://crypto-terminal-api.your-subdomain.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log("SUCCESS: Coin data from Cloudflare Worker:", data)

      if (!data?.balances?.result?.list) {
        throw new Error('No portfolio data found')
      }

      const rateILS = data.balances.result.list[0].coin.find((c: any) => c.coin === selectedCoin)?.usdPrice || 0
      const rateUSD = data.balances.result.list[0].coin.find((c: any) => c.coin === selectedCoin)?.usdPrice || 0
        const coin = coins.find(c => c.id === selectedCoin)!
        const symbol = coin.symbol

        try {
          if (!isInverse) {
            // Fiat to Crypto mode
            let profitRate = inputILS < 400 ? 0.10 : 0.15
            let myProfitILS = Math.max(inputILS * profitRate, MINIMUM_FEE_ILS)

            if (inputILS <= myProfitILS) {
              setLoading(false)
              alert('הסכום נמוך מדי לעסקה (מכסה רק את המינימום רווח שלך שעומד על ${MINIMUM_FEE_ILS} ₪)')
              return
            }

            let buyBudgetILS = inputILS - myProfitILS
            let cryptoBought = (buyBudgetILS * (1 - bybitFiatFee)) / rateILS
            let finalToClient = cryptoBought - coin.networkFee
            if (finalToClient < 0) finalToClient = 0

            setResult({
              resultLabel: 'נטו ללקוח (אחרי עמלות):',
              finalResult: `${finalToClient.toFixed(5)} ${symbol}`,
              amountToBuy: `${cryptoBought.toFixed(5)} ${symbol}`,
              breakdown: `
                <strong>פירוט עסקה מלא:</strong><br/>
                • הלקוח שילם: ${formatFiat(inputILS, rateUSD / rateILS)}<br/>
                • הרווח שלך: <span style="color:#2e7d32;font-weight:bold;">${formatFiat(myProfitILS, rateUSD / rateILS)}</span> ${myProfitILS === MINIMUM_FEE_ILS ? '(מינימום)' : ''}<br/>
                • תקציב קנייה (נטו): ${formatFiat(buyBudgetILS, rateUSD / rateILS)}<br/>
                • עמלת רשת: ${coin.networkFee} ${symbol}<br/>
              `
            })

          } else {
            // Crypto to Fiat mode (inverse)
            let cryptoToBuy = inputCrypto + coin.networkFee
            let budgetNeededILS = (cryptoToBuy * rateILS) / (1 - bybitFiatFee)
            
            let profitRate = budgetNeededILS < 360 ? 0.10 : 0.15
            let calculatedProfitILS = (budgetNeededILS / (1 - profitRate)) - budgetNeededILS
            let myProfitILS = Math.max(calculatedProfitILS, MINIMUM_FEE_ILS)
            let totalToPayILS = budgetNeededILS + myProfitILS

            setResult({
              resultLabel: 'הלקוח צריך לשלם בסך הכל:',
              finalResult: formatFiat(totalToPayILS, rateUSD / rateILS),
              amountToBuy: `${cryptoToBuy.toFixed(5)} ${symbol}`,
              breakdown: `
                <strong>פירוט עסקה (חישוב הפוך):</strong><br/>
                • הלקוח יקבל: ${inputCrypto} ${symbol}<br/>
                • הרווח שלך: <span style="color:#2e7d32;font-weight:bold;">${formatFiat(myProfitILS, rateUSD / rateILS)}</span> ${myProfitILS === MINIMUM_FEE_ILS ? '(מינימום)' : ''}<br/>
                • שער המטבע: 1 ${symbol} = ${rateILS.toFixed(2)} ₪ / $${rateUSD.toFixed(2)}<br/>
              `
            })
          }
        } catch (e) {
          console.error('Calculation error:', e)
          alert('שגיאה בחישוב - בדוק נתונים')
        }
      } catch (e) {
        console.error('Calculation error:', e)
        alert('שגיאה במשיכת שערים - בדוק חיבור אינטרנט')
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
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? 'מחשב נתונים...' : 'חשב עסקה'}
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
        <h4 className="font-semibold mb-2 text-yellow-400">מבנה עמלות</h4>
        <div className="text-sm text-gray-300 space-y-1">
          <div>• רווח מינימלי: {MINIMUM_FEE_ILS} ₪</div>
          <div>• מרווח עסקות: 10% (עד 400₪) / 15% (מעל 400₪)</div>
          <div>• עמלת Bybit: 2%</div>
          <div>• עמלות רשת לפי מטבע</div>
        </div>
      </div>
    </div>
  )
}
