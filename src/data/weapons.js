// ── WEAPON & EQUIPMENT DATA ──────────────────────────────────────────────────

export const WEAPONS = {
  'Light Weapon': { range: 'Contact', damage: 1, note: 'One-handed. Can be paired with a second light weapon or shield via IP spend.', special: null },
  'Heavy Weapon': { range: 'Contact', damage: 2, note: 'Two-handed. Cannot equip a second weapon.', special: null },
  'Polearm (two-handed)': { range: '2"', damage: 1, note: 'Two-handed. Cannot equip a second weapon.', special: null },
  'Polearm (one-handed)': { range: '2"', damage: 1, note: 'One-handed — must be paired with a Shield. Requires the Shield upgrade.', special: 'STAFF DEBUFF: -1 to all Combat Checks while equipped.' },
  'Shield': { range: '—', damage: 0, note: 'One-handed defensive item.', special: 'GUARDED: Once per round, prevent one Push targeting you. Gain +1 Defense against the first Attack made against you each round.' },
  'Crossbow': { range: '1–5"', damage: 2, note: 'Two-handed ranged. Cannot equip a second weapon.', special: 'RELOAD: After firing, must use the Reload action before firing again.' },
  'Bow': { range: '2–5"', damage: 1, note: 'Two-handed ranged. Cannot equip a second weapon.', special: 'OVERDRAW: Spend an action to double your maximum range for your next ranged Attack this round.' },
}

export const CLIMBING_ITEMS = {
  'None': null,
  'Ladder': { height: '4"', skillCheck: 'No' },
  'Grappling Hook': { height: '6"', skillCheck: 'Yes (Skill Check to Set)' },
}

export const CLIMBING_DESCS = {
  'None': null,
  'Ladder': 'Set against any structure up to 4" tall (or lay flat as a bridge). No Skill Check required to set. Cannot be retrieved while occupied. Fixed to the field once set unless Smashed.',
  'Grappling Hook': 'Set against any structure up to 6" tall. Requires a Skill Check to Set. Must be at the top to Retrieve. More flexible than a ladder for tall structures.',
}

export const CONSUMABLES = {
  'None': null,
  'Canister of Creeping Death': 'Spend an action to throw at any target in line of sight within (Vitality + 1) inches. Creates a 2" diameter cloud on one level. All models in the cloud roll a Skill Check — fail = 1 damage and Immobilized until end of next activation.',
  'Concentrated Creeping Death Serum': 'Gain 1 additional Attack action this activation. At the end of that activation the model loses 1 Vitality.',
  'Fog of War Flask': 'Creates a 3" diameter, 2" tall smoke cloud centered on the model until their next activation. All Attack actions targeting models within or through the smoke suffer -1 to hit.',
}

// Ordered list of weapon names for encoding/selection
export const WEAPON_NAMES = Object.keys(WEAPONS)

// CONSUMABLE_NAMES for selection
export const CONSUMABLE_NAMES = Object.keys(CONSUMABLES).filter(k => k !== 'None')
