import type { ActivityItem } from '../../shared/types/project'
import type { Settings } from '../utils/settings'

interface Commit {
  sha: string
  html_url: string
  commit: { message: string; author: { date: string } | null; committer: { date: string } | null }
}
export async function githubActivity(settings: Settings, owner: string, repo: string) {
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) throw new Error('Invalid repository')
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const options = {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'differs-universe',
      ...(settings.githubToken ? { Authorization: `Bearer ${settings.githubToken}` } : {}),
    },
    timeout: 8000,
    retry: 0 as const,
  }
  const [repository, commits, branches] = await Promise.allSettled([
    $fetch<{ default_branch: string }>(base, options),
    $fetch<Commit[]>(`${base}/commits`, { ...options, query: { per_page: 10 } }),
    $fetch<{ name: string }[]>(`${base}/branches`, { ...options, query: { per_page: 100 } }),
  ])
  const commitList =
    commits.status === 'fulfilled' && Array.isArray(commits.value) ? commits.value : []
  return {
    defaultBranch: repository.status === 'fulfilled' ? repository.value.default_branch : null,
    lastCommitAt:
      commitList[0]?.commit.committer?.date || commitList[0]?.commit.author?.date || null,
    lastCommitMessage: commitList[0]?.commit.message.split('\n')[0] || null,
    branches:
      branches.status === 'fulfilled' && Array.isArray(branches.value)
        ? branches.value.map((branch) => branch.name)
        : [],
    items: commitList
      .map((commit) => ({
        id: commit.sha,
        kind: 'commit',
        title: commit.commit.message.split('\n')[0] || 'Commit',
        detail: commit.sha.slice(0, 7),
        date: commit.commit.committer?.date || commit.commit.author?.date || '',
        url: commit.html_url,
      }))
      .filter((commit) => commit.date) as ActivityItem[],
    warnings: [repository, commits, branches].some((result) => result.status === 'rejected')
      ? ['Some GitHub activity is unavailable. Project and deployment data are still available.']
      : [],
  }
}
