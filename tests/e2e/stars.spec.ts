import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

test('only selected stars change brightness; their size and other stars stay fixed', async ({
  page,
}) => {
  let starUrl = '',
    threeUrl = ''
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && /shader|WebGLProgram/i.test(message.text()))
      errors.push(message.text())
  })
  page.on('response', (response) => {
    if (/\/utils\/starfield\.ts(?:\?|$)/.test(response.url())) starUrl = response.url()
    if (/\/deps\/three\.js(?:\?|$)/.test(response.url())) threeUrl = response.url()
  })
  await page.goto('/')
  await expect(page.locator('.earth-target')).toHaveAttribute('data-detailed', 'true')
  const result = await page.evaluate(
    async ({ starUrl, threeUrl }) => {
      const { createStarfield } = await import(starUrl)
      const THREE = await import(threeUrl)
      const time = { value: 0 }
      const stars = createStarfield('#ffffff', time)
      const twinkle = stars.geometry.getAttribute('twinkle')
      const selected = Array.from({ length: twinkle.count }, (_, i) => ({
        strength: twinkle.getX(i),
        period: twinkle.getZ(i),
      })).filter((value) => value.strength > 0)
      const positions = stars.geometry.getAttribute('position')
      // Keep the real material and timing attributes; spread a sample out for pixel inspection.
      for (let i = 0; i < 39; i++)
        positions.setXYZ(i, (i % 13) * 4 - 24, Math.floor(i / 13) * 10 - 10, 0)
      positions.needsUpdate = true
      stars.geometry.setDrawRange(0, 39)
      stars.frustumCulled = false
      stars.material.size = 4
      const scene = new THREE.Scene()
      scene.add(stars)
      const camera = new THREE.OrthographicCamera(-28, 28, 16, -16, 0.1, 10)
      camera.position.z = 5
      const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true })
      renderer.setSize(560, 320)
      renderer.setClearColor('#000000')
      const canvas = document.createElement('canvas')
      canvas.width = 560
      canvas.height = 320
      const context = canvas.getContext('2d')!
      const frames = []
      for (const seconds of [0, 1, 2, 3, 6]) {
        time.value = seconds
        renderer.render(scene, camera)
        context.drawImage(renderer.domElement, 0, 0)
        const values = Array.from({ length: 39 }, (_, i) => {
          const x = ((i % 13) * 4 + 4) * 10,
            y = (26 - Math.floor(i / 13) * 10) * 10
          const data = context.getImageData(x - 3, y - 3, 6, 6).data
          let total = 0,
            area = 0
          for (let offset = 0; offset < data.length; offset += 4) {
            total += data[offset]!
            if (data[offset]! > 10) area++
          }
          return { total, area }
        })
        frames.push({ values, image: canvas.toDataURL('image/png').split(',')[1]! })
      }
      stars.geometry.dispose()
      stars.material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      return { count: twinkle.count, selected, frames }
    },
    { starUrl, threeUrl },
  )
  expect(result.selected.length / result.count).toBeGreaterThan(0.05)
  expect(result.selected.length / result.count).toBeLessThan(0.1)
  expect(result.selected.every(({ period }) => period >= 4 && period <= 8)).toBe(true)
  for (let i = 0; i < 39; i++) {
    const brightness = result.frames.map((frame) => frame.values[i]!.total)
    const change = Math.max(...brightness) - Math.min(...brightness)
    if (i % 13 === 0) expect(change).toBeGreaterThan(100)
    else expect(change).toBe(0)
    expect(new Set(result.frames.map((frame) => frame.values[i]!.area)).size).toBe(1)
  }
  for (const [i, frame] of result.frames.entries())
    await writeFile(`artifacts/twinkle-${i}.png`, Buffer.from(frame.image, 'base64'))
  expect(errors).toEqual([])
})
