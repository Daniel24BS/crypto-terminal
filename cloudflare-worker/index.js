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

        // Generate Bybit signature
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        const sign = await generateBybitSignature(queryString, timestamp, recvWindow, apiSecret);

        // Fetch portfolio data from Bybit API
        let bybitData = null;
        try {
          const apiUrl = `https://api.bybit.com/v5/account/wallet-balance?${queryString}`;
          
          const bybitResponse = await fetch(apiUrl, {
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

          if (!bybitResponse.ok) {
            const errorText = await bybitResponse.text();
            console.error("Bybit API error response:", errorText);
            throw new Error(`Bybit API error! status: ${bybitResponse.status}, response: ${errorText}`);
          }

          bybitData = await bybitResponse.json();
          console.log("Bybit API response:", bybitData);

          if (!bybitData?.result?.list || bybitData.result.list.length === 0) {
            throw new Error('No portfolio data found in Bybit response');
          }

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

        // Return both portfolio data and ILS rate in structured response
        return new Response(JSON.stringify({
          balances: bybitData,
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
    { name: 'HMAC', hash: 'SHA256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return signatureHex;
}
