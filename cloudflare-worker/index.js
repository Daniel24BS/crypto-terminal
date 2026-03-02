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

      // ROUTE: Get coin prices from Bybit (public endpoint, no API keys required)
      if (action === 'fetch_price') {
        try {
          console.log("Handling price fetch request");
          
          // Get symbol from request body
          const body = await request.json();
          const symbol = body.symbol;
          
          if (!symbol) {
            return new Response(JSON.stringify({ error: 'No symbol provided' }), {
              status: 400,
              headers: corsHeaders
            });
          }

          // Ensure symbol has USDT suffix
          const tickerSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
          
          console.log(`Fetching price for symbol: ${tickerSymbol}`);

          // Fetch price from Bybit public API (no API keys required)
          const priceResponse = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${tickerSymbol}`);
          
          if (!priceResponse.ok) {
            throw new Error(`Failed to fetch price for ${tickerSymbol}`);
          }

          const priceData = await priceResponse.json();
          console.log('Bybit price data:', priceData);
          
          // Extract price from response
          let price = 0;
          if (priceData?.result?.list?.[0]?.lastPrice) {
            price = parseFloat(priceData.result.list[0].lastPrice);
          }

          console.log(`Price for ${tickerSymbol}: $${price}`);

          return new Response(JSON.stringify({ 
            symbol: tickerSymbol,
            price: price
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });

        } catch (error) {
          console.error("Price fetch error:", error);
          return new Response(JSON.stringify({ 
            error: error.message || 'Failed to fetch price',
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

          // Fetch market prices from Bybit (no CORS issues)
          console.log("Fetching market prices from Bybit...");
          const marketResponse = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
          
          if (!marketResponse.ok) {
            throw new Error('Failed to fetch market prices from Bybit');
          }

          const marketData = await marketResponse.json();
          console.log('Bybit market data:', marketData);

          // Create price map from Bybit market data
          const priceMap = {};
          if (marketData?.result?.list) {
            marketData.result.list.forEach(ticker => {
              if (ticker.symbol && ticker.lastPrice) {
                priceMap[ticker.symbol] = parseFloat(ticker.lastPrice);
              }
            });
          }

          console.log('Price map created:', priceMap);

          // Calculate portfolio with USD values
          const assets = [];
          let totalUSD = 0;

          for (const [coin, amount] of Object.entries(aggregatedBalances)) {
            let price = 0;
            
            // Handle stablecoins explicitly
            if (['USDT', 'USDC', 'PYUSD', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD', 'FDUSD'].includes(coin)) {
              price = 1.0;
            } else {
              // Look up price using coin + USDT symbol
              const tickerSymbol = coin + 'USDT';
              price = priceMap[tickerSymbol] || 0;
            }
            
            const usdValue = amount * price;
            
            if (amount > 0) {
              totalUSD += usdValue;
              assets.push({
                coin,
                total: amount.toString(),
                available: amount.toString(),
                usdValue,
                price,
                unrealizedPnL: 0 // Placeholder for now
              });
              
              console.log(`${coin}: ${amount} × $${price} = $${usdValue}`);
            }
          }

          const totalILS = totalUSD * ilsRate;

          console.log('Final portfolio calculation:', {
            totalUSD,
            totalILS,
            ilsRate,
            assetCount: assets.length
          });

          // Return complete portfolio object
          return new Response(JSON.stringify({
            assets,
            totalUSD,
            totalILS,
            ilsRate
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });

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
