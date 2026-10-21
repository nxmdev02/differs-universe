import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`Sun renders independently of project metrics and respects motion controls at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' && /shader|WebGLProgram/i.test(message.text()))
        errors.push(message.text())
    })
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    const sun = page.getByRole('img', { name: 'Sun · reference star' })
    await expect(page.locator('.earth-target')).toHaveAttribute('data-detailed', 'true')
    await expect(sun).toBeVisible()
    await expect(page.locator('.planet-target')).toHaveCount(8)
    const phase = await sun.getAttribute('data-phase')
    await expect.poll(() => sun.getAttribute('data-phase')).not.toBe(phase)
    await page.getByRole('button', { name: 'Pause orbit', exact: true }).click()
    const paused = await sun.getAttribute('data-phase')
    await page.waitForTimeout(300)
    expect(await sun.getAttribute('data-phase')).toBe(paused)
    const sunBox = (await sun.boundingBox())!
    const earthBox = (await page.locator('.earth-target').boundingBox())!
    expect(sunBox.width).toBeLessThan(earthBox.width)
    const canvas = (await page.locator('.universe-canvas').boundingBox())!
    expect(sunBox.x).toBeGreaterThan(canvas.x)
    expect(sunBox.x + sunBox.width).toBeLessThan(canvas.x + canvas.width)
    expect(sunBox.y + sunBox.height).toBeLessThan(earthBox.y)
    const pixels = await page.screenshot({ clip: sunBox })
    const golden = await page.evaluate(async (base64) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      let count = 0
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i]! > 180 && pixels[i + 1]! > 50 && pixels[i]! > pixels[i + 2]! * 1.5) count++
      return count / (canvas.width * canvas.height)
    }, pixels.toString('base64'))
    expect(golden).toBeGreaterThan(0.55)
    await page.locator('.universe-stage').screenshot({ path: `artifacts/sun-${width}-dark.png` })
    await page.getByRole('button', { name: 'MAU', exact: true }).click()
    expect((await sun.boundingBox())!.width).toBe(sunBox.width)
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByText('Light', { exact: true }).click()
    await page.getByRole('button', { name: 'Close settings' }).click()
    await page.locator('.universe-stage').screenshot({ path: `artifacts/sun-${width}-light.png` })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: 'Resume orbit', exact: true }).click()
    const reduced = await sun.getAttribute('data-phase')
    await page.waitForTimeout(300)
    expect(await sun.getAttribute('data-phase')).toBe(reduced)
    expect(errors).toEqual([])
  })
}
