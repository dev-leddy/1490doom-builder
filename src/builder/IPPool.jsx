import { useBuilderStore } from '../store/builderStore'

export default function IPPool({ onEndOfGame }) {
  const { ipLimit, changeIPLimit, getTotalIPSpent, slots, addSlot, removeSlot, companyMode, campaignGame } = useBuilderStore()

  if (companyMode === 'campaign') {
    return (
      <div className="ip-pool">
        <div className="ip-pool-group campaign-mode-group">
          <span className="ip-pool-label campaign-label">CAMPAIGN</span>
          <span className="ip-pool-campaign-game">Scenario {campaignGame + 1}</span>
          <button className="btn btn-campaign-eog ip-pool-eog-btn" onClick={onEndOfGame}>
            End of Game
          </button>
        </div>

        <div className="ip-pool-divider" />

        <div className="ip-pool-group">
          <span className="ip-pool-label">Warriors</span>
          <div className="ip-limit-ctrl">
            <button className="ip-limit-btn" onClick={removeSlot}>−</button>
            <span className="ip-limit-display">{slots.length}</span>
            <button className="ip-limit-btn" onClick={addSlot}>+</button>
          </div>
        </div>
      </div>
    )
  }

  const spent = getTotalIPSpent()
  const remaining = ipLimit - spent
  const pips = Array.from({ length: ipLimit }, (_, i) => i < spent)

  return (
    <div className="ip-pool">
      <div className="ip-pool-group">
        <span className="ip-pool-label">Company IP</span>
        <div className="ip-limit-ctrl">
          <button className="ip-limit-btn" onClick={() => changeIPLimit(-1)}>−</button>
          <span className="ip-limit-display">{ipLimit}</span>
          <button className="ip-limit-btn" onClick={() => changeIPLimit(1)}>+</button>
        </div>
        <div className="ip-pool-pips">
          {pips.map((used, i) => (
            <span key={i} className={`ip-pool-pip${used ? ' filled' : ''}`} />
          ))}
        </div>
        <span className="ip-pool-count">{remaining}/{ipLimit} rem</span>
      </div>

      <div className="ip-pool-divider" />

      <div className="ip-pool-group">
        <span className="ip-pool-label">Warriors</span>
        <div className="ip-limit-ctrl">
          <button className="ip-limit-btn" onClick={removeSlot}>−</button>
          <span className="ip-limit-display">{slots.length}</span>
          <button className="ip-limit-btn" onClick={addSlot}>+</button>
        </div>
      </div>
    </div>
  )
}
