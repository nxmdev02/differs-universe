import type { Metric, ProjectViewModel } from '../types/project'
import { metricAvailable, metricValue, safeUrl } from './planet-size'

export const DORMANT_DAYS = 90
const DAY = 86400000

export function projectActivity(project: ProjectViewModel, now = Date.now()) {
  const dates = [project.deployment.createdAt, project.github?.lastCommitAt]
    .filter((date): date is string => !!date)
    .map(Date.parse)
    .filter(Number.isFinite)
  const latest = dates.length ? Math.max(...dates) : null
  const days = latest === null ? null : Math.max(0, Math.floor((now - latest) / DAY))
  return {
    lastActivityAt: latest === null ? null : new Date(latest).toISOString(),
    days,
    dormant: days !== null && days >= DORMANT_DAYS,
    basis: project.github?.lastCommitAt ? 'deployments & commits' : 'deployments',
  }
}

export type CelestialKind =
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'venus'
  | 'mars'
  | 'mercury'
  | 'pluto'
  | 'moon'
  | 'comet'
export interface CelestialAppearance {
  kind: CelestialKind
  label: string
  color: string
  accent: string
  radius: number
  orbit: number
  spin: number
  seed: number
  rank: number | null
}
// Order follows planetary diameter. Display radii and speeds are compressed for readability;
// Earth is deliberately enlarged as the workspace's central reference point.
export const SOLAR_BODIES: Omit<CelestialAppearance, 'seed' | 'rank'>[] = [
  {
    kind: 'jupiter',
    label: 'Jupiter',
    color: '#d9b58d',
    accent: '#fff0d2',
    radius: 46,
    orbit: 4,
    spin: 0.15,
  },
  {
    kind: 'saturn',
    label: 'Saturn',
    color: '#d9c29a',
    accent: '#eee2c4',
    radius: 35,
    orbit: 5,
    spin: 0.13,
  },
  {
    kind: 'uranus',
    label: 'Uranus',
    color: '#8bd0d4',
    accent: '#dcf5ef',
    radius: 28,
    orbit: 6,
    spin: -0.08,
  },
  {
    kind: 'neptune',
    label: 'Neptune',
    color: '#4276d0',
    accent: '#accdf8',
    radius: 26,
    orbit: 7,
    spin: 0.09,
  },
  {
    kind: 'venus',
    label: 'Venus',
    color: '#e5bd7d',
    accent: '#fff0c6',
    radius: 23,
    orbit: 1,
    spin: -0.025,
  },
  {
    kind: 'mars',
    label: 'Mars',
    color: '#c97954',
    accent: '#eec09b',
    radius: 19,
    orbit: 3,
    spin: 0.07,
  },
  {
    kind: 'mercury',
    label: 'Mercury',
    color: '#a9a29a',
    accent: '#ddd4c7',
    radius: 16,
    orbit: 0,
    spin: 0.035,
  },
  {
    kind: 'pluto',
    label: 'Pluto',
    color: '#bba69b',
    accent: '#f0dfcc',
    radius: 12,
    orbit: 8,
    spin: -0.03,
  },
]

export function projectAppearance(id: string) {
  let hash = 2166136261
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  return { ...SOLAR_BODIES[hash % SOLAR_BODIES.length]!, seed: hash % 10000, rank: null }
}

export function solarAssignments(projects: ProjectViewModel[], metric: Metric, now = Date.now()) {
  const assignments: Record<string, CelestialAppearance> = {}
  const active = projects
    .filter((project) => !projectActivity(project, now).dormant)
    .sort(
      (a, b) =>
        Number(metricAvailable(b, metric)) - Number(metricAvailable(a, metric)) ||
        metricValue(b, metric) - metricValue(a, metric) ||
        a.id.localeCompare(b.id),
    )
  for (const [index, project] of active.entries()) {
    const seed = projectAppearance(project.id).seed
    const available = metricAvailable(project, metric)
    // A quiet or unmeasured project still gets a solar body. Moons represent overflow,
    // not a lack of traffic; unavailable metrics never receive a numeric rank.
    const body = SOLAR_BODIES[index]
    assignments[project.id] = body
      ? { ...body, seed, rank: available ? index + 1 : null }
      : {
          kind: 'moon',
          label: available ? 'Moon' : 'Moon · unranked',
          color: '#afb8c3',
          accent: '#e6e9ec',
          radius: 9,
          orbit: -1,
          spin: 0.04,
          seed,
          rank: null,
        }
  }
  for (const project of projects.filter((item) => projectActivity(item, now).dormant)) {
    assignments[project.id] = {
      kind: 'comet',
      label: 'Comet',
      color: '#a6cbdc',
      accent: '#e7f5ff',
      radius: 10,
      orbit: 9,
      spin: 0.05,
      seed: projectAppearance(project.id).seed,
      rank: null,
    }
  }
  return assignments
}

/** Only real, HTTPS production destinations become navigable links. */
export function projectSiteUrl(project: ProjectViewModel) {
  if (project.source !== 'real') return undefined
  const domains = [...project.domains].sort(
    (a, b) => Number(a.endsWith('.vercel.app')) - Number(b.endsWith('.vercel.app')),
  )
  for (const value of [...domains.map((domain) => `https://${domain}`), project.productionUrl]) {
    const safe = safeUrl(value)
    if (safe && !new URL(safe).username && !new URL(safe).password) return safe
  }
  return undefined
}
