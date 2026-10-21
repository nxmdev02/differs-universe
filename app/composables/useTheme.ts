type Theme = 'dark' | 'light'

export function useTheme() {
  const preference = useCookie<string>('differs-theme', {
    default: () => 'dark',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  })
  const theme = useState<Theme>('workspace-theme', () =>
    preference.value === 'light' ? 'light' : 'dark',
  )
  function setTheme(value: Theme) {
    theme.value = value
    preference.value = value
  }
  return { theme: readonly(theme), setTheme }
}
