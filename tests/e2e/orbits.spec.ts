import { expect, test } from '@playwright/test'

test('Earth is largest and detailed; revolution and axial rotation pause, resume and hold on hover', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const earth = page.locator('.earth-target')
  await expect(earth).toHaveAttribute('data-detailed', 'true')
  const jupiter = page.locator('[data-body="jupiter"].planet-target').first()
  const saturn = page.locator('[data-body="saturn"].planet-target')
  expect((await earth.boundingBox())!.width).toBeGreaterThan((await jupiter.boundingBox())!.width)
  expect((await earth.boundingBox())!.width).toBeGreaterThan(
    (await saturn.boundingBox())!.width * 1.94,
  )
  const first = (await jupiter.boundingBox())!
  const spin = Number(await jupiter.getAttribute('data-spin'))
  await expect
    .poll(async () => {
      const current = (await jupiter.boundingBox())!
      return Math.hypot(current.x - first.x, current.y - first.y)
    })
    .toBeGreaterThan(2)
  await expect
    .poll(async () => Number(await jupiter.getAttribute('data-spin')))
    .toBeGreaterThan(spin)
  await page.getByRole('button', { name: 'Pause orbit', exact: true }).click()
  await expect(page.locator('.accretion-flow')).toHaveCSS('animation-play-state', 'paused')
  const stopped = await jupiter.boundingBox()
  const stoppedSpin = await jupiter.getAttribute('data-spin')
  const stoppedEarth = await earth.getAttribute('data-spin')
  await page.waitForTimeout(350)
  expect(await jupiter.boundingBox()).toEqual(stopped)
  expect(await jupiter.getAttribute('data-spin')).toBe(stoppedSpin)
  expect(await earth.getAttribute('data-spin')).toBe(stoppedEarth)
  await page.getByRole('button', { name: 'Resume orbit', exact: true }).click()
  await expect(page.locator('.accretion-flow')).toHaveCSS('animation-play-state', 'running')
  const box = (await jupiter.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await expect(jupiter).toHaveAttribute('aria-expanded', 'true')
  const hovered = await jupiter.boundingBox()
  const hoveredSpin = await jupiter.getAttribute('data-spin')
  await page.waitForTimeout(350)
  expect(await jupiter.boundingBox()).toEqual(hovered)
  expect(await jupiter.getAttribute('data-spin')).toBe(hoveredSpin)
  await page.mouse.move(0, 0)
  await expect
    .poll(async () => {
      const current = (await jupiter.boundingBox())!
      return Math.hypot(current.x - hovered!.x, current.y - hovered!.y)
    })
    .toBeGreaterThan(2)
})

test('zero-traffic projects stay planets and reduced motion keeps them stationary', async ({
  page,
}) => {
  await page.goto('/')
  const moon = page.locator('[data-planet-id="prj_demo_playground"]')
  await expect(moon).toHaveAttribute('data-body', 'pluto')
  await expect(moon).toHaveAttribute('data-glow', '0')
  await expect(page.locator('.deployment-signal')).toHaveCount(0)
  await expect(page.locator('.planet-target[data-body="moon"]')).toHaveCount(0)
  await expect(page.locator('.reference-moon-label')).toBeVisible()
  await expect(moon).toHaveCount(1)
  const box = await moon.boundingBox()
  await page.waitForTimeout(300)
  expect(await moon.boundingBox()).toEqual(box)
  expect(await moon.getAttribute('data-spin')).toBe('0')
})
