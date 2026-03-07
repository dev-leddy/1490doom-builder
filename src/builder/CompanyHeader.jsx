import { useBuilderStore } from '../store/builderStore'
import { MARK_IMAGES } from '../data/images'
import { MARKS } from '../data/warriors'

export default function CompanyHeader() {
  const { mark, companyName, setMark, setCompanyName } = useBuilderStore()
  const markData = MARKS.find(m => m.name === mark)

  return (
    <div className="company-header">
      <div className="company-name-row">
        <label className="field-label">Company Name</label>
        <input
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
          <div className="mark-desc-row">
            {MARK_IMAGES[mark] && (
              <img
                src={MARK_IMAGES[mark]}
                className="mark-preview-img"
                alt={mark}
              />
            )}
            <div className="mark-desc">{markData.desc}</div>
          </div>
        )}
      </div>
    </div>
  )
}
