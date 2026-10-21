import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  projectActivity,
  projectAppearance,
  projectSiteUrl,
  solarAssignments,
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

test('metric ranking fills the eight solar bodies, then moons; dormant projects stay comets', () => {
  const now = Date.parse('2026-10-21T12:00:00Z')
  const template = mockProjects()[0]!
  const projects = Array.from({ length: 11 }, (_, index) => {
    const project = structuredClone(template)
    project.id = `rank-${index}`
    project.analytics.dau = 1000 - index * 50
    project.analytics.mau = index * 100 + 1
    project.deployment.createdAt = new Date(now).toISOString()
    project.github = null
    return project
  })
  projects[10]!.deployment.createdAt = new Date(now - 91 * 86400000).toISOString()
  const mapped = solarAssignments(projects, 'dau', now)
  assert.deepEqual(
    projects.slice(0, 8).map((p) => mapped[p.id]!.kind),
    SOLAR_BODIES.map((body) => body.kind),
  )
  assert.equal(mapped['rank-8']!.kind, 'moon')
  assert.equal(mapped['rank-9']!.kind, 'moon')
  assert.equal(mapped['rank-10']!.kind, 'comet')
  assert.equal(solarAssignments(projects, 'mau', now)['rank-9']!.kind, 'jupiter')
  assert.deepEqual(solarAssignments([...projects].reverse(), 'dau', now), mapped)
  projects[0]!.deployments30d.available = false
  assert.equal(solarAssignments(projects, 'deployments', now)['rank-0']!.kind, 'moon')
  projects[0]!.analytics.dau = 0
  assert.equal(solarAssignments(projects, 'dau', now)['rank-0']!.kind, 'moon')
})

test('zero and missing metrics keep the eight solar identities; only additional projects become moons', () => {
  const now = Date.parse('2026-10-21T12:00:00Z')
  const projects = mockProjects().map((project, index) => ({
    ...project,
    id: `quiet-${index}`,
    github: null,
    deployment: { ...project.deployment, createdAt: new Date(now).toISOString() },
    analytics: { ...project.analytics, dau: 0 },
  }))
  const zero = solarAssignments(projects, 'dau', now)
  assert.deepEqual(
    projects.map((project) => zero[project.id]!.kind),
    SOLAR_BODIES.map((body) => body.kind),
  )
  assert.deepEqual(solarAssignments([...projects].reverse(), 'dau', now), zero)
  const missing = { ...projects[0]!, analytics: { ...projects[0]!.analytics, dau: null } }
  const mixed = solarAssignments([missing, ...projects.slice(1)], 'dau', now)
  assert.equal(mixed[missing.id]!.kind, 'pluto')
  assert.equal(mixed[missing.id]!.rank, null)
  assert.equal(mixed[projects[1]!.id]!.kind, 'jupiter')
  const extra = { ...projects[0]!, id: 'quiet-9' }
  assert.equal(solarAssignments([...projects, extra], 'dau', now)[extra.id]!.kind, 'moon')
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
