import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { Buffer } from 'node:buffer'
import { setTimeout } from 'node:timers/promises'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent, sealSession } from 'h3'

async function withServer(environment, check) {
  const listener = createServer()
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve))
  const port = listener.address().port
  await new Promise((resolve) => listener.close(resolve))
  const child = spawn(process.execPath, ['.output/server/index.mjs'], {
    windowsHide: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(port),
      DATA_MODE: 'mock',
      VERCEL_TOKEN: '',
      GITHUB_TOKEN: '',
      DASHBOARD_PASSWORD: '',
      NUXT_VERCEL_TOKEN: '',
      NUXT_GITHUB_TOKEN: '',
      NUXT_DASHBOARD_PASSWORD: '',
      AUTH_MODE: 'auto',
      APP_URL: '',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      AUTH_ALLOWED_EMAILS: '',
      SESSION_PASSWORD: '',
      NUXT_AUTH_MODE: 'auto',
      NUXT_GOOGLE_CLIENT_ID: '',
      NUXT_GOOGLE_CLIENT_SECRET: '',
      NUXT_APP_URL: '',
      NUXT_AUTH_ALLOWED_EMAILS: '',
      NUXT_SESSION_PASSWORD: '',
      ...environment,
    },
  })
  const base = `http://127.0.0.1:${port}`
  try {
    let ready = false
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        await fetch(`${base}/api/health`)
        ready = true
        break
      } catch {
        await setTimeout(100)
      }
    }
    assert.ok(ready, 'Production server started')
    await check(base)
  } finally {
    child.kill()
  }
}

test('production mock server renders HTML and exposes only public project fields', async () => {
  await withServer({}, async (base) => {
    const response = await fetch(base)
    assert.equal(response.status, 200)
    assert.match(await response.text(), /Project universe/)
    const projects = await (await fetch(`${base}/api/projects`)).json()
    assert.equal(projects.mode, 'mock')
    assert.equal(projects.projects.length, 8)
    assert.equal((await fetch(`${base}/api/projects/prj_demo_gryd/preview`)).status, 404)
    assert.doesNotMatch(JSON.stringify(projects), /vercelToken|githubToken|Authorization/)
  })
})

test('production real mode refuses public access without a dashboard password', async () => {
  await withServer({ DATA_MODE: 'real', VERCEL_TOKEN: 'synthetic-test-token' }, async (base) => {
    assert.equal((await fetch(`${base}/api/projects`)).status, 503)
  })
})

test('production real mode requires authentication, keeps responses private and never exposes tokens', async () => {
  await withServer(
    {
      DATA_MODE: 'real',
      VERCEL_TOKEN: 'synthetic-test-token',
      DASHBOARD_PASSWORD: 'synthetic-test-password',
    },
    async (base) => {
      const unauthorized = await fetch(`${base}/api/health`)
      assert.equal(unauthorized.status, 401)
      assert.equal((await fetch(`${base}/api/projects/any-project/preview`)).status, 401)
      assert.match(unauthorized.headers.get('www-authenticate'), /Basic/)
      const authorized = await fetch(`${base}/api/health`, {
        headers: {
          Authorization: `Basic ${Buffer.from('differs:synthetic-test-password').toString('base64')}`,
        },
      })
      assert.equal(authorized.status, 200)
      assert.equal(authorized.headers.get('cache-control'), 'private, no-store')
      const text = await authorized.text()
      assert.equal(JSON.parse(text).vercel, 'configured')
      assert.doesNotMatch(text, /synthetic-test-token|synthetic-test-password/)
    },
  )
})

const googleEnvironment = {
  AUTH_MODE: 'google',
  APP_URL: 'https://dashboard.example.test',
  GOOGLE_CLIENT_ID: 'synthetic-google-client',
  GOOGLE_CLIENT_SECRET: 'synthetic-google-secret',
  AUTH_ALLOWED_EMAILS: 'owner@gmail.com',
  SESSION_PASSWORD: 'synthetic-session-password-at-least-32-characters',
}
async function authCookie(email = 'owner@gmail.com', age = 0) {
  const request = new IncomingMessage(new Socket())
  const event = createEvent(request, new ServerResponse(request))
  event.context.sessions = {
    'differs-auth': {
      id: 'test-session',
      createdAt: Date.now() - age,
      data: { user: { sub: 'google-subject', email, name: 'Owner' } },
    },
  }
  const sealed = await sealSession(event, {
    name: 'differs-auth',
    password: googleEnvironment.SESSION_PASSWORD,
    maxAge: 28800,
  })
  return `differs-auth=${encodeURIComponent(sealed)}`
}

