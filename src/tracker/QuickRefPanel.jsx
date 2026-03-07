import { useTrackerStore } from '../store/trackerStore'
import { ACTION_DEFS, STATUS_DEFS, CACHE_ITEMS } from '../data/items'

export default function QuickRefPanel() {
  return (
    <div className="tk-ref-overlay">
      <div className="tk-ref-section">
        <div className="tk-ref-section-title">Actions</div>
        <div className="tk-abilities-block">
          {[...ACTION_DEFS].sort(([a], [b]) => a.localeCompare(b)).map(([name, desc]) => (
            <div key={name} className="tk-ability">
              <div className="tk-ability-header">
                <span className="tk-ability-name">{name}</span>
              </div>
              <div className="tk-ability-desc">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="tk-ref-section">
        <div className="tk-ref-section-title">Statuses</div>
        <div className="tk-abilities-block">
          {[...STATUS_DEFS].sort(([a], [b]) => a.localeCompare(b)).map(([name, desc]) => (
            <div key={name} className="tk-ability">
              <div className="tk-ability-header">
                <span className="tk-ability-name">{name}</span>
              </div>
              <div className="tk-ability-desc">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="tk-ref-section">
        <div className="tk-ref-section-title">Falling (D6, 2″+ fall)</div>
        <div className="tk-ref-fall-note">
          +1 if fell 4″+.<br />
          +3 if fell 6″+. Model becomes Immobilized.<br />
          8+ = Death.
        </div>
        <table className="tk-ref-table">
          <tbody>
            <tr><td>1–2</td><td>0 dmg</td></tr>
            <tr><td>3–4</td><td>1 dmg</td></tr>
            <tr><td>5–6</td><td>2 dmg</td></tr>
            <tr><td>7</td><td>3 dmg</td></tr>
            <tr><td>8+</td><td>☠ Death</td></tr>
          </tbody>
        </table>
      </div>

      <div className="tk-ref-section">
        <div className="tk-ref-section-title">Resource Caches (D6)</div>
        <table className="tk-ref-table">
          <tbody>
            {CACHE_ITEMS.map(item => (
              <tr key={item.roll}>
                <td>{item.roll}</td>
                <td>
                  <strong>{item.name}</strong>
                  {' — '}{item.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
