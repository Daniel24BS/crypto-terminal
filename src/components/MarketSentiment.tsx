import { useState, useEffect } from 'react'

interface FearGreedData {
  value: string
  value_classification: string
  timestamp: string
  time_until_update: string
}

export default function MarketSentiment() {
  const [sentiment, setSentiment] = useState<FearGreedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchFearGreedIndex()
  }, [])

  const fetchFearGreedIndex = async () => {
    try {
      setLoading(true)
      const response = await fetch('https://api.alternative.me/fng/')
      
      if (!response.ok) {
        throw new Error('Failed to fetch Fear & Greed Index')
      }
      
      const data = await response.json()
      const currentData = data.data[0]
      
      setSentiment(currentData)
      setError('')
    } catch (err) {
      setError('Failed to fetch Fear & Greed Index. Using demo data.')
      
      const demoData: FearGreedData = {
        value: '45',
        value_classification: 'Neutral',
        timestamp: Math.floor(Date.now() / 1000).toString(),
        time_until_update: '86400'
      }
      
      setSentiment(demoData)
    } finally {
      setLoading(false)
    }
  }

  const getSentimentColor = (value: number) => {
    if (value <= 25) return 'text-red-500 border-red-500'
    if (value <= 45) return 'text-orange-500 border-orange-500'
    if (value <= 55) return 'text-yellow-500 border-yellow-500'
    if (value <= 75) return 'text-green-500 border-green-500'
    return 'text-green-600 border-green-600'
  }

  const getSentimentBg = (value: number) => {
    if (value <= 25) return 'bg-red-900/20'
    if (value <= 45) return 'bg-orange-900/20'
    if (value <= 55) return 'bg-yellow-900/20'
    if (value <= 75) return 'bg-green-900/20'
    return 'bg-green-900/30'
  }

  const getSentimentEmoji = (value: number) => {
    if (value <= 25) return '😱'
    if (value <= 45) return '😰'
    if (value <= 55) return '😐'
    if (value <= 75) return '😊'
    return '🤑'
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Market Sentiment</h1>
        <p className="text-gray-400">Crypto Fear & Greed Index & Market Overview</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-center">Fear & Greed Index</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading market sentiment...</p>
          </div>
        ) : error && sentiment?.value !== '45' ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchFearGreedIndex}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : sentiment ? (
          <div className={`border-2 rounded-lg p-6 text-center ${getSentimentBg(parseInt(sentiment.value))} ${getSentimentColor(parseInt(sentiment.value))}`}>
            <div className="text-6xl mb-4">{getSentimentEmoji(parseInt(sentiment.value))}</div>
            <div className="text-5xl font-bold mb-2">{sentiment.value}</div>
            <div className="text-2xl font-semibold mb-4">{sentiment.value_classification}</div>
            <div className="text-sm opacity-75">
              Last updated: {formatTimestamp(sentiment.timestamp)}
            </div>
            <div className="text-xs opacity-60 mt-2">
              Next update in: {sentiment.time_until_update}
            </div>
          </div>
        ) : null}
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Sentiment Scale</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded bg-red-900/20 border border-red-500">
            <span className="flex items-center">
              <span className="mr-2">😱</span>
              <span>0-25</span>
            </span>
            <span className="text-red-400 font-semibold">Extreme Fear</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-orange-900/20 border border-orange-500">
            <span className="flex items-center">
              <span className="mr-2">😰</span>
              <span>26-45</span>
            </span>
            <span className="text-orange-400 font-semibold">Fear</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-yellow-900/20 border border-yellow-500">
            <span className="flex items-center">
              <span className="mr-2">😐</span>
              <span>46-55</span>
            </span>
            <span className="text-yellow-400 font-semibold">Neutral</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-green-900/20 border border-green-500">
            <span className="flex items-center">
              <span className="mr-2">😊</span>
              <span>56-75</span>
            </span>
            <span className="text-green-400 font-semibold">Greed</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-green-900/30 border border-green-600">
            <span className="flex items-center">
              <span className="mr-2">🤑</span>
              <span>76-100</span>
            </span>
            <span className="text-green-600 font-semibold">Extreme Greed</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="font-semibold mb-3 text-purple-400">💬 Community Chat</h4>
        <div className="rounded-lg overflow-hidden" style={{ height: '500px' }}>
          <iframe
            src="https://e.widgetbot.io/channels/774243332405985302/1442749154051752007"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '0.5rem'
            }}
            allowTransparency={true}
            frameBorder="0"
            title="Discord Community Chat"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Join our Discord community for real-time discussions
        </p>
      </div>

      <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-300 mb-2">📊 Market Insights</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• The Fear & Greed Index analyzes market sentiment from multiple sources</li>
          <li>• Extreme Fear often indicates buying opportunities</li>
          <li>• Extreme Greed may signal market tops and correction risks</li>
          <li>• Use this indicator alongside fundamental and technical analysis</li>
        </ul>
      </div>
    </div>
  )
}
