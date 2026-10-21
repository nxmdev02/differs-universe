import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPlanetRadius, safeUrl } from '../shared/utils/planet-size'
import { mockAnalytics } from '../server/services/analytics-mock'
import { mockProjects } from '../server/services/mock'
import { normalizeStatus, listVercelProjects, listDeployments } from '../server/services/vercel'
import { githubActivity } from '../server/services/github'

test('zero and invalid metrics retain a visible, bounded planet', () => {
  assert.equal(getPlanetRadius(0, 5000), 12)
  assert.equal(getPlanetRadius(-1, 0), 12)
  assert.equal(getPlanetRadius(NaN, 0), 12)
  assert.equal(getPlanetRadius(5000, 5000), 48)
  assert.equal(getPlanetRadius(9000, 5000), 48)
  assert.ok(getPlanetRadius(10, 5000) < getPlanetRadius(100, 5000))
})
test('analytics are deterministic and remain in the declared ranges', () => {
  for (let index = 0; index < 1000; index++) {
    const result = mockAnalytics(`project-${index}`)
    assert.deepEqual(result, mockAnalytics(`project-${index}`))
    assert.ok(result.dau >= 0 && result.dau <= 5000)
    assert.ok(result.mau >= result.dau)
    assert.ok(result.growthRate >= -20 && result.growthRate <= 30)
    assert.equal(result.source, 'mock')
  }
})
test('shared GitHub repositories do not merge Vercel projects', () => {
  const projects = mockProjects()
  assert.equal(new Set(projects.map((project) => project.id)).size, projects.length)
  const shared = projects.filter((project) => project.github?.repo === 'gryd')
  assert.equal(shared.length, 2)
  assert.notEqual(shared[0]!.id, shared[1]!.id)
  assert.ok(projects.some((project) => project.analytics.dau === 0))
  assert.ok(projects.some((project) => project.github === null))
})
test('external links and unrecognized deployment states are safe', () => {
  assert.equal(safeUrl('javascript:alert(1)'), undefined)
  assert.equal(safeUrl('http://example.com'), undefined)
  assert.equal(safeUrl('https://example.com'), 'https://example.com/')
  assert.equal(normalizeStatus('CANCELED'), 'UNKNOWN')
  assert.equal(normalizeStatus('ERROR'), 'ERROR')
})
const settings = {
  vercelToken: 'test-only-token',
  vercelTeamId: 'team_test',
  githubToken: '',
  dashboardPassword: '',
  mode: 'real' as const,
  requestedMode: 'real',
}
test('Vercel project pagination preserves IDs and applies the team scope', async () => {
  const original = globalThis.$fetch
  let calls = 0
  globalThis.$fetch = (async (_url: string, options: { query: Record<string, unknown> }) => {
    calls++
    assert.equal(options.query.teamId, 'team_test')
    if (calls === 1) return { projects: [{ id: 'one', name: 'app' }], pagination: { next: 100 } }
    assert.equal(options.query.until, 100)
    return { projects: [{ id: 'two', name: 'docs' }], pagination: { next: null } }
  }) as typeof globalThis.$fetch
  try {
    assert.equal((await listVercelProjects(settings)).length, 2)
    assert.equal(calls, 2)
  } finally {
    globalThis.$fetch = original
  }
})
test('30-day deployment counts include every page and deduplicate overlaps', async () => {
  const original = globalThis.$fetch
  let calls = 0
  globalThis.$fetch = (async (_url: string, options: { query: Record<string, unknown> }) => {
    calls++
    assert.equal(options.query.projectId, 'one')
    assert.ok(Number(options.query.since) > Date.now() - 31 * 86400000)
    return calls === 1
      ? {
          deployments: [
            { uid: 'a', created: 300 },
            { uid: 'b', created: 200 },
          ],
          pagination: { next: 200 },
        }
      : {
          deployments: [
            { uid: 'b', created: 200 },
            { uid: 'c', created: 100 },
          ],
          pagination: { next: null },
        }
  }) as typeof globalThis.$fetch
  try {
    assert.equal((await listDeployments(settings, 'one')).length, 3)
  } finally {
    globalThis.$fetch = original
  }
})
test('repeated pagination cursors fail instead of returning a partial success', async () => {
  const original = globalThis.$fetch
  globalThis.$fetch = (async () => ({
    projects: [{ id: 'one', name: 'app' }],
    pagination: { next: 100 },
  })) as typeof globalThis.$fetch
  try {
    await assert.rejects(() => listVercelProjects(settings), /pagination cursor/)
  } finally {
    globalThis.$fetch = original
  }
})

test('GitHub partial failures preserve successful commit data', async () => {
  const original = globalThis.$fetch
  globalThis.$fetch = (async (url: string) => {
    if (url.endsWith('/branches')) throw new Error('Rate limited')
    if (url.endsWith('/commits'))
      return [
        {
          sha: 'abcdef123',
          html_url: 'https://github.com/example/app/commit/abcdef123',
          commit: {
            message: 'Fix deploy\nMore detail',
            author: { date: '2026-10-20T10:00:00Z' },
            committer: null,
          },
        },
      ]
    return { default_branch: 'main' }
  }) as typeof globalThis.$fetch
  try {
    const result = await githubActivity(settings, 'example', 'app')
    assert.equal(result.lastCommitMessage, 'Fix deploy')
    assert.equal(result.items.length, 1)
    assert.equal(result.defaultBranch, 'main')
    assert.equal(result.warnings.length, 1)
    assert.deepEqual(result.branches, [])
  } finally {
    globalThis.$fetch = original
  }
})

test('GitHub total outage resolves with a warning rather than hiding projects', async () => {
  const original = globalThis.$fetch
  globalThis.$fetch = (async () => {
    throw new Error('Unavailable')
  }) as typeof globalThis.$fetch
  try {
    const result = await githubActivity(settings, 'example', 'app')
    assert.equal(result.items.length, 0)
    assert.equal(result.warnings.length, 1)
    assert.equal(result.lastCommitMessage, null)
  } finally {
    globalThis.$fetch = original
  }
})
