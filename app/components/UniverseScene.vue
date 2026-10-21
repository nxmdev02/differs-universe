<script setup lang="ts">
import * as THREE from 'three'
import { placeOrbitLabels } from '~/utils/orbit-labels'
import type { Metric, ProjectViewModel } from '#shared/types/project'
import { moonPhaseAt } from '#shared/utils/moon-phase'
import { metricAvailable, metricText, metricLabel, statusColors } from '#shared/utils/planet-size'
import {
  projectActivity,
  solarAssignments,
  projectSiteUrl,
  visitorGlow,
  recentDeploymentKey,
} from '#shared/utils/project-appearance'
import {
  planetMaterial,
  earthTexture,
  earthCloudMaterial,
  atmosphereMaterial,
  cometTail,
} from '~/utils/universe-materials'

const props = defineProps<{
  projects: ProjectViewModel[]
  visibleIds: string[]
  metric: Metric
  selectedId: string | null
  paused: boolean
  suspended?: boolean
}>()
const emit = defineEmits<{ select: [project: ProjectViewModel] }>()
const host = ref<HTMLDivElement>()
const sceneVisible = useSceneVisibility(host)
const { theme } = useTheme()
const unsupported = ref(false)
const assignments = computed(() => solarAssignments(props.projects, props.metric))
const glows = computed(() =>
  Object.fromEntries(
    props.projects.map((project) => [project.id, visitorGlow(project, props.metric)]),
  ),
)
const seenDeployments = useState<Record<string, string>>('universe-seen-deployments', () => ({}))
const signals = ref<Record<string, string>>({})
type Label = {
  project: ProjectViewModel
  x: number
  y: number
  radius: number
  labelX: number
  labelY: number
}
const labels = shallowRef<Label[]>([])
// A sync can remove projects before the next animation frame updates positions.
const renderLabels = computed(() =>
  labels.value.filter((label) => assignments.value[label.project.id]),
)
const earthLabel = ref({ x: 0, y: 0, radius: 30 })
const moonLabel = ref({ x: 0, y: 0, visible: false, phase: moonPhaseAt(0) })
const previewId = ref<string | null>(null)
const previewProject = computed(() =>
  props.projects.find((project) => project.id === previewId.value),
)
const previewPosition = computed(() => {
  const label = labels.value.find((item) => item.project.id === previewId.value)
  const cardWidth = Math.min(292, width - 24)
  if (!label) return {}
  return {
    width: `${cardWidth}px`,
    left: `${Math.max(12, Math.min(width - cardWidth - 12, label.x + (label.x < width / 2 ? label.radius + 22 : -cardWidth - label.radius - 22)))}px`,
    top: `${Math.max(12, Math.min(height - 352, label.y - 90))}px`,
  }
})
const reducedMotion = ref(false)
const motionStopped = computed(
  () => props.paused || props.suspended || reducedMotion.value || !sceneVisible.value,
)
function syncSignals() {
  if (reducedMotion.value) signals.value = {}
  if (motionStopped.value || !draw || unsupported.value) return
  for (const project of props.projects) {
    if (!visibleIdSet.value.has(project.id)) continue
    const key = recentDeploymentKey(project)
    if (key && seenDeployments.value[project.id] !== key) {
      seenDeployments.value[project.id] = key
      signals.value[project.id] = key
    }
  }
}
let renderer: THREE.WebGLRenderer | undefined
let scene: THREE.Scene
let camera: THREE.OrthographicCamera
let earth: THREE.Mesh
let clouds: THREE.Mesh
let referenceMoon: THREE.Mesh
let atmosphere: THREE.Sprite
let landTexture: THREE.Texture
let disposed = false
const earthDetailed = ref(false)
let glowTexture: THREE.CanvasTexture
let tracks: THREE.Group
let starMaterial: THREE.PointsMaterial | undefined
let draw: ((delta: number) => boolean) | undefined
let frame = 0,
  width = 1000,
  height = 640,
  lastTime = 0,
  elapsed = 0,
  targetZoom = 1
