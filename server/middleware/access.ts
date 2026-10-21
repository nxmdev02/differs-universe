import { timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { serverSettings } from '../utils/settings'
import { authConfig } from '../utils/auth-config'
import { readAuthUser } from '../utils/auth-session'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  const publicAuth = [
    '/login',
    '/auth/google',
    '/auth/google/',
    '/auth/google/callback',
    '/api/auth/session',
    '/api/auth/logout',
  ].includes(path)
  if (publicAuth) {
    setResponseHeader(event, 'Cache-Control', 'private, no-store')
    setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
    setResponseHeader(event, 'X-Frame-Options', 'DENY')
    return
  }
  if (path.startsWith('/_nuxt/') || path.startsWith('/textures/') || path === '/favicon.svg') return
  const auth = authConfig(event)
  if (auth.enabled) {
    setResponseHeader(event, 'Cache-Control', 'private, no-store')
    setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
    setResponseHeader(event, 'X-Frame-Options', 'DENY')
    const user = await readAuthUser(event, auth)
    if (user) {
      event.context.authUser = user
      return
    }
    if (path.startsWith('/api/'))
      throw createError({
        statusCode: auth.configured ? 401 : 503,
        statusMessage: auth.configured
          ? 'Sign in to view your project universe.'
          : 'Google sign-in is not configured.',
      })
    return sendRedirect(event, '/login', 302)
  }
  const settings = serverSettings(event)
  if (settings.mode !== 'real') return
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const password = settings.dashboardPassword
  if (!password) {
    if (process.env.NODE_ENV === 'production')
      throw createError({
        statusCode: 503,
        statusMessage: 'Set DASHBOARD_PASSWORD to enable private project access in production.',
      })
    return
  }
  const header = getHeader(event, 'authorization') || ''
  const actual = Buffer.from(
    header.startsWith('Basic ') ? Buffer.from(header.slice(6), 'base64').toString() : '',
  )
  const expected = Buffer.from(`differs:${password}`)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    setResponseHeader(event, 'WWW-Authenticate', 'Basic realm="differs", charset="UTF-8"')
    throw createError({ statusCode: 401, statusMessage: 'Sign in to view your project universe.' })
  }
})
