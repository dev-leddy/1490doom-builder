import { useBuilderStore } from '../store/builderStore'
import { MARK_IMAGES } from '../data/images'
import { MARKS } from '../data/warriors'
import { getAvatarSrc } from '../data/avatars'

function MarkPlaceholder() {
  return (
    <div className="mark-placeholder-icon" aria-label="No mark selected">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.25C17.25 23.15 21 18.25 21 13V7L12 2z" opacity="0.4"/>
        <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontFamily="serif">?</text>
      </svg>
    </div>
  )
}

export default function CompanyHeader({ onSettings }) {
  const { mark, setMark, companyName, companyAvatar, companyMode, campaignGame } = useBuilderStore()
  const markData = MARKS.find(m => m.name === mark)
  const markImg = mark && MARK_IMAGES[mark]
  const avatarSrc = getAvatarSrc(companyAvatar)

  return (
    <div className="company-header">
      <div className="company-header-meta">
        {companyMode === 'campaign' && (
          <span className="company-mode-badge campaign">CAMPAIGN · Game {campaignGame}</span>
        )}
        <button className="company-settings-btn" onClick={onSettings} title="Company Settings" aria-label="Company Settings">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          <span className="company-settings-label">Settings</span>
        </button>
      </div>
      <div className="company-name-row">
        {avatarSrc
          ? <img src={avatarSrc} className="company-avatar-img" alt="Company avatar" onClick={onSettings} />
          : <button className="company-avatar-placeholder" onClick={onSettings} aria-label="Set company avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </button>
        }
        <span className="company-name-display" onClick={onSettings}>
          {companyName || <em className="company-name-placeholder">Unnamed Company</em>}
        </span>
      </div>
      <div className="mark-section">
        <div className="mark-header">Company Mark</div>
        <div className="mark-select-row">
          {markImg
            ? <img src={markImg} className="mark-preview-img" alt={mark} />
            : <MarkPlaceholder />
          }
          <div className="mark-select-col">
            <select
              className="mark-select"
              value={mark}
              onChange={e => setMark(e.target.value)}
            >
              <option value="">— No Mark Selected —</option>
              {MARKS.map(m => (
                <option key={m.name} value={m.name}>{m.label}</option>
              ))}
            </select>
            {markData && (
              <div className="mark-desc">{markData.desc}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
