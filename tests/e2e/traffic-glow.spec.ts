import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

for (const theme of ['dark', 'light']) {
  test(`${theme}: one and two visitors change rendered planet pixels, zero and missing stay quiet`, async ({
    page,
    request,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const payload = await (await request.get('/api/projects')).json()
    const project = payload.projects[0]
    project.analytics.dau = 0
    project.deployment.createdAt = new Date(Date.now() - 2 * 86400000).toISOString()
    project.github = null
    payload.projects = [project]
    await page
      .context()
      .addCookies([{ name: 'differs-theme', value: theme, domain: '127.0.0.1', path: '/' }])
    await page.goto('/')
    await expect(page.locator('.earth-target')).toHaveAttribute('data-detailed', 'true')
    await page.route('**/api/projects', (route) => route.fulfill({ json: payload }))
    const planet = page.locator(`[data-planet-id="${project.id}"]`)
    const samples: { value: number | null; light: number }[] = []
    for (const value of [0, 1, 2, 20, null]) {
      project.analytics.dau = value
      await page.getByRole('button', { name: 'Sync projects' }).click()
      await expect(page.locator('.planet-target')).toHaveCount(1)
      await expect(planet).toHaveAttribute('data-body', 'jupiter')
      await expect(planet).toHaveAttribute(
        'data-glow',
        value === null ? 'unavailable' : value === 0 ? '0' : /0\./,
      )
      // Wait for the one demand-rendered frame, then inspect the actual sphere's rim pixels.
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      )
      const box = (await planet.boundingBox())!
      const image = await page.screenshot({
        path: `artifacts/glow-${theme}-${value}.png`,
        clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      })
      const light = await page.evaluate(async (base64) => {
        const img = new Image()
        img.src = `data:image/png;base64,${base64}`
        await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const context = canvas.getContext('2d')!
        context.drawImage(img, 0, 0)
        const data = context.getImageData(0, 0, img.width, img.height).data
        let total = 0,
          count = 0
        for (let y = 0; y < img.height; y++)
          for (let x = 0; x < img.width; x++) {
            const r = Math.hypot(
              (x + 0.5 - img.width / 2) / (img.width / 2),
              (y + 0.5 - img.height / 2) / (img.height / 2),
            )
            if (r < 0.82 || r > 0.96) continue
            const i = (y * img.width + x) * 4
            total += data[i]! * 0.2126 + data[i + 1]! * 0.7152 + data[i + 2]! * 0.0722
            count++
          }
        return total / count
      }, image.toString('base64'))
      samples.push({ value, light })
    }
    await writeFile(`artifacts/glow-${theme}-pixels.json`, JSON.stringify(samples, null, 2))
    expect(samples[1]!.light - samples[0]!.light).toBeGreaterThan(15)
    expect(samples[2]!.light - samples[1]!.light).toBeGreaterThan(1)
    expect(samples[3]!.light).toBeGreaterThan(samples[2]!.light)
    expect(Math.abs(samples[4]!.light - samples[0]!.light)).toBeLessThan(1)
    expect(errors).toEqual([])
  })
}
