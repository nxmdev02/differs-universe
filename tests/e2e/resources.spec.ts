import { expect, test, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

declare global {
  interface Window {
    __sceneStats: { frames: number; triangles: number; buffers: number; textures: number }
  }
}

async function instrument(page: Page) {
  await page.addInitScript(() => {
    window.__sceneStats = { frames: 0, triangles: 0, buffers: 0, textures: 0 }
    const contexts = new WeakMap<object, { buffers: Set<unknown>; textures: Set<unknown> }>()
    for (const target of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const prototype = target as unknown as Record<string, (...args: unknown[]) => unknown>
      for (const method of [
        'clear',
        'drawElements',
        'createBuffer',
        'deleteBuffer',
        'createTexture',
        'deleteTexture',
      ]) {
        const original = prototype[method]!
        prototype[method] = function (...args: unknown[]) {
          const result = Reflect.apply(original, this, args)
          const stats = window.__sceneStats
          const context = this as unknown as WebGLRenderingContext
          let resources = contexts.get(context)
          if (!resources) {
            resources = { buffers: new Set(), textures: new Set() }
            contexts.set(context, resources)
            const owned = resources
            context.canvas.addEventListener('webglcontextlost', () => {
              stats.buffers -= owned.buffers.size
              stats.textures -= owned.textures.size
              owned.buffers.clear()
              owned.textures.clear()
            })
          }
          if (method === 'clear') stats.frames++
          if (method === 'drawElements' && args[0] === 4) stats.triangles += Number(args[1]) / 3
          if (method === 'createBuffer' && result) {
            stats.buffers++
            resources.buffers.add(result)
          }
          if (method === 'deleteBuffer' && resources.buffers.delete(args[0])) stats.buffers--
          if (method === 'createTexture' && result) {
            stats.textures++
            resources.textures.add(result)
          }
          if (method === 'deleteTexture' && resources.textures.delete(args[0])) stats.textures--
          return result
        }
      }
    }
  })
}

const stats = (page: Page) => page.evaluate(() => ({ ...window.__sceneStats }))

test('rendering budget: active, paused, reduced motion, hidden, offscreen and released resources', async ({
  page,
}) => {
  test.setTimeout(90000)
  const baseline = process.env.PERF_BASELINE === '1'
  await instrument(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.earth-target')).toHaveAttribute('data-detailed', 'true')
  await expect(page.locator('.planet-target')).toHaveCount(8)
  await page.mouse.move(0, 0)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  const report: Record<string, unknown> = {
    environment: 'Chromium software WebGL, local Nuxt dev, 8 sample projects',
  }
  async function sample(name: string) {
    await page.waitForTimeout(700)
    const before = await stats(page)
    const metricsBefore = await cdp.send('Performance.getMetrics')
    await page.waitForTimeout(2000)
    const after = await stats(page)
    const metricsAfter = await cdp.send('Performance.getMetrics')
    const task = (value: typeof metricsBefore) =>
      value.metrics.find((m) => m.name === 'TaskDuration')!.value
    const frames = after.frames - before.frames
    report[name] = {
      framesIn2s: frames,
      trianglesPerFrame: frames ? Math.round((after.triangles - before.triangles) / frames) : 0,
      mainThreadTaskMs: Math.round((task(metricsAfter) - task(metricsBefore)) * 1000),
      buffers: after.buffers,
      textures: after.textures,
    }
    return frames
  }
  await sample('active')
  await page.getByRole('button', { name: 'Pause orbit', exact: true }).click()
  const paused = await sample('paused')
  if (!baseline) expect(paused).toBe(0)
  // Paused scenes must still respond to camera controls and theme changes.
  const size = (await page.locator('.earth-target').boundingBox())!.width
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect
    .poll(async () => (await page.locator('.earth-target').boundingBox())!.width)
    .toBeGreaterThan(size)
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click()
  await page.getByRole('button', { name: 'Resume orbit', exact: true }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await sample('reducedMotion')
  if (!baseline) expect(reduced).toBe(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  // Dispatch the browser's visibility signal without freezing JS (which would hide leaks).
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const hidden = await sample('hiddenSignal')
  if (!baseline) expect(hidden).toBe(0)
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    const spacer = document.createElement('div')
    spacer.id = 'perf-spacer'
    spacer.style.height = '1800px'
    document.body.append(spacer)
    window.scrollTo(0, document.body.scrollHeight)
  })
  const offscreen = await sample('offscreen')
  if (!baseline) expect(offscreen).toBe(0)
  await page.evaluate(() => {
    document.getElementById('perf-spacer')?.remove()
    window.scrollTo(0, 0)
  })
  const resumed = await sample('returned')
  expect(resumed).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const modal = await sample('settingsOpen')
  if (!baseline) expect(modal).toBe(0)
  await page.getByRole('button', { name: 'Close settings' }).click()
  await page.getByRole('button', { name: 'Pause orbit', exact: true }).click()
  await cdp.send('HeapProfiler.collectGarbage')
  report.heapBeforeCycles = (await cdp.send('Runtime.getHeapUsage')).usedSize
  for (let cycle = 0; cycle < 4; cycle++) {
    await page.getByRole('button', { name: 'List', exact: true }).click()
    await expect(page.locator('.universe-canvas canvas')).toHaveCount(0)
    if (!baseline) {
      await expect.poll(async () => (await stats(page)).buffers).toBe(0)
      await expect.poll(async () => (await stats(page)).textures).toBe(0)
    }
    await page.getByRole('button', { name: 'Universe', exact: true }).last().click()
    await expect(page.locator('.earth-target')).toHaveAttribute('data-detailed', 'true')
  }
  await cdp.send('HeapProfiler.collectGarbage')
  report.heapAfterCycles = (await cdp.send('Runtime.getHeapUsage')).usedSize
  report.resourcesAfterCycles = await stats(page)
  await writeFile(
    `artifacts/resources-${baseline ? 'before' : 'after'}.json`,
    JSON.stringify(report, null, 2),
  )
})

test('mobile rendering caps framebuffer resolution', async ({ browser }) => {
  const baseline = process.env.PERF_BASELINE === '1'
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await instrument(page)
  await page.goto('http://127.0.0.1:3100')
  await expect(page.locator('.earth-target')).toHaveAttribute('data-detailed', 'true')
  const dimensions = await page.locator('.universe-canvas > canvas').evaluate((el) => ({
    width: (el as HTMLCanvasElement).width,
    height: (el as HTMLCanvasElement).height,
    cssWidth: el.clientWidth,
    cssHeight: el.clientHeight,
  }))
  await writeFile(
    `artifacts/resources-mobile-${baseline ? 'before' : 'after'}.json`,
    JSON.stringify(dimensions, null, 2),
  )
  if (!baseline) expect(dimensions.width / dimensions.cssWidth).toBeLessThanOrEqual(1.25)
  await context.close()
})
