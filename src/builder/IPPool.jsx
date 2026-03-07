import { useBuilderStore } from '../store/builderStore'

export default function IPPool() {
  const { ipLimit, changeIPLimit, getTotalIPSpent } = useBuilderStore()
  const spent = getTotalIPSpent()
  const remaining = ipLimit - spent

  const pips = Array.from({ length: ipLimit }, (_, i) => i < spent)

  return (
    <div className="ip-pool">
      <div className="ip-pool-top">
        <span className="ip-pool-label">Company IP</span>
        <div className="ip-limit-ctrl">
          <button className="ip-limit-btn" onClick={() => changeIPLimit(-1)}>−</button>
          <span className="ip-limit-display">Limit: <strong>{ipLimit}</strong></span>
          <button className="ip-limit-btn" onClick={() => changeIPLimit(1)}>+</button>
        </div>
      </div>
      <div className="ip-pool-bottom">
        <div className="ip-pool-pips">
          {pips.map((used, i) => (
            <span key={i} className={`ip-pool-pip${used ? ' filled' : ''}`} />
          ))}
        </div>
        <span className="ip-pool-count">
          {remaining} / {ipLimit} remaining
        </span>
      </div>
    </div>
  )
}
