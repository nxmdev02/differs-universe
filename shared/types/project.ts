export type DeployStatus = 'READY' | 'BUILDING' | 'QUEUED' | 'ERROR' | 'UNKNOWN'
export type Metric = 'dau' | 'mau' | 'deployments'
export type DataSource = 'mock' | 'real'

export interface ProjectViewModel {
  id: string
  name: string
  framework: string | null
  domains: string[]
  productionUrl?: string | null
  preview?: { capturedAt: string; url: string }
  source: DataSource
  deployment: { status: DeployStatus; url: string | null; createdAt: string | null }
  github: {
    owner: string
    repo: string
    defaultBranch: string | null
    lastCommitAt: string | null
    lastCommitMessage: string | null
  } | null
  analytics: {
    dau: number | null
    /** Real mode: sum of daily visitors over 30 UTC calendar days, not deduplicated MAU. */
    mau: number | null
    growthRate: number | null
    source: DataSource
    fetchedAt?: string
    since?: string
    until?: string
    timezone?: 'UTC'
    warnings?: string[]
  }
  deployments30d: { count: number; source: DataSource; available: boolean }
  warnings: string[]
}
export interface ActivityItem {
  id: string
  kind: 'deployment' | 'commit'
  title: string
  detail: string
  date: string
  status?: DeployStatus
  url: string | null
}
export interface ProjectActivity {
  items: ActivityItem[]
  branches: string[]
  source: DataSource
  warnings: string[]
}
export interface ProjectsResponse {
  projects: ProjectViewModel[]
  mode: DataSource
  updatedAt: string
  warnings: string[]
}
