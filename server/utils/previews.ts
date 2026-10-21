import manifest from '../assets/previews/manifest.json'
import type { ProjectViewModel } from '../../shared/types/project'
import { projectSiteUrl } from '../../shared/utils/project-appearance'

type Snapshot = { filename: string; url: string; capturedAt: string }
export function projectPreview(project: ProjectViewModel): Snapshot | undefined {
  const snapshot = (manifest as Record<string, Snapshot>)[project.id]
  return snapshot && snapshot.url === projectSiteUrl(project) ? snapshot : undefined
}
