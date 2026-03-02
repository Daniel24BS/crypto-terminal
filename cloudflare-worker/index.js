// Cloudflare Worker for Crypto Trading Terminal API
export default {
  async fetch(request, env, ctx) {
    // Enable CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, cache-control, X-BAPI-API-KEY, X-BAPI-SIGN, X-BAPI-SIGN-TYPE, X-BAPI-TIMESTAMP, X-BAPI-RECV-WINDOW, BYBIT_API_KEY, BYBIT_API_SECRET'
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

      // Fetch portfolio data from Bybit API
      let bybitData = null;
      try {
        const apiUrl = 'https://api.bybit.com/v5/account/wallet-balance';
        const timestamp = Date.now().toString();
        const recvWindow = '5000';

        const bybitResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'X-BAPI-API-KEY': apiKey,
            'X-BAPI-SIGN': apiSecret,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
          }
        });

        if (!bybitResponse.ok) {
          throw new Error(`Bybit API error! status: ${bybitResponse.status}`);
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
