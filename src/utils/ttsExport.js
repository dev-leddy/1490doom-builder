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
        ipUpgrades: s.ip ?? [],
      }
      if (companyMode === 'campaign') {
        w.earnedIP = s.earnedIP ?? 0
        w.statImproves = s.statImproves ?? []
      } else {
        w.statImprove = s.statImprove || null
      }
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
