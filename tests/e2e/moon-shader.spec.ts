import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

test('the actual moon shader renders crescent, quarter and full illumination', async ({ page }) => {
  let materialUrl = '',
    threeUrl = ''
  page.on('response', (response) => {
    if (/\/utils\/universe-materials\.ts(?:\?|$)/.test(response.url())) materialUrl = response.url()
    if (/\/deps\/three\.js(?:\?|$)/.test(response.url())) threeUrl = response.url()
  })
  await page.goto('/')
  await expect(page.locator('.reference-moon-label')).toBeVisible()
  expect(materialUrl).not.toBe('')
  expect(threeUrl).not.toBe('')
  const results = await page.evaluate(
    async ({ materialUrl, threeUrl }) => {
      // Exercise the same material used by the running scene, rather than a second shader.
      const { planetMaterial } = await import(materialUrl)
      const THREE = await import(threeUrl)
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
      renderer.setSize(128, 128)
      renderer.setClearColor('#080d10')
      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-1.1, 1.1, 1.1, -1.1, 0.1, 10)
      camera.position.z = 3
      const material = planetMaterial({
        kind: 'moon',
        color: '#a9adb5',
        accent: '#e4e4e4',
        seed: 2,
      })
      const geometry = new THREE.SphereGeometry(1, 24, 16)
      scene.add(new THREE.Mesh(geometry, material))
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 128
      const context = canvas.getContext('2d')!
      const results = []
      for (const angle of [
        0,
        Math.PI / 4,
        Math.PI / 2,
        Math.PI,
        (3 * Math.PI) / 2,
        (7 * Math.PI) / 4,
      ]) {
        material.uniforms.lightDirection.value.set(Math.sin(angle), 0, -Math.cos(angle))
        renderer.render(scene, camera)
        context.drawImage(renderer.domElement, 0, 0)
        const pixels = context.getImageData(0, 0, 128, 128).data
        let light = 0,
          count = 0
        for (let y = 0; y < 128; y++)
          for (let x = 0; x < 128; x++) {
            if (Math.hypot(x - 64, y - 64) > 56) continue
            const i = (y * 128 + x) * 4
            light += pixels[i]! + pixels[i + 1]! + pixels[i + 2]!
            count++
          }
        results.push({
          angle,
          light: light / (count * 3),
          image: canvas.toDataURL('image/png').split(',')[1]!,
        })
      }
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      return results
    },
    { materialUrl, threeUrl },
  )
  for (const [i, result] of results.entries())
    await writeFile(`artifacts/moon-phase-${i}.png`, Buffer.from(result.image, 'base64'))
  expect(results[0]!.light).toBeLessThan(results[3]!.light * 0.1)
  expect(results[1]!.light).toBeGreaterThan(results[0]!.light)
  expect(results[2]!.light).toBeGreaterThan(results[1]!.light * 1.5)
  expect(results[3]!.light).toBeGreaterThan(results[2]!.light * 1.5)
  expect(results[4]!.light).toBeGreaterThan(results[5]!.light * 1.5)
})
