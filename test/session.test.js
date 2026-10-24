import { describe, expect, it } from 'vitest'
import { mustChangePassword, renew, replaceTemporaryPassword, sessionRole, signIn, signOut } from '../src/api.js'
import { fakeApi, pair } from './server.js'

describe('session role', () => {
  it('comes from the sign-in response and ends with sign-out', async () => {
    const calls = fakeApi({
      'POST /api/auth/login': () => [200, pair('agent')],
      'POST /api/auth/logout': () => [204],
    })
    await signIn('07 00 00 00 04', 'password-1')
    expect(calls[0].body).toEqual({ phone: '0700000004', country_code: 'CI', password: 'password-1', app: 'admin' })
    expect(sessionRole()).toBe('agent')
    expect(sessionStorage.getItem('fidelia-installer-refresh')).toBe('refresh-agent')

    await signOut()
    expect(sessionRole()).toBe(null)
    expect(calls.at(-1)).toMatchObject({ path: '/api/auth/logout', body: { refresh_token: 'refresh-agent' } })
  })

  it('is restored by a renewal after a reload', async () => {
    sessionStorage.setItem('fidelia-installer-refresh', 'refresh-old')
    fakeApi({ 'POST /api/auth/refresh': () => [200, pair('admin')] })
    expect(await renew()).toBe(true)
    expect(sessionRole()).toBe('admin')
  })

  it('is cleared when the renewal is refused', async () => {
    sessionStorage.setItem('fidelia-installer-refresh', 'refresh-revoked')
    fakeApi({ 'POST /api/auth/refresh': () => [401, { detail: 'Session expiree. Reconnectez-vous.' }] })
    expect(await renew()).toBe(false)
    expect(sessionRole()).toBe(null)
  })

  it('opened with a temporary password, asks for a new one, then not any more', async () => {
    // The pc claim, as the server sets it after a temporary password.
    const token = (claims) => `x.${btoa(JSON.stringify(claims))}.y`
    const calls = fakeApi({
      'POST /api/auth/login': () => [200, { ...pair('admin'), access_token: token({ role: 'admin', pc: true }) }],
      'POST /api/auth/password': () => [200, { ...pair('admin'), access_token: token({ role: 'admin', pc: false }) }],
    })
    await signIn('0700000009', 'temporaire-1')
    expect(mustChangePassword()).toBe(true)
    await replaceTemporaryPassword('le-mien-1234')
    expect(calls.at(-1)).toMatchObject({ path: '/api/auth/password', body: { new: 'le-mien-1234' } })
    expect(mustChangePassword()).toBe(false)
  })
})
