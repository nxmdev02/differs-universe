import type { H3Event } from 'h3'
import type {
  ProjectViewModel,
  ProjectsResponse,
  ProjectActivity,
} from '../../shared/types/project'
import { serverSettings, type Settings } from '../utils/settings'
import { cached } from '../utils/cache'
import { mockProjects, mockActivity } from './mock'
import { projectAnalytics } from './analytics'
import { listVercelProjects, listDeployments, normalizeStatus, projectDomains } from './vercel'
import { githubActivity } from './github'
import { projectActivity } from '../../shared/utils/project-appearance'
import { projectPreview } from '../utils/previews'

function key(settings: Settings, part: string) {
  return `${settings.vercelToken}:${settings.vercelTeamId}:${settings.githubToken}:${part}`
}
function deployments(settings: Settings, id: string) {
  return cached(key(settings, `deployments:${id}`), () => listDeployments(settings, id))
}
function git(settings: Settings, owner: string, repo: string) {
  return cached(
    key(settings, `git:${owner}/${repo}`),
    () => githubActivity(settings, owner, repo),
    120,
  )
}

export async function getProjects(event: H3Event): Promise<ProjectsResponse> {
  const settings = serverSettings(event)
  if (settings.mode === 'mock')
    return {
      projects: mockProjects(),
      mode: 'mock',
      updatedAt: new Date().toISOString(),
      warnings:
        settings.requestedMode === 'real'
          ? ['Vercel is not configured. Showing sample projects.']
          : [],
    }
  try {
    const analyticsNow = new Date()
    return await cached(
      key(settings, `projects:${analyticsNow.toISOString().slice(0, 10)}`),
      async () => {
        const source = await listVercelProjects(settings)
        const projects: ProjectViewModel[] = []
        // Limit fan-out to respect provider rate limits for larger accounts.
        let cursor = 0
        await Promise.all(
          Array.from({ length: Math.min(4, source.length) }, async () => {
            while (cursor < source.length) {
              const project = source[cursor++]!
              const warnings: string[] = []
              const [history, analytics] = await Promise.all([
                deployments(settings, project.id).catch(() => {
                  warnings.push('Deployment history is temporarily unavailable.')
                  return null
                }),
                projectAnalytics(settings, project.id, analyticsNow),
              ])
              warnings.push(...(analytics.warnings || []))
              const latest =
                history?.[0] || project.latestDeployments?.[0] || project.targets?.production
              const link =
                project.link?.type === 'github' && project.link.org && project.link.repo
                  ? project.link
                  : null
              const github = link
                ? {
                    owner: link.org!,
                    repo: link.repo!,
                    defaultBranch: link.productionBranch || null,
                    lastCommitAt: null,
                    lastCommitMessage: null,
                  }
                : null
              const created = latest?.created || latest?.createdAt
              const model: ProjectViewModel = {
                id: project.id,
                name: project.name,
                framework: project.framework || null,
                source: 'real',
                domains: project.targets?.production?.alias || [],
                productionUrl: project.targets?.production?.url
                  ? `https://${project.targets.production.url}`
                  : null,
                deployment: {
                  status: normalizeStatus(latest?.readyState || latest?.state),
                  url: latest?.url ? `https://${latest.url}` : null,
                  createdAt: created ? new Date(created).toISOString() : null,
                },
                github,
                analytics,
                deployments30d: {
                  count: history?.length || 0,
                  source: 'real',
                  available: history !== null,
                },
                warnings,
              }
              // A recent commit keeps an older deployment from becoming a comet.
              if (projectActivity(model).dormant && model.github) {
                const activity = await git(settings, model.github.owner, model.github.repo).catch(
                  () => null,
                )
                if (activity) {
                  model.github.lastCommitAt = activity.lastCommitAt
                  model.github.lastCommitMessage = activity.lastCommitMessage
                  model.warnings.push(...activity.warnings)
                } else
                  model.warnings.push(
                    'Commit activity is unavailable; inactivity uses known deployments.',
                  )
              }
              const preview = projectPreview(model)
              if (preview)
                model.preview = {
                  capturedAt: preview.capturedAt,
                  url: `/api/projects/${encodeURIComponent(model.id)}/preview`,
                }
              projects.push(model)
            }
          }),
        )
        projects.sort((a, b) => a.name.localeCompare(b.name))
        return {
          projects,
          mode: 'real' as const,
          updatedAt: new Date().toISOString(),
          warnings: [],
        }
      },
    )
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage:
        'Unable to load Vercel projects. Check the server token, team scope, or API rate limit and try again.',
    })
  }
}
export async function getProject(event: H3Event, id: string) {
  const result = await getProjects(event)
  const project = result.projects.find((item) => item.id === id)
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  const settings = serverSettings(event)
  if (settings.mode === 'mock') return project
  const enriched = { ...project, warnings: [...project.warnings] }
  const [domains, activity] = await Promise.allSettled([
    cached(key(settings, `domains:${id}`), () => projectDomains(settings, id), 120),
    project.github
      ? git(settings, project.github.owner, project.github.repo)
      : Promise.resolve(null),
  ])
  if (domains.status === 'fulfilled') enriched.domains = domains.value
  else enriched.warnings.push('Custom domains are temporarily unavailable.')
  if (activity.status === 'fulfilled' && activity.value && project.github) {
    enriched.github = {
      ...project.github,
      defaultBranch: activity.value.defaultBranch || project.github.defaultBranch,
      lastCommitAt: activity.value.lastCommitAt,
      lastCommitMessage: activity.value.lastCommitMessage,
    }
    enriched.warnings.push(...activity.value.warnings)
  } else if (activity.status === 'rejected')
    enriched.warnings.push('GitHub activity is temporarily unavailable.')
  return enriched
}
export async function getActivity(event: H3Event, id: string): Promise<ProjectActivity> {
  const project = (await getProjects(event)).projects.find((item) => item.id === id)
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  const settings = serverSettings(event)
  if (settings.mode === 'mock') return mockActivity(project)
  const [history, activity] = await Promise.allSettled([
    deployments(settings, id),
    project.github
      ? git(settings, project.github.owner, project.github.repo)
      : Promise.resolve(null),
  ])
  const github = activity.status === 'fulfilled' ? activity.value : null
  return {
    source: 'real',
    branches: github?.branches || [],
    warnings: [
      ...(history.status === 'rejected' ? ['Deployment history is temporarily unavailable.'] : []),
      ...(activity.status === 'rejected'
        ? ['GitHub activity is temporarily unavailable.']
        : github?.warnings || []),
    ],
    items: [
      ...(history.status === 'fulfilled'
        ? history.value.slice(0, 10).map((item) => ({
            id: item.uid || item.id!,
            kind: 'deployment' as const,
            title: `Deployment ${normalizeStatus(item.readyState || item.state).toLowerCase()}`,
            detail: `${item.target || 'Preview'} · ${item.meta?.githubCommitRef || 'deployment'}`,
            date: new Date(item.created || item.createdAt || 0).toISOString(),
            status: normalizeStatus(item.readyState || item.state),
            url: item.url ? `https://${item.url}` : null,
          }))
        : []),
      ...(github?.items || []),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20),
  }
}
