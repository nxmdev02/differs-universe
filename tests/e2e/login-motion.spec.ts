import { expect, test } from '@playwright/test'

test('login globe rotates, follows the pointer and pauses without moving the login control', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/login')
  const scene = page.locator('.login-universe')
  const earth = page.locator('.earth-map')
  const moon = page.locator('.login-satellite:not(.distant) i')
  await expect(scene).toHaveAttribute('data-motion', 'playing')
  const position = () => earth.evaluate((el) => getComputedStyle(el).backgroundPosition)
  const before = await position()
  await expect.poll(position).not.toBe(before)
  const moonBefore = (await moon.boundingBox())!
  await expect
    .poll(async () =>
      Math.hypot(
        (await moon.boundingBox())!.x - moonBefore.x,
        (await moon.boundingBox())!.y - moonBefore.y,
      ),
    )
    .toBeGreaterThan(2)
  const layer = page.locator('.universe-layer')
  const tilt = await layer.evaluate((el) => getComputedStyle(el).transform)
  await page.mouse.move(1200, 100)
  await expect.poll(() => layer.evaluate((el) => getComputedStyle(el).transform)).not.toBe(tilt)
  await page.getByRole('button', { name: 'Pause login animation' }).click()
  await expect(scene).toHaveAttribute('data-motion', 'paused')
  await expect(page.locator('.accretion-flow')).toHaveCSS('animation-play-state', 'paused')
  const paused = await position()
  const stoppedMoon = await moon.boundingBox()
  await page.waitForTimeout(400)
  expect(await position()).toBe(paused)
  expect(await moon.boundingBox()).toEqual(stoppedMoon)
  const signIn = page.getByRole('button', { name: 'Google sign-in unavailable' })
  const signInBefore = await signIn.boundingBox()
  await page.getByRole('button', { name: 'Send a signal from Earth' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.signal-ring')).toBeVisible()
  await expect(
    page.getByRole('status').filter({ hasText: 'A signal sent from Earth.' }),
  ).toBeVisible()
  expect(await signIn.boundingBox()).toEqual(signInBefore)
  await page.getByRole('button', { name: 'Resume login animation' }).click()
  await expect(page.locator('.accretion-flow')).toHaveCSS('animation-play-state', 'running')
  await expect.poll(position).not.toBe(paused)
  await page.screenshot({ path: 'artifacts/login-interactive-desktop.png', fullPage: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(scene).toHaveAttribute('data-motion', 'reduced')
  await expect(page.locator('.accretion-flow')).toHaveCSS('animation-name', 'none')
  const reduced = await position()
  await page.waitForTimeout(300)
  expect(await position()).toBe(reduced)
})

test('mobile tap sends a signal and reduced motion keeps the scene still', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('http://127.0.0.1:3100/login')
  await expect(page.locator('.login-universe')).toHaveAttribute('data-motion', 'reduced')
  await expect(page.getByRole('button', { name: 'Pause login animation' })).toBeDisabled()
  const earth = page.getByRole('button', { name: 'Send a signal from Earth' })
  await earth.tap()
  await expect(page.locator('.signal-ring')).toHaveClass(/still/)
  expect(
    await page.locator('.signal-ring').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'artifacts/login-interactive-mobile.png', fullPage: true })
  expect(errors).toEqual([])
  await context.close()
})
