import { clearSession, useSession } from 'h3'
import { authConfig } from '../../../utils/auth-config'
import { sessionConfig } from '../../../utils/auth-session'
import { googleAuthorizationUrl, randomToken } from '../../../services/google-auth'

export default defineEventHandler(async (event) => {
  const config = authConfig(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
  if (!config.enabled || !config.configured)
    return sendRedirect(event, '/login?error=configuration', 302)
  await clearSession(event, sessionConfig(config, true))
  const session = await useSession(event, sessionConfig(config, true))
  const flow = {
    state: randomToken(),
    nonce: randomToken(),
    verifier: randomToken(),
    startedAt: Date.now(),
  }
  await session.update(flow)
  return sendRedirect(event, googleAuthorizationUrl(config, flow), 302)
})
