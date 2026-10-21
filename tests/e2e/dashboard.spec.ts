import { expect, test } from '@playwright/test'

test('universe renders every project, changes metrics and supports camera controls', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Project universe.' })).toBeVisible()
  await expect(page.locator('.planet-target')).toHaveCount(8)
  await expect(page.getByRole('button', { name: 'Earth · Home base · Reset camera' })).toBeVisible()
  await expect(page.locator('.brand')).toHaveText('differs')
  await expect(page.locator('.brand img, .brand svg')).toHaveCount(0)
  await page.screenshot({ path: 'artifacts/universe-desktop.png', fullPage: true })
  const planet = page.locator('[data-planet-id="prj_demo_portfolio"]')
  const initialBody = await planet.getAttribute('data-body')
  await page.getByRole('button', { name: 'MAU', exact: true }).click()
  await expect(planet).toHaveAttribute('aria-label', /1.4K MAU/i)
  // A rank that stays the same retains its solar-system identity and size.
  await expect(planet).toHaveAttribute('data-body', initialBody!)
  await page.getByRole('button', { name: 'Deployments', exact: true }).click()
  await expect(planet).toHaveAttribute('aria-label', /8 DEPLOYMENTS/)
  await page.getByRole('button', { name: 'DAU', exact: true }).click()
  const oldWidth = (await planet.boundingBox())!.width
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect.poll(async () => (await planet.boundingBox())!.width).toBeGreaterThan(oldWidth)
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click()
  await expect
    .poll(async () => Math.abs((await planet.boundingBox())!.width - oldWidth))
    .toBeLessThan(1)
  const canvas = await page.locator('.universe-canvas').boundingBox()
  const oldX = (await planet.boundingBox())!.x
  await page.mouse.move(canvas!.x + 50, canvas!.y + 100)
  await page.mouse.down()
  await page.mouse.move(canvas!.x + 130, canvas!.y + 140, { steps: 5 })
  await page.mouse.up()
  await expect.poll(async () => (await planet.boundingBox())!.x).toBeGreaterThan(oldX + 50)
  expect(errors).toEqual([])
})

