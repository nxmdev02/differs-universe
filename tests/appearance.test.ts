import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  projectActivity,
  projectAppearance,
  projectSiteUrl,
  solarAssignments,
  visitorGlow,
  recentDeploymentKey,
  sortProjectsByTraffic,
  SOLAR_BODIES,
} from '../shared/utils/project-appearance'
import { mockProjects } from '../server/services/mock'

test('comets start exactly at 90 days and a newer commit keeps a project active', () => {
  const project = structuredClone(mockProjects()[0]!)
  const now = Date.parse('2026-10-21T12:00:00Z')
  project.deployment.createdAt = new Date(now - 90 * 86400000).toISOString()
  project.github!.lastCommitAt = null
  assert.equal(projectActivity(project, now - 1).dormant, false)
  assert.equal(projectActivity(project, now).dormant, true)
  project.github!.lastCommitAt = new Date(now - 2 * 86400000).toISOString()
  assert.equal(projectActivity(project, now).dormant, false)
  assert.equal(projectActivity(project, now).days, 2)
  project.deployment.createdAt = null
  project.github!.lastCommitAt = 'invalid'
  assert.equal(projectActivity(project, now).days, null)
  assert.equal(projectActivity(project, now).dormant, false)
})

test('DAU assigns descending solar sizes; quiet and unmeasured projects use latest activity', () => {
  const now = Date.parse('2026-10-21T12:00:00Z')
  const projects = Array.from({ length: 11 }, (_, index) => ({
    ...structuredClone(mockProjects()[0]!),
    id: `rank-${index}`,
    name: `project-${index}`,
    github: null,
    deployment: {
      status: 'READY' as const,
      url: null,
      createdAt: new Date(now - index * 86400000).toISOString() as string | null,
    },
    analytics: {
      source: 'real' as const,
      dau: index === 0 ? null : index === 1 ? 5 : index === 2 ? 10 : 0,
      mau: index * 100,
      growthRate: null,
    },
  }))
  projects[9]!.deployment.createdAt = null
  projects[10]!.deployment.createdAt = new Date(now - 91 * 86400000).toISOString()
  assert.deepEqual(
    sortProjectsByTraffic(projects).map((p) => p.id),
    [2, 1, 0, 3, 4, 5, 6, 7, 8, 10, 9].map((i) => `rank-${i}`),
  )
  const original = solarAssignments(projects, 'dau', now)
  assert.deepEqual(
    [2, 1, 0, 3, 4, 5, 6, 7].map((i) => original[`rank-${i}`]!.kind),
    SOLAR_BODIES.map((b) => b.kind),
  )
  assert.equal(original['rank-0']!.rank, null)
  assert.equal(original['rank-8']!.kind, 'pluto')
  assert.equal(original['rank-9']!.kind, 'pluto')
  assert.equal(original['rank-10']!.kind, 'comet')
  for (const metric of ['dau', 'mau', 'deployments'] as const) {
    const mapped = solarAssignments([...projects].reverse(), metric, now)
    for (const project of projects) {
      assert.deepEqual(
        { ...mapped[project.id], rank: null },
        { ...original[project.id], rank: null },
      )
    }
  }
  projects[0]!.analytics.dau = 20
  assert.equal(solarAssignments(projects, 'dau', now)['rank-0']!.kind, 'jupiter')
  projects[10]!.deployment.createdAt = new Date(now).toISOString()
  assert.notEqual(solarAssignments(projects, 'dau', now)['rank-10']!.kind, 'comet')
})

test('zero traffic uses newest deployment or commit; missing dates sort last and ties are stable', () => {
  const projects = mockProjects()
    .slice(0, 4)
    .map((project, index) => ({
      ...project,
      name: `project-${index}`,
      github: null as typeof project.github,
      analytics: { ...project.analytics, dau: index === 0 ? null : 0 },
      deployment: {
        ...project.deployment,
        createdAt: index === 3 ? null : `2026-10-${20 - index}T12:00:00Z`,
      },
    }))
  projects[2]!.github = { ...mockProjects()[0]!.github!, lastCommitAt: '2026-10-21T12:00:00Z' }
  assert.deepEqual(
    sortProjectsByTraffic(projects).map((p) => p.id),
    [2, 0, 1, 3].map((i) => projects[i]!.id),
  )
  assert.deepEqual(sortProjectsByTraffic([...projects].reverse()), sortProjectsByTraffic(projects))
  for (const project of projects) {
    project.deployment.createdAt = 'invalid'
    project.github = null
  }
  assert.deepEqual(
    sortProjectsByTraffic([...projects].reverse()).map((p) => p.name),
    projects.map((p) => p.name),
  )
  assert.equal(projects[0]!.analytics.dau, null)
})
test('traffic glow is absolute, bounded and distinct from missing analytics', () => {
  const project = structuredClone(mockProjects()[0]!)
  const levels = [0, 1, 5, 50, 1000, 100000].map((value) => {
    project.analytics.dau = value
    return visitorGlow(project, 'dau')!
  })
  assert.equal(levels[0], 0)
  assert.ok(levels[1]! >= 0.4 && levels[1]! < 0.5)
  assert.ok(levels[2]! > levels[1]! && levels[3]! > levels[2]!)
  assert.equal(levels[4], 1)
  assert.equal(levels[5], 1)
  project.analytics.dau = null
  assert.equal(visitorGlow(project, 'dau'), null)
  assert.equal(visitorGlow(project, 'deployments'), null)
  project.analytics.mau = 5
  assert.equal(visitorGlow(project, 'mau'), levels[2])
})

test('deployment signals only identify successful deployments within the last 24 hours', () => {
  const project = structuredClone(mockProjects()[0]!)
  const now = Date.parse('2026-10-21T12:00:00Z')
  project.deployment = {
    status: 'READY',
    url: 'https://example.com',
    createdAt: new Date(now).toISOString(),
  }
  assert.ok(recentDeploymentKey(project, now))
  assert.equal(recentDeploymentKey(project, now - 1), null)
  assert.equal(recentDeploymentKey(project, now + 86400000), null)
  project.deployment.status = 'BUILDING'
  assert.equal(recentDeploymentKey(project, now), null)
  project.deployment.status = 'READY'
  project.deployment.createdAt = 'invalid'
  assert.equal(recentDeploymentKey(project, now), null)
})
test('production links prefer custom domains and never link demo or preview deployments', () => {
  const project = structuredClone(mockProjects()[0]!)
  assert.equal(projectSiteUrl(project), undefined)
  project.source = 'real'
  project.domains = ['project.vercel.app', 'www.example.com']
  assert.equal(projectSiteUrl(project), 'https://www.example.com/')
  project.domains = []
  project.deployment.url = 'https://preview-123.vercel.app'
  assert.equal(projectSiteUrl(project), undefined)
  project.productionUrl = 'https://production.vercel.app'
  assert.equal(projectSiteUrl(project), 'https://production.vercel.app/')
  project.productionUrl = 'javascript:alert(1)'
  assert.equal(projectSiteUrl(project), undefined)
  project.productionUrl = 'https://user:password@example.com'
  assert.equal(projectSiteUrl(project), undefined)
})

test('project appearances stay stable independent of status, sorting and filtering', () => {
  const projects = mockProjects()
  const first = projectAppearance(projects[0]!.id)
  projects.reverse()
  assert.deepEqual(projectAppearance(projects.at(-1)!.id), first)
  assert.ok(new Set(projects.map((p) => projectAppearance(p.id).kind)).size >= 3)
  assert.ok(new Set(projects.map((p) => projectAppearance(p.id).color)).size >= 4)
})
