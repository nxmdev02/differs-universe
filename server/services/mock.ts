import type { ProjectActivity, ProjectViewModel, DeployStatus } from '../../shared/types/project'
import { hashSeed, mockAnalytics } from './analytics-mock'

const samples: [string, string | null, DeployStatus, number, number, number, string][] = [
  ['gryd', 'nextjs', 'READY', 1250, 18400, 32, 'feat: a new home for your ideas'],
  ['differs', 'nuxtjs', 'READY', 420, 6200, 24, 'feat: bring the universe to life'],
  ['portfolio', 'astro', 'READY', 85, 1400, 8, 'style: a little more personality'],
  ['studio', 'nextjs', 'BUILDING', 780, 11200, 18, 'feat: collaborative canvas'],
  ['docs', 'nextra', 'READY', 320, 4800, 12, 'docs: update getting started'],
  ['pulse', 'sveltekit', 'READY', 640, 9300, 21, 'feat: weekly activity digest'],
  ['api-gateway', null, 'ERROR', 2100, 28400, 46, 'fix: upstream connection timeout'],
  ['playground', 'vite', 'QUEUED', 0, 0, 3, 'chore: the beginning of something'],
]
const anchor = Date.parse('2026-10-21T09:00:00Z')
export function mockProjects(): ProjectViewModel[] {
  return samples.map(([name, framework, status, dau, mau, count, message], index) => ({
    id: `prj_demo_${name}`,
    name,
    framework,
    source: 'mock',
    domains: [`${name}.example.com`],
    deployment: {
      status,
      url: null,
      createdAt: new Date(anchor - index * 37 * 60000).toISOString(),
    },
    github:
      name === 'playground'
        ? null
        : {
            owner: 'differs-labs',
            repo: name === 'docs' ? 'gryd' : name,
            defaultBranch: 'main',
            lastCommitAt: new Date(anchor - index * 41 * 60000).toISOString(),
            lastCommitMessage: message,
          },
    analytics: {
      ...mockAnalytics(`prj_demo_${name}`),
      dau,
      mau,
      ...(name === 'gryd' ? { growthRate: 12.5 } : {}),
    },
    deployments30d: { count, source: 'mock', available: true },
    warnings: [],
  }))
}
export function mockActivity(project: ProjectViewModel): ProjectActivity {
  return {
    source: 'mock',
    branches: project.github ? ['main', 'feat/new-experience', 'fix/polish'] : [],
    warnings: [],
    items: Array.from({ length: 6 }, (_, index) => ({
      id: `${project.id}_${index}`,
      kind: index % 2 === 0 ? 'deployment' : 'commit',
      title:
        index % 2 === 0
          ? index === 0
            ? `Deployment ${project.deployment.status.toLowerCase()}`
            : 'Deployment ready'
          : index === 1
            ? project.github?.lastCommitMessage || 'Initial commit'
            : 'refactor: small improvements',
      detail:
        index % 2 === 0
          ? 'Production · main'
          : `${hashSeed(project.id + index)
              .toString(16)
              .slice(0, 7)} · main`,
      date: new Date(anchor - ((hashSeed(project.id) % 120) + index * 160) * 60000).toISOString(),
      status: index % 2 === 0 ? (index === 0 ? project.deployment.status : 'READY') : undefined,
      url: null,
    })).filter((item) => project.github || item.kind !== 'commit') as ProjectActivity['items'],
  }
}
