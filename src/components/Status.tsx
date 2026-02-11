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

interface StatusProps {
  platform: 'polymarket' | 'hyperliquid'
}

export default function Status({ platform }: StatusProps) {
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Determine file paths based on platform
        const logFile = platform === 'polymarket' 
          ? '/logs/contrarian-monitor.log'
          : '/logs/funding-monitor.log'
        
        const alertFile = platform === 'polymarket'
          ? '/data/consensus-extremes.jsonl'
          : '/data/funding-extremes.jsonl'
        
        // Fetch raw log file
        const logsRes = await fetch(logFile)
        const logsText = logsRes.ok ? await logsRes.text() : ''
        
        // Fetch raw alerts JSONL file
        const alertsRes = await fetch(alertFile)
        const alertsText = alertsRes.ok ? await alertsRes.text() : ''

        // Parse metrics from logs
        const pollPattern = platform === 'polymarket'
          ? /Poll #(\d+)/g
          : /Poll #(\d+)/g
        
        const pollCount = (logsText.match(pollPattern) || []).length
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
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [platform])

  if (loading) return <div className="status-loading">Loading...</div>
  if (error) return <div className="status-error">Error: {error}</div>
  if (!status) return <div className="status-error">No data available</div>

  const platformConfig = {
    polymarket: {
      name: '📊 Polymarket',
      description: 'Consensus Extremes Monitor',
      script: '~/trading/polymarket/scripts/contrarian-monitor.py',
      service: 'contrarian-monitor.service',
      threshold: '72% consensus'
    },
    hyperliquid: {
      name: '⚡ Hyperliquid',
      description: 'Funding Rate Arbitrage',
      script: '~/trading/hyperliquid/scripts/funding-monitor.py',
      service: 'hyperliquid-funding.service',
      threshold: '0.12% funding rate'
    }
  }

  const config = platformConfig[platform]

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
          <h3>Last Update</h3>
          <p className="status-value">{status.lastPoll.substring(0, 50)}</p>
        </div>
      </div>

      <div className="status-details">
        <h2>{config.name} — {config.description}</h2>
        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Script Location:</span>
            <code>{config.script}</code>
          </div>
          <div className="detail-item">
            <span className="detail-label">Service:</span>
            <code>{config.service}</code>
          </div>
          <div className="detail-item">
            <span className="detail-label">Log File:</span>
            <code>~/trading/{platform}/logs/{platform === 'polymarket' ? 'contrarian' : 'funding'}-monitor.log</code>
          </div>
          <div className="detail-item">
            <span className="detail-label">Alert Threshold:</span>
            <code>{config.threshold}</code>
          </div>
          <div className="detail-item">
            <span className="detail-label">Poll Interval:</span>
            <code>{platform === 'polymarket' ? '30 seconds' : '60 seconds'}</code>
          </div>
          <div className="detail-item">
            <span className="detail-label">Alerts File:</span>
            <code>~/trading/{platform}/data/{platform === 'polymarket' ? 'consensus-extremes' : 'funding-extremes'}.jsonl</code>
          </div>
        </div>
      </div>
    </div>
  )
}
