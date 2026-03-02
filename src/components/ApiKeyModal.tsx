import React, { useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext'

export default function ApiKeyModal() {
  const { apiKey, apiSecret, setApiKey, setApiSecret, refreshPortfolio } = usePortfolio()
  const [isOpen, setIsOpen] = useState(false)
  const [tempApiKey, setTempApiKey] = useState('')
  const [tempApiSecret, setTempApiSecret] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (tempApiKey.trim() && tempApiSecret.trim()) {
      setApiKey(tempApiKey.trim())
      setApiSecret(tempApiSecret.trim())
      setIsOpen(false)
      setTempApiKey('')
      setTempApiSecret('')
      
      // Trigger portfolio fetch after setting keys
      setTimeout(() => {
        refreshPortfolio()
      }, 100)
    } else {
      alert('Please enter both API Key and API Secret')
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    setTempApiKey('')
    setTempApiSecret('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Enter Bybit API Keys</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your Bybit API Key"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Secret
            </label>
            <input
              type="password"
              value={tempApiSecret}
              onChange={(e) => setTempApiSecret(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your Bybit API Secret"
              required
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Save & Connect
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-xs text-gray-400">
          <p className="mb-2">Your API keys are stored locally in your browser.</p>
          <p>All API calls go through Cloudflare Worker to bypass CORS restrictions.</p>
        </div>
      </div>
    </div>
  )
}
