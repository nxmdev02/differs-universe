import {
  clearSession,
  getCookie,
  unsealSession,
  useSession,
  type H3Event,
  type SessionConfig,
} from 'h3'
import type { AuthUser } from '../../shared/types/auth'
import type { AuthConfig } from './auth-config'

export const AUTH_COOKIE = 'differs-auth'
export const FLOW_COOKIE = 'differs-oauth'
export const SESSION_SECONDS = 8 * 60 * 60
export function sessionConfig(config: AuthConfig, flow = false): SessionConfig {
  return {
    name: flow ? FLOW_COOKIE : AUTH_COOKIE,
    password: config.password,
    maxAge: flow ? 600 : SESSION_SECONDS,
    sessionHeader: false,
    cookie: {
      httpOnly: true,
      secure: config.origin.startsWith('https:'),
      sameSite: 'lax',
      path: '/',
    },
  }
}

export async function readAuthUser(event: H3Event, config: AuthConfig): Promise<AuthUser | null> {
  if (!config.configured) return null
  const cookie = getCookie(event, AUTH_COOKIE)
  if (!cookie) return null
  try {
    const session = await unsealSession(event, sessionConfig(config), cookie)
    const user = session.data?.user as AuthUser | undefined
    if (
      !user ||
      typeof user.sub !== 'string' ||
      !user.sub ||
      typeof user.email !== 'string' ||
      typeof user.name !== 'string' ||
      !config.emails.includes(user.email.toLowerCase())
    )
      return null
    return { sub: user.sub, email: user.email, name: user.name }
  } catch {
    return null
  }
}

export interface OAuthFlow {
  state: string
  nonce: string
  verifier: string
  startedAt: number
}
export async function readOAuthFlow(event: H3Event, config: AuthConfig): Promise<OAuthFlow | null> {
  const cookie = getCookie(event, FLOW_COOKIE)
  if (!cookie) return null
  try {
    const session = await unsealSession(event, sessionConfig(config, true), cookie)
    const flow = session.data as OAuthFlow | undefined
    if (
      !flow ||
      typeof flow.state !== 'string' ||
      typeof flow.nonce !== 'string' ||
      typeof flow.verifier !== 'string' ||
      !Number.isFinite(flow.startedAt) ||
      Date.now() - flow.startedAt > 600000 ||
      flow.startedAt > Date.now()
    )
      return null
    return flow
  } catch {
    return null
  }
}

export async function writeAuthUser(event: H3Event, config: AuthConfig, user: AuthUser) {
  const options = sessionConfig(config)
  await clearSession(event, options)
  const session = await useSession(event, options)
  await session.update({ user })
}
