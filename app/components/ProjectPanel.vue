<script setup lang="ts">
import type { ProjectViewModel, ProjectActivity } from '#shared/types/project'
import { displayDate, formatNumber, safeUrl } from '#shared/utils/planet-size'
import { projectSiteUrl } from '#shared/utils/project-appearance'
const props = defineProps<{ project: ProjectViewModel; revision: number }>()
const emit = defineEmits<{ close: [] }>()
const detailUrl = computed(() => `/api/projects/${encodeURIComponent(props.project.id)}`)
const {
  data: detail,
  status: detailStatus,
  error: detailError,
  refresh: refreshDetail,
} = useFetch<ProjectViewModel>(detailUrl)
const {
  data: activity,
  status,
  error,
  refresh: refreshActivity,
} = useFetch<ProjectActivity>(() => `${detailUrl.value}/activity`)
const current = computed(() =>
  detail.value?.id === props.project.id ? detail.value : props.project,
)
const activityTab = ref<'all' | 'deployment' | 'commit'>('all')
const items = computed(() =>
  (activity.value?.items || []).filter(
    (item) => activityTab.value === 'all' || item.kind === activityTab.value,
  ),
)
watch(
  () => props.revision,
  () => {
    refreshDetail()
    refreshActivity()
  },
)
const githubUrl = computed(() =>
  current.value.github
    ? `https://github.com/${encodeURIComponent(current.value.github.owner)}/${encodeURIComponent(current.value.github.repo)}`
    : undefined,
)
const visitUrl = computed(() => projectSiteUrl(current.value))
const closeButton = ref<HTMLButtonElement>()
onMounted(() => {
  if (window.matchMedia('(max-width: 760px)').matches) closeButton.value?.focus()
})
</script>
<template>
  <aside class="project-panel" aria-label="Project details" @keydown.esc="emit('close')">
    <div class="panel-top">
      <span class="eyebrow">PROJECT OVERVIEW</span
      ><button
        ref="closeButton"
        class="icon-button"
        aria-label="Close project details"
        @click="emit('close')"
      >
        <AppIcon name="close" :size="17" />
      </button>
    </div>
    <div class="project-identity">
      <div>
        <h2>{{ current.name }}</h2>
        <span class="muted small">{{ current.framework || 'Other framework' }}</span>
      </div>
      <span class="source-badge">{{ current.source === 'mock' ? 'DEMO' : 'LIVE' }}</span>
    </div>
    <a
      v-if="visitUrl"
      :href="visitUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="domain-link"
      >{{ current.domains[0] || 'Visit deployment' }}<AppIcon name="external" :size="14"
    /></a>
    <span v-else class="domain-link muted"
      >{{ current.domains[0] || 'No domain connected' }}<AppIcon name="globe" :size="14"
    /></span>
    <div class="deployment-summary">
      <div class="row-between">
        <span>Latest deployment</span><StatusBadge :status="current.deployment.status" />
      </div>
      <div class="row-between muted small">
        <span>{{ displayDate(current.deployment.createdAt) }} KST</span
        ><AppIcon name="layers" :size="14" />
      </div>
    </div>
    <div class="section-heading">
      <h3>Audience</h3>
      <span class="source-badge">{{
        current.analytics.source === 'mock'
          ? 'DEMO DATA'
          : current.analytics.dau === null && current.analytics.mau === null
            ? 'UNAVAILABLE'
            : 'VERCEL'
      }}</span>
    </div>
    <div class="audience-grid">
      <div>
        <span class="muted small">{{
          current.analytics.source === 'real' ? 'DAU · today, UTC' : 'Daily active users'
        }}</span
        ><strong>{{ formatNumber(current.analytics.dau) }}</strong>
      </div>
      <div>
        <span class="muted small">{{
          current.analytics.source === 'real' ? '30-day visitor sum' : 'Monthly active users'
        }}</span
        ><strong>{{ formatNumber(current.analytics.mau) }}</strong>
      </div>
    </div>
    <div
      v-if="current.analytics.growthRate !== null"
      class="growth-note"
      :class="{ negative: current.analytics.growthRate < 0 }"
    >
      <AppIcon :name="current.analytics.growthRate < 0 ? 'decrease' : 'up'" :size="13" />{{
        Math.abs(current.analytics.growthRate)
      }}% <span>sample monthly growth</span>
    </div>
    <p v-if="current.analytics.source === 'real'" class="small muted analytics-note">
      {{
        current.analytics.dau === null
          ? 'Today’s analytics could not be loaded.'
          : current.analytics.dau === 0
            ? 'No visits recorded today. Check Analytics is enabled and deployed if traffic is expected.'
            : 'Production visitors since 00:00 UTC (09:00 KST).'
      }}
      30-day totals sum daily visitors, including today; they are not unique monthly users.
    </p>
    <div class="deployment-count">
      <span>Deployments <span class="muted">/ 30 days</span></span
      ><strong>{{ current.deployments30d.available ? current.deployments30d.count : '—' }}</strong
      ><span class="source-badge">{{
        current.deployments30d.source === 'mock' ? 'DEMO' : 'LIVE'
      }}</span>
    </div>
    <div class="section-heading">
      <h3>Repository</h3>
      <AppIcon name="github" :size="16" />
    </div>
    <div v-if="current.github" class="repo-card">
      <a
        v-if="current.source === 'real'"
        :href="githubUrl"
        target="_blank"
        rel="noopener noreferrer"
        >{{ current.github.owner }}/{{ current.github.repo
        }}<AppIcon name="external" :size="13" /></a
      ><span v-else>{{ current.github.owner }}/{{ current.github.repo }}</span>
      <div class="repo-branch">
        <AppIcon name="branch" :size="13" />{{ current.github.defaultBranch || 'Unknown branch'
        }}<span
          >{{ activity?.branches.length || '—' }} branches<span
            v-if="(activity?.branches.length || 0) >= 100"
          >
            (first 100)</span
          ></span
        >
      </div>
      <p v-if="current.github.lastCommitMessage" class="latest-commit">
        {{ current.github.lastCommitMessage }}
      </p>
    </div>
    <p v-else class="empty-note">No GitHub repository connected.</p>
    <p v-if="detailStatus === 'pending'" class="small muted" role="status">
      Updating project details…
    </p>
    <div v-if="detailError" class="inline-warning" role="alert">
      Could not update project details. <button @click="refreshDetail()">Retry</button>
    </div>
    <div
      v-for="warning in [...new Set([...current.warnings, ...(activity?.warnings || [])])]"
      :key="warning"
      class="inline-warning"
    >
      {{ warning }}
    </div>
    <div class="section-heading activity-heading">
      <h3>Recent activity</h3>
      <span class="source-badge">{{ current.source === 'mock' ? 'DEMO' : 'LIVE' }}</span>
    </div>
    <div class="activity-tabs" aria-label="Filter activity">
      <button
        v-for="tab in ['all', 'deployment', 'commit'] as const"
        :key="tab"
        :class="{ active: activityTab === tab }"
        :aria-pressed="activityTab === tab"
        @click="activityTab = tab"
      >
        {{ tab === 'all' ? 'All' : tab === 'deployment' ? 'Deployments' : 'Commits' }}
      </button>
    </div>
    <p v-if="status === 'pending'" class="empty-note" role="status">Loading activity…</p>
    <div v-else-if="error" class="inline-warning" role="alert">
      Activity could not be loaded. <button @click="refreshActivity()">Retry</button>
    </div>
    <ol v-else-if="items.length" class="timeline">
      <li v-for="item in items" :key="item.id">
        <span class="timeline-icon" :class="{ failed: item.status === 'ERROR' }"
          ><AppIcon
            :name="item.kind === 'commit' ? 'commit' : item.status === 'ERROR' ? 'alert' : 'layers'"
            :size="13"
        /></span>
        <div>
          <a
            v-if="safeUrl(item.url)"
            :href="safeUrl(item.url)"
            target="_blank"
            rel="noopener noreferrer"
            >{{ item.title }}<AppIcon name="external" :size="11"
          /></a>
          <p v-else>{{ item.title }}</p>
          <span>{{ item.detail }}</span
          ><time :datetime="item.date">{{ displayDate(item.date) }} KST</time>
        </div>
      </li>
    </ol>
    <p v-else class="empty-note">
      No {{ activityTab === 'all' ? 'recent activity' : `${activityTab}s` }} to show.
    </p>
    <div class="panel-bottom">
      <AppIcon name="info" :size="13" /><span>{{
        current.analytics.source === 'mock'
          ? 'Audience metrics are illustrative sample data.'
          : `Vercel Web Analytics · ${current.analytics.fetchedAt ? displayDate(current.analytics.fetchedAt) + ' KST' : 'UTC'} · 60s cache`
      }}</span>
    </div>
  </aside>
</template>
