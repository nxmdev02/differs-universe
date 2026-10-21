import { expect, test } from '@playwright/test'
import type { ProjectViewModel } from '../../shared/types/project'

test('real analytics sort by DAU, distinguish missing from zero and label the 30-day sum honestly', async ({
  page,
  request,
}) => {
  const payload = await (await request.get('/api/projects')).json()
  payload.mode = 'real'
  payload.projects.forEach((project: ProjectViewModel, index: number) => {
    project.source = 'real'
    project.github = null
    project.deployment.createdAt = new Date(Date.now() - index * 3600000).toISOString()
    project.analytics = {
      source: 'real',
      dau: index === 0 ? null : index === 1 ? 12 : 0,
      mau: index === 0 ? null : index === 1 ? 31 : 0,
      growthRate: null,
      timezone: 'UTC',
    }
    project.warnings =
      index === 0 ? ['DAU: Web Analytics is not enabled. Open Analytics → Enable.'] : []
  })
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
  await expect(page.locator('.project-row').nth(1)).toHaveAttribute(
    'data-project-id',
    payload.projects[0].id,
  )
  await expect(page.locator('.project-row').nth(1)).toContainText('— DAU')
  await expect(page.locator('.project-row').nth(2)).toContainText('0 DAU')
  await expect(page.locator('.overview-audience')).toContainText('12')
  await expect(page.locator('.overview-audience')).toContainText('partial')
  await expect(page.locator('.metric-controls')).not.toContainText('sample')
  await expect(page.locator('.planet-target[data-body="moon"]')).toHaveCount(0)
  await expect(page.locator(`[data-planet-id="${payload.projects[0].id}"]`)).toHaveAttribute(
    'data-glow',
    'unavailable',
  )
  await expect(page.locator(`[data-planet-id="${payload.projects[2].id}"]`)).toHaveAttribute(
    'data-glow',
    '0',
  )
  const active = page.locator(`[data-planet-id="${payload.projects[1].id}"]`)
  await expect(active).toHaveAttribute('data-body', 'jupiter')
  await expect(page.locator(`[data-planet-id="${payload.projects[0].id}"]`)).toHaveAttribute(
    'data-body',
    'saturn',
  )
  const glow = Number(await active.getAttribute('data-glow'))
  expect(glow).toBeGreaterThan(0)
  expect(glow).toBeLessThan(0.75)
  const identities = await page
    .locator('.planet-target')
    .evaluateAll((elements) =>
      Object.fromEntries(
        elements.map((element) => [
          element.getAttribute('data-planet-id'),
          { body: element.getAttribute('data-body'), width: element.getBoundingClientRect().width },
        ]),
      ),
    )
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
    identities[payload.projects[0].id].body,
  )
  expect(
    await page.locator('.planet-target').evaluateAll((elements) =>
      Object.fromEntries(
        elements.map((element) => [
          element.getAttribute('data-planet-id'),
          {
            body: element.getAttribute('data-body'),
            width: element.getBoundingClientRect().width,
          },
        ]),
      ),
    ),
  ).toEqual(identities)
  expect(Number(await active.getAttribute('data-glow'))).toBeGreaterThan(glow)
  await page.locator(`[data-planet-id="${payload.projects[0].id}"]`).hover()
  await expect(page.locator('.preview-mapping')).toHaveText([
    `${identities[payload.projects[0].id].body[0].toUpperCase()}${identities[payload.projects[0].id].body.slice(1)} · recent activity`,
    'Metric unavailable',
  ])
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await expect(page.locator('.project-card').nth(1)).toContainText('UNAVAILABLE')
  await page.locator('.project-row').nth(1).click()
  const panel = page.getByRole('complementary', { name: 'Project details' })
  await expect(panel).toContainText('not enabled')
  await expect(panel).toContainText('30-day visitor sum')
  await expect(panel.locator('.audience-grid strong')).toHaveText(['—', '—'])
  await expect(panel.locator('.growth-note')).toHaveCount(0)
  await expect(panel).not.toContainText('DEMO DATA')
})
