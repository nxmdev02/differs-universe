import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey, type JWTPayload } from 'jose'
import type { AuthUser } from '../../shared/types/auth'
import type { AuthConfig } from '../utils/auth-config'

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), {
  timeoutDuration: 8000,
})
export function randomToken() {
  return randomBytes(32).toString('base64url')
}
export function sameToken(actual: unknown, expected: string) {
  if (typeof actual !== 'string') return false
  const a = Buffer.from(actual)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
export function googleAuthorizationUrl(
  config: AuthConfig,
  flow: { state: string; nonce: string; verifier: string },
) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: createHash('sha256').update(flow.verifier).digest('base64url'),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString()
  return url.href
}
export async function verifyGoogleIdToken(
  token: string,
  clientId: string,
  nonce: string,
  key: JWTVerifyGetKey = googleKeys,
) {
  const { payload } = await jwtVerify(token, key, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
    algorithms: ['RS256'],
    requiredClaims: ['exp', 'iat', 'sub', 'nonce', 'email'],
    maxTokenAge: '10m',
    clockTolerance: 5,
  })
  if (!sameToken(payload.nonce, nonce) || (payload.azp && payload.azp !== clientId))
    throw new Error('Invalid identity')
  return payload
}
export function allowedGoogleUser(payload: JWTPayload, emails: string[]): AuthUser | null {
  if (!payload.sub || payload.email_verified !== true || typeof payload.email !== 'string')
    return null
  const email = payload.email.toLowerCase()
  if (!emails.includes(email)) return null
  return {
    sub: payload.sub,
    email,
    name: typeof payload.name === 'string' ? payload.name.slice(0, 120) : email.split('@')[0]!,
  }
}
