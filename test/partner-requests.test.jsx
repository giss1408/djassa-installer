import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import PartnerRequests from '../src/pages/PartnerRequests.jsx'
import { fakeApi, signInAs } from './server.js'

const request = (extra = {}) => ({
  id: 3, phone: '+2250744556677', contact_name: 'Awa Kone', shop_name: 'Chez Awa', category: 'maquis',
  commune: 'Abobo', address: null, wallet_provider: 'wave', wallet_number: '+2250744556677', notes: null,
  status: 'pending', venue_id: null, decision_note: null, decided_by: null, review_checks: [],
  created_at: '2026-10-04T09:00:00', decided_at: null, ...extra,
})

async function show(req) {
  await signInAs('admin')
  const calls = fakeApi({
    'GET /api/admin/partner-requests?status=pending': () => [200, [req]],
    'POST /api/admin/partner-requests/3/approve': () => [200, { id: 41, name: 'Chez Awa' }],
  })
  render(<PartnerRequests />)
  await screen.findByText('Chez Awa', { exact: false })
  return calls
}

describe('approving a merchant request', () => {
  it('needs the three checks, and sends them', async () => {
    const calls = await show(request())
    const approve = screen.getByRole('button', { name: 'Approuver et créer le commerce' })
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(3)
    expect(approve.disabled).toBe(true)

    await userEvent.click(boxes[0])
    await userEvent.click(boxes[2])
    expect(approve.disabled).toBe(true)
    await userEvent.click(boxes[1])
    expect(approve.disabled).toBe(false)

    await userEvent.click(approve)
    const sent = calls.find((c) => c.method === 'POST')
    expect(sent.body.checks.sort()).toEqual(['called', 'shop_seen', 'wallet_name_matches'])
    expect(window.location.hash).toBe('#/shops/41')
  })

  it('skips the wallet check when the request names no wallet', async () => {
    await show(request({ wallet_provider: null, wallet_number: null }))
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.queryByText(/titulaire du compte/)).toBe(null)
  })

  it('shows the server refusal', async () => {
    await signInAs('admin')
    fakeApi({
      'GET /api/admin/partner-requests?status=pending': () => [200, [request({ wallet_number: null, wallet_provider: null })]],
      'POST /api/admin/partner-requests/3/approve': () => [422, { detail: 'Verifications manquantes : Appel au gerant' }],
    })
    render(<PartnerRequests />)
    await screen.findByText('Chez Awa', { exact: false })
    for (const box of screen.getAllByRole('checkbox')) await userEvent.click(box)
    await userEvent.click(screen.getByRole('button', { name: 'Approuver et créer le commerce' }))
    expect(await screen.findByText('Verifications manquantes : Appel au gerant')).toBeTruthy()
  })
})
