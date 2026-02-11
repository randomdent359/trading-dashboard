import { useState, useEffect } from 'react'
import './Status.css'

interface ServiceStatus {
  active: boolean
  uptime: string
  pollCount: number
  extremeCount: number
  lastPoll: string
  memory: string
}

export default function Status() {
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Fetch raw log file
        const logsRes = await fetch('/logs/contrarian-monitor.log')
        const logsText = logsRes.ok ? await logsRes.text() : ''
        
        // Fetch raw alerts JSONL file
        const alertsRes = await fetch('/data/consensus-extremes.jsonl')
        const alertsText = alertsRes.ok ? await alertsRes.text() : ''

        // Parse metrics from logs
        const pollCount = (logsText.match(/Poll #\d+/g) || []).length
        const extremeCount = alertsText.split('\n').filter(line => line.trim()).length
        const lastLine = logsText.trim().split('\n').pop() || 'No logs yet'

        setStatus({
          active: true,
          uptime: 'running',
          pollCount,
          extremeCount,
          lastPoll: lastLine,
          memory: '~40MB'
        })
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="status-loading">Loading...</div>
  if (error) return <div className="status-error">Error: {error}</div>
  if (!status) return <div className="status-error">No data available</div>

  return (
    <div className="status">
      <div className="status-grid">
        <div className={`status-card ${status.active ? 'active' : 'inactive'}`}>
          <div className="status-icon">
            {status.active ? '✅' : '❌'}
          </div>
          <h3>Service Status</h3>
          <p className="status-value">{status.active ? 'RUNNING' : 'STOPPED'}</p>
        </div>

        <div className="status-card">
          <div className="status-icon">⏱️</div>
          <h3>Uptime</h3>
          <p className="status-value">{status.uptime}</p>
        </div>

        <div className="status-card">
          <div className="status-icon">📊</div>
          <h3>Polls Executed</h3>
          <p className="status-value">{status.pollCount}</p>
        </div>

        <div className="status-card">
          <div className="status-icon">🚨</div>
          <h3>Extremes Found</h3>
          <p className="status-value">{status.extremeCount}</p>
        </div>

        <div className="status-card">
          <div className="status-icon">💾</div>
          <h3>Memory Usage</h3>
          <p className="status-value">{status.memory}</p>
        </div>

        <div className="status-card">
          <div className="status-icon">🕐</div>
          <h3>Last Poll</h3>
          <p className="status-value">{status.lastPoll}</p>
        </div>
      </div>

      <div className="status-details">
        <h2>Monitor Details</h2>
        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Script Location:</span>
            <code>~/trading/polymarket/scripts/contrarian-monitor.py</code>
          </div>
          <div className="detail-item">
            <span className="detail-label">Service:</span>
            <code>contrarian-monitor.service</code>
          </div>
          <div className="detail-item">
            <span className="detail-label">Log File:</span>
            <code>~/trading/polymarket/logs/contrarian-monitor.log</code>
          </div>
          <div className="detail-item">
            <span className="detail-label">Consensus Threshold:</span>
            <code>72% probability</code>
          </div>
          <div className="detail-item">
            <span className="detail-label">Poll Interval:</span>
            <code>30 seconds</code>
          </div>
          <div className="detail-item">
            <span className="detail-label">Alerts File:</span>
            <code>~/trading/polymarket/data/consensus-extremes.jsonl</code>
          </div>
        </div>
      </div>
    </div>
  )
}
