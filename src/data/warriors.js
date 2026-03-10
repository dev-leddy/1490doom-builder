// ── WARRIOR & GAME DATA ──────────────────────────────────────────────────────

export const WARRIORS = {
  Assassin: {
    stats: { MOV: 5, ATK: 1, VIT: 5, SKL: '5+', COM: '4+', DEF: '5+' },
    abilities: [
      { name: 'NIGHT STALKER', desc: 'The Assassin cannot be attacked until after they ATTACK, PUSH, or Round 4 begins. Until NIGHT STALKER has been expended, enemy models may move over the Assassin as long as they do not land on top of them, and may SCALE climbing items the Assassin occupies.' },
      { name: 'KILLSHOT', desc: 'Once per game after a successful COMBAT Check, the Assassin may perform a KILL SHOT that does 4 damage. The Assassin may only use KILL SHOT on a model that has not activated this round and is within 3 inches. This attack ignores DEFENSE rolls.' },
      { name: 'CAMOUFLAGED CLIMBER', desc: 'An Assassin only requires a 3+ on SKILL Checks while using the CLIMB action.' },
    ],
    restrictions: 'Cannot equip Heavy Weapons or Polearms.',
    allowedWeapons: ['Light Weapon', 'Bow', 'Crossbow', 'Shield'],
    cantHave: ['Heavy Weapon', 'Polearm'],
  },
  Beekeeper: {
    stats: { MOV: 6, ATK: 1, VIT: 4, SKL: '4+', COM: '4+', DEF: '5+' },
    abilities: [
      { name: 'BECKON THE SWARM', desc: 'Once per activation, the Beekeeper may spend an action to BECKON THE SWARM onto an enemy model within 3 inches and within light of sight. That model must roll a DEFENSE Check. If they pass, nothing happens. If they fail, that model becomes Hindered.' },
      { name: 'STINGING CLOUD', desc: 'Whenever an enemy model within 2 inches of the Beekeeper causes the Beekeeper to lose VITALITY, that enemy model must pass a SKILL Check or lose 1 VITALITY.' },
      { name: 'BUZZING MANTLE', desc: 'Enemy models within 1 inch of the Beekeeper suffer -1 to all COMBAT Checks.' },
    ],
    restrictions: 'Only comes equipped with a two-handed Polearm. No substitution.',
    allowedWeapons: ['Polearm (two-handed)'],
    cantHave: ['Light Weapon', 'Heavy Weapon', 'Bow', 'Crossbow', 'Shield'],
    fixedWeapon: 'Polearm (two-handed)',
  },
  Blacksmith: {
    stats: { MOV: 4, ATK: 1, VIT: 5, SKL: '3+', COM: '4+', DEF: '5+' },
    abilities: [
      { name: 'PUNCTURING PRECISION', desc: 'Once per game, after a successful COMBAT Check, the Blacksmith may use PUNCTURING PRECISION. When they do, the enemy model becomes Breached.' },
      { name: 'FORGE MASTER', desc: 'Once per game, the Blacksmith can spend one action to remove the Breached or Sundered status from a friendly model in base contact (including itself).' },
      { name: 'SUNDERING BLOW', desc: 'Once per game, after a successful COMBAT Check, the Blacksmith may forgo dealing damage and instead that enemy\'s weapon becomes Sundered.' },
    ],
    restrictions: 'Cannot equip Ranged Weapons.',
    allowedWeapons: ['Light Weapon', 'Heavy Weapon', 'Polearm (two-handed)', 'Polearm (one-handed)', 'Shield'],
    cantHave: ['Bow', 'Crossbow'],
  },
  Brute: {
    stats: { MOV: 3, ATK: 2, VIT: 7, SKL: '6+', COM: '4+', DEF: '3+' },
    abilities: [
      { name: 'RAGE', desc: 'Once per game a Brute may move up to twice their Movement value and ATTACK with an additional die. This ability requires all of the Brute\'s actions this turn.' },
      { name: 'SMASH', desc: 'Once per game a Brute may SMASH a door, a ladder, an improvised bridge, or a resource cache that they are in base contact with. Remove that item from play. Any models scaling or standing on that item fall.' },
      { name: 'THROW', desc: 'Once per game after any successful COMBAT Check, instead of resolving any of their ATTACKS that turn, a Brute may instead pick up and THROW an opposing model they are in base contact with 2 inches in any direction (ignoring Barriers). The opponent becomes Stunned after thrown. Roll for falling damage as normal. THROW may not be used in the same turn as RAGE.' },
    ],
    restrictions: 'Can ONLY equip Heavy Weapons and Polearms.',
    allowedWeapons: ['Heavy Weapon', 'Polearm (two-handed)'],
    cantHave: ['Light Weapon', 'Bow', 'Crossbow', 'Shield'],
  },
  'Doom Hunter': {
    stats: { MOV: 5, ATK: 1, VIT: 4, SKL: '4+', COM: '4+', DEF: '6+' },
    abilities: [
      { name: "EAGLE'S EYE", desc: 'The Doom Hunter adds +1 to their Combat stat when targeting models further than 4 inches away.' },
      { name: "MARKSMAN'S FOCUS", desc: 'Once per activation, a Doom Hunter may use MARKSMAN\'S FOCUS to ATTACK with an additional die. This ability requires all of the Doom Hunter\'s actions this turn.' },
      { name: 'PINNING SHOT', desc: 'Once per game, after a successful COMBAT Check, the Doom Hunter may forgo dealing damage and instead the enemy model becomes Immobilized until the end of their next activation.' },
    ],
    restrictions: 'Can ONLY equip Ranged Weapons.',
    allowedWeapons: ['Bow', 'Crossbow'],
    cantHave: ['Light Weapon', 'Heavy Weapon', 'Polearm', 'Shield'],
  },
  Executioner: {
    stats: { MOV: 4, ATK: 1, VIT: 6, SKL: '5+', COM: '4+', DEF: '5+' },
    abilities: [
      { name: "EXECUTIONER'S MARK", desc: 'Whenever an Executioner declares an ATTACK action targeting an opponent with 2 or less VITALITY, they have +1 COMBAT. In addition, if a COMBAT check succeeds in this manner, the enemy model loses 1 VITALITY bypassing DEFENSE before resolving the rest of the ATTACK.' },
      { name: 'FINALITY', desc: 'Any time an Executioner resolves an ATTACK that reduces a model to 0 VITALITY, the Executioner immediately moves up to 2 inches and restores 1 VITALITY.' },
      { name: 'AIM FOR THE NECK', desc: 'Any time the Executioner attacks an enemy at full VITALITY, they land a Piercing Blow on both 5s and 6s.' },
    ],
    restrictions: 'May only wield Heavy Weapons and Polearms.',
    allowedWeapons: ['Heavy Weapon', 'Polearm (two-handed)'],
    cantHave: ['Light Weapon', 'Bow', 'Crossbow', 'Shield'],
  },
  Fighter: {
    stats: { MOV: 4, ATK: 1, VIT: 6, SKL: '5+', COM: '4+', DEF: '4+' },
    abilities: [
      { name: 'FURY', desc: 'If the Fighter is in melee range with multiple enemy models, they may spend one action to make a full ATTACK on each of them. This counts as one action regardless of how many enemies are struck. A fighter with multiple attacks from dual wielded light weapons get their bonus attack on each enemy.' },
      { name: 'DEVASTATING BLOW', desc: 'Once per game, after a successful COMBAT Check, you may use DEVASTATING BLOW. This attack does 2 additional damage and ignores DEFENSE rolls.' },
      { name: "OPPORTUNIST'S CLEAVE", desc: 'The Fighter gains a bonus ATTACK die when targeting an opponent that has not yet activated. This ability does not stack with other bonus ATTACK die (such as the bonus gained from Concentrated Creeping Death Serum).' },
    ],
    restrictions: 'Cannot equip Ranged Weapons.',
    allowedWeapons: ['Light Weapon', 'Heavy Weapon', 'Polearm (two-handed)', 'Polearm (one-handed)', 'Shield'],
    cantHave: ['Bow', 'Crossbow'],
  },
  'Hedge Knight': {
    stats: { MOV: 5, ATK: 1, VIT: 5, SKL: '4+', COM: '4+', DEF: '5+' },
    abilities: [
      { name: 'GAUNT GALLOP', desc: 'Anytime the Hedge Knight has performed the DASH Action that brings them in CONTACT with an opposing model, that model makes a SKILL Check. If they fail, they lose 1 VITALITY. If they succeed, the Hedge Knight becomes Hindered.' },
      { name: 'SQUIRE OF MUD AND ROOT', desc: 'The Hedge Knight cannot be Immobilized. In addition, anytime the Hedge Knight successfully inspects a resource cache, they only find Food.' },
      { name: 'THE SHATTERED SHIELD', desc: 'Once per game, the Hedge Knight can block all damage from one standard ATTACK. This ability must be declared after a successful COMBAT check, but before damage is dealt. This ability can block a Piercing Blow, but cannot block any other special abilities. After using this ability, the Hedge Knight\'s Shield is destroyed, and wields their Polearm with two hands for the rest of the game.' },
    ],
    restrictions: 'Always equipped with a Polearm and Shield at no cost. Still has -1 COMBAT while using both a Shield and Polearm.',
    allowedWeapons: ['Polearm (one-handed)', 'Shield'],
    cantHave: ['Light Weapon', 'Heavy Weapon', 'Bow', 'Crossbow'],
    fixedWeapon: 'Polearm (one-handed)',
    fixedShield: true,
  },
  Knight: {
    stats: { MOV: 4, ATK: 2, VIT: 5, SKL: '6+', COM: '3+', DEF: '4+' },
    abilities: [
      { name: 'SHIELD OF THE REALM', desc: 'Once per game, the Knight can block all damage from one standard ATTACK directed at either them or an ally within 3 inches. This ability must be declared after a successful COMBAT check, but before damage is dealt. It cannot block damage from Special Abilities.' },
      { name: 'INSPIRING PRESENCE', desc: 'Any friendly models within 4 inches of the Knight gain +1 to COMBAT checks while in line of sight of the Knight.' },
      { name: "DEFENDER'S PARRY", desc: 'Once per game, when an enemy model fails all COMBAT checks against the Knight during an ATTACK, this Knight may counter them. The enemy model takes 2 damage and becomes Hindered. This ability bypasses DEFENSE.' },
    ],
    restrictions: 'Always equipped with a Light Weapon and Shield at no additional cost.',
    allowedWeapons: ['Light Weapon', 'Shield'],
    cantHave: ['Heavy Weapon', 'Polearm', 'Bow', 'Crossbow'],
    fixedWeapon: 'Light Weapon',
    fixedShield: true,
  },
  Saboteur: {
    stats: { MOV: 5, ATK: 1, VIT: 4, SKL: '4+', COM: '5+', DEF: '5+' },
    abilities: [
      { name: 'BOOBY TRAP', desc: 'The first time an enemy model rolls a 1 or 2 while trying to open a Resource Cache, the Cache explodes dealing 2 damage to that model (this ability is active even after the Saboteur has perished).' },
      { name: 'SET TRAP', desc: 'Twice per game, a Saboteur can set a TRAP within 2 inches of them and at least 2 inches from any other model. The TRAP has a 2-inch diameter. Any model that uses MOVE, DASH, or ends an action within that area (even partially) loses 1 VITALITY without a DEFENSE Check, becomes Hindered, and immediately ends the action. Remove the TRAP from play. The Saboteur is immune to their own traps and may use HANDOFF to retrieve them.' },
      { name: 'IMPROVED CANISTER', desc: 'Once per game, the Saboteur\'s IMPROVED CANISTER can be thrown a number of inches equal to their current VITALITY +2. When thrown, the gas canister releases a toxic cloud that covers a 2-inch diameter on one level. All models (enemy or friendly) within the cloud must roll a SKILL Check. If failed, they take 2 damage and are immobilized until the end of their next activation.' },
    ],
    restrictions: 'Cannot equip Heavy Weapons or Polearms.',
    allowedWeapons: ['Light Weapon', 'Bow', 'Crossbow', 'Shield'],
    cantHave: ['Heavy Weapon', 'Polearm'],
  },
  Scavenger: {
    stats: { MOV: 5, ATK: 1, VIT: 6, SKL: '3+', COM: '5+', DEF: '4+' },
    abilities: [
      { name: 'DETERMINATION', desc: 'Once per round, when a Scavenger fails a SKILL Check, they may choose to re-roll that check. They must take the next result.' },
      { name: 'DIRTY DAGGER', desc: 'Once per game, the Scavenger may spend an action to use DIRTY DAGGER on an opponent in contact. They take 1 damage and are Stunned. This ability ignores DEFENSE Check.' },
    ],
    restrictions: 'Cannot equip Heavy Weapons or Polearms.',
    allowedWeapons: ['Light Weapon', 'Bow', 'Crossbow', 'Shield'],
    cantHave: ['Heavy Weapon', 'Polearm'],
  },
  Scout: {
    stats: { MOV: 6, ATK: 1, VIT: 4, SKL: '4+', COM: '5+', DEF: '4+' },
    abilities: [
      { name: 'EARLY BIRD', desc: 'The Scout may deploy up to 4 inches from the edge of the board on Ground Level. They cannot deploy on a STRUCTURE.' },
      { name: 'I CAN SMELL IT', desc: 'After deployment of all Doom Companies, the Scout may deploy an additional resource cache anywhere within 6 inches from the center of the board on a STRUCTURE. The Reliquary cache consumable may not restore this ability.' },
      { name: 'TAKE THE INITIATIVE', desc: 'Once per game a player with a living Scout may claim initiative after losing the initiative roll. In addition, if there is ever a tie, initiative always goes to the player with a living Scout. If each player has a Scout, resolve normally.' },
    ],
    restrictions: 'Cannot equip Heavy Weapons or Polearms.',
    allowedWeapons: ['Light Weapon', 'Bow', 'Crossbow', 'Shield'],
    cantHave: ['Heavy Weapon', 'Polearm'],
  },
  Reaver: {
    stats: { MOV: 5, ATK: 2, VIT: 6, SKL: '6+', COM: '4+', DEF: '5+' },
    abilities: [
      { name: 'BERSERKER', desc: 'If the Reaver begins their activation at 2 or less VITALITY, they get +1 to MOVEMENT and to ATTACKS.' },
      { name: 'RELENTLESS', desc: 'If the Reaver uses both MOVE and DASH during their activation and ends in contact with an enemy, they may ATTACK, but with only a single die.' },
      { name: 'BEARING DOWN', desc: 'Once per game, after a successful COMBAT Check, the Reaver may forgo dealing damage with that Attack. Instead, the target becomes Immobilized.' },
    ],
    restrictions: 'Comes with two Light Weapons at no additional cost. (This adds an additional ATTACK, which is already included in their profile.)',
    allowedWeapons: ['Light Weapon', 'Shield'],
    cantHave: ['Heavy Weapon', 'Polearm', 'Bow', 'Crossbow'],
    fixedWeapon: 'Light Weapon',
    fixedDualWield: true,
  },
  'Warrior Priest': {
    stats: { MOV: 4, ATK: 1, VIT: 5, SKL: '4+', COM: '5+', DEF: '5+' },
    abilities: [
      { name: 'HEAL THE FLOCK', desc: 'A Warrior Priest may spend one action per turn to heal a friendly model in base to base contact for 2 VITALITY, or heal itself for 1 VITALITY.' },
      { name: 'LAST RITES', desc: 'Once per game, a Warrior Priest may perform LAST RITES within 6 inches of where a friendly model Perished after the Warrior Priest\'s last activation. That Perished model is revived with 1 VITALITY. Place them exactly where they Perished. This does not cost an action. (Until your Warrior Priest has used LAST RITES, mark where friendly models have Perished until the Warrior Priest finishes their next activation.)' },
      { name: 'FEAR OF GOD', desc: 'Once per game, a Warrior Priest may intimidate an enemy within 1 inch instilling the FEAR OF GOD. Push that model 2 inches directly away from the Warrior Priest ignoring Barriers. If that model comes in contact with an edge they fall. They may not make a SKILL Check to prevent themselves from falling. This ability cannot be prevented by a shield.' },
    ],
    restrictions: 'Cannot equip Heavy Weapons or Polearms.',
    allowedWeapons: ['Light Weapon', 'Bow', 'Crossbow', 'Shield'],
    cantHave: ['Heavy Weapon', 'Polearm'],
  },
}

