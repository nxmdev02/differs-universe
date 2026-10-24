<script setup lang="ts">
import type { Metric, ProjectViewModel } from '#shared/types/project'
import {
  projectActivity,
  type CelestialAppearance,
  projectSiteUrl,
} from '#shared/utils/project-appearance'
import { displayDate, metricLabel, metricText, metricAvailable } from '#shared/utils/planet-size'
const props = defineProps<{
  project: ProjectViewModel
  appearance: CelestialAppearance
  metric: Metric
}>()
defineEmits<{ select: [project: ProjectViewModel]; close: [] }>()
const failed = ref(false)
const activity = computed(() => projectActivity(props.project))
const url = computed(() => projectSiteUrl(props.project))
const hostname = computed(() => (url.value ? new URL(url.value).hostname : 'No production domain'))
watch(
  () => props.project.id,
  () => {
    failed.value = false
  },
)
</script>
<template>
  <div class="planet-preview-content" :style="{ '--planet-color': appearance.color }">
    <div class="preview-image">
      <img
        v-if="project.preview && !failed"
        :src="project.preview.url"
        :alt="`${project.name} website snapshot`"
        @error="failed = true"
      />
      <div v-else class="preview-placeholder">
        <AppIcon name="globe" :size="34" /><strong>{{ project.name }}</strong
        ><span>{{
          project.source === 'mock' ? 'Sample project' : 'Website preview unavailable'
        }}</span>
      </div>
      <span class="preview-kind">{{
        activity.dormant ? 'COMET · 90D+' : appearance.label.toUpperCase()
      }}</span>
      <button class="preview-close icon-button" aria-label="Close preview" @click="$emit('close')">
        <AppIcon name="close" :size="14" />
      </button>
    </div>
    <div class="preview-body">
      <div class="row-between">
        <strong>{{ project.name }}</strong
        ><StatusBadge :status="project.deployment.status" />
      </div>
      <span class="preview-domain">{{ hostname }}</span>
      <span class="preview-mapping">{{
        appearance.kind === 'comet'
          ? '90+ days without known activity'
          : `${appearance.label} · ${(project.analytics.mau ?? 0) > 0 ? `${metricLabel(project, 'mau')} priority` : 'recent activity'}`
      }}</span>
      <p>
        {{ metricText(project, metric) }} {{ metricLabel(project, metric)
        }}<span>{{
          metric === 'deployments'
            ? 'Deployments · last 30 days'
            : project.analytics.source === 'real'
              ? 'Vercel Analytics · UTC'
              : 'Sample analytics'
        }}</span>
      </p>
      <span class="preview-mapping">{{
        !metricAvailable(project, metric)
          ? 'Metric unavailable'
          : `#${appearance.rank} by ${metricLabel(project, metric)} · equal values share a rank`
      }}</span>
      <p v-if="activity.days !== null">
        {{ activity.days === 0 ? 'Active today' : `${activity.days} days since last known activity`
        }}<span>Based on {{ activity.basis }}</span>
      </p>
      <p v-else>Activity date unavailable</p>
      <span v-if="project.preview && !failed" class="preview-captured"
        >Snapshot · {{ displayDate(project.preview.capturedAt) }} KST</span
      >
      <div class="preview-actions">
        <a v-if="url" :href="url" target="_blank" rel="noopener noreferrer"
          >Open website<AppIcon name="external" :size="13"
        /></a>
        <button @click="$emit('select', project)">
          Project details<AppIcon name="right" :size="13" />
        </button>
      </div>
    </div>
  </div>
</template>
