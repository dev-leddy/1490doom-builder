// ── PLAY-MODE ITEM SHEETS ────────────────────────────────────────────────────
// The rules of each item split into short labelled rows for the play-mode detail sheet.
// Damage, range, climbing height and skill check come from weapons.js; only the rest lives here.
// tag: type line · keys: extra key-number cells · rules: { label, text, note?, limit? }
// short: tile meta for cache items · action: footer button label (default "Expend")

export const ITEM_SHEETS = {
  'Light Weapon': {
    tag: 'Melee weapon',
    keys: [{ label: 'HANDS', value: '1' }],
    offhand: {
      tag: 'Melee weapon · Off-hand',
      rules: [{ label: 'DUAL WIELD', text: 'A second Light Weapon in the off-hand gives +1 ATTACK.', note: 'Counted in ATK' }],
    },
  },
  'Heavy Weapon': { tag: 'Melee weapon', keys: [{ label: 'HANDS', value: '2' }] },
  'Polearm (two-handed)': { tag: 'Melee weapon · Reach', keys: [{ label: 'HANDS', value: '2' }] },
  'Polearm (one-handed)': {
    tag: 'Melee weapon · Reach',
    keys: [{ label: 'HANDS', value: '1' }],
    rules: [{ label: 'PENALTY', text: '-1 to all COMBAT Checks.', note: 'Counted in COM', limit: true }],
  },
  'Bow': { tag: 'Ranged weapon', keys: [{ label: 'HANDS', value: '2' }] },
  'Crossbow': { tag: 'Ranged weapon', keys: [{ label: 'HANDS', value: '2' }] },
  'Shield': { tag: 'Off-hand · Defense' },

  'Ladder': {
    tag: 'Climbing gear',
    rules: [
      { label: 'SET', text: 'Against any structure up to 4" tall, or laid flat as a bridge.' },
      { label: 'ONCE SET', text: 'Stays fixed unless Smashed.' },
      { label: 'RETRIEVE', text: 'From the top or the bottom.' },
    ],
  },
  'Grappling Hook': {
    tag: 'Climbing gear',
    rules: [
      { label: 'SET', text: 'Pass a SKILL Check. Hooks onto any structure up to 6" tall.' },
      { label: 'RETRIEVE', text: 'Only from the top.', limit: true },
    ],
  },

  'Fog of War Flask': {
    tag: 'Consumable',
    keys: [{ label: 'CLOUD', value: '3"' }, { label: 'TALL', value: '2"' }, { label: 'TO HIT', value: '-1' }],
    rules: [
      { label: 'WHEN EXPENDED', text: 'A smoke cloud centered on the model.' },
      { label: 'EFFECT', text: 'Attacks targeting models in or through the smoke suffer -1 to hit.' },
      { label: 'LASTS', text: "Until the model's next activation." },
    ],
  },
  'Canister of Creeping Death': {
    tag: 'Consumable · Thrown',
    keys: [{ label: 'COST', value: '1 AP' }, { label: 'RANGE', value: 'VIT+1"' }, { label: 'CLOUD', value: '2"' }],
    rules: [
      { label: 'TARGET', text: 'Any target in line of sight within Vitality + 1 inches.' },
      { label: 'CLOUD', text: '2" across, at the target\'s level.' },
      { label: 'IN THE CLOUD', text: 'Each model rolls a SKILL Check. Fail: 1 damage and IMMOBILIZED until the end of its next activation.' },
    ],
  },
  'Concentrated Creeping Death Serum': {
    tag: 'Consumable',
    keys: [{ label: 'ATTACKS', value: '+1' }, { label: 'PRICE', value: '-1 VIT', dmg: true }],
    rules: [
      { label: 'WHEN EXPENDED', text: 'Gain 1 extra Attack action this activation.' },
      { label: 'THEN', text: 'At the end of that activation, lose 1 VITALITY.', limit: true },
    ],
  },

  'Herbs & Tonic': {
    tag: 'Cache item',
    short: 'HEAL 3 VIT',
    keys: [{ label: 'VIT', value: '+3' }],
    rules: [
      { label: 'WHEN EXPENDED', text: 'Gain +3 VITALITY.' },
      { label: 'LIMIT', text: 'Never above starting VITALITY.', limit: true },
    ],
  },
  'Food': {
    tag: 'Cache item',
    short: '+1 ACTION',
    keys: [{ label: 'ACTIONS', value: '+1' }],
    rules: [
      { label: 'WHEN EXPENDED', text: 'Gain 1 extra action this activation.' },
      { label: 'LIMIT', text: 'Cannot be used to repeat an action.', limit: true },
    ],
  },
  'Scholarly Scroll': {
    tag: 'Cache item',
    short: 'PASS SKILL',
    keys: [{ label: 'SKILL CHECK', value: 'Pass' }],
    rules: [
      { label: 'WHEN', text: 'Right after the model fails a SKILL Check.' },
      { label: 'EFFECT', text: 'EXPEND it to pass that check instead.' },
    ],
  },
  'Map': {
    tag: 'Cache item',
    short: 'MOVE ALL',
    keys: [
      { label: '3 ALIVE', value: '2"', alive: 3 },
      { label: '2 ALIVE', value: '3"', alive: 2 },
      { label: '1 ALIVE', value: '4"', alive: 1 },
    ],
    rules: [
      { label: 'WHEN EXPENDED', text: 'Every model in your Doom Company moves at once. How far depends on how many are alive.' },
    ],
  },
  'Cloak': {
    tag: 'Cache item',
    short: 'UNTARGETABLE',
    rules: [
      { label: 'WHEN EXPENDED', text: "Until the model's next activation:" },
      { label: 'PROTECTION', text: 'Cannot be targeted by ATTACK or PUSH actions.' },
      { label: 'LIMIT', text: 'Cannot make ATTACK or PUSH actions.', limit: true },
    ],
  },
  'Reliquary': {
    tag: 'Cache item',
    short: 'RESTORE OPG',
    action: 'Choose ability',
    keys: [{ label: 'RESTORES', value: '1 OPG' }],
    rules: [
      { label: 'WHEN EXPENDED', text: 'Regain one use of a Once Per Game ability.' },
      { label: 'LIMIT', text: 'Cannot restore Twice Per Game abilities.', limit: true },
    ],
  },
}
