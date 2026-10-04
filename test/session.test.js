import { describe, expect, it } from 'vitest'
import { renew, sessionRole, signOut, verifyCode } from '../src/api.js'
import { fakeApi, pair } from './server.js'

describe('session role', () => {
  it('comes from the sign-in response and ends with sign-out', async () => {
    const calls = fakeApi({
      'POST /api/auth/otp/verify': () => [200, pair('agent')],
      'POST /api/auth/logout': () => [204],
    })
    await verifyCode('0700000004', '000000')
    expect(calls[0].body).toEqual({ phone: '0700000004', code: '000000', app: 'admin' })
    expect(sessionRole()).toBe('agent')
    expect(sessionStorage.getItem('djassa-installer-refresh')).toBe('refresh-agent')

    await signOut()
    expect(sessionRole()).toBe(null)
    expect(calls.at(-1)).toMatchObject({ path: '/api/auth/logout', body: { refresh_token: 'refresh-agent' } })
  })

  it('is restored by a renewal after a reload', async () => {
    sessionStorage.setItem('djassa-installer-refresh', 'refresh-old')
    fakeApi({ 'POST /api/auth/refresh': () => [200, pair('admin')] })
    expect(await renew()).toBe(true)
    expect(sessionRole()).toBe('admin')
  })

  it('is cleared when the renewal is refused', async () => {
    sessionStorage.setItem('djassa-installer-refresh', 'refresh-revoked')
    fakeApi({ 'POST /api/auth/refresh': () => [401, { detail: 'Session expiree. Reconnectez-vous.' }] })
    expect(await renew()).toBe(false)
    expect(sessionRole()).toBe(null)
  })
})
