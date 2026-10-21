import type { ProjectViewModel } from '../../shared/types/project'
import type { Settings } from '../utils/settings'
import { vercelRequest } from './vercel'

const DAY = 86400000
type Analytics = ProjectViewModel['analytics']

export function analyticsRange(now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return {
    today: new Date(today).toISOString(),
    since: new Date(today - 29 * DAY).toISOString(),
    until: now.toISOString(),
  }
}

/** Validate the provider response before treating an empty period as zero traffic. */
export function parseVisits(response: unknown, since: string, until: string) {
  const result = response as { data?: unknown; query?: { since?: string | number } }
  if (!result || !Array.isArray(result.data)) throw new Error('Invalid analytics response')
  if (result.query?.since !== undefined) {
    const actualStart = new Date(result.query.since).getTime()
    if (!Number.isFinite(actualStart) || actualStart > Date.parse(since))
      throw new Error('Requested analytics period is unavailable')
  }
  const days = new Set<string>()
  let visitors = 0
  for (const row of result.data) {
    if (!row || typeof row !== 'object') throw new Error('Invalid analytics row')
    const { timestamp, visitors: count, pageviews } = row
    const time = typeof timestamp === 'string' ? Date.parse(timestamp) : NaN
    if (
      !Number.isFinite(time) ||
      time < Date.parse(since) ||
      time > Date.parse(until) ||
      new Date(time).toISOString().slice(11) !== '00:00:00.000Z' ||
      days.has(timestamp) ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      !Number.isSafeInteger(pageviews) ||
      pageviews < count
    )
      throw new Error('Invalid analytics totals')
    days.add(timestamp)
    visitors += count
  }
  return visitors
}

function failureMessage(error: unknown, period: string) {
  const code = (error as { data?: { error?: { code?: string } } })?.data?.error?.code
  if (code === 'web_analytics_not_enabled')
    return `${period}: Web Analytics is not enabled. Open this project's Vercel dashboard → Analytics → Enable.`
  const status =
    (error as { statusCode?: number; status?: number })?.statusCode ||
    (error as { status?: number })?.status
  if (status === 401 || status === 403)
    return `${period}: Analytics access denied. Check the Vercel token and team scope.`
  if (status === 402) return `${period}: Analytics is unavailable on the current Vercel plan.`
  if (status === 404)
    return `${period}: Analytics is not available. Check that Web Analytics is enabled.`
  if (status === 429) return `${period}: Vercel rate limit reached. Try again shortly.`
  return `${period}: Analytics could not be retrieved for the requested period. Try syncing again.`
}

export async function projectAnalytics(
  settings: Settings,
  projectId: string,
  now = new Date(),
): Promise<Analytics> {
  const range = analyticsRange(now)
  const query = async (since: string) => {
    const response = await vercelRequest<unknown>(
      settings,
      '/v1/query/web-analytics/visits/aggregate',
      {
        projectId,
        by: 'day',
        since,
        until: range.until,
        limit: 100,
        filter: "environment eq 'production'",
      },
    )
    return parseVisits(response, since, range.until)
  }
  // Keep today's visitors usable even if the plan cannot return the 30-day period.
  const [daily, monthly] = await Promise.allSettled([query(range.today), query(range.since)])
  return {
    dau: daily.status === 'fulfilled' ? daily.value : null,
    mau: monthly.status === 'fulfilled' ? monthly.value : null,
    growthRate: null,
    source: 'real',
    fetchedAt: now.toISOString(),
    since: range.since,
    until: range.until,
    timezone: 'UTC',
    warnings: [
      ...(daily.status === 'rejected' ? [failureMessage(daily.reason, 'DAU')] : []),
      ...(monthly.status === 'rejected' ? [failureMessage(monthly.reason, '30-day visitors')] : []),
    ],
  }
}
