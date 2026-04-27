// Server-side company decoder for Cloudflare Workers.
// Data arrays are inlined from src/data/ since Workers can't import Vite/React source.

const ALL_WARRIORS = [
  'Assassin', 'Beekeeper', 'Blacksmith', 'Brute', 'Doom Hunter',
  'Executioner', 'Fighter', 'Hedge Knight', 'Knight', 'Saboteur',
  'Scavenger', 'Scout', 'Reaver', 'Warrior Priest',
]

const ALL_MARKS = [
  'Ashbound', 'Doomed Choir', 'Fog Walkers', 'Graveborn',
  'Relic Bitten', 'Silent Pact', 'Tower Born', 'Wretched Survivors',
]

const WEAPON_NAMES = [
  'Light Weapon', 'Heavy Weapon', 'Polearm (two-handed)',
  'Polearm (one-handed)', 'Shield', 'Crossbow', 'Bow',
]

const CONSUMABLE_NAMES = [
  'Canister of Creeping Death',
  'Concentrated Creeping Death Serum',
  'Fog of War Flask',
]

const CLIMBING_KEYS = ['None', 'Ladder', 'Grappling Hook']

const ALL_IP_IDS = ['stat', 'weapon2', 'climbing', 'consumable']

const ALL_STAT_KEYS = ['MOV', 'VIT', 'SKL', 'DEF', 'COM']

const CAMP_IP_IDS = [
  'weapon2', 'climbing', 'consumable',
  ...ALL_STAT_KEYS.map((_, i) => `stat_${i}`),
]

function decodeCompany(code) {
  try {
    let isCampaign = false
    let campaignGame = 0
    let rawCode = code

    if (code.startsWith('v2c_')) {
      const under = code.indexOf('_', 4)
      campaignGame = parseInt(code.slice(4, under)) || 0
      rawCode = code.slice(under + 1)
      isCampaign = true
    }

    const ipIds = isCampaign ? CAMP_IP_IDS : ALL_IP_IDS

    let raw = rawCode
    try {
      const padded = rawCode + '=='.slice(0, (4 - rawCode.length % 4) % 4)
      // atob is available in CF Workers
      const decoded = atob(padded)
      if (decoded.includes('|')) raw = decoded
    } catch {}

    const parts = raw.split('|')
    const mark = ALL_MARKS[parseInt(parts[0], 36)] || ALL_MARKS[0]
    const companyName = decodeURIComponent(parts[1] || '')
    const ipLimit = parseInt(parts[2], 36) || (isCampaign ? 0 : 3)

    const warriors = []
    for (let i = 0; i < 3; i++) {
      const slotRaw = parts[3 + i]
      if (!slotRaw || slotRaw === '_') continue

      const [wIdx, w1Idx, w2Idx, cIdx, clIdx, ipStr, cap, notesEnc, nameEnc, earnedEnc, statImpsEnc] = slotRaw.split(':')

      const type = ALL_WARRIORS[parseInt(wIdx, 36)] || null
      if (!type) continue

      const weapon1 = WEAPON_NAMES[parseInt(w1Idx, 36)] || null
      const weapon2 = w2Idx === '-' ? null : WEAPON_NAMES[parseInt(w2Idx, 36)] || null
      const consumable = cIdx === '-' ? null : CONSUMABLE_NAMES[parseInt(cIdx, 36)] || null
      const climbing = clIdx === '-' ? null : (CLIMBING_KEYS[parseInt(clIdx, 36)] === 'None' ? null : CLIMBING_KEYS[parseInt(clIdx, 36)]) || null
      const ipUpgrades = ipStr === '-' ? [] : ipStr.split('').map(c => ipIds[parseInt(c, 36)]).filter(Boolean)
      const isCaptain = cap === '1'

      let notes = []
      if (notesEnc && notesEnc !== '-') {
        try {
          const dec = decodeURIComponent(notesEnc)
          notes = dec.startsWith('[') ? JSON.parse(dec) : [{ title: '', body: dec }]
        } catch {}
      }

      const name = nameEnc && nameEnc !== '-' ? decodeURIComponent(nameEnc) : null
      const earnedIP = earnedEnc && earnedEnc !== '-' ? parseInt(earnedEnc, 36) : undefined
      const statImproves = (statImpsEnc && statImpsEnc !== '-')
        ? statImpsEnc.split('').map(c => ALL_STAT_KEYS[parseInt(c, 36)]).filter(Boolean)
        : undefined

      const warrior = { type, name, isCaptain, weapon1, weapon2, consumable, climbing, ipUpgrades }
      if (notes.length) warrior.notes = notes
      if (isCampaign) {
        warrior.earnedIP = earnedIP ?? 0
        warrior.statImproves = statImproves ?? []
      }

      warriors.push(warrior)
    }

    const payload = { mark, companyName, companyMode: isCampaign ? 'campaign' : 'standard', warriors }
    if (isCampaign) payload.campaignGame = campaignGame
    else payload.ipLimit = ipLimit

    return payload
  } catch {
    return null
  }
}

export { decodeCompany }