test('hover and keyboard previews expose details without following demo domains', async ({
  page,
}) => {
  await page.goto('/')
  const planet = page.locator('[data-planet-id="prj_demo_gryd"]')
  await planet.hover()
  const preview = page.getByRole('region', { name: 'gryd preview' })
  await expect(preview).toBeVisible()
  await expect(preview).toContainText('Sample project')
  await expect(preview.getByRole('link')).toHaveCount(0)
  await planet.focus()
  await planet.press('ArrowDown')
  await expect(preview.getByRole('button', { name: 'Project details' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('complementary', { name: 'Project details' })).toBeVisible()
})

test('90-day comets open production domains; dragging does not navigate', async ({
  page,
  request,
}) => {
  const payload = await (await request.get('/api/projects')).json()
  const project = payload.projects[0]
  project.source = 'real'
  project.domains = ['project-preview.vercel.app', 'project.example.test']
  project.deployment.createdAt = new Date(Date.now() - 91 * 86400000).toISOString()
  project.github.lastCommitAt = null
  await page.goto('/')
  await expect(page.locator('.planet-target')).toHaveCount(8)
  await page.route('**/api/projects', (route) => route.fulfill({ json: payload }))
  await page.getByRole('button', { name: 'Sync projects' }).click()
  const planet = page.locator('[data-planet-id="prj_demo_gryd"]')
  await expect(planet).toHaveClass(/comet/)
  await expect(planet).toHaveAttribute('href', 'https://project.example.test/')
  await planet.hover()
  await expect(page.getByRole('region', { name: 'gryd preview' })).toContainText(
    '91 days since last known activity',
  )
  const popupPromise = page.waitForEvent('popup')
  await planet.click()
  const popup = await popupPromise
  await popup.close()
  let popups = 0
  page.on('popup', () => popups++)
  const box = (await planet.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 65, box.y + box.height / 2 + 20, { steps: 6 })
  await page.mouse.up()
  await expect(planet).toHaveAttribute('aria-expanded', 'false')
  expect(popups).toBe(0)
})

test('touch previews stay on the dashboard until Open website is chosen', async ({
  browser,
  request,
}) => {
  const payload = await (await request.get('/api/projects')).json()
  payload.projects[0].source = 'real'
  payload.projects[0].domains = ['project.example.test']
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:3100')
  await expect(page.locator('.planet-target')).toHaveCount(8)
  await page.route('**/api/projects', (route) => route.fulfill({ json: payload }))
  await page.getByRole('button', { name: 'Sync projects' }).click()
  const planet = page.locator('[data-planet-id="prj_demo_gryd"]')
  await expect(planet).toHaveAttribute('href', 'https://project.example.test/')
  await planet.tap()
  await expect(page.getByRole('region', { name: 'gryd preview' })).toBeVisible()
  expect(context.pages()).toHaveLength(1)
  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('link', { name: 'Open website', exact: true }).tap()
  await (await popupPromise).close()
  await context.close()
})

test('search, filters, project details, activity and sync work together', async ({
  page,
  request,
}) => {
  await page.goto('/')
  await expect(page.locator('.planet-target')).toHaveCount(8)
  await page.getByRole('searchbox', { name: 'Search projects' }).fill('gryd')
  // docs shares gryd's repository, so both should be searchable.
  await expect(page.locator('.project-row')).toHaveCount(2)
  await page.locator('[data-project-id="prj_demo_gryd"]').click()
  const panel = page.getByRole('complementary', { name: 'Project details' })
  await expect(panel.getByRole('heading', { name: 'gryd', exact: true })).toBeVisible()
  await expect(panel.locator('.timeline li')).toHaveCount(6)
  await page.screenshot({ path: 'artifacts/universe-details.png', fullPage: true })
  await panel.getByRole('button', { name: 'Commits', exact: true }).click()
  await expect(panel.locator('.timeline li')).toHaveCount(3)
  await page.getByRole('button', { name: 'Close project details' }).click()
  await page.getByRole('searchbox', { name: 'Search projects' }).fill('')
  await page.getByRole('combobox', { name: 'Filter by deployment status' }).selectOption('ERROR')
  await expect(page.locator('.planet-target')).toHaveCount(1)
  await expect(page.locator('.project-row')).toContainText('api-gateway')
  await page.getByRole('searchbox', { name: 'Search projects' }).fill('nothing-here')
  await expect(page.getByRole('heading', { name: 'No planets in sight.' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.locator('.planet-target')).toHaveCount(8)
  const before = await (await request.get('/api/projects')).json()
  await page.getByRole('button', { name: 'Sync projects' }).click()
  const after = await (await request.get('/api/projects')).json()
  expect(after.projects.map((project: { analytics: unknown }) => project.analytics)).toEqual(
    before.projects.map((project: { analytics: unknown }) => project.analytics),
  )
  expect(JSON.stringify(after)).not.toMatch(/vercelToken|githubToken|Authorization/)
  expect((await request.get('/api/projects/not-a-project')).status()).toBe(404)
})

test('list view, keyboard search and settings remain accessible', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.planet-target')).toHaveCount(8)
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await expect(page.locator('.project-card')).toHaveCount(8)
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('searchbox', { name: 'Search projects' })).toBeFocused()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('Sample projects')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('mobile project selection opens a usable bottom sheet without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.planet-target')).toHaveCount(8)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await page.screenshot({ path: 'artifacts/universe-mobile.png', fullPage: true })
  await page.locator('[data-project-id="prj_demo_gryd"]').click()
  const panel = page.getByRole('complementary', { name: 'Project details' })
  await expect(panel).toBeVisible()
  const box = await panel.boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(845)
  await expect(page.getByRole('button', { name: 'Close project details' })).toBeFocused()
  await page.screenshot({ path: 'artifacts/universe-mobile-details.png', fullPage: true })
  await page.getByRole('button', { name: 'Close project details' }).click()
  await expect(panel).toHaveCount(0)
})

test('WebGL failure provides selectable fallback projects', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
  })
  await page.goto('/')
  await expect(page.locator('.fallback-project')).toHaveCount(8)
  await page.locator('.fallback-project').first().click()
  await expect(page.getByRole('complementary', { name: 'Project details' })).toBeVisible()
})

test('refresh failure is visible and retry recovers', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.planet-target')).toHaveCount(8)
  await page.route('**/api/projects', (route) =>
    route.fulfill({ status: 502, json: { statusMessage: 'Provider unavailable' } }),
  )
  await page.getByRole('button', { name: 'Sync projects' }).click()
  await expect(
    page.getByRole('heading', { name: 'We couldn’t reach your universe.' }),
  ).toBeVisible()
  await page.unroute('**/api/projects')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.planet-target')).toHaveCount(8)
})
