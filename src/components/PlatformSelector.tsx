import './PlatformSelector.css'

interface PlatformSelectorProps {
  onPlatformChange: (platform: 'polymarket' | 'hyperliquid') => void
  currentPlatform: 'polymarket' | 'hyperliquid'
}

export default function PlatformSelector({ onPlatformChange, currentPlatform }: PlatformSelectorProps) {
  return (
    <div className="platform-selector">
      <button
        className={`platform-btn ${currentPlatform === 'polymarket' ? 'active' : ''}`}
        onClick={() => onPlatformChange('polymarket')}
      >
        📊 Polymarket
        <span className="subtitle">Consensus Extremes</span>
      </button>
      <button
        className={`platform-btn ${currentPlatform === 'hyperliquid' ? 'active' : ''}`}
        onClick={() => onPlatformChange('hyperliquid')}
      >
        ⚡ Hyperliquid
        <span className="subtitle">Funding Rates</span>
      </button>
    </div>
  )
}
