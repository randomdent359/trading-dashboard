import { useState } from 'react'
import './App.css'
import LogViewer from './components/LogViewer'
import AlertsViewer from './components/AlertsViewer'
import Status from './components/Status'

function App() {
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'alerts'>('status')

  return (
    <div className="app">
      <header className="header">
        <h1>🎲 Trading Dashboard</h1>
        <p>Polymarket Contrarian Monitor</p>
      </header>

      <nav className="nav">
        <button 
          className={`nav-btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          Status
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
        {activeTab === 'status' && <Status />}
        {activeTab === 'logs' && <LogViewer />}
        {activeTab === 'alerts' && <AlertsViewer />}
      </main>
    </div>
  )
}

export default App
