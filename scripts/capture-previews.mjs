import { chromium } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Reads the local dashboard API; production websites receive no dashboard credentials.
const base = process.env.PREVIEW_BASE_URL || 'http://localhost:3000'
const headers = process.env.DASHBOARD_PASSWORD
  ? {
      Authorization: `Basic ${Buffer.from(`differs:${process.env.DASHBOARD_PASSWORD}`).toString('base64')}`,
    }
  : {}
async function api(path) {
  const response = await fetch(new URL(path, base), { headers })
  if (!response.ok) throw new Error(`Dashboard API: ${response.status}`)
  return response.json()
}
const directory = new URL('../server/assets/previews/', import.meta.url)
await mkdir(directory, { recursive: true })
const manifestPath = new URL('manifest.json', directory)
const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{}'))
const { projects } = await api('/api/projects')
const browser = await chromium.launch({ headless: true })
try {
  for (const project of projects) {
    if (project.source !== 'real') continue
    const domains = [...project.domains].sort(
      (a, b) => Number(a.endsWith('.vercel.app')) - Number(b.endsWith('.vercel.app')),
    )
    const url = domains[0] ? `https://${domains[0]}/` : project.productionUrl
    if (!url || new URL(url).protocol !== 'https:') continue
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
      if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`)
      if (new URL(page.url()).hostname === 'vercel.com')
        throw new Error('Deployment requires authentication')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
      await page.evaluate(() => document.fonts.ready)
      const filename = `${createHash('sha256').update(project.id).digest('hex').slice(0, 24)}.jpg`
      await page.screenshot({
        path: fileURLToPath(new URL(filename, directory)),
        type: 'jpeg',
        quality: 72,
        animations: 'disabled',
        timeout: 10000,
      })
      manifest[project.id] = {
        filename,
        url: new URL(url).href,
        capturedAt: new Date().toISOString(),
      }
      console.log(`Captured ${project.name}`)
    } catch (error) {
      delete manifest[project.id]
      console.log(`Skipped ${project.name}: ${error.message}`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
}