let observer: ResizeObserver | undefined
let motionQuery: MediaQueryList
let hideTimer: ReturnType<typeof setTimeout> | undefined
const targetCenter = new THREE.Vector2()
const visibleIdSet = computed(() => new Set(props.visibleIds))
const hasProjectMoons = computed(() =>
  Object.values(assignments.value).some((body) => body.kind === 'moon'),
)

function canRender() {
  return !!draw && !disposed && !unsupported.value && sceneVisible.value && !props.suspended
}
function requestRender() {
  if (canRender() && !frame) frame = requestAnimationFrame(renderFrame)
}
function renderFrame(time: number) {
  frame = 0
  if (!canRender()) {
    lastTime = 0
    return
  }
  const interval = 1000 / (width < 560 ? 24 : 30)
  if (lastTime && time - lastTime < interval - 1) {
    requestRender()
    return
  }
  const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0
  lastTime = time
  const settling = draw!(delta)
  if ((!props.paused && !reducedMotion.value) || settling) requestRender()
  else lastTime = 0
}
function syncRendering() {
  cancelAnimationFrame(frame)
  frame = 0
  lastTime = 0
  requestRender()
}
const objects = new Map<
  string,
  {
    group: THREE.Group
    surface: THREE.Group
    mesh: THREE.Mesh
    halo: THREE.Sprite
    tail?: THREE.Mesh
    x: number
    y: number
    radius: number
    targetRadius: number
    phase: number
    spin: number
    orbitX: number
    orbitY: number
    speed: number
  }
>()
const pointers = new Map<number, { x: number; y: number }>()
let lastDistance = 0,
  dragged = false,
  travel = 0
let pointerType = 'mouse'
let downPosition = { x: 0, y: 0 }

