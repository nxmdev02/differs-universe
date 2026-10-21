<script setup lang="ts">
defineProps<{ paused?: boolean }>()
</script>

<template>
  <g class="endurance" :class="{ 'flight-paused': paused }">
    <g class="endurance-flight">
      <g class="endurance-bank">
        <g class="endurance-spin">
          <EnduranceHull />
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
  transform: translate(190px, 174px) scale(0.33);
  animation: endurance-passage 32s linear infinite;
}
.endurance-bank {
  transform-origin: 0 0;
  transform: rotate(-28deg) scaleX(0.7);
  animation: endurance-banking 32s ease-in-out infinite;
}
.endurance-spin {
  transform-origin: 0 0;
  animation: endurance-rotation 18s linear infinite;
}
.flight-paused .endurance-flight,
.flight-paused .endurance-bank,
.flight-paused .endurance-spin {
  animation-play-state: paused;
}
@keyframes endurance-passage {
  0% {
    transform: translate(190px, 174px) scale(0.33);
    opacity: 0;
  }
  6% {
    transform: translate(206px, 178px) scale(0.34);
    opacity: 1;
  }
  25% {
    transform: translate(267px, 189px) scale(0.37);
    opacity: 1;
  }
  48% {
    transform: translate(350px, 197px) scale(0.38);
    opacity: 1;
  }
  70% {
    transform: translate(435px, 190px) scale(0.32);
    opacity: 1;
  }
  90% {
    transform: translate(512px, 178px) scale(0.25);
    opacity: 0.9;
  }
  97%,
  100% {
    transform: translate(542px, 176px) scale(0.2);
    opacity: 0;
  }
}
@keyframes endurance-rotation {
  to {
    transform: rotate(360deg);
  }
}
@keyframes endurance-banking {
  0%,
  100% {
    transform: rotate(-28deg) scaleX(0.7);
  }
  48% {
    transform: rotate(-8deg) scaleX(0.9);
  }
  90% {
    transform: rotate(18deg) scaleX(0.58);
  }
}
@media (prefers-reduced-motion: reduce) {
  .endurance-flight,
  .endurance-bank,
  .endurance-spin {
    animation: none;
  }
}
</style>
