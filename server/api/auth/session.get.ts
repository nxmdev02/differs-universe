import type { AuthStatus } from '../../../shared/types/auth'
import { authConfig } from '../../utils/auth-config'
import { readAuthUser } from '../../utils/auth-session'

export default defineEventHandler(async (event): Promise<AuthStatus> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const config = authConfig(event)
  return {
    enabled: config.enabled,
    configured: config.configured,
    user: config.enabled ? await readAuthUser(event, config) : null,
  }
})
