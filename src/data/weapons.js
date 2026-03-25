// ── WEAPON & EQUIPMENT DATA ──────────────────────────────────────────────────

export const WEAPONS = {
  'Light Weapon': { range: 'Base', damage: 1, note: 'One-handed. Can be paired with a second light weapon or shield.', offhandNote: 'One-handed. Adds +1 Attack.', special: null },
  'Heavy Weapon': { range: 'Base', damage: 2, note: 'Two-handed. Cannot equip a second weapon.', special: null },
  'Polearm (two-handed)': { range: '2"', damage: 1, note: 'Two-handed. Cannot equip a second weapon.', special: null },
  'Polearm (one-handed)': { range: '2"', damage: 1, note: 'Must be paired with a Shield.\n-1 to all Combat Checks.', special: null },
  'Shield': { range: '—', damage: 0, note: 'Gain +1 DEFENSE against the first attack each round. Grants the Guarded Ability.', abilityName: 'GUARDED', abilityDesc: 'Once per round, the model may use their shield to prevent a PUSH action that targets them.' },
  'Crossbow': { range: '1–5"', damage: 2, note: 'Two-handed ranged. Cannot equip a second weapon.', special: 'After firing, must use the Reload action before firing again.', abilityName: 'RELOAD', abilityDesc: 'After firing, must use the Reload action before firing again.' },
  'Bow': { range: '2–5"', damage: 1, note: 'Two-handed ranged. Cannot equip a second weapon.', special: 'Spend an action to double your maximum range for your next ranged Attack this round.', abilityName: 'OVERDRAW', abilityDesc: 'Spend an action to double your maximum range for your next ranged Attack this round.' },
}

export const CLIMBING_ITEMS = {
  'None': null,
  'Ladder': { height: '4"', skillCheck: 'NO' },
  'Grappling Hook': { height: '6"', skillCheck: 'YES' },
}

export const CLIMBING_DESCS = {
  'None': null,
  'Ladder': 'Set against any structure up to 4 inches tall or laid flat as a bridge.\nOnce placed, it remains fixed unless Smashed.',
  'Grappling Hook': 'Skill Check to Set.\nSet against any structure up to 6" tall.\nMust be at the top to Retrieve.',
}

export const CONSUMABLES = {
  'None': null,
  'Canister of Creeping Death': 'Requires 1 action point.\nThrow at any target in LOS within Vitality + 1 inches.\nCreate a 2" diameter cloud at that target\'s level.\nModels in cloud roll Skill check, if failed they take 1 damage and are IMMOBILIZED until end of next activation.',
  'Concentrated Creeping Death Serum': 'Gain 1 additional Attack action this activation. At the end of that activation the model loses 1 Vitality.',
  'Fog of War Flask': 'Creates a 3" diameter, 2" tall smoke cloud centered on the model until their next activation. All Attack actions targeting models within or through the smoke suffer -1 to hit.',
}

// Ordered list of weapon names for encoding/selection
export const WEAPON_NAMES = Object.keys(WEAPONS)

// CONSUMABLE_NAMES for selection
export const CONSUMABLE_NAMES = Object.keys(CONSUMABLES).filter(k => k !== 'None')
