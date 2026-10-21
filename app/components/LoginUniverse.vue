<script setup lang="ts">
const host = ref<HTMLDivElement>()
const sceneVisible = useSceneVisibility(host)
const layer = ref<HTMLDivElement>()
const satellite = ref<HTMLSpanElement>()
const distantSatellite = ref<HTMLSpanElement>()
const paused = ref(false)
const emit = defineEmits<{ motionChange: [paused: boolean] }>()
const reduced = ref(false)
const earthRotationSeconds = 60
const signal = ref(0)
const signalVisible = ref(false)
let motionQuery: MediaQueryList
let frame = 0
let previousTime = 0
let elapsed = 0
let x = 0,
  y = 0,
  targetX = 0,
  targetY = 0
let signalTimer: ReturnType<typeof setTimeout> | undefined
let disposed = false

function paint() {
  if (!host.value || !layer.value) return
  // A repeating map at 200% width completes one visible turn over 200 percentage points.
  const earthTurn = (elapsed / earthRotationSeconds) % 1
  host.value.style.setProperty('--earth-position', `${53 + earthTurn * 200}%`)
  host.value.style.setProperty('--station-spin', `${elapsed * 7}deg`)
  layer.value.style.transform = `translate3d(${x * 9}px, ${y * 7}px, 0) rotateX(${-y * 7}deg) rotateY(${x * 9}deg)`
  const position = (node: HTMLSpanElement | undefined, phase: number, rx: number, ry: number) => {
    if (!node) return
    const px = Math.cos(phase) * rx,
      py = Math.sin(phase) * ry
    const tilt = -0.36
    node.style.transform = `translate(${px * Math.cos(tilt) - py * Math.sin(tilt)}px, ${px * Math.sin(tilt) + py * Math.cos(tilt)}px)`
    node.style.zIndex = Math.sin(phase) > 0 ? '3' : '0'
  }
  position(satellite.value, elapsed * 0.19 + 0.45, 125, 82)
  position(distantSatellite.value, -elapsed * 0.11 + 2.6, 141, 100)
}
function animate(time: number) {
  if (disposed || paused.value || reduced.value || !sceneVisible.value) return
  frame = requestAnimationFrame(animate)
  if (previousTime && time - previousTime < 32) return
  const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 0
  previousTime = time
  elapsed += delta
  const blend = 1 - Math.exp(-delta * 6)
  x += (targetX - x) * blend
  y += (targetY - y) * blend
  paint()
}
function syncMotion() {
  cancelAnimationFrame(frame)
  previousTime = 0
  if (!paused.value && !reduced.value && sceneVisible.value) frame = requestAnimationFrame(animate)
}
function motionChanged() {
  reduced.value = motionQuery.matches
  if (reduced.value) {
    x = 0
    y = 0
    targetX = 0
    targetY = 0
    paint()
  }
  syncMotion()
}
function follow(event: PointerEvent) {
  if (paused.value || reduced.value) return
  targetX = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth) * 2 - 1))
  targetY = Math.max(-1, Math.min(1, (event.clientY / window.innerHeight) * 2 - 1))
}
function resetPointer() {
  targetX = 0
  targetY = 0
}
function sendSignal() {
  signal.value++
  signalVisible.value = true
  clearTimeout(signalTimer)
  signalTimer = setTimeout(() => {
    signalVisible.value = false
  }, 1400)
}
watch(paused, syncMotion)
watch(sceneVisible, syncMotion)
watch([paused, reduced], () => emit('motionChange', paused.value || reduced.value))
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  paint()
  motionChanged()
  motionQuery.addEventListener('change', motionChanged)
})
onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(frame)
  clearTimeout(signalTimer)
  motionQuery?.removeEventListener('change', motionChanged)
})
defineExpose({ follow, resetPointer })
</script>
<template>
  <div
    ref="host"
    class="login-universe"
    :data-motion="reduced ? 'reduced' : paused ? 'paused' : 'playing'"
  >
    <div ref="layer" class="universe-layer">
      <div class="login-orbit" aria-hidden="true" />
      <div class="login-orbit outer" aria-hidden="true" />
      <span ref="satellite" class="login-satellite" aria-hidden="true"><i /></span>
      <span ref="distantSatellite" class="login-satellite distant" aria-hidden="true">
        <svg viewBox="-50 -50 100 100" fill="none" focusable="false">
          <g transform="rotate(-20) scale(.8 1)">
            <g class="login-endurance-spin"><EnduranceHull /></g>
          </g>
        </svg>
      </span>
      <button
        class="login-earth"
        aria-label="Send a signal from Earth"
        :class="{ 'signal-active': signalVisible }"
        @click="sendSignal"
      >
        <span class="earth-map" aria-hidden="true" />
        <span class="earth-shade" aria-hidden="true" />
        <span
          v-if="signalVisible"
          :key="signal"
          class="signal-ring"
          :class="{ still: paused || reduced }"
          aria-hidden="true"
        />
      </button>
    </div>
    <div class="universe-controls">
      <span>Tap Earth to send a signal</span>
      <button
        :disabled="reduced"
        :aria-label="paused ? 'Resume login animation' : 'Pause login animation'"
        :aria-pressed="paused"
        @click="paused = !paused"
      >
        <AppIcon :name="paused || reduced ? 'play' : 'pause'" :size="13" />{{
          reduced ? 'Reduced motion' : paused ? 'Resume' : 'Pause'
        }}
      </button>
    </div>
    <span class="sr-only" role="status">{{ signal ? 'A signal sent from Earth.' : '' }}</span>
  </div>
