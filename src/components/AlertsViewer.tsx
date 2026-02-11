import { useState, useEffect } from 'react'
import './AlertsViewer.css'

interface Alert {
  timestamp: string
  market_title: string
  market_id: string
  consensus_outcome: string
  consensus_probability: number
  contrarian_outcome: string
  contrarian_probability: number
  strength: string
}

export default function AlertsViewer() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'time' | 'strength' | 'consensus'>('time')

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts')
      if (!response.ok) throw new Error('Failed to fetch alerts')
      const data = await response.json()
      setAlerts(data.alerts || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 3000) // Refresh every 3s
    return () => clearInterval(interval)
  }, [])

  const getSortedAlerts = () => {
    const sorted = [...alerts]
    if (sortBy === 'time') {
      sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } else if (sortBy === 'strength') {
      sorted.sort((a, b) => {
        const strengthOrder = { STRONG: 0, MODERATE: 1 }
        return (strengthOrder[a.strength as keyof typeof strengthOrder] || 2) - 
               (strengthOrder[b.strength as keyof typeof strengthOrder] || 2)
      })
    } else if (sortBy === 'consensus') {
      sorted.sort((a, b) => b.consensus_probability - a.consensus_probability)
    }
    return sorted
  }

  if (loading) return <div className="alerts-loading">Loading alerts...</div>

  const sortedAlerts = getSortedAlerts()

  return (
    <div className="alerts-viewer">
      <div className="alerts-header">
        <h2>Consensus Extremes</h2>
        <div className="alerts-controls">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            <option value="time">Sort by Time</option>
            <option value="strength">Sort by Strength</option>
            <option value="consensus">Sort by Consensus %</option>
          </select>
          <button onClick={fetchAlerts} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="alerts-error">Error: {error}</div>}

      <div className="alerts-stats">
        <span>🚨 Total Alerts: {alerts.length}</span>
        <span>💪 Strong: {alerts.filter(a => a.strength === 'STRONG').length}</span>
        <span>📊 Moderate: {alerts.filter(a => a.strength === 'MODERATE').length}</span>
      </div>

      <div className="alerts-container">
        {sortedAlerts.length === 0 ? (
          <div className="alerts-empty">
            <p>No consensus extremes detected yet.</p>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Waiting for markets to show extreme consensus (72%+)...
            </p>
          </div>
        ) : (
          <div className="alerts-grid">
            {sortedAlerts.map((alert, idx) => (
              <div key={idx} className={`alert-card ${alert.strength.toLowerCase()}`}>
                <div className="alert-header-row">
                  <span className="alert-strength">{alert.strength}</span>
                  <span className="alert-time">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="alert-market">
                  <strong>{alert.market_title}</strong>
                  <code>{alert.market_id}</code>
                </div>

                <div className="alert-consensus">
                  <div className="consensus-item">
                    <span className="label">Consensus:</span>
                    <span className="outcome">{alert.consensus_outcome}</span>
                    <span className="probability">{alert.consensus_probability.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="alert-arrow">→</div>

                <div className="alert-contrarian">
                  <div className="contrarian-item">
                    <span className="label">Contrarian Bet:</span>
                    <span className="outcome">{alert.contrarian_outcome}</span>
                    <span className="probability">{alert.contrarian_probability.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="alerts-footer">
        <p>📁 Data: ~/trading/polymarket/data/consensus-extremes.jsonl</p>
      </div>
    </div>
  )
}
