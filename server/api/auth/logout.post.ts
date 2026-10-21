import { clearSession } from 'h3'
import { authConfig } from '../../utils/auth-config'
import { sessionConfig } from '../../utils/auth-session'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const config = authConfig(event)
  if (!config.enabled || !config.configured)
    throw createError({ statusCode: 503, statusMessage: 'Sign-in is not configured.' })
  if (getHeader(event, 'origin') !== config.origin)
    throw createError({ statusCode: 403, statusMessage: 'Invalid request origin.' })
  await clearSession(event, sessionConfig(config))
  await clearSession(event, sessionConfig(config, true))
  return { ok: true }
})
