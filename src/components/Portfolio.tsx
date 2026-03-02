import { useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext'

export default function Portfolio() {
  const { 
    balances, 
    isLoading, 
    error, 
    apiKey, 
    apiSecret, 
    setApiKey, 
    setApiSecret, 
    fetchPortfolio 
  } = usePortfolio()

  const [tempApiKey, setTempApiKey] = useState('')
  const [tempApiSecret, setTempApiSecret] = useState('')

  // RENDER LOGIC: Strict conditional rendering
  if (!apiKey || !apiSecret) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">💼 Portfolio</h1>
          <p className="text-gray-400">Track your cryptocurrency investments</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-white">Connect Bybit Account</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bybit API Key
              </label>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Bybit API Key"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bybit API Secret
              </label>
              <input
                type="password"
                value={tempApiSecret}
                onChange={(e) => setTempApiSecret(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Bybit API Secret"
              />
            </div>
            
            <button
              onClick={() => {
                if (tempApiKey.trim() && tempApiSecret.trim()) {
                  setApiKey(tempApiKey.trim())
                  setApiSecret(tempApiSecret.trim())
                  setTempApiKey('')
                  setTempApiSecret('')
                  setTimeout(() => {
                    fetchPortfolio()
                  }, 100)
                } else {
                  alert('Please enter both API Key and API Secret')
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Connect Portfolio
            </button>
          </div>
          
          <div className="mt-4 text-xs text-gray-400">
            <p className="mb-2">Your API keys are stored locally in your browser.</p>
            <p>All API calls go through Cloudflare Worker to bypass CORS restrictions.</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">💼 Portfolio</h1>
          <p className="text-gray-400">Track your cryptocurrency investments</p>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your assets...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">💼 Portfolio</h1>
          <p className="text-gray-400">Track your cryptocurrency investments</p>
        </div>
        <div className="bg-red-900 border border-red-500 text-white px-4 py-3 rounded-lg">
          <p className="text-center">{error}</p>
        </div>
      </div>
    )
  }

  // Portfolio Dashboard
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">💼 Portfolio</h1>
        <p className="text-gray-400">Track your cryptocurrency investments</p>
        <button
          onClick={() => {
            setApiKey('')
            setApiSecret('')
          }}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Disconnect
        </button>
      </div>

      {balances && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-green-400">
                  ${balances.totalUSD.toFixed(2)}
                </h2>
                <p className="text-sm text-gray-400">
                  Total Portfolio Value
                  {balances.totalILS && (
                    <span className="text-blue-300">
                      (${balances.totalILS.toFixed(2)})
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <button
                  onClick={fetchPortfolio}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  🔄 Refresh
                </button>
                <div className="text-sm text-gray-400 mt-2">Trading + Earn + Funding</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-purple-400">
              💼 All Assets (Trading + Earn + Funding)
            </h3>
            <div className="bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
              {balances.unified && balances.unified.length > 0 ? (
                <div className="space-y-3">
                  {balances.unified.map((balance) => (
                    <div key={balance.coin} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-xl text-purple-400">🪙</div>
                          <div>
                            <div className="font-medium text-sm">{balance.coin}</div>
                            <div className="text-xs text-gray-400">{balance.coin}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm">
                            {parseFloat(balance.total).toFixed(6)} {balance.coin}
                          </div>
                          <div className="text-sm font-semibold text-green-400">
                            ${balance.usdValue.toFixed(2)}
                          </div>
                          {balances.totalILS && balance.usdValue > 0 && (
                            <div className="text-xs text-blue-300">
                              (${(balance.usdValue * (balances.totalILS / balances.totalUSD)).toFixed(2)})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-lg">No assets found in your connected wallet</p>
                  <p className="text-sm text-gray-400 mt-2">Make sure you have funds in your Bybit account or check your API permissions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
