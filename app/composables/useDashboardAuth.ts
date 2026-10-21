import type { AuthStatus } from '#shared/types/auth'

export function useDashboardAuth() {
  const auth = useState<AuthStatus | null>('dashboard-auth', () => null)
  const request = useRequestFetch()
  async function refreshAuth() {
    auth.value = await request<AuthStatus>('/api/auth/session')
    return auth.value
  }
  async function signOut() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    auth.value = null
    clearNuxtData()
    await navigateTo('/login', { external: true })
  }
  return { auth, refreshAuth, signOut }
}
