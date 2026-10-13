// ── CAMPAIGN RULES ───────────────────────────────────────────────────────────
// Numbers used by the campaign engine (src/store/campaign.js). Change them here
// for house rules; the engine reads nothing else.

export const CAMPAIGN_RULES = {
  games: 6,               // scenarios in a campaign; after the last one it is complete
  survivorIP: 1,          // each game: 1 IP to one surviving model
  winnerCaptainIP: 1,     // winner: 1 more IP to the Captain, if the Captain survived
  maxBonusIP: 3,          // scenario / objective bonus IP per game, all warriors together
  retreatGivesIP: false,  // a company that retreats earns no IP in a campaign
}

export const GAME_RESULTS = ['win', 'loss', 'draw', 'retreat']
