import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3000

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')))

// Trading paths on anjie
const TRADING_BASE = process.env.TRADING_BASE || '/home/rdent/trading'
const POLYMARKET_LOGS = path.join(TRADING_BASE, 'polymarket/logs/contrarian-monitor.log')
const POLYMARKET_ALERTS = path.join(TRADING_BASE, 'polymarket/data/consensus-extremes.jsonl')
const POLYMARKET_STATE = path.join(TRADING_BASE, 'polymarket/data/monitor-state.json')

// API endpoints
app.get('/api/status', (req, res) => {
  try {
    const stateFile = fs.readFileSync(POLYMARKET_STATE, 'utf-8')
    const state = JSON.parse(stateFile)

    const uptime = state.uptime_seconds || 0
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = uptime % 60

    res.json({
      active: true,
      uptime: `${hours}h ${minutes}m ${seconds}s`,
      pollCount: state.poll_count || 0,
      extremeCount: state.extreme_count || 0,
      lastPoll: new Date(state.timestamp).toLocaleTimeString(),
      memory: '~40MB' // From systemd info
    })
  } catch (err) {
    console.error('Status error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/logs', (req, res) => {
  try {
    const logContent = fs.readFileSync(POLYMARKET_LOGS, 'utf-8')
    const lines = logContent.split('\n').filter(l => l.trim())
    // Return last 200 lines
    const recent = lines.slice(-200)
    res.json({ lines: recent })
  } catch (err) {
    console.error('Logs error:', err)
    res.json({ lines: [`Error reading logs: ${err.message}`] })
  }
})

app.get('/api/alerts', (req, res) => {
  try {
    if (!fs.existsSync(POLYMARKET_ALERTS)) {
      return res.json({ alerts: [] })
    }

    const alertsContent = fs.readFileSync(POLYMARKET_ALERTS, 'utf-8')
    const lines = alertsContent.split('\n').filter(l => l.trim())
    const alerts = lines.map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    }).filter(Boolean)

    // Return last 100 alerts
    res.json({ alerts: alerts.slice(-100) })
  } catch (err) {
    console.error('Alerts error:', err)
    res.json({ alerts: [] })
  }
})

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎲 Trading Dashboard listening on http://0.0.0.0:${PORT}`)
  console.log(`Reading from: ${TRADING_BASE}`)
})
