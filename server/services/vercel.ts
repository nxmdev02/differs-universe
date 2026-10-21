import type { DeployStatus } from '../../shared/types/project'
import type { Settings } from '../utils/settings'

export interface VercelDeployment {
  uid?: string
  id?: string
  name?: string
  url?: string
  state?: string
  readyState?: string
  created?: number
  createdAt?: number
  target?: string
  alias?: string[]
  meta?: { githubCommitMessage?: string; githubCommitRef?: string }
}
export interface VercelProject {
  id: string
  name: string
  framework?: string | null
  link?: { type?: string; org?: string; repo?: string; productionBranch?: string }
  latestDeployments?: VercelDeployment[]
  targets?: { production?: VercelDeployment }
}
export function normalizeStatus(value?: string): DeployStatus {
  return ['READY', 'BUILDING', 'QUEUED', 'ERROR'].includes(value || '')
    ? (value as DeployStatus)
    : 'UNKNOWN'
}
export async function vercelRequest<T>(
  settings: Settings,
  path: string,
  query: Record<string, string | number | undefined> = {},
): Promise<T> {
  return $fetch<T>(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${settings.vercelToken}` },
    query: { ...query, ...(settings.vercelTeamId ? { teamId: settings.vercelTeamId } : {}) },
    timeout: 12000,
    retry: 0,
  }) as Promise<T>
}
export async function listVercelProjects(settings: Settings) {
  const projects = new Map<string, VercelProject>()
  let until: number | undefined
  for (let page = 0; page < 100; page++) {
    const response = await vercelRequest<{
      projects: VercelProject[]
      pagination?: { next?: number | null }
    }>(settings, '/v10/projects', { limit: 100, until })
    if (!Array.isArray(response.projects)) throw new Error('Unexpected projects response')
    for (const project of response.projects) {
      if (typeof project.id !== 'string' || typeof project.name !== 'string')
        throw new Error('Invalid project')
      projects.set(project.id, project)
    }
    const next = response.pagination?.next
    if (next == null) return [...projects.values()]
    if (next === until) throw new Error('Invalid pagination cursor')
    until = next
  }
  throw new Error('Project pagination limit exceeded')
}
export async function listDeployments(settings: Settings, projectId: string) {
  const deployments = new Map<string, VercelDeployment>()
  let until: number | undefined
  const since = Date.now() - 30 * 86400000
  for (let page = 0; page < 100; page++) {
    const response = await vercelRequest<{
      deployments: VercelDeployment[]
      pagination?: { next?: number | null }
    }>(settings, '/v7/deployments', { projectId, limit: 100, since, until })
    if (!Array.isArray(response.deployments)) throw new Error('Unexpected deployments response')
    for (const deployment of response.deployments) {
      const id = deployment.uid || deployment.id
      if (!id) throw new Error('Invalid deployment')
      deployments.set(id, deployment)
    }
    const next = response.pagination?.next
    if (next == null)
      return [...deployments.values()].sort(
        (a, b) => (b.created || b.createdAt || 0) - (a.created || a.createdAt || 0),
      )
    if (next === until) throw new Error('Invalid pagination cursor')
    until = next
  }
  throw new Error('Deployment pagination limit exceeded')
}
export async function projectDomains(settings: Settings, id: string) {
  const domains = new Set<string>()
  let until: number | undefined
  for (let page = 0; page < 100; page++) {
    const result = await vercelRequest<{
      domains: { name: string }[]
      pagination?: { next?: number | null }
    }>(settings, `/v9/projects/${encodeURIComponent(id)}/domains`, { limit: 100, until })
    if (!Array.isArray(result.domains)) throw new Error('Invalid domains response')
    result.domains.forEach((domain) => domains.add(domain.name))
    if (result.pagination?.next == null) return [...domains]
    if (result.pagination.next === until) throw new Error('Invalid pagination cursor')
    until = result.pagination.next
  }
  throw new Error('Domain pagination limit exceeded')
}
