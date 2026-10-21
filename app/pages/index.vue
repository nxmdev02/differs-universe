<script setup lang="ts">
import type { Metric, DeployStatus, ProjectViewModel } from '#shared/types/project'
import {
  solarAssignments,
  projectActivity,
  sortProjectsByTraffic,
} from '#shared/utils/project-appearance'
import {
  formatNumber,
  compactNumber,
  metricValue,
  metricAvailable,
  statusColors,
  displayDate,
} from '#shared/utils/planet-size'
const { auth } = useDashboardAuth()
const { data, status, error, refresh } = await useFetch('/api/projects', {
  async onResponseError({ response }) {
    if (response.status === 401 && auth.value?.enabled && import.meta.client)
      await navigateTo('/login', { external: true })
  },
})
const projects = computed(() => data.value?.projects || [])
const query = ref('')
const statusFilter = ref<DeployStatus | 'ALL'>('ALL')
const metric = ref<Metric>('dau')
const assignments = computed(() => solarAssignments(projects.value, metric.value))
const selectedId = ref<string | null>(null)
const view = ref<'universe' | 'projects'>('universe')
const paused = ref(false)
const settingsOpen = ref(false)
const revision = ref(0)
const scene = ref<{
  reset: () => void
  zoomBy: (factor: number) => void
  focus: (id: string) => void
}>()
const searchInput = ref<HTMLInputElement>()
const filtered = computed(() =>
  sortProjectsByTraffic(projects.value).filter(
    (project) =>
      (!query.value ||
        `${project.name} ${project.domains.join(' ')} ${project.github?.repo || ''}`
          .toLowerCase()
          .includes(query.value.toLowerCase())) &&
      (statusFilter.value === 'ALL' || project.deployment.status === statusFilter.value),
  ),
)
const selected = computed(() => projects.value.find((project) => project.id === selectedId.value))
const totalDau = computed(() =>
  projects.value.some((project) => project.analytics.dau !== null)
    ? projects.value.reduce((total, project) => total + (project.analytics.dau ?? 0), 0)
    : null,
)
const missingDau = computed(
  () => projects.value.filter((project) => project.analytics.dau === null).length,
)
const readyCount = computed(
  () => projects.value.filter((project) => project.deployment.status === 'READY').length,
)
const cometCount = computed(
  () => projects.value.filter((project) => projectActivity(project).dormant).length,
)
const metricLabels = computed(() => ({
  dau: 'DAU',
  mau: data.value?.mode === 'real' ? '30d visitors' : 'MAU',
  deployments: 'Deployments',
}))
const sampleMetric = computed(() =>
  projects.value.some((project) =>
    metric.value === 'deployments'
      ? project.deployments30d.source === 'mock'
      : project.analytics.source === 'mock',
  ),
)
function selectProject(project: ProjectViewModel) {
  selectedId.value = project.id
  scene.value?.focus(project.id)
}
function reset() {
  query.value = ''
  statusFilter.value = 'ALL'
  selectedId.value = null
  scene.value?.reset()
}
function goHome() {
  reset()
  view.value = 'universe'
}
function closePanel() {
  const id = selectedId.value
  selectedId.value = null
  nextTick(() =>
    document
      .querySelector<HTMLButtonElement>(`[data-project-id="${CSS.escape(id || '')}"]`)
      ?.focus({ preventScroll: true }),
  )
}
async function synchronize() {
  await refresh()
  revision.value++
}
watch(projects, (value) => {
  if (selectedId.value && !value.some((project) => project.id === selectedId.value))
    selectedId.value = null
})
watch(filtered, (value) => {
  if (selectedId.value && !value.some((project) => project.id === selectedId.value))
    selectedId.value = null
})
function keyboard(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    searchInput.value?.focus()
  }
  if (event.key === 'Escape' && !settingsOpen.value) {
    selectedId.value = null
    searchInput.value?.blur()
  }
}
let interval: ReturnType<typeof setInterval>
onMounted(() => {
  window.addEventListener('keydown', keyboard)
  interval = setInterval(() => {
    if (!document.hidden && !settingsOpen.value) synchronize()
  }, 60000)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', keyboard)
  clearInterval(interval)
})
</script>
<template>
  <div class="dashboard">
    <a class="skip-link" href="#main">Skip to projects</a>
    <aside class="rail" aria-label="Main navigation">
      <button class="brand" aria-label="differs home" @click="goHome">differs<span /></button>
      <div class="rail-divider" />
      <nav>
        <button
          class="nav-item"
          :class="{ active: view === 'universe' }"
          :aria-current="view === 'universe' ? 'page' : undefined"
          @click="view = 'universe'"
        >
          <AppIcon name="orbit" :size="22" /><span>Universe</span></button
        ><button
          class="nav-item"
          :class="{ active: view === 'projects' }"
          :aria-current="view === 'projects' ? 'page' : undefined"
          @click="view = 'projects'"
        >
          <AppIcon name="grid" :size="20" /><span>Projects</span></button
        ><button class="nav-item" disabled title="Workspace activity is coming soon">
          <AppIcon name="activity" :size="21" /><span>Activity</span></button
        ><button class="nav-item" disabled title="Workspace deployments are coming soon">
          <AppIcon name="layers" :size="21" /><span>Deploys</span>
        </button>
      </nav>
      <div class="rail-bottom">
        <button class="nav-item" @click="settingsOpen = true">
          <AppIcon name="settings" :size="20" /><span>Settings</span>
        </button>
        <button
          class="workspace-avatar"
          :title="auth?.user?.email || 'Personal workspace'"
          aria-label="Account settings"
          @click="settingsOpen = true"
        >
          {{ auth?.user?.name.slice(0, 1).toLowerCase() || 'k' }}<span />
        </button>
      </div>
    </aside>
    <div class="workspace">
      <main id="main">
        <div class="page-heading">
          <div>
            <h1>Project universe<span>.</span></h1>
            <p>A world in every project. A place to call home.</p>
          </div>
          <button
            class="secondary-button refresh-button"
            aria-label="Sync projects"
            :disabled="status === 'pending'"
            @click="synchronize"
          >
            <AppIcon name="refresh" :class="{ spinning: status === 'pending' }" :size="15" />{{
              status === 'pending' ? 'Syncing…' : 'Sync'
            }}
          </button>
        </div>
        <div class="overview-strip">
          <div>
            <span class="overview-dot" /><strong>{{
              projects.length.toString().padStart(2, '0')
            }}</strong
            ><span>projects in orbit</span>
          </div>
          <span class="strip-separator" />
          <div>
            <i class="ready-dot" /><strong>{{ readyCount }}</strong
            ><span>ready</span>
          </div>
          <div
            class="overview-audience"
            title="Sum of today's visitors across projects (UTC); visitors are not deduplicated across projects."
          >
            <AppIcon name="activity" :size="14" /><strong>{{ compactNumber(totalDau) }}</strong
            ><span>{{
              data?.mode === 'real'
                ? `visitors today · UTC${missingDau ? ' · partial' : ''}`
                : 'daily active users · sample'
            }}</span>
          </div>
        </div>
        <div
          class="universe-shell"
          :class="{ 'has-selection': !!selected, 'is-list': view === 'projects' }"
        >
          <div class="universe-toolbar">
            <div class="view-tabs">
              <button
                :class="{ active: view === 'universe' }"
                :aria-pressed="view === 'universe'"
                @click="view = 'universe'"
              >
                <AppIcon name="orbit" :size="15" />Universe</button
              ><button
                :class="{ active: view === 'projects' }"
                :aria-pressed="view === 'projects'"
                @click="view = 'projects'"
              >
                <AppIcon name="grid" :size="15" />List
              </button>
            </div>
            <div class="metric-controls">
              <span :title="sampleMetric ? 'The selected metric uses sample data.' : undefined"
                >Show{{ sampleMetric ? ' · sample' : '' }}</span
              >
              <div class="metric-switch" aria-label="Displayed project metric">
                <button
                  v-for="(label, key) in metricLabels"
                  :key="key"
                  :class="{ active: metric === key }"
                  :aria-pressed="metric === key"
                  :title="
                    key === 'dau'
                      ? 'Visitors today, since 00:00 UTC'
                      : key === 'mau'
                        ? 'Sum of daily visitors over 30 UTC calendar days, including today. Not deduplicated monthly users.'
                        : 'Deployments in the last 30 days'
                  "
                  @click="metric = key"
                >
                  {{ label }}
                </button>
              </div>
              <button
                class="icon-button orbit-toggle"
                :aria-label="paused ? 'Resume orbit' : 'Pause orbit'"
                :aria-pressed="paused"
                @click="paused = !paused"
              >
                <AppIcon :name="paused ? 'play' : 'pause'" :size="15" />
              </button>
            </div>
          </div>
          <div
            class="universe-body"
            :style="{
              '--mobile-orbit-height': `${Math.max(600, Math.ceil(projects.length / 2) * 110 + 200)}px`,
            }"
          >
            <aside class="project-list">
              <div class="list-title">
                <h2>
                  Projects <span>{{ projects.length }}</span>
                </h2>
                <span
                  class="list-sort"
                  title="DAU, highest first; ties and projects without visitors use the latest deployment or commit"
                  >DAU ↓ · Updated</span
                >
              </div>
              <label class="search-field"
                ><AppIcon name="search" :size="15" /><input
                  ref="searchInput"
                  v-model="query"
                  type="search"
                  placeholder="Find project"
                  aria-label="Search projects"
                /><kbd>⌘ K</kbd></label
              >
              <div class="filter-field">
                <AppIcon name="filter" :size="13" /><select
                  v-model="statusFilter"
                  aria-label="Filter by deployment status"
                >
                  <option value="ALL">All statuses</option>
                  <option
                    v-for="filter in ['READY', 'BUILDING', 'QUEUED', 'ERROR', 'UNKNOWN'] as const"
                    :key="filter"
                    :value="filter"
                  >
                    {{ filter.charAt(0) + filter.slice(1).toLowerCase() }}
                  </option></select
                ><AppIcon name="down" :size="12" />
              </div>
              <div class="project-items">
                <button
                  v-for="project in filtered"
                  :key="project.id"
                  :data-project-id="project.id"
                  class="project-row"
                  :class="{ selected: selectedId === project.id }"
                  :aria-pressed="selectedId === project.id"
                  @click="selectProject(project)"
                >
                  <span
                    class="mini-planet"
                    :class="{ 'mini-comet': projectActivity(project).dormant }"
                    :data-body="assignments[project.id]!.kind"
                    :style="{ '--planet-color': assignments[project.id]!.color }"
                  /><span class="project-row-text"
                    ><strong>{{ project.name }}</strong
                    ><span
                      class="project-row-dau"
                      :title="
                        project.analytics.source === 'mock'
                          ? 'Sample DAU'
                          : project.analytics.dau === null
                            ? project.analytics.warnings?.[0] || 'Analytics unavailable'
                            : 'Visitors today · UTC'
                      "
                      >{{ formatNumber(project.analytics.dau) }} DAU</span
                    ></span
                  ><span
                    class="row-status"
                    :style="{ background: statusColors[project.deployment.status] }"
                    :title="project.deployment.status"
                  /><span class="sr-only">{{ project.deployment.status }}</span
                  ><AppIcon name="right" :size="13" />
                </button>
                <p v-if="!filtered.length" class="empty-note">
                  {{ status === 'pending' ? 'Finding your projects…' : 'No matching projects.' }}
                </p>
              </div>
              <div class="list-footer">
                <span class="vercel-triangle" /><span>{{
                  data?.mode === 'real' ? 'Synced from Vercel' : 'Vercel sample projects'
                }}</span
                ><span class="source-badge">{{ data?.mode === 'real' ? 'LIVE' : 'DEMO' }}</span>
              </div>
            </aside>
            <section class="universe-stage" aria-label="Project universe">
              <div v-if="error" class="stage-message" role="alert">
                <AppIcon name="alert" :size="30" />
                <h2>We couldn’t reach your universe.</h2>
                <p>Check your Vercel token and team scope, then try again.</p>
                <button class="secondary-button" @click="synchronize">Try again</button>
              </div>
              <div
                v-else-if="status === 'pending' && !projects.length"
                class="stage-message"
                role="status"
              >
                <AppIcon name="orbit" class="spinning" :size="36" />
                <p>Finding your place in the universe…</p>
              </div>
              <div v-else-if="!filtered.length" class="stage-message">
                <AppIcon name="search" :size="30" />
                <h2>
                  {{ projects.length ? 'No planets in sight.' : 'Your universe starts here.' }}
                </h2>
                <p>
                  {{
                    projects.length
                      ? 'Try a different name or deployment status.'
                      : 'Projects will appear here when they are added to Vercel.'
                  }}
                </p>
                <button v-if="projects.length" class="secondary-button" @click="reset">
                  Clear filters
                </button>
              </div>
              <template v-else-if="view === 'universe'">
                <EventHorizon class="universe-horizon" :paused="paused || settingsOpen" flyby />
                <ObservatoryFrame />
                <div class="scene-caption">
                  <span>{{ projects.length - cometCount }} planets · {{ cometCount }} comets</span>
                  <span
                    :title="
                      metric === 'deployments'
                        ? 'Fixed body sizes, assigned by DAU then recent deployment or commit. Glow follows DAU; a ripple marks a successful deployment in the last 24 hours.'
                        : 'Fixed body sizes, assigned by DAU then recent deployment or commit. More visitors create a stronger glow; a ripple marks a successful deployment in the last 24 hours.'
                    "
                  >
                    DAU / recency · Glow:
                    {{ metric === 'deployments' ? 'DAU' : metricLabels[metric] }}
                  </span>
                </div>
                <ClientOnly
                  ><UniverseScene
                    ref="scene"
                    :projects="projects"
                    :visible-ids="filtered.map((project) => project.id)"
                    :metric="metric"
                    :selected-id="selectedId"
                    :paused="paused"
                    :suspended="settingsOpen"
                    @select="selectProject"
                  />
                  <template #fallback
                    ><div class="stage-message">Preparing the universe…</div></template
                  ></ClientOnly
                >
                <div class="scene-bottom">
                  <span
                    ><AppIcon name="move" :size="13" />Hover to preview <i>·</i> Click to
                    visit</span
                  >
                  <div class="camera-controls">
                    <button class="icon-button" aria-label="Zoom out" @click="scene?.zoomBy(0.8)">
                      <AppIcon name="minus" :size="16" /></button
                    ><button class="icon-button" aria-label="Zoom in" @click="scene?.zoomBy(1.25)">
                      <AppIcon name="plus" :size="16" /></button
                    ><span /><button
                      class="icon-button"
                      aria-label="Reset camera"
                      @click="scene?.reset()"
                    >
                      <AppIcon name="reset" :size="15" />
                    </button>
                  </div></div
              ></template>
              <div v-else class="project-grid">
                <button
                  v-for="project in filtered"
                  :key="project.id"
                  class="project-card"
                  :class="{ selected: selectedId === project.id }"
                  @click="selectProject(project)"
                >
                  <div class="row-between">
                    <span
                      class="mini-planet"
                      :class="{ 'mini-comet': projectActivity(project).dormant }"
                      :data-body="assignments[project.id]!.kind"
                      :style="{ '--planet-color': assignments[project.id]!.color }"
                    /><StatusBadge :status="project.deployment.status" />
                  </div>
                  <h2>{{ project.name }}</h2>
                  <span class="muted small"
                    >{{ assignments[project.id]!.label }} ·
                    {{ project.framework || 'Other framework' }}</span
                  >
                  <div class="card-metric">
                    <strong>{{
                      !metricAvailable(project, metric)
                        ? '—'
                        : formatNumber(metricValue(project, metric))
                    }}</strong
                    ><span>{{ metricLabels[metric] }}</span
                    ><span class="source-badge">{{
                      !metricAvailable(project, metric)
                        ? 'UNAVAILABLE'
                        : (metric === 'deployments'
                              ? project.deployments30d.source
                              : project.analytics.source) === 'real'
                          ? 'LIVE'
                          : 'DEMO'
                    }}</span>
                  </div>
                  <div class="card-footer">View project<AppIcon name="external" :size="15" /></div>
                </button>
              </div>
            </section>
            <button
              v-if="selected"
              class="mobile-panel-backdrop"
              aria-label="Dismiss project details"
              @click="closePanel"
            />
            <ProjectPanel
              v-if="selected"
              :key="selected.id"
              :project="selected"
              :revision="revision"
              @close="closePanel"
            />
          </div>
          <div class="universe-footer">
            <div class="status-legend">
              <span
                v-for="legend in ['READY', 'BUILDING', 'ERROR', 'QUEUED', 'UNKNOWN'] as const"
                :key="legend"
                ><i :style="{ background: statusColors[legend] }" />{{ legend.toLowerCase() }}</span
              >
            </div>
          </div>
        </div>
        <div v-for="warning in data?.warnings" :key="warning" class="inline-warning" role="status">
          {{ warning }}
        </div>
        <footer class="page-footer">
          <span><span class="footer-spark">✦</span> A space for everything you’re making.</span
          ><span v-if="data"
            >Last synced {{ displayDate(data.updatedAt) }} KST <span class="footer-dot">·</span>
            {{
              data.mode === 'mock' ? 'Exploring demo data' : 'Vercel Analytics · UTC · 60s cache'
            }}</span
          >
        </footer>
      </main>
    </div>
    <SettingsDialog v-if="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>
