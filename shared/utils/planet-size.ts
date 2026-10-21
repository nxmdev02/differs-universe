import type { Metric, ProjectViewModel, DeployStatus } from '../types/project'

export const statusColors: Record<DeployStatus, string> = {
  READY: '#8edeb5',
  BUILDING: '#edbd78',
  QUEUED: '#d9c28b',
  ERROR: '#eb8794',
  UNKNOWN: '#8c98a9',
}
export function getPlanetRadius(value: number, maxValue: number) {
  const v = Number.isFinite(value) ? Math.max(0, value) : 0
  const ceiling = Number.isFinite(maxValue) ? Math.max(1, maxValue) : 1
  return 12 + (Math.log1p(Math.min(v, ceiling)) / Math.log1p(ceiling)) * 36
}
export function metricValue(project: ProjectViewModel, metric: Metric) {
  return metric === 'deployments' ? project.deployments30d.count : (project.analytics[metric] ?? 0)
}
export function metricAvailable(project: ProjectViewModel, metric: Metric) {
  return metric === 'deployments'
    ? project.deployments30d.available
    : project.analytics[metric] !== null
}
export function metricLabel(project: ProjectViewModel, metric: Metric) {
  return metric === 'mau' && project.analytics.source === 'real'
    ? '30d visitors'
    : metric.toUpperCase()
}
export function metricText(project: ProjectViewModel, metric: Metric) {
  return metricAvailable(project, metric) ? compactNumber(metricValue(project, metric)) : '—'
}
export function formatNumber(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}
export function compactNumber(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}
export function safeUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}
export function displayDate(value: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}
