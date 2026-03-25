import { ACTION_DEFS, STATUS_DEFS, CACHE_ITEMS } from '../data/items'
import { ITEM_ICONS } from '../data/images'
import './quickref.css'

export default function QuickRef({ onBack }) {
  return (
    <div className="qr-wrap">
      {onBack && (
        <button className="qr-back-btn" onClick={onBack}>← Back</button>
      )}

      <div className="qr-section">
        <div className="qr-section-title">Actions</div>
        <div className="qr-list">
          {[...ACTION_DEFS].sort(([a], [b]) => a.localeCompare(b)).map(([name, desc]) => (
            <div key={name} className="qr-item">
              <span className="qr-item-name">{name}</span>
              <span className="qr-item-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="qr-section">
        <div className="qr-section-title">Statuses</div>
        <div className="qr-list">
          {[...STATUS_DEFS].sort(([a], [b]) => a.localeCompare(b)).map(([name, desc]) => (
            <div key={name} className="qr-item">
              <span className="qr-item-name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {ITEM_ICONS[name] && (
                  <img src={ITEM_ICONS[name]} style={{ width: '1.15rem', height: '1.15rem', filter: 'brightness(0) invert(1)', opacity: 0.85, flexShrink: 0 }} alt="" />
                )}
                {name}
              </span>
              <span className="qr-item-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="qr-section">
        <div className="qr-section-title">Falling (D6, 2″+ fall)</div>
        <p className="qr-fall-note">
          +1 if fell 4″+. &nbsp;+3 if fell 6″+ (model becomes Immobilized). &nbsp;8+ = Death.
        </p>
        <table className="qr-table">
          <tbody>
            <tr><td>1–2</td><td>0 dmg</td></tr>
            <tr><td>3–4</td><td>1 dmg</td></tr>
            <tr><td>5–6</td><td>2 dmg</td></tr>
            <tr><td>7</td><td>3 dmg</td></tr>
            <tr><td>8+</td><td>☠ Death</td></tr>
          </tbody>
        </table>
      </div>

      <div className="qr-section">
        <div className="qr-section-title">Resource Caches (D6)</div>
        <table className="qr-table">
          <tbody>
            {CACHE_ITEMS.map(item => (
              <tr key={item.roll}>
                <td>{item.roll}</td>
                <td>
                  <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {ITEM_ICONS[item.name] && (
                      <img src={ITEM_ICONS[item.name]} style={{ width: '1.1rem', height: '1.1rem', filter: 'brightness(0) invert(1)', opacity: 0.9 }} alt="" />
                    )}
                    {item.name}
                  </strong>
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
