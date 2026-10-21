import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { SOLAR_BODIES } from '../../shared/utils/project-appearance'

test('planet surfaces and rings render distinct details without shader errors', async ({
  page,
}) => {
  let materialUrl = '',
    threeUrl = ''
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && /shader|WebGLProgram/i.test(message.text()))
      errors.push(message.text())
  })
  page.on('response', (response) => {
    if (/\/utils\/universe-materials\.ts(?:\?|$)/.test(response.url())) materialUrl = response.url()
    if (/\/deps\/three\.js(?:\?|$)/.test(response.url())) threeUrl = response.url()
  })
  await page.goto('/')
  await expect(page.locator('.earth-target')).toHaveAttribute('data-detailed', 'true')
  const bodies = [
    ...SOLAR_BODIES,
    { kind: 'moon', label: 'Moon', color: '#a9adb5', accent: '#e4e4e4' },
    { kind: 'comet', label: 'Comet', color: '#a6cbdc', accent: '#e7f5ff' },
  ]
  const result = await page.evaluate(
    async ({ materialUrl, threeUrl, bodies }) => {
      const { planetMaterial, planetRingMaterial } = await import(materialUrl)
      const THREE = await import(threeUrl)
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
      renderer.setSize(220, 220)
      renderer.setClearColor('#090d13')
      const gallery = document.createElement('canvas')
      gallery.width = 880
      gallery.height = 720
      const ctx = gallery.getContext('2d')!
      ctx.fillStyle = '#090d13'
      ctx.fillRect(0, 0, gallery.width, gallery.height)
      const camera = new THREE.OrthographicCamera(-2.15, 2.15, 2.15, -2.15, 0.1, 10)
      camera.position.z = 5
      const pixels: number[] = []
      for (const [index, body] of bodies.entries()) {
        const scene = new THREE.Scene()
        const geometry = new THREE.SphereGeometry(1, 32, 20)
        const material = planetMaterial({ ...body, seed: 2 })
        const sphere = new THREE.Mesh(geometry, material)
        sphere.rotation.set(0.12, 0, body.kind === 'uranus' ? 1.7 : -0.15)
        scene.add(sphere)
        const rings =
          body.kind === 'saturn'
            ? [
                [1.38, 1.65, 0.5],
                [1.72, 1.94, 0.24],
              ]
            : body.kind === 'uranus'
              ? [
                  [1.62, 1.66, 0.2],
                  [1.85, 1.87, 0.12],
                ]
              : []
        for (const [inner, outer, opacity] of rings) {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(inner, outer, 64),
            planetRingMaterial(body.accent, opacity, inner, outer),
          )
          ring.rotation.set(body.kind === 'uranus' ? 0.3 : 1.12, 0.15, -0.4)
          scene.add(ring)
        }
        renderer.render(scene, camera)
        const x = (index % 4) * 220,
          y = Math.floor(index / 4) * 240
        ctx.drawImage(renderer.domElement, x, y)
        const data = ctx.getImageData(x, y, 220, 220).data
        let visible = 0
        for (let i = 0; i < data.length; i += 4)
          if (Math.max(data[i]!, data[i + 1]!, data[i + 2]!) > 35) visible++
        pixels.push(visible)
        ctx.fillStyle = '#c9d7de'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(body.label, x + 110, y + 222)
        scene.traverse(
          (object: { geometry?: { dispose: () => void }; material?: { dispose: () => void } }) => {
            object.geometry?.dispose()
            object.material?.dispose()
          },
        )
      }
      renderer.dispose()
      renderer.forceContextLoss()
      return { pixels, image: gallery.toDataURL('image/png').split(',')[1]! }
    },
    { materialUrl, threeUrl, bodies },
  )
  await writeFile('artifacts/planet-material-gallery.png', Buffer.from(result.image, 'base64'))
  expect(result.pixels.every((count) => count > 1000)).toBe(true)
  expect(new Set(result.pixels).size).toBeGreaterThan(7)
  expect(errors).toEqual([])
})
