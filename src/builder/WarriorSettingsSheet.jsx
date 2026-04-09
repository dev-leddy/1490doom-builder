import { useState, useEffect } from 'react'
import { useBuilderStore, getAvailableWarriorTypes } from '../store/builderStore'
import { WARRIOR_IMAGES } from '../data/images'
import BottomSheet from '../shared/BottomSheet'
import { SvgDice } from './icons'

const G_FIRST = [
  'Vorek', 'Kaelen', 'Tharion', 'Malakor', 'Zevran', 'Gorath', 'Draven', 'Korvus', 'Varkas', 'Moros',
  'Ignis', 'Sylas', 'Orion', 'Bael', 'Gideon', 'Aethelred', 'Bran', 'Cormac', 'Daeron',
  'Elias', 'Fenris', 'Gareth', 'Hadrian', 'Ilys', 'Jarek', 'Lucius', 'Marius', 'Niall',
  'Orrin', 'Pike', 'Quinn', 'Rowan', 'Soren', 'Talon', 'Ulric', 'Vane', 'Wulf', 'Xander',
  'Yorick', 'Zane', 'Thane', 'Rafe', 'Gage', 'Cade', 'Brock', 'Axel', 'Ryker',
  'Elara', 'Mirelle', 'Vanya', 'Lilith', 'Sera', 'Nyx', 'Morrigan', 'Enya', 'Kira', 'Lyra',
  'Vex', 'Rogue', 'Echo', 'Raven', 'Lash', 'Grimm', 'Ash', 'Flint', 'Steel', 'Iron',
  'Valerius', 'Silvanus', 'Korg', 'Dorn', 'Brutus', 'Magnus', 'Titus', 'Severus'
]

const G_SUR = [
  'the Pale', 'Bloodborn', 'Skullcleaver', 'the Hollow', 'Ashwalker', 'Nightbane',
  'the Scarred', 'Grimm', 'Ironhide', 'the Flayed', 'of the Void', 'the Silent',
  'the Accursed', 'Bonesaw', 'the Undying', 'Gravewalker', 'the Red', 'the Black',
  'of the Ash', 'the Broken', 'Crow', 'the Cruel', 'Shadow-touched', 'Bonebreaker',
  'the Vile', 'the Devout', 'the Forsaken', 'Twice-dead', 'the Cleaver', 'the Mad'
]

function generateGrimdarkName(taken) {
  for (let i = 0; i < 50; i++) {
    const f = G_FIRST[Math.floor(Math.random() * G_FIRST.length)]
    let name = f
    if (Math.random() > 0.4) {
      const s = G_SUR[Math.floor(Math.random() * G_SUR.length)]
      name = `${f} ${s}`
    }
    if (!taken.includes(name)) return name
  }
  return G_FIRST[Math.floor(Math.random() * G_FIRST.length)] + ' the Lost'
}

export default function WarriorSettingsSheet({ slotIndex, slot, allSlots, isOpen, onClose }) {
  const { selectWarrior, setCaptain, setWarriorProp } = useBuilderStore()
  const [tempName, setTempName] = useState(slot.customName || '')
  const [tempType, setTempType] = useState(slot.type || null)
  const [tempIsCaptain, setTempIsCaptain] = useState(slot.isCaptain || false)

  const available = getAvailableWarriorTypes(slotIndex, allSlots)

  // Sync temp state from slot each time the sheet opens
  useEffect(() => {
    if (isOpen) {
      setTempName(slot.customName || '')
      setTempType(slot.type || null)
      setTempIsCaptain(slot.isCaptain || false)
    }
  }, [isOpen])

  function applySettings() {
    setWarriorProp(slotIndex, 'customName', tempName.trim())
    if (tempType !== slot.type) selectWarrior(slotIndex, tempType || null)
    if (tempIsCaptain && !slot.isCaptain) setCaptain(slotIndex)
    onClose()
  }

  if (!isOpen) return null

  return (
    <BottomSheet
      title="WARRIOR SETTINGS"
      onClose={onClose}
      zIndex={1001}
      footer={
        <>
          <button className="co-sheet-randomize" onClick={onClose}>Cancel</button>
          <button className="co-sheet-done" onClick={applySettings}>Done</button>
        </>
      }
    >
      {/* Name */}
      <div className="ws-section">
        <div className="ws-section-label">Name</div>
        <div className="cf-name-input-wrap">
          <input
            className="co-settings-input"
            style={{ width: '100%', boxSizing: 'border-box', paddingRight: '2.2rem' }}
            value={tempName}
            placeholder="Enter warrior name…"
            maxLength={40}
            autoComplete="off"
            name="doom-warrior-name"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck="false"
            onChange={e => setTempName(e.target.value)}
          />
          <button
            className="cf-dice-inline"
            title="Random Grimdark Name"
            onClick={() => setTempName(generateGrimdarkName(allSlots.map(s => s.customName).filter(Boolean)))}
          >
            <SvgDice />
          </button>
        </div>
      </div>

      {/* Captain */}
      <div className="ws-section ws-section--row">
        <div className="ws-section-label">Captain</div>
        <button
          className={`ws-captain-toggle ${tempIsCaptain ? 'is-captain' : ''}`}
          onClick={() => { if (!slot.isCaptain) setTempIsCaptain(v => !v) }}
          title={slot.isCaptain ? 'This warrior is the Captain' : tempIsCaptain ? 'Remove as Captain' : 'Set as Captain'}
        >
          ★ {tempIsCaptain ? 'Captain' : 'Set as Captain'}
        </button>
      </div>

      {/* Class */}
      <div className="ws-section">
        <div className="ws-section-label">Class</div>
        <div className="wcp-grid">
          {[...available, ...(slot.type && !available.includes(slot.type) ? [slot.type] : [])].map(wt => (
            <button
              key={wt}
              className={`wcp-item ${tempType === wt ? 'selected' : ''}`}
              onClick={() => setTempType(wt)}
            >
              <div className="wcp-portrait">
                {WARRIOR_IMAGES[wt] && <img src={WARRIOR_IMAGES[wt]} alt={wt} />}
              </div>
              <div className="wcp-name">{wt}</div>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}
