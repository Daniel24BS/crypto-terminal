// Cloudflare Worker for Crypto Trading Terminal API
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
            const sign = await generateBybitSignature(queryString, timestamp, recvWindow, apiSecret);
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

          // Log RAW responses from each endpoint
          console.log('=== RAW BYBIT RESPONSES ===');
          console.log('UNIFIED response:', unifiedData);
          console.log('SPOT response:', spotData);
          console.log('FUND response:', fundData);
          console.log('EARN response:', earnData);

          // Process UNIFIED account balances
          if (unifiedData.status === 'fulfilled') {
            console.log('UNIFIED raw data:', JSON.stringify(unifiedData.value, null, 2));
            if (unifiedData.value?.result?.list?.[0]?.coin) {
              unifiedData.value.result.list[0].coin.forEach(coin => {
                const amount = parseFloat(coin.walletBalance) || 0;
                if (amount > 0) {
                  aggregatedBalances[coin.coin] = (aggregatedBalances[coin.coin] || 0) + amount;
                  console.log(`UNIFIED: Added ${coin.coin}: ${amount}`);
                }
              });
            } else {
              console.log('UNIFIED: No coin data found in expected path result.list[0].coin');
            }
          } else {
            console.log('UNIFIED: Request failed:', unifiedData.reason);
          }

          // Process SPOT account balances
          if (spotData.status === 'fulfilled') {
            console.log('SPOT raw data:', JSON.stringify(spotData.value, null, 2));
            if (spotData.value?.result?.list?.[0]?.coin) {
              spotData.value.result.list[0].coin.forEach(coin => {
                const amount = parseFloat(coin.walletBalance) || 0;
                if (amount > 0) {
                  aggregatedBalances[coin.coin] = (aggregatedBalances[coin.coin] || 0) + amount;
                  console.log(`SPOT: Added ${coin.coin}: ${amount}`);
                }
              });
            } else {
              console.log('SPOT: No coin data found in expected path result.list[0].coin');
            }
          } else {
            console.log('SPOT: Request failed:', spotData.reason);
          }

          // Process FUND account balances - DIFFERENT SCHEMA
          if (fundData.status === 'fulfilled') {
            console.log('FUND raw data:', JSON.stringify(fundData.value, null, 2));
            if (fundData.value?.result?.coins) {
              fundData.value.result.coins.forEach(coin => {
                const amount = parseFloat(coin.walletBalance) || 0;
                if (amount > 0) {
                  aggregatedBalances[coin.coin] = (aggregatedBalances[coin.coin] || 0) + amount;
                  console.log(`FUND: Added ${coin.coin}: ${amount}`);
                }
              });
            } else if (fundData.value?.result?.balance) {
              // Alternative FUND schema path
              fundData.value.result.balance.forEach(coin => {
                const amount = parseFloat(coin.walletBalance) || 0;
                if (amount > 0) {
                  aggregatedBalances[coin.coin] = (aggregatedBalances[coin.coin] || 0) + amount;
                  console.log(`FUND (balance): Added ${coin.coin}: ${amount}`);
                }
              });
            } else {
              console.log('FUND: No coin data found in expected paths result.coins or result.balance');
            }
          } else {
            console.log('FUND: Request failed:', fundData.reason);
          }

          // Process EARN (Flexible Savings) balances - DIFFERENT SCHEMA
          if (earnData.status === 'fulfilled') {
            console.log('EARN raw data:', JSON.stringify(earnData.value, null, 2));
            if (earnData.value?.result?.list) {
              earnData.value.result.list.forEach(position => {
                const amount = parseFloat(position.amount) || 0;
                if (amount > 0) {
                  aggregatedBalances[position.coin] = (aggregatedBalances[position.coin] || 0) + amount;
                  console.log(`EARN: Added ${position.coin}: ${amount}`);
                }
              });
            } else if (earnData.value?.result?.data) {
              // Alternative EARN schema path
              earnData.value.result.data.forEach(position => {
                const amount = parseFloat(position.amount) || 0;
                if (amount > 0) {
                  aggregatedBalances[position.coin] = (aggregatedBalances[position.coin] || 0) + amount;
                  console.log(`EARN (data): Added ${position.coin}: ${amount}`);
                }
              });
            } else {
              console.log('EARN: No position data found in expected paths result.list or result.data');
            }
          } else {
            console.log('EARN: Request failed:', earnData.reason);
          }

          console.log('=== FINAL AGGREGATED BALANCES ===');
          console.log('Aggregated balances:', JSON.stringify(aggregatedBalances, null, 2));

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

// Helper function to generate Bybit signature
async function generateBybitSignature(queryString, timestamp, recvWindow, apiSecret) {
  const crypto = globalThis.crypto || (globalThis.webcrypto && globalThis.webcrypto.subtle);
  if (!crypto) {
    throw new Error('Crypto API not available in this environment');
  }

  const message = timestamp + recvWindow + queryString;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    key,
    messageData
  );
  
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return signatureHex;
}
