const BASE = import.meta.env.BASE_URL + 'company-avatars/'

export const COMPANY_AVATARS = [
  { key: 'battle',    label: 'Battle',         src: BASE + 'battle.png' },
  { key: 'trio',      label: 'Trio',            src: BASE + 'trio.png' },
  { key: 'warrior',  label: 'Warrior',         src: BASE + 'warrior.png' },
  { key: 'standoff', label: 'Standoff',        src: BASE + 'standoff.png' },
  { key: 'eaters',   label: 'Eaters',          src: BASE + 'eaters.png' },
  { key: 'push',     label: 'Push',            src: BASE + 'push.png' },
  { key: 'choke',    label: 'Choke',           src: BASE + 'choke.png' },
  { key: 'choke2',   label: 'Choke 2',         src: BASE + 'choke2.png' },
  { key: 'climbing', label: 'Climbing',        src: BASE + 'climbing.png' },
  { key: 'bridge',   label: 'Bridge',          src: BASE + 'bridge.png' },
  { key: 'bullseye', label: 'Bullseye',        src: BASE + 'bullseye.png' },
  { key: 'throne',   label: 'Throne Room',     src: BASE + 'throne.png' },
  { key: 'rest-stop',label: 'Rest Stop',       src: BASE + 'rest-stop.png' },
  { key: 'road-sign',label: 'Road Sign',       src: BASE + 'road-sign.png' },
]

export function getAvatarSrc(avatar) {
  if (!avatar) return null
  if (avatar.startsWith('data:')) return avatar          // user upload
  const found = COMPANY_AVATARS.find(a => a.key === avatar)
  return found ? found.src : null
}
