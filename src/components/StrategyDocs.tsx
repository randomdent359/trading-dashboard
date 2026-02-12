import { useState, useEffect, useCallback } from 'react'
import { fetchStrategiesByPlatform, fetchStrategyDocs, type StrategyDocs as StrategyDocsData } from '../api'
import type { Platform } from './Layout'
import './StrategyDocs.css'

export default function StrategyDocs({ platform }: { platform: Platform }) {
  const [docs, setDocs] = useState<StrategyDocsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { strategies } = await fetchStrategiesByPlatform(platform)
        const results = await Promise.all(
          strategies.map(s => fetchStrategyDocs(s.name))
        )
        if (!active) return
        setDocs(results)
        // auto-expand if only one strategy
        if (results.length === 1) setExpanded(new Set([results[0].name]))
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
    return () => { active = false }
  }, [platform])

  const toggle = useCallback((name: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  if (loading) return <div className="sd-loading">Loading strategy docs...</div>
  if (error) return <div className="sd-error">Error: {error}</div>

  return (
    <div className="sd-container">
      <div className="sd-header">
        <h1 className="sd-title">Strategy Documentation</h1>
        {lastUpdate && <span className="sd-updated">Updated {lastUpdate}</span>}
      </div>

      {docs.map(d => {
        const isOpen = expanded.has(d.name)
        return (
          <div key={d.name} className="sd-card">
            <div className="sd-card-header" onClick={() => toggle(d.name)}>
              <h2 className="sd-card-name">{d.name}</h2>
              <div className="sd-card-meta">
                {d.exchanges.map(e => <span key={e} className="sd-tag">{e}</span>)}
                <span className="sd-tag">{d.interval}</span>
                <span className={`sd-chevron ${isOpen ? 'sd-open' : ''}`}>&#9654;</span>
              </div>
            </div>

            {isOpen && (
              <div className="sd-card-body">
                <div className="sd-description">{d.description}</div>

                <div className="sd-info">
                  <div className="sd-info-item">
                    <span className="sd-info-label">Assets</span>
                    <div className="sd-asset-list">
                      {d.assets.map(a => <span key={a} className="sd-asset">{a}</span>)}
                    </div>
                  </div>
                  <div className="sd-info-item">
                    <span className="sd-info-label">Exchanges</span>
                    <span className="sd-info-value">{d.exchanges.join(', ')}</span>
                  </div>
                  <div className="sd-info-item">
                    <span className="sd-info-label">Interval</span>
                    <span className="sd-info-value">{d.interval}</span>
                  </div>
                </div>

                <div className="sd-section">
                  <span className="sd-section-title">Thesis / Expected Edge</span>
                  <p className="sd-section-text">{d.docs.thesis}</p>
                </div>

                <div className="sd-section">
                  <span className="sd-section-title">Data Requirements</span>
                  <p className="sd-section-text">{d.docs.data}</p>
                </div>

                <div className="sd-section">
                  <span className="sd-section-title">Risk Characteristics</span>
                  <p className="sd-section-text">{d.docs.risk}</p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
