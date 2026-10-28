import { COMPANION_ICON_PATHS } from '../data/companions'

// Placeholder silhouettes for companion animals (until official art exists).
// Single-colour (currentColor) so they work anywhere the item icons do.
export default function CompanionIcon({ name, size = 24, className = '' }) {
  const d = COMPANION_ICON_PATHS[name]
  if (!d) return null
  return (
    <svg className={`companion-icon ${className}`} viewBox="0 0 24 24" width={size} height={size} fill="currentColor" fillRule="evenodd" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
