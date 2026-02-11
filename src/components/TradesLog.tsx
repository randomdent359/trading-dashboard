import { useState, useEffect } from 'react'
import './TradesLog.css'

interface Trade {
  timestamp: string
  strategy: string
  platform: string
  market_title?: string
  asset?: string
  entry_odds_consensus?: number
  entry_odds_contrarian?: number
  entry_funding_pct?: number
  result?: string
  pnl?: number
  hold_time_seconds?: number
}

export default function TradesLog() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'time' | 'pnl' | 'result'>('time')

  const strategyNames: { [key: string]: string } = {
    polymarket_pure: 'PM Pure',
    polymarket_strength: 'PM Strength',
    hyperliquid_funding: 'HL Funding',
    hyperliquid_oi: 'HL OI'
  }

  const fetchTrades = async () => {
    try {
      const response = await fetch('/data/trades.jsonl')
      if (!response.ok) {
        setTrades([])
        setError(null)
        setLoading(false)
        return
      }

      const text = await response.text()
      const trades = text
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(Boolean) as Trade[]

      setTrades(trades)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrades()
    const interval = setInterval(fetchTrades, 3000)
    return () => clearInterval(interval)
  }, [])

  const getSortedTrades = () => {
    const sorted = [...trades]
    if (sortBy === 'time') {
      sorted.sort((a, b) => {
        const aTime = new Date(a.timestamp).getTime()
        const bTime = new Date(b.timestamp).getTime()
        return bTime - aTime
      })
    } else if (sortBy === 'pnl') {
      sorted.sort((a, b) => (b.pnl || 0) - (a.pnl || 0))
    } else if (sortBy === 'result') {
      sorted.sort((a, b) => {
        const order = { WIN: 0, LOSS: 1, OPEN: 2 }
        return (order[a.result as keyof typeof order] || 2) - (order[b.result as keyof typeof order] || 2)
      })
    }
    return sorted
  }

  if (loading) return <div className="trades-loading">Loading trades...</div>

  const sortedTrades = getSortedTrades()

  return (
    <div className="trades-log">
      <div className="trades-header">
        <h2>Trade Log</h2>
        <div className="trades-controls">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            <option value="time">Sort by Time</option>
            <option value="pnl">Sort by P&L</option>
            <option value="result">Sort by Result</option>
          </select>
          <button onClick={fetchTrades} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="trades-error">Error: {error}</div>}

      <div className="trades-stats">
        <span>📊 Total: {trades.length}</span>
        <span>✓ Wins: {trades.filter(t => t.result === 'WIN').length}</span>
        <span>✗ Losses: {trades.filter(t => t.result === 'LOSS').length}</span>
      </div>

      <div className="trades-table-container">
        {sortedTrades.length === 0 ? (
          <div className="trades-empty">
            <p>No trades yet. Waiting for alerts to execute...</p>
          </div>
        ) : (
          <table className="trades-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Strategy</th>
                <th>Market / Asset</th>
                <th>Entry</th>
                <th>Result</th>
                <th>P&L</th>
                <th>Hold</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrades.map((trade, idx) => (
                <tr key={idx} className={`result-${trade.result?.toLowerCase() || 'open'}`}>
                  <td className="time">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="strategy">
                    {strategyNames[trade.strategy] || trade.strategy}
                  </td>
                  <td className="market">
                    {trade.market_title || trade.asset || '?'}
                  </td>
                  <td className="entry">
                    {trade.platform === 'polymarket'
                      ? `${trade.entry_odds_contrarian?.toFixed(1) || '?'}%`
                      : `${trade.entry_funding_pct?.toFixed(4) || '?'}%`
                    }
                  </td>
                  <td className="result">
                    <span className={`badge ${trade.result?.toLowerCase()}`}>
                      {trade.result || 'OPEN'}
                    </span>
                  </td>
                  <td className="pnl" style={{
                    color: trade.pnl ? (trade.pnl > 0 ? '#10b981' : '#ef4444') : '#64748b'
                  }}>
                    {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(4)}` : '--'}
                  </td>
                  <td className="hold">
                    {trade.hold_time_seconds
                      ? `${Math.round(trade.hold_time_seconds / 60)}m`
                      : '--'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="trades-footer">
        <p>📁 File: /data/trades.jsonl</p>
      </div>
    </div>
  )
}
