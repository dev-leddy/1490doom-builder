const KEY = '1490_theme'

export const getTheme = () => 'dark'

export const setTheme = (t) => {
  localStorage.setItem(KEY, t)
  document.documentElement.setAttribute('data-theme', t)
}

export const initTheme = () => {
  const t = getTheme()
  document.documentElement.setAttribute('data-theme', t)
}
