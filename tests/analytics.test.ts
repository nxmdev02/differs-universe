import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyticsRange, parseVisits, projectAnalytics } from '../server/services/analytics'
import { metricAvailable, metricText } from '../shared/utils/planet-size'
import { solarAssignments } from '../shared/utils/project-appearance'
import { mockProjects } from '../server/services/mock'

const now = new Date('2026-10-21T12:30:00Z')
const settings = {
  vercelToken: 'test-token',
  vercelTeamId: 'team_test',
  githubToken: '',
  dashboardPassword: '',
  mode: 'real' as const,
  requestedMode: 'real',
}
const row = (timestamp: string, visitors: number) => ({
  timestamp,
  visitors,
  pageviews: visitors + 5,
})

test('analytics uses 30 UTC calendar days including today across month and leap-year boundaries', () => {
  assert.deepEqual(analyticsRange(now), {
    today: '2026-10-21T00:00:00.000Z',
    since: '2026-09-22T00:00:00.000Z',
    until: now.toISOString(),
  })
  assert.equal(analyticsRange(new Date('2024-03-01T00:00:00Z')).since, '2024-02-01T00:00:00.000Z')
  assert.equal(
    analyticsRange(new Date('2026-10-21T08:59:59+09:00')).today,
    '2026-10-20T00:00:00.000Z',
  )
})

test('analytics reads visitors rather than pageviews, production scope, and exact date windows', async () => {
  const original = globalThis.$fetch
  const range = analyticsRange(now)
  globalThis.$fetch = (async (
    url: string,
    options: { query: Record<string, unknown>; headers: Record<string, string> },
  ) => {
    assert.ok(url.endsWith('/visits/aggregate'))
    assert.equal(options.headers.Authorization, 'Bearer test-token')
    assert.equal(options.query.projectId, 'project')
    assert.equal(options.query.teamId, 'team_test')
    assert.equal(options.query.filter, "environment eq 'production'")
    assert.equal(options.query.by, 'day')
    assert.equal(options.query.until, range.until)
    assert.ok(Number(options.query.limit) >= 30)
    return {
      data:
        options.query.since === range.today
          ? [row(range.today, 2)]
          : [row(range.since, 4), row(range.today, 2)],
    }
  }) as typeof globalThis.$fetch
  try {
    const result = await projectAnalytics(settings, 'project', now)
    assert.equal(result.dau, 2)
    assert.equal(result.mau, 6)
    assert.equal(result.growthRate, null)
    assert.equal(result.source, 'real')
    assert.deepEqual(result.warnings, [])
  } finally {
    globalThis.$fetch = original
  }
})

test('empty successful responses are zero; malformed or truncated data is never zero', () => {
  const { since, until, today } = analyticsRange(now)
  assert.equal(parseVisits({ data: [] }, since, until), 0)
  for (const response of [
    null,
    {},
    { data: {} },
    { data: [row('invalid', 2)] },
    { data: [row(today, -1)] },
    { data: [row(today, 2), row(today, 2)] },
    { data: [row('2026-10-22T00:00:00Z', 2)] },
    { data: [row(today, 2)], query: { since: today } },
    { data: [{ timestamp: today, pageviews: 5 }] },
  ]) {
    assert.throws(() => parseVisits(response, since, until))
  }
})

test('monthly failure preserves real daily visitors without fabricating MAU', async () => {
  const original = globalThis.$fetch
  const range = analyticsRange(now)
  globalThis.$fetch = (async (_url: string, options: { query: { since: string } }) => {
    if (options.query.since === range.today) return { data: [row(range.today, 3)] }
    throw { statusCode: 402 }
  }) as typeof globalThis.$fetch
  try {
    const result = await projectAnalytics(settings, 'project', now)
    assert.equal(result.dau, 3)
    assert.equal(result.mau, null)
    assert.match(result.warnings![0]!, /plan/)
  } finally {
    globalThis.$fetch = original
  }
})

test('disabled, denied, rate-limited and network failures stay unavailable and never expose provider errors', async () => {
  const original = globalThis.$fetch
  try {
    for (const [error, message] of [
      [{ statusCode: 400, data: { error: { code: 'web_analytics_not_enabled' } } }, /not enabled/],
      [{ statusCode: 403 }, /access denied/],
      [{ statusCode: 429 }, /rate limit/],
      [new Error('Authorization: Bearer secret-token'), /could not be retrieved/],
    ] as const) {
      globalThis.$fetch = (async () => {
        throw error
      }) as typeof globalThis.$fetch
      const result = await projectAnalytics(settings, 'project', now)
      assert.equal(result.dau, null)
      assert.equal(result.mau, null)
      assert.equal(result.source, 'real')
      assert.match(result.warnings![0]!, message)
      assert.doesNotMatch(JSON.stringify(result), /secret-token|Authorization/)
    }
  } finally {
    globalThis.$fetch = original
  }
})

test('unavailable analytics are unranked and display a dash while recorded zero stays zero', () => {
  const project = mockProjects()[0]!
  project.analytics = { source: 'real', dau: null, mau: null, growthRate: null }
  assert.equal(metricText(project, 'dau'), '—')
  assert.equal(metricAvailable(project, 'dau'), false)
  assert.equal(solarAssignments([project], 'dau', now.getTime())[project.id]!.rank, null)
  project.analytics.dau = 0
  assert.equal(metricText(project, 'dau'), '0')
  assert.equal(metricAvailable(project, 'dau'), true)
})