function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    const object = child as THREE.Mesh
    object.geometry?.dispose()
    if (object.material)
      (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) =>
        material.dispose(),
      )
  })
}
function ellipse(rx: number, ry: number, opacity: number) {
  const points = new THREE.EllipseCurve(0, 0, rx, ry, 0, Math.PI * 2, false, 0)
    .getPoints(180)
    .map((point) => new THREE.Vector3(point.x, point.y, -30))
  const line = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineDashedMaterial({
      color: theme.value === 'light' ? '#446e5b' : '#91b6c7',
      transparent: true,
      opacity: theme.value === 'light' ? opacity * 1.9 : opacity,
      dashSize: 2,
      gapSize: 6,
    }),
  )
  line.computeLineDistances()
  line.userData.baseOpacity = opacity
  return line
}
watch(theme, (value) => {
  const light = value === 'light'
  starMaterial?.color.set(light ? '#527263' : '#c5d3e6')
  tracks?.children.forEach((child) => {
    const material = (child as THREE.LineLoop).material as THREE.LineDashedMaterial
    material.color.set(light ? '#446e5b' : '#91b6c7')
    material.opacity = child.userData.baseOpacity * (light ? 1.9 : 1)
  })
  for (const [id, object] of objects) {
    const appearance = assignments.value[id]
    if (!appearance) continue
    object.halo.material.color.set(light ? appearance.color : appearance.accent)
    if (light) object.halo.material.color.multiplyScalar(0.55)
    object.halo.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
    object.halo.material.needsUpdate = true
  }
  requestRender()
})
function radiusFor(project: ProjectViewModel) {
  const scale = width < 560 ? 0.57 : Math.min(1, Math.max(0.72, height / 650))
  return assignments.value[project.id]!.radius * scale
}
function populate() {
  if (!scene) return
  const previous = new Map(objects)
  for (const object of objects.values()) {
    scene.remove(object.group)
    disposeObject(object.group)
  }
  objects.clear()
  props.projects.forEach((project) => {
    const appearance = assignments.value[project.id]!
    const dormant = appearance.kind === 'comet'
    const radius = radiusFor(project)
    const group = new THREE.Group(),
      surface = new THREE.Group()
    const mesh = new THREE.Mesh(
      dormant ? new THREE.IcosahedronGeometry(1, 2) : new THREE.SphereGeometry(1, 32, 20),
      planetMaterial(appearance),
    )
    mesh.rotation.set(0.12, 0, appearance.kind === 'uranus' ? 1.7 : -0.15)
    if (dormant) mesh.scale.set(1, 0.8, 0.9)
    surface.add(mesh)
    if (appearance.kind === 'saturn' || appearance.kind === 'uranus') {
      const rings =
        appearance.kind === 'uranus'
          ? [
              [1.62, 1.66, 0.2],
              [1.85, 1.87, 0.12],
            ]
          : [
              [1.38, 1.65, 0.5],
              [1.72, 1.94, 0.24],
            ]
      for (const [inner, outer, opacity] of rings) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(inner, outer, 64),
          new THREE.MeshBasicMaterial({
            color: appearance.accent,
            transparent: true,
            opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        )
        ring.rotation.set(appearance.kind === 'uranus' ? 0.3 : 1.12, 0.15, -0.4)
        surface.add(ring)
      }
    }
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: new THREE.Color(
          theme.value === 'light' ? appearance.color : appearance.accent,
        ).multiplyScalar(theme.value === 'light' ? 0.55 : 1),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: theme.value === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending,
      }),
    )
    halo.position.z = -3
    halo.scale.set(4.1, 4.1, 1)
    surface.add(halo)
    const tail = dormant ? cometTail() : undefined
    if (tail) surface.add(tail)
    surface.scale.setScalar(radius)
    group.add(surface)
    scene.add(group)
    objects.set(project.id, {
      group,
      surface,
      mesh,
      halo,
      tail,
      x: previous.get(project.id)?.x || 0,
      y: previous.get(project.id)?.y || 0,
      radius,
      targetRadius: radius,
      phase: previous.get(project.id)?.phase ?? NaN,
      spin: previous.get(project.id)?.spin ?? 0,
      orbitX: 0,
      orbitY: 0,
      speed: 0,
    })
  })
  resize()
}
function resize() {
  if (!host.value || !renderer) return
  width = Math.max(1, host.value.clientWidth)
  height = Math.max(1, host.value.clientHeight)
  const pixelRatio = Math.min(window.devicePixelRatio, width < 560 ? 1.25 : 1.5)
  if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio)
  camera.left = -width / 2
  camera.right = width / 2
  camera.top = height / 2
  camera.bottom = -height / 2
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  if (tracks) {
    scene.remove(tracks)
    disposeObject(tracks)
  }
  tracks = new THREE.Group()
  const mobile = width < 560
  const earthRadius = mobile ? 46 : Math.min(88, Math.max(65, height * 0.13))
  earth.scale.setScalar(earthRadius)
  atmosphere.scale.set(earthRadius * 3.1, earthRadius * 3.1, 1)
  const boundX = Math.max(100, width / 2 - 105),
    boundY = Math.max(160, height / 2 - 112)
  const ordered = [...props.projects].sort(
    (a, b) =>
      assignments.value[a.id]!.orbit - assignments.value[b.id]!.orbit || a.id.localeCompare(b.id),
  )
  const planets = ordered.filter((p) => !['moon', 'comet'].includes(assignments.value[p.id]!.kind))
  const moons = ordered.filter((p) => assignments.value[p.id]!.kind === 'moon')
  const comets = ordered.filter((p) => assignments.value[p.id]!.kind === 'comet')
  ordered.forEach((project) => {
    const object = objects.get(project.id)!,
      appearance = assignments.value[project.id]!
    if (appearance.kind === 'moon') {
      const index = moons.indexOf(project)
      object.orbitX = earthRadius + (mobile ? 27 : 46) + (index % 3) * 13
      object.orbitY = object.orbitX * 0.82
      if (!Number.isFinite(object.phase)) object.phase = 0.6 + index * 2.39996
      object.speed = 0.065 / (1 + index * 0.12)
    } else if (appearance.kind === 'comet') {
      const index = comets.indexOf(project)
      object.orbitX = mobile ? width / 2 - 43 : boundX + 35
      object.orbitY = boundY + 37 + (index % 2) * 10
      if (!Number.isFinite(object.phase))
        object.phase = (index / Math.max(1, comets.length)) * Math.PI * 2 + 0.1
      object.speed = 0.015 + index * 0.001
    } else {
      object.orbitX = mobile
        ? Math.max(80, width / 2 - 58)
        : boundX * (0.59 + appearance.orbit * 0.047)
      object.orbitY = mobile
        ? 145 + (appearance.orbit / 8) * (boundY - 145)
        : boundY * (0.72 + appearance.orbit * 0.035)
      if (!Number.isFinite(object.phase))
        object.phase = (planets.indexOf(project) / Math.max(1, planets.length)) * Math.PI * 2 + 0.35
      object.speed = 0.024 - appearance.orbit * 0.0015
    }
    object.x = Math.cos(object.phase) * object.orbitX
    object.y = Math.sin(object.phase) * object.orbitY
    object.group.position.set(object.x, object.y, 10)
    if (object.tail) object.tail.rotation.z = Math.atan2(object.y, object.x)
    object.targetRadius = radiusFor(project)
    tracks.add(ellipse(object.orbitX, object.orbitY, appearance.kind === 'moon' ? 0.17 : 0.085))
  })
  scene.add(tracks)
  if (!moons.length)
    tracks.add(
      ellipse(earthRadius + (mobile ? 27 : 46), (earthRadius + (mobile ? 27 : 46)) * 0.82, 0.15),
    )
  requestRender()
}
function zoomBy(factor: number) {
  targetZoom = Math.min(3, Math.max(0.55, targetZoom * factor))
  closePreview()
  requestRender()
}
function reset() {
  targetZoom = 1
  targetCenter.set(0, 0)
  closePreview()
  requestRender()
}
function focus(id: string) {
  const object = objects.get(id)
  if (object && width >= 560) {
    targetCenter.set(object.x * 0.2, object.y * 0.2)
    targetZoom = 1.08
  }
  closePreview()
  requestRender()
}
defineExpose({ reset, zoomBy, focus })
function wheel(event: WheelEvent) {
  if (unsupported.value || (event.target as HTMLElement).closest('.planet-preview')) return
  event.preventDefault()
  zoomBy(Math.exp(-event.deltaY * 0.001))
}
function pointerDown(event: PointerEvent) {
  if (
    unsupported.value ||
    event.button !== 0 ||
    (event.target as HTMLElement).closest('.planet-preview')
  )
    return
  pointerType = event.pointerType
  if (!pointers.size) {
    dragged = false
    travel = 0
    downPosition = { x: event.clientX, y: event.clientY }
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 2) {
    const values = [...pointers.values()]
    lastDistance = Math.hypot(values[0]!.x - values[1]!.x, values[0]!.y - values[1]!.y)
  }
  const target = (event.target as HTMLElement).closest('button, a') || host.value
  target?.setPointerCapture(event.pointerId)
}
function pointerMove(event: PointerEvent) {
  const previous = pointers.get(event.pointerId)
  if (!previous) {
    if (!pointers.size) dragged = false
    return
  }
  if (!camera) return
  const dx = event.clientX - previous.x,
    dy = event.clientY - previous.y
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  travel = Math.max(
    travel,
    Math.hypot(event.clientX - downPosition.x, event.clientY - downPosition.y),
  )
  if (travel > 5 || pointers.size > 1) {
    dragged = true
    closePreview()
  }
  if (pointers.size === 2) {
    const values = [...pointers.values()]
    const distance = Math.hypot(values[0]!.x - values[1]!.x, values[0]!.y - values[1]!.y)
    if (lastDistance > 0) zoomBy(distance / lastDistance)
    lastDistance = distance
  } else if (dragged) {
    if (
      event.pointerType === 'touch' &&
      width < 560 &&
      Math.abs(event.clientY - downPosition.y) > Math.abs(event.clientX - downPosition.x)
    )
      return
    targetCenter.x -= dx / camera.zoom
    targetCenter.y += dy / camera.zoom
    requestRender()
  }
}
function pointerUp(event: PointerEvent) {
  pointers.delete(event.pointerId)
  lastDistance = 0
}
function keepPreview() {
  clearTimeout(hideTimer)
}
function showPreview(project: ProjectViewModel, event?: PointerEvent) {
  if ((event && (event.pointerType === 'touch' || dragged)) || pointers.size) return
  keepPreview()
  previewId.value = project.id
}
function scheduleHide() {
  keepPreview()
  hideTimer = setTimeout(closePreview, 180)
}
function focusOut(event: FocusEvent) {
  if ((event.relatedTarget as HTMLElement | null)?.closest('.planet-preview')) return
  scheduleHide()
}
function closePreview() {
  keepPreview()
  previewId.value = null
}
function activate(event: MouseEvent, project: ProjectViewModel) {
  if (event.detail > 0 && dragged) {
    event.preventDefault()
    return
  }
  if ((pointerType === 'touch' && event.detail > 0) || !projectSiteUrl(project)) {
    event.preventDefault()
    showPreview(project)
  }
}
function selectDetails(project: ProjectViewModel) {
  closePreview()
  emit('select', project)
}
async function focusPreview(project: ProjectViewModel) {
  showPreview(project)
  await nextTick()
  host.value?.querySelector<HTMLElement>('.preview-actions a, .preview-actions button')?.focus()
}
function contextLost(event: Event) {
  event.preventDefault()
  unsupported.value = true
  cancelAnimationFrame(frame)
  closePreview()
}
function motionChanged() {
  reducedMotion.value = motionQuery.matches
}

