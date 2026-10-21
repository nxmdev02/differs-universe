import { expect, test } from '@playwright/test'

test('real analytics sort by DAU, distinguish missing from zero and label the 30-day sum honestly', async ({
  page,
  request,
}) => {
  const payload = await (await request.get('/api/projects')).json()
  payload.mode = 'real'
  payload.projects.forEach(
    (project: { source: string; analytics: unknown; warnings: string[] }, index: number) => {
      project.source = 'real'
      project.analytics = {
        source: 'real',
        dau: index === 0 ? null : index === 1 ? 12 : 0,
        mau: index === 0 ? null : index === 1 ? 31 : 0,
        growthRate: null,
        timezone: 'UTC',
      }
      project.warnings =
        index === 0 ? ['DAU: Web Analytics is not enabled. Open Analytics → Enable.'] : []
    },
  )
  await page.goto('/')
  await expect(page.locator('.planet-target')).toHaveCount(8)
  await page.route('**/api/projects', (route) => route.fulfill({ json: payload }))
  await page.route(`**/api/projects/${payload.projects[0].id}`, (route) =>
    route.fulfill({ json: payload.projects[0] }),
  )
  await page.getByRole('button', { name: 'Sync projects' }).click()
  await expect(page.locator('.project-row').first()).toHaveAttribute(
    'data-project-id',
    payload.projects[1].id,
  )
  await expect(page.locator('.project-row').last()).toHaveAttribute(
    'data-project-id',
    payload.projects[0].id,
  )
  await expect(page.locator('.project-row').last()).toContainText('— DAU')
  await expect(page.locator('.project-row').nth(1)).toContainText('0 DAU')
  await expect(page.locator('.overview-audience')).toContainText('12')
  await expect(page.locator('.overview-audience')).toContainText('partial')
  await expect(page.locator('.metric-controls')).not.toContainText('sample')
  await expect(page.locator('.planet-target[data-body="moon"]')).toHaveCount(0)
  await page.getByRole('button', { name: '30d visitors', exact: true }).click()
  await expect(page.locator(`[data-planet-id="${payload.projects[1].id}"]`)).toHaveAttribute(
    'aria-label',
    /31 30d visitors/,
  )
  await expect(page.locator(`[data-planet-id="${payload.projects[0].id}"]`)).toHaveAttribute(
    'aria-label',
    /unavailable/,
  )
  await expect(page.locator(`[data-planet-id="${payload.projects[0].id}"]`)).toHaveAttribute(
    'data-body',
    'pluto',
  )
  await page.locator(`[data-planet-id="${payload.projects[0].id}"]`).hover()
  await expect(page.locator('.preview-mapping')).toHaveText('Pluto · metric unavailable')
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await expect(page.locator('.project-card').last()).toContainText('UNAVAILABLE')
  await page.locator('.project-row').last().click()
  const panel = page.getByRole('complementary', { name: 'Project details' })
  await expect(panel).toContainText('not enabled')
  await expect(panel).toContainText('30-day visitor sum')
  await expect(panel.locator('.audience-grid strong')).toHaveText(['—', '—'])
  await expect(panel.locator('.growth-note')).toHaveCount(0)
  await expect(panel).not.toContainText('DEMO DATA')
})
