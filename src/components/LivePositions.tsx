import { useState, useEffect, useMemo } from 'react'
import { fetchOpenPositionsByPlatform, fetchSummary, type TradeWithStrategy, type SummaryData } from '../api'
import type { Platform } from './Layout'
import './LivePositions.css'

function fmtPrice(p: number): string {
  return p >= 1000 ? `$${p.toFixed(2)}` : `$${p.toPrecision(6)}`
}

function fmtUsd(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}$${n.toFixed(2)}`
}

function fmtHold(entryTime: string): string {
  const ms = Date.now() - new Date(entryTime).getTime()
  if (ms < 0) return '—'
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.round(secs / 60)}m`
  const h = Math.floor(secs / 3600)
  const m = Math.round((secs % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function LivePositions({ platform }: { platform: Platform }) {
  const [positions, setPositions] = useState<TradeWithStrategy[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [pos, sum] = await Promise.all([fetchOpenPositionsByPlatform(platform), fetchSummary()])
        if (!active) return
        setPositions(pos)
        setSummary(sum)
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
  }, [platform])

  // re-render hold times every second
  const [, setTick] = useState(0)
  useEffect(() => {
    if (positions.length === 0) return
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [positions.length])

  const totalUnrealised = useMemo(
    () => summary?.unrealisedPnl ?? 0,
    [summary],
  )

  if (loading) return <div className="lp-loading">Loading positions...</div>
  if (error) return <div className="lp-error">Error: {error}</div>

  return (
    <div className="lp-container">
      <div className="lp-header">
        <h1 className="lp-title">
          Live Positions
          <span className="lp-live"><span className="lp-dot" /> auto-refresh 10s</span>
        </h1>
        {lastUpdate && <span className="lp-updated">Updated {lastUpdate}</span>}
      </div>

      {/* Summary strip */}
      <div className="lp-summary">
        <span>Open<span className="lp-stat-val">{positions.length}</span></span>
        <span>Unrealised P&L<span className={`lp-stat-val ${totalUnrealised >= 0 ? 'lp-pnl-pos' : 'lp-pnl-neg'}`}>
          {fmtUsd(totalUnrealised)}
        </span></span>
        {summary && (
          <span>Portfolio Equity<span className="lp-stat-val">${summary.totalEquity.toFixed(2)}</span></span>
        )}
      </div>

      {positions.length === 0 ? (
        <div className="lp-empty">
          <p className="lp-empty-title">No open positions</p>
          <p className="lp-empty-sub">Positions will appear here when strategies enter trades.</p>
        </div>
      ) : (
        <div className="lp-table-wrap">
          <table className="lp-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Side</th>
                <th>Strategy</th>
                <th>Entry Price</th>
                <th>Quantity</th>
                <th>Unrealised P&L</th>
                <th>Hold Time</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.id} className={p.direction === 'LONG' ? 'lp-row-long' : 'lp-row-short'}>
                  <td>
                    {p.asset}
                    <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.4rem' }}>{p.exchange}</span>
                  </td>
                  <td>
                    <span className={`lp-badge ${p.direction === 'LONG' ? 'lp-badge-long' : 'lp-badge-short'}`}>
                      {p.direction}
                    </span>
                  </td>
                  <td>{p.strategy}</td>
                  <td className="lp-num">{fmtPrice(p.entryPrice)}</td>
                  <td className="lp-num lp-mono">{p.quantity.toPrecision(6)}</td>
                  <td className={`lp-num ${p.realisedPnl >= 0 ? 'lp-pnl-pos' : 'lp-pnl-neg'}`}>
                    {fmtUsd(p.realisedPnl)}
                  </td>
                  <td className="lp-num lp-mono">{fmtHold(p.entryTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