onMounted(async () => {
  await nextTick()
  if (disposed || !host.value) return
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionChanged()
  motionQuery.addEventListener('change', motionChanged)
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    })
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    host.value!.prepend(renderer.domElement)
    scene = new THREE.Scene()
    camera = new THREE.OrthographicCamera(-500, 500, 320, -320, 0.1, 2000)
    camera.position.set(0, 0, 1000)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const context = canvas.getContext('2d')!,
      gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, '#ffffffdd')
    gradient.addColorStop(0.3, '#ffffff40')
    gradient.addColorStop(1, '#ffffff00')
    context.fillStyle = gradient
    context.fillRect(0, 0, 128, 128)
    glowTexture = new THREE.CanvasTexture(canvas)
    landTexture = earthTexture()
    earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 40),
      new THREE.MeshPhongMaterial({ map: landTexture, shininess: 35, specular: '#526b88' }),
    )
    ;(earth.material as THREE.MeshPhongMaterial).onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <specularmap_fragment>',
        `#include <specularmap_fragment>
        specularStrength *= .05 + .8 * smoothstep(.005,.05,diffuseColor.b-diffuseColor.r);`,
      )
    }
    new THREE.TextureLoader().load(
      '/textures/earth-blue-marble.jpg',
      (texture) => {
        if (disposed) {
          texture.dispose()
          return
        }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = Math.min(8, renderer!.capabilities.getMaxAnisotropy())
        landTexture.dispose()
        landTexture = texture
        const material = earth.material as THREE.MeshPhongMaterial
        material.map = texture
        material.needsUpdate = true
        earthDetailed.value = true
        requestRender()
      },
      undefined,
      () => {
        /* The local vector Earth remains available if the texture fails. */
      },
    )
    clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 48, 32), earthCloudMaterial())
    earth.add(clouds)
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(1.035, 48, 24), atmosphereMaterial()))
    referenceMoon = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      planetMaterial({ kind: 'moon', color: '#a9adb5', accent: '#e4e4e4', seed: 2 }),
    )
    scene.add(referenceMoon)
    earth.rotation.set(0.12, -1.8, -0.18)
    scene.add(earth)
    scene.add(new THREE.AmbientLight('#c3d9fa', 0.65))
    const sun = new THREE.DirectionalLight('#fff3dc', 2.8)
    sun.position.set(-450, 380, 600)
    scene.add(sun)
    atmosphere = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: '#5cafff',
        opacity: 0.45,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    atmosphere.position.z = -4
    scene.add(atmosphere)
    const stars = new Float32Array(700 * 3)
    let seed = 137
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0
      return (seed >>> 0) / 4294967296
    }
    for (let index = 0; index < stars.length; index += 3) {
      stars[index] = (random() - 0.5) * 2600
      stars[index + 1] = (random() - 0.5) * 2200
      stars[index + 2] = -100
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(stars, 3))
    starMaterial = new THREE.PointsMaterial({
      color: theme.value === 'light' ? '#527263' : '#c5d3e6',
      size: 1.2,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: false,
    })
    scene.add(new THREE.Points(geometry, starMaterial))
    populate()
    observer = new ResizeObserver(resize)
    observer.observe(host.value!)
    const projected = new THREE.Vector3()
    draw = (delta: number) => {
      if (!props.paused && !reducedMotion.value) elapsed += delta
      const lerp = reducedMotion.value ? 1 : 1 - Math.exp(-(delta || 1 / 30) * 10)
      camera.position.x += (targetCenter.x - camera.position.x) * lerp
      camera.position.y += (targetCenter.y - camera.position.y) * lerp
      camera.zoom += (targetZoom - camera.zoom) * lerp
      let settling = false
      if (Math.abs(targetCenter.x - camera.position.x) < 0.05) camera.position.x = targetCenter.x
      else settling = true
      if (Math.abs(targetCenter.y - camera.position.y) < 0.05) camera.position.y = targetCenter.y
      else settling = true
      if (Math.abs(targetZoom - camera.zoom) < 0.0005) camera.zoom = targetZoom
      else settling = true
      camera.updateProjectionMatrix()
      camera.updateMatrixWorld()
      earth.rotation.y = -1.8 + elapsed * 0.055
      clouds.rotation.y = elapsed * 0.012
      projected.set(0, 0, 0).project(camera)
      earthLabel.value = {
        x: ((projected.x + 1) * width) / 2,
        y: ((-projected.y + 1) * height) / 2,
        radius: earth.scale.x * camera.zoom,
      }
      referenceMoon.visible = !hasProjectMoons.value
      const moonOrbit = earth.scale.x + (width < 560 ? 27 : 46)
      const phase = moonPhaseAt(elapsed)
      referenceMoon.scale.setScalar(width < 560 ? 9 : 12)
      referenceMoon.position.set(
        Math.cos(phase.radians) * moonOrbit,
        Math.sin(phase.radians) * moonOrbit * 0.82,
        12,
      )
      referenceMoon.rotation.y = phase.radians
      ;(referenceMoon.material as THREE.ShaderMaterial).uniforms.lightDirection!.value.set(
        Math.sin(phase.radians),
        0,
        -Math.cos(phase.radians),
      )
      projected.copy(referenceMoon.position).project(camera)
      moonLabel.value = {
        x: ((projected.x + 1) * width) / 2,
        y: ((-projected.y + 1) * height) / 2,
        visible: referenceMoon.visible,
        phase,
      }
      const next: Label[] = []
      props.projects.forEach((project) => {
        const object = objects.get(project.id)
        if (!object) return
        object.group.visible = visibleIdSet.value.has(project.id)
        if (!object.group.visible) return
        object.radius += (object.targetRadius - object.radius) * lerp
        if (Math.abs(object.targetRadius - object.radius) < 0.05)
          object.radius = object.targetRadius
        else settling = true
        object.surface.scale.setScalar(object.radius)
        const appearance = assignments.value[project.id]!
        const moving =
          !props.paused &&
          !reducedMotion.value &&
          previewId.value !== project.id &&
          props.selectedId !== project.id &&
          !pointers.size
        if (moving) {
          object.phase += delta * object.speed
          object.spin += delta * appearance.spin
        }
        object.mesh.rotation.y = object.spin
        object.x = Math.cos(object.phase) * object.orbitX
        object.y = Math.sin(object.phase) * object.orbitY
        object.group.position.set(object.x, object.y, 10)
        if (object.tail) object.tail.rotation.z = Math.atan2(object.y, object.x)
        const glow = glows.value[project.id] ?? 0
        ;(object.mesh.material as THREE.ShaderMaterial).uniforms.trafficGlow!.value = glow
        const highlighted = props.selectedId === project.id || previewId.value === project.id
        ;(object.halo.material as THREE.SpriteMaterial).opacity = Math.min(
          0.95,
          glow * 0.9 + (highlighted ? 0.12 : 0),
        )
        object.halo.scale.setScalar(2.8 + glow * 1.6)
        projected.copy(object.group.position).project(camera)
        next.push({
          project,
          x: ((projected.x + 1) * width) / 2,
          y: ((-projected.y + 1) * height) / 2,
          radius: object.radius * camera.zoom,
          labelX: 0,
          labelY: 0,
        })
      })
      placeOrbitLabels(
        next,
        earthLabel.value,
        width,
        height,
        moonLabel.value.visible ? moonLabel.value : undefined,
      )
      labels.value = next
      renderer!.render(scene, camera)
      return settling
    }
    requestRender()
    syncSignals()
  } catch (error) {
    if (import.meta.dev) console.warn('Universe renderer initialization failed:', error)
    unsupported.value = true
  }
})
watch(() => props.projects, populate)
watch(() => props.metric, requestRender)
watch([() => props.projects, () => props.visibleIds, motionStopped], syncSignals)
watch([() => props.paused, () => props.suspended, reducedMotion, sceneVisible], syncRendering)
watch([previewId, () => props.selectedId], requestRender)
watch(
  () => props.visibleIds,
  (ids) => {
    if (previewId.value && !ids.includes(previewId.value)) closePreview()
    requestRender()
  },
)
onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(frame)
  keepPreview()
  observer?.disconnect()
  motionQuery?.removeEventListener('change', motionChanged)
  renderer?.domElement.removeEventListener('webglcontextlost', contextLost)
  if (scene) disposeObject(scene)
  glowTexture?.dispose()
  landTexture?.dispose()
  renderer?.dispose()
  renderer?.forceContextLoss()
  renderer?.domElement.remove()
})
</script>
<template>
  <div
    ref="host"
    class="universe-canvas"
    :class="{ 'fallback-mode': unsupported, 'motion-stopped': motionStopped }"
    @wheel="wheel"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="pointerUp"
    @pointercancel="pointerUp"
    @lostpointercapture="pointerUp"
    @keydown.esc.stop="closePreview"
  >
    <div v-if="unsupported" class="fallback-projects">
      <p>
        <AppIcon name="info" :size="16" />3D isn’t available here. Your projects are still within
        reach.
      </p>
      <button
        v-for="project in projects.filter((item) => visibleIds.includes(item.id))"
        :key="project.id"
        class="fallback-project"
        @click="emit('select', project)"
      >
        <span
          >{{ project.name }}{{ projectActivity(project).dormant ? ' · Comet (90d+)' : '' }}</span
        ><StatusBadge :status="project.deployment.status" /><span
          >{{ metricText(project, metric) }} {{ metricLabel(project, metric) }}</span
        >
      </button>
    </div>
    <template v-else>
      <svg class="orbit-label-lines" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
        <template v-for="label in renderLabels" :key="label.project.id">
          <line
            v-if="
              Math.abs(label.labelX - label.x) > 15 ||
              Math.abs(label.labelY - label.y - Math.max(15, label.radius) - 11) > 15
            "
            :x1="label.x"
            :y1="label.y + label.radius + 3"
            :x2="label.labelX"
            :y2="label.labelY - 4"
          />
        </template>
      </svg>
      <button
        class="earth-target"
        :style="{
          left: `${earthLabel.x}px`,
          top: `${earthLabel.y}px`,
          width: `${earthLabel.radius * 2}px`,
          height: `${earthLabel.radius * 2}px`,
        }"
        aria-label="Earth · Home base · Reset camera"
        :data-detailed="earthDetailed"
        :data-spin="elapsed"
        @click.stop="reset"
      >
        <span>EARTH<small>HOME BASE</small></span>
      </button>
      <span
        v-if="moonLabel.visible"
        class="reference-moon-label"
        :style="{ left: `${moonLabel.x}px`, top: `${moonLabel.y - 23}px` }"
        :aria-label="`Moon · ${moonLabel.phase.name} · ${Math.round(moonLabel.phase.illuminated * 100)}% illuminated · illustrative 60-second cycle`"
        :data-phase="moonLabel.phase.radians"
        :data-illuminated="moonLabel.phase.illuminated"
        >MOON</span
      >
      <component
        :is="projectSiteUrl(label.project) ? 'a' : 'button'"
        v-for="label in renderLabels"
        :key="label.project.id"
        class="planet-target"
        :class="{
          selected: selectedId === label.project.id,
          comet: projectActivity(label.project).dormant,
          'preview-active': previewId === label.project.id,
        }"
        :href="projectSiteUrl(label.project)"
        :target="projectSiteUrl(label.project) ? '_blank' : undefined"
        :rel="projectSiteUrl(label.project) ? 'noopener noreferrer' : undefined"
        :style="{
          left: `${label.x}px`,
          top: `${label.y}px`,
          width: `${Math.max(width < 560 ? 44 : 30, label.radius * 2)}px`,
          height: `${Math.max(width < 560 ? 44 : 30, label.radius * 2)}px`,
          '--planet-color': assignments[label.project.id]!.color,
        }"
        :aria-label="`${label.project.name}, ${!metricAvailable(label.project, metric) ? 'unavailable' : metricText(label.project, metric)} ${metricLabel(label.project, metric)}, ${label.project.deployment.status}${projectActivity(label.project).dormant ? ', comet, 90+ days inactive' : ''}${projectSiteUrl(label.project) ? ', open website in new tab' : ', preview project'}`"
        :aria-expanded="previewId === label.project.id"
        :aria-controls="previewId === label.project.id ? 'planet-preview' : undefined"
        :data-planet-id="label.project.id"
        :data-body="assignments[label.project.id]!.kind"
        :data-glow="glows[label.project.id] === null ? 'unavailable' : glows[label.project.id]"
        :data-spin="objects.get(label.project.id)?.spin"
        @click.stop="activate($event, label.project)"
        @keydown.down.prevent="focusPreview(label.project)"
        @pointerenter="showPreview(label.project, $event)"
        @pointerleave="scheduleHide"
        @focus="showPreview(label.project)"
        @focusout="focusOut"
      >
        <span
          v-if="signals[label.project.id]"
          :key="signals[label.project.id]"
          class="deployment-signal"
          aria-hidden="true"
          @animationend="delete signals[label.project.id]"
        />
        <span
          class="planet-label"
          :style="{
            marginLeft: `${label.labelX - label.x}px`,
            top: `${label.labelY - label.y + Math.max(width < 560 ? 22 : 15, label.radius)}px`,
          }"
          ><strong
            ><i :style="{ background: statusColors[label.project.deployment.status] }" />{{
              label.project.name
            }}</strong
          ><span v-if="projectActivity(label.project).dormant" class="comet-caption"
            >COMET · {{ projectActivity(label.project).days }}D</span
          ><span v-else
            ><span class="body-name">{{ assignments[label.project.id]!.label }} · </span
            >{{ !metricAvailable(label.project, metric) ? '—' : metricText(label.project, metric) }}
            <span class="metric-label">{{
              metric === 'deployments' ? 'deploys' : metricLabel(label.project, metric)
            }}</span></span
          ></span
        >
      </component>
      <div
        v-if="previewProject"
        id="planet-preview"
        class="planet-preview"
        role="region"
        :aria-label="`${previewProject.name} preview`"
        :style="previewPosition"
        @pointerenter="keepPreview"
        @pointerleave="scheduleHide"
        @focusin="keepPreview"
        @focusout="focusOut"
        @pointerdown.stop
        @wheel.stop
      >
        <PlanetPreview
          :project="previewProject"
          :appearance="assignments[previewProject.id]!"
          :metric="metric"
          @select="selectDetails"
          @close="closePreview"
        />
      </div>
    </template>
  </div>
</template>
