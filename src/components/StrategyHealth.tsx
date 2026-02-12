import { useState, useEffect } from 'react'
import {
  fetchStrategies, fetchHealth, fetchStrategySignals,
  type StrategyData, type SignalData, type HealthResponse,
} from '../api'
import './StrategyHealth.css'

interface StrategyHealthData {
  strategy: StrategyData
  signals: SignalData[]
  lastSignalTime: string | null
  signalsPerHour: number
  alerts: { level: 'warn' | 'crit'; text: string }[]
}

const SILENT_THRESHOLD_MIN = 60 // alert if no signal for 60 min

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hrs}h ${remMins}m ago` : `${hrs}h ago`
}

function computeSignalsPerHour(signals: SignalData[]): number {
  if (signals.length < 2) return 0
  const newest = new Date(signals[0].timestamp).getTime()
  const oldest = new Date(signals[signals.length - 1].timestamp).getTime()
  const spanHrs = (newest - oldest) / 3_600_000
  if (spanHrs <= 0) return 0
  return signals.length / spanHrs
}

function buildAlerts(strategy: StrategyData, signals: SignalData[]): { level: 'warn' | 'crit'; text: string }[] {
  const alerts: { level: 'warn' | 'crit'; text: string }[] = []

  // Silent strategy check
  if (strategy.enabled && signals.length > 0) {
    const lastMs = Date.now() - new Date(signals[0].timestamp).getTime()
    const lastMins = lastMs / 60_000
    if (lastMins > SILENT_THRESHOLD_MIN * 2) {
      alerts.push({ level: 'crit', text: `No signals for ${Math.round(lastMins)}m — strategy may be down` })
    } else if (lastMins > SILENT_THRESHOLD_MIN) {
      alerts.push({ level: 'warn', text: `No signals for ${Math.round(lastMins)}m` })
    }
  }

  if (strategy.enabled && signals.length === 0) {
    alerts.push({ level: 'warn', text: 'No signals recorded yet' })
  }

  // Drawdown alert
  if (strategy.maxDrawdown > 5) {
    alerts.push({ level: 'crit', text: `Max drawdown ${strategy.maxDrawdown.toFixed(1)}% exceeds 5% limit` })
  } else if (strategy.maxDrawdown > 3) {
    alerts.push({ level: 'warn', text: `Drawdown at ${strategy.maxDrawdown.toFixed(1)}%` })
  }

  // Negative P&L alert
  if (strategy.totalPnl < -500) {
    alerts.push({ level: 'crit', text: `Total P&L ${strategy.totalPnl.toFixed(0)} below -$500 threshold` })
  }

  return alerts
}

export default function StrategyHealth() {
  const [data, setData] = useState<StrategyHealthData[]>([])
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [{ strategies }, healthRes] = await Promise.all([fetchStrategies(), fetchHealth()])
        const signalResults = await Promise.all(
          strategies.map(s => fetchStrategySignals(s.name).catch(() => ({ signals: [] as SignalData[], total: 0, limit: 100, offset: 0 })))
        )
        if (!active) return

        const built: StrategyHealthData[] = strategies.map((s, i) => {
          const signals = signalResults[i].signals
          return {
            strategy: s,
            signals,
            lastSignalTime: signals.length > 0 ? signals[0].timestamp : null,
            signalsPerHour: computeSignalsPerHour(signals),
            alerts: buildAlerts(s, signals),
          }
        })

        setData(built)
        setHealth(healthRes)
        setLastUpdate(new Date().toLocaleTimeString())
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 10_000)
    return () => { active = false; clearInterval(interval) }
  }, [])

  // tick for timeAgo updates
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10_000)
    return () => clearInterval(t)
  }, [])

  if (loading) return <div className="sh-loading">Loading strategy health...</div>
  if (error) return <div className="sh-error">Error: {error}</div>

  const serviceOk = health?.status === 'healthy'

  return (
    <div className="sh-container">
      <div className="sh-header">
        <h1 className="sh-title">Strategy Health</h1>
        {lastUpdate && <span className="sh-updated">Updated {lastUpdate}</span>}
      </div>

      {/* Service health banner */}
      <div className="sh-service">
        <span className={`sh-service-dot ${serviceOk ? 'sh-ok' : 'sh-fail'}`} />
        <span className="sh-service-label">API Service</span>
        <span>{serviceOk ? 'Healthy' : 'Unhealthy'}</span>
        {health && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
          Last heartbeat: {timeAgo(health.timestamp)}
        </span>}
      </div>

      {/* Strategy cards */}
      <div className="sh-grid">
        {data.map(d => {
          const s = d.strategy
          const hasAlerts = d.alerts.length > 0
          return (
            <div key={s.name} className={`sh-card ${hasAlerts ? 'sh-card-alert' : ''}`}>
              <div className="sh-card-header">
                <h2 className="sh-card-name">{s.name}</h2>
                <span className={`sh-card-badge ${s.enabled ? 'sh-badge-enabled' : 'sh-badge-disabled'}`}>
                  {s.enabled ? 'live' : 'off'}
                </span>
              </div>

              <div className="sh-metrics">
                <div className="sh-metric">
                  <span className="sh-metric-label">Last Signal</span>
                  <span className="sh-metric-value">
                    {d.lastSignalTime ? timeAgo(d.lastSignalTime) : '—'}
                  </span>
                </div>
                <div className="sh-metric">
                  <span className="sh-metric-label">Signals / Hour</span>
                  <span className="sh-metric-value sh-blue">{d.signalsPerHour.toFixed(1)}</span>
                </div>
                <div className="sh-metric">
                  <span className="sh-metric-label">Total Trades</span>
                  <span className="sh-metric-value">{s.totalTrades}</span>
                </div>
                <div className="sh-metric">
                  <span className="sh-metric-label">Win Rate</span>
                  <span className={`sh-metric-value ${s.winRate >= 50 ? 'sh-green' : 'sh-red'}`}>
                    {s.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="sh-metric">
                  <span className="sh-metric-label">Max Drawdown</span>
                  <span className={`sh-metric-value ${s.maxDrawdown > 3 ? 'sh-red' : s.maxDrawdown > 1 ? 'sh-amber' : 'sh-green'}`}>
                    {s.maxDrawdown.toFixed(2)}%
                  </span>
                </div>
                <div className="sh-metric">
                  <span className="sh-metric-label">Total P&L</span>
                  <span className={`sh-metric-value ${s.totalPnl >= 0 ? 'sh-green' : 'sh-red'}`}>
                    {s.totalPnl >= 0 ? '+' : ''}${s.totalPnl.toFixed(2)}
                  </span>
                </div>
                <div className="sh-metric">
                  <span className="sh-metric-label">Sharpe</span>
                  <span className="sh-metric-value">{s.sharpeRatio.toFixed(2)}</span>
                </div>
                <div className="sh-metric">
                  <span className="sh-metric-label">Avg Hold</span>
                  <span className="sh-metric-value">{s.avgHoldMinutes.toFixed(0)}m</span>
                </div>
              </div>

              {d.alerts.length > 0 && (
                <div className="sh-alerts">
                  {d.alerts.map((a, i) => (
                    <div key={i} className={`sh-alert ${a.level === 'crit' ? 'sh-alert-crit' : 'sh-alert-warn'}`}>
                      {a.level === 'crit' ? '!!' : '!'} {a.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
