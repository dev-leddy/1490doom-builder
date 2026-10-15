import BottomSheet from '../shared/BottomSheet'
import { spendableNow } from './campaignUi'

// ── Before Play in a campaign: warriors still have IP they could spend ────────
// Lists who ("Brother Aldric: 2 IP"). Spend IP goes back to the first of them;
// Play anyway carries on to play mode. Banked IP with nothing left to buy doesn't count.

const nameOf = s => (s.customName && s.customName.trim()) || s.type

// [{ index, name, ip }] for every warrior who could spend IP right now
export function unspentIP(slots = []) {
  return slots.map((s, index) => ({ index, name: nameOf(s), ip: spendableNow(s) })).filter(w => w.ip > 0)
}

// Scroll to a warrior's equipment (the "2 IP to spend" pill) and focus their first upgrade button
export function goToWarriorIP(index) {
  const slot = document.querySelector(`.warrior-slot[data-slot="${index}"]`)
  if (!slot) return
  const section = slot.querySelector('.lr-section') || slot
  section.scrollIntoView({ behavior: 'smooth', block: 'center' })
  slot.querySelector('.eq-add')?.focus({ preventScroll: true })
}

export default function UnspentIPSheet({ warriors, onSpend, onPlay, onClose }) {
  return (
    <BottomSheet title="UNSPENT IP" onClose={onClose} className="unspent-ip-sheet"
      footer={
        <>
          <button type="button" className="co-sheet-randomize unspent-ip-play" onClick={onPlay}>Play anyway</button>
          <button type="button" className="co-sheet-done unspent-ip-spend" onClick={onSpend}>Spend IP</button>
        </>
      }>
      <p className="unspent-ip-lede">Your warriors can spend IP before the game:</p>
      <ul className="unspent-ip-list">
        {warriors.map(w => (
          <li key={w.index}><span className="unspent-ip-name">{w.name}</span><span className="unspent-ip-n">{w.ip} IP</span></li>
        ))}
      </ul>
    </BottomSheet>
  )
}
