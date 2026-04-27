const STAT_KEYS = ['MOV', 'VIT', 'SKL', 'DEF', 'COM']

// Normalise internal ip IDs to TTS output format:
//   standard 'stat' + statImprove 'VIT' → 'stat_VIT'
//   campaign 'stat_0'..'stat_4'          → 'stat_MOV'..'stat_COM'
function normaliseUpgrades(ip, companyMode, statImprove) {
  return (ip ?? []).map(id => {
    if (companyMode === 'standard' && id === 'stat') {
      return statImprove ? `stat_${statImprove}` : 'stat'
    }
    const campMatch = id.match(/^stat_(\d+)$/)
    if (campMatch) {
      const key = STAT_KEYS[parseInt(campMatch[1])]
      return key ? `stat_${key}` : id
    }
    return id
  })
}

export function buildTTSPayload({ mark, companyName, companyMode, campaignGame, ipLimit, slots }) {
  const warriors = slots
    .filter(s => s.type)
    .map(s => {
      const w = {
        type: s.type,
        name: s.customName || null,
        isCaptain: s.isCaptain,
        weapon1: s.weapon1,
        weapon2: s.weapon2 || null,
        consumable: s.consumable || null,
        climbing: s.climbing || null,
        ipUpgrades: normaliseUpgrades(s.ip, companyMode, s.statImprove),
      }
      if (companyMode === 'campaign') w.earnedIP = s.earnedIP ?? 0
      if (s.notes?.length) w.notes = s.notes
      return w
    })

  const payload = { mark, companyName, companyMode, warriors }
  if (companyMode === 'campaign') payload.campaignGame = campaignGame
  else payload.ipLimit = ipLimit
  return payload
}

export function exportAsTTSJSON(payload) {
  return JSON.stringify(payload, null, 2)
}
