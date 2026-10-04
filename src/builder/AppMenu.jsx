import BottomSheet from '../shared/BottomSheet'

// App menu (hamburger): navigation to the important places in the app, actions for
// the open company, and outside links. Saved companies live on the landing page.

const ICONS = {
  companies: 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z',
  add: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
  ref: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V6h10v2z',
  share: 'M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z',
  print: 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
  flag: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z',
  shop: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM5.21 4H2V2H0v2h2l3.6 7.59L4.25 14C4.09 14.32 4 14.65 4 15c0 1.1.9 2 2 2h14v-2H6.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.42 4H5.21z',
}

function Icon({ name }) {
  return <svg className="app-menu-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><path d={ICONS[name]} /></svg>
}

function DiscordIcon() {
  return (
    <svg className="app-menu-icon app-menu-icon--discord" viewBox="0 0 127.14 96.36" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/>
    </svg>
  )
}

function Row({ icon, label, detail, onClick, href }) {
  const content = (
    <>
      {icon}
      <span className="app-menu-label">{label}</span>
      {detail && <span className="app-menu-detail">{detail}</span>}
      <span className="app-menu-trail" aria-hidden="true">{href ? '↗' : '›'}</span>
    </>
  )
  return (
    <li>
      {href
        ? <a className="app-menu-row" href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>{content}</a>
        : <button type="button" className="app-menu-row" onClick={onClick}>{content}</button>}
    </li>
  )
}

function Section({ title, children }) {
  return (
    <section className="app-menu-section">
      {title && <h3 className="app-menu-heading">{title}</h3>}
      <ul className="app-menu-list">{children}</ul>
    </section>
  )
}

export default function AppMenu({
  user, companyOpen, isCampaign, saveCount,
  onClose, onSignIn, onMyCompanies, onNewCompany, onQuickRef, onShare, onPrint, onEndCampaign,
}) {
  const go = fn => () => { onClose(); fn() }

  return (
    <BottomSheet title="Menu" onClose={onClose}>
      <div className="app-menu">
        {!user && (
          <div className="app-menu-signin">
            <p className="app-menu-signin-text">Sign in to keep your companies on every device.</p>
            <button type="button" className="app-menu-signin-btn" onClick={go(onSignIn)}>Sign in</button>
          </div>
        )}

        <Section>
          {user && <Row icon={<Icon name="companies" />} label="My companies" detail={saveCount ? String(saveCount) : null} onClick={go(onMyCompanies)} />}
          <Row icon={<Icon name="add" />} label="New company" onClick={go(onNewCompany)} />
          <Row icon={<Icon name="ref" />} label="Quick reference" onClick={go(onQuickRef)} />
        </Section>

        {companyOpen && (
          <Section title="This company">
            <Row icon={<Icon name="share" />} label="Share" onClick={go(onShare)} />
            <Row icon={<Icon name="print" />} label="Print" onClick={go(onPrint)} />
            {isCampaign && <Row icon={<Icon name="flag" />} label="End campaign game" onClick={go(onEndCampaign)} />}
          </Section>
        )}

        <Section title="More">
          <Row icon={<DiscordIcon />} label="Discord" href="https://discord.gg/hqTdqGBJyg" onClick={onClose} />
          <Row icon={<Icon name="shop" />} label="1490 DOOM Shop" href="https://buergames.com/collections/1490-doom-physical" onClick={onClose} />
        </Section>
      </div>
    </BottomSheet>
  )
}
