import { useState } from 'react'
import './App.css'
import LogViewer from './components/LogViewer'
import AlertsViewer from './components/AlertsViewer'
import Status from './components/Status'
import PlatformSelector from './components/PlatformSelector'
import StrategyComparison from './components/StrategyComparison'
import PaperTradingMetrics from './components/PaperTradingMetrics'
import EquityCurve from './components/EquityCurve'

function App() {
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'alerts' | 'strategies' | 'metrics' | 'equity'>('strategies')
  const [platform, setPlatform] = useState<'polymarket' | 'hyperliquid'>('polymarket')

  const platformLabels = {
    polymarket: 'Polymarket Consensus Extremes',
    hyperliquid: 'Hyperliquid Funding Rates'
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎲 Trading Dashboard</h1>
        <p>Multi-Strategy Monitoring</p>
      </header>

      <PlatformSelector currentPlatform={platform} onPlatformChange={setPlatform} />
      
      <div className="platform-title">{platformLabels[platform]}</div>

      <nav className="nav">
        <button 
          className={`nav-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          💰 P&L
        </button>
        <button 
          className={`nav-btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          Status
        </button>
        <button
          className={`nav-btn ${activeTab === 'strategies' ? 'active' : ''}`}
          onClick={() => setActiveTab('strategies')}
        >
          Strategies
        </button>
        <button
          className={`nav-btn ${activeTab === 'equity' ? 'active' : ''}`}
          onClick={() => setActiveTab('equity')}
        >
          Equity
        </button>
        <button 
          className={`nav-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Logs
        </button>
        <button 
          className={`nav-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts
        </button>
      </nav>

      <main className="main">
        {activeTab === 'metrics' && <PaperTradingMetrics />}
        {activeTab === 'status' && <Status platform={platform} />}
        {activeTab === 'strategies' && <StrategyComparison />}
        {activeTab === 'equity' && <EquityCurve />}
        {activeTab === 'logs' && <LogViewer platform={platform} />}
        {activeTab === 'alerts' && <AlertsViewer platform={platform} />}
      </main>
    </div>
  )
}

export default App