test('incomplete Google setup fails closed even in mock mode and offers a public login page', async () => {
  await withServer({ AUTH_MODE: 'google' }, async (base) => {
    assert.equal((await fetch(`${base}/api/projects`)).status, 503)
    const response = await fetch(base, { redirect: 'manual' })
    assert.equal(response.status, 302)
    assert.equal(response.headers.get('location'), '/login')
    const login = await fetch(`${base}/login`)
    assert.equal(login.status, 200)
    assert.match(await login.text(), /Google sign-in unavailable/)
    assert.equal(login.headers.get('cache-control'), 'private, no-store')
    const status = await (await fetch(`${base}/api/auth/session`)).json()
    assert.deepEqual(status, { enabled: true, configured: false, user: null })
  })
})

test('Google flow sets secure state cookies, uses trusted origin, rejects missing state and hides credentials', async () => {
  await withServer(googleEnvironment, async (base) => {
    for (const path of ['/api/projects', '/api/health', '/api/projects/any-project/preview'])
      assert.equal((await fetch(base + path)).status, 401)
    const response = await fetch(`${base}/auth/google`, {
      redirect: 'manual',
      headers: { 'x-forwarded-host': 'attacker.test' },
    })
    assert.equal(response.status, 302)
    const redirect = new URL(response.headers.get('location'))
    assert.equal(redirect.origin, 'https://accounts.google.com')
    assert.equal(
      redirect.searchParams.get('redirect_uri'),
      'https://dashboard.example.test/auth/google/callback',
    )
    assert.equal(redirect.searchParams.get('code_challenge_method'), 'S256')
    assert.ok(redirect.searchParams.get('state').length >= 32)
    const cookies = response.headers.getSetCookie().join(';')
    assert.match(cookies, /HttpOnly/)
    assert.match(cookies, /Secure/)
    assert.match(cookies, /SameSite=Lax/i)
    assert.doesNotMatch(
      redirect.href + cookies,
      /synthetic-google-secret|synthetic-session-password/,
    )
    const callback = await fetch(`${base}/auth/google/callback?code=invalid&state=invalid`, {
      redirect: 'manual',
    })
    assert.equal(callback.headers.get('location'), '/login?error=expired')
    const flowCookie = response.headers
      .getSetCookie()
      .filter((c) => c.startsWith('differs-oauth='))
      .at(-1)
      .split(';')[0]
    const cancelled = await fetch(
      `${base}/auth/google/callback?error=access_denied&state=${redirect.searchParams.get('state')}`,
      { redirect: 'manual', headers: { Cookie: flowCookie } },
    )
    assert.equal(cancelled.headers.get('location'), '/login?error=cancelled')
    const publicStatus = await (await fetch(`${base}/api/auth/session`)).text()
    assert.doesNotMatch(publicStatus, /synthetic-|owner@gmail.com/)
  })
})

test('valid sessions unlock protected pages; forged, expired and unapproved sessions fail; logout requires same origin', async () => {
  await withServer(googleEnvironment, async (base) => {
    const cookie = await authCookie()
    const headers = { Cookie: cookie }
    const response = await fetch(`${base}/api/projects`, { headers })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
    const session = await (await fetch(`${base}/api/auth/session`, { headers })).json()
    assert.equal(session.user.email, 'owner@gmail.com')
    const home = await fetch(base, { headers })
    assert.equal(home.status, 200)
    assert.match(await home.text(), /Project universe/)
    for (const badCookie of [
      'differs-auth=forged',
      await authCookie('other@gmail.com'),
      await authCookie('owner@gmail.com', 9 * 3600000),
    ]) {
      assert.equal(
        (await fetch(`${base}/api/projects`, { headers: { Cookie: badCookie } })).status,
        401,
      )
    }
    assert.equal((await fetch(`${base}/api/auth/logout`, { method: 'POST', headers })).status, 403)
    assert.equal(
      (
        await fetch(`${base}/api/auth/logout`, {
          method: 'POST',
          headers: { ...headers, Origin: 'https://attacker.test' },
        })
      ).status,
      403,
    )
    const logout = await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { ...headers, Origin: googleEnvironment.APP_URL },
    })
    assert.equal(logout.status, 200)
    assert.match(logout.headers.get('set-cookie'), /differs-auth=;/)
    assert.equal((await fetch(`${base}/api/projects`)).status, 401)
  })
})
