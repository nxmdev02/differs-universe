<script setup lang="ts">
defineProps<{ paused?: boolean }>()
const id = useId()
</script>

<template>
  <g class="endurance" :class="{ 'flight-paused': paused }">
    <defs>
      <linearGradient :id="`${id}-hull`" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#fff4de" />
        <stop offset=".45" stop-color="#c4c8c7" />
        <stop offset="1" stop-color="#63717c" />
      </linearGradient>
    </defs>
    <g class="endurance-flight">
      <!-- A tilted modular ring, with the dark lower faces giving it depth. -->
      <g transform="rotate(-24) scale(.76 1)">
        <g class="endurance-spin">
          <circle cy="3" r="23" stroke="#10171e" stroke-width="5" />
          <circle r="23" stroke="#8a9599" stroke-width="2.6" />
          <circle r="20.5" stroke="#e0d3b7" stroke-width=".7" />
          <g v-for="module in 12" :key="module" :transform="`rotate(${module * 30})`">
            <path d="M -1 -7 L -1 -20 M 1 -7 L 1 -20" stroke="#879298" stroke-width=".7" />
            <path d="M -5 -27 L 5 -27 L 7 -24 L 7 -15 L -3 -15 L -5 -18 Z" fill="#1a242e" />
            <path d="M -5 -30 L 5 -30 L 5 -19 L -5 -19 Z" :fill="`url(#${id}-hull)`" />
            <path d="M 5 -30 L 7 -27 L 7 -16 L 5 -19 Z" fill="#64717a" />
            <path d="M -5 -19 L 5 -19 L 7 -16 L -3 -16 Z" fill="#394651" />
            <path d="M -3 -28 H 3 M -3 -26 H 3 M -3 -24 H 3" stroke="#6a7378" stroke-width=".7" />
            <path d="M -3 -21 H 0" stroke="#e6edf0" stroke-width="1.2" />
            <rect x="-7" y="-27" width="2" height="6" fill="#23333e" />
          </g>
          <path d="M -5 -7 L 4 -7 L 8 -2 L 7 5 L 1 8 L -6 4 Z" fill="#26343f" stroke="#9ba8ac" />
          <path d="M -4 -6 H 3 L 5 -1 L 1 4 L -5 2 Z" :fill="`url(#${id}-hull)`" />
          <circle r="2.5" fill="#17242d" stroke="#c3ced0" stroke-width=".8" />
          <path d="M -4 6 L -10 13 L -8 18 L -2 14 L 1 7 Z" fill="#c9cecc" stroke="#52636f" />
          <path d="M 5 4 L 10 9 L 15 9 L 11 3 L 7 1 Z" fill="#b8c0bf" stroke="#52636f" />
          <path d="M -8 14 L -6 12 M 10 6 L 12 7" stroke="#263b4c" stroke-width="1.5" />
        </g>
      </g>
    </g>
  </g>
</template>

<style scoped>
.endurance {
  pointer-events: none;
}
.endurance-flight {
  transform: translate(190px, 174px) scale(0.72);
  animation: endurance-passage 32s linear infinite;
}
.endurance-spin {
  transform-origin: 0 0;
  animation: endurance-rotation 18s linear infinite;
}
.flight-paused .endurance-flight,
.flight-paused .endurance-spin {
  animation-play-state: paused;
}
@keyframes endurance-passage {
  0% {
    transform: translate(190px, 174px) scale(0.72);
    opacity: 0;
  }
  6% {
    transform: translate(206px, 182px) scale(0.72);
    opacity: 1;
  }
  25% {
    transform: translate(267px, 204px) scale(0.68);
    opacity: 1;
  }
  48% {
    transform: translate(350px, 215px) scale(0.61);
    opacity: 1;
  }
  70% {
    transform: translate(435px, 207px) scale(0.54);
    opacity: 1;
  }
  90% {
    transform: translate(512px, 186px) scale(0.45);
    opacity: 0.9;
  }
  97%,
  100% {
    transform: translate(542px, 176px) scale(0.4);
    opacity: 0;
  }
}
@keyframes endurance-rotation {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .endurance-flight,
  .endurance-spin {
    animation: none;
  }
}
</style>
