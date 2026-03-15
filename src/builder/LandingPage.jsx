import { useBuilderStore } from '../store/builderStore'
import { getAvatarSrc } from '../data/avatars'
import { ACTION_DEFS, STATUS_DEFS, CACHE_ITEMS } from '../data/items'
import { ITEM_ICONS } from '../data/images'
import SaveLoadPanel from './SaveLoadPanel'

export function RefContent() {
  return (
    <div className="landing-ref-body">
      <div className="landing-ref-section">
        <div className="landing-ref-title">Actions</div>
        <div className="landing-ref-items">
          {[...ACTION_DEFS].sort(([a], [b]) => a.localeCompare(b)).map(([name, desc]) => (
            <div key={name} className="landing-ref-item">
              <span className="landing-ref-name">{name}</span>
              <span className="landing-ref-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="landing-ref-section">
        <div className="landing-ref-title">Statuses</div>
        <div className="landing-ref-items">
          {[...STATUS_DEFS].sort(([a], [b]) => a.localeCompare(b)).map(([name, desc]) => (
            <div key={name} className="landing-ref-item">
              <span className="landing-ref-name" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {ITEM_ICONS[name] && (
                  <img src={ITEM_ICONS[name]} style={{ width: '1rem', height: '1rem', filter: 'brightness(0) invert(1)', opacity: 0.85 }} alt="" />
                )}
                {name}
              </span>
              <span className="landing-ref-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="landing-ref-section">
        <div className="landing-ref-title">Falling (D6, 2″+ fall)</div>
        <p className="landing-ref-note">
          +1 if fell 4″+. &nbsp;+3 if fell 6″+ (model becomes Immobilized). &nbsp;8+ = Death.
        </p>
        <table className="landing-ref-table">
          <tbody>
            <tr><td>1–2</td><td>0 dmg</td></tr>
            <tr><td>3–4</td><td>1 dmg</td></tr>
            <tr><td>5–6</td><td>2 dmg</td></tr>
            <tr><td>7</td><td>3 dmg</td></tr>
            <tr><td>8+</td><td>☠ Death</td></tr>
          </tbody>
        </table>
      </div>

      <div className="landing-ref-section">
        <div className="landing-ref-title">Resource Caches (D6)</div>
        <table className="landing-ref-table">
          <tbody>
            {CACHE_ITEMS.map(item => (
              <tr key={item.roll}>
                <td>{item.roll}</td>
                <td>
                  <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {ITEM_ICONS[item.name] && (
                      <img src={ITEM_ICONS[item.name]} style={{ width: '1rem', height: '1rem', filter: 'brightness(0) invert(1)', opacity: 0.85 }} alt="" />
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

export default function LandingPage({ onLoad }) {
  const { saves, companyName, companyAvatar } = useBuilderStore()

  const hasDraft = !!localStorage.getItem('doom_draft')
  const avatarSrc = hasDraft ? getAvatarSrc(companyAvatar) : null

  return (
    <div className="landing-content">
      <div className="landing-logo-block">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="1490 DOOM"
          className="landing-logo"
        />
        <span className="landing-subtitle">Company Builder</span>
      </div>

      {hasDraft && (
        <div className="landing-resume">
          <div className="landing-section-label">Resume Building</div>
          <div className="landing-resume-chip" onClick={onLoad}>
            {avatarSrc
              ? <img src={avatarSrc} className="landing-resume-avatar" alt="" />
              : <div className="landing-resume-avatar landing-resume-avatar-ph">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
                </div>
            }
            <span className="landing-resume-name">{companyName || 'Unnamed Company'}</span>
            <span className="landing-resume-arrow">Continue →</span>
          </div>
        </div>
      )}

      {saves.length > 0 && (
        <div className="landing-saves">
          <div className="landing-section-label">Your Companies</div>
          <SaveLoadPanel onSelect={onLoad} />
        </div>
      )}

      {!hasDraft && saves.length === 0 && (
        <div className="landing-empty">
          Your companies will appear here once saved.
        </div>
      )}
    </div>
  )
}
