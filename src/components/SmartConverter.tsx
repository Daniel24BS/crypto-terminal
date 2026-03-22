import { useState, useEffect } from 'react'
import { usePortfolio } from '../context/PortfolioContext'

// Core Constants
const MINIMUM_FEE_ILS = 10

// Network Fees (Fixed)
const networkFees: { [key: string]: number } = {
  'SOL': 0.008,
  'USDT': 1.0,
  'BTC': 0.0002,
  'ETH': 0.0012,
  'XRP': 0.2,
  'LTC': 0.001,
  'ADA': 0.17,
  'AVAX': 0.001,
  'DOGE': 5.0,
  'SHIB': 100000,
  'PEPE': 500000,
  'DOT': 0.1,
  'LINK': 0.01,
  'NEAR': 0.025,
  'BCH': 0.0001,
  'FET': 0.1,
  'INJ': 0.01,
  'KAS': 0.1,
  'TON': 0.05
}

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
  amountToBuyOnBybit: string
  netProfit: number
  profitMargin: number
}

interface Transaction {
  date: string
  fiatAmount: number
  cryptoAmount: number
  coin: string
  fee: number
}

const coins: Coin[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', networkFee: networkFees['BTC'] },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', networkFee: networkFees['ETH'] },
  { id: 'solana', symbol: 'SOL', name: 'Solana', networkFee: networkFees['SOL'] },
  { id: 'xrp', symbol: 'XRP', name: 'Ripple', networkFee: networkFees['XRP'] },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', networkFee: networkFees['LTC'] },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', networkFee: networkFees['ADA'] },
  { id: 'avalanche', symbol: 'AVAX', name: 'Avalanche', networkFee: networkFees['AVAX'] },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', networkFee: networkFees['DOGE'] },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', networkFee: networkFees['SHIB'] },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe', networkFee: networkFees['PEPE'] },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', networkFee: networkFees['DOT'] },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', networkFee: networkFees['LINK'] },
  { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', networkFee: networkFees['NEAR'] },
  { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash', networkFee: networkFees['BCH'] },
  { id: 'fetch', symbol: 'FET', name: 'Fetch.ai', networkFee: networkFees['FET'] },
  { id: 'injective', symbol: 'INJ', name: 'Injective', networkFee: networkFees['INJ'] },
  { id: 'kaspa', symbol: 'KAS', name: 'Kaspa', networkFee: networkFees['KAS'] },
  { id: 'toncoin', symbol: 'TON', name: 'Toncoin', networkFee: networkFees['TON'] }
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
  const [rateUSD, setRateUSD] = useState(0)
  const [isRefreshingRate, setIsRefreshingRate] = useState(false)
  const [bybitFiatFee, setBybitFiatFee] = useState(5.5)
  const [currentCryptoToILSRate, setCurrentCryptoToILSRate] = useState(0)
  const [currentUSDToILSRate, setCurrentUSDToILSRate] = useState(0)

  // Update exchange rate when portfolio data changes
  useEffect(() => {
    if (balances?.usdToIlsRate) {
      setBaseExchangeRate(balances.usdToIlsRate)
    }
  }, [balances?.usdToIlsRate])

  // Auto-refresh USD/ILS exchange rate every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (balances?.usdToIlsRate) {
        setBaseExchangeRate(balances.usdToIlsRate)
      }
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [balances?.usdToIlsRate])

  // Fetch transactions from KV storage on component mount
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('https://crypto-terminal-api.07daniel50.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'GET_TXS' })
        })
        
        if (response.ok) {
          const data = await response.json()
          setHistory(data.history || [])
          console.log('Fetched transactions from KV:', data.count)
        }
      } catch (error) {
        console.error('Failed to fetch transactions from KV:', error)
        // Fallback to localStorage if KV fails
        const saved = localStorage.getItem('tx_history')
        if (saved) {
          setHistory(JSON.parse(saved))
        }
      }
    }

    fetchTransactions()
  }, [])

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
        // Auto-update USD input when ILS changes
        const usdEquivalent = val / baseExchangeRate
        setUsdValue(usdEquivalent.toFixed(2))
      } else {
        setIlsValue('')
      }
    } else {
      const val = parseFloat(value)
      if (!isNaN(val)) {
        setIlsValue((val * baseExchangeRate).toFixed(2))
        // Auto-update ILS input when USD changes
        const ilsEquivalent = val * baseExchangeRate
        setIlsValue(ilsEquivalent.toFixed(2))
      } else {
        setUsdValue('')
      }
    }
  }

  const formatFiat = (ilsAmount: number) => {
    const usdValue = ilsAmount / baseExchangeRate; // baseExchangeRate is USDT/ILS rate
    return `${ilsAmount.toFixed(2)} ₪ ($${usdValue.toFixed(2)})`
  }

  const calculate = async () => {
    // Assume these variables are pulled from state/API
    const MINIMUM_FEE_ILS = 10;
    const feeInput = Number(bybitFiatFee) / 100; // e.g., 5.5 -> 0.055
    const networkFee = coins.find(c => c.id === selectedCoin)?.networkFee || 0;
    
    // Fetch current crypto price from CoinGecko
    let rateILS = 0;
    try {
      const coin = coins.find(c => c.id === selectedCoin)
      if (coin) {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`)
        if (response.ok) {
          const data = await response.json()
          const cryptoPriceUSD = data[coin.id]?.usd || 0
          rateILS = cryptoPriceUSD * baseExchangeRate
          console.log(`Fetched ${coin.symbol} price: $${cryptoPriceUSD}, ₪${rateILS.toFixed(2)}`)
        }
      }
    } catch (error) {
      console.error('Failed to fetch crypto price:', error)
      alert('שגיאה בקבלת מחיר מטבע')
      return
    }

    if (!rateILS || rateILS <= 0) {
      alert('לא ניתן לקבל מחיר עבור המטבע')
      return
    }

    if (!isInverse) {
      // MODE: Client pays ILS
      const inputILS = parseFloat(ilsValue) || parseFloat(usdValue) * baseExchangeRate
      
      if (!inputILS || inputILS <= 0) {
        alert('הכנס סכום תקין בשקלים או דולרים')
        return
      }

      const profitRate = inputILS < 400 ? 0.10 : 0.15;
      const calculatedProfit = inputILS * profitRate;
      const myProfitILS = Math.max(calculatedProfit, MINIMUM_FEE_ILS);

      if (inputILS <= myProfitILS) {
        alert(`סכום נמוך מדי לעסקה (מינימום ₪${MINIMUM_FEE_ILS})`)
        return;
      }

      const buyBudgetILS = inputILS - myProfitILS;
      const cryptoBought = (buyBudgetILS * (1 - feeInput)) / rateILS;
      const finalToClient = Math.max(0, cryptoBought - networkFee);
      
      // Update state with results
      setResult({
        resultLabel: 'נטו ללקוח (אחרי עמלות):',
        finalResult: `${finalToClient.toFixed(6)} ${selectedCoin.toUpperCase()}`,
        amountToBuy: `${cryptoBought.toFixed(6)} ${selectedCoin.toUpperCase()}`,
        amountToBuyOnBybit: `${cryptoBought.toFixed(6)} ${selectedCoin.toUpperCase()}`,
        netProfit: myProfitILS,
        profitMargin: profitRate * 100,
        breakdown: `
          <strong>פירוט עסקה מלא:</strong><br/>
          • הלקוח שילם: ${formatFiat(inputILS)}<br/>
          • רווח שלך: <span style="color:#2e7d32;font-weight:bold;">${formatFiat(myProfitILS)}</span> (${(profitRate * 100).toFixed(0)}%${myProfitILS === MINIMUM_FEE_ILS ? ' - מינימום' : ''})<br/>
          • תקציב לקנייה ב-Bybit: ${formatFiat(buyBudgetILS)}<br/>
          • עמלת רשת: ${networkFee.toFixed(6)} ${selectedCoin.toUpperCase()}<br/>
          • עמלת Bybit: ${bybitFiatFee}%<br/>
          • שער המטבע: 1 ${selectedCoin.toUpperCase()} = ${rateILS.toFixed(2)} ₪<br/>
        `
      });

    } else {
      // INVERSE MODE: Client wants exactly X Crypto
      const inputCrypto = parseFloat(cryptoValue)
      
      if (!inputCrypto || inputCrypto <= 0) {
        alert('הכנס כמות מטבעות תקינה')
        return
      }

      const cryptoToBuy = inputCrypto + networkFee;
      const budgetNeededILS = (cryptoToBuy * rateILS) / (1 - feeInput);
      
      const profitRate = budgetNeededILS < 360 ? 0.10 : 0.15;
      const calculatedProfitILS = (budgetNeededILS / (1 - profitRate)) - budgetNeededILS;
      const myProfitILS = Math.max(calculatedProfitILS, MINIMUM_FEE_ILS);
      
      const totalToPayILS = budgetNeededILS + myProfitILS;

      // Update state with results
      setResult({
        resultLabel: 'הלקוח צריך לשלם בסך הכל:',
        finalResult: formatFiat(totalToPayILS),
        amountToBuy: `${cryptoToBuy.toFixed(6)} ${selectedCoin.toUpperCase()}`,
        amountToBuyOnBybit: `${cryptoToBuy.toFixed(6)} ${selectedCoin.toUpperCase()}`,
        netProfit: myProfitILS,
        profitMargin: profitRate * 100,
        breakdown: `
          <strong>פירוט עסקה מלא:</strong><br/>
          • הלקוח יקבל: ${inputCrypto} ${selectedCoin.toUpperCase()}<br/>
          • רווח שלך: <span style="color:#2e7d32;font-weight:bold;">${formatFiat(myProfitILS)}</span> (${(profitRate * 100).toFixed(0)}%${myProfitILS === MINIMUM_FEE_ILS ? ' - מינימום' : ''})<br/>
          • עלות ב-Bybit: ${formatFiat(budgetNeededILS)}<br/>
          • עמלת רשת: ${networkFee.toFixed(6)} ${selectedCoin.toUpperCase()}<br/>
          • עמלת Bybit: ${bybitFiatFee}%<br/>
          • שער המטבע: 1 ${selectedCoin.toUpperCase()} = ${rateILS.toFixed(2)} ₪<br/>
        `
      });
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

  const saveTransaction = async () => {
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
    
    try {
      // Save to KV storage
      const response = await fetch('https://crypto-terminal-api.07daniel50.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_TX',
          transaction: transaction
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
        console.log('Transaction saved to KV:', data.count)
      } else {
        throw new Error('Failed to save to KV')
      }
    } catch (error) {
      console.error('Failed to save transaction to KV, falling back to localStorage:', error)
      // Fallback to localStorage
      const newHistory = [transaction, ...history].slice(0, 10)
      setHistory(newHistory)
      localStorage.setItem('tx_history', JSON.stringify(newHistory))
    }
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

  // WhatsApp Receipt Function
  const sendWhatsAppReceipt = () => {
    if (!result) return
    
    const coin = coins.find(c => c.id === selectedCoin)
    if (!coin) return
    
    const inputILS = parseFloat(ilsValue) || parseFloat(usdValue) * baseExchangeRate
    const fee = calculateFee(inputILS)
    const feeType = inputILS > 200 ? '10%' : '10₪ קבועה'
    
    // Extract crypto amount from result
    const cryptoMatch = result.finalResult.match(/([\d.]+)\s+(\w+)/)
    const cryptoAmount = cryptoMatch ? parseFloat(cryptoMatch[1]) : 0
    const cryptoSymbol = cryptoMatch ? cryptoMatch[2] : coin.symbol
    
    // Build professional Hebrew message
    const message = `שלום! 🤝 עסקת המרה בוצעה בהצלחה

📊 פרטי העסקה:
• סכום ששולם: ₪${inputILS.toFixed(2)}
• מטבע שהתקבל: ${cryptoAmount.toFixed(6)} ${cryptoSymbol}
• שער דולר: $${rateUSD.toFixed(2)}
• עמלת שירות: ₪${fee.toFixed(2)} (${feeType})
• תנודתיות: ${volatility.toFixed(1)}%
• פער מחירים: ${spreadPercent.toFixed(2)}%

🎯 סטטוס: העסקה הושלמה בהצלחה!
תודה שבחרת בשירות שלנו! 🚀`

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  // Force refresh USD/ILS rate
  const forceRefreshUSD = async () => {
    setIsRefreshingRate(true)
    
    try {
      // Fetch fresh USD/ILS rate from CoinGecko
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=ils')
      if (response.ok) {
        const data = await response.json()
        const newRate = data.usd.ils
        if (newRate && newRate > 0) {
          setBaseExchangeRate(newRate)
          console.log('USD/ILS rate force-refreshed:', newRate)
        }
      } else {
        console.error('Failed to fetch fresh USD/ILS rate')
      }
    } catch (error) {
      console.error('Error force-refreshing USD/ILS rate:', error)
    } finally {
      setIsRefreshingRate(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-blue-400">מחשבון המרה מתקדם</h2>
        <div className="text-sm bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full">
          {isInverse ? 'מצב: הלקוח רוצה כמות קריפטו' : 'מצב: לקוח משלם פיאט (₪/$)'}
        </div>
      </div>

      {/* Live USD Rate Display */}
      <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">🇺🇸 שער דולר רציף:</span>
            <span className="text-lg font-bold text-green-400">
              ₪{baseExchangeRate.toFixed(2)}
            </span>
          </div>
          <button
            onClick={forceRefreshUSD}
            disabled={isRefreshingRate}
            className="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded transition-colors"
          >
            {isRefreshingRate ? '⏳ טוען...' : '🔄 רענן שער מט"ח'}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">מתעדכן אוטומטית כל 60 שניות</div>
      </div>

      {/* Editable Spread Fee Input */}
      <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-red-400">⚠️ עמלת Bybit (פער נסתר):</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={bybitFiatFee}
              onChange={(e) => setBybitFiatFee(parseFloat(e.target.value) || 5.5)}
              step="0.1"
              min="0"
              max="20"
              className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-red-500"
              placeholder="5.5"
            />
            <span className="text-sm text-red-400">%</span>
          </div>
        </div>
        <div className="text-xs text-red-500 mt-1">בדוק את העמלה לפי ספק הצרכים שלך</div>
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

          <button
            onClick={sendWhatsAppReceipt}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            📱 שלח קבלה בוואטסאפ
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
