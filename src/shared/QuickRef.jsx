import { ACTION_DEFS, STATUS_DEFS, CACHE_ITEMS, FALL_BANDS, fallDamage } from '../data/items'
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
        <div className="qr-section-title">Falling</div>
        <p className="qr-fall-lead">
          Roll a D6 to determine vitality loss from falling.<br />If falling more than 6″ the model is also IMMOBILIZED.
        </p>
        {/* The D6 against the distance: the rulebook's bonuses are built into the columns */}
        <table className="qr-table qr-fall-grid">
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>D6</th>
              <th scope="colgroup" colSpan={FALL_BANDS.length} className="qr-fall-axis">Distance fallen</th>
            </tr>
            <tr>{FALL_BANDS.map(b => <th key={b.label} scope="col">{b.label}</th>)}</tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map(roll => (
              <tr key={roll}>
                <th scope="row">{roll}</th>
                {FALL_BANDS.map(b => {
                  const r = fallDamage(roll + b.bonus)
                  return r === 'dead'
                    ? <td key={b.label} className="qr-fall-dead">Dead</td>
                    : <td key={b.label} className={r === 0 ? 'qr-fall-none' : undefined}>{r}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {/* Optional rule: falling or jumping onto a model below */}
        <p className="qr-fall-note qr-fall-landing">
          <strong>Landing on a model</strong> (optional rule): a model that falls or jumps onto a lower model makes it pass a SKILL Check or lose 1 VIT and be Immobilized until the end of its next activation. Either way, the lower model's owner moves it just enough to make room.
        </p>
      </div>

      {/* Optional rule */}
      <div className="qr-section">
        <div className="qr-section-title">Doom Mound: Treacherous Ground</div>
        <p className="qr-fall-note">
          Optional rule. A Doom Mound is unstable terrain, shifting bodies underfoot, desperate hands still grasping at the living.
        </p>
        <p className="qr-fall-note">
          Anytime a model ends an action on or crosses a Doom Mound, they must pass a SKILL Check. If they fail, they become <strong>HINDERED</strong>.
        </p>
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
                  {': '}{item.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
