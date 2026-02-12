import { useState, useEffect } from 'react'
import type { Platform } from './Layout'
import './PaperTradingMetrics.css'
import TradesLog from './TradesLog'

interface StrategyMetrics {
  wins: number
  losses: number
  total_trades: number
  win_rate_pct: number
  total_pnl: number
  avg_pnl_per_trade: number
  sharpe_ratio: number
}

interface MetricsData {
  [key: string]: StrategyMetrics
}

export default function PaperTradingMetrics({ platform }: { platform: Platform }) {
  const [metrics, setMetrics] = useState<MetricsData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('Never')

  const strategyNames: { [key: string]: string } = {
    polymarket_pure: 'Polymarket Pure Contrarian',
    polymarket_strength: 'Polymarket Strength-Filtered',
    hyperliquid_funding: 'Hyperliquid Funding Extreme',
    hyperliquid_oi: 'Hyperliquid Funding + OI'
  }

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/data/metrics.json')
      if (!response.ok) {
        setMetrics({})
        setError(null)
        setLoading(false)
        return
      }

      const data: MetricsData = await response.json()
      const filtered: MetricsData = {}
      for (const [key, val] of Object.entries(data)) {
        if (key.startsWith(platform)) filtered[key] = val
      }
      setMetrics(filtered)
      setError(null)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [platform])

  if (loading) return <div className="metrics-loading">Loading metrics...</div>

  const totalTrades = Object.values(metrics).reduce((sum, m) => sum + m.total_trades, 0)
  const totalPnL = Object.values(metrics).reduce((sum, m) => sum + m.total_pnl, 0)
  const totalWins = Object.values(metrics).reduce((sum, m) => sum + m.wins, 0)
  const avgWinRate = totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : '0.0'

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 54) return '#10b981' // green
    if (winRate >= 50) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return '#10b981' // green
    if (pnl === 0) return '#6b7280' // gray
    return '#ef4444' // red
  }

  return (
    <div className="paper-trading-metrics">
      <div className="metrics-header">
        <h1>Paper Trading Performance</h1>
        <span className="last-update">Updated: {lastUpdate}</span>
      </div>

      {error && <div className="metrics-error">Error: {error}</div>}

      <div className="metrics-summary">
        <div className="summary-card">
          <span className="summary-label">Total Trades</span>
          <span className="summary-value">{totalTrades}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Wins</span>
          <span className="summary-value wins">{totalWins}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Win Rate</span>
          <span className="summary-value" style={{ color: getWinRateColor(parseFloat(avgWinRate)) }}>
            {avgWinRate}%
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total P&L</span>
          <span className="summary-value" style={{ color: getPnLColor(totalPnL) }}>
            {totalPnL > 0 ? '+' : ''}{totalPnL.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="strategies-metrics">
        {Object.entries(metrics).length === 0 ? (
          <div className="metrics-empty">
            <p>No trades yet. Waiting for alerts...</p>
          </div>
        ) : (
          Object.entries(metrics).map(([strategy, m]) => (
            <div key={strategy} className="strategy-metrics-card">
              <div className="strategy-header">
                <h2>{strategyNames[strategy] || strategy}</h2>
              </div>

              <div className="metrics-grid">
                <div className="metric-box">
                  <span className="metric-label">Trades</span>
                  <span className="metric-value">{m.total_trades}</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Wins / Losses</span>
                  <span className="metric-value">
                    <span style={{ color: '#10b981' }}>{m.wins}</span>
                    {' / '}
                    <span style={{ color: '#ef4444' }}>{m.losses}</span>
                  </span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Win Rate</span>
                  <span
                    className="metric-value"
                    style={{ color: getWinRateColor(m.win_rate_pct) }}
                  >
                    {m.win_rate_pct.toFixed(1)}%
                  </span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Total P&L</span>
                  <span
                    className="metric-value"
                    style={{ color: getPnLColor(m.total_pnl) }}
                  >
                    {m.total_pnl > 0 ? '+' : ''}{m.total_pnl.toFixed(4)}
                  </span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Avg P&L / Trade</span>
                  <span
                    className="metric-value"
                    style={{ color: getPnLColor(m.avg_pnl_per_trade) }}
                  >
                    {m.avg_pnl_per_trade > 0 ? '+' : ''}{m.avg_pnl_per_trade.toFixed(4)}
                  </span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Sharpe Ratio</span>
                  <span className="metric-value">{m.sharpe_ratio.toFixed(2)}</span>
                </div>
              </div>

              <div className="strategy-status">
                {m.total_trades === 0 ? (
                  <span className="status-waiting">⏳ Waiting for alerts...</span>
                ) : m.win_rate_pct >= 54 ? (
                  <span className="status-green">✓ Edge confirmed ({(m.win_rate_pct).toFixed(1)}% {'>'} 54%)</span>
                ) : (
                  <span className="status-red">⚠ Below 54% threshold</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <TradesLog />

      <div className="metrics-footer">
        <p>📁 Trades log: /data/trades.jsonl</p>
        <p>📁 Metrics: /data/metrics.json</p>
      </div>
    </div>
  )
}
