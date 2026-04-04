const KEY = '1490_theme'

export const getTheme = () => localStorage.getItem(KEY) || 'dark'

export const setTheme = (t) => {
  localStorage.setItem(KEY, t)
  document.documentElement.setAttribute('data-theme', t)
}

export const toggleTheme = () => setTheme(getTheme() === 'dark' ? 'light' : 'dark')

export const initTheme = () => {
  const t = getTheme()
  document.documentElement.setAttribute('data-theme', t)
}
