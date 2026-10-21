import { clearSession } from 'h3'
import { authConfig } from '../../../utils/auth-config'
import { readOAuthFlow, sessionConfig, writeAuthUser } from '../../../utils/auth-session'
import { allowedGoogleUser, sameToken, verifyGoogleIdToken } from '../../../services/google-auth'

export default defineEventHandler(async (event) => {
  const config = authConfig(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
  if (!config.enabled || !config.configured)
    return sendRedirect(event, '/login?error=configuration', 302)
  const flow = await readOAuthFlow(event, config)
  await clearSession(event, sessionConfig(config, true))
  const query = getQuery(event)
  if (!flow || !sameToken(query.state, flow.state))
    return sendRedirect(event, '/login?error=expired', 302)
  if (query.error) return sendRedirect(event, '/login?error=cancelled', 302)
  if (typeof query.code !== 'string' || !query.code)
    return sendRedirect(event, '/login?error=failed', 302)
  try {
    const tokens = await $fetch<{ id_token?: string }>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        code: query.code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: flow.verifier,
      }),
      timeout: 10000,
      retry: 0,
    })
    if (!tokens.id_token) throw new Error('Missing identity')
    const payload = await verifyGoogleIdToken(tokens.id_token, config.clientId, flow.nonce)
    const user = allowedGoogleUser(payload, config.emails)
    if (!user) return sendRedirect(event, '/login?error=denied', 302)
    await writeAuthUser(event, config, user)
    return sendRedirect(event, '/', 302)
  } catch {
    // Provider errors can contain credentials or codes; never return or log them.
    return sendRedirect(event, '/login?error=failed', 302)
  }
})