</template>
<style scoped>
.login-universe {
  --earth-position: 53%;
  width: 300px;
  max-width: 100%;
  height: 286px;
  position: relative;
  perspective: 700px;
  flex-shrink: 0;
}
.universe-layer {
  position: absolute;
  inset: 0 0 44px;
  display: grid;
  place-items: center;
  transform-style: preserve-3d;
}
.login-orbit {
  position: absolute;
  width: 250px;
  height: 164px;
  border: 1px solid var(--theme-border, #7fae9633);
  border-radius: 50%;
  transform: rotate(-20.63deg);
  pointer-events: none;
}
.login-orbit.outer {
  width: 282px;
  height: 200px;
  border-style: dashed;
  border-color: var(--theme-border, #6a96811f);
}
.login-earth {
  width: 158px;
  height: 158px;
  padding: 0;
  border-radius: 50%;
  position: relative;
  z-index: 1;
  background: #102132;
  box-shadow:
    0 0 2px 2px #87bcdf77,
    0 0 42px #4e9bc02e,
    0 0 90px #5488a313;
}
.earth-map,
.earth-shade {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}
.earth-map {
  background: url('/textures/earth-blue-marble.jpg') var(--earth-position) 50% / 200% 100% repeat-x;
}
.earth-shade {
  background: radial-gradient(circle at 30% 25%, transparent 15%, #00071335 47%, #000510d9 87%);
  box-shadow:
    inset -8px -5px 20px #020a1b,
    inset 2px 1px 5px #b3dcff55;
}
.login-earth:hover,
.login-earth:focus-visible,
.login-earth.signal-active {
  box-shadow:
    0 0 3px 2px #a0d8ecaa,
    0 0 65px #6ecdb544,
    0 0 110px #7a9fcb22;
}
.login-earth:focus-visible {
  outline: 2px solid var(--theme-accent, #b2e5cc);
  outline-offset: 8px;
}
.login-satellite {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}
.login-satellite i {
  display: block;
  position: absolute;
  width: 12px;
  height: 12px;
  left: -6px;
  top: -6px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 25%, #e4f3ed, #8fb9a7 35%, #26483e 80%);
  box-shadow: 0 0 14px #a2dfc33a;
}
.login-satellite.distant svg {
  display: block;
  position: absolute;
  width: 34px;
  height: 34px;
  left: -17px;
  top: -17px;
  overflow: visible;
}
.login-endurance-spin {
  transform-origin: 0 0;
  transform: rotate(var(--station-spin, 0deg));
}
.signal-ring {
  position: absolute;
  inset: -4px;
  border: 1px solid var(--theme-accent, #a5edda);
  border-radius: 50%;
  pointer-events: none;
  animation: earth-signal 1.4s ease-out forwards;
}
.signal-ring.still {
  animation: none;
  opacity: 0.65;
}
.universe-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--theme-muted, #779b8e);
  font-size: 10px;
}
.universe-controls button {
  min-width: 60px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--theme-text, #b0cdbf);
  border-radius: 6px;
  font-size: 10px;
}
.universe-controls button:not(:disabled):hover {
  background: #aadab10b;
}
@keyframes earth-signal {
  from {
    transform: scale(1);
    opacity: 0.8;
  }
  to {
    transform: scale(1.85);
    opacity: 0;
  }
}
@media (max-width: 480px) {
  .login-universe {
    height: 265px;
  }
  .login-earth {
    width: 144px;
    height: 144px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .signal-ring {
    animation: none;
    opacity: 0.65;
  }
  .login-earth {
    transition: none;
  }
}
</style>
