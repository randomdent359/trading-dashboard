import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Layout, { usePlatform } from './components/Layout'
import StrategyComparison from './components/StrategyComparison'
import TradeExplorer from './components/TradeExplorer'
import LivePositions from './components/LivePositions'
import PaperTradingMetrics from './components/PaperTradingMetrics'
import EquityCurve from './components/EquityCurve'
import StrategyHealth from './components/StrategyHealth'
import StrategyDocs from './components/StrategyDocs'
import LogViewer from './components/LogViewer'
import AlertsViewer from './components/AlertsViewer'
import Status from './components/Status'

// Thin page wrappers that read platform from route params
function StrategyComparisonPage() { const p = usePlatform(); return <StrategyComparison platform={p} /> }
function TradeExplorerPage() { const p = usePlatform(); return <TradeExplorer platform={p} /> }
function LivePositionsPage() { const p = usePlatform(); return <LivePositions platform={p} /> }
function PaperTradingMetricsPage() { const p = usePlatform(); return <PaperTradingMetrics platform={p} /> }
function EquityCurvePage() { const p = usePlatform(); return <EquityCurve platform={p} /> }
function StrategyHealthPage() { const p = usePlatform(); return <StrategyHealth platform={p} /> }
function StrategyDocsPage() { const p = usePlatform(); return <StrategyDocs platform={p} /> }
function LogViewerPage() { const p = usePlatform(); return <LogViewer platform={p} /> }
function AlertsViewerPage() { const p = usePlatform(); return <AlertsViewer platform={p} /> }
function StatusPage() { const p = usePlatform(); return <Status platform={p} /> }

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/polymarket/strategies" replace />} />
      <Route path="/:platform" element={<Layout />}>
        <Route index element={<Navigate to="strategies" replace />} />
        <Route path="strategies" element={<StrategyComparisonPage />} />
        <Route path="trades" element={<TradeExplorerPage />} />
        <Route path="positions" element={<LivePositionsPage />} />
        <Route path="pnl" element={<PaperTradingMetricsPage />} />
        <Route path="equity" element={<EquityCurvePage />} />
        <Route path="health" element={<StrategyHealthPage />} />
        <Route path="docs" element={<StrategyDocsPage />} />
        <Route path="logs" element={<LogViewerPage />} />
        <Route path="alerts" element={<AlertsViewerPage />} />
        <Route path="status" element={<StatusPage />} />
      </Route>
    </Routes>
  )
}
