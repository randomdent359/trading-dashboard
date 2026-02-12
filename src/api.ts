// Shared API client — all endpoints go through /api (Vite proxy in dev, reverse proxy in prod)

export interface StrategyData {
  name: string
  enabled: boolean
  totalTrades: number
  winRate: number
  avgWin: number
  avgLoss: number
  totalPnl: number
  profitFactor: number
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdown: number
  expectancy: number
  avgHoldMinutes: number
}

export interface StrategiesResponse {
  strategies: StrategyData[]
}

export interface SummaryData {
  totalEquity: number
  unrealisedPnl: number
  realisedPnl: number
  openPositions: number
  dailyPnl: number
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdown: number
  expectancy: number
  avgHoldMinutes: number
  profitFactor: number
  lastUpdate: string
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`API ${path}: ${res.status} ${res.statusText}`)
  return res.json()
}

export function fetchStrategies(): Promise<StrategiesResponse> {
  return apiFetch<StrategiesResponse>('/api/strategies')
}

export function fetchSummary(): Promise<SummaryData> {
  return apiFetch<SummaryData>('/api/summary')
}

export interface EquityCurvePoint {
  timestamp: string
  totalEquity: number
  unrealisedPnl: number
  realisedPnl: number
  openPositions: number
}

export interface EquityCurveResponse {
  data: EquityCurvePoint[]
}

export function fetchEquityCurve(): Promise<EquityCurveResponse> {
  return apiFetch<EquityCurveResponse>('/api/equity-curve')
}

export interface TradeData {
  id: number
  asset: string
  exchange: string
  direction: string
  entryPrice: number
  entryTime: string
  quantity: number
  exitPrice: number | null
  exitTime: string | null
  exitReason: string | null
  realisedPnl: number
  status: string
  metadata: Record<string, unknown>
}

export interface TradesResponse {
  trades: TradeData[]
  total: number
  limit: number
  offset: number
}

export type TradeWithStrategy = TradeData & { strategy: string }

export async function fetchAllTrades(): Promise<TradeWithStrategy[]> {
  const { strategies } = await fetchStrategies()
  const results = await Promise.all(
    strategies.map(s =>
      apiFetch<TradesResponse>(`/api/strategies/${s.name}/trades`).then(r =>
        r.trades.map(t => ({ ...t, strategy: s.name }))
      )
    )
  )
  return results.flat()
}
