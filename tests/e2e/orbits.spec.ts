import { expect, test, type Page } from '@playwright/test'

const projectPositions = (page: Page) =>
  page.locator('.planet-target').evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect()
      return {
        id: element.getAttribute('data-planet-id'),
        x: box.x,
        y: box.y,
        spin: element.getAttribute('data-spin'),
        phase: element.getAttribute('data-phase'),
      }
    }),
  )

test('Earth is largest and detailed; revolution and axial rotation pause, resume and hold on hover', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const earth = page.locator('.earth-target')
  const satellite = page.locator('.reference-moon-label')
  await expect(earth).toHaveAttribute('data-detailed', 'true')
  const initialPhase = Number(await satellite.getAttribute('data-phase'))
  await expect
    .poll(async () => Number(await satellite.getAttribute('data-phase')))
    .toBeGreaterThan(initialPhase)
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
  const stoppedPhase = await satellite.getAttribute('data-phase')
  await page.waitForTimeout(350)
  expect(await jupiter.boundingBox()).toEqual(stopped)
  expect(await jupiter.getAttribute('data-spin')).toBe(stoppedSpin)
  expect(await earth.getAttribute('data-spin')).toBe(stoppedEarth)
  expect(await satellite.getAttribute('data-phase')).toBe(stoppedPhase)
  await page.getByRole('button', { name: 'Resume orbit', exact: true }).click()
  await expect(page.locator('.accretion-flow')).toHaveCSS('animation-play-state', 'running')
  await expect
    .poll(async () => Number(await satellite.getAttribute('data-phase')))
    .toBeGreaterThan(Number(stoppedPhase))
  const box = (await jupiter.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await expect(jupiter).toHaveAttribute('aria-expanded', 'true')
  const hovered = await jupiter.boundingBox()
  const hoveredSpin = await jupiter.getAttribute('data-spin')
  const systemOnHover = await projectPositions(page)
  await page.waitForTimeout(700)
  expect(await projectPositions(page)).toEqual(systemOnHover)
  expect(await jupiter.boundingBox()).toEqual(hovered)
  expect(await jupiter.getAttribute('data-spin')).toBe(hoveredSpin)
  await page.mouse.move(0, 0)
  await expect
    .poll(async () => {
      const current = (await jupiter.boundingBox())!
      return Math.hypot(current.x - hovered!.x, current.y - hovered!.y)
    })
    .toBeGreaterThan(2)
  const resumed = await projectPositions(page)
  expect(resumed.every((body, index) => body.spin !== systemOnHover[index]!.spin)).toBe(true)
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
  const phase = await page.locator('.reference-moon-label').getAttribute('data-phase')
  await expect(moon).toHaveCount(1)
  const box = await moon.boundingBox()
  await page.waitForTimeout(300)
  expect(await moon.boundingBox()).toEqual(box)
  expect(await moon.getAttribute('data-spin')).toBe('0')
  expect(await page.locator('.reference-moon-label').getAttribute('data-phase')).toBe(phase)
})

for (const touch of [false, true]) {
  test(`${touch ? 'touch' : 'keyboard'} preview and project details pause every project together`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      hasTouch: touch,
      isMobile: touch,
      reducedMotion: 'no-preference',
    })
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:3100')
    const planet = page.locator('[data-planet-id="prj_demo_gryd"]')
    await expect(page.locator('.planet-target')).toHaveCount(8)
    if (touch) await planet.tap()
    else await planet.focus()
    const preview = page.getByRole('region', { name: 'gryd preview' })
    await expect(preview).toBeVisible()
    const inspected = await projectPositions(page)
    await page.waitForTimeout(700)
    expect(
      (await projectPositions(page)).map(({ id, spin, phase }) => ({ id, spin, phase })),
    ).toEqual(inspected.map(({ id, spin, phase }) => ({ id, spin, phase })))
    await preview.getByRole('button', { name: 'Project details' }).click()
    await expect(page.getByRole('complementary', { name: 'Project details' })).toBeVisible()
    // The camera may move toward the selection; the project phases must stay still.
    const orbits = (await projectPositions(page)).map(({ spin, phase }) => ({ spin, phase }))
    await page.waitForTimeout(700)
    expect((await projectPositions(page)).map(({ spin, phase }) => ({ spin, phase }))).toEqual(
      orbits,
    )
    await page.getByRole('button', { name: 'Close project details' }).click()
    await expect
      .poll(async () =>
        (await projectPositions(page)).every(
          (body, i) => body.spin !== orbits[i]!.spin && body.phase !== orbits[i]!.phase,
        ),
      )
      .toBe(true)
    await context.close()
  })
}