export const MARKS_MAP = {

  'Graveborn': 'Once per game, when one of your warriors perishes, they may immediately take one final action before being removed.',
  'Tower Born': 'Any time a warrior in your Doom Company rolls on the Falling Damage table, they roll two dice and take the lowest result.',
  'Ashbound': 'While at 2 or less Vitality, your warriors gain +1 Skill and +1 Defense.',
  'Doomed Choir': 'Once per game, at the start of any round, choose one enemy model within 2" of two or more of your warriors. That model suffers -1 Combat and -1 Skill until the end of the round.',
  'Fog Walkers': 'While on Ground Level, your warriors gain +1 Defense on the first Defense Check they make each round.',
  'Relic Bitten': 'Whenever one of your warriors successfully inspects a resource cache, roll two dice and choose which result to use on the Resource Caches chart.',
  'Silent Pact': 'Once per game, one of your warriors may use 3 actions, but their last action must be Standby. They may use this ability even if they used Attack this turn.',
  'Hearth': 'Before deployment, place a Hearth Token on a structure that is not the highest on the board. While within 2" of the token and on the same level, your warriors gain +1 Combat.',

}

// Display labels for marks where the faction name differs from the ability name
export const MARK_LABELS = {
  'Ashbound': 'Ashbound (Wretched Survivors)',
}

export const MARKS = Object.entries(MARKS_MAP).map(([name, desc]) => ({
  name,
  label: MARK_LABELS[name] || name,
  desc,
}))

export const STAT_IMPROVEMENT = {
  MOV: 'Movement +1',
  VIT: 'Vitality +1',
  SKL: 'Skill +1',
  DEF: 'Defense +1',
  COM: 'Combat +1',
}

export const IP_OPTIONS = [
  { id: 'stat', label: 'Improve a stat (not Attacks)' },
  { id: 'weapon2', label: 'Equip a second Weapon or Shield' },
  { id: 'climbing', label: 'Equip a Climbing Item' },
  { id: 'consumable', label: 'Equip a Consumable Item' },
]

export const NO_RESTORE_OPG = new Set(['THE SHATTERED SHIELD']);
