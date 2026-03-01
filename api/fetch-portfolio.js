export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-BAPI-API-KEY, X-BAPI-SIGN, X-BAPI-SIGN-TYPE, X-BAPI-TIMESTAMP, X-BAPI-RECV-WINDOW')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Use server-side environment variables
    const apiKey = process.env.BYBIT_API_KEY
    const apiSecret = process.env.BYBIT_API_SECRET

    if (!apiKey || !apiSecret) {
      res.status(500).json({ error: 'API keys not configured on server' })
      return
    }

    // Fetch ILS rate from CoinGecko on server-side
    let ilsRate = 3.65 // fallback
    try {
      const ilsResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ils')
      if (ilsResponse.ok) {
        const ilsData = await ilsResponse.json()
        if (ilsData?.tether?.ils) {
          ilsRate = ilsData.tether.ils
          console.log("Fetched ILS rate from server:", ilsRate)
        }
      }
    } catch (error) {
      console.error("Failed to fetch ILS rate on server:", error)
      // Keep fallback rate
    }

    // Fetch portfolio data from Bybit API
    const apiUrl = 'https://api.bybit.com/v5/account/wallet-balance'
    const timestamp = Date.now().toString()
    const recvWindow = '5000'

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': apiSecret,
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
    console.log("Bybit API response:", data)

    // Return both portfolio data and ILS rate
    res.status(200).json({
      ...data,
      ilsRate
    })
  } catch (error) {
    console.error('Portfolio fetch error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch portfolio data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
