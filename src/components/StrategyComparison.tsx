import { useState, useEffect } from 'react'
import './StrategyComparison.css'

interface StrategyMetrics {
  name: string
  pollCount: number
  extremeCount: number
  lastAlert: string
}

interface StrategyComparisonProps {
  platform: 'polymarket' | 'hyperliquid'
}

export default function StrategyComparison({ platform }: StrategyComparisonProps) {
  const [strategies, setStrategies] = useState<StrategyMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const strategyConfigs = {
    polymarket: [
      {
        name: 'Pure Contrarian',
        description: '>72% consensus',
        log: '/logs/contrarian-monitor.log',
        alerts: '/data/consensus-extremes.jsonl',
        threshold: '72%',
        expectedWinRate: '54%'
      },
      {
        name: 'Strength-Filtered',
        description: '>80% consensus only',
        log: '/logs/strength-filtered-monitor.log',
        alerts: '/data/strength-filtered-extremes.jsonl',
        threshold: '80%',
        expectedWinRate: '56%'
      }
    ],
    hyperliquid: [
      {
        name: 'Funding Extreme',
        description: 'Funding > 0.12%',
        log: '/logs/funding-monitor.log',
        alerts: '/data/funding-extremes.jsonl',
        threshold: '0.12%',
        expectedWinRate: '57%'
      },
      {
        name: 'Funding + OI',
        description: 'Funding > 0.15% + OI > 85%',
        log: '/logs/funding-oi-monitor.log',
        alerts: '/data/funding-oi-extremes.jsonl',
        threshold: '0.15% + OI',
        expectedWinRate: '60%'
      }
    ]
  }

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const configs = strategyConfigs[platform]
        const results: StrategyMetrics[] = []

        for (const config of configs) {
          // Fetch log
          const logRes = await fetch(config.log)
          const logText = logRes.ok ? await logRes.text() : ''

          // Fetch alerts
          const alertRes = await fetch(config.alerts)
          const alertText = alertRes.ok ? await alertRes.text() : ''

          // Parse metrics
          const pollPattern = /Poll #(\d+)/g
          const pollCount = (logText.match(pollPattern) || []).length
          const extremeCount = alertText.split('\n').filter(line => line.trim()).length
          const lastLine = logText.trim().split('\n').pop() || 'No data yet'

          results.push({
            name: config.name,
            pollCount,
            extremeCount,
            lastAlert: lastLine
          })
        }

        setStrategies(results)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStrategies()
    const interval = setInterval(fetchStrategies, 5000)
    return () => clearInterval(interval)
  }, [platform])

  if (loading) return <div className="comparison-loading">Loading strategies...</div>
  if (error) return <div className="comparison-error">Error: {error}</div>

  const configs = strategyConfigs[platform]
  const platformName = platform === 'polymarket' ? 'Polymarket' : 'Hyperliquid'

  return (
    <div className="strategy-comparison">
      <h1 className="comparison-title">{platformName} Strategy Comparison</h1>
      
      <div className="strategies-grid">
        {configs.map((config, idx) => (
          <div key={idx} className="strategy-card">
            <div className="strategy-header">
              <h2>{strategies[idx]?.name || config.name}</h2>
              <span className="strategy-type">{config.description}</span>
            </div>

            <div className="strategy-metrics">
              <div className="metric">
                <span className="metric-label">Threshold</span>
                <span className="metric-value">{config.threshold}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Expected Win Rate</span>
                <span className="metric-value">{config.expectedWinRate}</span>
              </div>
            </div>

            <div className="strategy-stats">
              <div className="stat-row">
                <span className="stat-label">Polls Executed</span>
                <span className="stat-value">{strategies[idx]?.pollCount || 0}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Extremes Found</span>
                <span className="stat-value alert-count">{strategies[idx]?.extremeCount || 0}</span>
              </div>
            </div>

            <div className="strategy-status">
              <div className="status-label">Last Update</div>
              <div className="status-text">{strategies[idx]?.lastAlert?.substring(0, 60) || 'Waiting...'}</div>
            </div>

            <div className="strategy-footer">
              <span className="config-path">{config.log}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="comparison-table">
        <h3>Quick Comparison</h3>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Threshold</th>
              <th>Expected Win Rate</th>
              <th>Polls</th>
              <th>Extremes</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'even' : 'odd'}>
                <td className="strategy-name">
                  <strong>{strategies[idx]?.name || config.name}</strong><br/>
                  <span className="desc">{config.description}</span>
                </td>
                <td>{config.threshold}</td>
                <td>{config.expectedWinRate}</td>
                <td className="numeric">{strategies[idx]?.pollCount || 0}</td>
                <td className="numeric alert-count">{strategies[idx]?.extremeCount || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
