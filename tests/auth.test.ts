import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose'
import {
  allowedGoogleUser,
  googleAuthorizationUrl,
  randomToken,
  sameToken,
  verifyGoogleIdToken,
} from '../server/services/google-auth'
import type { AuthConfig } from '../server/utils/auth-config'

const config: AuthConfig = {
  enabled: true,
  configured: true,
  clientId: 'test-client',
  clientSecret: 'never-in-browser',
  password: 'a-long-session-password-used-only-for-tests',
  emails: ['owner@gmail.com'],
  origin: 'https://dashboard.example.test',
  redirectUri: 'https://dashboard.example.test/auth/google/callback',
}
test('authorization uses fixed redirect, unpredictable state/nonce and S256 PKCE without exposing secrets', () => {
  const flow = { state: randomToken(), nonce: randomToken(), verifier: randomToken() }
  assert.notEqual(flow.state, flow.nonce)
  assert.notEqual(flow.nonce, flow.verifier)
  const url = new URL(googleAuthorizationUrl(config, flow))
  assert.equal(url.origin, 'https://accounts.google.com')
  assert.equal(url.searchParams.get('redirect_uri'), config.redirectUri)
  assert.equal(url.searchParams.get('state'), flow.state)
  assert.equal(url.searchParams.get('nonce'), flow.nonce)
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(
    url.searchParams.get('code_challenge'),
    createHash('sha256').update(flow.verifier).digest('base64url'),
  )
  assert.equal(url.searchParams.get('scope'), 'openid email profile')
  assert.doesNotMatch(url.href, /never-in-browser|password|code_verifier/)
  assert.equal(sameToken(undefined, flow.state), false)
  assert.equal(sameToken([flow.state], flow.state), false)
  assert.equal(sameToken('different', flow.state), false)
  assert.equal(sameToken(flow.state, flow.state), true)
})

test('Google ID token requires valid signature, issuer, audience, expiration and nonce', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256' }
  const keys = createLocalJWKSet({ keys: [jwk] })
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    sub: 'google-subject',
    iss: 'https://accounts.google.com',
    aud: config.clientId,
    iat: now,
    exp: now + 300,
    nonce: 'nonce',
    email: 'owner@gmail.com',
    email_verified: true,
  }
  const sign = (payload: Record<string, unknown>) =>
    new SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).sign(privateKey)
  const token = await sign(claims)
  assert.equal(
    (await verifyGoogleIdToken(token, config.clientId, 'nonce', keys)).sub,
    'google-subject',
  )
  for (const changes of [
    { iss: 'https://attacker.test' },
    { aud: 'another-client' },
    { exp: now - 100 },
    { nonce: 'other' },
    { azp: 'another-client' },
    { iat: now - 1200 },
    { sub: undefined },
  ]) {
    await assert.rejects(() =>
      sign({ ...claims, ...changes }).then((t) =>
        verifyGoogleIdToken(t, config.clientId, 'nonce', keys),
      ),
    )
  }
  const forged = `${token.slice(0, token.lastIndexOf('.') + 1)}AAAA`
  await assert.rejects(() => verifyGoogleIdToken(forged, config.clientId, 'nonce', keys))
  const otherKey = await generateKeyPair('RS256')
  const otherToken = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .sign(otherKey.privateKey)
  await assert.rejects(() => verifyGoogleIdToken(otherToken, config.clientId, 'nonce', keys))
})

test('only verified exact allowlisted emails gain access; an empty allowlist denies everyone', () => {
  const payload = { sub: 'id', email: 'OWNER@gmail.com', email_verified: true, name: 'Owner' }
  assert.deepEqual(allowedGoogleUser(payload, config.emails), {
    sub: 'id',
    email: 'owner@gmail.com',
    name: 'Owner',
  })
  assert.equal(allowedGoogleUser(payload, []), null)
  assert.equal(allowedGoogleUser({ ...payload, email: 'another@gmail.com' }, config.emails), null)
  assert.equal(
    allowedGoogleUser({ ...payload, email: 'owner@gmail.com.attacker.test' }, config.emails),
    null,
  )
  assert.equal(allowedGoogleUser({ ...payload, email_verified: false }, config.emails), null)
  assert.equal(allowedGoogleUser({ ...payload, email_verified: 'true' }, config.emails), null)
  assert.equal(allowedGoogleUser({ ...payload, sub: '' }, config.emails), null)
})
