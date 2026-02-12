import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import { fetchTradesByPlatform, type TradeWithStrategy } from '../api'
import type { Platform } from './Layout'
import './TradeExplorer.css'

type SortKey = 'entryTime' | 'strategy' | 'asset' | 'direction' | 'realisedPnl' | 'hold'
type SortDir = 'asc' | 'desc'
type PnlFilter = 'all' | 'winners' | 'losers'

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'entryTime',   label: 'Entry' },
  { key: 'strategy',    label: 'Strategy' },
  { key: 'asset',       label: 'Asset' },
  { key: 'direction',   label: 'Side' },
  { key: 'realisedPnl', label: 'P&L' },
  { key: 'hold',        label: 'Hold Time' },
]

function holdMs(t: TradeWithStrategy): number {
  if (!t.exitTime) return 0
  return new Date(t.exitTime).getTime() - new Date(t.entryTime).getTime()
}

function fmtHold(ms: number): string {
  if (ms <= 0) return '—'
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.round(secs / 60)}m`
  const h = Math.floor(secs / 3600)
  const m = Math.round((secs % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmtPrice(p: number): string {
  return p >= 1000 ? `$${p.toFixed(2)}` : `$${p.toPrecision(6)}`
}

function fmtPnl(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}$${n.toFixed(2)}`
}

function sortVal(t: TradeWithStrategy, key: SortKey): string | number {
  switch (key) {
    case 'entryTime':   return new Date(t.entryTime).getTime()
    case 'strategy':    return t.strategy
    case 'asset':       return t.asset
    case 'direction':   return t.direction
    case 'realisedPnl': return t.realisedPnl
    case 'hold':        return holdMs(t)
  }
}

