// "What is 1490 DOOM?" — context for first-time visitors, shown on the landing
// page below the main actions (guests only). Lore and game copy is Buer Games'
// own wording from 1490doom.com.

const FEATURES = [
  {
    title: 'Build your company',
    desc: 'Choose a mark and your Doom Warriors, then arm them with weapons, climbing gear and upgrades. The builder keeps you within the rules.',
    icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  },
  {
    title: 'Track the game',
    desc: 'Play mode follows vitality, statuses, abilities and cache loot round by round, and picks up where you left off on any device.',
    icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
  },
  {
    title: 'Run a campaign',
    desc: 'Carry your company from game to game. Survivors earn IP, captains fall and are replaced, and the story goes on.',
    icon: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z',
  },
  {
    title: 'Share your roster',
    desc: 'Send a link, post a roster image to Discord, or print it for the table.',
    icon: 'M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z',
  },
  {
    title: 'Rules at hand',
    desc: 'Actions, statuses, falling and resource caches, one tap away mid-game.',
    icon: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V6h10v2z',
  },
  {
    title: 'Find your company',
    desc: 'New to the game? Five questions pick a mark and three warriors to start you off.',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
  },
]

export default function LandingAbout() {
  return (
    <section className="landing-about" aria-labelledby="landing-about-title">
      <h2 id="landing-about-title" className="landing-about-heading">What you can do here</h2>
      <ul className="landing-about-features">
        {FEATURES.map(f => (
          <li key={f.title} className="landing-about-feature">
            <h3 className="landing-about-feature-title">
              <svg className="landing-about-icon" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d={f.icon} /></svg>
              {f.title}
            </h3>
            <p className="landing-about-feature-desc">{f.desc}</p>
          </li>
        ))}
      </ul>

      {/* The game itself: its own panel, so it reads as story rather than more features */}
      <div className="landing-world">
        <h2 className="landing-world-title">What is 1490 DOOM?</h2>
        <p className="landing-world-opening">It is late in the year 1490. The ground has begun to rot.</p>
        <span className="landing-world-ornament" aria-hidden="true">✦</span>
        <p>With the thaw came the Creeping Death. It rose inch by inch, creeping ever higher. Whole cities went under. Only the high places hold: castles, ruins, towers. And there is not enough room in them for everyone.</p>
        <p><strong>Two Doom Companies. One tower.</strong> In this tabletop skirmish game from Buer Games you take turns moving, fighting and climbing, scavenging for scarce resources and fighting for the high ground. Early turns are about position. Later turns are about survival.</p>
        <ul className="landing-world-facts" aria-label="At a glance">
          <li><span className="landing-world-fact-value">3 min</span><span className="landing-world-fact-label">setup</span></li>
          <li><span className="landing-world-fact-value">30–45 min</span><span className="landing-world-fact-label">per game</span></li>
        </ul>
        <a className="landing-world-btn" href="https://1490doom.com" target="_blank" rel="noopener noreferrer">Learn the game ↗</a>
      </div>

      <p className="landing-about-footnote">Free to use · An official 1490 DOOM production with Buer Games</p>
    </section>
  )
}
