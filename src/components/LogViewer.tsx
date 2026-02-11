import { useState, useEffect, useRef } from 'react'
import './LogViewer.css'

interface LogViewerProps {
  platform: 'polymarket' | 'hyperliquid'
}

export default function LogViewer({ platform }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const logFile = platform === 'polymarket'
    ? '/logs/contrarian-monitor.log'
    : '/logs/funding-monitor.log'

  const fetchLogs = async () => {
    try {
      const response = await fetch(logFile)
      if (!response.ok) throw new Error('Failed to fetch logs')
      const text = await response.text()
      const lines = text.split('\n').filter(line => line.trim())
      setLogs(lines)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 2000)
    return () => clearInterval(interval)
  }, [platform])

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

  const platformName = platform === 'polymarket' ? 'Polymarket' : 'Hyperliquid'

  return (
    <div className="log-viewer">
      <div className="log-header">
        <h2>{platformName} Monitor Logs</h2>
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
        <span>📁 {logFile}</span>
      </div>
    </div>
  )
}

function getLogLevel(line: string): string {
  if (line.includes('❌') || line.includes('ERROR')) return 'error'
  if (line.includes('🚨') || line.includes('EXTREME')) return 'alert'
  if (line.includes('✅') || line.includes('SUCCESS')) return 'success'
  if (line.includes('⚠️') || line.includes('WARNING')) return 'warning'
  return 'info'
}
