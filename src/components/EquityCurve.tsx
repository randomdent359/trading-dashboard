import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { fetchEquityCurve, type EquityCurvePoint } from '../api'
import type { Platform } from './Layout'
import './EquityCurve.css'

// ── constants ────────────────────────────────────────────────────────────
const LINE_COLORS = {
  totalEquity:   '#60a5fa',
  unrealisedPnl: '#f59e0b',
  realisedPnl:   '#10b981',
  drawdown:      '#ef4444',
} as const

type LineKey = 'totalEquity' | 'unrealisedPnl' | 'realisedPnl'

const LINES: { key: LineKey; label: string }[] = [
  { key: 'totalEquity',   label: 'Equity' },
  { key: 'unrealisedPnl', label: 'Unrealised P&L' },
  { key: 'realisedPnl',   label: 'Realised P&L' },
]

type RangeKey = '1h' | '6h' | '1d' | 'all'
const RANGES: { key: RangeKey; label: string; ms: number }[] = [
  { key: '1h',  label: '1 H',  ms: 3_600_000 },
  { key: '6h',  label: '6 H',  ms: 21_600_000 },
  { key: '1d',  label: '1 D',  ms: 86_400_000 },
  { key: 'all', label: 'All',  ms: 0 },
]

interface ChartRow {
  ts: number          // epoch ms — used for X axis
  label: string       // formatted time string for tooltip
  totalEquity: number
  unrealisedPnl: number
  realisedPnl: number
  drawdown: number    // percent drawdown from peak (negative)
}

// ── helpers ──────────────────────────────────────────────────────────────
function fmtTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + fmtTime(ts)
}

function fmtUsd(v: number): string {
  return `$${v.toFixed(2)}`
}

function fmtPct(v: number): string {
  return `${v.toFixed(2)}%`
}

// ── custom tooltip ───────────────────────────────────────────────────────
interface TipProps {
  active?: boolean
  payload?: { dataKey: string; value: number; color: string }[]
  label?: number
}

function ChartTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length || label == null) return null
  return (
    <div className="ec-tooltip">
      <div className="ec-tooltip-label">{fmtDate(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="ec-tooltip-row">
          <span className="ec-tooltip-name" style={{ color: p.color }}>
            {p.dataKey === 'totalEquity' ? 'Equity'
              : p.dataKey === 'unrealisedPnl' ? 'Unrealised'
              : p.dataKey === 'realisedPnl' ? 'Realised'
              : 'Drawdown'}
          </span>
          <span className="ec-tooltip-val" style={{ color: p.color }}>
            {p.dataKey === 'drawdown' ? fmtPct(p.value) : fmtUsd(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── component ────────────────────────────────────────────────────────────
export default function EquityCurve(_props: { platform: Platform }) {
  const [raw, setRaw] = useState<EquityCurvePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState('')
  const [range, setRange] = useState<RangeKey>('all')
  const [visible, setVisible] = useState<Record<LineKey, boolean>>({
    totalEquity: true,
    unrealisedPnl: false,
    realisedPnl: true,
  })

  // fetch
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetchEquityCurve()
        if (!active) return
        setRaw(res.data)
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

  // build chart rows with drawdown
  const allRows: ChartRow[] = useMemo(() => {
    let peak = -Infinity
    return raw.map(p => {
      const ts = new Date(p.timestamp).getTime()
      if (p.totalEquity > peak) peak = p.totalEquity
      const dd = peak > 0 ? ((p.totalEquity - peak) / peak) * 100 : 0
      return {
        ts,
        label: fmtTime(ts),
        totalEquity: p.totalEquity,
        unrealisedPnl: p.unrealisedPnl,
        realisedPnl: p.realisedPnl,
        drawdown: dd,
      }
    })
  }, [raw])

  // filtered by date range
  const rows = useMemo(() => {
    if (range === 'all' || allRows.length === 0) return allRows
    const ms = RANGES.find(r => r.key === range)!.ms
    const cutoff = allRows[allRows.length - 1].ts - ms
    return allRows.filter(r => r.ts >= cutoff)
  }, [allRows, range])

  const toggle = useCallback((key: LineKey) => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // X-axis tick formatter
  const tickFmt = useCallback((ts: number) => fmtTime(ts), [])

  if (loading) return <div className="ec-loading">Loading equity curve...</div>
  if (error) return <div className="ec-error">Error: {error}</div>

  const startEquity = rows.length > 0 ? rows[0].totalEquity : 0

  return (
    <div className="ec-container">
      <div className="ec-header">
        <h1 className="ec-title">Equity Curve</h1>
        {lastUpdate && <span className="ec-updated">Updated {lastUpdate}</span>}
      </div>

      {/* Controls */}
      <div className="ec-controls">
        <div className="ec-range-btns">
          {RANGES.map(r => (
            <button
              key={r.key}
              className={`ec-range-btn ${range === r.key ? 'ec-active' : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="ec-toggles">
          {LINES.map(l => (
            <button
              key={l.key}
              className={`ec-toggle ${visible[l.key] ? 'ec-on' : ''}`}
              onClick={() => toggle(l.key)}
            >
              <span className="ec-swatch" style={{ background: LINE_COLORS[l.key] }} />
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main equity chart */}
      <div className="ec-chart-panel">
        <div className="ec-chart-label">Portfolio Value</div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={rows} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="ts"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={tickFmt}
              tick={{ fontSize: 11 }}
              scale="time"
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              tick={{ fontSize: 11 }}
              width={70}
            />
            <Tooltip content={<ChartTooltip />} />
            {startEquity > 0 && (
              <ReferenceLine y={startEquity} stroke="#475569" strokeDasharray="4 4" />
            )}
            {visible.totalEquity && (
              <Line
                dataKey="totalEquity"
                stroke={LINE_COLORS.totalEquity}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            )}
            {visible.unrealisedPnl && (
              <Line
                dataKey="unrealisedPnl"
                stroke={LINE_COLORS.unrealisedPnl}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            )}
            {visible.realisedPnl && (
              <Line
                dataKey="realisedPnl"
                stroke={LINE_COLORS.realisedPnl}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Drawdown subplot */}
      <div className="ec-chart-panel">
        <div className="ec-chart-label">Drawdown</div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={rows} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="ts"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={tickFmt}
              tick={{ fontSize: 11 }}
              scale="time"
            />
            <YAxis
              domain={['auto', 0]}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              tick={{ fontSize: 11 }}
              width={70}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={0} stroke="#475569" />
            <Line
              dataKey="drawdown"
              stroke={LINE_COLORS.drawdown}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
