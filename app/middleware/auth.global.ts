export default defineNuxtRouteMiddleware(async (to) => {
  const { refreshAuth } = useDashboardAuth()
  try {
    const auth = await refreshAuth()
    if (auth.enabled && !auth.user && to.path !== '/login') return navigateTo('/login')
    if (auth.enabled && auth.user && to.path === '/login') return navigateTo('/')
  } catch {
    if (to.path !== '/login') return navigateTo('/login?error=failed')
  }
})
