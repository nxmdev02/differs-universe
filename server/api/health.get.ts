import { serverSettings } from '../utils/settings'
export default defineEventHandler((event) => {
  const settings = serverSettings(event)
  return {
    mode: settings.mode,
    vercel: settings.vercelToken ? 'configured' : 'not-configured',
    github: settings.githubToken ? 'configured' : 'public-only',
    analytics: settings.mode === 'real' ? 'vercel' : 'mock',
    cacheSeconds: 60,
  }
})
