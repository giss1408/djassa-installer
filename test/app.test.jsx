import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App.jsx'
import { fakeApi, pair } from './server.js'

function sessionAs(role, routes = {}) {
  sessionStorage.setItem('djassa-installer-refresh', 'refresh')
  return fakeApi({ 'POST /api/auth/refresh': () => [200, pair(role)], ...routes })
}

describe('App', () => {
  it('shows a field agent only enrolment and their own shops', async () => {
    sessionAs('agent')
    render(<App />)
    expect(await screen.findByRole('link', { name: 'Inscrire un commerce' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Mes commerces' })).toBeTruthy()
    for (const name of ['Commerces', 'Inscriptions', 'Récupérations', 'Utilisateurs', 'Erreurs des apps']) {
      expect(screen.queryByRole('link', { name })).toBe(null)
    }
    expect(screen.getByRole('heading', { name: 'Inscrire un commerce' })).toBeTruthy()
  })

  it('shows an admin every page, starting with the shops', async () => {
    sessionAs('admin', { 'GET /api/admin/venues': () => [200, []] })
    render(<App />)
    expect(await screen.findByRole('link', { name: 'Utilisateurs' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Mes commerces' })).toBe(null)
    expect(await screen.findByText('Aucun commerce.')).toBeTruthy()
  })

  it('asks a signed-out visitor to sign in', async () => {
    fakeApi({})
    render(<App />)
    expect(await screen.findByText('Recevoir le code')).toBeTruthy()
  })
})
