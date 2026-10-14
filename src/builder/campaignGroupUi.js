// Small display helpers for shared campaigns (CampaignGroupSheet, MemberCampaignView)

// "3 of 6 games · 2W 1L" for a member row; '' without progress (a member who left)
export function memberSummary(progress) {
  if (!progress) return ''
  const { completed, total, tally = {} } = progress
  const games = total != null ? `${completed} of ${total} games` : `${completed} ${completed === 1 ? 'game' : 'games'}`
  const wl = [['win', 'W'], ['loss', 'L'], ['draw', 'D'], ['retreat', 'R']].filter(([k]) => tally[k]).map(([k, l]) => `${tally[k]}${l}`).join(' ')
  return wl ? `${games} · ${wl}` : games
}

// "Expires in 6 days" / "Expires in 3 hours" / expired
export function expiresIn(at, now = Date.now()) {
  const ms = at - now
  if (ms <= 0) return 'This code has expired. Make a new one.'
  const days = Math.floor(ms / 86_400_000)
  if (days >= 1) return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`
  const hours = Math.max(1, Math.floor(ms / 3_600_000))
  return `Expires in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
}
