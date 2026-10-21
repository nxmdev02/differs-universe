<script setup lang="ts">
import type { DeployStatus } from '#shared/types/project'
import { statusColors } from '#shared/utils/planet-size'
defineProps<{ status: DeployStatus; compact?: boolean }>()
</script>
<template>
  <span
    class="status-badge"
    :class="{ compact }"
    :style="{ '--status-color': statusColors[status] }"
    ><i /><span>{{ status.toLowerCase() }}</span></span
  >
</template>
