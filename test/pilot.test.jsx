import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import PilotScorecard, { PilotCard } from '../src/pages/Pilot.jsx'
import { fakeApi, signInAs } from './server.js'

const empty = {
  venue_id: 7, in_pilot: false, baseline_recorded_at: null, baseline_tickets_per_day: null, baseline_average_basket: null,
  baseline_mobile_money_pct: null, baseline_repeat_pct: null, baseline_before_first_sale: null, owner_gender: null,
  commitment: null, commitment_plan: null, commitment_price: null, commitment_at: null, notes: null, updated_by: null, updated_at: null,
}

describe('the pilot record on a shop', () => {
  it('sends the baseline and gender as numbers and keys, empty fields as null', async () => {
    await signInAs('admin')
    const calls = fakeApi({
      'GET /api/admin/venues/7/pilot': () => [200, empty],
      'PUT /api/admin/venues/7/pilot': (body) => [200, { ...empty, ...body, in_pilot: true }],
    })
    render(<PilotCard shopId={7} />)
    await screen.findByText(/pas encore dans le pilote/)

    await userEvent.type(screen.getByLabelText('Tickets par jour'), '40')
    await userEvent.type(screen.getByLabelText(/Clients qui reviennent/), '30')
    await userEvent.selectOptions(screen.getByLabelText(/Genre du gérant/), 'woman')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer la fiche pilote' }))

    const sent = calls.find((c) => c.method === 'PUT').body
    expect(sent.baseline_tickets_per_day).toBe(40)
    expect(sent.baseline_repeat_pct).toBe(30)
    expect(sent.baseline_average_basket).toBe(null)
    expect(sent.owner_gender).toBe('woman')
    expect(sent.commitment).toBe(null)
  })

  it('warns when the baseline came after the first sale', async () => {
    await signInAs('admin')
    fakeApi({
      'GET /api/admin/venues/7/pilot': () => [
        200,
        { ...empty, in_pilot: true, baseline_repeat_pct: 30, baseline_recorded_at: '2026-10-12T09:00:00', baseline_before_first_sale: false },
      ],
    })
    render(<PilotCard shopId={7} />)
    expect(await screen.findByText(/Base relevée après la première vente/)).toBeTruthy()
  })
})

describe('the pilot scorecard', () => {
  it('shows every rate with its counts', async () => {
    await signInAs('admin')
    fakeApi({
      'GET /api/admin/pilot/scorecard?days=30': () => [
        200,
        {
          days: 30, since: '2026-09-12T09:00:00', merchants: 2, women: 1, with_baseline: 1, recording_70: 1, recording_85: 0,
          with_new_customers: 1, committed: 1, declined: 0,
          rows: [
            {
              venue_id: 7, venue_name: 'Maquis Chez Tanti', category: 'maquis', commune: 'Yopougon', owner_gender: 'woman',
              first_sale_at: '2026-09-20T09:00:00', days_since_first_sale: 22, recorded_share: 0.8, daily_reports: 12,
              identified_customers: 20, returning_customers: 9, repeat_pct: 45, baseline_repeat_pct: 30, repeat_lift_pts: 15,
              baseline_before_first_sale: true, offer_uses: 6, new_customers_from_offers: 4,
              commitment: 'committed', commitment_plan: 'starter', commitment_price: 5000,
            },
          ],
        },
      ],
    })
    render(<PilotScorecard />)
    expect(await screen.findByText('Maquis Chez Tanti')).toBeTruthy()
    expect(screen.getByText(/Ventes enregistrées ≥ 70 % : 1\/2/)).toBeTruthy()
    expect(screen.getByText(/Engagés pour la formule payante : 1\/2/)).toBeTruthy()
    expect(screen.getByText('80 %')).toBeTruthy()
    expect(screen.getByText(/9\/20 \(45 %\)/)).toBeTruthy()
    expect(screen.getByText(/écart \+15 pts/)).toBeTruthy()
    expect(screen.getByText(/Starter · 5000 F/)).toBeTruthy()
  })

  it('says when no shop is in the pilot yet', async () => {
    await signInAs('admin')
    fakeApi({
      'GET /api/admin/pilot/scorecard?days=30': () => [
        200,
        { days: 30, since: '2026-09-12T09:00:00', merchants: 0, women: 0, with_baseline: 0, recording_70: 0, recording_85: 0, with_new_customers: 0, committed: 0, declined: 0, rows: [] },
      ],
    })
    render(<PilotScorecard />)
    expect(await screen.findByText(/Aucun commerce dans le pilote/)).toBeTruthy()
  })
})
