import { clearSession } from 'h3'
import { authConfig } from '../../utils/auth-config'
import { sessionConfig } from '../../utils/auth-session'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const config = authConfig(event)
  if (!config.enabled || !config.configured)
    throw createError({ statusCode: 503, statusMessage: 'Sign-in is not configured.' })
  const origin = getHeader(event, 'origin')
  // APP_URL is the OAuth callback origin; the app may redirect to a www alias.
  // Browser-controlled Fetch Metadata identifies requests from the current site
  // without trusting Host or X-Forwarded-Host as an additional allowed origin.
  const sameOrigin = getHeader(event, 'sec-fetch-site') === 'same-origin'
  if (!origin || origin === 'null' || (origin !== config.origin && !sameOrigin))
    throw createError({ statusCode: 403, statusMessage: 'Invalid request origin.' })
  for (const flow of [false, true]) {
    const session = sessionConfig(config, flow)
    await clearSession(event, {
      ...session,
      cookie: { ...(session.cookie || {}), maxAge: 0 },
    })
  }
  return { ok: true }
})
