import { useState, useEffect } from 'react'
import { fetchStrategies, fetchSummary, type StrategyData, type SummaryData } from '../api'
import './StrategyComparison.css'

type SortKey = 'name' | 'totalTrades' | 'winRate' | 'avgWin' | 'avgLoss' | 'profitFactor' | 'sharpeRatio' | 'totalPnl'
type SortDir = 'asc' | 'desc'

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'name',         label: 'Strategy',     numeric: false },
  { key: 'totalTrades',  label: 'Trades',       numeric: true },
  { key: 'winRate',      label: 'Win Rate',     numeric: true },
  { key: 'avgWin',       label: 'Avg Win',      numeric: true },
  { key: 'avgLoss',      label: 'Avg Loss',     numeric: true },
  { key: 'profitFactor', label: 'Profit Factor', numeric: true },
  { key: 'sharpeRatio',  label: 'Sharpe',       numeric: true },
  { key: 'totalPnl',     label: 'Total P&L',    numeric: true },
]

function fmtUsd(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}$${n.toFixed(2)}`
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

function fmtNum(n: number): string {
  return n.toFixed(2)
}

function pnlClass(n: number): string {
  return n >= 0 ? 'sc-pnl-pos' : 'sc-pnl-neg'
}

function cardColor(n: number, invert = false): string {
  if (n === 0) return ''
  const pos = invert ? n < 0 : n > 0
  return pos ? 'sc-green' : 'sc-red'
}

export default function StrategyComparison() {
  const [strategies, setStrategies] = useState<StrategyData[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('totalPnl')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [stratRes, sumRes] = await Promise.all([fetchStrategies(), fetchSummary()])
        if (!active) return
        setStrategies(stratRes.strategies)
        setSummary(sumRes)
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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const sorted = [...strategies].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'name') return dir * a.name.localeCompare(b.name)
    return dir * (a[sortKey] - b[sortKey])
  })

  if (loading) return <div className="sc-loading">Loading strategies...</div>
  if (error) return <div className="sc-error">Error: {error}</div>

  return (
    <div className="sc-container">
      <div className="sc-header">
        <h1 className="sc-title">Strategy Performance</h1>
        {lastUpdate && <span className="sc-updated">Updated {lastUpdate}</span>}
      </div>

      {summary && (
        <div className="sc-summary">
          <div className="sc-card">
            <span className="sc-card-label">Total Equity</span>
            <span className="sc-card-value sc-blue">${summary.totalEquity.toFixed(2)}</span>
          </div>
          <div className="sc-card">
            <span className="sc-card-label">Realised P&L</span>
            <span className={`sc-card-value ${cardColor(summary.realisedPnl)}`}>{fmtUsd(summary.realisedPnl)}</span>
          </div>
          <div className="sc-card">
            <span className="sc-card-label">Daily P&L</span>
            <span className={`sc-card-value ${cardColor(summary.dailyPnl)}`}>{fmtUsd(summary.dailyPnl)}</span>
          </div>
          <div className="sc-card">
            <span className="sc-card-label">Sharpe Ratio</span>
            <span className="sc-card-value">{fmtNum(summary.sharpeRatio)}</span>
          </div>
          <div className="sc-card">
            <span className="sc-card-label">Max Drawdown</span>
            <span className={`sc-card-value ${cardColor(summary.maxDrawdown, true)}`}>{fmtPct(summary.maxDrawdown)}</span>
          </div>
          <div className="sc-card">
            <span className="sc-card-label">Open Positions</span>
            <span className="sc-card-value sc-amber">{summary.openPositions}</span>
          </div>
        </div>
      )}

      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={sortKey === col.key ? 'sc-sorted' : ''}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="sc-sort-indicator">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <tr key={s.name} className={s.totalPnl >= 0 ? 'sc-row-profit' : 'sc-row-loss'}>
                <td className="sc-strategy-name">
                  {s.name}
                  <span className={`sc-badge ${s.enabled ? 'sc-badge-enabled' : 'sc-badge-disabled'}`}>
                    {s.enabled ? 'live' : 'off'}
                  </span>
                </td>
                <td className="sc-num">{s.totalTrades}</td>
                <td className="sc-num">{fmtPct(s.winRate)}</td>
                <td className="sc-num sc-pnl-pos">{fmtUsd(s.avgWin)}</td>
                <td className="sc-num sc-pnl-neg">{s.avgLoss === 0 ? '$0.00' : fmtUsd(-Math.abs(s.avgLoss))}</td>
                <td className="sc-num">{fmtNum(s.profitFactor)}</td>
                <td className="sc-num">{fmtNum(s.sharpeRatio)}</td>
                <td className={`sc-num ${pnlClass(s.totalPnl)}`}>{fmtUsd(s.totalPnl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
