// Cloudflare Worker for Crypto Trading Terminal API
import crypto from 'node:crypto';

export default {
  async fetch(request, env, ctx) {
    // Enable CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, cache-control, X-BAPI-API-KEY, X-BAPI-SIGN, X-BAPI-SIGN-TYPE, X-BAPI-TIMESTAMP, X-BAPI-RECV-WINDOW, BYBIT_API_KEY, BYBIT_API_SECRET, action'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      // Parse request body to determine action
      const body = await request.json().catch(() => ({}));
      const action = body.action || request.headers.get('action') || 'fetch_portfolio';

      console.log("Worker action:", action);

      // ROUTE: ILS rate fetch (no API keys required)
      if (action === 'get_ils') {
        console.log("Handling ILS rate request");
        let ilsRate = 3.65; // fallback
        try {
          const ilsResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ils');
          if (ilsResponse.ok) {
            const ilsData = await ilsResponse.json();
            if (ilsData?.tether?.ils) {
              ilsRate = ilsData.tether.ils;
              console.log("SUCCESS: Fetched ILS rate:", ilsRate);
            }
          }
        } catch (error) {
          console.error("Failed to fetch ILS rate:", error);
          // Keep fallback rate - don't crash
        }

        return new Response(JSON.stringify({ ilsRate }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // ROUTE: Get coin prices from Binance
      if (action === 'get_prices') {
        try {
          console.log("Handling price request");
          
          // Get coins from request body
          const body = await request.json();
          const coins = body.coins || [];
          
          if (coins.length === 0) {
            return new Response(JSON.stringify({ error: 'No coins provided' }), {
              status: 400,
              headers: corsHeaders
            });
          }

          // Symbol mapping for common coins
          const symbolMap = {
            'BTC': 'BTCUSDT',
            'ETH': 'ETHUSDT',
            'XRP': 'XRPUSDT',
            'SOL': 'SOLUSDT',
            'ADA': 'ADAUSDT',
            'DOT': 'DOTUSDT',
            'MATIC': 'MATICUSDT',
            'AVAX': 'AVAXUSDT',
            'LINK': 'LINKUSDT',
            'UNI': 'UNIUSDT',
            'ATOM': 'ATOMUSDT',
            'NEAR': 'NEARUSDT',
            'LTC': 'LTCUSDT',
            'BCH': 'BCHUSDT',
            'FIL': 'FILUSDT',
            'ALGO': 'ALGOUSDT',
            'VET': 'VETUSDT',
            'ICP': 'ICPUSDT',
            'HBAR': 'HBARUSDT',
            'QNT': 'QNTUSDT',
            'AAVE': 'AAVEUSDT',
            'SUSHI': 'SUSHIUSDT',
            'COMP': 'COMPUSDT',
            'MKR': 'MKRUSDT',
            'YFI': 'YFIUSDT',
            'SNX': 'SNXUSDT',
            'CRV': 'CRVUSDT',
            'REN': 'RENUSDT',
            'KNC': 'KNCUSDT',
            'ZRX': 'ZRXUSDT',
            'BAT': 'BATUSDT',
            'MANA': 'MANAUSDT',
            'SAND': 'SANDUSDT',
            'AXS': 'AXSUSDT',
            'GALA': 'GALAUSDT',
            'ENJ': 'ENJUSDT',
            'LRC': 'LRCUSDT',
            'FTM': 'FTMUSDT',
            'RUNE': 'RUNEUSDT',
            'ONE': 'ONEUSDT',
            'CELO': 'CELOUSDT',
            'ALPHA': 'ALPHAUSDT',
            'TFUEL': 'TFUELUSDT',
            'GRT': 'GRTUSDT',
            '1INCH': '1INCHUSDT',
            'ANKR': 'ANKRUSDT',
            'STORJ': 'STORJUSDT',
            'COTI': 'COTIUSDT',
            'MIR': 'MIRUSDT',
            'RENDER': 'RENDERUSDT',
            'RNDR': 'RNDRUSDT',
            'AR': 'ARUSDT',
            'ARPA': 'ARPAUSDT',
            'TLM': 'TLMUSDT',
            'BAKE': 'BAKEUSDT',
            'BEL': 'BELUSDT',
            'BLZ': 'BLZUSDT',
            'BTS': 'BTSUSDT',
            'CELR': 'CELRUSDT',
            'CKB': 'CKBUSDT',
            'DENT': 'DENTUSDT',
            'DGB': 'DGBUSDT',
            'FLM': 'FLMUSDT',
            'HARD': 'HARDUSDT',
            'IOST': 'IOSTUSDT',
            'IOTX': 'IOTXUSDT',
            'JST': 'JSTUSDT',
            'LINA': 'LINAUSDT',
            'LOOM': 'LOOMUSDT',
            'MDT': 'MDTUSDT',
            'MTL': 'MTLUSDT',
            'NKN': 'NKNUSDT',
            'NPXS': 'NPXSUSDT',
            'OAX': 'OAXUSDT',
            'ONT': 'ONTUSDT',
            'QTUM': 'QTUMUSDT',
            'RCN': 'RCNUSDT',
            'RDN': 'RDNUSDT',
            'REP': 'REPUSDT',
            'RLC': 'RLCUSDT',
            'SRM': 'SRMUSDT',
            'STMX': 'STMXUSDT',
            'STRAX': 'STRAXUSDT',
            'TCT': 'TCTUSDT',
            'TROY': 'TROYUSDT',
            'TUSD': 'TUSDUSDT',
            'USDP': 'USDPUSDT',
            'USDD': 'USDDUSDT',
            'DAI': 'DAIUSDT',
            'USDC': 'USDCUSDT',
            'USDT': 'USDTUSDT',
            'BUSD': 'BUSDUSDT',
            'FDUSD': 'FDUSDUSDT',
            'PYUSD': 'PYUSDUSDT',
            'TON': 'TONUSDT',
            'LAVA': 'LAVAUSDT',
            'BNB': 'BNBUSDT'
          };

          // Map coins to Binance symbols
          const binanceSymbols = coins.map(coin => symbolMap[coin] || `${coin}USDT`);
          
          console.log('Fetching prices for symbols:', binanceSymbols);

          // Fetch prices from Binance API
          const priceResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(binanceSymbols))}`);
          
          if (!priceResponse.ok) {
            console.warn('Failed to fetch batch prices, trying individual requests');
            // Fallback to individual requests
            const prices = {};
            for (const coin of coins) {
              const symbol = symbolMap[coin] || `${coin}USDT`;
              try {
                const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
                if (response.ok) {
                  const data = await response.json();
                  prices[coin] = parseFloat(data.price);
                  console.log(`${coin}: $${prices[coin]}`);
                }
              } catch (error) {
                console.error(`Failed to fetch price for ${coin}:`, error);
                prices[coin] = 0;
              }
            }
            
            return new Response(JSON.stringify({ prices }), {
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          const priceData = await priceResponse.json();
          console.log('Binance price data:', priceData);
          
          // Create a price lookup map: coin -> price
          const prices = {};
          priceData.forEach(item => {
            if (item && item.symbol && item.price) {
              // Convert symbol like "XRPUSDT" back to coin like "XRP"
              const coin = item.symbol.replace('USDT', '').replace('BUSD', '').replace('FDUSD', '');
              prices[coin] = parseFloat(item.price);
            }
          });
          
          console.log('Price map created:', prices);

          return new Response(JSON.stringify({ prices }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });

        } catch (error) {
          console.error("Price fetch error:", error);
          return new Response(JSON.stringify({ 
            error: error.message || 'Failed to fetch prices',
            details: error.toString()
          }), {
            status: 500,
            headers: corsHeaders
          });
        }
      }

      // ROUTE: Portfolio fetch (API keys required)
      if (action === 'fetch_portfolio') {
        console.log("Handling portfolio fetch request");
        
        // Get API keys from request headers (sent from frontend)
        const apiKey = request.headers.get('BYBIT_API_KEY');
        const apiSecret = request.headers.get('BYBIT_API_SECRET');

        if (!apiKey || !apiSecret) {
          return new Response(JSON.stringify({ error: 'API keys not provided' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        // Fetch ILS rate from public source (independent of Bybit keys)
        let ilsRate = 3.65; // fallback
        try {
          console.log("Fetching ILS rate from server...");
          const ilsResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ils');
          if (ilsResponse.ok) {
            const ilsData = await ilsResponse.json();
            if (ilsData?.tether?.ils) {
              ilsRate = ilsData.tether.ils;
              console.log("SUCCESS: Fetched ILS rate:", ilsRate);
            }
          }
        } catch (error) {
          console.error("Failed to fetch ILS rate:", error);
          // Keep fallback rate - don't crash
        }

        // Fetch portfolio data from multiple Bybit endpoints
        let aggregatedBalances = {};
        
        try {
          const timestamp = Date.now().toString();
          const recvWindow = '5000';

          // Helper function to make authenticated Bybit requests
          const makeBybitRequest = async (url, queryString) => {
            const sign = generateBybitSignature(queryString, timestamp, recvWindow, apiKey, apiSecret);
            const fullUrl = `https://api.bybit.com${url}?${queryString}`;
            
            console.log(`Fetching from: ${fullUrl}`);
            
            const response = await fetch(fullUrl, {
              method: 'GET',
              headers: {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': sign,
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Bybit API error for ${url}:`, errorText);
              throw new Error(`Bybit API error! status: ${response.status}, response: ${errorText}`);
            }

            return await response.json();
          };

          // Make concurrent requests to all endpoints
          const [unifiedData, spotData, fundData, earnData] = await Promise.allSettled([
            makeBybitRequest('/v5/account/wallet-balance', 'accountType=UNIFIED'),
            makeBybitRequest('/v5/account/wallet-balance', 'accountType=SPOT'),
            makeBybitRequest('/v5/asset/transfer/query-account-coins-balance', 'accountType=FUND'),
            makeBybitRequest('/v5/earn/position', 'category=FlexibleSaving')
          ]);

          // Process UNIFIED account balances
          if (unifiedData.status === 'fulfilled' && unifiedData.value?.result?.list?.[0]?.coin) {
            unifiedData.value.result.list[0].coin.forEach(coin => {
              const amount = parseFloat(coin.walletBalance) || 0;
              if (amount > 0) {
                aggregatedBalances[coin.coin] = (aggregatedBalances[coin.coin] || 0) + amount;
              }
            });
          }

          // Process SPOT account balances
          if (spotData.status === 'fulfilled' && spotData.value?.result?.list?.[0]?.coin) {
            spotData.value.result.list[0].coin.forEach(coin => {
              const amount = parseFloat(coin.walletBalance) || 0;
              if (amount > 0) {
                aggregatedBalances[coin.coin] = (aggregatedBalances[coin.coin] || 0) + amount;
              }
            });
          }

          // Process FUND account balances
          if (fundData.status === 'fulfilled' && fundData.value?.result?.coins) {
            fundData.value.result.coins.forEach(coin => {
              const amount = parseFloat(coin.walletBalance) || 0;
              if (amount > 0) {
                aggregatedBalances[coin.coin] = (aggregatedBalances[coin.coin] || 0) + amount;
              }
            });
          }

          // Process EARN (Flexible Savings) balances
          if (earnData.status === 'fulfilled' && earnData.value?.result?.list) {
            earnData.value.result.list.forEach(position => {
              const amount = parseFloat(position.amount) || 0;
              if (amount > 0) {
                aggregatedBalances[position.coin] = (aggregatedBalances[position.coin] || 0) + amount;
              }
            });
          }

          console.log("Aggregated balances:", aggregatedBalances);

        } catch (bybitError) {
          console.error("Bybit API fetch error:", bybitError);
          return new Response(JSON.stringify({ 
            error: bybitError.message || 'Failed to fetch portfolio data from Bybit',
            details: bybitError.toString()
          }), {
            status: 500,
            headers: corsHeaders
          });
        }

        // Return aggregated balances and ILS rate in structured response
        return new Response(JSON.stringify({
          balances: aggregatedBalances,
          ilsRate
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Unknown action
      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

// Helper function to generate Bybit signature using Node.js crypto
function generateBybitSignature(queryString, timestamp, recvWindow, apiKey, apiSecret) {
  const message = timestamp + apiKey + recvWindow + queryString;
  return crypto.createHmac('sha256', apiSecret).update(message).digest('hex');
}
