// Usage report from the D1 database: read-only SELECTs, nothing is changed.
//
//   npm run metrics              production (needs `wrangler login`)
//   npm run metrics -- --local   the local database used by `wrangler pages dev`
//   npm run metrics -- --json    raw rows as JSON (for a spreadsheet or dashboard)
//
// Accounts, companies, classes, marks, campaign games and share links come from tables the app
// already keeps, so they cover all history. Games started/ended and store clicks come from
// metric_events (migration 008) and start counting once that is live.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const where = args.includes('--local') ? '--local' : '--remote'
const asJson = args.includes('--json')
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))

const DAY = 864e5
const now = Date.now()
const d7 = now - 7 * DAY
const d30 = now - 30 * DAY
const w12 = now - 84 * DAY
const week = col => `strftime('%Y-W%W', ${col} / 1000, 'unixepoch')`
const ev = (kind, sql) => sql.replaceAll('$KIND', `kind = '${kind}'`)

// [title, sql]. Every query is read-only.
const QUERIES = [
  ['Accounts', `SELECT COUNT(*) AS total, SUM(created_at >= ${d7}) AS new_7d, SUM(created_at >= ${d30}) AS new_30d FROM users`],
  ['New accounts per week', `SELECT ${week('created_at')} AS week, COUNT(*) AS accounts FROM users WHERE created_at >= ${w12} GROUP BY week ORDER BY week`],
  // A session's expiry rolls forward 30 days on every visit, so expiry − 30 days = last visit
  ['Active players (signed in and used the app)', `SELECT SUM(last >= ${d7}) AS last_7d, SUM(last >= ${d30}) AS last_30d FROM (SELECT user_id, MAX(expires_at) - ${30 * DAY} AS last FROM sessions GROUP BY user_id)`],
  ['Companies by type', `SELECT mode, COUNT(*) AS companies, COUNT(DISTINCT user_id) AS players, SUM(saved_at >= ${d30}) AS edited_30d FROM companies GROUP BY mode ORDER BY companies DESC`],
  ['Warrior classes (every company)', `SELECT json_extract(s.value, '$.type') AS class, COUNT(*) AS picks, COUNT(DISTINCT c.id) AS companies FROM companies c, json_each(c.data, '$.slots') s WHERE class IS NOT NULL GROUP BY class ORDER BY picks DESC`],
  ['Company marks', `SELECT COALESCE(NULLIF(json_extract(data, '$.mark'), ''), '(none)') AS mark, COUNT(*) AS companies FROM companies GROUP BY mark ORDER BY companies DESC`],
  ['Campaign games recorded per week', `SELECT ${week('server_at')} AS week, COUNT(*) AS games, COUNT(DISTINCT user_id) AS players FROM campaign_events WHERE type = 'game.recorded' AND status = 'ok' AND server_at >= ${w12} GROUP BY week ORDER BY week`],
  ['Campaign groups', `SELECT COUNT(*) AS groups, SUM(members >= 2) AS with_2_or_more FROM (SELECT g.id, (SELECT COUNT(*) FROM campaign_group_members m WHERE m.group_id = g.id AND m.left_at IS NULL) AS members FROM campaign_groups g)`],
  ['Share links created per week', `SELECT ${week('created_at')} AS week, COUNT(*) AS links FROM short_links WHERE created_at >= ${w12} GROUP BY week ORDER BY week`],
  ['Games in progress', `SELECT COUNT(*) AS saved_games, SUM(saved_at >= ${d7}) AS played_7d FROM game_sessions`],
  // From metric_events (008)
  ['Games started per week', ev('game_start', `SELECT ${week('created_at')} AS week, json_extract(props, '$.mode') AS company, COUNT(*) AS games, COUNT(DISTINCT user_id) AS players FROM metric_events WHERE $KIND AND created_at >= ${w12} GROUP BY week, company ORDER BY week, company`)],
  ['Games started by scenario', ev('game_start', `SELECT json_extract(props, '$.scenario') AS scenario, COUNT(*) AS games, COUNT(DISTINCT user_id) AS players FROM metric_events WHERE $KIND GROUP BY scenario ORDER BY games DESC`)],
  ['Games ended', ev('game_end', `SELECT json_extract(props, '$.reason') AS how, COUNT(*) AS games, ROUND(AVG(json_extract(props, '$.rounds')), 1) AS avg_rounds, ROUND(AVG(json_extract(props, '$.minutes'))) AS avg_minutes FROM metric_events WHERE $KIND GROUP BY how`)],
  ['Companies created per week', ev('company_create', `SELECT ${week('created_at')} AS week, json_extract(props, '$.mode') AS type, COUNT(*) AS companies FROM metric_events WHERE $KIND AND created_at >= ${w12} GROUP BY week, type ORDER BY week, type`)],
  ['Store clicks per week', ev('store_click', `SELECT ${week('created_at')} AS week, COUNT(*) AS clicks, COUNT(DISTINCT user_id) AS signed_in_players FROM metric_events WHERE $KIND AND created_at >= ${w12} GROUP BY week ORDER BY week`)],
  ['Store clicks by place in the app', ev('store_click', `SELECT json_extract(props, '$.from') AS place, json_extract(props, '$.to') AS page, COUNT(*) AS clicks, SUM(created_at >= ${d30}) AS last_30d FROM metric_events WHERE $KIND GROUP BY place, page ORDER BY clicks DESC`)],
]

function run(sql) {
  const r = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'doom-builder', where, '--json', '--command', sql], { encoding: 'utf8' })
  if (r.status !== 0) {
    const msg = `${r.stderr || ''}${r.stdout || ''}`
    throw new Error(/no such table: metric_events/.test(msg) ? 'no data yet (migration 008 not applied)' : msg.trim().split('\n').slice(-3).join(' '))
  }
  return JSON.parse(r.stdout)[0]?.results || []
}

function table(rows) {
  if (!rows.length) return '  (none yet)'
  const cols = Object.keys(rows[0])
  const cell = v => (v == null ? '' : String(v))
  const w = cols.map(c => Math.max(c.length, ...rows.map(r => cell(r[c]).length)))
  const line = vals => '  ' + vals.map((v, i) => (typeof rows[0][cols[i]] === 'number' ? v.padStart(w[i]) : v.padEnd(w[i]))).join('   ')
  return [line(cols), '  ' + w.map(n => '-'.repeat(n)).join('   '), ...rows.map(r => line(cols.map(c => cell(r[c]))))].join('\n')
}

const out = {}
if (!asJson) console.log(`1490 DOOM Builder usage (${where === '--local' ? 'local' : 'production'}), ${new Date(now).toISOString().slice(0, 10)}\n`)
for (const [title, sql] of QUERIES) {
  let rows
  try { rows = run(sql) } catch (err) { rows = null; out[title] = { error: err.message } }
  if (rows) out[title] = rows
  if (!asJson) console.log(`${title}\n${rows ? table(rows) : `  ${err(out[title])}`}\n`)
}
if (asJson) console.log(JSON.stringify(out, null, 2))

function err(o) { return o?.error || 'failed' }
