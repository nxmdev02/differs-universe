import { expect, test } from '@playwright/test'

for (const width of [320, 390, 768]) {
  test(`mobile layout at ${width}px keeps navigation, controls, lists and settings usable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await expect(page.locator('.planet-target')).toHaveCount(8)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width <= 760) {
      const rail = (await page.locator('.rail').boundingBox())!
      expect(rail.y + rail.height).toBeCloseTo(844, 0)
      expect(rail.width).toBe(width)
      for (const name of ['Sync projects', 'Pause orbit']) {
        const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
      expect(
        await page.getByRole('searchbox').evaluate((el) => getComputedStyle(el).fontSize),
      ).toBe('16px')
    }
    await page.screenshot({ path: `artifacts/mobile-${width}-universe.png`, fullPage: true })
    await page.getByRole('button', { name: 'List', exact: true }).click()
    await expect(page.locator('.project-card')).toHaveCount(8)
    if (width <= 760)
      expect(
        await page
          .locator('.project-grid')
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      ).toBe(true)
    await page.locator('.project-card').last().scrollIntoViewIfNeeded()
    await page.locator('.project-card').last().click()
    const panel = page.getByRole('complementary', { name: 'Project details' })
    await expect(panel).toBeVisible()
    const box = (await panel.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(844)
    await page.getByRole('button', { name: 'Close project details' }).click()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    await page.screenshot({ path: `artifacts/mobile-${width}-settings.png`, fullPage: true })
    const back = dialog.getByRole('button', { name: 'Back to your universe' })
    await back.scrollIntoViewIfNeeded()
    expect((await back.boundingBox())!.y + (await back.boundingBox())!.height).toBeLessThanOrEqual(
      844,
    )
    await page.getByRole('button', { name: 'Close settings' }).click()
  })
}

test('touch scrolling and pinch zoom work while previews stay inside the mobile viewport', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:3100')
  await expect(page.locator('.planet-target')).toHaveCount(8)
  const stage = page.locator('.universe-stage')
  await stage.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 100))
  const cdp = await context.newCDPSession(page)
  const oldScroll = await page.evaluate(() => scrollY)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 40, y: 480, id: 1 }],
  })
  for (const y of [440, 400, 360, 320, 280])
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 40, y, id: 1 }],
    })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(oldScroll + 60)
  await stage.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 100))
  const earth = page.locator('.earth-target')
  const before = (await earth.boundingBox())!.width
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: 140, y: 350, id: 1 },
      { x: 240, y: 350, id: 2 },
    ],
  })
  for (const delta of [10, 20, 30, 40])
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: 140 - delta, y: 350, id: 1 },
        { x: 240 + delta, y: 350, id: 2 },
      ],
    })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(async () => (await earth.boundingBox())!.width).toBeGreaterThan(before + 10)
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click()
  await page.locator('[data-planet-id="prj_demo_gryd"]').tap()
  const preview = page.getByRole('region', { name: 'gryd preview' })
  await expect(preview).toBeVisible()
  const box = (await preview.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(780)
  await expect(preview.getByRole('button', { name: 'Project details' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/mobile-touch-preview.png', fullPage: true })
  await preview.getByRole('button', { name: 'Close preview' }).tap()
  await expect(preview).toHaveCount(0)
  expect(errors).toEqual([])
  await context.close()
})

test('login remains readable on narrow screens and landscape', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/login?error=denied')
    await expect(page.getByRole('heading', { name: 'Your universe awaits.' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('does not have access')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const button = page.getByRole('button', { name: 'Google sign-in unavailable' })
    await button.scrollIntoViewIfNeeded()
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
})
