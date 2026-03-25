import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { MARK_IMAGES } from '../data/images'
import { MARKS } from '../data/warriors'
import { getAvatarSrc } from '../data/avatars'
import MarkPicker from './MarkPicker'

export default function CompanyHeader({ onSettings }) {
  const { mark, setMark, companyName, companyAvatar, companyMode, campaignGame } = useBuilderStore()
  const [showMarkPicker, setShowMarkPicker] = useState(false)
  const markData = MARKS.find(m => m.name === mark)
  const markImg = mark && MARK_IMAGES[mark]
  const avatarSrc = getAvatarSrc(companyAvatar)

  return (
    <div className="ch-root">
      <div className="ch-frame">

        <div className="ch-panels">
          {/* LEFT / TOP: Company Identity (Avatar + Name) */}
          <button
            className="ch-identity-btn"
            onClick={onSettings}
            aria-label="Company Settings"
            title="Change Profile"
          >
            <div className="ch-avatar-ring">
              <div className="ch-avatar-inner">
                {avatarSrc
                  ? <img src={avatarSrc} className="ch-avatar-img" alt="Company avatar" />
                  : <div className="ch-avatar-placeholder" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="56" height="56">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                    </div>
                }
              </div>
            </div>
            <span className="ch-name-text">
              {companyName || 'UNNAMED WARBAND'}
            </span>
            <span className="ch-name-underline" aria-hidden="true" />
            <span className="ch-edit-hint">EDIT PROFILE</span>
          </button>

          {/* Divider */}
          <div className="ch-divider" aria-hidden="true">
            <div className="ch-divider-line" />
            <div className="ch-divider-diamond" />
            <div className="ch-divider-line ch-divider-line--rev" />
          </div>

          {/* RIGHT / BOTTOM: Company Mark */}
          <button
            className="ch-sigil-btn"
            onClick={() => setShowMarkPicker(true)}
            aria-label="Change Company Mark"
            title="Change Company Mark"
          >
            {markImg
              ? (
                <div className="ch-sigil-ring">
                  <div className="ch-sigil-inner">
                    <img src={markImg} className="ch-sigil-img" alt={mark} />
                  </div>
                </div>
              )
              : <span className="ch-sigil-no-mark">NO MARK</span>
            }
            <span className="ch-sigil-label">
              {markData ? markData.label : ''}
            </span>
            {markData && (
              <p className="ch-sigil-desc">{markData.desc}</p>
            )}
            <span className="ch-edit-hint">CHOOSE MARK</span>
          </button>
        </div>

        {/* Campaign badge */}
        {companyMode === 'campaign' && (
          <div className="ch-campaign-badge">
            <span className="ch-campaign-text">CAMPAIGN</span>
            <span className="ch-campaign-dot" aria-hidden="true" />
            <span className="ch-campaign-text">GAME {campaignGame}</span>
          </div>
        )}

      </div>

      {showMarkPicker && (
        <div
          className="modal-backdrop"
          onClick={e => e.target === e.currentTarget && setShowMarkPicker(false)}
          style={{ zIndex: 1000 }}
        >
          <div className="modal-box mark-picker-modal" style={{ maxWidth: 500, width: '94vw' }}>
            <div className="modal-title">SELECT COMPANY MARK</div>
            <MarkPicker value={mark} onChange={setMark} />
            <button
              className="modal-primary-btn"
              style={{ width: '100%', marginTop: '1.5rem' }}
              onClick={() => setShowMarkPicker(false)}
            >
              Apply Mark
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
