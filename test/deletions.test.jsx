import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Deletions from '../src/pages/Deletions.jsx'
import { fakeApi, signInAs } from './server.js'

const request = {
  id: 7, phone: '+2250700000003', role: 'cashier', venue_id: 2, venue_name: 'Chez Tantie', reason: 'Je quitte le commerce',
  status: 'pending', decision_note: null, created_at: '2026-10-09T09:00:00', decided_at: null,
}

afterEach(() => vi.restoreAllMocks())

describe('account deletion requests', () => {
  it('lists a request and deletes after confirmation', async () => {
    await signInAs('admin')
    const calls = fakeApi({
      'GET /api/admin/deletion-requests?status=pending': () => [200, [request]],
      'POST /api/admin/deletion-requests/7/done': () => [200, { ...request, status: 'done' }],
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'prompt').mockReturnValue('appelé')
    render(<Deletions />)
    await screen.findByText('Chez Tantie')
    expect(screen.getByRole('heading', { name: /Caissier/ })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer le compte' }))
    const sent = calls.find((c) => c.method === 'POST')
    expect(sent.path).toBe('/api/admin/deletion-requests/7/done')
    expect(sent.body).toEqual({ note: 'appelé' })
  })

  it('does nothing when the admin cancels', async () => {
    await signInAs('admin')
    const calls = fakeApi({ 'GET /api/admin/deletion-requests?status=pending': () => [200, [request]] })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Deletions />)
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer le compte' }))
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })
})
