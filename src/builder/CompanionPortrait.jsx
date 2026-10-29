import { COMPANION_PORTRAITS } from '../data/companions'

// The animal's miniature, in a rounded frame (sized by the caller's class)
export default function CompanionPortrait({ name, className = '' }) {
  const src = COMPANION_PORTRAITS[name]
  if (!src) return null
  return (
    <span className={`companion-portrait ${className}`}>
      <img src={src} alt="" loading="lazy" draggable="false" />
    </span>
  )
}
