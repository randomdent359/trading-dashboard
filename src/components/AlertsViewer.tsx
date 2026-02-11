import { useState, useEffect } from 'react'
import './AlertsViewer.css'

interface Alert {
  timestamp?: string
  asset?: string
  market_title?: string
  consensus_outcome?: string
  consensus_probability?: number
  funding_rate?: number
  funding_rate_pct?: number
  direction?: string
  strength?: string
  contrarian_outcome?: string
  contrarian_probability?: number
}

interface AlertsViewerProps {
  platform: 'polymarket' | 'hyperliquid'
}

export default function AlertsViewer({ platform }: AlertsViewerProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'time' | 'strength' | 'value'>('time')

  const alertFile = platform === 'polymarket'
    ? '/data/consensus-extremes.jsonl'
    : '/data/funding-extremes.jsonl'

  const fetchAlerts = async () => {
    try {
      const response = await fetch(alertFile)
      if (!response.ok) {
        setAlerts([])
        setError(null)
        setLoading(false)
        return
      }
      
      const text = await response.text()
      const alerts = text
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(Boolean) as Alert[]
      
      setAlerts(alerts)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 3000)
    return () => clearInterval(interval)
  }, [platform])

  const getSortedAlerts = () => {
    const sorted = [...alerts]
    if (sortBy === 'time') {
      sorted.sort((a, b) => {
        const aTime = new Date(a.timestamp || 0).getTime()
        const bTime = new Date(b.timestamp || 0).getTime()
        return bTime - aTime
      })
    } else if (sortBy === 'strength') {
      sorted.sort((a, b) => {
        const strengthOrder = { EXTREME: 0, STRONG: 1, MODERATE: 2 }
        return (strengthOrder[a.strength as keyof typeof strengthOrder] || 3) - 
               (strengthOrder[b.strength as keyof typeof strengthOrder] || 3)
      })
    } else if (sortBy === 'value') {
      sorted.sort((a, b) => {
        const aVal = platform === 'polymarket' 
          ? (a.consensus_probability || 0)
          : (a.funding_rate_pct || 0)
        const bVal = platform === 'polymarket'
          ? (b.consensus_probability || 0)
          : (b.funding_rate_pct || 0)
        return bVal - aVal
      })
    }
    return sorted
  }

  if (loading) return <div className="alerts-loading">Loading alerts...</div>

  const platformName = platform === 'polymarket' ? 'Polymarket Extremes' : 'Hyperliquid Funding Extremes'
  const sortedAlerts = getSortedAlerts()

  return (
    <div className="alerts-viewer">
      <div className="alerts-header">
        <h2>{platformName}</h2>
        <div className="alerts-controls">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            {platform === 'polymarket' ? (
              <>
                <option value="time">Sort by Time</option>
                <option value="strength">Sort by Strength</option>
                <option value="value">Sort by Consensus %</option>
              </>
            ) : (
              <>
                <option value="time">Sort by Time</option>
                <option value="strength">Sort by Strength</option>
                <option value="value">Sort by Funding %</option>
              </>
            )}
          </select>
          <button onClick={fetchAlerts} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="alerts-error">Error: {error}</div>}

      <div className="alerts-stats">
        <span>🚨 Total: {alerts.length}</span>
        <span>💪 Strong: {alerts.filter(a => a.strength === 'STRONG' || a.strength === 'EXTREME').length}</span>
      </div>

      <div className="alerts-container">
        {sortedAlerts.length === 0 ? (
          <div className="alerts-empty">
            <p>No {platform === 'polymarket' ? 'consensus extremes' : 'funding extremes'} detected yet.</p>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              {platform === 'polymarket'
                ? 'Waiting for markets to show extreme consensus (>72%)'
                : 'Waiting for funding rates to spike (>0.12%)'}
            </p>
          </div>
        ) : (
          <div className="alerts-grid">
            {sortedAlerts.map((alert, idx) => (
              <div key={idx} className={`alert-card ${(alert.strength || '').toLowerCase()}`}>
                <div className="alert-header-row">
                  <span className="alert-strength">{alert.strength || 'MODERATE'}</span>
                  <span className="alert-time">
                    {new Date(alert.timestamp || 0).toLocaleTimeString()}
                  </span>
                </div>

                {platform === 'polymarket' ? (
                  <>
                    <div className="alert-market">
                      <strong>{alert.market_title}</strong>
                    </div>

                    <div className="alert-consensus">
                      <div className="consensus-item">
                        <span className="label">Consensus:</span>
                        <span className="outcome">{alert.consensus_outcome}</span>
                        <span className="probability">{alert.consensus_probability?.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="alert-arrow">→</div>

                    <div className="alert-contrarian">
                      <div className="contrarian-item">
                        <span className="label">Contrarian:</span>
                        <span className="outcome">{alert.contrarian_outcome}</span>
                        <span className="probability">{alert.contrarian_probability?.toFixed(1)}%</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="alert-asset">
                      <strong>{alert.asset}</strong>
                      <span className="direction">{alert.direction}</span>
                    </div>

                    <div className="alert-funding">
                      <div className="funding-item">
                        <span className="label">Funding Rate:</span>
                        <span className="rate">{alert.funding_rate_pct?.toFixed(4)}%</span>
                      </div>
                      <div className="funding-note">
                        {alert.funding_rate! > 0.0015 
                          ? '📈 Extremely bullish, shorts squeezed'
                          : '⚠️ Elevated bullish bias'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="alerts-footer">
        <p>📁 Data: {alertFile}</p>
      </div>
    </div>
  )
}
