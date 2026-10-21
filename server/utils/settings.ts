import type { H3Event } from 'h3'
import process from 'node:process'

export function serverSettings(event: H3Event) {
  const config = useRuntimeConfig(event)
  const vercelToken = process.env.VERCEL_TOKEN || config.vercelToken
  return {
    vercelToken,
    vercelTeamId: process.env.VERCEL_TEAM_ID || config.vercelTeamId,
    githubToken: process.env.GITHUB_TOKEN || config.githubToken,
    dashboardPassword: process.env.DASHBOARD_PASSWORD || config.dashboardPassword,
    mode:
      (process.env.DATA_MODE || config.dataMode) === 'real' && vercelToken
        ? ('real' as const)
        : ('mock' as const),
    requestedMode: process.env.DATA_MODE || config.dataMode,
  }
}
export type Settings = ReturnType<typeof serverSettings>
