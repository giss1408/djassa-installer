import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AgentEnrol, AgentShops } from '../src/pages/Agent.jsx'
import { fakeApi, signInAs } from './server.js'

describe('field agent', () => {
  it('enrols a shop with its owner number and is told it is live', async () => {
    await signInAs('agent')
    const calls = fakeApi({
      'POST /api/admin/venues': (body) => [201, {
        id: 9, name: body.name, category: body.category, commune: body.commune, payout_provider: null,
        merchant_phone_masked: '07 •• •• 77 77', pay_code: null, qr_payload: null,
      }],
    })
    render(<AgentEnrol />)
    const [name, commune] = [screen.getAllByRole('textbox')[0], screen.getAllByRole('textbox')[1]]
    await userEvent.type(name, 'Superette Agent')
    await userEvent.type(commune, 'Cocody')
    const owner = screen.getByLabelText(/Numéro du gérant/)
    expect(owner.required).toBe(true)
    await userEvent.type(owner, '0777777777')
    await userEvent.click(screen.getByRole('button', { name: 'Inscrire le commerce' }))

    expect(await screen.findByText('Superette Agent est inscrit')).toBeTruthy()
    expect(screen.getByText(/07 •• •• 77 77/)).toBeTruthy()
    expect(calls[0].body).toEqual({ category: 'maquis', points_per_100: 1, name: 'Superette Agent', commune: 'Cocody', merchant_phone: '0777777777' })
  })

  it('shows the refusal in the server words', async () => {
    await signInAs('agent')
    fakeApi({ 'POST /api/admin/venues': () => [409, { detail: 'Ce numero gere deja un commerce : Maquis Autre' }] })
    render(<AgentEnrol />)
    await userEvent.type(screen.getAllByRole('textbox')[0], 'Shop')
    await userEvent.type(screen.getAllByRole('textbox')[1], 'Abobo')
    await userEvent.type(screen.getByLabelText(/Numéro du gérant/), '0755555555')
    await userEvent.click(screen.getByRole('button', { name: 'Inscrire le commerce' }))
    expect(await screen.findByText('Ce numero gere deja un commerce : Maquis Autre')).toBeTruthy()
  })

  it('lists the shops they enrolled', async () => {
    await signInAs('agent')
    fakeApi({
      'GET /api/agent/venues': () => [200, [
        { id: 9, name: 'Superette Agent', category: 'superette', commune: 'Cocody', payout_provider: 'wave', merchant_phone_masked: '07 •• •• 77 77', pay_code: 'abc', qr_payload: 'djassa://pay/abc' },
      ]],
    })
    render(<AgentShops />)
    expect(await screen.findByText('Superette Agent')).toBeTruthy()
    expect(screen.getByText('Wave')).toBeTruthy()
    expect(screen.getByText('1 commerce(s) inscrit(s) par vous.')).toBeTruthy()
  })
})
