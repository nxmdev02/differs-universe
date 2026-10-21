import type { H3Event } from 'h3'
import process from 'node:process'

export function authConfig(event: H3Event) {
  const config = useRuntimeConfig(event)
  const mode = process.env.AUTH_MODE || config.authMode
  const clientId = process.env.GOOGLE_CLIENT_ID || config.googleClientId
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.googleClientSecret
  const password = process.env.SESSION_PASSWORD || config.sessionPassword
  const emails = (process.env.AUTH_ALLOWED_EMAILS || config.authAllowedEmails)
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean)
  const appUrl = process.env.APP_URL || config.appUrl
  let origin = ''
  try {
    const url = new URL(appUrl)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (
      (url.protocol === 'https:' ||
        (process.env.NODE_ENV !== 'production' && local && url.protocol === 'http:')) &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    )
      origin = url.origin
  } catch {
    /* Incomplete configuration stays closed. */
  }
  const enabled = mode === 'google' || (mode === 'auto' && Boolean(clientId || clientSecret))
  return {
    enabled,
    clientId,
    clientSecret,
    password,
    emails,
    origin,
    configured: Boolean(
      clientId && clientSecret && password.length >= 32 && emails.length && origin,
    ),
    redirectUri: `${origin}/auth/google/callback`,
  }
}
export type AuthConfig = ReturnType<typeof authConfig>
