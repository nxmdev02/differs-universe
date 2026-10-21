<script setup lang="ts">
defineProps<{ paused?: boolean }>()
const id = useId()
const host = ref<HTMLDivElement>()
const visible = useSceneVisibility(host)
</script>
<template>
  <div ref="host" class="event-horizon" :class="{ still: paused || !visible }" aria-hidden="true">
    <svg viewBox="0 0 720 340" fill="none" focusable="false">
      <defs>
        <radialGradient :id="`${id}-halo`">
          <stop stop-color="#ebc58b" stop-opacity=".22" />
          <stop offset=".45" stop-color="#bb8248" stop-opacity=".08" />
          <stop offset="1" stop-color="#bb8248" stop-opacity="0" />
        </radialGradient>
        <linearGradient
          :id="`${id}-light`"
          x1="90"
          y1="170"
          x2="630"
          y2="170"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#b87838" stop-opacity="0" />
          <stop offset=".23" stop-color="#c79252" stop-opacity=".6" />
          <stop offset=".44" stop-color="#fff4d7" />
          <stop offset=".6" stop-color="#f2d2a1" />
          <stop offset=".83" stop-color="#bb8042" stop-opacity=".5" />
          <stop offset="1" stop-color="#b87838" stop-opacity="0" />
        </linearGradient>
        <filter :id="`${id}-bloom`" x="-50%" y="-100%" width="200%" height="300%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <ellipse cx="360" cy="172" rx="350" ry="165" :fill="`url(#${id}-halo)`" />
      <g :stroke="`url(#${id}-light)`" :filter="`url(#${id}-bloom)`" opacity=".8">
        <ellipse cx="360" cy="179" rx="255" ry="24" stroke-width="13" />
        <path
          d="M 195 176 C 250 176 265 165 275 134 A 88 88 0 0 1 445 134 C 455 165 470 176 525 176"
          stroke-width="11"
        />
      </g>
      <g :stroke="`url(#${id}-light)`">
        <ellipse
          v-for="ring in 7"
          :key="ring"
          cx="360"
          cy="179"
          :rx="205 + ring * 9"
          :ry="11 + ring * 2.5"
          :opacity="0.5 - ring * 0.04"
          stroke-width=".9"
        />
        <path
          d="M 175 176 C 245 176 264 165 275 134 A 88 88 0 0 1 445 134 C 456 165 475 176 545 176"
          stroke-width="3"
        />
        <path
          d="M 215 179 C 258 179 270 161 282 131 A 81 81 0 0 1 438 131 C 450 161 462 179 505 179"
          stroke-width="1"
          opacity=".65"
        />
      </g>
      <circle class="horizon-shadow" cx="360" cy="158" r="65" />
      <circle cx="360" cy="158" r="66" stroke="#f8ddb0" stroke-width=".9" opacity=".7" />
      <circle cx="360" cy="158" r="68" stroke="#b98952" stroke-width="1.5" opacity=".28" />
      <g :stroke="`url(#${id}-light)`">
        <path
          d="M 95 180 C 220 176 268 177 313 191 Q 360 207 407 191 C 452 177 500 176 625 180"
          stroke-width="9"
          :filter="`url(#${id}-bloom)`"
        />
        <path
          d="M 95 180 C 220 176 268 177 313 191 Q 360 207 407 191 C 452 177 500 176 625 180"
          stroke-width="3"
        />
        <path
          class="accretion-flow"
          d="M 125 184 C 240 176 275 188 316 199 Q 360 213 404 199 C 445 188 480 176 595 184"
          stroke-width="1.2"
          stroke-dasharray="42 19 83 160"
          opacity=".7"
        />
        <path
          d="M 210 185 C 267 185 286 207 309 219 Q 360 249 411 219 C 434 207 453 185 510 185"
          stroke-width="1"
          opacity=".25"
        />
      </g>
    </svg>
  </div>
</template>
<style scoped>
.event-horizon {
  position: absolute;
  pointer-events: none;
  user-select: none;
  contain: layout style;
}
.event-horizon svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.horizon-shadow {
  fill: #090c10;
}
.accretion-flow {
  animation: accretion 48s steps(720) infinite;
}
.still .accretion-flow {
  animation-play-state: paused;
}
@keyframes accretion {
  to {
    stroke-dashoffset: -608;
  }
}
@media (prefers-reduced-motion: reduce) {
  .accretion-flow {
    animation: none;
  }
}
:global([data-theme='light'] .event-horizon) {
  opacity: 0.5;
}
:global([data-theme='light'] .horizon-shadow) {
  fill: #333a3c;
}
</style>
