import { useState } from 'react'
import BottomSheet from '../shared/BottomSheet'
import { useBuilderStore } from '../store/builderStore'
import { MARK_IMAGES } from '../data/images'
import { MARKS } from '../data/warriors'
import { getAvatarSrc } from '../data/avatars'
import MarkPicker from './MarkPicker'

export default function CompanyHeader({ onSettings }) {
  const { mark, setMark, companyName, companyAvatar, companyMode, campaignGame, slots, ipLimit } = useBuilderStore()
  const [showMarkPicker, setShowMarkPicker] = useState(false)
  const [tempMark, setTempMark] = useState('')
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
            {avatarSrc && (
              <div className="ch-avatar-ring">
                <div className="ch-avatar-inner">
                  <img src={avatarSrc} className="ch-avatar-img" alt="Company avatar" />
                </div>
              </div>
            )}
            <div className="ch-identity-text">
              <span className="ch-name-text">
                {companyName || 'UNNAMED WARBAND'}
              </span>
              <div className="ch-company-stats">
                <div className="ch-cstat">
                  <span className="ch-cstat-val">{slots.length}</span>
                  <span className="ch-cstat-lbl">WARRIORS</span>
                </div>
                {companyMode !== 'campaign' && (
                  <div className="ch-cstat">
                    <span className="ch-cstat-val">{ipLimit}</span>
                    <span className="ch-cstat-lbl">IP</span>
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* RIGHT: Company Mark */}
          <button
            className="ch-sigil-btn"
            onClick={() => { setTempMark(mark || ''); setShowMarkPicker(true) }}
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
              : <span className="ch-sigil-no-mark">+</span>
            }
            <div className="ch-sigil-text">
              <span className="ch-sigil-label">
                {markData ? markData.label : 'NO MARK'}
              </span>
              {markData && (
                <p className="ch-sigil-desc">{markData.desc}</p>
              )}
            </div>
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
        <BottomSheet
          title="COMPANY MARK"
          onClose={() => setShowMarkPicker(false)}
          zIndex={1001}
          bodyClass="co-sheet-body--mark"
          footer={
            <>
              <button className="co-sheet-randomize" onClick={() => setShowMarkPicker(false)}>Cancel</button>
              <button className="co-sheet-done" onClick={() => { setMark(tempMark); setShowMarkPicker(false) }}>Done</button>
            </>
          }
        >
          <div className="mark-sheet-desc">
            {(() => {
              const preview = MARKS.find(m => m.name === tempMark)
              return preview ? (
                <>
                  <div className="mark-sheet-desc-name">{preview.label}</div>
                  <div className="mark-sheet-desc-text">{preview.desc}</div>
                </>
              ) : (
                <div className="mark-sheet-desc-placeholder">Select a mark to see its battlefield ability.</div>
              )
            })()}
          </div>
          <div className="mark-grid-scroll">
            <MarkPicker value={tempMark} onChange={setTempMark} />
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