export default function TradeExplorer({ platform }: { platform: Platform }) {
  const [trades, setTrades] = useState<TradeWithStrategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState('')

  // filters
  const [strategyFilter, setStrategyFilter] = useState('all')
  const [assetFilter, setAssetFilter] = useState('all')
  const [pnlFilter, setPnlFilter] = useState<PnlFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // sort
  const [sortKey, setSortKey] = useState<SortKey>('entryTime')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // detail expansion
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const data = await fetchTradesByPlatform(platform)
        if (!active) return
        setTrades(data)
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

  const strategyKeys = useMemo(
    () => [...new Set(trades.map(t => t.strategy))].sort(),
    [trades],
  )

  const assetKeys = useMemo(
    () => [...new Set(trades.map(t => t.asset))].sort(),
    [trades],
  )

  const rows = useMemo(() => {
    let filtered = trades

    if (strategyFilter !== 'all')
      filtered = filtered.filter(t => t.strategy === strategyFilter)
    if (assetFilter !== 'all')
      filtered = filtered.filter(t => t.asset === assetFilter)
    if (pnlFilter === 'winners')
      filtered = filtered.filter(t => t.realisedPnl > 0)
    else if (pnlFilter === 'losers')
      filtered = filtered.filter(t => t.realisedPnl < 0)
    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      filtered = filtered.filter(t => new Date(t.entryTime).getTime() >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86_400_000
      filtered = filtered.filter(t => new Date(t.entryTime).getTime() < to)
    }

    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va = sortVal(a, sortKey)
      const vb = sortVal(b, sortKey)
      if (typeof va === 'number' && typeof vb === 'number') return dir * (va - vb)
      return dir * String(va).localeCompare(String(vb))
    })
  }, [trades, strategyFilter, assetFilter, pnlFilter, dateFrom, dateTo, sortKey, sortDir])

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key }
      setSortDir(key === 'entryTime' ? 'desc' : 'asc')
      return key
    })
    setExpandedId(null)
  }, [])

  const toggleExpand = useCallback((id: number) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  const wins = rows.filter(t => t.realisedPnl > 0).length
  const losses = rows.filter(t => t.realisedPnl < 0).length
  const totalPnl = rows.reduce((s, t) => s + t.realisedPnl, 0)

  if (loading) return <div className="te-loading">Loading trades...</div>
  if (error) return <div className="te-error">Error: {error}</div>

  return (
    <div className="te-container">
      <div className="te-header">
        <h1 className="te-title">Trade Explorer</h1>
        {lastUpdate && <span className="te-updated">Updated {lastUpdate}</span>}
      </div>

      {/* Filters */}
      <div className="te-filters">
        <select
          className="te-filter"
          value={strategyFilter}
          onChange={e => { setStrategyFilter(e.target.value); setExpandedId(null) }}
        >
          <option value="all">All Strategies</option>
          {strategyKeys.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <select
          className="te-filter"
          value={assetFilter}
          onChange={e => { setAssetFilter(e.target.value); setExpandedId(null) }}
        >
          <option value="all">All Assets</option>
          {assetKeys.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <select
          className="te-filter"
          value={pnlFilter}
          onChange={e => { setPnlFilter(e.target.value as PnlFilter); setExpandedId(null) }}
        >
          <option value="all">All P&L</option>
          <option value="winners">Winners only</option>
          <option value="losers">Losers only</option>
        </select>

        <input
          type="date"
          className="te-filter"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setExpandedId(null) }}
        />
        <input
          type="date"
          className="te-filter"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setExpandedId(null) }}
        />
      </div>

      {/* Stats */}
      <div className="te-stats">
        <span>Showing<span className="te-stat-val">{rows.length}</span></span>
        <span>Wins<span className="te-stat-val">{wins}</span></span>
        <span>Losses<span className="te-stat-val">{losses}</span></span>
        <span>Net P&L<span className={`te-stat-val ${totalPnl >= 0 ? 'te-pnl-pos' : 'te-pnl-neg'}`}>
          {fmtPnl(totalPnl)}
        </span></span>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="te-empty">No trades match the current filters.</div>
      ) : (
        <div className="te-table-wrap">
          <table className="te-table">
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={sortKey === col.key ? 'te-sorted' : ''}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <span className="te-sort-ind">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(t => {
                const expanded = expandedId === t.id
                return (
                  <Fragment key={t.id}>
                    <tr
                      className={t.realisedPnl > 0 ? 'te-row-win' : t.realisedPnl < 0 ? 'te-row-loss' : ''}
                      onClick={() => toggleExpand(t.id)}
                    >
                      <td className="te-mono">
                        {new Date(t.entryTime).toLocaleString([], {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td>{t.strategy}</td>
                      <td>{t.asset} <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{t.exchange}</span></td>
                      <td>
                        <span className={`te-badge ${t.direction === 'LONG' ? 'te-badge-win' : 'te-badge-loss'}`}>
                          {t.direction}
                        </span>
                      </td>
                      <td className={`te-num ${t.realisedPnl > 0 ? 'te-pnl-pos' : t.realisedPnl < 0 ? 'te-pnl-neg' : 'te-pnl-zero'}`}>
                        {fmtPnl(t.realisedPnl)}
                      </td>
                      <td className="te-num te-mono">
                        {fmtHold(holdMs(t))}
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={6} className="te-detail-cell">
                          <div className="te-detail">
                            <div className="te-detail-item">
                              <span className="te-detail-label">Entry Price</span>
                              <span className="te-detail-value">{fmtPrice(t.entryPrice)}</span>
                            </div>
                            {t.exitPrice != null && (
                              <div className="te-detail-item">
                                <span className="te-detail-label">Exit Price</span>
                                <span className="te-detail-value">{fmtPrice(t.exitPrice)}</span>
                              </div>
                            )}
                            <div className="te-detail-item">
                              <span className="te-detail-label">Quantity</span>
                              <span className="te-detail-value">{t.quantity}</span>
                            </div>
                            <div className="te-detail-item">
                              <span className="te-detail-label">Exchange</span>
                              <span className="te-detail-value">{t.exchange}</span>
                            </div>
                            <div className="te-detail-item">
                              <span className="te-detail-label">Status</span>
                              <span className="te-detail-value">{t.status}</span>
                            </div>
                            {t.exitReason && (
                              <div className="te-detail-item">
                                <span className="te-detail-label">Exit Reason</span>
                                <span className="te-detail-value">{t.exitReason}</span>
                              </div>
                            )}
                            <div className="te-detail-item">
                              <span className="te-detail-label">Entry Time</span>
                              <span className="te-detail-value">{new Date(t.entryTime).toLocaleString()}</span>
                            </div>
                            {t.exitTime && (
                              <div className="te-detail-item">
                                <span className="te-detail-label">Exit Time</span>
                                <span className="te-detail-value">{new Date(t.exitTime).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
