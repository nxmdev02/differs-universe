<script setup lang="ts">
const id = useId()
</script>

<template>
  <g class="endurance-hull">
    <defs>
      <linearGradient :id="`${id}-ceramic`" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#fff5dc" />
        <stop offset=".32" stop-color="#dce0df" />
        <stop offset=".72" stop-color="#a0acb4" />
        <stop offset="1" stop-color="#536371" />
      </linearGradient>
      <linearGradient :id="`${id}-edge`" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#a4afb4" />
        <stop offset="1" stop-color="#273746" />
      </linearGradient>
    </defs>
    <!-- Open center, separated habitat blocks, and a recessed service ring. -->
    <circle cy="4" r="31" stroke="#0d1721" stroke-width="5" />
    <circle r="31" stroke="#71828d" stroke-width="2.5" />
    <circle r="29" stroke="#d8cdb3" stroke-width=".65" />
    <path
      d="M -3 -8 L -17 -24 M 0 -9 L -14 -26 M 7 -2 L 27 -12 M 8 1 L 29 -9 M -5 6 L -22 22 M -2 8 L -19 24"
      stroke="#687c8a"
      stroke-width="1.2"
    />
    <g v-for="module in 12" :key="module" :transform="`rotate(${module * 30})`">
      <path d="M -3 -28 H 3 V -23 H -3 Z" fill="#253949" stroke="#89999e" stroke-width=".6" />
      <path d="M -6 -41 L 5 -41 L 8 -38 V -24 L 5 -21 H -6 L -8 -24 V -38 Z" fill="#142330" />
      <path
        d="M -6 -42 H 5 L 7 -40 V -27 L 4 -25 H -6 L -8 -28 V -40 Z"
        :fill="`url(#${id}-ceramic)`"
      />
      <path d="M 7 -40 L 10 -36 V -23 L 7 -20 L 4 -25 L 7 -27 Z" :fill="`url(#${id}-edge)`" />
      <path d="M -6 -25 H 4 L 7 -20 H -3 L -6 -22 Z" fill="#364957" />
      <path d="M -6 -40 H 4 M -6 -39 V -29" stroke="#fff3d9" stroke-width=".8" />
      <rect x="-5" y="-37" width="8" height="7" rx=".5" fill="#344653" />
      <path d="M -4 -35 H 2 M -4 -33 H 2 M -4 -31 H 2" stroke="#70818a" stroke-width=".65" />
      <path d="M -5 -28 H -1 M 1 -28 H 4" stroke="#e6ecea" stroke-width="1" />
      <path
        v-if="module % 3 === 0"
        d="M -8 -36 H -12 V -28 H -8"
        fill="#1f303c"
        stroke="#8a999e"
        stroke-width=".6"
      />
      <path
        v-if="module % 3 === 1"
        d="M -4 -43 V -46 M -6 -46 H -2"
        stroke="#c9d2ce"
        stroke-width=".8"
      />
      <circle
        v-if="module === 3 || module === 9"
        cx="5"
        cy="-39"
        r="1"
        :fill="module === 3 ? '#dcb684' : '#a8deea'"
      />
    </g>
    <!-- Docking spine and two small landers break the symmetry of the ring. -->
    <path
      d="M -5 -13 L 3 -13 L 7 -8 L 6 10 L 2 14 L -5 11 L -7 5 Z"
      fill="#1b2d3b"
      stroke="#899ca5"
      stroke-width=".9"
    />
    <path d="M -4 -12 H 2 L 4 -8 L 2 9 L -3 11 L -5 5 Z" :fill="`url(#${id}-ceramic)`" />
    <path d="M -2 -10 V 8 M -5 -4 H 5 M -5 4 H 5" stroke="#4c6270" stroke-width=".8" />
    <circle cy="-7" r="2" fill="#192c3a" stroke="#d1d8d7" stroke-width=".7" />
    <path d="M -5 5 L -13 9 L -20 20 L -16 24 L -6 18 L -1 9 Z" fill="#20333f" />
    <path
      d="M -5 3 L -13 7 L -20 18 L -16 21 L -6 16 L -1 7 Z"
      :fill="`url(#${id}-ceramic)`"
      stroke="#b5bdb9"
      stroke-width=".7"
    />
    <path d="M -12 9 L -16 15 L -12 14 L -8 8 Z" fill="#1b3346" />
    <path d="M -18 19 L -13 18 M -8 14 L -6 11" stroke="#f0e6ce" stroke-width=".7" />
    <path d="M 5 -5 L 13 -10 L 22 -8 L 24 -4 L 16 -2 L 7 2 Z" fill="#293c48" />
    <path
      d="M 5 -7 L 13 -12 L 22 -10 L 24 -6 L 16 -4 L 7 0 Z"
      :fill="`url(#${id}-ceramic)`"
      stroke="#acb8ba"
      stroke-width=".7"
    />
    <path d="M 14 -10 L 19 -9 L 20 -7 L 15 -7 Z" fill="#1e3445" />
  </g>
</template>
