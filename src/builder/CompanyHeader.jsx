import { useBuilderStore } from '../store/builderStore'
import { MARK_IMAGES } from '../data/images'
import { MARKS } from '../data/warriors'

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

export default function CompanyHeader() {
  const { mark, setMark, companyName, setCompanyName } = useBuilderStore()
  const markData = MARKS.find(m => m.name === mark)
  const markImg = mark && MARK_IMAGES[mark]

  return (
    <div className="company-header">
      <div className="company-name-row">
        <label htmlFor="builder-company-name">Company Name</label>
        <input
          id="builder-company-name"
          className="name-input"
          type="text"
          placeholder="Name your Doom Company…"
          maxLength={40}
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
        />
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
