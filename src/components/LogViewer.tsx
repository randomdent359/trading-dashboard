import { useState, useEffect, useRef } from 'react'
import './LogViewer.css'

export default function LogViewer() {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs')
      if (!response.ok) throw new Error('Failed to fetch logs')
      const data = await response.json()
      setLogs(data.lines || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 2000) // Refresh every 2s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100
    setAutoScroll(isNearBottom)
  }

  if (loading) return <div className="logs-loading">Loading logs...</div>

  return (
    <div className="log-viewer">
      <div className="log-header">
        <h2>Monitor Logs</h2>
        <div className="log-controls">
          <label className="auto-scroll-toggle">
            <input 
              type="checkbox" 
              checked={autoScroll} 
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          <button onClick={fetchLogs} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="log-error">Error: {error}</div>}

      <div className="log-container" onScroll={handleScroll}>
        <pre className="log-content">
          {logs.length === 0 ? (
            <span className="log-empty">No logs available yet...</span>
          ) : (
            logs.map((line, idx) => (
              <div key={idx} className={`log-line ${getLogLevel(line)}`}>
                {line}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </pre>
      </div>

      <div className="log-stats">
        <span>📋 {logs.length} lines</span>
        <span>📁 ~/trading/polymarket/logs/contrarian-monitor.log</span>
      </div>
    </div>
  )
}

function getLogLevel(line: string): string {
  if (line.includes('❌') || line.includes('ERROR')) return 'error'
  if (line.includes('🚨') || line.includes('CONSENSUS')) return 'alert'
  if (line.includes('✅') || line.includes('SUCCESS')) return 'success'
  if (line.includes('⚠️') || line.includes('WARNING')) return 'warning'
  return 'info'
}
