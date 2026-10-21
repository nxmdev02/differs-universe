import { expect, test } from '@playwright/test'

test('the flyby moves and rotates, respects pause and settings, and stops with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.planet-target')).toHaveCount(8)
  const flight = page.locator('.endurance-flight')
  const spin = page.locator('.endurance-spin')
  await expect(flight).toHaveCount(1)
  const transform = () => flight.evaluate((el) => getComputedStyle(el).transform)
  const first = await transform()
  await expect.poll(transform).not.toBe(first)
  await page.getByRole('button', { name: 'Pause orbit', exact: true }).click()
  await expect(flight).toHaveCSS('animation-play-state', 'paused')
  await expect(spin).toHaveCSS('animation-play-state', 'paused')
  const paused = await transform()
  const rotation = await spin.evaluate((el) => getComputedStyle(el).transform)
  await page.waitForTimeout(350)
  expect(await transform()).toBe(paused)
  expect(await spin.evaluate((el) => getComputedStyle(el).transform)).toBe(rotation)
  await page.getByRole('button', { name: 'Resume orbit', exact: true }).click()
  await expect.poll(transform).not.toBe(paused)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(flight).toHaveCSS('animation-play-state', 'paused')
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(flight).toHaveCSS('animation-play-state', 'running')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(flight).toHaveCSS('animation-play-state', 'paused')
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(flight).toHaveCSS('animation-play-state', 'running')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(flight).toHaveCSS('animation-name', 'none')
  await expect(spin).toHaveCSS('animation-name', 'none')
  await expect(flight).toHaveCSS('opacity', '1')
  await expect(page.locator('.earth-target > span')).toHaveText('EARTH')
  await expect(page.locator('.field-title')).toHaveCount(0)
})

for (const mobile of [false, true]) {
  test(`flyby crosses the lower foreground in ${mobile ? 'mobile' : 'desktop'} layout`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    await expect(page.locator('.planet-target')).toHaveCount(8)
    const positions: { x: number; y: number }[] = []
    for (const progress of [0.06, 0.48, 0.9]) {
      positions.push(
        await page.locator('.endurance-flight').evaluate((el, progress) => {
          const animation = el.getAnimations()[0]!
          animation.pause()
          animation.currentTime = progress * 32000
          const matrix = new DOMMatrix(getComputedStyle(el).transform)
          return { x: matrix.e, y: matrix.f }
        }, progress),
      )
    }
    expect(positions[0]!.x).toBeLessThan(positions[1]!.x)
    expect(positions[1]!.x).toBeLessThan(positions[2]!.x)
    expect(positions[1]!.y).toBeGreaterThan(positions[0]!.y)
    expect(positions[1]!.y).toBeGreaterThan(positions[2]!.y)
    await page.locator('.endurance-flight').evaluate((el) => {
      el.getAnimations()[0]!.currentTime = 32000 * 0.25
    })
    await page.locator('.endurance-spin').evaluate((el) => {
      const animation = el.getAnimations()[0]!
      animation.pause()
      animation.currentTime = 3000
    })
    await expect(page.locator('.endurance')).toHaveCSS('pointer-events', 'none')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.locator('.universe-stage').screenshot({
      path: `artifacts/endurance-${mobile ? 'mobile' : 'desktop'}-dark.png`,
    })
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByText('Light', { exact: true }).click()
    await page.getByRole('button', { name: 'Close settings' }).click()
    await page.locator('.universe-stage').screenshot({
      path: `artifacts/endurance-${mobile ? 'mobile' : 'desktop'}-light.png`,
    })
    expect(errors).toEqual([])
  })
}
