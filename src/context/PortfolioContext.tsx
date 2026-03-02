import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface Coin {
  coin: string
  total: string
  available: string
  usdValue: number
}

interface AccountBalance {
  unified: Coin[]
  fund: Coin[]
  totalUSD: number
  totalILS?: number
  usdToIlsRate?: number
}

interface PortfolioContextType {
  balances: AccountBalance | null
  isLoading: boolean
  error: string | null
  apiKey: string
  apiSecret: string
  setBalances: (balances: AccountBalance | null) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setApiKey: (key: string) => void
  setApiSecret: (secret: string) => void
  fetchPortfolio: () => void
}

export const PortfolioContext = createContext<PortfolioContextType | null>(null)

export const usePortfolio = () => {
  const context = useContext(PortfolioContext)
  if (!context) {
    throw new Error('usePortfolio must be used within PortfolioProvider')
  }
  return context
}

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  // INITIAL STATE: Read from localStorage
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('bybit_api_key') || ''
  })
  const [apiSecret, setApiSecret] = useState(() => {
    return localStorage.getItem('bybit_api_secret') || ''
  })
  
  const [balances, setBalances] = useState<AccountBalance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Save to localStorage whenever keys change
  const handleSetApiKey = (key: string) => {
    setApiKey(key)
    if (key) {
      localStorage.setItem('bybit_api_key', key)
    } else {
      localStorage.removeItem('bybit_api_key')
    }
  }

  const handleSetApiSecret = (secret: string) => {
    setApiSecret(secret)
    if (secret) {
      localStorage.setItem('bybit_api_secret', secret)
    } else {
      localStorage.removeItem('bybit_api_secret')
    }
  }

  // Helper function to calculate total USD value from aggregated balances
  const calculateTotalUSDValue = async (balances: Record<string, string>): Promise<number> => {
    try {
      // Get coin list for price fetching
      const coins = Object.keys(balances).filter(coin => parseFloat(balances[coin]) > 0);
      if (coins.length === 0) return 0;

      console.log('Fetching prices for coins:', coins);

      // Fetch prices from our Cloudflare Worker (no CORS issues)
      const priceResponse = await fetch('https://crypto-terminal-api.07daniel50.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'action': 'get_prices'
        },
        body: JSON.stringify({ action: 'get_prices', coins })
      });
      
      if (!priceResponse.ok) {
        console.warn('Failed to fetch prices from worker, using fallback calculation');
        return 0;
      }

      const priceData = await priceResponse.json();
      console.log('Price data from worker:', priceData);
      
      if (!priceData.prices) {
        console.warn('No prices data in response');
        return 0;
      }

      const prices = priceData.prices;
      let totalUSD = 0;
      
      for (const coin of coins) {
        const amount = parseFloat(balances[coin]);
        const price = prices[coin] || 0; // Fallback to 0 if price not found
        
        if (amount > 0 && price > 0) {
          const subtotal = amount * price;
          totalUSD += subtotal;
          console.log(`Coin: ${coin}, Amount: ${amount}, Price: $${price}, Subtotal: $${subtotal}`);
        } else {
          console.warn(`Skipping ${coin}: Amount=${amount}, Price=$${price}`);
        }
      }

      console.log('Total USD value calculated:', totalUSD);
      return totalUSD;

    } catch (error) {
      console.error('Error calculating USD value:', error);
      return 0;
    }
  }

  // FETCH LOGIC: Only runs if keys exist
  const fetchPortfolio = async () => {
    if (!apiKey || !apiSecret) return

    setIsLoading(true)
    setError(null)

    try {
      // Verification: Log that we have keys before sending request
      const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'MISSING';
      const maskedSecret = apiSecret ? `${apiSecret.substring(0, 8)}...${apiSecret.substring(apiSecret.length - 4)}` : 'MISSING';
      
      console.log("Sending portfolio request with keys:", {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        maskedKey,
        maskedSecret,
        keyLength: apiKey?.length || 0,
        secretLength: apiSecret?.length || 0
      });

      // Debug log headers being sent (mask keys for security)
      const requestHeaders = {
        'Content-Type': 'application/json',
        'BYBIT_API_KEY': apiKey,
        'BYBIT_API_SECRET': apiSecret,
        'action': 'fetch_portfolio'
      };
      
      console.log('Portfolio fetch headers:', {
        ...requestHeaders,
        'BYBIT_API_KEY': maskedKey,
        'BYBIT_API_SECRET': maskedSecret
      });

      console.log('Portfolio fetch body:', { action: 'fetch_portfolio' });

      const response = await fetch('https://crypto-terminal-api.07daniel50.workers.dev', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({ action: 'fetch_portfolio' })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Portfolio fetch error response:', errorData)
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Portfolio data from Cloudflare Worker:", data)
      console.log('Portfolio data parsed:', JSON.stringify(data.balances, null, 2))
      console.log("BYBIT RAW SERVER DEBUG:", data.debugInfo)

      if (data?.balances && typeof data.balances === 'object') {
        // Parse new aggregated structure: { balances: { "BTC": 0.5, "SOL": 12.3 } }
        const aggregatedBalances = Object.entries(data.balances)
          .filter(([, amount]) => parseFloat(amount as string) > 0)
          .map(([coin, amount]) => ({
            coin,
            total: amount.toString(),
            available: amount.toString(),
            usdValue: 0 // Will be calculated below
          }));

        console.log('Aggregated balances array:', aggregatedBalances);

        // Fetch current prices for USD value calculation
        console.log('Starting USD value calculation...');
        const totalUSD = await calculateTotalUSDValue(data.balances as Record<string, string>);
        console.log('USD calculation completed, totalUSD:', totalUSD);
        
        const serverIlsRate = data.ilsRate || 3.65;
        const totalILS = totalUSD * serverIlsRate;
        
        console.log('Final portfolio values:', {
          totalUSD,
          totalILS,
          usdToIlsRate: serverIlsRate,
          balanceCount: aggregatedBalances.length
        });

        setBalances({
          unified: aggregatedBalances,
          fund: [],
          totalUSD,
          totalILS,
          usdToIlsRate: serverIlsRate
        });
        
        console.log('Portfolio state updated successfully');
      } else {
        setError('No portfolio data found')
      }
    } catch (err) {
      console.error('Portfolio fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio data')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-fetch on mount if keys exist
  useEffect(() => {
    if (apiKey && apiSecret) {
      fetchPortfolio()
    }
  }, [])

  const value: PortfolioContextType = {
    balances,
    isLoading,
    error,
    apiKey,
    apiSecret,
    setBalances,
    setIsLoading,
    setError,
    setApiKey: handleSetApiKey,
    setApiSecret: handleSetApiSecret,
    fetchPortfolio
  }

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}
