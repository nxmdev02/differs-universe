import { expect, test } from '@playwright/test'

test('recent deployment ripples pause and play once, then retrigger only for a new deployment', async ({
  page,
  request,
}) => {
  const payload = await (await request.get('/api/projects')).json()
  const project = payload.projects[0]
  await page.goto('/')
  await expect(page.locator('.planet-target')).toHaveCount(8)
  await expect(page.locator('.deployment-signal')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  project.deployment = {
    status: 'READY',
    url: 'https://deployment-a.example.com',
    createdAt: new Date(Date.now() - 1000).toISOString(),
  }
  await page.route('**/api/projects', (route) => route.fulfill({ json: payload }))
  await page.getByRole('button', { name: 'Sync projects' }).click()
  const signal = page.locator(`[data-planet-id="${project.id}"] .deployment-signal`)
  await expect(signal).toBeVisible()
  await page.getByRole('button', { name: 'Pause orbit', exact: true }).click()
  await expect(signal).toHaveCSS('animation-play-state', 'paused')
  await page.waitForTimeout(350)
  await expect(signal).toBeVisible()
  await page.getByRole('button', { name: 'Resume orbit', exact: true }).click()
  await expect(signal).toHaveCount(0, { timeout: 6000 })
  await page.getByRole('button', { name: 'Sync projects' }).click()
  await expect(signal).toHaveCount(0)
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await page.getByRole('main').getByRole('button', { name: 'Universe', exact: true }).click()
  await expect(page.locator('.planet-target')).toHaveCount(8)
  await expect(signal).toHaveCount(0)
  project.deployment.url = 'https://deployment-b.example.com'
  await page.getByRole('button', { name: 'Sync projects' }).click()
  await expect(signal).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(signal).toHaveCount(0)
})
