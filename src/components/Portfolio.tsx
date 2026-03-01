import { useState, useEffect } from 'react'
import { usePortfolio } from '../App'

export default function Portfolio() {
  const {
    balances, setBalances, loading, setLoading, error, setError,
    isConnected, setIsConnected, apiKey, apiSecret, setApiKey, setApiSecret, usdToIlsRate
  } = usePortfolio()

  const [isRefreshingRate, setIsRefreshingRate] = useState(false)
  const [buyPrices, setBuyPrices] = useState<{[coin: string]: string}>({})

  useEffect(() => {
    const savedKey = localStorage.getItem('bybit_api_key')
    const savedSecret = localStorage.getItem('bybit_api_secret')
    if (savedKey && savedSecret) {
      setApiKey(savedKey)
      setApiSecret(savedSecret)
      setIsConnected(true)
    }

    // Load buy prices from localStorage
    const savedBuyPrices = localStorage.getItem('portfolioBuyPrices')
    if (savedBuyPrices) {
      setBuyPrices(JSON.parse(savedBuyPrices))
    }
  }, [])

  // Auto-refresh exchange rate every 30 seconds
  useEffect(() => {
    // Initial rate fetch
    refreshExchangeRate()

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      refreshExchangeRate()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  const updateBuyPrice = (coin: string, price: string) => {
    const newBuyPrices = { ...buyPrices, [coin]: price }
    setBuyPrices(newBuyPrices)
    localStorage.setItem('portfolioBuyPrices', JSON.stringify(newBuyPrices))
  }

  const calculatePnL = (coin: string, currentUSDValue: number, amount: string) => {
    const buyPrice = parseFloat(buyPrices[coin] || '0')
    if (buyPrice === 0) return { profit: 0, profitPercent: 0, roi: 0 }
    
    const currentValue = currentUSDValue
    const buyValue = buyPrice * parseFloat(amount)
    const profit = currentValue - buyValue
    const profitPercent = buyValue > 0 ? (profit / buyValue) * 100 : 0
    const roi = currentValue > 0 ? (currentValue / buyValue - 1) * 100 : 0
    
    return { profit, profitPercent, roi }
  }

  const saveCredentials = () => {
    localStorage.setItem('bybit_api_key', apiKey)
    localStorage.setItem('bybit_api_secret', apiSecret)
    setIsConnected(true)
  }

  const clearCredentials = () => {
    localStorage.removeItem('bybit_api_key')
    localStorage.removeItem('bybit_api_secret')
    setApiKey('')
    setApiSecret('')
    setIsConnected(false)
    setBalances(null)
    setError('')
  }

  const createSignature = async (originString: string, secret: string): Promise<string> => {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(originString)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const signatureArray = Array.from(new Uint8Array(signatureBuffer))
    return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // ULTIMATE PORTFOLIO SCANNER - All 5 endpoints simultaneously with Promise.allSettled
  const fetchUltimatePortfolio = async (key: string, secret: string) => {
    console.log('🚀 ULTIMATE PORTFOLIO SCANNER - Fetching from ALL endpoints simultaneously')
    
    const timestamp = Date.now().toString()
    const recvWindow = '5000'
    
    // Define all 5 endpoints with proper parsing logic and limit=50
    const endpoints = [
      {
        name: 'UNIFIED (UTA Trading)',
        url: 'https://api.bybit.com/v5/account/wallet-balance',
        qs: 'accountType=UNIFIED&limit=50',
        extractData: (data: any) => {
          console.log('🔍 UNIFIED Raw Response:', data)
          const coins = data?.result?.list?.[0]?.coin || []
          console.log('🔍 UNIFIED Extracted Coins:', coins)
          return coins
        }
      },
      {
        name: 'SPOT (Standard Spot)',
        url: 'https://api.bybit.com/v5/account/wallet-balance',
        qs: 'accountType=SPOT&limit=50',
        extractData: (data: any) => {
          console.log('🔍 SPOT Raw Response:', data)
          const coins = data?.result?.list?.[0]?.coin || []
          console.log('🔍 SPOT Extracted Coins:', coins)
          return coins
        }
      },
      {
        name: 'FUND (Funding)',
        url: 'https://api.bybit.com/v5/asset/transfer/query-account-coins-balance',
        qs: 'accountType=FUND&limit=50',
        extractData: (data: any) => {
          console.log('🔍 FUND Raw Response:', data)
          const coins = data?.result?.balance || data?.result?.list || []
          console.log('🔍 FUND Extracted Coins:', coins)
          return coins
        }
      },
      {
        name: 'EARN FlexibleSaving',
        url: 'https://api.bybit.com/v5/earn/position',
        qs: 'category=FlexibleSaving&limit=50',
        extractData: (data: any) => {
          console.log('🔍 EARN FlexibleSaving Raw Response:', data)
          const coins = data?.result?.list || []
          console.log('🔍 EARN FlexibleSaving Extracted Coins:', coins)
          return coins
        }
      },
      {
        name: 'EARN FixedSaving',
        url: 'https://api.bybit.com/v5/earn/position',
        qs: 'category=FixedSaving&limit=50',
        extractData: (data: any) => {
          console.log('🔍 EARN FixedSaving Raw Response:', data)
          const coins = data?.result?.list || []
          console.log('🔍 EARN FixedSaving Extracted Coins:', coins)
          return coins
        }
      }
    ]

    // Create promises for all endpoints
    const promises = endpoints.map(async (endpoint) => {
      try {
        const originString = timestamp + key + recvWindow + endpoint.qs
        const signature = await createSignature(originString, secret)
        const url = `${endpoint.url}?${endpoint.qs}`
        
        console.log(`🔍 Fetching ${endpoint.name}...`)
        console.log(`🔐 Origin String: ${originString}`)
        console.log(`🌐 Full URL: ${url}`)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-BAPI-API-KEY': key,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()
        console.log(`📊 ${endpoint.name} Full Response:`, data)
        
        if (data?.retCode && data.retCode !== 0) {
          console.error(`❌ ${endpoint.name} ERROR: Code ${data.retCode} - ${data.retMsg}`)
          if (data.retCode === 10005) {
            throw new Error(`Permission Denied: Enable 'Earn' permissions in Bybit API settings.`)
          }
          return { name: endpoint.name, data: [], error: data.retMsg, rawData: data }
        }

        const extractedData = endpoint.extractData(data)
        console.log(`✅ ${endpoint.name}: ${extractedData.length} items found`)
        
        return { name: endpoint.name, data: extractedData, error: null, rawData: data }
      } catch (err: any) {
        console.error(`❌ ${endpoint.name} FAILED:`, err)
        return { name: endpoint.name, data: [], error: err.message, rawData: null }
      }
    })

    // Execute all promises with Promise.allSettled - NO CRASHES FROM FAILED ENDPOINTS
    const results = await Promise.allSettled(promises)
    
    // Process settled results
    const successfulResults: any[] = []
    const failedResults: any[] = []
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value)
        console.log(`✅ ${endpoints[index].name} SUCCESS`)
      } else {
        failedResults.push({ name: endpoints[index].name, error: result.reason })
        console.error(`❌ ${endpoints[index].name} FAILED:`, result.reason)
      }
    })
    
    console.log(`📊 Summary: ${successfulResults.length} successful, ${failedResults.length} failed`)
    
    // Store raw data for debugging
    ;(window as any).bybitRawData = successfulResults
    
    // Merge all data by coin symbol from successful results only
    const allCoinsMap = new Map<string, {
      coin: string
      totalAmount: string
      sources: string[]
      usdValue: number
    }>()

    successfulResults.forEach((result) => {
      if (result.data && Array.isArray(result.data)) {
        result.data.forEach((item: any) => {
          const coin = item.coin || ''
          let amount = '0'
          
          // Handle different balance field names
          if (item.totalAmount) amount = item.totalAmount
          else if (item.amount) amount = item.amount
          else if (item.walletBalance) amount = item.walletBalance
          else if (item.available) amount = item.available
          else if (item.free) amount = item.free
          
          console.log(`🪙 Processing ${coin}: ${amount} from ${result.name}`)
          
          if (coin && parseFloat(amount) > 0) {
            const existing = allCoinsMap.get(coin) || {
              coin,
              totalAmount: '0',
              sources: [],
              usdValue: 0
            }
            
            // Sum amounts from same coin
            const currentAmount = parseFloat(existing.totalAmount)
            const newAmount = parseFloat(amount)
            existing.totalAmount = (currentAmount + newAmount).toString()
            existing.sources.push(result.name)
            
            allCoinsMap.set(coin, existing)
          }
        })
      }
    })

    const mergedCoins = Array.from(allCoinsMap.values())
    console.log(`🎯 ULTIMATE SCANNER COMPLETE: ${mergedCoins.length} unique coins found`)
    console.log('📊 Merged portfolio data:', mergedCoins)
    
    return mergedCoins
  }

  const fetchBybitEarnAccount = async (key: string, secret: string) => {
    let allEarnPositions: any[] = []
    
    // Test THREE separate Earn categories
    const categories = [
      { name: 'FlexibleSaving', description: 'Easy Earn' },
      { name: 'FixedSaving', description: 'Locked Terms' },
      { name: 'OnChain', description: 'ETH2.0/Staking' }
    ]
    
    for (const category of categories) {
      try {
        console.log(`🔍 Testing EARN category: ${category.name} (${category.description})`)
        
        const timestamp = Date.now().toString()
        const recvWindow = '5000'
        // Query string with ONLY endpoint parameters
        const qs = `category=${category.name}`
        
        // Build origin string: timestamp + apiKey + recvWindow + qs
        const originString = timestamp + key + recvWindow + qs
        console.log(`🔐 Origin String: ${originString}`)
        
        const signature = await createSignature(originString, secret)
        
        // Fetch URL with ONLY endpoint parameters
        const url = `https://api.bybit.com/v5/earn/position?${qs}`
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-BAPI-API-KEY': key,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()
        console.log(`📊 Earn Response (${category.name}):`, data)
        
        // Check for permission errors
        if (data?.retCode === 10005) {
          console.error(`❌ Permission Denied for ${category.name}: retCode 10005`)
          throw new Error(`Permission Denied: Enable 'Earn' in Bybit API settings.`)
        }

        if (!response.ok) {
          console.error(`❌ HTTP Error for ${category.name}: ${response.status}`)
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Handle response structure
        const earnList = data?.result?.list || []
        console.log(`📋 EARN ${category.name} positions list (${earnList.length} items):`, earnList)
        
        if (Array.isArray(earnList) && earnList.length > 0) {
          console.log(`✅ Found ${earnList.length} positions in ${category.name}`)
          allEarnPositions = [...allEarnPositions, ...earnList]
        } else {
          console.log(`⚠️ No positions found in ${category.name}`)
        }
        
      } catch (err: any) {
        console.error(`❌ Failed to fetch EARN ${category.name}:`, err)
        if (err.message.includes('Permission Denied')) {
          // Re-throw permission errors to stop execution
          throw err
        }
        // Continue with other categories for other errors
      }
    }
    
    console.log(`🎯 Combined EARN positions from all categories: ${allEarnPositions.length} total`)
    console.log('📊 All EARN positions:', allEarnPositions)
    return allEarnPositions
  }

  const fetchBybitFundAccount = async (key: string, secret: string) => {
    const timestamp = Date.now().toString()
    const recvWindow = '5000'
    // Query string with ONLY endpoint parameters
    const qs = `accountType=FUND`
    
    // Build origin string: timestamp + apiKey + recvWindow + qs
    const originString = timestamp + key + recvWindow + qs
    console.log(`🔐 Origin String: ${originString}`)
    
    const signature = await createSignature(originString, secret)
    
    // Fetch URL with ONLY endpoint parameters
    const url = `https://api.bybit.com/v5/asset/transfer/query-account-coins-balance?${qs}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': key,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Bybit FUND (Funding/Idle) response:', data)
    
    const coinList = data?.result?.list || data?.result || []
    console.log('FUND coin list:', coinList)
    
    return coinList
  }

  const fetchBybitUnifiedAccount = async (key: string, secret: string) => {
    const timestamp = Date.now().toString()
    const recvWindow = '5000'
    // Query string with ONLY endpoint parameters
    const qs = `accountType=UNIFIED`
    
    // Build origin string: timestamp + apiKey + recvWindow + qs
    const originString = timestamp + key + recvWindow + qs
    console.log(`🔐 Origin String: ${originString}`)
    
    const signature = await createSignature(originString, secret)
    
    // Fetch URL with ONLY endpoint parameters
    const url = `https://api.bybit.com/v5/account/wallet-balance?${qs}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': key,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Bybit UNIFIED response:', data)
    
    const coinList = data?.result?.list?.[0]?.coin || []
    console.log('UNIFIED coin list:', coinList)
    
    return coinList
  }

  const fetchUSDToILSRate = async (): Promise<number> => {
    try {
      // Try Open Exchange Rates API first (more reliable for fiat)
      const response = await fetch('https://open.er-api.com/v6/latest/USD')
      if (response.ok) {
        const data = await response.json()
        console.log('Open Exchange Rates USD to ILS data:', data)
        if (data?.rates?.ILS) {
          return data.rates.ILS
        }
      }
    } catch (error) {
      console.error('Failed to fetch from Open Exchange Rates:', error)
    }

    // Fallback to CoinGecko
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ils')
      if (response.ok) {
        const data = await response.json()
        console.log('CoinGecko USD to ILS rate data:', data)
        return data?.tether?.ils || 3.7
      }
    } catch (error) {
      console.error('Failed to fetch from CoinGecko:', error)
    }
    
    return 3.7 // fallback rate
  }

  const printRawData = () => {
    console.log('🔍 === BYBIT RAW DATA INSPECTION ===')
    const rawData = (window as any).bybitRawData
    if (rawData) {
      rawData.forEach((result: any, index: number) => {
        console.log(`\n📊 ENDPOINT ${index + 1}: ${result.name}`)
        console.log('Status:', result.error ? 'FAILED' : 'SUCCESS')
        console.log('Items found:', result.data?.length || 0)
        console.log('Raw JSON Response:', result.rawData)
        console.log('Extracted Data:', result.data)
      })
    } else {
      console.log('❌ No raw data available. Please fetch portfolio first.')
    }
    console.log('🔍 === END RAW DATA INSPECTION ===')
  }

  const refreshExchangeRate = async () => {
    setIsRefreshingRate(true)
    try {
      const newRate = await fetchUSDToILSRate()
      // Update context through setBalances if balances exist
      if (balances) {
        const newTotalILS = balances.totalUSD * newRate
        setBalances({
          ...balances,
          totalILS: newTotalILS,
          usdToIlsRate: newRate
        })
      }
      
      console.log(`💰 Exchange rate updated: 1 USD = ${newRate.toFixed(4)} ILS`)
    } catch (error) {
      console.error('Failed to refresh exchange rate:', error)
    } finally {
      setIsRefreshingRate(false)
    }
  }

  const fetchCoinPrices = async (coinSymbols: string[]) => {
    try {
      const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot')
      
      if (response.ok) {
        const data = await response.json()
        console.log('Bybit ticker data:', data)
        
        const prices: { [key: string]: number } = {}
        if (data?.result?.list) {
          data.result.list.forEach((ticker: any) => {
            const symbol = ticker.symbol.replace('USDT', '')
            if (coinSymbols.includes(symbol)) {
              prices[symbol] = parseFloat(ticker.lastPrice)
            }
          })
        }
        
        return prices
      }
    } catch (error) {
      console.error('Failed to fetch prices from Bybit:', error)
    }
    
    return {}
  }

  const runNuclearDiagnostic = async () => {
    console.log('🚀 NUCLEAR DIAGNOSTIC STARTED - Testing ALL Bybit API endpoints')
    setError('')
    setLoading(true)

    try {
      // Test 1: UNIFIED Account
      console.log('📊 TEST 1: UNIFIED Account (Trading)')
      try {
        const timestamp = Date.now().toString()
        const recvWindow = '5000'
        const qs = `accountType=UNIFIED`
        const originString = timestamp + apiKey + recvWindow + qs
        console.log(`🔐 Origin String: ${originString}`)
        const signature = await createSignature(originString, apiSecret)
        const url = `https://api.bybit.com/v5/account/wallet-balance?${qs}`
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-BAPI-API-KEY': apiKey,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
          }
        })
        
        const data = await response.json()
        console.log('🔍 RAW DATA - UNIFIED:', data)
        
        if (data?.retCode && data.retCode !== 0) {
          console.error(`❌ UNIFIED ERROR: Code ${data.retCode} - ${data.retMsg}`)
          setError(`UNIFIED API Error: Code ${data.retCode} - ${data.retMsg}`)
        }
        
        // Check for any balances > 0
        const coinList = data?.result?.list?.[0]?.coin || []
        if (Array.isArray(coinList)) {
          coinList.forEach((coin: any) => {
            const balance = parseFloat(coin?.walletBalance || '0')
            if (balance > 0) {
              console.log(`🎉 FOUND BALANCE in UNIFIED: ${coin.coin} = ${balance}`)
              alert(`FOUND IN UNIFIED: ${coin.coin} = ${balance}`)
            }
          })
        }
        
      } catch (err) {
        console.error('❌ UNIFIED API CALL FAILED:', err)
        setError(`UNIFIED API Call Failed: ${err}`)
      }

      // Test 2: FUND Account
      console.log('💰 TEST 2: FUND Account (Funding)')
      try {
        const timestamp = Date.now().toString()
        const recvWindow = '5000'
        const qs = `accountType=FUND`
        const originString = timestamp + apiKey + recvWindow + qs
        console.log(`🔐 Origin String: ${originString}`)
        const signature = await createSignature(originString, apiSecret)
        const url = `https://api.bybit.com/v5/asset/transfer/query-account-coins-balance?${qs}`
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-BAPI-API-KEY': apiKey,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
          }
        })
        
        const data = await response.json()
        console.log('🔍 RAW DATA - FUND:', data)
        
        if (data?.retCode && data.retCode !== 0) {
          console.error(`❌ FUND ERROR: Code ${data.retCode} - ${data.retMsg}`)
          setError(`FUND API Error: Code ${data.retCode} - ${data.retMsg}`)
        }
        
        // Check for any balances > 0
        const coinList = data?.result?.list || data?.result || []
        if (Array.isArray(coinList)) {
          coinList.forEach((coin: any) => {
            const balance = parseFloat(coin?.walletBalance || '0')
            if (balance > 0) {
              console.log(`🎉 FOUND BALANCE in FUND: ${coin.coin} = ${balance}`)
              alert(`FOUND IN FUND: ${coin.coin} = ${balance}`)
            }
          })
        }
        
      } catch (err) {
        console.error('❌ FUND API CALL FAILED:', err)
        setError(`FUND API Call Failed: ${err}`)
      }

      // Test 3: EARN FlexibleSaving
      console.log('📈 TEST 3: EARN FlexibleSaving')
      try {
        const timestamp = Date.now().toString()
        const recvWindow = '5000'
        const qs = `category=FlexibleSaving`
        const originString = timestamp + apiKey + recvWindow + qs
        console.log(`🔐 Origin String: ${originString}`)
        const signature = await createSignature(originString, apiSecret)
        const url = `https://api.bybit.com/v5/earn/position?${qs}`
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-BAPI-API-KEY': apiKey,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
          }
        })
        
        const data = await response.json()
        console.log('🔍 RAW DATA - EARN FlexibleSaving:', data)
        
        if (data?.retCode && data.retCode !== 0) {
          console.error(`❌ EARN FlexibleSaving ERROR: Code ${data.retCode} - ${data.retMsg}`)
          if (data.retCode === 10005) {
            setError(`PERMISSION DENIED: Enable 'Earn' permissions in Bybit API settings (Code 10005)`)
          } else {
            setError(`EARN FlexibleSaving API Error: Code ${data.retCode} - ${data.retMsg}`)
          }
        }
        
        // Check for any balances > 0
        const earnList = data?.result?.list || []
        if (Array.isArray(earnList)) {
          earnList.forEach((position: any) => {
            console.log('🔍 EARN Position Analysis:', {
              coin: position?.coin,
              totalAmount: position?.totalAmount,
              amount: position?.amount,
              walletBalance: position?.walletBalance,
              available: position?.available
            })
            
            const balance = parseFloat(position?.totalAmount || position?.amount || position?.walletBalance || '0')
            if (balance > 0) {
              console.log(`🎉 FOUND BALANCE in EARN FlexibleSaving: ${position.coin} = ${balance}`)
              alert(`FOUND IN EARN FlexibleSaving: ${position.coin} = ${balance}`)
            }
          })
        }
        
      } catch (err) {
        console.error('❌ EARN FlexibleSaving API CALL FAILED:', err)
        setError(`EARN FlexibleSaving API Call Failed: ${err}`)
      }

      // Test 4: EARN OnChain
      console.log('⛓️ TEST 4: EARN OnChain')
      try {
        const timestamp = Date.now().toString()
        const recvWindow = '5000'
        const qs = `category=OnChain`
        const originString = timestamp + apiKey + recvWindow + qs
        console.log(`🔐 Origin String: ${originString}`)
        const signature = await createSignature(originString, apiSecret)
        const url = `https://api.bybit.com/v5/earn/position?${qs}`
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-BAPI-API-KEY': apiKey,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
          }
        })
        
        const data = await response.json()
        console.log('🔍 RAW DATA - EARN OnChain:', data)
        
        if (data?.retCode && data.retCode !== 0) {
          console.error(`❌ EARN OnChain ERROR: Code ${data.retCode} - ${data.retMsg}`)
          if (data.retCode === 10005) {
            setError(`PERMISSION DENIED: Enable 'Earn' permissions in Bybit API settings (Code 10005)`)
          } else {
            setError(`EARN OnChain API Error: Code ${data.retCode} - ${data.retMsg}`)
          }
        }
        
        // Check for any balances > 0
        const earnList = data?.result?.list || []
        if (Array.isArray(earnList)) {
          earnList.forEach((position: any) => {
            console.log('🔍 EARN OnChain Position Analysis:', {
              coin: position?.coin,
              totalAmount: position?.totalAmount,
              amount: position?.amount,
              walletBalance: position?.walletBalance,
              available: position?.available
            })
            
            const balance = parseFloat(position?.totalAmount || position?.amount || position?.walletBalance || '0')
            if (balance > 0) {
              console.log(`🎉 FOUND BALANCE in EARN OnChain: ${position.coin} = ${balance}`)
              alert(`FOUND IN EARN OnChain: ${position.coin} = ${balance}`)
            }
          })
        }
        
      } catch (err) {
        console.error('❌ EARN OnChain API CALL FAILED:', err)
        setError(`EARN OnChain API Call Failed: ${err}`)
      }

      console.log('✅ NUCLEAR DIAGNOSTIC COMPLETE - Check console for all raw data')
      
    } catch (err: any) {
      console.error('❌ NUCLEAR DIAGNOSTIC FAILED:', err)
      setError(`Nuclear Diagnostic Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchPortfolioData = async () => {
    if (!apiKey || !apiSecret) {
      setError('Please enter API Key and Secret first')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('🚀 Starting ULTIMATE PORTFOLIO SCAN...')
      
      // Use the Ultimate Scanner to fetch from all 5 endpoints simultaneously
      const mergedCoins = await fetchUltimatePortfolio(apiKey, apiSecret)
      
      // Fetch USD to ILS exchange rate
      console.log('💱 Using current USD to ILS exchange rate...')
      const currentUsdToIlsRate = usdToIlsRate
      console.log(`💰 Current USD to ILS rate: ${currentUsdToIlsRate}`)

      // Get unique coin symbols for price fetching
      const coinSymbols = mergedCoins.map(item => item.coin).filter(Boolean)
      console.log(`💱 Fetching prices for ${coinSymbols.length} coins:`, coinSymbols)

      const prices = await fetchCoinPrices(coinSymbols)
      console.log('💰 Fetched prices:', prices)

      // Process combined balances with prices - FAIL-SAFE for all coins
      const processedBalances = mergedCoins
        .map(item => {
          const symbol = item.coin
          const amount = parseFloat(item.totalAmount || '0')
          const price = prices[symbol] || 0
          
          console.log(`🪙 ${symbol}: ${amount} total, price: ${price}, sources: ${item.sources.join(', ')}`)
          
          // ALWAYS render the coin regardless of price availability
          return {
            coin: symbol,
            coinId: symbol,
            coinName: getCoinName(symbol),
            total: amount.toString(),
            available: amount.toString(),
            usdValue: amount * price
          }
        })
        .filter(item => {
          // ONLY filter out zero-balance coins, NEVER filter by price
          const amount = parseFloat(item.total || '0')
          return !isNaN(amount) && amount > 0
        })

      console.log(`📈 Processed ${processedBalances.length} final balances`)
      console.log("Detected Coins List:", processedBalances.map(c => ({ symbol: c.coin, amount: c.total, usdValue: c.usdValue })))

      const totalUSD = processedBalances.reduce((sum, bal) => sum + bal.usdValue, 0)
      const totalILS = totalUSD * currentUsdToIlsRate

      console.log(`💰 Total Portfolio Value: ${formatUSD(totalUSD)} | ${formatILS(totalILS)}`)

      setBalances({
        unified: processedBalances,
        fund: [],
        totalUSD: totalUSD,
        totalILS: totalILS,
        usdToIlsRate: currentUsdToIlsRate
      })

      saveCredentials()
      console.log('✅ ULTIMATE PORTFOLIO SCAN complete!')

    } catch (err: any) {
      console.error('❌ Portfolio fetch error:', err)
      if (err.message.includes('401')) {
        setError('Invalid API credentials. Please check your API Key and Secret.')
      } else if (err.message.includes('403')) {
        setError('API permissions insufficient. Ensure your API key has read permissions for wallet balance.')
      } else if (err.message.includes('Permission Denied')) {
        setError('Permission Denied: Enable "Earn" permissions in Bybit API settings.')
      } else {
        setError(`Failed to fetch portfolio data: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const getCoinName = (symbol: string): string => {
    const names: { [key: string]: string } = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'SOL': 'Solana',
      'XRP': 'Ripple',
      'BNB': 'Binance Coin',
      'TON': 'Toncoin',
      'LAVA': 'Lava',
      'PUMP': 'Pump',
      'ALGO': 'Algorand',
      'ADA': 'Cardano',
      'USDT': 'Tether',
      'USDC': 'USD Coin',
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
      'ICP': 'Internet Computer',
      'DOT': 'Polkadot'
    }
    return names[symbol] || symbol
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

  const getCoinIcon = (coin: string) => {
    const icons: { [key: string]: string } = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'USDT': '₮',
      'USDC': '$',
      'SOL': '◎',
      'XRP': '✕',
      'DOGE': 'Ð',
      'ADA': '₳',
      'DOT': '●',
      'LTC': 'Ł',
      'BNB': '🔶',
      'MATIC': '🟣',
      'AVAX': '🔺',
      'SHIB': '🐕',
      'TRX': '🔺',
      'LINK': '🔗',
      'UNI': '🦄',
      'ATOM': '⚛️',
      'ETC': '🔷',
      'XLM': '✨',
      'BCH': '🟠',
      'FIL': '📁',
      'VET': '🌿',
      'ICP': '🌐',
      'THETA': '🎯',
      'HBAR': '🔹',
      'ALGO': '🔵'
    }
    return icons[coin] || '🪙'
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-orange-400">Portfolio Overview</h2>
        <div className="flex gap-2">
          {balances && (
            <button
              onClick={fetchPortfolioData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors text-sm"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-yellow-400">API Configuration</h3>
          {isConnected && (
            <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded-full">
              ✓ Connected
            </span>
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Bybit API Key"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:border-yellow-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">API Secret</label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter your Bybit API Secret"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:border-yellow-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPortfolioData}
            disabled={loading || !apiKey || !apiSecret}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Connecting...' : '🔗 Connect Bybit'}
          </button>
          <button
            onClick={printRawData}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : '📊 Print Raw Data'}
          </button>
          <button
            onClick={runNuclearDiagnostic}
            disabled={loading || !apiKey || !apiSecret}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Running...' : '☢️ Nuclear Diagnostic'}
          </button>
          {isConnected && (
            <button
              onClick={clearCredentials}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              🗑️ Clear Keys
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          🔒 Your API credentials are stored locally and used only for portfolio fetching. 
          Make sure your API key has read permissions for wallet balance.
        </p>
      </div>

      {loading && !balances && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Fetching portfolio data...</p>
        </div>
      )}

      {balances && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-orange-900/30 to-purple-900/30 border border-orange-800 rounded-lg p-6 text-center">
            <div className="text-sm text-orange-300 mb-2">Total Portfolio Value</div>
            <div className="flex items-center justify-center gap-2">
              <div className="text-4xl font-bold text-white">
                {formatUSD(balances.totalUSD)} | {formatILS(balances.totalILS || 0)}
              </div>
              <button
                onClick={refreshExchangeRate}
                disabled={isRefreshingRate}
                className={`p-2 rounded-lg transition-all ${
                  isRefreshingRate 
                    ? 'bg-gray-600 animate-pulse cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                }`}
                title="Refresh exchange rate"
              >
                <span className={`text-lg ${isRefreshingRate ? 'animate-spin' : ''}`}>
                  🔄
                </span>
              </button>
            </div>
            <div className="text-sm text-gray-400 mt-2">Trading + Earn + Funding</div>
            {balances.usdToIlsRate && (
              <div className="text-xs text-gray-500 mt-1">
                {isRefreshingRate ? 'Updating rate...' : `Rate: 1 USD = ${balances.usdToIlsRate.toFixed(4)} ILS`}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-purple-400">
              💼 All Assets (Trading + Earn + Funding)
            </h3>
            <div className="bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
              {balances.unified.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    console.log("Detected Coins List:", balances.unified.map(c => ({ symbol: c.coin, amount: c.total, usdValue: c.usdValue })))
                    return null
                  })()}
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
                            {balances.totalILS && balances.usdToIlsRate && balance.usdValue > 0 && (
                              <div className="text-xs text-blue-300">
                                ({formatILS(balance.usdValue * balances.usdToIlsRate)})
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

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-purple-400">📊 Account Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-400">Total Assets</div>
                <div className="font-semibold text-purple-400">
                  {balances.unified.length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Total Value (USD)</div>
                <div className="font-semibold text-green-400">
                  {formatUSD(balances.totalUSD)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Total Value (ILS)</div>
                <div className="font-semibold text-blue-400">
                  {formatILS(balances.totalILS || 0)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Last Updated</div>
                <div className="font-semibold text-xs">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2 text-yellow-400">ℹ️ Account Types</h4>
            <div className="text-sm text-gray-300 space-y-1">
              <div>• <span className="text-blue-400">UNIFIED:</span> Trading account with spot, futures, and options</div>
              <div>• <span className="text-green-400">FUND:</span> Funding and idle assets</div>
              <div>• <span className="text-orange-400">EARN:</span> Flexible Savings and Earn products</div>
              <div>• All accounts are combined and displayed with real-time USD values</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
