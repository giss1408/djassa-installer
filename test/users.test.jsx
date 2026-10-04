import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Users from '../src/pages/Users.jsx'
import { fakeApi, signInAs } from './server.js'

const account = (roles) => ({
  phone: '+2250788888888', roles, disabled: false, created_at: '2026-10-01T10:00:00', last_login_at: null,
  venues_owned: [], active_sessions: 0,
})

describe('granting the field agent role', () => {
  it('grants it, then removes it', async () => {
    await signInAs('admin')
    let roles = ['customer']
    const calls = fakeApi({
      'GET /api/admin/users': () => [200, account(roles)],
      'POST /api/admin/users/roles': (body) => {
        roles = [...roles, body.role]
        return [200, { phone_masked: '07 •• •• 88 88', roles, venue_id: null }]
      },
      'POST /api/admin/users/roles/revoke': (body) => {
        roles = roles.filter((r) => r !== body.role)
        return [200, account(roles)]
      },
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Users />)
    await userEvent.type(screen.getByPlaceholderText(/Numéro/), '0788888888')
    await userEvent.click(screen.getByRole('button', { name: 'Chercher' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Donner l’accès agent terrain' }))
    expect(calls.find((c) => c.path === '/api/admin/users/roles').body).toEqual({ phone: '0788888888', role: 'agent' })
    expect(await screen.findByText('customer, agent')).toBeTruthy()

    await userEvent.click(await screen.findByRole('button', { name: 'Retirer l’accès agent terrain' }))
    expect(calls.find((c) => c.path === '/api/admin/users/roles/revoke').body).toEqual({ phone: '0788888888', role: 'agent' })
    expect(await screen.findByRole('button', { name: 'Donner l’accès agent terrain' })).toBeTruthy()
  })
})

describe('the shops list', () => {
  it('says who enrolled each shop', async () => {
    await signInAs('admin')
    fakeApi({
      'GET /api/admin/venues': () => [200, [
        { id: 9, name: 'Superette Agent', category: 'superette', commune: 'Cocody', accepts_payment: false, payout_provider: null,
          has_merchant: true, images: 0, videos: 0, is_sample: false, enrolled_by: '+2250700000004' },
      ]],
    })
    const { default: Shops } = await import('../src/pages/Shops.jsx')
    render(<Shops />)
    expect(await screen.findByText('+2250700000004')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Inscrit par' })).toBeTruthy()
  })
})
